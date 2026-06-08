/*
  # Add unique constraint to prevent double-booking race conditions

  ## Purpose
  Prevents two users from booking the exact same operator slot at the same time.

  ## Changes
  - Adds a unique constraint on (operator_id, date, start_time) so that even if
    two simultaneous INSERT requests pass the application-level conflict check,
    the database will reject the second one with a unique violation (error code 23505).

  ## Notes
  - Only one booking per (operator, date, start_time) combination is allowed.
  - The application already handles error code 23505 with a user-friendly message.
*/

ALTER TABLE booking_events
  ADD CONSTRAINT booking_events_operator_date_start_unique
  UNIQUE (operator_id, date, start_time);
