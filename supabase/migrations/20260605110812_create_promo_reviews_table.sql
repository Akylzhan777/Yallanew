CREATE TABLE IF NOT EXISTS promo_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid REFERENCES creator_profiles(id) ON DELETE CASCADE,
  video_url text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE promo_reviews ENABLE ROW LEVEL SECURITY;

-- Creators can insert their own reviews
CREATE POLICY "creators_insert_own_promo_reviews" ON promo_reviews
  FOR INSERT TO authenticated
  WITH CHECK (
    creator_id IN (SELECT id FROM creator_profiles WHERE user_id = auth.uid())
  );

-- Creators can read own + admin can read all
CREATE POLICY "creators_read_own_promo_reviews" ON promo_reviews
  FOR SELECT TO authenticated
  USING (
    creator_id IN (SELECT id FROM creator_profiles WHERE user_id = auth.uid())
    OR public.is_admin()
  );

-- Admin can update (approve/reject)
CREATE POLICY "admin_update_promo_reviews" ON promo_reviews
  FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Admin can delete
CREATE POLICY "admin_delete_promo_reviews" ON promo_reviews
  FOR DELETE TO authenticated
  USING (public.is_admin());
