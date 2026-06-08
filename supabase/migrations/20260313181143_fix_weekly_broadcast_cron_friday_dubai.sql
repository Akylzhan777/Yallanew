/*
  # Fix Weekly Telegram Broadcast Cron: Sunday UTC → Friday Dubai Time

  ## Overview
  The weekly Telegram broadcast was incorrectly scheduled for Sundays at 10:00 AM UTC.
  This migration reschedules it to run on Fridays at 10:00 AM Dubai time (UTC+4),
  which means 06:00 AM UTC.

  ## Changes
  - Unschedules the existing 'telegram-weekly-broadcast' job
  - Reschedules it with cron expression `0 6 * * 5`
    - Minute 0, Hour 6 (UTC) = 10:00 AM Dubai (GST/UTC+4)
    - Day of week 5 = Friday

  ## Notes
  1. Dubai is UTC+4 (no DST), so 10:00 AM Dubai = 06:00 AM UTC always
  2. Cron day-of-week: 0=Sunday, 1=Monday, ..., 5=Friday, 6=Saturday
  3. To manually trigger: SELECT cron.run_job('telegram-weekly-broadcast');
  4. To verify schedule: SELECT * FROM cron.job WHERE jobname = 'telegram-weekly-broadcast';
*/

SELECT cron.unschedule('telegram-weekly-broadcast');

SELECT cron.schedule(
  'telegram-weekly-broadcast',
  '0 6 * * 5',
  $$
  SELECT net.http_post(
    url := 'https://cybxtdcomnmswqrworzc.supabase.co/functions/v1/telegram-broadcast',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN5Ynh0ZGNvbW5tc3dxcndvcnpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5OTk1MDYsImV4cCI6MjA4NzU3NTUwNn0.-_6GJy1Tjt601wTJIZf6SttyIG21LQf1zpcT41jrf4s"}'::jsonb,
    body := '{}'::jsonb
  )
  $$
);
