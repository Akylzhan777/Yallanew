import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import {
  WORK_START, WORK_END, TIME_STEP,
  localIsoDate, timeToMinutes, minutesToTime,
  getAllTimeOptions, isWeekday, addDays,
} from '../lib/slotUtils';

interface CreatorInfo {
  id: string;
  display_name: string;
  handle: string;
  avatar_url: string | null;
  category: string;
  creator_type: string;
  location: string;
  is_published: boolean;
}

interface CreatorBookingRow {
  id: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  status: string;
}

const ALL_TIME_OPTIONS = getAllTimeOptions();
const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const MONTHS_FULL = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS = ['Mon','Tue','Wed','Thu','Fri'];

function buildCalendarWeeks(): Array<Array<Date | null>> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
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
      const isInRange = weekdays.some(wd => localIsoDate(wd) === iso);
      week.push(isInRange ? day : null);
    }
    weeks.push(week);
    cursor = addDays(cursor, 7);
  }
  return weeks;
}

function getOccupiedRanges(bookings: CreatorBookingRow[], dateStr: string): Array<{ start: number; end: number }> {
  return bookings
    .filter(b => b.booking_date === dateStr && b.status !== 'cancelled')
    .map(b => ({
      start: Math.max(WORK_START * 60, timeToMinutes(b.start_time ?? '00:00')),
      end: Math.min(WORK_END * 60, timeToMinutes(b.end_time ?? '00:00')),
    }));
}

function isTimeRangeFreeLocal(bookings: CreatorBookingRow[], dateStr: string, startMin: number, endMin: number): boolean {
  const dayBookings = bookings.filter(b => b.booking_date === dateStr && b.status !== 'cancelled');
  return !dayBookings.some(b => {
    const bStart = timeToMinutes(b.start_time ?? '00:00');
    const bEnd = timeToMinutes(b.end_time ?? '00:00');
    return startMin < bEnd && endMin > bStart;
  });
}

export default function CreatorBookingPage({ handle }: { handle: string }) {
  const [creator, setCreator] = useState<CreatorInfo | null | 'loading'>('loading');
  const [bookings, setBookings] = useState<CreatorBookingRow[]>([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);

  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [clientName, setClientName] = useState('');
  const [whatsappRaw, setWhatsappRaw] = useState('');
  const [taskDescription, setTaskDescription] = useState('');

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3500); };

  useEffect(() => {
    supabase
      .from('creator_profiles')
      .select('id, display_name, handle, avatar_url, category, creator_type, location, is_published')
      .eq('handle', handle.toLowerCase())
      .maybeSingle()
      .then(({ data }) => setCreator(data as CreatorInfo | null));
  }, [handle]);

  const fetchBookings = useCallback(async () => {
    if (!creator || creator === 'loading') return;
    const { data } = await supabase
      .from('creator_bookings')
      .select('id, booking_date, start_time, end_time, status')
      .eq('creator_id', creator.id)
      .order('booking_date');
    setBookings(data ?? []);
    setLoading(false);
  }, [creator]);

  useEffect(() => {
    if (!creator || creator === 'loading') return;
    setLoading(true);
    fetchBookings();
  }, [fetchBookings, creator]);

  const weeks = buildCalendarWeeks();
  const calDays = weeks.flat().filter((d): d is Date => d !== null);

  const headingMonth = (): string => {
    if (calDays.length === 0) return '';
    const first = calDays[0];
    const last = calDays[calDays.length - 1];
    if (first.getMonth() === last.getMonth()) return `${MONTHS_FULL[first.getMonth()]} ${first.getFullYear()}`;
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
    ? !isTimeRangeFreeLocal(bookings, selectedDate, startMin, endMin)
    : false;

  const openBookingModal = (presetStart?: string) => {
    setStartTime(presetStart ?? '');
    setEndTime('');
    setClientName('');
    setWhatsappRaw('');
    setTaskDescription('');
    setBookingSuccess(false);
    setModalOpen(true);
  };

  const confirmBooking = async () => {
    if (!creator || creator === 'loading') return;
    if (!startTime) { showToast('Please select a start time'); return; }
    if (!endTime) { showToast('Please select an end time'); return; }
    if (isRangeConflict) { showToast('Selected time overlaps with an existing booking'); return; }
    if (!clientName.trim()) { showToast('Please enter your name'); return; }
    const whatsappDigits = whatsappRaw.replace(/\D/g, '');
    if (whatsappDigits.length < 7) { showToast('Please enter a valid WhatsApp number'); return; }

    setSubmitting(true);
    const { error } = await supabase.from('creator_bookings').insert({
      creator_id: creator.id,
      booking_date: selectedDate,
      start_time: startTime,
      end_time: endTime,
      booking_time: startTime,
      client_name: clientName.trim(),
      client_phone: whatsappDigits,
      details: taskDescription.trim(),
      status: 'pending',
    });
    setSubmitting(false);
    if (error) { showToast('Failed to book. Please try again.'); return; }
    setBookingSuccess(true);
    fetchBookings();
  };

  const todayStr = localIsoDate(new Date());
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
            return <div key={i} className="cal-timeline-occupied" style={{ left: `${left}%`, width: `${width}%` }} />;
          })}
          {startMin > 0 && endMin > 0 && !isRangeConflict && (
            <div className="cal-timeline-selected" style={{
              left: `${((startMin - WORK_START * 60) / totalMin) * 100}%`,
              width: `${((endMin - startMin) / totalMin) * 100}%`,
            }} />
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

  // Loading state
  if (creator === 'loading') {
    return (
      <div className="cal-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div className="loading-spinner">Loading...</div>
      </div>
    );
  }

  // Not found
  if (!creator || !creator.is_published) {
    return (
      <div className="cal-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <h2 style={{ color: '#fff', fontSize: '1.3rem', marginBottom: '0.5rem' }}>Creator not found</h2>
          <p style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: '1.5rem' }}>This booking page does not exist or the creator is no longer available.</p>
          <a href="/" style={{ color: '#00C48C', fontSize: '0.85rem' }}>Back to Home</a>
        </div>
      </div>
    );
  }

  return (
    <div className="cal-page">
      {toast && <div className="admin-toast">{toast}</div>}

      {/* Booking modal */}
      {modalOpen && (
        <div className="cal-modal-overlay" onClick={() => !bookingSuccess && setModalOpen(false)}>
          <div className="cal-modal-sheet" onClick={e => e.stopPropagation()}>
            <div className="cal-modal-drag-handle" />

            {bookingSuccess ? (
              <div className="cal-booking-success">
                <div className="cal-success-icon cal-success-icon--animated">
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                    <polyline points="22 4 12 14.01 9 11.01" className="cal-success-check"/>
                  </svg>
                </div>
                <div className="cal-success-text-block">
                  <h3 className="cal-success-title">Booking Submitted!</h3>
                  <p className="cal-success-subtitle-en">{creator.display_name} will confirm your booking shortly.</p>
                  <p className="cal-success-subtitle-ru">Your request has been sent. You will be contacted via WhatsApp.</p>
                </div>
                <div className="cal-success-divider" />
                <button className="cal-success-close-link" onClick={() => setModalOpen(false)}>
                  Close
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
                  {creator.avatar_url
                    ? <img src={creator.avatar_url} alt={creator.display_name} className="cal-modal-op-photo" />
                    : <div className="cal-modal-op-photo" style={{ background: 'rgba(0,196,140,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', fontWeight: 700, color: '#00C48C' }}>
                        {creator.display_name[0]?.toUpperCase()}
                      </div>
                  }
                  <div>
                    <div className="cal-modal-op-name">{creator.display_name}</div>
                    <div className="cal-modal-op-role">{creator.creator_type} · {creator.category}</div>
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
                          <button key={opt}
                            className={`cal-time-chip${active ? ' active' : ''}${disabled ? ' disabled' : ''}`}
                            onClick={() => { if (!disabled) { setStartTime(opt); setEndTime(''); } }}
                            disabled={disabled}
                          >{opt}</button>
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
                            <button key={opt}
                              className={`cal-time-chip${active ? ' active' : ''}`}
                              onClick={() => setEndTime(opt)}
                            >{opt}</button>
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
                      <input value={clientName} onChange={e => setClientName(e.target.value)}
                        placeholder="Your name" className="cal-field-input" />
                    </div>

                    <div className="cal-phone-wrap">
                      <div className="cal-modal-field-new">
                        <div className="cal-field-icon">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.18 2 2 0 0 1 3.6 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.6a16 16 0 0 0 6 6l.95-.95a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21.72 16l.2.92z"/>
                          </svg>
                        </div>
                        <input value={whatsappRaw} onChange={e => setWhatsappRaw(e.target.value)}
                          placeholder="+971 50 123 4567" type="tel" className="cal-field-input" />
                      </div>
                      <div className="cal-phone-helper">
                        <span>Please enter your active WhatsApp number with country code.</span>
                      </div>
                    </div>

                    <div className="cal-modal-field-new cal-modal-field-textarea">
                      <div className="cal-field-icon cal-field-icon-top">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/></svg>
                      </div>
                      <textarea value={taskDescription} onChange={e => setTaskDescription(e.target.value)}
                        placeholder="What are we shooting? (Topic, wishes, location...)"
                        className="cal-field-input cal-field-textarea" rows={3} />
                    </div>
                  </div>
                </div>

                <div className="cal-modal-sheet-footer">
                  <button className="cal-modal-sheet-cancel" onClick={() => setModalOpen(false)}>Cancel</button>
                  <button className="cal-modal-sheet-confirm"
                    onClick={confirmBooking}
                    disabled={submitting || !startTime || !endTime || isRangeConflict}>
                    {submitting ? 'Booking...' : 'Confirm'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Header with creator info */}
      <div className="cal-header">
        <div className="cal-header-row">
          <a href="/" className="cal-back-icon-btn" aria-label="Back">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 5l-7 7 7 7"/>
            </svg>
          </a>

          <div className="cal-operator-pill">
            {creator.avatar_url
              ? <img src={creator.avatar_url} alt={creator.display_name} className="cal-op-avatar-sm" />
              : <div className="cal-op-avatar-sm" style={{ background: 'rgba(0,196,140,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 700, color: '#00C48C', borderRadius: '50%' }}>
                  {creator.display_name[0]?.toUpperCase()}
                </div>
            }
            <div className="cal-operator-pill-info">
              <span className="cal-operator-pill-name">{creator.display_name}</span>
              <span className="cal-operator-pill-role">{creator.creator_type} · {creator.category}</span>
            </div>
          </div>
        </div>

        <div className="cal-header-title-row">
          <h1 className="cal-title">Choose a Date</h1>
        </div>
      </div>

      {loading ? (
        <div className="loading-spinner">Loading...</div>
      ) : (
        <div className="cal-layout">
          <div className="cal-grid-card">
            <div className="cal-grid-heading">
              <span className="cal-month-label">{headingMonth()}</span>
            </div>

            <div className="cal-weekdays-row">
              {DAYS.map(d => <div key={d} className="cal-weekday-label">{d}</div>)}
            </div>

            {weeks.map((week, wi) => (
              <div key={wi} className="cal-week-row">
                {week.map((day, di) => {
                  if (!day) return <div key={`empty-${wi}-${di}`} className="cal-day-empty" />;
                  const ds = localIsoDate(day);
                  const isToday = ds === todayStr;
                  const isSelected = ds === selectedDate;
                  const occupied = getOccupiedRanges(bookings, ds);
                  const totalWorkMin = (WORK_END - WORK_START) * 60;
                  const occupiedMin = occupied.reduce((s, r) => s + (r.end - r.start), 0);
                  const freeMin = totalWorkMin - occupiedMin;
                  const fullyBooked = freeMin < TIME_STEP;
                  return (
                    <button key={ds}
                      onClick={() => setSelectedDate(ds)}
                      className={`cal-day-btn${isSelected ? ' selected' : ''}${isToday ? ' today' : ''}`}>
                      <span className="cal-day-num">{day.getDate()}</span>
                      <span className="cal-day-mon">{MONTHS_SHORT[day.getMonth()]}</span>
                      {fullyBooked && occupied.length > 0 && <span className="cal-day-badge occupied">—</span>}
                      {!fullyBooked && occupied.length > 0 && <span className="cal-day-badge partial">Few left</span>}
                      {freeMin >= 60 && occupied.length === 0 && <span className="cal-day-badge free">Free</span>}
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
                <p>Pick a date to see available time slots</p>
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
                      <button key={opt}
                        className={`cal-slot-bubble${disabled ? ' taken' : ' free'}`}
                        onClick={() => { if (!disabled) openBookingModal(opt); }}
                        disabled={disabled}>
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
