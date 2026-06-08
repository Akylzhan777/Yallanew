/*
  # Fix deal chat trigger to use correct column name

  1. Changes
    - Updates create_deal_chat_on_payment() to use client_user_id (actual column)
    - Adds guard: only creates chat if client_user_id is not null
*/

CREATE OR REPLACE FUNCTION create_deal_chat_on_payment()
RETURNS TRIGGER AS $$
DECLARE
  v_freelancer_uid uuid;
  v_chat_id uuid;
BEGIN
  IF NEW.status = 'paid' AND OLD.status IS DISTINCT FROM 'paid' AND NEW.client_user_id IS NOT NULL THEN
    SELECT user_id INTO v_freelancer_uid FROM creator_profiles WHERE id = NEW.creator_id LIMIT 1;

    IF v_freelancer_uid IS NOT NULL AND NOT EXISTS (SELECT 1 FROM deal_chats WHERE order_id = NEW.id) THEN
      INSERT INTO deal_chats (order_id, client_id, freelancer_id)
      VALUES (NEW.id, NEW.client_user_id, v_freelancer_uid)
      RETURNING id INTO v_chat_id;

      INSERT INTO deal_messages (chat_id, sender_id, text, is_system)
      VALUES (v_chat_id, v_freelancer_uid, 'Order paid. Chat opened — you can now discuss project details.', true);
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
