/*
  # WhatsApp Integration via Green API

  1. Schema Changes
    - `creator_profiles`: add `whatsapp_number` (text, E.164) and `preferred_language` (text, default 'en')

  2. New Tables
    - `whatsapp_templates`
      - `id` (uuid, pk)
      - `key` (text, unique) — e.g. 'welcome'
      - `body_en`, `body_ru`, `body_ar` (text)
      - `created_at`, `updated_at` (timestamptz)
    - `whatsapp_broadcasts`
      - `id` (uuid, pk)
      - `body` (text)
      - `segment` (text) — 'all' | creator_type
      - `sent_count` (int, default 0)
      - `failed_count` (int, default 0)
      - `created_by` (uuid)
      - `created_at` (timestamptz)

  3. Security
    - RLS enabled on both new tables
    - Templates: any authenticated can read; only admins can insert/update/delete
    - Broadcasts: only admins can read/insert
    - Public (anon) cannot access either

  4. Seed Data
    - Default 'welcome' template seeded in EN/RU/AR with name placeholder {{name}}
*/

-- Add WhatsApp columns to creator_profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'creator_profiles' AND column_name = 'whatsapp_number'
  ) THEN
    ALTER TABLE creator_profiles ADD COLUMN whatsapp_number text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'creator_profiles' AND column_name = 'preferred_language'
  ) THEN
    ALTER TABLE creator_profiles ADD COLUMN preferred_language text DEFAULT 'en';
  END IF;
END $$;

-- whatsapp_templates table
CREATE TABLE IF NOT EXISTS whatsapp_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  body_en text DEFAULT '',
  body_ru text DEFAULT '',
  body_ar text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE whatsapp_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can read templates" ON whatsapp_templates;
CREATE POLICY "Authenticated can read templates"
  ON whatsapp_templates FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Admins can insert templates" ON whatsapp_templates;
CREATE POLICY "Admins can insert templates"
  ON whatsapp_templates FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can update templates" ON whatsapp_templates;
CREATE POLICY "Admins can update templates"
  ON whatsapp_templates FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can delete templates" ON whatsapp_templates;
CREATE POLICY "Admins can delete templates"
  ON whatsapp_templates FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- whatsapp_broadcasts table
CREATE TABLE IF NOT EXISTS whatsapp_broadcasts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  body text NOT NULL,
  segment text NOT NULL DEFAULT 'all',
  sent_count int NOT NULL DEFAULT 0,
  failed_count int NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE whatsapp_broadcasts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read broadcasts" ON whatsapp_broadcasts;
CREATE POLICY "Admins can read broadcasts"
  ON whatsapp_broadcasts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can insert broadcasts" ON whatsapp_broadcasts;
CREATE POLICY "Admins can insert broadcasts"
  ON whatsapp_broadcasts FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Seed welcome template
INSERT INTO whatsapp_templates (key, body_en, body_ru, body_ar)
VALUES (
  'welcome',
  'Hi {{name}}! Welcome to Yalla Influencers — your profile is now live. Brands can find and book you directly. Need help? Reply to this message.',
  'Привет, {{name}}! Добро пожаловать в Yalla Influencers — ваш профиль опубликован. Бренды теперь могут находить и бронировать вас напрямую. Нужна помощь? Ответьте на это сообщение.',
  'مرحبًا {{name}}! أهلاً بك في Yalla Influencers — ملفك الشخصي متاح الآن. يمكن للعلامات التجارية العثور عليك وحجزك مباشرة. هل تحتاج إلى مساعدة؟ رد على هذه الرسالة.'
)
ON CONFLICT (key) DO NOTHING;
