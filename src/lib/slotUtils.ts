// STRICTLY DO NOT MODIFY THIS COMPONENT
import { BookingEvent } from './supabase';

export const WORK_START = 9;
export const WORK_END = 18;
export const TIME_STEP = 30;
export const BUFFER_MINUTES = 60;

export const RU_MONTHS_SHORT = ['янв','фев','мар','апр','май','июн','июл','авг','сен','окт','ноя','дек'];
export const RU_MONTHS_FULL = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];

export function localIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
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

export function getOccupiedRanges(bookings: BookingEvent[], dateStr: string): Array<{ start: number; end: number }> {
  return bookings
    .filter(b => b.date === dateStr && b.status !== 'cancelled')
    .map(b => ({
      start: Math.max(WORK_START * 60, timeToMinutes(b.start_time ?? '00:00') - BUFFER_MINUTES),
      end: Math.min(WORK_END * 60, timeToMinutes(b.end_time ?? '00:00') + BUFFER_MINUTES),
    }));
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

export function buildBookingWeeks(): Array<Array<Date | null>> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
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
    const dow = r.getDay();
    const diff = dow === 0 ? -6 : 1 - dow;
    r.setDate(r.getDate() + diff);
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
      const iso = localIsoDate(day);
      const isInRange = weekdays.some(d => localIsoDate(d) === iso);
      week.push(isInRange ? day : null);
    }
    weeks.push(week);
    cursor = addDays(cursor, 7);
  }
  return weeks;
}
