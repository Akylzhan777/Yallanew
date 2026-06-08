/*
  # Create payout_requests table

  1. New Tables
    - `payout_requests`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `amount` (numeric, the requested payout amount in AED)
      - `payment_method` (text: bank/crypto/cash)
      - `details` (text, payment details/requisites)
      - `status` (text, default 'pending': pending/completed/rejected)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `payout_requests`
    - Creators can insert their own requests
    - Creators can view their own requests
    - Admins can view and update all requests
*/

CREATE TABLE IF NOT EXISTS payout_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  amount numeric NOT NULL CHECK (amount >= 100),
  payment_method text NOT NULL CHECK (payment_method IN ('bank', 'crypto', 'cash')),
  details text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'rejected')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE payout_requests ENABLE ROW LEVEL SECURITY;

-- Creators can view their own payout requests
CREATE POLICY "Users can view own payout requests"
  ON payout_requests
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Creators can insert their own payout requests
CREATE POLICY "Users can insert own payout requests"
  ON payout_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Admins can view all payout requests
CREATE POLICY "Admins can view all payout requests"
  ON payout_requests
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Admins can update all payout requests
CREATE POLICY "Admins can update all payout requests"
  ON payout_requests
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );
