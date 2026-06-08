/*
  # Subcontracting System & In-App Notifications

  ## Summary
  Implements the full subcontracting (split-escrow) flow where a creator who has
  an on_hold order can hire another creator on the platform and split the frozen
  budget with them. Also adds an in-app notification system so subcontractors see
  a bell alert in their dashboard.

  ## New Columns

  ### marketplace_orders
  - `parent_order_id` (uuid, nullable FK → marketplace_orders.id)
    Marks a subcontract order as a child of the original client order.
  - `subcontract_amount` (numeric)
    The portion of the parent order's budget allocated to this subcontract.
  - `is_subcontract` (boolean, default false)
    Quick flag to distinguish subcontract orders from client orders.

  ## New Tables

  ### creator_notifications
  In-app notification feed per creator.
  - id, creator_id (FK → creator_profiles), type, title, body, payload (jsonb),
    is_read (boolean), created_at

  ## Security
  - RLS enabled on creator_notifications
  - Creators can only read/update their own notifications
  - Service role (edge functions) can insert notifications for any creator
  - marketplace_orders already has RLS; parent_order_id is just a data column,
    no new policy needed.
*/

-- ── parent_order_id on marketplace_orders ─────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'marketplace_orders' AND column_name = 'parent_order_id'
  ) THEN
    ALTER TABLE marketplace_orders
      ADD COLUMN parent_order_id uuid REFERENCES marketplace_orders(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'marketplace_orders' AND column_name = 'subcontract_amount'
  ) THEN
    ALTER TABLE marketplace_orders ADD COLUMN subcontract_amount numeric(12,2) DEFAULT 0;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'marketplace_orders' AND column_name = 'is_subcontract'
  ) THEN
    ALTER TABLE marketplace_orders ADD COLUMN is_subcontract boolean DEFAULT false NOT NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_marketplace_orders_parent ON marketplace_orders(parent_order_id)
  WHERE parent_order_id IS NOT NULL;

-- ── creator_notifications ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS creator_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL REFERENCES creator_profiles(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'info',        -- 'subcontract_invite' | 'order_accepted' | 'info'
  title text NOT NULL DEFAULT '',
  body text NOT NULL DEFAULT '',
  payload jsonb DEFAULT '{}'::jsonb,        -- arbitrary extra data (order_id, amount, etc.)
  is_read boolean DEFAULT false NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE creator_notifications ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_creator_notifications_creator ON creator_notifications(creator_id);
CREATE INDEX IF NOT EXISTS idx_creator_notifications_unread
  ON creator_notifications(creator_id, is_read) WHERE is_read = false;

-- Creators can read their own notifications
CREATE POLICY "Creators can read own notifications"
  ON creator_notifications FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM creator_profiles cp
      WHERE cp.id = creator_notifications.creator_id
        AND cp.user_id = auth.uid()
    )
  );

-- Creators can mark their own notifications as read
CREATE POLICY "Creators can update own notifications"
  ON creator_notifications FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM creator_profiles cp
      WHERE cp.id = creator_notifications.creator_id
        AND cp.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM creator_profiles cp
      WHERE cp.id = creator_notifications.creator_id
        AND cp.user_id = auth.uid()
    )
  );

-- Allow anon/authenticated to insert notifications (needed when subcontract is created client-side)
CREATE POLICY "Anyone can insert creator notifications"
  ON creator_notifications FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Authenticated can insert creator notifications"
  ON creator_notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);
