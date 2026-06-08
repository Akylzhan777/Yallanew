/*
  # Add amount_paid to clients and client_id to video_units

  ## Changes

  ### Modified Tables
  - `clients`
    - Add `amount_paid` (numeric, default 0): tracks how much the client has paid
  - `video_units`
    - Add `client_id` (uuid, nullable, references clients.id): links a task to a CRM client

  ## Notes
  - Both columns are nullable/have defaults for full backwards compatibility
  - Existing rows are unaffected
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clients' AND column_name = 'amount_paid'
  ) THEN
    ALTER TABLE clients ADD COLUMN amount_paid numeric DEFAULT 0;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'video_units' AND column_name = 'client_id'
  ) THEN
    ALTER TABLE video_units ADD COLUMN client_id uuid REFERENCES clients(id) ON DELETE SET NULL;
  END IF;
END $$;
