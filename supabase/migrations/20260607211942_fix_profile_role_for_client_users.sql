-- Fix handle_new_user trigger to set role='client' when portal metadata is 'client'
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_role text;
BEGIN
  -- Determine role from user metadata (set at signup time)
  v_role := CASE
    WHEN NEW.raw_user_meta_data->>'portal' = 'client'  THEN 'client'
    WHEN NEW.raw_user_meta_data->>'portal' = 'creator' THEN 'user'
    WHEN (NEW.email = 'yallainfluencers@gmail.com' OR NEW.email LIKE '%@yallainfluencers.com') THEN 'admin'
    ELSE 'user'
  END;

  INSERT INTO public.profiles (
    id, name, surname, dob, avatar_url, balance,
    referral_code, invited_count, earned_count,
    current_subs, start_subs, growth, total_views,
    videos_filmed, role, is_admin
  ) VALUES (
    NEW.id, '', '', '',
    'https://placehold.co/200x200/1a1a2e/FFF?text=U',
    0,
    substring(NEW.id::text, 1, 8),
    0, 0, '0', '0', '+0', '0', 0,
    v_role,
    (v_role = 'admin')
  )
  ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role
    WHERE profiles.role = 'user'; -- only overwrite default, never downgrade admin/manager
  RETURN NEW;
END;
$$;

-- Backfill: set role='client' for all existing users who have a client_profiles row
-- but their profiles.role is still the default 'user'
UPDATE public.profiles p
SET    role = 'client'
FROM   public.client_profiles cp
WHERE  cp.user_id = p.id
  AND  p.role = 'user';
