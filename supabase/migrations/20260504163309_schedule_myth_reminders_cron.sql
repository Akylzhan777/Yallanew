/*
  # Myth reminders cron schedule

  1. Changes
    - Schedule `myth-reminders` Edge Function to run every hour at minute 0
    - The function itself validates Dubai weekday (Thu/Sat) and hour (12 or 23), so unmatched runs no-op
    - Uses pg_net.http_post with service-role auth

  2. Notes
    - 12:00 Dubai = 08:00 UTC; 23:00 Dubai = 19:00 UTC
    - Using hourly schedule keeps the cron simple and lets the function stay source-of-truth for schedule logic
    - Duplicate-send guard lives in myth_operator_reminders.last_day_sent_date / last_evening_sent_date
*/

DO $$
DECLARE
  project_url text := current_setting('app.settings.supabase_url', true);
  service_key text := current_setting('app.settings.service_role_key', true);
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'myth-reminders-hourly') THEN
    PERFORM cron.unschedule('myth-reminders-hourly');
  END IF;
END $$;

SELECT cron.schedule(
  'myth-reminders-hourly',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'project_url') || '/functions/v1/myth-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
    ),
    body := '{}'::jsonb
  );
  $$
);
