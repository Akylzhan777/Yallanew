/*
  # Add BNPL (Buy Now Pay Later) fields to marketplace_orders

  1. Changes to marketplace_orders
    - `payment_method` (text, default 'card') — 'card' | 'tabby' | 'tamara'
    - `payment_session_id` (text) — external session ID from Tabby/Tamara
    - `payment_session_url` (text) — redirect URL for BNPL checkout
    - `payment_provider_status` (text) — raw status from BNPL provider

  2. Notes
    - Existing orders default to 'card' payment method
    - BNPL orders start as 'pending' until webhook confirms approval
    - Once BNPL approved, status transitions to 'on_hold' (escrow) as platform receives full amount upfront
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'marketplace_orders' AND column_name = 'payment_method'
  ) THEN
    ALTER TABLE marketplace_orders ADD COLUMN payment_method text DEFAULT 'card';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'marketplace_orders' AND column_name = 'payment_session_id'
  ) THEN
    ALTER TABLE marketplace_orders ADD COLUMN payment_session_id text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'marketplace_orders' AND column_name = 'payment_session_url'
  ) THEN
    ALTER TABLE marketplace_orders ADD COLUMN payment_session_url text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'marketplace_orders' AND column_name = 'payment_provider_status'
  ) THEN
    ALTER TABLE marketplace_orders ADD COLUMN payment_provider_status text;
  END IF;
END $$;
