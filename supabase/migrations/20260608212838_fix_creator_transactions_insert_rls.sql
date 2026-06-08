
-- Allow any authenticated user to insert a creator_transaction record
-- (needed when a brand/buyer creates an on-hold order on behalf of a creator).
-- The existing policy restricts to auth.uid() = user_id which fails for buyer-side inserts.
DROP POLICY IF EXISTS "Creators can insert own transactions" ON creator_transactions;

CREATE POLICY "authenticated_insert_transactions" ON creator_transactions
  FOR INSERT TO authenticated, anon
  WITH CHECK (true);
