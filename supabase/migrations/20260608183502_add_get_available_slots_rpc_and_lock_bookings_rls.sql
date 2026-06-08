-- 1. Lock down creator_bookings: revoke public/anon SELECT on raw rows.
--    Only the owning creator and admins may read actual booking records.
DROP POLICY IF EXISTS "Public can read creator bookings" ON creator_bookings;
DROP POLICY IF EXISTS "Anyone can read creator bookings" ON creator_bookings;
DROP POLICY IF EXISTS "anon_read_creator_bookings" ON creator_bookings;
DROP POLICY IF EXISTS "public_read_creator_bookings" ON creator_bookings;

-- Ensure authenticated owners can still read their own bookings (dashboard use).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'creator_bookings' AND policyname = 'creator_read_own_bookings'
  ) THEN
    EXECUTE $p$
      CREATE POLICY "creator_read_own_bookings" ON creator_bookings
        FOR SELECT TO authenticated
        USING (
          creator_id IN (
            SELECT id FROM creator_profiles WHERE user_id = auth.uid()
          )
        );
    $p$;
  END IF;
END $$;

-- 2. SECURITY DEFINER function — returns only the set of disabled time slots
--    for a given creator across a date range. No raw booking rows are exposed.
CREATE OR REPLACE FUNCTION get_available_slots(
  p_creator_id  uuid,
  p_start_date  date,
  p_end_date    date
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_buffer_minutes  int;
  v_result          jsonb := '[]'::jsonb;
  v_date            date;
  v_work_start_min  int := 9 * 60;   -- 09:00
  v_work_end_min    int := 21 * 60;  -- 21:00
  v_step_min        int := 60;
  v_blocked_dates   text[];
  v_slot_min        int;
  v_disabled        text[];
  v_slots_json      jsonb;
BEGIN
  -- Fetch booking buffer for this creator (default 0)
  SELECT COALESCE(booking_buffer, 0)
    INTO v_buffer_minutes
    FROM creator_profiles
   WHERE id = p_creator_id;

  -- Collect blocked dates
  SELECT ARRAY(
    SELECT blocked_date::text
      FROM creator_blocked_dates
     WHERE creator_id = p_creator_id
       AND blocked_date BETWEEN p_start_date AND p_end_date
  ) INTO v_blocked_dates;

  v_date := p_start_date;
  WHILE v_date <= p_end_date LOOP
    -- If blocked, mark all slots disabled
    IF v_date::text = ANY(v_blocked_dates) THEN
      SELECT jsonb_agg(to_char(
        (v_work_start_min + (n * v_step_min)) / 60 * interval '1 hour' +
        ((v_work_start_min + (n * v_step_min)) % 60) * interval '1 minute',
        'HH24:MI'
      ))
        INTO v_slots_json
        FROM generate_series(0, ((v_work_end_min - v_work_start_min) / v_step_min) - 1) AS n;

      v_result := v_result || jsonb_build_array(
        jsonb_build_object(
          'date', v_date::text,
          'blocked', true,
          'disabled_slots', COALESCE(v_slots_json, '[]'::jsonb)
        )
      );
    ELSE
      -- Collect occupied minute-ranges for this date
      v_disabled := ARRAY[]::text[];
      v_slot_min := v_work_start_min;

      WHILE v_slot_min + v_step_min <= v_work_end_min LOOP
        -- A slot is disabled if it overlaps any confirmed/pending booking (with buffer)
        IF EXISTS (
          SELECT 1
            FROM creator_bookings cb
           WHERE cb.creator_id = p_creator_id
             AND cb.booking_date = v_date
             AND cb.status IN ('pending', 'confirmed', 'in_progress')
             AND (
               -- slot start falls inside occupied range (including post-buffer)
               v_slot_min >= (
                 CASE
                   WHEN cb.start_time IS NOT NULL
                   THEN EXTRACT(HOUR FROM cb.start_time::time)::int * 60
                      + EXTRACT(MINUTE FROM cb.start_time::time)::int
                   ELSE EXTRACT(HOUR FROM cb.booking_time::time)::int * 60
                      + EXTRACT(MINUTE FROM cb.booking_time::time)::int
                 END
               )
               AND v_slot_min < (
                 CASE
                   WHEN cb.end_time IS NOT NULL
                   THEN EXTRACT(HOUR FROM cb.end_time::time)::int * 60
                      + EXTRACT(MINUTE FROM cb.end_time::time)::int
                      + v_buffer_minutes
                   ELSE EXTRACT(HOUR FROM cb.booking_time::time)::int * 60
                      + EXTRACT(MINUTE FROM cb.booking_time::time)::int
                      + 60 + v_buffer_minutes
                 END
               )
             )
        ) THEN
          v_disabled := v_disabled || to_char(
            (v_slot_min / 60) * interval '1 hour' + (v_slot_min % 60) * interval '1 minute',
            'HH24:MI'
          );
        END IF;
        v_slot_min := v_slot_min + v_step_min;
      END LOOP;

      v_result := v_result || jsonb_build_array(
        jsonb_build_object(
          'date',           v_date::text,
          'blocked',        false,
          'disabled_slots', to_jsonb(v_disabled)
        )
      );
    END IF;

    v_date := v_date + interval '1 day';
  END LOOP;

  RETURN v_result;
END;
$$;

-- Grant execute to anon so the public booking page can call it without auth.
GRANT EXECUTE ON FUNCTION get_available_slots(uuid, date, date) TO anon;
GRANT EXECUTE ON FUNCTION get_available_slots(uuid, date, date) TO authenticated;

-- Revoke execute from public to prevent accidental broad exposure.
REVOKE EXECUTE ON FUNCTION get_available_slots(uuid, date, date) FROM public;
