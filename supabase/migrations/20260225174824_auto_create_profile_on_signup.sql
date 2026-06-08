/*
  # Auto-create profile on user signup + fix existing users

  ## Summary
  Fixes the "stuck on Loading..." bug caused by missing profile rows.

  ## Changes

  ### 1. Trigger Function: handle_new_user
  - Creates a function that fires after every new user is inserted into auth.users
  - Inserts a corresponding row into public.profiles with safe defaults:
    - balance = 0
    - role = 'user'
    - referral_code = first 8 chars of the new user's UUID
    - All other text fields default to empty string

  ### 2. Trigger: on_auth_user_created
  - Fires AFTER INSERT on auth.users
  - Calls handle_new_user() for each new row

  ### 3. Backfill existing users
  - Inserts profile rows for any auth.users row that has no matching public.profiles row
  - Uses ON CONFLICT DO NOTHING to be safe and idempotent

  ### 4. RLS Policies (ensure correct access)
  - SELECT: authenticated users can read their own profile
  - UPDATE: authenticated users can update their own profile
  - Drops old conflicting policies before recreating to avoid duplicates
*/

-- ── 1. TRIGGER FUNCTION ──────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    name,
    surname,
    dob,
    avatar_url,
    balance,
    referral_code,
    invited_count,
    earned_count,
    current_subs,
    start_subs,
    growth,
    total_views,
    videos_filmed,
    role,
    is_admin
  ) VALUES (
    NEW.id,
    '',
    '',
    '',
    'https://placehold.co/200x200/1a1a2e/FFF?text=U',
    0,
    substring(NEW.id::text, 1, 8),
    0,
    0,
    '0',
    '0',
    '+0',
    '0',
    0,
    'user',
    false
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- ── 2. TRIGGER ───────────────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ── 3. BACKFILL EXISTING USERS ───────────────────────────────────────────────
INSERT INTO public.profiles (
  id,
  name,
  surname,
  dob,
  avatar_url,
  balance,
  referral_code,
  invited_count,
  earned_count,
  current_subs,
  start_subs,
  growth,
  total_views,
  videos_filmed,
  role,
  is_admin
)
SELECT
  u.id,
  '',
  '',
  '',
  'https://placehold.co/200x200/1a1a2e/FFF?text=U',
  0,
  substring(u.id::text, 1, 8),
  0,
  0,
  '0',
  '0',
  '+0',
  '0',
  0,
  'user',
  false
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- ── 4. RLS POLICIES ──────────────────────────────────────────────────────────
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop old policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can read all profiles" ON public.profiles;

-- SELECT: user sees their own row
CREATE POLICY "Users can view own profile"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- UPDATE: user updates their own row
CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- INSERT: allow the trigger (runs as SECURITY DEFINER) to insert
-- Also allow the user themselves in case of manual creation
CREATE POLICY "Users can insert own profile"
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Admin read-all (needed for AdminDashboard)
CREATE POLICY "Admins can read all profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles admin_p
      WHERE admin_p.id = auth.uid()
        AND (admin_p.is_admin = true OR admin_p.role = 'admin')
    )
  );
