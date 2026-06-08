-- ══════════════════════════════════════════════════════════════════════════
-- KZ Escrow: Snapshot-based payout fix
--
-- Problem: release_kz_escrow_on_acceptance computed net payout dynamically
-- as (package_price * 0.8) at acceptance time, diverging from the amount
-- actually frozen at checkout (which was net = price - 15% commission = 85%).
-- This left a 5% ghost balance permanently stuck in balance_on_hold, and
-- opened a desync window if any admin edited package_price mid-order.
--
-- Fix:
--   1. Add creator_payout_amount column — frozen once at payment time.
--   2. Rewrite release trigger to use that fixed snapshot value.
--   3. Add UPDATE trigger: if package_price changes on an on_hold order,
--      recalculate creator_payout_amount and adjust balance_on_hold by the diff.
-- ══════════════════════════════════════════════════════════════════════════

-- ── 1. Add snapshot column ────────────────────────────────────────────────
ALTER TABLE public.marketplace_orders
  ADD COLUMN IF NOT EXISTS creator_payout_amount numeric(12,2) DEFAULT 0;

-- Back-fill existing on_hold/completed rows using the same formula the
-- JS client used: price minus 15% platform commission.
UPDATE public.marketplace_orders
   SET creator_payout_amount = ROUND(package_price * 0.85, 2)
 WHERE creator_payout_amount = 0
   AND package_price > 0;

-- ── 2. Rewrite escrow-release trigger ────────────────────────────────────
CREATE OR REPLACE FUNCTION release_kz_escrow_on_acceptance()
RETURNS TRIGGER AS $$
DECLARE
  v_freelancer_uid uuid;
  v_payout         numeric;
BEGIN
  -- Only fire when a KZ on_hold order becomes completed
  IF NEW.status = 'completed'
     AND OLD.status = 'on_hold'
     AND COALESCE(NEW.region, '') = 'KZ' THEN

    SELECT user_id INTO v_freelancer_uid
      FROM creator_profiles WHERE id = NEW.creator_id LIMIT 1;

    -- Use the snapshot amount frozen at checkout, never recompute from price
    v_payout := COALESCE(NEW.creator_payout_amount, ROUND(NEW.package_price * 0.85, 2));

    IF v_freelancer_uid IS NOT NULL AND v_payout > 0 THEN
      UPDATE creator_profiles
         SET balance_available    = balance_available    + v_payout,
             balance_on_hold      = GREATEST(balance_on_hold - v_payout, 0),
             balance_total_earned = balance_total_earned + v_payout,
             orders_completed     = orders_completed + 1
       WHERE user_id = v_freelancer_uid;

      -- Mark the corresponding transaction as available
      UPDATE creator_transactions
         SET status = 'available'
       WHERE order_id = NEW.id
         AND status   = 'on_hold';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS trg_release_kz_escrow_on_acceptance ON public.marketplace_orders;
CREATE TRIGGER trg_release_kz_escrow_on_acceptance
  AFTER UPDATE ON public.marketplace_orders
  FOR EACH ROW
  EXECUTE FUNCTION release_kz_escrow_on_acceptance();

-- ── 3. Price-change guard trigger ────────────────────────────────────────
-- Fires when an admin edits package_price on an active (on_hold) KZ order.
-- Recalculates creator_payout_amount and adjusts balance_on_hold by the diff.
CREATE OR REPLACE FUNCTION sync_payout_on_price_change()
RETURNS TRIGGER AS $$
DECLARE
  v_freelancer_uid uuid;
  v_old_payout     numeric;
  v_new_payout     numeric;
  v_diff           numeric;
BEGIN
  -- Only relevant for KZ on_hold orders where package_price changed
  IF NEW.status = 'on_hold'
     AND COALESCE(NEW.region, '') = 'KZ'
     AND NEW.package_price IS DISTINCT FROM OLD.package_price THEN

    v_old_payout := COALESCE(OLD.creator_payout_amount, ROUND(OLD.package_price * 0.85, 2));
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
