-- Add region column to creator_profiles
ALTER TABLE creator_profiles ADD COLUMN IF NOT EXISTS region text NOT NULL DEFAULT 'UAE';

-- Add region column to marketplace_orders
ALTER TABLE marketplace_orders ADD COLUMN IF NOT EXISTS region text NOT NULL DEFAULT 'UAE';

-- Add region column to promo_reviews
ALTER TABLE promo_reviews ADD COLUMN IF NOT EXISTS region text NOT NULL DEFAULT 'UAE';

-- Add region column to client_profiles
ALTER TABLE client_profiles ADD COLUMN IF NOT EXISTS region text NOT NULL DEFAULT 'UAE';

-- Create index for region filtering
CREATE INDEX IF NOT EXISTS idx_creator_profiles_region ON creator_profiles(region);
CREATE INDEX IF NOT EXISTS idx_marketplace_orders_region ON marketplace_orders(region);
CREATE INDEX IF NOT EXISTS idx_client_profiles_region ON client_profiles(region);
