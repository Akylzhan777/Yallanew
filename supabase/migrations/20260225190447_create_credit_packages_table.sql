/*
  # Create credit_packages table

  ## Purpose
  Stores the balance top-up packages displayed in the PaymentModal (client app).
  Admins can edit these packages from the Admin Panel without deploying code.

  ## New Table: credit_packages
  - id (uuid, primary key)
  - title (text) - e.g. "5 видео"
  - subtitle (text) - e.g. "Start Pack"
  - price (integer) - numeric price value e.g. 15000
  - currency (text) - e.g. "₽"
  - credits_value (integer) - how many video credits the package gives
  - sort_order (integer) - display order
  - created_at (timestamptz)

  ## Security
  - RLS enabled
  - Public read (packages are visible to all users in the modal)
  - Only authenticated admins can insert/update/delete
    (checked via profiles.role = 'admin')

  ## Seed Data
  3 initial packages matching the current hardcoded values.
*/

CREATE TABLE IF NOT EXISTS credit_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL DEFAULT '',
  subtitle text NOT NULL DEFAULT '',
  price integer NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT '₽',
  credits_value integer NOT NULL DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE credit_packages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read credit packages"
  ON credit_packages FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Admins can insert credit packages"
  ON credit_packages FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update credit packages"
  ON credit_packages FOR UPDATE
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

CREATE POLICY "Admins can delete credit packages"
  ON credit_packages FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

INSERT INTO credit_packages (title, subtitle, price, currency, credits_value, sort_order)
VALUES
  ('5 видео',  'Стартовый пакет',    15000, '₽', 5,  1),
  ('15 видео', 'Популярный выбор',   40000, '₽', 15, 2),
  ('30 видео', 'Максимальный пакет', 75000, '₽', 30, 3);
