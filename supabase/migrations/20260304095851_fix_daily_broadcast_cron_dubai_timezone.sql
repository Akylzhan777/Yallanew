/*
  # Fix Daily Telegram Broadcast Cron Schedule (Dubai Timezone)

  ## Overview
  Updates the daily Telegram broadcast cron job schedule from 10:00 AM UTC
  to 06:00 AM UTC, which equals 10:00 AM Dubai time (GST, UTC+4).

  ## Changes
  - Reschedules 'telegram-daily-broadcast' job from `0 10 * * *` to `0 6 * * *`

  ## Notes
  1. Dubai is UTC+4 (GST - Gulf Standard Time), no daylight saving time
  2. 06:00 UTC = 10:00 AM Dubai / GST
  3. Unschedule existing job first to avoid duplicates
*/

SELECT cron.unschedule('telegram-daily-broadcast') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'telegram-daily-broadcast'
);

SELECT cron.schedule(
  'telegram-daily-broadcast',
  '0 6 * * *',
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
