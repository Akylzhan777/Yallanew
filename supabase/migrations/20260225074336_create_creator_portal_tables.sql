/*
  # Creator Portal: Core Tables

  ## Summary
  Creates all tables needed for the Creator Portal app.

  ## Tables
  1. **profiles** — Extended user profile linked to auth.users
     - balance (video credits), referral code, subscriber stats
  2. **scripts** — Video scripts per user
     - title, status (draft / moderation / ready)
  3. **schedule_slots** — Available filming time slots
     - day (1-31), time string, is_free flag
  4. **bookings** — Records which user booked which slot
     - user_id, slot_id, booked_at

  ## Security
  - RLS enabled on all tables
  - Users can only read/write their own data
  - schedule_slots readable by all authenticated users
*/

-- ─── PROFILES ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id               uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name             text NOT NULL DEFAULT '',
  surname          text NOT NULL DEFAULT '',
  dob              text NOT NULL DEFAULT '',
  avatar_url       text NOT NULL DEFAULT 'https://placehold.co/200x200/5D5FEF/FFF?text=K',
  balance          integer NOT NULL DEFAULT 0,
  referral_code    text UNIQUE NOT NULL DEFAULT '',
  invited_count    integer NOT NULL DEFAULT 0,
  earned_count     integer NOT NULL DEFAULT 0,
  current_subs     text NOT NULL DEFAULT '0',
  start_subs       text NOT NULL DEFAULT '0',
  growth           text NOT NULL DEFAULT '+0',
  total_views      text NOT NULL DEFAULT '0',
  videos_filmed    integer NOT NULL DEFAULT 0,
  created_at       timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ─── SCRIPTS ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS scripts (
  id         bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title      text NOT NULL DEFAULT '',
  status     text NOT NULL DEFAULT 'Черновик',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE scripts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own scripts"
  ON scripts FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own scripts"
  ON scripts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own scripts"
  ON scripts FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own scripts"
  ON scripts FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ─── SCHEDULE SLOTS ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS schedule_slots (
  id         bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  day        integer NOT NULL,
  time_slot  text NOT NULL,
  is_free    boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE schedule_slots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view all slots"
  ON schedule_slots FOR SELECT
  TO authenticated
  USING (true);

-- ─── BOOKINGS ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bookings (
  id         bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  slot_id    bigint NOT NULL REFERENCES schedule_slots(id) ON DELETE CASCADE,
  booked_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE(slot_id)
);

ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own bookings"
  ON bookings FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own bookings"
  ON bookings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- ─── SEED: Schedule Slots ────────────────────────────────────────────────────
INSERT INTO schedule_slots (day, time_slot, is_free) VALUES
  (12, '10:00', true),
  (12, '14:00', false),
  (14, '09:00', true),
  (14, '15:00', true),
  (15, '12:00', true),
  (20, '10:00', false)
ON CONFLICT DO NOTHING;
