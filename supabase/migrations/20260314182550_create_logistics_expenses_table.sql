/*
  # Create logistics_expenses table

  ## Purpose
  Tracks daily variable logistics expenses (taxi, fuel, tolls, parking, driver, etc.)
  in Dubai. Records are filtered by current calendar month and summed to produce
  a MonthlyLogisticsTotal, which is added to fixed business_expenses when calculating
  Net Profit on the admin dashboard.

  ## New Tables
  - `logistics_expenses`
    - `id` (uuid, primary key)
    - `date` (date, default today) - the date of the expense
    - `category` (text, not null) - one of: Такси/Careem, Бензин, Salik, Парковка, Водитель, Другое
    - `amount` (numeric, not null) - the expense amount in AED
    - `note` (text, nullable) - optional description, e.g. 'Съемка в Dubai Mall'
    - `created_at` (timestamptz) - creation timestamp

  ## Security
  - RLS enabled
  - Only authenticated admin users can read/insert/update/delete
*/

CREATE TABLE IF NOT EXISTS logistics_expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL DEFAULT CURRENT_DATE,
  category text NOT NULL DEFAULT 'Другое',
  amount numeric NOT NULL DEFAULT 0,
  note text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE logistics_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can read logistics expenses"
  ON logistics_expenses FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admin can insert logistics expenses"
  ON logistics_expenses FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admin can update logistics expenses"
  ON logistics_expenses FOR UPDATE
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

CREATE POLICY "Admin can delete logistics expenses"
  ON logistics_expenses FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE INDEX IF NOT EXISTS logistics_expenses_date_idx ON logistics_expenses (date DESC);
