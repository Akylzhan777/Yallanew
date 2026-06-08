/*
  # Add status column to stock_transactions and helper RPC

  1. Modified Tables
    - `stock_transactions`
      - `status` (text, default 'pending') — tracks payment lifecycle: pending, completed, failed

  2. New Functions
    - `increment_stock_views(footage_id_param uuid)` — atomically increments view count
    - `complete_stock_purchase(tx_id uuid)` — marks transaction completed, credits seller balance

  3. Notes
    - Existing transactions without a status will default to 'completed' (legacy purchases assumed paid)
    - The complete_stock_purchase function handles the 70/30 wallet split for non-admin footage
    - Admin global footage (is_admin_global=true) does NOT credit any seller balance
*/

-- Add status column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stock_transactions' AND column_name = 'status'
  ) THEN
    ALTER TABLE stock_transactions ADD COLUMN status text NOT NULL DEFAULT 'pending';
  END IF;
END $$;

-- Backfill existing transactions as completed (they were created before status tracking)
UPDATE stock_transactions SET status = 'completed' WHERE status = 'pending' AND stripe_session_id != '';

-- Index for quick lookup by status
CREATE INDEX IF NOT EXISTS idx_stock_transactions_status ON stock_transactions(status);

-- Helper: atomically increment views
CREATE OR REPLACE FUNCTION increment_stock_views(footage_id_param uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE stock_footage SET views = views + 1 WHERE id = footage_id_param;
END;
$$;

-- Helper: complete purchase — marks tx completed and credits seller wallet
CREATE OR REPLACE FUNCTION complete_stock_purchase(tx_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tx RECORD;
  v_footage RECORD;
BEGIN
  -- Get transaction
  SELECT * INTO v_tx FROM stock_transactions WHERE id = tx_id;
  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Transaction not found');
  END IF;

  -- Already completed?
  IF v_tx.status = 'completed' THEN
    RETURN json_build_object('ok', true, 'message', 'Already completed');
  END IF;

  -- Mark as completed
  UPDATE stock_transactions SET status = 'completed' WHERE id = tx_id;

  -- Increment sales_count on footage
  UPDATE stock_footage SET sales_count = sales_count + 1 WHERE id = v_tx.footage_id;

  -- Get footage to check if admin global
  SELECT is_admin_global, seller_id INTO v_footage FROM stock_footage WHERE id = v_tx.footage_id;

  -- Credit seller balance only for non-admin footage
  IF v_footage.is_admin_global IS NOT TRUE THEN
    UPDATE creator_profiles
    SET balance_available = balance_available + v_tx.seller_payout,
        balance_total_earned = balance_total_earned + v_tx.seller_payout
    WHERE user_id = v_footage.seller_id;
  END IF;

  RETURN json_build_object('ok', true);
END;
$$;
