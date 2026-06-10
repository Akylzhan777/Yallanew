-- Model B (final): package_price = clientPrice (price × 1.2, what client pays).
-- calc_creator_payout must recover the creator's base price = clientPrice / (1 + rate).
-- rate is stored in app_settings.platform_commission_rate (currently 0.20).
CREATE OR REPLACE FUNCTION calc_creator_payout(p_price numeric)
RETURNS numeric
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_rate numeric;
BEGIN
  SELECT COALESCE(platform_commission_rate, 0.20)
    INTO v_rate
    FROM app_settings
   LIMIT 1;
  -- p_price = clientPrice = creatorBase * (1 + rate)
  -- creatorBase = p_price / (1 + rate)
  RETURN ROUND(COALESCE(p_price, 0) / (1 + v_rate), 2);
END;
$$;
