/*
  # Create editor_balances table

  1. New Tables
    - `editor_balances`
      - `editor_name` (text, primary key) - Editor identifier
      - `balance` (integer, default 0) - Balance in KZT
      - `created_at` (timestamp) - Creation timestamp
      - `updated_at` (timestamp) - Last update timestamp

  2. Security
    - Enable RLS on `editor_balances` table
    - Add policy for editors to read their own balance
    - Add policy for admins to read all balances

  3. Initial Data
    - Insert default rows for 'Maga' and 'Vlad' with balance 0
*/

CREATE TABLE IF NOT EXISTS editor_balances (
  editor_name text PRIMARY KEY,
  balance integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE editor_balances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Editors can read own balance"
  ON editor_balances FOR SELECT
  TO authenticated
  USING (
    editor_name = (
      SELECT raw_user_meta_data->>'editor_name'
      FROM auth.users
      WHERE id = auth.uid()
    )
  );

CREATE POLICY "Admins can read all balances"
  ON editor_balances FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

INSERT INTO editor_balances (editor_name, balance)
VALUES ('Maga', 0), ('Vlad', 0)
ON CONFLICT (editor_name) DO NOTHING;
