/*
  # Update WhatsApp Reminders Cron to Dual Schedule

  ## Summary
  Replaces the single evening cron with two separate cron jobs:
  - Morning job at 04:00 UTC (08:00 Dubai / UTC+4): sends "Today is the day" messages to all clients booked for TODAY
  - Evening job at 16:00 UTC (20:00 Dubai / UTC+4): sends 1-day and 2-day advance reminders

  ## Cron Jobs
  1. `whatsapp-reminders-morning` — `0 4 * * *` — triggers the function during Dubai morning hours
     The function detects it is before noon Dubai time and sends today's booking reminders.
  2. `whatsapp-reminders-evening` — `0 16 * * *` — triggers the function during Dubai evening hours
     The function detects it is afternoon/evening and sends tomorrow + day-after reminders.

  ## Notes
  - Old single job `daily-whatsapp-reminders` is removed
  - Dubai is UTC+4 and does not observe DST, so offsets are fixed year-round
  - The edge function determines which mode (morning/evening) by reading the Dubai hour at runtime
*/

SELECT cron.unschedule('daily-whatsapp-reminders')
FROM cron.job
WHERE jobname = 'daily-whatsapp-reminders';

SELECT cron.unschedule('whatsapp-reminders-morning')
FROM cron.job
WHERE jobname = 'whatsapp-reminders-morning';

SELECT cron.unschedule('whatsapp-reminders-evening')
FROM cron.job
WHERE jobname = 'whatsapp-reminders-evening';

SELECT cron.schedule(
  'whatsapp-reminders-morning',
  '0 4 * * *',
  $$
  SELECT net.http_post(
    url := 'https://cybxtdcomnmswqrworzc.supabase.co/functions/v1/whatsapp-reminders',
    body := '{}'::jsonb
  );
  $$
);

SELECT cron.schedule(
  'whatsapp-reminders-evening',
  '0 16 * * *',
  $$
  SELECT net.http_post(
    url := 'https://cybxtdcomnmswqrworzc.supabase.co/functions/v1/whatsapp-reminders',
    body := '{}'::jsonb
  );
  $$
);
