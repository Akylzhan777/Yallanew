/*
  # Schedule Daily Telegram Broadcast via pg_cron

  ## Overview
  Schedules the telegram-broadcast Edge Function with type="daily"
  to run every day at 10:00 AM UTC.

  ## Cron Schedule
  - Expression: `0 10 * * *`
  - Meaning: At 10:00 AM every day

  ## Notes
  1. Requires pg_cron and pg_net extensions (already enabled)
  2. Job name: 'telegram-daily-broadcast'
  3. Unschedule: SELECT cron.unschedule('telegram-daily-broadcast');
  4. Uses unschedule-if-exists pattern to avoid duplicate job errors
*/

SELECT cron.unschedule('telegram-daily-broadcast') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'telegram-daily-broadcast'
);

SELECT cron.schedule(
  'telegram-daily-broadcast',
  '0 10 * * *',
  $$
  SELECT net.http_post(
    url := (SELECT value FROM app_settings WHERE key = 'supabase_url' LIMIT 1) || '/functions/v1/telegram-broadcast',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT value FROM app_settings WHERE key = 'anon_key' LIMIT 1)
    ),
    body := '{"type":"daily"}'::jsonb
  )
  $$
);
