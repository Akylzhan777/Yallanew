ALTER TABLE creator_bookings
  ADD COLUMN IF NOT EXISTS package_id     text,
  ADD COLUMN IF NOT EXISTS package_name   text,
  ADD COLUMN IF NOT EXISTS package_price  numeric(12,2),
  ADD COLUMN IF NOT EXISTS creator_payout_amount numeric(12,2);
