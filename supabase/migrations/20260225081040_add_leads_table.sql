/*
  # Add leads/applications table

  1. New Tables
    - `leads`
      - `id` (uuid, primary key)
      - `name` (text) - applicant's name
      - `instagram` (text) - Instagram handle
      - `goals` (text) - what they want to achieve
      - `status` (text) - 'new' | 'reviewed' | 'converted'
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS
    - Anyone can INSERT (public form submission)
    - Only admins can SELECT, UPDATE, DELETE

  3. Notes
    - Public form on landing page inserts rows here
    - Admin can view, mark as reviewed, and convert to a real user account
*/

CREATE TABLE IF NOT EXISTS leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT '',
  instagram text NOT NULL DEFAULT '',
  goals text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'new',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit a lead"
  ON leads
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can view all leads"
  ON leads
  FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "Admins can update leads"
  ON leads
  FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Admins can delete leads"
  ON leads
  FOR DELETE
  TO authenticated
  USING (is_admin());
