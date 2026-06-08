-- Auto-cancel stale 'pending' bookings every 10 minutes.
-- These are legacy/direct bookings that were never confirmed or paid.
-- Status is changed to 'cancelled' (not deleted) for audit purposes.
CREATE EXTENSION IF NOT EXISTS pg_cron;

SELECT cron.schedule(
  'cancel-expired-pending-bookings',
  '*/10 * * * *',
  $$
    UPDATE creator_bookings
       SET status = 'cancelled'
     WHERE status = 'pending'
       AND created_at < NOW() - INTERVAL '20 minutes';
  $$
);
