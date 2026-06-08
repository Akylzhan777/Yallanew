/*
  # Add role column to profiles table

  ## Summary
  Adds a `role` text column to the `profiles` table to support the admin/manager/user role system.

  ## Changes
  - `profiles` table: adds `role` column (text, default 'user')
  - Existing admins (is_admin = true) will have their role set to 'admin'
  - Adds RLS policies for managers on booking_events

  ## Values
  - 'user'    – regular user (default)
  - 'manager' – can view/update bookings, limited admin access
  - 'admin'   – full access
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'role'
  ) THEN
    ALTER TABLE profiles ADD COLUMN role text NOT NULL DEFAULT 'user';
  END IF;
END $$;

UPDATE profiles SET role = 'admin' WHERE is_admin = true AND role = 'user';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'booking_events' AND policyname = 'Managers can view all booking events'
  ) THEN
    CREATE POLICY "Managers can view all booking events"
      ON booking_events FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = auth.uid()
          AND profiles.role IN ('admin', 'manager')
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'booking_events' AND policyname = 'Managers can update booking events'
  ) THEN
    CREATE POLICY "Managers can update booking events"
      ON booking_events FOR UPDATE
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = auth.uid()
          AND profiles.role IN ('admin', 'manager')
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = auth.uid()
          AND profiles.role IN ('admin', 'manager')
        )
      );
  END IF;
END $$;
