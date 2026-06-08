/*
  # Post-Shoot Follow-Up Automation

  ## Summary
  Adds a `followup_sent` flag to booking_events so the follow-up message is never
  sent twice to the same client, and schedules an hourly cron job that calls the
  new `post-shoot-followup` edge function.

  ## Changes

  ### Modified Tables
  - `booking_events`
    - `followup_sent` (boolean, default false) — tracks whether the post-shoot
      WhatsApp follow-up has already been sent for this booking

  ## Cron Jobs
  - `post-shoot-followup-hourly` — `0 * * * *` — fires every hour at :00
    The edge function uses a 55–75 minute look-back window against end_time
    (Dubai time) so bookings that ended ~1 hour ago receive the follow-up message.

  ## Notes
  - The column defaults to false; existing rows are safe (they will not be retro-sent
    because the cron only matches today's bookings whose end_time falls in the window)
  - Dubai is UTC+4; the edge function handles the timezone offset internally
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'booking_events' AND column_name = 'followup_sent'
  ) THEN
    ALTER TABLE booking_events ADD COLUMN followup_sent boolean NOT NULL DEFAULT false;
  END IF;
END $$;

SELECT cron.unschedule('post-shoot-followup-hourly')
FROM cron.job
WHERE jobname = 'post-shoot-followup-hourly';

SELECT cron.schedule(
  'post-shoot-followup-hourly',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://cybxtdcomnmswqrworzc.supabase.co/functions/v1/post-shoot-followup',
    body := '{}'::jsonb
  );
  $$
);
