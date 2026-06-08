/*
  # Schedule Telegram Broadcast via pg_cron

  ## Overview
  Schedules the telegram-broadcast Edge Function to run every Sunday at 10:00 AM UTC.

  ## Cron Schedule
  - Expression: `0 10 * * 0`
  - Meaning: At 10:00 AM, every Sunday (day 0)

  ## Notes
  1. Requires pg_cron and pg_net extensions (already enabled)
  2. The Edge Function URL is built from the Supabase project URL
  3. Uses the service role anon key for authorization (public function, no JWT required)
  4. Job name: 'telegram-weekly-broadcast'
  5. To remove the schedule: SELECT cron.unschedule('telegram-weekly-broadcast');
*/

SELECT cron.schedule(
  'telegram-weekly-broadcast',
  '0 10 * * 0',
  $$
  SELECT net.http_post(
    url := (SELECT value FROM app_settings WHERE key = 'supabase_url' LIMIT 1) || '/functions/v1/telegram-broadcast',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer " || (SELECT value FROM app_settings WHERE key = 'anon_key' LIMIT 1)}'::jsonb,
    body := '{}'::jsonb
  )
  $$
);
