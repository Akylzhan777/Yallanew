/*
  # Schedule Daily WhatsApp Reminders Cron Job

  ## Summary
  Creates a pg_cron job that calls the `whatsapp-reminders` Edge Function
  every day at 18:00 Dubai time (UTC+4 = 14:00 UTC).

  ## Schedule
  - Cron expression: `0 14 * * *` (14:00 UTC = 18:00 Dubai / Asia/Dubai)
  - Dubai does not observe daylight saving time, so UTC+4 is fixed year-round

  ## How it works
  - Uses pg_net's `http_post` to make an async HTTP call to the Edge Function
  - The function queries booking_events for tomorrow's bookings and sends WhatsApp reminders
  - Authorization uses the anon key (function has verify_jwt = false)

  ## Notes
  - Job is named "daily-whatsapp-reminders" for easy identification
  - Existing job with same name is removed before recreation to allow safe re-runs
*/

SELECT cron.unschedule('daily-whatsapp-reminders')
FROM cron.job
WHERE jobname = 'daily-whatsapp-reminders';

SELECT cron.schedule(
  'daily-whatsapp-reminders',
  '0 14 * * *',
  $$
  SELECT extensions.http_post(
    'https://cybxtdcomnmswqrworzc.supabase.co/functions/v1/whatsapp-reminders',
    '{}',
    'application/json'
  );
  $$
);
