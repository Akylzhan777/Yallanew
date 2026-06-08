-- ══════════════════════════════════════════════════════════════════════════
-- KZ Escrow Flow
--
-- 1. update create_deal_chat_on_payment: fires on 'on_hold' for KZ orders
--    (instead of 'paid') and inserts the escrow system message.
--    UAE orders continue to fire on 'paid' unchanged.
--
-- 2. release_kz_escrow_on_acceptance: when a KZ order transitions from
--    on_hold → completed (client presses "Accept Work"), automatically
--    move balance_on_hold → balance_available on the creator profile.
-- ══════════════════════════════════════════════════════════════════════════

-- ── 1. Update chat-creation trigger ───────────────────────────────────────
CREATE OR REPLACE FUNCTION create_deal_chat_on_payment()
RETURNS TRIGGER AS $$
DECLARE
  v_freelancer_uid uuid;
  v_chat_id uuid;
  v_region text;
  v_package_name text;
  v_message text;
  v_net_amount numeric;
BEGIN
  v_region := COALESCE(NEW.region, '');

  -- KZ: trigger on 'on_hold'; UAE/other: trigger on 'paid'
  IF NOT (
    (v_region = 'KZ'  AND NEW.status = 'on_hold' AND OLD.status IS DISTINCT FROM 'on_hold') OR
    (v_region <> 'KZ' AND NEW.status = 'paid'    AND OLD.status IS DISTINCT FROM 'paid')
  ) THEN
    RETURN NEW;
  END IF;

  IF NEW.client_user_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT user_id INTO v_freelancer_uid
    FROM creator_profiles WHERE id = NEW.creator_id LIMIT 1;

  IF v_freelancer_uid IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM deal_chats WHERE order_id = NEW.id) THEN

    INSERT INTO deal_chats (order_id, client_id, freelancer_id)
    VALUES (NEW.id, NEW.client_user_id, v_freelancer_uid)
    RETURNING id INTO v_chat_id;

    v_package_name := COALESCE(NEW.package_name, 'Заказ');
    v_net_amount   := ROUND(COALESCE(NEW.package_price, 0) * 0.8);

    IF v_region = 'KZ' THEN
      v_message :=
        'Привет! У тебя купили твою услугу "' || v_package_name ||
        '" за ' || ROUND(COALESCE(NEW.package_price, 0))::text ||
        ' KZT. Ты сможешь вывести деньги ровно тогда, когда заказчик примет твою работу. '||
        'Они надёжно заморожены на платформе.';
      INSERT INTO deal_messages (chat_id, sender_id, text, is_system)
      VALUES (v_chat_id, v_freelancer_uid, v_message, true);
    ELSE
      INSERT INTO deal_messages (chat_id, sender_id, text, is_system)
      VALUES (v_chat_id, v_freelancer_uid,
              'Order paid. Chat opened — you can now discuss project details.', true);
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure trigger exists (it was already created in a prior migration)
DROP TRIGGER IF EXISTS trg_create_deal_chat_on_payment ON public.marketplace_orders;
CREATE TRIGGER trg_create_deal_chat_on_payment
  AFTER UPDATE ON public.marketplace_orders
  FOR EACH ROW
  EXECUTE FUNCTION create_deal_chat_on_payment();


-- ── 2. Escrow-release trigger ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION release_kz_escrow_on_acceptance()
RETURNS TRIGGER AS $$
DECLARE
  v_freelancer_uid uuid;
  v_net_amount     numeric;
BEGIN
  -- Only fire when a KZ on_hold order becomes completed
  IF NEW.status = 'completed'
     AND OLD.status = 'on_hold'
     AND COALESCE(NEW.region, '') = 'KZ' THEN

    SELECT user_id INTO v_freelancer_uid
      FROM creator_profiles WHERE id = NEW.creator_id LIMIT 1;

    v_net_amount := ROUND(COALESCE(NEW.package_price, 0) * 0.8);

    IF v_freelancer_uid IS NOT NULL THEN
      UPDATE creator_profiles
        SET balance_available = balance_available + v_net_amount,
            balance_on_hold   = GREATEST(balance_on_hold - v_net_amount, 0)
      WHERE user_id = v_freelancer_uid;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_release_kz_escrow_on_acceptance ON public.marketplace_orders;
CREATE TRIGGER trg_release_kz_escrow_on_acceptance
  AFTER UPDATE ON public.marketplace_orders
  FOR EACH ROW
  EXECUTE FUNCTION release_kz_escrow_on_acceptance();
