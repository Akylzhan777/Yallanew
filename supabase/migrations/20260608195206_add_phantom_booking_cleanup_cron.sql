-- Phantom-booking cleanup:
-- Delete creator_bookings in 'pending_payment' older than 15 minutes
-- whose linked order never reached 'on_hold' or 'completed'.
CREATE OR REPLACE FUNCTION cleanup_stale_pending_bookings()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM creator_bookings cb
  WHERE cb.status = 'pending_payment'
    AND cb.created_at < NOW() - INTERVAL '15 minutes'
    AND (
      cb.order_id IS NULL
      OR EXISTS (
        SELECT 1 FROM marketplace_orders mo
         WHERE mo.id = cb.order_id
           AND mo.status NOT IN ('on_hold', 'completed')
      )
    );
END;
$$;

-- Schedule cleanup every minute (requires pg_cron)
SELECT cron.schedule(
  'cleanup-stale-pending-bookings',
  '* * * * *',
  'SELECT cleanup_stale_pending_bookings();'
);
