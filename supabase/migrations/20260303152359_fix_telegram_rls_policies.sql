/*
  # Fix Telegram RLS Policies

  ## Problem
  The original telegram_settings and telegram_groups RLS policies used a pattern
  that caused silent failures on UPDATE/INSERT from the authenticated client.
  The policies used `auth.uid()` inline which can trigger RLS recursion.

  ## Fix
  Drop and recreate all policies using the proven pattern from the operators table:
  - Use `(SELECT auth.uid() AS uid)` subquery to avoid recursion
  - Check `profiles.is_admin = true` (consistent with rest of the app)

  ## Tables affected
  - telegram_settings (SELECT, INSERT, UPDATE)
  - telegram_groups (SELECT, INSERT, DELETE)
*/

DROP POLICY IF EXISTS "Admins can read telegram settings" ON telegram_settings;
DROP POLICY IF EXISTS "Admins can insert telegram settings" ON telegram_settings;
DROP POLICY IF EXISTS "Admins can update telegram settings" ON telegram_settings;

DROP POLICY IF EXISTS "Admins can read telegram groups" ON telegram_groups;
DROP POLICY IF EXISTS "Admins can insert telegram groups" ON telegram_groups;
DROP POLICY IF EXISTS "Admins can delete telegram groups" ON telegram_groups;

CREATE POLICY "Admins can read telegram settings"
  ON telegram_settings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid() AS uid)
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can insert telegram settings"
  ON telegram_settings FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid() AS uid)
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can update telegram settings"
  ON telegram_settings FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid() AS uid)
      AND profiles.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid() AS uid)
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can read telegram groups"
  ON telegram_groups FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid() AS uid)
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can insert telegram groups"
  ON telegram_groups FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid() AS uid)
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can delete telegram groups"
  ON telegram_groups FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid() AS uid)
      AND profiles.is_admin = true
    )
  );
