/*
  # Add password column to editor_balances

  1. New Columns
    - `password` (text) - Editor login password

  2. Data Migration
    - Set passwords for existing editors: Maga → '-Magahorse', Vlad → '65rapito'
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'editor_balances' AND column_name = 'password'
  ) THEN
    ALTER TABLE editor_balances ADD COLUMN password text NOT NULL DEFAULT '';
  END IF;
END $$;

UPDATE editor_balances 
SET password = CASE 
  WHEN editor_name = 'Maga' THEN '-Magahorse'
  WHEN editor_name = 'Vlad' THEN '65rapito'
  ELSE password
END
WHERE editor_name IN ('Maga', 'Vlad');
