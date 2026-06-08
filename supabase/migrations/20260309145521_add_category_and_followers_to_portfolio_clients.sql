/*
  # Add category and followers_count to portfolio_clients

  ## Summary
  Adds two new columns to the existing portfolio_clients table to support
  the dynamic portfolio drill-down feature:

  1. `category` — the niche the client belongs to, used to group clients on the
     public-facing "Наши результаты" section (e.g., 'Недвижимость', 'Бьюти').
     Defaults to empty string to keep existing rows valid.

  2. `followers_count` — a human-readable followers count shown on the client
     card (e.g., '150K', '1.2M'). Optional, defaults to empty string.

  ## Changes
  - `portfolio_clients`: add `category text NOT NULL DEFAULT ''`
  - `portfolio_clients`: add `followers_count text NOT NULL DEFAULT ''`

  ## Notes
  - No destructive changes, purely additive.
  - No new RLS needed — existing policies already cover these columns.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'portfolio_clients' AND column_name = 'category'
  ) THEN
    ALTER TABLE portfolio_clients ADD COLUMN category text NOT NULL DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'portfolio_clients' AND column_name = 'followers_count'
  ) THEN
    ALTER TABLE portfolio_clients ADD COLUMN followers_count text NOT NULL DEFAULT '';
  END IF;
END $$;

UPDATE portfolio_clients SET category = 'Недвижимость' WHERE profession ILIKE '%real estate%' OR profession ILIKE '%property%';
UPDATE portfolio_clients SET category = 'Бьюти' WHERE profession ILIKE '%beauty%' OR profession ILIKE '%wellness%' OR profession ILIKE '%lifestyle%';
UPDATE portfolio_clients SET category = 'Рестораны' WHERE profession ILIKE '%hospitality%' OR profession ILIKE '%restaurant%';
UPDATE portfolio_clients SET category = 'Финансы' WHERE profession ILIKE '%tech%' OR profession ILIKE '%entrepreneur%';
UPDATE portfolio_clients SET category = 'Фитнес' WHERE category = '';
