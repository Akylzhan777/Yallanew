-- Model B correction: package_price now stores the creator's BASE price (their take-home).
-- The 20% markup was already collected from the client at checkout (clientPrice = price * 1.2).
-- The DB trigger must release the FULL package_price to the creator — no further deduction.
-- calc_creator_payout(package_price) must return package_price unchanged (rate = 0 for payout).
--
-- We rename the concept: the function now reads platform_commission_rate but interprets it
-- as the markup rate, NOT a deduction rate. Since the pre-collected markup is already baked in,
-- payout = package_price * 1.0.
--
-- To keep the function signature stable and avoid breaking anything, we simply make it
-- return p_price directly (the base price IS the payout in Model B).

CREATE OR REPLACE FUNCTION calc_creator_payout(p_price numeric)
RETURNS numeric
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Model B: package_price = creator base price (their take-home).
  -- The platform markup was collected at checkout. Creator receives 100% of base price.
  RETURN ROUND(COALESCE(p_price, 0), 2);
END;
$$;
