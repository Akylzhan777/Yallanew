ALTER TABLE client_profiles ADD COLUMN IF NOT EXISTS balance numeric NOT NULL DEFAULT 0;

CREATE POLICY "admin_manage_client_profiles" ON client_profiles
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));
