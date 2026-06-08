/*
  # Create business_expenses table

  ## Purpose
  Tracks monthly business expenses (e.g., operator salaries, software subscriptions)
  so the admin dashboard can calculate Net Profit (MRR - Total Expenses).

  ## New Tables
  - `business_expenses`
    - `id` (uuid, primary key)
    - `title` (text) - expense name, e.g., 'Зарплата оператора'
    - `amount` (text) - amount as string to support values like '7000 AED'
    - `is_monthly` (boolean, default true) - whether this is a recurring monthly expense
    - `created_at` (timestamptz) - creation timestamp

  ## Security
  - RLS enabled
  - Only authenticated admin users can read/insert/update/delete
*/

CREATE TABLE IF NOT EXISTS business_expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL DEFAULT '',
  amount text NOT NULL DEFAULT '0',
  is_monthly boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE business_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can read business expenses"
  ON business_expenses FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admin can insert business expenses"
  ON business_expenses FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admin can update business expenses"
  ON business_expenses FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admin can delete business expenses"
  ON business_expenses FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );
