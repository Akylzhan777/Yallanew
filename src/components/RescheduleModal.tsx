import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase, BookingEvent } from '../lib/supabase';
import { safeGetItem } from '../utils/safeStorage';
import {
  localIsoDate,
  minutesToTime,
  timeToMinutes,
  getAllTimeOptions,
  getOccupiedRanges,
  isTimeRangeFree,
  buildBookingWeeks,
  WORK_END,
  TIME_STEP,
} from '../lib/slotUtils';

const UAE_TZ = 'Asia/Dubai';

const RU_DAYS_EN = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

interface Props {
  booking: BookingEvent;
  onClose: () => void;
  onSuccess: (updatedBooking: BookingEvent) => void;
}

const ALL_TIME_OPTIONS = getAllTimeOptions();

export default function RescheduleModal({ booking, onClose, onSuccess }: Props) {
  const { t, i18n } = useTranslation();
  const isEn =
    i18n.language?.startsWith('en') ||
    safeGetItem('yalla_lang') === 'en' ||
    window.location.search.includes('lang=en');
  const [allBookings, setAllBookings] = useState<BookingEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const MONTHS_SHORT: string[] = t('calendar.monthsShort', { returnObjects: true }) as string[];
  const DAYS: string[] = t('calendar.days', { returnObjects: true }) as string[];

  useEffect(() => {
    supabase
      .from('booking_events')
      .select('*')
      .eq('operator_id', booking.operator_id)
      .then(({ data }) => {
        setAllBookings(data ?? []);
        setLoading(false);
      });
  }, [booking.operator_id]);

  const weeks = buildBookingWeeks(UAE_TZ);
  const todayStr = localIsoDate(new Date(), UAE_TZ);

  const startMin = startTime ? timeToMinutes(startTime) : -1;

  const getValidEndOptions = (): string[] => {
    if (!startTime) return [];
    const occupied = getOccupiedRanges(
      allBookings.filter(b => b.id !== booking.id),
      selectedDate,
    );
    const options: string[] = [];
    for (let m = startMin + TIME_STEP; m <= WORK_END * 60; m += TIME_STEP) {
      const blocked = occupied.some(r => r.start < m && r.end > startMin);
      if (blocked) break;
      options.push(minutesToTime(m));
    }
    return options;
  };

  const isStartOptionDisabled = (t: string): boolean => {
    const tMin = timeToMinutes(t);
    const occupied = getOccupiedRanges(
      allBookings.filter(b => b.id !== booking.id),
      selectedDate,
    );
    const notInsideOccupied = !occupied.some(r => r.start < tMin && r.end > tMin);
    const atLeastOneEndAvailable = occupied.every(r => r.start >= tMin + TIME_STEP || r.end <= tMin);
    return !notInsideOccupied || !atLeastOneEndAvailable;
  };

  const hasFreeTime = (dateStr: string): boolean => {
    const occupied = getOccupiedRanges(
      allBookings.filter(b => b.id !== booking.id),
      dateStr,
    );
    if (occupied.length === 0) return true;
    return isTimeRangeFree(
      allBookings.filter(b => b.id !== booking.id),
      dateStr,
      occupied[0]?.start ?? 0,
      occupied[0]?.end ?? 0,
    );
  };

  const handleConfirm = async () => {
    if (!selectedDate || !startTime || !endTime) return;
    setSaving(true);
    setError('');
    const { data, error: err } = await supabase
      .from('booking_events')
      .update({ date: selectedDate, start_time: startTime, end_time: endTime })
      .eq('id', booking.id)
      .select()
      .maybeSingle();
    if (err) {
      setError(t('booking.rescheduleError'));
    } else if (data) {
      onSuccess(data as BookingEvent);
    }
    setSaving(false);
  };

  const bookingDate = new Date(booking.date + 'T00:00:00');
  const currentStr = `${bookingDate.getDate()} ${MONTHS_SHORT[bookingDate.getMonth()]} · ${(booking.start_time ?? '').slice(0, 5)} – ${(booking.end_time ?? '').slice(0, 5)}`;

  const dayLabels = DAYS.length === 5 ? DAYS : RU_DAYS_EN;
  const validEndOptions = getValidEndOptions();

  return (
    <div className="cal-modal-overlay" onClick={onClose}>
      <div className="cal-modal reschedule-modal" onClick={e => e.stopPropagation()}>
        <div className="reschedule-header">
          <h3 className="cal-modal-title">{t('booking.rescheduleTitle')}</h3>
          <p className="reschedule-current">
            {t('booking.rescheduleCurrent')} <strong>{currentStr}</strong>
          </p>
        </div>

        {loading ? (
          <div className="reschedule-loading">{t('loading')}</div>
        ) : (
          <>
            <div className="reschedule-section-label">{t('booking.reschedulePickDate')}</div>
            <div className="reschedule-cal">
              <div className="reschedule-cal-days-header">
                {dayLabels.map(d => <div key={d} className="reschedule-cal-day-name">{d}</div>)}
              </div>
              {weeks.map((week, wi) => (
                <div key={wi} className="reschedule-cal-week">
                  {week.map((day, di) => {
                    if (!day) return <div key={di} className="reschedule-cal-cell reschedule-cal-empty" />;
                    const iso = localIsoDate(day, UAE_TZ);
                    const isPast = iso < todayStr;
                    const free = !isPast && hasFreeTime(iso);
                    const isSelected = iso === selectedDate;
                    return (
                      <button
                        key={di}
                        className={`reschedule-cal-cell reschedule-cal-day ${isSelected ? 'selected' : ''} ${isPast || !free ? 'disabled' : ''}`}
                        onClick={() => { if (!isPast && free) { setSelectedDate(iso); setStartTime(''); setEndTime(''); } }}
                        disabled={isPast || !free}
                      >
                        <span className="reschedule-cal-date">{day.getDate()}</span>
                        {!isPast && (
                          <span className={`reschedule-cal-free ${!free ? 'no-free' : ''}`}>
                            {free ? t('calendar.free') : '—'}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>

            {selectedDate && (
              <>
                <div className="reschedule-section-label" style={{ marginTop: 16 }}>
                  {t('booking.reschedulePickTime')} — {new Date(selectedDate + 'T00:00:00').getDate()} {MONTHS_SHORT[new Date(selectedDate + 'T00:00:00').getMonth()]}
                </div>
                <div className="cal-time-picker-row" style={{ marginBottom: 0 }}>
                  <div className="cal-time-picker-field">
                    {isEn ? <label className="cal-modal-label">Start</label> : <label className="cal-modal-label">Начало</label>}
                    <select
                      className="cal-modal-input cal-time-select"
                      value={startTime}
                      onChange={e => { setStartTime(e.target.value); setEndTime(''); }}
                    >
                      {isEn ? <option value="">— select —</option> : <option value="">— выберите —</option>}
                      {ALL_TIME_OPTIONS.slice(0, -1).map(t => {
                        const disabled = isStartOptionDisabled(t);
                        return (
                          <option key={t} value={t} disabled={disabled}>
                            {t}{disabled ? isEn ? ' (busy)' : ' (занято)' : ''}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                  <div className="cal-time-picker-field">
                    {isEn ? <label className="cal-modal-label">End</label> : <label className="cal-modal-label">Конец</label>}
                    <select
                      className="cal-modal-input cal-time-select"
                      value={endTime}
                      onChange={e => setEndTime(e.target.value)}
                      disabled={!startTime}
                    >
                      {isEn ? <option value="">— select —</option> : <option value="">— выберите —</option>}
                      {validEndOptions.map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </>
            )}

            {error && <p className="reschedule-error">{error}</p>}
          </>
        )}

        <div className="cal-modal-actions" style={{ marginTop: 20 }}>
          <button className="cal-modal-cancel" onClick={onClose}>{t('booking.cancel')}</button>
          <button
            className="cal-modal-confirm"
            onClick={handleConfirm}
            disabled={!selectedDate || !startTime || !endTime || saving}
          >
            {saving ? t('booking.rescheduleSaving') : t('booking.confirm')}
          </button>
        </div>
      </div>
    </div>
  );
}
