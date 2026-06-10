-- ══════════════════════════════════════════════════════════════════════════
-- Escrow Release: Remove KZ region restriction
--
-- Problem: release_kz_escrow_on_acceptance only fires for region = 'KZ'.
-- AE orders and region-less orders never move balance_on_hold → available.
--
-- Fix:
--   1. Drop the COALESCE(NEW.region,'') = 'KZ' guard from the release trigger.
--   2. Drop the same guard from sync_payout_on_price_change (price-edit guard).
--   3. Back-fill is_paid_out = true for all already-completed orders (any region).
-- ══════════════════════════════════════════════════════════════════════════

-- ── 1. Back-fill flag for completed orders of any region ─────────────────
UPDATE public.marketplace_orders
   SET is_paid_out = true
 WHERE status = 'completed'
   AND is_paid_out = false;

-- ── 2. Rewrite release trigger — all regions ─────────────────────────────
CREATE OR REPLACE FUNCTION release_kz_escrow_on_acceptance()
RETURNS TRIGGER AS $$
DECLARE
  v_freelancer_uid  uuid;
  v_payout          numeric;
  v_current_hold    numeric;
BEGIN
  -- Guard: any order reaching 'completed' that has not been paid out yet
  IF NEW.status = 'completed'
     AND NEW.is_paid_out = false THEN

    SELECT user_id INTO v_freelancer_uid
      FROM creator_profiles WHERE id = NEW.creator_id LIMIT 1;

    -- Use the frozen snapshot amount; never recompute from current price
    v_payout := COALESCE(NULLIF(NEW.creator_payout_amount, 0), ROUND(NEW.package_price * 0.85, 2));

    IF v_freelancer_uid IS NOT NULL AND v_payout > 0 THEN

      -- ── Pre-check: read current hold balance ───────────────────────────
      SELECT balance_on_hold INTO v_current_hold
        FROM creator_profiles
       WHERE user_id = v_freelancer_uid;

      -- Strict guard — refuse if hold is insufficient
      IF v_current_hold IS NULL OR v_current_hold < v_payout THEN
        RAISE EXCEPTION
          'Escrow: insufficient balance_on_hold for payout. '
          'Attempted: %, Available in hold: %',
          v_payout, COALESCE(v_current_hold, 0);
      END IF;

      -- ── Atomic transfer: hold → available ──────────────────────────────
      UPDATE creator_profiles
         SET balance_available    = balance_available    + v_payout,
             balance_on_hold      = balance_on_hold      - v_payout,
             balance_total_earned = balance_total_earned + v_payout,
             orders_completed     = orders_completed + 1
       WHERE user_id = v_freelancer_uid;

      UPDATE creator_transactions
         SET status = 'available'
       WHERE order_id = NEW.id
         AND status   = 'on_hold';
    END IF;

    -- Stamp the idempotency flag — prevents double-payout on any future update
    NEW.is_paid_out := true;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- Trigger already exists as BEFORE UPDATE — just replace the function body above
-- (no need to recreate the trigger, but idempotently ensure it's correct)
DROP TRIGGER IF EXISTS trg_release_kz_escrow_on_acceptance ON public.marketplace_orders;
CREATE TRIGGER trg_release_kz_escrow_on_acceptance
  BEFORE UPDATE ON public.marketplace_orders
  FOR EACH ROW
  EXECUTE FUNCTION release_kz_escrow_on_acceptance();

-- ── 3. Rewrite price-change guard — all regions ──────────────────────────
CREATE OR REPLACE FUNCTION sync_payout_on_price_change()
RETURNS TRIGGER AS $$
DECLARE
  v_freelancer_uid uuid;
  v_old_payout     numeric;
  v_new_payout     numeric;
  v_diff           numeric;
BEGIN
  -- Only relevant for on_hold orders where package_price changed
  IF NEW.status = 'on_hold'
     AND NEW.package_price IS DISTINCT FROM OLD.package_price THEN

    v_old_payout := COALESCE(NULLIF(OLD.creator_payout_amount, 0), ROUND(OLD.package_price * 0.85, 2));
    v_new_payout := ROUND(NEW.package_price * 0.85, 2);
    v_diff       := v_new_payout - v_old_payout;

    -- Write the updated snapshot
    NEW.creator_payout_amount := v_new_payout;

    IF v_diff <> 0 THEN
      SELECT user_id INTO v_freelancer_uid
        FROM creator_profiles WHERE id = NEW.creator_id LIMIT 1;

      IF v_freelancer_uid IS NOT NULL THEN
        UPDATE creator_profiles
           SET balance_on_hold = GREATEST(balance_on_hold + v_diff, 0)
         WHERE user_id = v_freelancer_uid;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS trg_sync_payout_on_price_change ON public.marketplace_orders;
CREATE TRIGGER trg_sync_payout_on_price_change
  BEFORE UPDATE ON public.marketplace_orders
  FOR EACH ROW
  EXECUTE FUNCTION sync_payout_on_price_change();
