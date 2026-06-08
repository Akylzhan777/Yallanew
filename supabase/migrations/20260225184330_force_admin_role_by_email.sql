/*
  # Force Admin Role by Email

  Updates the profile for the specified email address to have admin role and is_admin flag set.

  1. Changes
    - Sets role = 'admin' and is_admin = true for akylzhantravel@gmail.com
    - Looks up auth.users to find the matching profile by email
*/

UPDATE profiles
SET role = 'admin', is_admin = true
WHERE id = (
  SELECT id FROM auth.users WHERE email = 'akylzhantravel@gmail.com'
  LIMIT 1
);
