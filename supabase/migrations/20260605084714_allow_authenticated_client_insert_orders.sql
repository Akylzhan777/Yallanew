-- Allow authenticated clients to insert orders with their user_id
-- (even if buyer_name/buyer_email come from their profile, not the form)
CREATE POLICY "authenticated_client_insert_orders" ON marketplace_orders
  FOR INSERT TO authenticated
  WITH CHECK (
    client_user_id = auth.uid()
    AND creator_id IS NOT NULL
    AND package_price > 0
  );
