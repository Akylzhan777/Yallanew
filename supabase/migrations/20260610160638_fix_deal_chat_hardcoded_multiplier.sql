-- Fix last hardcoded * 0.8 in create_deal_chat_on_payment
-- v_net_amount is used only in notification text, not for balance credits.
-- Replace ROUND(price * 0.8) with calc_creator_payout(price) for consistency.

CREATE OR REPLACE FUNCTION create_deal_chat_on_payment()
RETURNS TRIGGER AS $$
DECLARE
  v_freelancer_uid uuid;
  v_chat_id        uuid;
  v_region         text;
  v_package_name   text;
  v_message        text;
  v_net_amount     numeric;
BEGIN
  v_region := COALESCE(NEW.region, '');

  -- KZ: trigger on 'on_hold'; UAE/other: trigger on 'paid'
  IF NOT (
    (v_region = 'KZ'  AND NEW.status = 'on_hold' AND OLD.status IS DISTINCT FROM 'on_hold') OR
    (v_region <> 'KZ' AND NEW.status = 'paid'    AND OLD.status IS DISTINCT FROM 'paid')
  ) THEN
    RETURN NEW;
  END IF;

  -- For booking orders: confirm the linked creator_booking
  IF COALESCE(NEW.order_type, 'product') = 'booking' THEN
    UPDATE creator_bookings
       SET status = 'confirmed'
     WHERE order_id = NEW.id
       AND status = 'pending_payment';
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
    v_net_amount   := calc_creator_payout(NEW.package_price);

    IF v_region = 'KZ' THEN
      v_message :=
        'Привет! У тебя купили твою услугу "' || v_package_name ||
        '" за ' || ROUND(COALESCE(NEW.package_price, 0))::text ||
        ' KZT. Ты сможешь вывести деньги ровно тогда, когда заказчик примет твою работу. ' ||
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;
