/*
  # Add client_price (AED) to video_units

  ## Changes

  ### Modified Tables
  - `video_units`
    - Add `client_price` (numeric, nullable): the price charged to the client in AED (United Arab Emirates Dirham).
      This is separate from `reward_amount` which is the editor payout in KZT.

  ## Notes
  - Nullable so existing rows are unaffected
  - Client revenue is tracked in AED; editor payouts stay in KZT
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'video_units' AND column_name = 'client_price'
  ) THEN
    ALTER TABLE video_units ADD COLUMN client_price numeric;
  END IF;
END $$;
