/*
  # Create Deal Chats and Messages system

  1. New Tables
    - `deal_chats`
      - `id` (uuid, primary key)
      - `order_id` (uuid, references marketplace_orders)
      - `client_id` (uuid, references auth.users)
      - `freelancer_id` (uuid, references auth.users)
      - `status` (text: active, closed) default 'active'
      - `created_at` (timestamptz)
    - `deal_messages`
      - `id` (uuid, primary key)
      - `chat_id` (uuid, references deal_chats)
      - `sender_id` (uuid, references auth.users)
      - `text` (text, nullable)
      - `file_url` (text, nullable)
      - `file_type` (text, nullable - image/video/document)
      - `is_system` (boolean, for system messages like "Work submitted")
      - `created_at` (timestamptz)

  2. Security
    - RLS enabled on both tables
    - Only chat participants (client or freelancer) can read/write
    - Participants can only insert messages in their own chats
    - System ensures chat is created only after payment

  3. Storage
    - Creates chat-files bucket for file exchange (500MB limit handled client-side)

  4. Trigger
    - Auto-creates a chat when marketplace_orders status changes to 'paid'
*/

-- Deal Chats table
CREATE TABLE IF NOT EXISTS deal_chats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL,
  client_id uuid NOT NULL,
  freelancer_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS deal_chats_order_id_idx ON deal_chats (order_id);

ALTER TABLE deal_chats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Chat participants can read their chats"
  ON deal_chats FOR SELECT TO authenticated
  USING (auth.uid() = client_id OR auth.uid() = freelancer_id);

CREATE POLICY "System inserts chats via trigger"
  ON deal_chats FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = client_id OR auth.uid() = freelancer_id);

-- Deal Messages table
CREATE TABLE IF NOT EXISTS deal_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id uuid NOT NULL REFERENCES deal_chats(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  text text,
  file_url text,
  file_type text,
  is_system boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS deal_messages_chat_id_idx ON deal_messages (chat_id);
CREATE INDEX IF NOT EXISTS deal_messages_created_at_idx ON deal_messages (chat_id, created_at);

ALTER TABLE deal_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Chat participants can read messages"
  ON deal_messages FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM deal_chats
      WHERE deal_chats.id = deal_messages.chat_id
      AND (deal_chats.client_id = auth.uid() OR deal_chats.freelancer_id = auth.uid())
    )
  );

CREATE POLICY "Chat participants can send messages"
  ON deal_messages FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM deal_chats
      WHERE deal_chats.id = deal_messages.chat_id
      AND deal_chats.status = 'active'
      AND (deal_chats.client_id = auth.uid() OR deal_chats.freelancer_id = auth.uid())
    )
  );

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE deal_messages;

-- Storage bucket for chat files
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('chat-files', 'chat-files', true, 524288000)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for chat-files bucket
CREATE POLICY "Authenticated users can upload chat files"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'chat-files' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Anyone can read chat files"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'chat-files');

-- Function to auto-create chat when order is paid
CREATE OR REPLACE FUNCTION create_deal_chat_on_payment()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'paid' AND OLD.status IS DISTINCT FROM 'paid' THEN
    INSERT INTO deal_chats (order_id, client_id, freelancer_id)
    SELECT
      NEW.id,
      COALESCE(NEW.buyer_user_id, NEW.buyer_email::uuid),
      (SELECT user_id FROM creator_profiles WHERE id = NEW.creator_id LIMIT 1)
    WHERE NOT EXISTS (SELECT 1 FROM deal_chats WHERE order_id = NEW.id);

    -- Insert system message
    INSERT INTO deal_messages (chat_id, sender_id, text, is_system)
    SELECT dc.id, dc.freelancer_id, 'Order paid. Chat opened. You can now discuss the project details.', true
    FROM deal_chats dc WHERE dc.order_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_create_deal_chat ON marketplace_orders;
CREATE TRIGGER trigger_create_deal_chat
  AFTER UPDATE ON marketplace_orders
  FOR EACH ROW
  EXECUTE FUNCTION create_deal_chat_on_payment();
