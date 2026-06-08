-- Prevent blocking a date that already has active bookings.
-- Active statuses: pending, pending_payment, confirmed, in_progress.
CREATE OR REPLACE FUNCTION check_blocked_date_conflicts()
RETURNS TRIGGER AS $$
DECLARE
  v_conflict_count int;
BEGIN
  SELECT COUNT(*) INTO v_conflict_count
  FROM creator_bookings
  WHERE creator_id = NEW.creator_id
    AND booking_date = NEW.blocked_date::text
    AND status IN ('pending', 'pending_payment', 'confirmed', 'in_progress');

  IF v_conflict_count > 0 THEN
    RAISE EXCEPTION 'Не удалось заблокировать дату %. У вас есть активные или ожидающие подтверждения бронирования на этот день. Сначала урегулируйте или отмените текущие заказы.', NEW.blocked_date
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_check_blocked_date_conflicts ON public.creator_blocked_dates;
CREATE TRIGGER trg_check_blocked_date_conflicts
  BEFORE INSERT OR UPDATE ON public.creator_blocked_dates
  FOR EACH ROW
  EXECUTE FUNCTION check_blocked_date_conflicts();
