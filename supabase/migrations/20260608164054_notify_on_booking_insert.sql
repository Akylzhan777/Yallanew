CREATE OR REPLACE FUNCTION notify_kz_booking()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM net.http_post(
    url     := 'https://cybxtdcomnmswqrworzc.supabase.co/functions/v1/kz-book-notify',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN5Ynh0ZGNvbW5tc3dxcndvcnpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5OTk1MDYsImV4cCI6MjA4NzU3NTUwNn0.-_6GJy1Tjt601wTJIZf6SttyIG21LQf1zpcT41jrf4s'
    ),
    body    := jsonb_build_object('record', row_to_json(NEW))
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_kz_booking ON creator_bookings;
CREATE TRIGGER trg_notify_kz_booking
  AFTER INSERT ON creator_bookings
  FOR EACH ROW
  EXECUTE FUNCTION notify_kz_booking();
