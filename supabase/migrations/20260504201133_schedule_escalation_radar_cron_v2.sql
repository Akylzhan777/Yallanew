/*
  # Reschedule escalation-radar cron with project-standard pattern

  1. Changes
    - Unschedules previous escalation-radar-every-minute job (if any)
    - Reschedules using the same current_setting pattern used by other cron jobs
      in this project (daily-ai-summary etc).
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
    url := current_setting('app.supabase_url') || '/functions/v1/escalation-radar',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer ' || current_setting('app.supabase_anon_key') || '"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);
