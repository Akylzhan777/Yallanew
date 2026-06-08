-- ══════════════════════════════════════════════════════════════════════════
-- KZ Escrow: Strict hold validation — eliminate GREATEST money-printing bug
--
-- Problem: GREATEST(balance_on_hold - v_payout, 0) silently absorbs any
-- shortfall, crediting balance_available with funds that were never held.
--
-- Fix: read the current hold value first; RAISE EXCEPTION if insufficient,
-- ensuring the transaction rolls back instead of creating money from nothing.
-- ══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION release_kz_escrow_on_acceptance()
RETURNS TRIGGER AS $$
DECLARE
  v_freelancer_uid  uuid;
  v_payout          numeric;
  v_current_hold    numeric;
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

      -- ── Pre-check: read current hold balance ───────────────────────────
      SELECT balance_on_hold INTO v_current_hold
        FROM creator_profiles
       WHERE user_id = v_freelancer_uid;

      -- Strict guard — refuse to proceed if hold is insufficient
      IF v_current_hold IS NULL OR v_current_hold < v_payout THEN
        RAISE EXCEPTION
          'KZ Escrow: insufficient balance_on_hold for payout. '
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

    -- Stamp the idempotency flag
    NEW.is_paid_out := true;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;
