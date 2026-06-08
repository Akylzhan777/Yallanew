-- Fix interval overlap logic in get_available_slots.
-- Previous version only checked if the new slot's START fell inside an existing booking.
-- Correct check: the new slot [v_slot_min, v_slot_min + v_step_min] overlaps
-- an existing booking [existing_start, existing_end + buffer] iff:
--   v_slot_min < existing_end + buffer  AND  v_slot_min + v_step_min > existing_start

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
  v_slot_max        int;
  v_disabled        text[];
  v_slots_json      jsonb;
BEGIN
  SELECT COALESCE(booking_buffer, 0)
    INTO v_buffer_minutes
    FROM creator_profiles
   WHERE id = p_creator_id;

  SELECT ARRAY(
    SELECT blocked_date::text
      FROM creator_blocked_dates
     WHERE creator_id = p_creator_id
       AND blocked_date BETWEEN p_start_date AND p_end_date
  ) INTO v_blocked_dates;

  v_date := p_start_date;
  WHILE v_date <= p_end_date LOOP
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
      v_disabled := ARRAY[]::text[];
      v_slot_min := v_work_start_min;

      WHILE v_slot_min + v_step_min <= v_work_end_min LOOP
        v_slot_max := v_slot_min + v_step_min;

        -- True interval intersection:
        --   new slot [v_slot_min, v_slot_max) overlaps existing [existing_start, existing_end + buffer)
        --   iff v_slot_min < existing_end + buffer  AND  v_slot_max > existing_start
        IF EXISTS (
          SELECT 1
            FROM creator_bookings cb
           WHERE cb.creator_id = p_creator_id
             AND cb.booking_date = v_date
             AND cb.status IN ('pending', 'confirmed', 'in_progress')
             AND (
               v_slot_min < (
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
               AND v_slot_max > (
                 CASE
                   WHEN cb.start_time IS NOT NULL
                   THEN EXTRACT(HOUR FROM cb.start_time::time)::int * 60
                      + EXTRACT(MINUTE FROM cb.start_time::time)::int
                   ELSE EXTRACT(HOUR FROM cb.booking_time::time)::int * 60
                      + EXTRACT(MINUTE FROM cb.booking_time::time)::int
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

GRANT EXECUTE ON FUNCTION get_available_slots(uuid, date, date) TO anon;
GRANT EXECUTE ON FUNCTION get_available_slots(uuid, date, date) TO authenticated;
REVOKE EXECUTE ON FUNCTION get_available_slots(uuid, date, date) FROM public;
