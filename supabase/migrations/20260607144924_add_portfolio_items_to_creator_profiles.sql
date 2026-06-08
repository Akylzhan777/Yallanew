ALTER TABLE creator_profiles
  ADD COLUMN IF NOT EXISTS portfolio_items jsonb DEFAULT '[]'::jsonb;

-- Back-fill existing portfolio_urls into portfolio_items (url only, no meta yet)
UPDATE creator_profiles
SET portfolio_items = (
  SELECT jsonb_agg(jsonb_build_object('url', url_val))
  FROM unnest(portfolio_urls) AS url_val
)
WHERE portfolio_urls IS NOT NULL
  AND array_length(portfolio_urls, 1) > 0
  AND (portfolio_items IS NULL OR portfolio_items = '[]'::jsonb);
