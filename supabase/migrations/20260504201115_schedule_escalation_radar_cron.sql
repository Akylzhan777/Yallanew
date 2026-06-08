/*
  # Schedule escalation-radar cron job

  1. Changes
    - Unschedules any existing `escalation-radar-every-minute` job
    - Schedules a new pg_cron job that runs every 1 minute and calls the
      `escalation-radar` edge function via pg_net.

  2. Notes
    - Requires pg_cron and pg_net extensions (already enabled in earlier migrations).
    - Uses SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY via current_setting fallbacks
      that were set by previous cron migrations in this project.
*/

DO $$
DECLARE
  jid int;
BEGIN
  SELECT jobid INTO jid FROM cron.job WHERE jobname = 'escalation-radar-every-minute';
  IF jid IS NOT NULL THEN
    PERFORM cron.unschedule(jid);
  END IF;
END $$;

SELECT cron.schedule(
  'escalation-radar-every-minute',
  '* * * * *',
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'project_url') || '/functions/v1/escalation-radar',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
    ),
    body := '{}'::jsonb
  );
  $$
);
