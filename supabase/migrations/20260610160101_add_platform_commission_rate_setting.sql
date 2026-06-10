-- ══════════════════════════════════════════════════════════════════════════
-- Single source of truth: platform commission rate
--
-- app_settings is a single-row config table (columns, not key/value).
-- We add one column: platform_commission_rate numeric(5,4) DEFAULT 0.2000
-- and set it on the existing row.
--
-- All escrow payout logic reads from this column via get_platform_commission(),
-- so changing the rate requires only one UPDATE on app_settings.
-- ══════════════════════════════════════════════════════════════════════════

-- ── 1. Add column ─────────────────────────────────────────────────────────
ALTER TABLE public.app_settings
  ADD COLUMN IF NOT EXISTS platform_commission_rate numeric(5,4) NOT NULL DEFAULT 0.2000;

-- ── 2. Set the rate on every existing row ────────────────────────────────
UPDATE public.app_settings
   SET platform_commission_rate = 0.2000;

-- ── 3. Helper function: single call-site for the rate ────────────────────
-- Returns the commission rate from app_settings row 1.
-- Falls back to 0.20 if no row exists (safety for empty-DB environments).
CREATE OR REPLACE FUNCTION get_platform_commission()
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT COALESCE(
    (SELECT platform_commission_rate FROM app_settings ORDER BY id LIMIT 1),
    0.2000
  );
$$;

-- ── 4. Rewrite escrow release to use get_platform_commission() ───────────
CREATE OR REPLACE FUNCTION release_kz_escrow_on_acceptance()
RETURNS TRIGGER AS $$
DECLARE
  v_freelancer_uid  uuid;
  v_commission      numeric;
  v_payout          numeric;
  v_current_hold    numeric;
BEGIN
  IF NEW.status = 'completed'
     AND NEW.is_paid_out = false THEN

    SELECT user_id INTO v_freelancer_uid
      FROM creator_profiles WHERE id = NEW.creator_id LIMIT 1;

    v_commission := get_platform_commission();
    v_payout     := ROUND(COALESCE(NEW.package_price, 0) * (1 - v_commission), 2);

    IF v_freelancer_uid IS NOT NULL AND v_payout > 0 THEN

      SELECT balance_on_hold INTO v_current_hold
        FROM creator_profiles
       WHERE user_id = v_freelancer_uid;

      IF v_current_hold IS NULL OR v_current_hold < v_payout THEN
        RAISE EXCEPTION
          'Escrow: insufficient balance_on_hold for payout. '
          'Attempted: %, Available in hold: %, Commission rate: %',
          v_payout, COALESCE(v_current_hold, 0), v_commission;
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

-- ── 5. Rewrite price-change sync to use get_platform_commission() ────────
CREATE OR REPLACE FUNCTION sync_payout_on_price_change()
RETURNS TRIGGER AS $$
DECLARE
  v_freelancer_uid uuid;
  v_commission     numeric;
  v_old_payout     numeric;
  v_new_payout     numeric;
  v_diff           numeric;
BEGIN
  IF NEW.status = 'on_hold'
     AND NEW.package_price IS DISTINCT FROM OLD.package_price THEN

    v_commission := get_platform_commission();
    v_old_payout := ROUND(COALESCE(OLD.package_price, 0) * (1 - v_commission), 2);
    v_new_payout := ROUND(COALESCE(NEW.package_price, 0) * (1 - v_commission), 2);
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
