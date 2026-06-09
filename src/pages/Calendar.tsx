// STRICTLY DO NOT MODIFY THIS COMPONENT
import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase, BookingEvent } from '../lib/supabase';
import { Operator } from '../components/OperatorSelector';
import { safeGetItem, safeSetItem } from '../utils/safeStorage';
import {
  WORK_START, WORK_END, TIME_STEP,
  localIsoDate, timeToMinutes, minutesToTime,
  getAllTimeOptions, isTimeRangeFree, getOccupiedRanges,
  isWeekday, addDays, buildBookingWeeks,
} from '../lib/slotUtils';


function getFreeWindowsCount(bookings: BookingEvent[], dateStr: string): number {
  const occupied = getOccupiedRanges(bookings, dateStr);
  if (occupied.length === 0) return 1;
  const totalMinutes = (WORK_END - WORK_START) * 60;
  const occupiedMinutes = occupied.reduce((sum, r) => sum + (r.end - r.start), 0);
  const freeMinutes = totalMinutes - occupiedMinutes;
  return freeMinutes >= TIME_STEP ? Math.floor(freeMinutes / TIME_STEP) : 0;
}

const UAE_TZ = 'Asia/Dubai';

function buildCalendarWeeks(): Array<Array<Date | null>> {
  const todayStr = localIsoDate(new Date(), UAE_TZ);
  const [ty, tm, td] = todayStr.split('-').map(Number);
  const today = new Date(Date.UTC(ty, tm - 1, td));
  const weekdays: Date[] = [];
  for (let i = 1; weekdays.length < 20; i++) {
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
      const iso = localIsoDate(day, UAE_TZ);
      const isInRange = weekdays.some(d => localIsoDate(d, UAE_TZ) === iso);
      week.push(isInRange ? day : null);
    }
    weeks.push(week);
    cursor = addDays(cursor, 7);
  }
  return weeks;
}

interface Props {
  operator: Operator;
  onBack: () => void;
}

const ALL_TIME_OPTIONS = getAllTimeOptions();

export default function Calendar({ operator, onBack }: Props) {
  const { t } = useTranslation();
  const MONTHS_FULL: string[] = t('calendar.monthsFull', { returnObjects: true }) as string[];
  const MONTHS_SHORT: string[] = t('calendar.monthsShort', { returnObjects: true }) as string[];
  const DAYS: string[] = t('calendar.days', { returnObjects: true }) as string[];

  const [bookings, setBookings] = useState<BookingEvent[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);

  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [clientName, setClientName] = useState(() => safeGetItem('yalla_client_name') || '');
  const [whatsappRaw, setWhatsappRaw] = useState(() => safeGetItem('yalla_client_phone') || '');
  const [location, setLocation] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [needsScript, setNeedsScript] = useState<boolean | null>(null);


  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3500);
  };

  const fetchBookings = useCallback(async () => {
    const { data } = await supabase
      .from('booking_events')
      .select('*')
      .eq('operator_id', operator.id)
      .order('date')
      .order('start_time');
    setBookings(data ?? []);
    setLoading(false);
  }, [operator.id]);

  useEffect(() => {
    setLoading(true);
    setSelectedDate('');
    fetchBookings();
    const channel = supabase
      .channel(`calendar-realtime-${operator.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'booking_events' }, () => {
        fetchBookings();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchBookings, operator.id]);

  const weeks = buildCalendarWeeks();
  const calDays = weeks.flat().filter((d): d is Date => d !== null);

  const headingMonth = (): string => {
    if (calDays.length === 0) return '';
    const first = calDays[0];
    const last = calDays[calDays.length - 1];
    if (first.getMonth() === last.getMonth()) {
      return `${MONTHS_FULL[first.getMonth()]} ${first.getFullYear()}`;
    }
    return `${MONTHS_SHORT[first.getMonth()]} — ${MONTHS_SHORT[last.getMonth()]} ${last.getFullYear()}`;
  };

  const startMin = startTime ? timeToMinutes(startTime) : -1;
  const endMin = endTime ? timeToMinutes(endTime) : -1;

  const getValidEndOptions = (): string[] => {
    if (!startTime) return [];
    const occupied = getOccupiedRanges(bookings, selectedDate);
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
    const occupied = getOccupiedRanges(bookings, selectedDate);
    const atLeastOneEndAvailable = occupied.every(r => r.start >= tMin + TIME_STEP || r.end <= tMin);
    const notInsideOccupied = !occupied.some(r => r.start < tMin && r.end > tMin);
    return !notInsideOccupied || !atLeastOneEndAvailable;
  };

  const durationMinutes = startMin > 0 && endMin > 0 ? endMin - startMin : 0;
  const durationLabel = durationMinutes > 0
    ? durationMinutes >= 60
      ? `${Math.floor(durationMinutes / 60)}h${durationMinutes % 60 > 0 ? ` ${durationMinutes % 60}min` : ''}`
      : `${durationMinutes}min`
    : '';

  const isRangeConflict = startTime && endTime
    ? !isTimeRangeFree(bookings, selectedDate, startMin, endMin)
    : false;

  const openBookingModal = (presetStart?: string) => {
    setStartTime(presetStart ?? '');
    setEndTime('');
    setClientName('');
    setWhatsappRaw('');
    setTaskDescription('');
    setNeedsScript(null);
    setBookingSuccess(false);
    setModalOpen(true);
  };

  const confirmBooking = async () => {
    if (!startTime) { showToast('Please select a start time'); return; }
    if (!endTime) { showToast('Please select an end time'); return; }
    if (isRangeConflict) { showToast('Selected time overlaps with an existing booking'); return; }
    if (!clientName.trim()) { showToast(t('calendar.nameMissing')); return; }
    const whatsappDigits = whatsappRaw.replace(/\D/g, '');
    if (whatsappDigits.length < 7) { showToast(t('calendar.whatsappInvalid')); return; }
    if (!taskDescription.trim()) { showToast(t('calendar.taskMissing')); return; }
    if (needsScript === null) { showToast('Please select whether you need a script'); return; }

    safeSetItem('yalla_client_name', clientName.trim());
    safeSetItem('yalla_client_phone', whatsappRaw);
    setSubmitting(true);
    const { data: insertedBooking, error } = await supabase.from('booking_events').insert({
      date: selectedDate,
      start_time: startTime,
      end_time: endTime,
      client_name: clientName.trim(),
      whatsapp: whatsappDigits,
      task_description: taskDescription.trim(),
      needs_script: needsScript,
      operator_id: operator.id,
      status: 'confirmed',
    }).select('id').single();
    setSubmitting(false);

    if (error) {
      showToast('Failed to save booking. Please try again.');
      return;
    }

    const bookingId = insertedBooking?.id;

    setBookingSuccess(true);

    const existingClient = await supabase
      .from('clients')
      .select('id, total_bookings')
      .eq('phone', whatsappDigits)
      .maybeSingle();

    if (existingClient.data) {
      await supabase
        .from('clients')
        .update({
          last_booking_date: new Date().toISOString(),
          total_bookings: (existingClient.data.total_bookings ?? 0) + 1,
          name: clientName.trim(),
        })
        .eq('id', existingClient.data.id);
    } else {
      await supabase.from('clients').insert({
        name: clientName.trim(),
        phone: whatsappDigits,
        total_bookings: 1,
        last_booking_date: new Date().toISOString(),
      });
    }

    fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/whatsapp-confirm`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          id: bookingId,
          name: clientName.trim(),
          phone: whatsappDigits,
          date: selectedDate,
          startTime,
          endTime,
        }),
      }
    ).catch(() => {});
  };

  const todayStr = localIsoDate(new Date(), UAE_TZ);
  const occupiedRangesForDate = selectedDate ? getOccupiedRanges(bookings, selectedDate) : [];
  const validEndOptions = getValidEndOptions();

  const renderTimeline = () => {
    if (!selectedDate) return null;
    const totalMin = (WORK_END - WORK_START) * 60;
    return (
      <div className="cal-timeline">
        <div className="cal-timeline-track">
          {occupiedRangesForDate.map((r, i) => {
            const left = ((r.start - WORK_START * 60) / totalMin) * 100;
            const width = ((r.end - r.start) / totalMin) * 100;
            return (
              <div
                key={i}
                className="cal-timeline-occupied"
                style={{ left: `${left}%`, width: `${width}%` }}
              />
            );
          })}
          {startMin > 0 && endMin > 0 && !isRangeConflict && (
            <div
              className="cal-timeline-selected"
              style={{
                left: `${((startMin - WORK_START * 60) / totalMin) * 100}%`,
                width: `${((endMin - startMin) / totalMin) * 100}%`,
              }}
            />
          )}
        </div>
        <div className="cal-timeline-labels">
          <span>{WORK_START}:00</span>
          <span>{Math.floor((WORK_START + WORK_END) / 2)}:00</span>
          <span>{WORK_END}:00</span>
        </div>
      </div>
    );
  };

  return (
    <div className="cal-page">
      {toast && <div className="admin-toast">{toast}</div>}

      {modalOpen && (
        <div className="cal-modal-overlay" onClick={() => !bookingSuccess && setModalOpen(false)}>
          <div className="cal-modal-sheet" onClick={e => e.stopPropagation()}>
            <div className="cal-modal-drag-handle" />

            {bookingSuccess ? (
              <div className="cal-booking-success">
                <div className="cal-success-confetti">🎉</div>
                <div className="cal-success-icon cal-success-icon--animated">
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                    <polyline points="22 4 12 14.01 9 11.01" className="cal-success-check"/>
                  </svg>
                </div>
                <div className="cal-success-text-block">
                  <h3 className="cal-success-title">Booking Confirmed!</h3>
                  <p className="cal-success-subtitle-en">Details are in your WhatsApp.</p>
                  <p className="cal-success-subtitle-ru">Бронь подтверждена! Детали уже в вашем WhatsApp.</p>
                </div>
                <div className="cal-success-divider" />
                <div className="cal-success-upsell">
                  <p className="cal-success-upsell-text">
                    Want to make your shoot even better? Discover our VIP packages, drone shots, and new locations.
                  </p>
                  <p className="cal-success-upsell-text cal-success-upsell-text--ru">
                    Хотите сделать съемку еще круче? Посмотрите наши VIP-пакеты, съемку с дрона и новые локации.
                  </p>
                </div>
                <button
                  className="cal-success-cta"
                  onClick={() => { setModalOpen(false); window.location.href = '/'; }}
                >
                  Explore Services&nbsp;&nbsp;/&nbsp;&nbsp;Посмотреть услуги
                </button>
                <button className="cal-success-close-link" onClick={() => setModalOpen(false)}>
                  Close / Закрыть
                </button>
              </div>
            ) : (
              <>

            <div className="cal-modal-sheet-head">
              <div>
                <div className="cal-modal-sheet-tag">
                  {selectedDate ? (() => {
                    const d = new Date(selectedDate + 'T00:00:00');
                    return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`;
                  })() : ''}
                </div>
                <h3 className="cal-modal-sheet-title">Confirm Booking</h3>
              </div>
              <button className="cal-modal-sheet-close" onClick={() => setModalOpen(false)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg>
              </button>
            </div>

            <div className="cal-modal-op-row">
              <img src={operator.photo} alt={operator.name} className="cal-modal-op-photo" />
              <div>
                <div className="cal-modal-op-name">{operator.name}</div>
                <div className="cal-modal-op-role">{operator.role}</div>
              </div>
              {startTime && endTime && !isRangeConflict && (
                <div className="cal-modal-time-badge">
                  {startTime} – {endTime}
                  {durationLabel && <span> · {durationLabel}</span>}
                </div>
              )}
            </div>

            <div className="cal-modal-sheet-body">
              <div className="cal-time-section-label">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>
                Select Time
              </div>

              {renderTimeline()}

              <div className="cal-time-grid-wrap">
                <div className="cal-time-grid-label">Start</div>
                <div className="cal-time-chip-grid">
                  {ALL_TIME_OPTIONS.slice(0, -1).map(opt => {
                    const disabled = isStartOptionDisabled(opt);
                    const active = startTime === opt;
                    return (
                      <button
                        key={opt}
                        className={`cal-time-chip${active ? ' active' : ''}${disabled ? ' disabled' : ''}`}
                        onClick={() => { if (!disabled) { setStartTime(opt); setEndTime(''); } }}
                        disabled={disabled}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
              </div>

              {startTime && (
                <div className="cal-time-grid-wrap">
                  <div className="cal-time-grid-label">End</div>
                  <div className="cal-time-chip-grid">
                    {validEndOptions.map(opt => {
                      const active = endTime === opt;
                      return (
                        <button
                          key={opt}
                          className={`cal-time-chip${active ? ' active' : ''}`}
                          onClick={() => setEndTime(opt)}
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {isRangeConflict && (
                <div className="cal-conflict-warning">
                  This time overlaps with an existing booking
                </div>
              )}

              <div className="cal-modal-fields-grid">
                <div className="cal-modal-field-new">
                  <div className="cal-field-icon">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                  </div>
                  <input
                    value={clientName}
                    onChange={e => setClientName(e.target.value)}
                    placeholder="What is your name?"
                    className="cal-field-input"
                  />
                </div>

                <div className="cal-phone-wrap">
                  <div className="cal-modal-field-new">
                    <div className="cal-field-icon">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.18 2 2 0 0 1 3.6 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.6a16 16 0 0 0 6 6l.95-.95a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21.72 16l.2.92z"/>
                      </svg>
                    </div>
                    <input
                      value={whatsappRaw}
                      onChange={e => setWhatsappRaw(e.target.value)}
                      placeholder="+971 50 123 4567"
                      type="tel"
                      className="cal-field-input"
                    />
                  </div>
                  <div className="cal-phone-helper">
                    <span>📱 Please enter your active WhatsApp number with country code (e.g. +971).</span>
                    <span>Пожалуйста, укажите действующий номер WhatsApp с кодом страны.</span>
                  </div>
                </div>

                <div className="cal-modal-field-new cal-modal-field-textarea">
                  <div className="cal-field-icon cal-field-icon-top">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/></svg>
                  </div>
                  <textarea
                    value={taskDescription}
                    onChange={e => setTaskDescription(e.target.value)}
                    placeholder="What are we shooting? (Topic, wishes...)"
                    className="cal-field-input cal-field-textarea"
                    rows={3}
                  />
                </div>

                <div className="cal-script-toggle-field">
                  <span className="cal-script-toggle-label">Do you need a script?</span>
                  <div className="cal-script-toggle-options">
                    <button
                      type="button"
                      className={`cal-script-opt${needsScript === true ? ' active' : ''}`}
                      onClick={() => setNeedsScript(true)}
                    >
                      Yes
                    </button>
                    <button
                      type="button"
                      className={`cal-script-opt${needsScript === false ? ' active' : ''}`}
                      onClick={() => setNeedsScript(false)}
                    >
                      No
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="cal-modal-sheet-footer">
              <button className="cal-modal-sheet-cancel" onClick={() => setModalOpen(false)}>
                Cancel
              </button>
              <button
                className="cal-modal-sheet-confirm"
                onClick={confirmBooking}
                disabled={submitting || !startTime || !endTime || isRangeConflict}
              >
                {submitting ? 'Booking...' : 'Confirm'}
              </button>
            </div>
              </>
            )}
          </div>
        </div>
      )}

      <div className="cal-header">
        <div className="cal-header-row">
          <button className="cal-back-icon-btn" onClick={onBack} aria-label={t('calendar.backToOperator')}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 5l-7 7 7 7"/>
            </svg>
          </button>

          <div className="cal-operator-pill">
            <img src={operator.photo} alt={operator.name} className="cal-op-avatar-sm" />
            <div className="cal-operator-pill-info">
              <span className="cal-operator-pill-name">{operator.name}</span>
              <span className="cal-operator-pill-role">{operator.role}</span>
            </div>
            <button className="cal-change-btn" onClick={onBack}>
              {t('calendar.change') || 'Change'}
            </button>
          </div>
        </div>

        <div className="cal-header-title-row">
          <h1 className="cal-title">{t('calendar.chooseDate')}</h1>
        </div>
      </div>

      {loading ? (
        <div className="loading-spinner">{t('loading')}</div>
      ) : (
        <div className="cal-layout">
          <div className="cal-grid-card">
            <div className="cal-grid-heading">
              <span className="cal-month-label">{headingMonth()}</span>
            </div>

            <div className="cal-weekdays-row">
              {DAYS.map(d => (
                <div key={d} className="cal-weekday-label">{d}</div>
              ))}
            </div>

            {weeks.map((week, wi) => (
              <div key={wi} className="cal-week-row">
                {week.map((day, di) => {
                  if (!day) {
                    return <div key={`empty-${wi}-${di}`} className="cal-day-empty" />;
                  }
                  const ds = localIsoDate(day, UAE_TZ);
                  const isToday = ds === todayStr;
                  const isSelected = ds === selectedDate;
                  const occupied = getOccupiedRanges(bookings, ds);
                  const totalWorkMin = (WORK_END - WORK_START) * 60;
                  const occupiedMin = occupied.reduce((s, r) => s + (r.end - r.start), 0);
                  const freeMin = totalWorkMin - occupiedMin;
                  const hasFree = freeMin >= 60;
                  const fullyBooked = freeMin < TIME_STEP;
                  return (
                    <button
                      key={ds}
                      onClick={() => setSelectedDate(ds)}
                      className={`cal-day-btn${isSelected ? ' selected' : ''}${isToday ? ' today' : ''}`}
                    >
                      <span className="cal-day-num">{day.getDate()}</span>
                      <span className="cal-day-mon">{MONTHS_SHORT[day.getMonth()]}</span>
                      {fullyBooked && occupied.length > 0 && (
                        <span className="cal-day-badge occupied">—</span>
                      )}
                      {!fullyBooked && occupied.length > 0 && (
                        <span className="cal-day-badge partial">Few left</span>
                      )}
                      {hasFree && occupied.length === 0 && (
                        <span className="cal-day-badge free">{t('calendar.free')}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>

          <div className="cal-slots-card">
            {!selectedDate ? (
              <div className="cal-slots-empty">
                <div className="cal-slots-empty-icon">📅</div>
                <p>{t('calendar.pickDateHint')}</p>
              </div>
            ) : (
              <>
                <div className="cal-slots-header">
                  <span className="cal-slots-date">
                    {(() => {
                      const d = new Date(selectedDate + 'T00:00:00');
                      return `${d.getDate()} ${MONTHS_FULL[d.getMonth()]}`;
                    })()}
                  </span>
                  <span className="cal-slots-count">
                    {occupiedRangesForDate.length === 0
                      ? 'Fully available'
                      : `${occupiedRangesForDate.length} booking${occupiedRangesForDate.length === 1 ? '' : 's'}`}
                  </span>
                </div>

                <div className="cal-slots-grid">
                  {ALL_TIME_OPTIONS.slice(0, -1).map(opt => {
                    const disabled = isStartOptionDisabled(opt);
                    return (
                      <button
                        key={opt}
                        className={`cal-slot-bubble${disabled ? ' taken' : ' free'}`}
                        onClick={() => { if (!disabled) openBookingModal(opt); }}
                        disabled={disabled}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
