/*
  # Myth operator reminders

  1. New Tables
    - `myth_operator_reminders`
      - `id` (uuid, primary key, single-row default)
      - `operator_phone` (text): destination WhatsApp number in international format (e.g. 971501234567)
      - `day_template` (text): short message sent at 12:00 Dubai time on shoot days
      - `evening_template` (text): detailed message with references sent at 23:00 Dubai time
      - `enabled` (boolean, default true)
      - `last_day_sent_date` (date): dedupe guard for 12:00 broadcast
      - `last_evening_sent_date` (date): dedupe guard for 23:00 broadcast
      - `created_at`, `updated_at` (timestamptz)

  2. Security
    - Enable RLS
    - Authenticated admins only (via is_admin())
    - Service role (edge functions) bypasses RLS by default

  3. Notes
    - Expected schedule: Thursdays & Saturdays only, Asia/Dubai timezone (UTC+4)
    - Message delivery via existing Green API secrets (GREEN_API_URL / GREEN_API_ID / GREEN_API_TOKEN)
*/

CREATE TABLE IF NOT EXISTS myth_operator_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_phone text NOT NULL DEFAULT '',
  day_template text NOT NULL DEFAULT '',
  evening_template text NOT NULL DEFAULT '',
  enabled boolean NOT NULL DEFAULT true,
  last_day_sent_date date,
  last_evening_sent_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE myth_operator_reminders ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM myth_operator_reminders) THEN
    INSERT INTO myth_operator_reminders (operator_phone, day_template, evening_template)
    VALUES (
      '',
      'Сегодня съёмочный день. Подготовь оборудование и приезжай на точку вовремя.',
      'Вечерний план на завтра:\n\n1. Локация и тайминг\n2. Референсы и раскадровка\n3. Оборудование и оптика\n4. Задачи на ночь'
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'myth_operator_reminders' AND policyname = 'Admins can select myth reminders'
  ) THEN
    CREATE POLICY "Admins can select myth reminders"
      ON myth_operator_reminders FOR SELECT
      TO authenticated
      USING (is_admin());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'myth_operator_reminders' AND policyname = 'Admins can insert myth reminders'
  ) THEN
    CREATE POLICY "Admins can insert myth reminders"
      ON myth_operator_reminders FOR INSERT
      TO authenticated
      WITH CHECK (is_admin());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'myth_operator_reminders' AND policyname = 'Admins can update myth reminders'
  ) THEN
    CREATE POLICY "Admins can update myth reminders"
      ON myth_operator_reminders FOR UPDATE
      TO authenticated
      USING (is_admin())
      WITH CHECK (is_admin());
  END IF;
END $$;
