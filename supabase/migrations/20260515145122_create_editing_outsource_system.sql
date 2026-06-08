/*
  # Create Editing Outsource System

  Full module for creators to order video editing from freelance editors, 
  with escrow payment, internal chat, and role masking.

  1. New Tables
    - `editing_editor_profiles`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users) — editor's auth account
      - `display_name` (text) — public alias e.g. "Editor #42"
      - `real_name` (text) — known only to admin
      - `specialties` (text[]) — Reels, Commercial, etc.
      - `balance` (integer) — earned balance in AED
      - `rating` (numeric) — average rating
      - `completed_count` (integer) — total completed orders
      - `available` (boolean) — accepting new work
      - `created_at` (timestamptz)

    - `editing_orders`
      - `id` (uuid, primary key)
      - `order_number` (serial) — visible order number e.g. "Order #1005"
      - `creator_id` (text) — who placed the order
      - `creator_email` (text)
      - `editor_id` (uuid, nullable) — assigned editor
      - `title` (text) — project name
      - `video_type` (text) — Reels/Commercial/YouTube/TikTok
      - `source_link` (text) — Google Drive / Frame.io link
      - `brief` (text) — editing instructions, style, music refs
      - `deadline` (timestamptz)
      - `budget` (integer) — price in AED
      - `platform_fee` (integer) — platform commission
      - `editor_payout` (integer) — what editor receives
      - `status` (text) — pending_payment, open, assigned, in_progress, review, revision, completed, cancelled
      - `stripe_session_id` (text)
      - `result_link` (text) — final video link from editor
      - `preview_link` (text) — watermarked preview
      - `completed_at` (timestamptz)
      - `created_at` (timestamptz)

    - `order_messages`
      - `id` (uuid, primary key)
      - `order_id` (uuid, references editing_orders)
      - `sender_role` (text) — creator/editor/admin
      - `sender_id` (text) — auth uid or editor profile id
      - `content` (text) — message text
      - `attachment_url` (text) — optional file attachment
      - `has_flagged_content` (boolean) — if contact info detected
      - `created_at` (timestamptz)

  2. Security
    - RLS on all three tables
    - Editors see only their tasks
    - Creators see only their orders
    - Admins see everything

  3. Notes
    - order_number uses a sequence for auto-increment
    - Contact detection is handled at app level
*/

-- Sequence for order numbers starting at 1001
CREATE SEQUENCE IF NOT EXISTS editing_order_number_seq START WITH 1001;

-- Editor profiles table
CREATE TABLE IF NOT EXISTS editing_editor_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE NOT NULL,
  display_name text NOT NULL DEFAULT '',
  real_name text NOT NULL DEFAULT '',
  specialties text[] DEFAULT '{}',
  balance integer DEFAULT 0,
  rating numeric(3,2) DEFAULT 0.00,
  completed_count integer DEFAULT 0,
  available boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE editing_editor_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Editors can read own profile"
  ON editing_editor_profiles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Editors can update own profile"
  ON editing_editor_profiles FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can manage all editor profiles"
  ON editing_editor_profiles FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND (profiles.role = 'admin' OR profiles.is_admin = true)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND (profiles.role = 'admin' OR profiles.is_admin = true)
    )
  );

-- Editing orders table
CREATE TABLE IF NOT EXISTS editing_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number integer NOT NULL DEFAULT nextval('editing_order_number_seq'),
  creator_id text NOT NULL,
  creator_email text DEFAULT '',
  editor_id uuid REFERENCES editing_editor_profiles(id),
  title text NOT NULL DEFAULT '',
  video_type text NOT NULL DEFAULT 'Reels',
  source_link text DEFAULT '',
  brief text DEFAULT '',
  deadline timestamptz,
  budget integer NOT NULL DEFAULT 0,
  platform_fee integer DEFAULT 0,
  editor_payout integer DEFAULT 0,
  status text NOT NULL DEFAULT 'pending_payment',
  stripe_session_id text DEFAULT '',
  result_link text DEFAULT '',
  preview_link text DEFAULT '',
  completed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE editing_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Creators can read own editing orders"
  ON editing_orders FOR SELECT
  TO authenticated
  USING (creator_id = auth.uid()::text);

CREATE POLICY "Creators can insert editing orders"
  ON editing_orders FOR INSERT
  TO authenticated
  WITH CHECK (creator_id = auth.uid()::text);

CREATE POLICY "Editors can read assigned orders"
  ON editing_orders FOR SELECT
  TO authenticated
  USING (
    editor_id IN (
      SELECT id FROM editing_editor_profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Editors can update assigned orders"
  ON editing_orders FOR UPDATE
  TO authenticated
  USING (
    editor_id IN (
      SELECT id FROM editing_editor_profiles WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    editor_id IN (
      SELECT id FROM editing_editor_profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Editors can read open orders"
  ON editing_orders FOR SELECT
  TO authenticated
  USING (
    status = 'open' AND
    EXISTS (SELECT 1 FROM editing_editor_profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "Admins can manage all editing orders"
  ON editing_orders FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND (profiles.role = 'admin' OR profiles.is_admin = true)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND (profiles.role = 'admin' OR profiles.is_admin = true)
    )
  );

-- Order messages table (internal chat)
CREATE TABLE IF NOT EXISTS order_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES editing_orders(id),
  sender_role text NOT NULL DEFAULT 'creator',
  sender_id text NOT NULL,
  content text DEFAULT '',
  attachment_url text DEFAULT '',
  has_flagged_content boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE order_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Creators can read messages for own orders"
  ON order_messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM editing_orders WHERE editing_orders.id = order_messages.order_id AND editing_orders.creator_id = auth.uid()::text
    )
  );

CREATE POLICY "Creators can insert messages for own orders"
  ON order_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM editing_orders WHERE editing_orders.id = order_messages.order_id AND editing_orders.creator_id = auth.uid()::text
    )
  );

CREATE POLICY "Editors can read messages for assigned orders"
  ON order_messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM editing_orders eo
      JOIN editing_editor_profiles eep ON eep.id = eo.editor_id
      WHERE eo.id = order_messages.order_id AND eep.user_id = auth.uid()
    )
  );

CREATE POLICY "Editors can insert messages for assigned orders"
  ON order_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM editing_orders eo
      JOIN editing_editor_profiles eep ON eep.id = eo.editor_id
      WHERE eo.id = order_messages.order_id AND eep.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all messages"
  ON order_messages FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND (profiles.role = 'admin' OR profiles.is_admin = true)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND (profiles.role = 'admin' OR profiles.is_admin = true)
    )
  );

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_editing_orders_creator ON editing_orders(creator_id);
CREATE INDEX IF NOT EXISTS idx_editing_orders_editor ON editing_orders(editor_id);
CREATE INDEX IF NOT EXISTS idx_editing_orders_status ON editing_orders(status);
CREATE INDEX IF NOT EXISTS idx_order_messages_order ON order_messages(order_id);
CREATE INDEX IF NOT EXISTS idx_editing_editor_profiles_user ON editing_editor_profiles(user_id);
