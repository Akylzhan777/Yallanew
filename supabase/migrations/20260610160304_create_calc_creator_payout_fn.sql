-- ══════════════════════════════════════════════════════════════════════════
-- calc_creator_payout(p_price) — single calculation point
--
-- app_settings has a platform_commission_rate column (numeric), not key/value.
-- This function reads the rate from that column and returns the creator payout.
-- Changing app_settings.platform_commission_rate changes every payout everywhere.
-- ══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION calc_creator_payout(p_price numeric)
RETURNS numeric
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_rate numeric;
BEGIN
  SELECT platform_commission_rate
    INTO v_rate
    FROM app_settings
   ORDER BY id
   LIMIT 1;

  IF v_rate IS NULL OR v_rate <= 0 OR v_rate >= 1 THEN
    v_rate := 0.20;
  END IF;

  RETURN ROUND(COALESCE(p_price, 0) * (1 - v_rate), 2);
END;
$$;

-- ── Rewire escrow release to use calc_creator_payout() ───────────────────
CREATE OR REPLACE FUNCTION release_kz_escrow_on_acceptance()
RETURNS TRIGGER AS $$
DECLARE
  v_freelancer_uid  uuid;
  v_payout          numeric;
  v_current_hold    numeric;
BEGIN
  IF NEW.status = 'completed'
     AND NEW.is_paid_out = false THEN

    SELECT user_id INTO v_freelancer_uid
      FROM creator_profiles WHERE id = NEW.creator_id LIMIT 1;

    v_payout := calc_creator_payout(NEW.package_price);

    IF v_freelancer_uid IS NOT NULL AND v_payout > 0 THEN

      SELECT balance_on_hold INTO v_current_hold
        FROM creator_profiles
       WHERE user_id = v_freelancer_uid;

      IF v_current_hold IS NULL OR v_current_hold < v_payout THEN
        RAISE EXCEPTION
          'Escrow: insufficient balance_on_hold for payout. Attempted: %, Available: %',
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

-- ── Rewire price-change sync to use calc_creator_payout() ────────────────
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

    v_old_payout := calc_creator_payout(OLD.package_price);
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
