-- Drop the pg_net trigger (edge function now owns the full insert+notify flow)
DROP TRIGGER IF EXISTS trg_notify_kz_booking ON creator_bookings;
DROP FUNCTION IF EXISTS notify_kz_booking();

-- Revoke direct anon INSERT on creator_bookings (must go through edge function)
DROP POLICY IF EXISTS "Public can submit bookings" ON creator_bookings;
