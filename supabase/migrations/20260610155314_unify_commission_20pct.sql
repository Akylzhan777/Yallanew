-- ══════════════════════════════════════════════════════════════════════════
-- Unified 20% platform commission
--
-- Changes:
--   1. release_kz_escrow_on_acceptance: 0.85 → 0.80 (always compute fresh)
--   2. sync_payout_on_price_change: 0.85 → 0.80
--   3. Back-fill creator_payout_amount for existing on_hold orders
--   4. Drop duplicate trigger trigger_create_deal_chat (same fn, fires twice)
-- ══════════════════════════════════════════════════════════════════════════

-- ── 1. Escrow release: always 80% of package_price ───────────────────────
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

    -- Always 80% of the order price (20% platform commission)
    v_payout := ROUND(COALESCE(NEW.package_price, 0) * 0.80, 2);

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

-- ── 2. Price-change sync: always 80% ────────────────────────────────────
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

    v_old_payout := ROUND(COALESCE(OLD.package_price, 0) * 0.80, 2);
    v_new_payout := ROUND(COALESCE(NEW.package_price, 0) * 0.80, 2);
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

-- ── 3. Back-fill creator_payout_amount for active on_hold orders ─────────
UPDATE public.marketplace_orders
   SET creator_payout_amount = ROUND(package_price * 0.80, 2)
 WHERE status IN ('on_hold', 'pending')
   AND package_price > 0;

-- ── 4. Drop duplicate trigger (same function fires twice per update) ──────
DROP TRIGGER IF EXISTS trigger_create_deal_chat ON public.marketplace_orders;
