/*
  # Schedule HR Broadcast Cron Job (5x Daily)

  ## Summary
  Creates a pg_cron job that triggers the HR broadcast edge function 5 times per day,
  targeting the YallaJob HR group only. Completely isolated from client marketing broadcasts.

  ## Schedule
  Dubai times (UTC+4): 10:00, 13:00, 16:00, 19:00, 22:00
  UTC cron expression: 0 6,9,12,15,18 * * *

  ## Notes
  - Uses pg_net to call the Supabase edge function via HTTP
  - The ?type=hr_broadcast query parameter routes the call to the HR broadcast handler
  - Any existing job with the same name is unscheduled first to prevent duplicates
*/

SELECT cron.unschedule('hr-broadcast-5x-daily') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'hr-broadcast-5x-daily'
);

SELECT cron.schedule(
  'hr-broadcast-5x-daily',
  '0 6,9,12,15,18 * * *',
  $$
  SELECT net.http_post(
    url := (SELECT value FROM app_settings WHERE key = 'supabase_url') || '/functions/v1/telegram-broadcast?type=hr_broadcast',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT value FROM app_settings WHERE key = 'supabase_anon_key')
    ),
    body := '{}'::jsonb
  );
  $$
);
