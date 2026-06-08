-- ══════════════════════════════════════════════════════════════════════════
-- KZ Escrow: Idempotent payout fix
--
-- Problem: trigger fires only when OLD.status = 'on_hold'. If a revision
-- cycle changes status to 'revision' before 'completed', OLD.status is
-- 'revision' and the payout never happens — funds stuck in balance_on_hold.
--
-- Fix:
--   1. Add is_paid_out boolean (default false) as a payout guard.
--   2. Rewrite trigger: fire whenever NEW.status = 'completed' AND
--      NEW.is_paid_out = false (regardless of OLD.status).
--      Set NEW.is_paid_out = true atomically via BEFORE trigger to prevent
--      double-payout on any subsequent completed → completed update.
-- ══════════════════════════════════════════════════════════════════════════

-- ── 1. Add payout flag ────────────────────────────────────────────────────
ALTER TABLE public.marketplace_orders
  ADD COLUMN IF NOT EXISTS is_paid_out boolean NOT NULL DEFAULT false;

-- Back-fill already-completed orders so the flag is consistent
UPDATE public.marketplace_orders
   SET is_paid_out = true
 WHERE status = 'completed'
   AND COALESCE(region, '') = 'KZ';

-- ── 2. Rewrite escrow-release as a BEFORE trigger ─────────────────────────
-- Using BEFORE so we can set NEW.is_paid_out = true in the same row write,
-- making the guard atomic with the status transition.
CREATE OR REPLACE FUNCTION release_kz_escrow_on_acceptance()
RETURNS TRIGGER AS $$
DECLARE
  v_freelancer_uid uuid;
  v_payout         numeric;
BEGIN
  -- Guard: only KZ orders reaching 'completed' that have not been paid out yet
  IF NEW.status = 'completed'
     AND NEW.is_paid_out = false
     AND COALESCE(NEW.region, '') = 'KZ' THEN

    SELECT user_id INTO v_freelancer_uid
      FROM creator_profiles WHERE id = NEW.creator_id LIMIT 1;

    -- Use the frozen snapshot amount; never recompute from current price
    v_payout := COALESCE(NEW.creator_payout_amount, ROUND(NEW.package_price * 0.85, 2));

    IF v_freelancer_uid IS NOT NULL AND v_payout > 0 THEN
      UPDATE creator_profiles
         SET balance_available    = balance_available    + v_payout,
             balance_on_hold      = GREATEST(balance_on_hold - v_payout, 0),
             balance_total_earned = balance_total_earned + v_payout,
             orders_completed     = orders_completed + 1
       WHERE user_id = v_freelancer_uid;

      UPDATE creator_transactions
         SET status = 'available'
       WHERE order_id = NEW.id
         AND status   = 'on_hold';
    END IF;

    -- Stamp the flag — idempotency guard, prevents any future re-trigger
    NEW.is_paid_out := true;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- Replace previous AFTER trigger with a BEFORE trigger
DROP TRIGGER IF EXISTS trg_release_kz_escrow_on_acceptance ON public.marketplace_orders;
CREATE TRIGGER trg_release_kz_escrow_on_acceptance
  BEFORE UPDATE ON public.marketplace_orders
  FOR EACH ROW
  EXECUTE FUNCTION release_kz_escrow_on_acceptance();
