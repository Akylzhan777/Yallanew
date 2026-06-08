-- Create withdrawal_requests table
CREATE TABLE IF NOT EXISTS withdrawal_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL REFERENCES creator_profiles(id),
  amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  bank_account_name text,
  bank_name text,
  bank_iban text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE withdrawal_requests ENABLE ROW LEVEL SECURITY;

-- Creator can read own withdrawal requests
CREATE POLICY "select_own_withdrawals" ON withdrawal_requests
  FOR SELECT TO authenticated
  USING (creator_id IN (SELECT id FROM creator_profiles WHERE user_id = auth.uid()));

-- Creator can insert own withdrawal requests
CREATE POLICY "insert_own_withdrawals" ON withdrawal_requests
  FOR INSERT TO authenticated
  WITH CHECK (creator_id IN (SELECT id FROM creator_profiles WHERE user_id = auth.uid()));

-- Admin can read all
CREATE POLICY "admin_read_all_withdrawals" ON withdrawal_requests
  FOR SELECT TO authenticated
  USING (is_admin());

-- Admin can update (approve/reject)
CREATE POLICY "admin_update_withdrawals" ON withdrawal_requests
  FOR UPDATE TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());
