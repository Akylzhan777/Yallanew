/*
  # Add WhatsApp numbers to editor_balances

  1. New Columns
    - `whatsapp_number` (text, nullable) - WhatsApp phone number for broadcast notifications

  2. Data Updates
    - Vlad: +375298224524
    - Maga: +77770664270

  3. Security
    - Column is text and used only for internal notifications
    - No RLS changes needed as table already has proper policies
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'editor_balances' AND column_name = 'whatsapp_number'
  ) THEN
    ALTER TABLE editor_balances ADD COLUMN whatsapp_number text;
  END IF;
END $$;

UPDATE editor_balances SET whatsapp_number = '+375298224524' WHERE editor_name = 'Vlad';
UPDATE editor_balances SET whatsapp_number = '+77770664270' WHERE editor_name = 'Maga';