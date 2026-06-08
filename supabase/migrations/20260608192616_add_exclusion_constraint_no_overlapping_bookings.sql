-- Enable btree_gist for combined equality + range exclusion.
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Immutable helper: combine a date and a text time into a timestamp.
CREATE OR REPLACE FUNCTION booking_ts(d date, t text)
RETURNS timestamp LANGUAGE sql IMMUTABLE PARALLEL SAFE AS $$
  SELECT (d || ' ' || t)::timestamp;
$$;

-- Exclusion constraint: same creator cannot have two active bookings
-- whose [start_time, end_time) intervals overlap on the same booking_date.
ALTER TABLE creator_bookings
  ADD CONSTRAINT no_overlapping_creator_time
  EXCLUDE USING gist (
    creator_id WITH =,
    tsrange(
      booking_ts(booking_date, start_time),
      booking_ts(booking_date, end_time)
    ) WITH &&
  )
  WHERE (status IN ('pending', 'confirmed', 'in_progress'));
