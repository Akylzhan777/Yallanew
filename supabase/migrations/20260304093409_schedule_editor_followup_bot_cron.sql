/*
  # Schedule editor-followup-bot cron job

  ## Summary
  Sets up a pg_cron job that fires the editor-followup-bot Edge Function every hour
  on the hour (0 * * * *) during the day.

  ## What it does
  1. Removes any existing cron job with the same name to avoid duplicates.
  2. Schedules a new hourly cron that calls the edge function via pg_net HTTP POST.

  ## Notes
  - Runs every hour: 0 * * * *
  - Uses pg_net for the outbound HTTP call to the Supabase Edge Function
  - The anon key is safe here; the function itself uses the service role key internally
*/

SELECT cron.unschedule('editor-followup-bot')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'editor-followup-bot'
);

SELECT cron.schedule(
  'editor-followup-bot',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://cybxtdcomnmswqrworzc.supabase.co/functions/v1/editor-followup-bot',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN5Ynh0ZGNvbW5tc3dxcndvcnpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5OTk1MDYsImV4cCI6MjA4NzU3NTUwNn0.-_6GJy1Tjt601wTJIZf6SttyIG21LQf1zpcT41jrf4s"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
