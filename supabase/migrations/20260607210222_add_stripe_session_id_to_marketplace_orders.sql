ALTER TABLE marketplace_orders
  ADD COLUMN IF NOT EXISTS stripe_session_id text;

CREATE INDEX IF NOT EXISTS marketplace_orders_stripe_session_id_idx
  ON marketplace_orders (stripe_session_id);
