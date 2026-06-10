-- ══════════════════════════════════════════════════════════════════════════
-- Fix escrow payout to use creator_payout_amount (Model B: creator's base price).
--
-- package_price now stores clientPrice (base × 1.20).
-- creator_payout_amount stores the creator's base price (set by the frontend).
-- Fallback: package_price / 1.20 = calc_creator_payout(package_price).
-- Remove all hardcoded × 0.85 / × 0.80 multipliers.
-- ══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION release_kz_escrow_on_acceptance()
RETURNS TRIGGER AS $$
DECLARE
  v_freelancer_uid uuid;
  v_payout         numeric;
  v_current_hold   numeric;
BEGIN
  IF NEW.status = 'completed'
     AND NEW.is_paid_out = false THEN

    SELECT user_id INTO v_freelancer_uid
      FROM creator_profiles WHERE id = NEW.creator_id LIMIT 1;

    -- creator_payout_amount = creator's base price (what they receive).
    -- Fallback: divide clientPrice by (1 + commission_rate) via calc_creator_payout.
    v_payout := COALESCE(
      NULLIF(NEW.creator_payout_amount, 0),
      calc_creator_payout(NEW.package_price)
    );

    IF v_freelancer_uid IS NOT NULL AND v_payout > 0 THEN

      SELECT balance_on_hold INTO v_current_hold
        FROM creator_profiles
       WHERE user_id = v_freelancer_uid;

      IF v_current_hold IS NULL OR v_current_hold < v_payout THEN
        RAISE EXCEPTION
          'Escrow: insufficient balance_on_hold for payout. '
          'Attempted: %, Available in hold: %',
          v_payout, COALESCE(v_current_hold, 0);
      END IF;

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

    NEW.is_paid_out := true;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS trg_release_kz_escrow_on_acceptance ON public.marketplace_orders;
CREATE TRIGGER trg_release_kz_escrow_on_acceptance
  BEFORE UPDATE ON public.marketplace_orders
  FOR EACH ROW
  EXECUTE FUNCTION release_kz_escrow_on_acceptance();

-- ── Price-change guard: recompute snapshot using Model B formula ──────────
CREATE OR REPLACE FUNCTION sync_payout_on_price_change()
RETURNS TRIGGER AS $$
DECLARE
  v_freelancer_uid uuid;
  v_old_payout     numeric;
  v_new_payout     numeric;
  v_diff           numeric;
BEGIN
  IF NEW.status = 'on_hold'
     AND NEW.package_price IS DISTINCT FROM OLD.package_price THEN

    v_old_payout := COALESCE(NULLIF(OLD.creator_payout_amount, 0), calc_creator_payout(OLD.package_price));
    v_new_payout := calc_creator_payout(NEW.package_price);
    v_diff       := v_new_payout - v_old_payout;

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
