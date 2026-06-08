-- 1. Add order_type to marketplace_orders
ALTER TABLE marketplace_orders
  ADD COLUMN IF NOT EXISTS order_type varchar(20) NOT NULL DEFAULT 'product';

-- 2. Add order_id FK to creator_bookings (nullable — old rows have no linked order)
ALTER TABLE creator_bookings
  ADD COLUMN IF NOT EXISTS order_id uuid REFERENCES marketplace_orders(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_creator_bookings_order_id
  ON creator_bookings(order_id) WHERE order_id IS NOT NULL;
