/*
  # Myth night club — 5x daily Telegram broadcast cron

  Schedule: 10:00, 13:00, 16:00, 19:00, 22:00 Asia/Dubai (UTC+4, no DST)
  UTC equivalent: 06:00, 09:00, 12:00, 15:00, 18:00
  Cron expression: 0 6,9,12,15,18 * * *
*/

SELECT cron.unschedule('myth-club-5x-daily')
FROM cron.job
WHERE jobname = 'myth-club-5x-daily';

SELECT cron.schedule(
  'myth-club-5x-daily',
  '0 6,9,12,15,18 * * *',
  $$
  SELECT extensions.http_post(
    'https://cybxtdcomnmswqrworzc.supabase.co/functions/v1/telegram-broadcast?type=myth_broadcast',
    '{}',
    'application/json'
  );
  $$
);
