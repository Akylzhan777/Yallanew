/*
  # Schedule daily AI summary cron job

  Runs daily-ai-summary edge function every day at 09:00 Dubai time (UTC+4 = 05:00 UTC).
*/

SELECT cron.schedule(
  'daily-ai-summary-0900-dubai',
  '0 5 * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.supabase_url') || '/functions/v1/daily-ai-summary',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer ' || current_setting('app.supabase_anon_key') || '"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);
