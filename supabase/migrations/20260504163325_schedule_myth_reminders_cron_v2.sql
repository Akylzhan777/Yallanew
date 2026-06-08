/*
  # Reschedule myth-reminders cron (align with existing extensions.http_post pattern)

  - Unschedule previous job if present
  - Schedule hourly execution; function itself gates on Dubai weekday/hour
*/

SELECT cron.unschedule('myth-reminders-hourly')
FROM cron.job
WHERE jobname = 'myth-reminders-hourly';

SELECT cron.schedule(
  'myth-reminders-hourly',
  '0 * * * *',
  $$
  SELECT extensions.http_post(
    'https://cybxtdcomnmswqrworzc.supabase.co/functions/v1/myth-reminders',
    '{}',
    'application/json'
  );
  $$
);
