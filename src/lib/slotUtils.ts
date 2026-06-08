import { BookingEvent } from './supabase';

export const WORK_START = 9;
export const WORK_END = 18;
export const TIME_STEP = 30;
export const BUFFER_MINUTES = 60;

export const RU_MONTHS_SHORT = ['янв','фев','мар','апр','май','июн','июл','авг','сен','окт','ноя','дек'];
export const RU_MONTHS_FULL = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];

// Returns YYYY-MM-DD for `d` interpreted in the given IANA timezone.
// Always pass the operator/creator's timezone — never rely on the visitor's browser locale.
export function localIsoDate(d: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

export function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

export function minutesToTime(m: number): string {
  const h = Math.floor(m / 60);
  const min = m % 60;
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

export function getAllTimeOptions(): string[] {
  const options: string[] = [];
  for (let m = WORK_START * 60; m <= WORK_END * 60; m += TIME_STEP) {
    options.push(minutesToTime(m));
  }
  return options;
}

export function isTimeRangeFree(
  bookings: BookingEvent[],
  dateStr: string,
  startMin: number,
  endMin: number,
  excludeBookingId?: string,
): boolean {
  const dayBookings = bookings.filter(
    b => b.date === dateStr && b.status !== 'cancelled' && b.id !== excludeBookingId,
  );
  return !dayBookings.some(b => {
    const bStart = timeToMinutes(b.start_time ?? '00:00') - BUFFER_MINUTES;
    const bEnd = timeToMinutes(b.end_time ?? '00:00') + BUFFER_MINUTES;
    return startMin < bEnd && endMin > bStart;
  });
}

function mergeIntervals(intervals: Array<{ start: number; end: number }>): Array<{ start: number; end: number }> {
  if (intervals.length === 0) return [];
  const sorted = [...intervals].sort((a, b) => a.start - b.start);
  const merged = [{ ...sorted[0] }];
  for (let i = 1; i < sorted.length; i++) {
    const last = merged[merged.length - 1];
    if (sorted[i].start <= last.end) {
      last.end = Math.max(last.end, sorted[i].end);
    } else {
      merged.push({ ...sorted[i] });
    }
  }
  return merged;
}

export function getOccupiedRanges(bookings: BookingEvent[], dateStr: string, bufferMinutes = BUFFER_MINUTES): Array<{ start: number; end: number }> {
  const raw = bookings
    .filter(b => b.date === dateStr && b.status !== 'cancelled')
    .map(b => ({
      start: Math.max(WORK_START * 60, timeToMinutes(b.start_time ?? '00:00') - bufferMinutes),
      end: Math.min(WORK_END * 60, timeToMinutes(b.end_time ?? '00:00') + bufferMinutes),
    }));
  return mergeIntervals(raw);
}

export function isWeekday(d: Date): boolean {
  const dow = d.getDay();
  return dow !== 0 && dow !== 6;
}

export function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

// Builds 4-week calendar grid anchored to "today" in the given timezone.
// Starts at i=0 (today) so clients can make same-day bookings.
// Past time slots within today are blocked by isTimeDisabled in the UI.
// TODO: Implement creator.lead_time_hours check to allow per-creator minimum booking notice.
export function buildBookingWeeks(timeZone: string): Array<Array<Date | null>> {
  const todayStr = localIsoDate(new Date(), timeZone);
  const [ty, tm, td] = todayStr.split('-').map(Number);
  const today = new Date(Date.UTC(ty, tm - 1, td));

  const weekdays: Date[] = [];
  for (let i = 0; weekdays.length < 20; i++) {
    const d = addDays(today, i);
    if (isWeekday(d)) weekdays.push(d);
  }
  if (weekdays.length === 0) return [];

  const firstDay = weekdays[0];
  const lastDay = weekdays[weekdays.length - 1];

  const getMondayOf = (d: Date): Date => {
    const r = new Date(d);
    const dow = r.getUTCDay();
    const diff = dow === 0 ? -6 : 1 - dow;
    r.setUTCDate(r.getUTCDate() + diff);
    return r;
  };

  const weekStart = getMondayOf(firstDay);
  const weekEnd = getMondayOf(lastDay);
  const weeks: Array<Array<Date | null>> = [];
  let cursor = new Date(weekStart);
  while (cursor <= weekEnd) {
    const week: Array<Date | null> = [];
    for (let i = 0; i < 5; i++) {
      const day = addDays(cursor, i);
      const iso = localIsoDate(day, timeZone);
      const isInRange = weekdays.some(wd => localIsoDate(wd, timeZone) === iso);
      week.push(isInRange ? day : null);
    }
    weeks.push(week);
    cursor = addDays(cursor, 7);
  }
  return weeks;
}
