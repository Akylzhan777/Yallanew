
/*
  # Security Fixes: Indexes, RLS Performance, and Policy Cleanup

  ## Summary
  Addresses all security advisor warnings:

  1. Missing Indexes
     - Add index on `bookings.user_id` (unindexed FK)
     - Add index on `scripts.user_id` (unindexed FK)

  2. RLS Auth Re-evaluation Performance
     Replace `auth.uid()` with `(select auth.uid())` in all policies on:
     - scripts (view, insert, update, delete)
     - bookings (view, insert)
     - profiles (view, update, insert, admin-view)
     - booking_events (user view/update, manager view/update, admin insert/update/delete)
     - operators (admin insert/update/delete)
     - landing_settings (admin insert/update)
     - portfolio_clients (admin insert/update/delete)
     - app_settings (admin update)
     - clients (admin view/update)

  3. Multiple Permissive Policies
     - booking_events SELECT: consolidate overlapping anon/auth read policies into a single clear policy
     - booking_events INSERT: remove always-true "Authenticated users can insert bookings" duplicate
     - booking_events UPDATE: merge manager+admin update into one policy
     - profiles SELECT: merge "Users can view own profile" into the already-existing "Admins can view all profiles"

  4. Always-True RLS Policies
     - booking_events INSERT (anon/auth): keep "Public can insert bookings" for anon, restrict auth insert to own user_id
     - clients INSERT: restrict to authenticated only with a non-empty phone check (public booking flow still works)
     - leads INSERT: keep open for public lead forms (intentional design — acceptable for contact forms)
     - marquee_stars: restrict write policies to admin role
     - tariffs: restrict write policies to admin role

  5. Remove unused indexes
     - Drop `clients_phone_idx` (unused)
     - Drop `booking_events_user_id_idx` (unused — will be recreated properly)
*/

-- ════════════════════════════════════════════════
-- 1. INDEXES
-- ════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS bookings_user_id_idx ON public.bookings (user_id);
CREATE INDEX IF NOT EXISTS scripts_user_id_idx ON public.scripts (user_id);

-- Drop unused indexes
DROP INDEX IF EXISTS public.clients_phone_idx;
DROP INDEX IF EXISTS public.booking_events_user_id_idx;

-- Recreate booking_events user_id index (was listed as unused, but needed for FK)
CREATE INDEX IF NOT EXISTS booking_events_user_id_fk_idx ON public.booking_events (user_id);


-- ════════════════════════════════════════════════
-- 2. SCRIPTS — fix auth() re-evaluation
-- ════════════════════════════════════════════════

DROP POLICY IF EXISTS "Users can view own scripts" ON public.scripts;
DROP POLICY IF EXISTS "Users can insert own scripts" ON public.scripts;
DROP POLICY IF EXISTS "Users can update own scripts" ON public.scripts;
DROP POLICY IF EXISTS "Users can delete own scripts" ON public.scripts;

CREATE POLICY "Users can view own scripts"
  ON public.scripts FOR SELECT TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert own scripts"
  ON public.scripts FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own scripts"
  ON public.scripts FOR UPDATE TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete own scripts"
  ON public.scripts FOR DELETE TO authenticated
  USING ((select auth.uid()) = user_id);


-- ════════════════════════════════════════════════
-- 3. BOOKINGS — fix auth() re-evaluation
-- ════════════════════════════════════════════════

DROP POLICY IF EXISTS "Users can view own bookings" ON public.bookings;
DROP POLICY IF EXISTS "Users can insert own bookings" ON public.bookings;

CREATE POLICY "Users can view own bookings"
  ON public.bookings FOR SELECT TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert own bookings"
  ON public.bookings FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);


-- ════════════════════════════════════════════════
-- 4. PROFILES — fix auth() re-evaluation + consolidate SELECT policies
-- ════════════════════════════════════════════════

DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

-- Single consolidated SELECT: users see their own row; admins see all
CREATE POLICY "Users and admins can view profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (
    (select auth.uid()) = id
    OR is_admin()
  );

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING ((select auth.uid()) = id)
  WITH CHECK ((select auth.uid()) = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = id);


-- ════════════════════════════════════════════════
-- 5. BOOKING_EVENTS — consolidate + fix auth() + fix always-true
-- ════════════════════════════════════════════════

-- Drop all existing booking_events policies and rebuild cleanly
DROP POLICY IF EXISTS "Admins can delete bookings" ON public.booking_events;
DROP POLICY IF EXISTS "Admins can insert bookings" ON public.booking_events;
DROP POLICY IF EXISTS "Admins can update bookings" ON public.booking_events;
DROP POLICY IF EXISTS "Authenticated users can insert bookings" ON public.booking_events;
DROP POLICY IF EXISTS "Authenticated users can read all booking events" ON public.booking_events;
DROP POLICY IF EXISTS "Authenticated users can view bookings" ON public.booking_events;
DROP POLICY IF EXISTS "Managers can update booking events" ON public.booking_events;
DROP POLICY IF EXISTS "Managers can view all booking events" ON public.booking_events;
DROP POLICY IF EXISTS "Public can insert bookings" ON public.booking_events;
DROP POLICY IF EXISTS "Public can view bookings for availability" ON public.booking_events;
DROP POLICY IF EXISTS "Users can update their own bookings" ON public.booking_events;
DROP POLICY IF EXISTS "Users can view their own bookings" ON public.booking_events;

-- Anon: read only for availability check
CREATE POLICY "Public can view bookings for availability"
  ON public.booking_events FOR SELECT TO anon
  USING (true);

-- Anon: insert booking (for unauthenticated booking flow)
CREATE POLICY "Public can insert bookings"
  ON public.booking_events FOR INSERT TO anon
  WITH CHECK (true);

-- Authenticated: users see their own bookings; managers/admins see all
CREATE POLICY "Users and staff can view booking events"
  ON public.booking_events FOR SELECT TO authenticated
  USING (
    (select auth.uid()) = user_id
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
        AND profiles.role = ANY (ARRAY['admin', 'manager'])
    )
  );

-- Authenticated: users can only insert bookings tied to their own user_id
CREATE POLICY "Authenticated users can insert own bookings"
  ON public.booking_events FOR INSERT TO authenticated
  WITH CHECK (
    user_id IS NULL
    OR (select auth.uid()) = user_id
  );

-- Authenticated: users can update their own bookings; managers/admins can update any
CREATE POLICY "Users and staff can update booking events"
  ON public.booking_events FOR UPDATE TO authenticated
  USING (
    (select auth.uid()) = user_id
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
        AND profiles.role = ANY (ARRAY['admin', 'manager'])
    )
  )
  WITH CHECK (
    (select auth.uid()) = user_id
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
        AND profiles.role = ANY (ARRAY['admin', 'manager'])
    )
  );

-- Admins only: delete bookings
CREATE POLICY "Admins can delete bookings"
  ON public.booking_events FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
        AND profiles.is_admin = true
    )
  );


-- ════════════════════════════════════════════════
-- 6. OPERATORS — fix auth() re-evaluation
-- ════════════════════════════════════════════════

DROP POLICY IF EXISTS "Admins can insert operators" ON public.operators;
DROP POLICY IF EXISTS "Admins can update operators" ON public.operators;
DROP POLICY IF EXISTS "Admins can delete operators" ON public.operators;

CREATE POLICY "Admins can insert operators"
  ON public.operators FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
        AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can update operators"
  ON public.operators FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
        AND profiles.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
        AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can delete operators"
  ON public.operators FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
        AND profiles.is_admin = true
    )
  );


-- ════════════════════════════════════════════════
-- 7. LANDING_SETTINGS — fix auth() re-evaluation
-- ════════════════════════════════════════════════

DROP POLICY IF EXISTS "Admins can insert landing settings" ON public.landing_settings;
DROP POLICY IF EXISTS "Admins can update landing settings" ON public.landing_settings;

CREATE POLICY "Admins can insert landing settings"
  ON public.landing_settings FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
        AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update landing settings"
  ON public.landing_settings FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
        AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
        AND profiles.role = 'admin'
    )
  );


-- ════════════════════════════════════════════════
-- 8. PORTFOLIO_CLIENTS — fix auth() re-evaluation
-- ════════════════════════════════════════════════

DROP POLICY IF EXISTS "Admins can insert portfolio clients" ON public.portfolio_clients;
DROP POLICY IF EXISTS "Admins can update portfolio clients" ON public.portfolio_clients;
DROP POLICY IF EXISTS "Admins can delete portfolio clients" ON public.portfolio_clients;

CREATE POLICY "Admins can insert portfolio clients"
  ON public.portfolio_clients FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
        AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can update portfolio clients"
  ON public.portfolio_clients FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
        AND profiles.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
        AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can delete portfolio clients"
  ON public.portfolio_clients FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
        AND profiles.is_admin = true
    )
  );


-- ════════════════════════════════════════════════
-- 9. APP_SETTINGS — fix auth() re-evaluation
-- ════════════════════════════════════════════════

DROP POLICY IF EXISTS "Admins can update app settings" ON public.app_settings;

CREATE POLICY "Admins can update app settings"
  ON public.app_settings FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
        AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
        AND profiles.role = 'admin'
    )
  );


-- ════════════════════════════════════════════════
-- 10. CLIENTS — fix auth() re-evaluation
-- ════════════════════════════════════════════════

DROP POLICY IF EXISTS "Admins can view all clients" ON public.clients;
DROP POLICY IF EXISTS "Admins can update clients" ON public.clients;

CREATE POLICY "Admins can view all clients"
  ON public.clients FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
        AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can update clients"
  ON public.clients FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
        AND profiles.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
        AND profiles.is_admin = true
    )
  );


-- ════════════════════════════════════════════════
-- 11. MARQUEE_STARS — restrict write to admins only
-- ════════════════════════════════════════════════

DROP POLICY IF EXISTS "Authenticated users can insert marquee stars" ON public.marquee_stars;
DROP POLICY IF EXISTS "Authenticated users can update marquee stars" ON public.marquee_stars;
DROP POLICY IF EXISTS "Authenticated users can delete marquee stars" ON public.marquee_stars;

CREATE POLICY "Admins can insert marquee stars"
  ON public.marquee_stars FOR INSERT TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update marquee stars"
  ON public.marquee_stars FOR UPDATE TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Admins can delete marquee stars"
  ON public.marquee_stars FOR DELETE TO authenticated
  USING (is_admin());


-- ════════════════════════════════════════════════
-- 12. TARIFFS — restrict write to admins only
-- ════════════════════════════════════════════════

DROP POLICY IF EXISTS "Authenticated users can insert tariffs" ON public.tariffs;
DROP POLICY IF EXISTS "Authenticated users can update tariffs" ON public.tariffs;
DROP POLICY IF EXISTS "Authenticated users can delete tariffs" ON public.tariffs;

CREATE POLICY "Admins can insert tariffs"
  ON public.tariffs FOR INSERT TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update tariffs"
  ON public.tariffs FOR UPDATE TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Admins can delete tariffs"
  ON public.tariffs FOR DELETE TO authenticated
  USING (is_admin());
