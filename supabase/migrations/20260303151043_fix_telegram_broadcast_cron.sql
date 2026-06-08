/*
  # Fix Telegram Broadcast Cron Schedule

  ## Overview
  Removes the previous cron job (which used a non-existent app_settings key lookup)
  and replaces it with a working schedule that uses the actual project URL and anon key.

  ## Cron Schedule
  - Expression: `0 10 * * 0`
  - Runs every Sunday at 10:00 AM UTC

  ## Notes
  1. The telegram-broadcast Edge Function has verify_jwt=false so it accepts the anon key
  2. To manually trigger: SELECT cron.run_job('telegram-weekly-broadcast');
  3. To pause: SELECT cron.unschedule('telegram-weekly-broadcast');
*/

SELECT cron.unschedule('telegram-weekly-broadcast');

SELECT cron.schedule(
  'telegram-weekly-broadcast',
  '0 10 * * 0',
  $$
  SELECT net.http_post(
    url := 'https://cybxtdcomnmswqrworzc.supabase.co/functions/v1/telegram-broadcast',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN5Ynh0ZGNvbW5tc3dxcndvcnpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5OTk1MDYsImV4cCI6MjA4NzU3NTUwNn0.-_6GJy1Tjt601wTJIZf6SttyIG21LQf1zpcT41jrf4s"}'::jsonb,
    body := '{}'::jsonb
  )
  $$
);
