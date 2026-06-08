/*
  # Add message_templates table and pickup_location to booking_events

  ## Summary
  This migration supports the editable driver WhatsApp schedule template feature.

  ## Changes

  ### New Tables
  - `message_templates`
    - `key` (text, primary key): Identifier for the template, e.g. 'driver_schedule_template'
    - `value` (text, not null): The template body with {{tags}} placeholders
    - `updated_at` (timestamptz): Timestamp of last update

  ### Modified Tables
  - `booking_events`
    - `pickup_location` (text, nullable): Where the driver should pick up the operator

  ### Security
  - RLS enabled on message_templates
  - Only authenticated admins (role = 'admin') can read/write templates
  - A public read policy is intentionally NOT added — templates are internal only

  ### Default Data
  - Inserts default Russian driver schedule template with all supported {{tags}}
*/

CREATE TABLE IF NOT EXISTS message_templates (
  key text PRIMARY KEY,
  value text NOT NULL DEFAULT '',
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE message_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read message templates"
  ON message_templates FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can insert message templates"
  ON message_templates FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update message templates"
  ON message_templates FOR UPDATE
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

INSERT INTO message_templates (key, value)
VALUES (
  'driver_schedule_template',
  E'--- СЪЕМКА {{shoot_index}} ---\n👤 Клиент: {{client_name}}\n📱 Телефон: {{client_phone}}\n📍 Локация: {{shoot_location}}\n🚗 Время выезда: {{departure_time}} (за 1 час до начала)\n🎥 Время съемки: {{shoot_time}}\n💼 Услуга: {{task_description}}\n📋 Заметки: {{scripts_notes}}\n\n📸 Оператор: {{operator_name}}\n📲 WhatsApp оператора: {{operator_phone}}\n🗺 Точка сбора оператора: {{pickup_location}}'
)
ON CONFLICT (key) DO NOTHING;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'booking_events' AND column_name = 'pickup_location'
  ) THEN
    ALTER TABLE booking_events ADD COLUMN pickup_location text;
  END IF;
END $$;
