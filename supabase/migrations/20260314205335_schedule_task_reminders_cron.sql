/*
  # Schedule task-reminders cron job

  ## Summary
  Schedules the `task-reminders` edge function to run every hour so it can
  send WhatsApp reminders to the admin for any task whose due_datetime falls
  within the next 60 minutes.

  ## Cron Schedule
  - Expression: `0 * * * *` (top of every hour)
  - Function: task-reminders edge function via pg_net HTTP POST

  ## Notes
  1. Uses pg_cron + pg_net (already enabled in previous migrations).
  2. Unschedules any existing job with the same name before recreating.
*/

SELECT cron.unschedule('task-reminders-hourly') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'task-reminders-hourly'
);

SELECT cron.schedule(
  'task-reminders-hourly',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url := (SELECT 'https://' || (SELECT current_setting('app.settings.supabase_url', true)) || '/functions/v1/task-reminders'),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT current_setting('app.settings.service_role_key', true))
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
