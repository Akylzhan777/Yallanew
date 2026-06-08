/*
  # Schedule Driver Daily Schedule Cron Job

  ## Summary
  Creates a pg_cron job that calls the `driver-daily-schedule` Edge Function
  every evening at 22:00 Dubai time (UTC+4 = 18:00 UTC).

  ## Schedule
  - Cron expression: `0 18 * * *` (18:00 UTC = 22:00 Dubai / Asia/Dubai)
  - Dubai does not observe daylight saving time, so UTC+4 is fixed year-round

  ## How it works
  - Uses pg_net's `http_post` to make an async HTTP call to the Edge Function
  - The function queries booking_events for the next day, compiles a numbered list,
    and sends a single consolidated WhatsApp message to the driver (Arman)
  - Function has verify_jwt = false so no auth header is required

  ## Notes
  - Job is named "driver-daily-schedule" for easy identification
  - Existing job with the same name is safely removed before recreation
*/

SELECT cron.unschedule('driver-daily-schedule')
FROM cron.job
WHERE jobname = 'driver-daily-schedule';

SELECT cron.schedule(
  'driver-daily-schedule',
  '0 18 * * *',
  $$
  SELECT net.http_post(
    url := 'https://cybxtdcomnmswqrworzc.supabase.co/functions/v1/driver-daily-schedule',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);
