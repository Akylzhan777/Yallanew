CREATE TABLE creator_blocked_dates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL REFERENCES creator_profiles(id) ON DELETE CASCADE,
  blocked_date date NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(creator_id, blocked_date)
);

ALTER TABLE creator_blocked_dates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_own_blocked_dates" ON creator_blocked_dates FOR SELECT
  TO authenticated USING (creator_id IN (SELECT id FROM creator_profiles WHERE user_id = auth.uid()));

CREATE POLICY "insert_own_blocked_dates" ON creator_blocked_dates FOR INSERT
  TO authenticated WITH CHECK (creator_id IN (SELECT id FROM creator_profiles WHERE user_id = auth.uid()));

CREATE POLICY "update_own_blocked_dates" ON creator_blocked_dates FOR UPDATE
  TO authenticated USING (creator_id IN (SELECT id FROM creator_profiles WHERE user_id = auth.uid()))
  WITH CHECK (creator_id IN (SELECT id FROM creator_profiles WHERE user_id = auth.uid()));

CREATE POLICY "delete_own_blocked_dates" ON creator_blocked_dates FOR DELETE
  TO authenticated USING (creator_id IN (SELECT id FROM creator_profiles WHERE user_id = auth.uid()));

CREATE INDEX idx_blocked_dates_creator ON creator_blocked_dates(creator_id, blocked_date);