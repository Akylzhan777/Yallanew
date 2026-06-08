/*
  # Add AI Translation Add-on to Booking Events

  ## Summary
  Adds two columns to `booking_events` to capture AI translation upsell selections
  made during the booking checkout flow.

  ## Changes to booking_events
  - `ai_translation` (boolean, default false) — whether client selected AI translation
  - `ai_translation_lang` (text, default '') — target language chosen (e.g. 'Английский')
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'booking_events' AND column_name = 'ai_translation'
  ) THEN
    ALTER TABLE booking_events ADD COLUMN ai_translation boolean NOT NULL DEFAULT false;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'booking_events' AND column_name = 'ai_translation_lang'
  ) THEN
    ALTER TABLE booking_events ADD COLUMN ai_translation_lang text NOT NULL DEFAULT '';
  END IF;
END $$;
