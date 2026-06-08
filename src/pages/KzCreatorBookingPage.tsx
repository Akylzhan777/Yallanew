import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { localIsoDate, addDays, isWeekday, WORK_START, WORK_END, TIME_STEP, RU_MONTHS_FULL, RU_MONTHS_SHORT } from '../lib/slotUtils';

interface CreatorProfile {
  id: string;
  display_name: string;
  avatar_url: string | null;
  creator_type: string;
  username: string;
  location?: string;
}

interface BookingSlot {
  id: string;
  booking_date: string;
  booking_time: string;
  start_time: string | null;
  end_time: string | null;
  status: string;
}

interface BlockedDate {
  blocked_date: string;
}

function getAllTimeOptions(): string[] {
  const options: string[] = [];
  for (let m = WORK_START * 60; m <= WORK_END * 60; m += TIME_STEP) {
    const h = Math.floor(m / 60);
    const min = m % 60;
    options.push(`${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`);
  }
  return options;
}

function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function getOccupiedRanges(bookings: BookingSlot[], dateStr: string): Array<{ start: number; end: number }> {
  return bookings
    .filter(b => b.booking_date === dateStr && b.status !== 'cancelled')
    .map(b => {
      const start = b.start_time ? timeToMinutes(b.start_time) : timeToMinutes(b.booking_time || '09:00');
      const end = b.end_time ? timeToMinutes(b.end_time) : start + 60;
      return { start: Math.max(WORK_START * 60, start - 30), end: Math.min(WORK_END * 60, end + 30) };
    });
}

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

const ALL_TIME_OPTIONS = getAllTimeOptions();
const WEEKDAYS_RU = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт'];

export default function KzCreatorBookingPage({ username }: { username: string }) {
  const [creator, setCreator] = useState<CreatorProfile | null>(null);
  const [bookings, setBookings] = useState<BookingSlot[]>([]);
  const [blockedDates, setBlockedDates] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [showForm, setShowForm] = useState(false);

  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [toast, setToast] = useState('');

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3500); };

  const fetchData = useCallback(async () => {
    const { data: profile } = await supabase
      .from('creator_profiles')
      .select('id, display_name, avatar_url, creator_type, username, location')
      .eq('username', username)
      .eq('region', 'KZ')
      .maybeSingle();

    if (!profile) { setNotFound(true); setLoading(false); return; }
    setCreator(profile);

    const [{ data: bookingData }, { data: blockedData }] = await Promise.all([
      supabase
        .from('creator_bookings')
        .select('id, booking_date, booking_time, start_time, end_time, status')
        .eq('creator_id', profile.id)
        .in('status', ['pending', 'confirmed', 'in_progress']),
      supabase
        .from('creator_blocked_dates')
        .select('blocked_date')
        .eq('creator_id', profile.id),
    ]);

    setBookings(bookingData ?? []);
    setBlockedDates(new Set((blockedData ?? []).map((d: BlockedDate) => d.blocked_date)));
    setLoading(false);
  }, [username]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const weeks = buildCalendarWeeks();
  const calDays = weeks.flat().filter((d): d is Date => d !== null);
  const todayStr = localIsoDate(new Date());

  const headingMonth = (): string => {
    if (calDays.length === 0) return '';
    const first = calDays[0];
    const last = calDays[calDays.length - 1];
    if (first.getMonth() === last.getMonth()) {
      return `${RU_MONTHS_FULL[first.getMonth()]} ${first.getFullYear()}`;
    }
    return `${RU_MONTHS_SHORT[first.getMonth()]} — ${RU_MONTHS_SHORT[last.getMonth()]} ${last.getFullYear()}`;
  };

  const getOccupiedForDate = (dateStr: string) => getOccupiedRanges(bookings, dateStr);

  const isTimeDisabled = (dateStr: string, t: string): boolean => {
    const tMin = timeToMinutes(t);
    const occupied = getOccupiedForDate(dateStr);
    return occupied.some(r => tMin >= r.start && tMin < r.end);
  };

  const handleDateSelect = (dateStr: string) => {
    setSelectedDate(dateStr);
    setSelectedTime('');
    setShowForm(false);
  };

  const handleTimeSelect = (t: string) => {
    setSelectedTime(t);
    setShowForm(true);
  };

  const handleSubmit = async () => {
    if (!clientName.trim()) { showToast('Введите ваше имя'); return; }
    const phoneDigits = clientPhone.replace(/\D/g, '');
    if (phoneDigits.length < 10) { showToast('Введите корректный номер телефона'); return; }
    if (!creator) return;

    setSubmitting(true);
    const { error } = await supabase.from('creator_bookings').insert({
      creator_id: creator.id,
      client_name: clientName.trim(),
      client_phone: phoneDigits,
      client_email: '',
      booking_date: selectedDate,
      booking_time: selectedTime,
      start_time: selectedTime,
      end_time: (() => {
        const m = timeToMinutes(selectedTime) + 60;
        const h = Math.floor(m / 60);
        const min = m % 60;
        return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
      })(),
      details: details.trim(),
      status: 'pending',
    });

    setSubmitting(false);
    if (error) { showToast('Ошибка при бронировании'); return; }
    setSuccess(true);

    // Notify videographer via edge function
    fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/kz-book-notify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}` },
      body: JSON.stringify({
        creator_id: creator.id,
        client_name: clientName.trim(),
        client_phone: phoneDigits,
        booking_date: selectedDate,
        booking_time: selectedTime,
        details: details.trim(),
      }),
    }).catch(() => {});
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0B101B]">
        <div className="w-8 h-8 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0B101B] px-6">
        <div className="text-center">
          <h1 className="text-xl font-bold text-white mb-2">Видеограф не найден</h1>
          <p className="text-sm text-gray-400">Проверьте ссылку или обратитесь к видеографу</p>
          <a href="/" className="inline-block mt-6 px-5 py-2.5 rounded-xl text-sm font-bold bg-amber-500/10 border border-amber-500/20 text-amber-400">На главную</a>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0B101B] px-6">
        <div className="text-center max-w-sm animate-[fadeInUp_0.4s_ease-out]">
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-4">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#00C48C" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          </div>
          <h1 className="text-xl font-bold text-white mb-2">Бронирование отправлено!</h1>
          <p className="text-sm text-gray-400 mb-1">Дата: {new Date(selectedDate + 'T00:00:00').toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })} в {selectedTime}</p>
          <p className="text-xs text-gray-500 mt-3">Видеограф получит уведомление и подтвердит бронь.</p>
          <button onClick={() => window.location.reload()} className="mt-6 px-5 py-2.5 rounded-xl text-sm font-bold bg-amber-500/10 border border-amber-500/20 text-amber-400">Забронировать ещё</button>
        </div>
      </div>
    );
  }

  const occupiedForSelected = selectedDate ? getOccupiedForDate(selectedDate) : [];
  const totalWorkMin = (WORK_END - WORK_START) * 60;
  const occupiedMin = occupiedForSelected.reduce((s, r) => s + (r.end - r.start), 0);
  const dateIsBlocked = selectedDate ? blockedDates.has(selectedDate) : false;

  return (
    <div className="min-h-screen bg-[#0B101B] text-white">
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] px-4 py-2.5 rounded-xl bg-red-500/90 text-white text-sm font-medium shadow-lg animate-[fadeInUp_0.2s_ease-out]">
          {toast}
        </div>
      )}

      {/* Header with creator info */}
      <div className="px-5 pt-10 pb-6">
        <div className="flex items-center gap-4 mb-4">
          {creator?.avatar_url ? (
            <img src={creator.avatar_url} alt={creator.display_name} className="w-14 h-14 rounded-full object-cover border-2 border-amber-500/20" />
          ) : (
            <div className="w-14 h-14 rounded-full bg-amber-500/10 border-2 border-amber-500/20 flex items-center justify-center">
              <span className="text-lg font-bold text-amber-400">{(creator?.display_name ?? 'V')[0]}</span>
            </div>
          )}
          <div>
            <h1 className="text-lg font-bold text-white">{creator?.display_name}</h1>
            <p className="text-xs text-gray-400 capitalize">{creator?.creator_type === 'videographer' ? 'Видеограф' : creator?.creator_type}</p>
            {creator?.location && <p className="text-xs text-gray-500 mt-0.5">{creator.location}</p>}
          </div>
        </div>
        <p className="text-sm text-gray-300">Выберите удобную дату и время для съёмки</p>
      </div>

      {/* Calendar grid */}
      <div className="px-5">
        <div className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="text-sm font-bold text-white mb-3">{headingMonth()}</div>

          <div className="grid grid-cols-5 gap-1 mb-2">
            {WEEKDAYS_RU.map(d => (
              <div key={d} className="text-center text-[10px] font-semibold text-gray-500">{d}</div>
            ))}
          </div>

          {weeks.map((week, wi) => (
            <div key={wi} className="grid grid-cols-5 gap-1 mb-1">
              {week.map((day, di) => {
                if (!day) return <div key={`e-${wi}-${di}`} className="aspect-[1.2]" />;
                const ds = localIsoDate(day);
                const isToday = ds === todayStr;
                const isSelected = ds === selectedDate;
                const isBlocked = blockedDates.has(ds);
                const occupied = getOccupiedRanges(bookings, ds);
                const occMin = occupied.reduce((s, r) => s + (r.end - r.start), 0);
                const freeMin = totalWorkMin - occMin;
                const fullyBooked = freeMin < TIME_STEP || isBlocked;
                const hasSomeBookings = occupied.length > 0;

                return (
                  <button
                    key={ds}
                    onClick={() => !fullyBooked && handleDateSelect(ds)}
                    disabled={fullyBooked}
                    className={`
                      relative aspect-[1.2] rounded-xl flex flex-col items-center justify-center transition-all text-center
                      ${isSelected ? 'bg-amber-500/20 ring-1 ring-amber-500/40' : fullyBooked ? 'opacity-40' : 'hover:bg-white/[0.05]'}
                      ${isToday && !isSelected ? 'ring-1 ring-emerald-500/30' : ''}
                    `}
                  >
                    <span className={`text-xs font-semibold ${isSelected ? 'text-amber-300' : isToday ? 'text-emerald-400' : 'text-gray-200'}`}>
                      {day.getDate()}
                    </span>
                    <span className="text-[9px] text-gray-500 mt-0.5">{RU_MONTHS_SHORT[day.getMonth()]}</span>
                    {!fullyBooked && !hasSomeBookings && (
                      <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 text-[7px] font-bold text-emerald-400">Своб.</span>
                    )}
                    {!fullyBooked && hasSomeBookings && (
                      <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 text-[7px] font-bold text-amber-400">Есть</span>
                    )}
                    {fullyBooked && (
                      <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 text-[7px] font-bold text-red-400/60">—</span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Time slots */}
      {selectedDate && !dateIsBlocked && (
        <div className="px-5 mt-4 animate-[fadeInUp_0.2s_ease-out]">
          <div className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-bold text-white">
                {new Date(selectedDate + 'T00:00:00').toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}
              </span>
              <span className="text-[11px] text-gray-500">
                {occupiedMin === 0 ? 'Полностью свободен' : `${occupiedForSelected.length} бронирование`}
              </span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {ALL_TIME_OPTIONS.slice(0, -1).map(opt => {
                const disabled = isTimeDisabled(selectedDate, opt);
                const active = selectedTime === opt;
                return (
                  <button
                    key={opt}
                    onClick={() => !disabled && handleTimeSelect(opt)}
                    disabled={disabled}
                    className={`
                      py-2 rounded-lg text-xs font-semibold transition-all
                      ${active ? 'bg-amber-500 text-black' : disabled ? 'bg-white/[0.02] text-gray-600 opacity-40' : 'bg-white/[0.05] text-gray-200 border border-white/10 hover:border-amber-500/30'}
                    `}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {selectedDate && dateIsBlocked && (
        <div className="px-5 mt-4">
          <div className="rounded-2xl p-5 text-center" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <p className="text-sm text-red-300/80">Видеограф недоступен в этот день</p>
          </div>
        </div>
      )}

      {/* Booking form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={() => setShowForm(false)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div
            className="relative w-full max-w-lg rounded-t-3xl p-6 animate-[slideUp_0.3s_ease-out]"
            style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-gray-600 rounded-full mx-auto mb-5" />

            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-[11px] font-bold text-amber-400/80">
                  {new Date(selectedDate + 'T00:00:00').toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })} · {selectedTime}
                </div>
                <h3 className="text-lg font-bold text-white mt-0.5">Подтверждение брони</h3>
              </div>
              <button onClick={() => setShowForm(false)} className="w-8 h-8 rounded-full bg-white/[0.06] flex items-center justify-center">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg>
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-semibold text-gray-400 mb-1 block">Ваше имя</label>
                <input
                  value={clientName}
                  onChange={e => setClientName(e.target.value)}
                  placeholder="Как вас зовут?"
                  className="w-full px-4 py-3 rounded-xl text-sm bg-white/[0.04] border border-white/10 text-white outline-none placeholder-gray-600 focus:border-amber-500/40 transition-colors"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-gray-400 mb-1 block">Телефон / WhatsApp</label>
                <input
                  value={clientPhone}
                  onChange={e => setClientPhone(e.target.value)}
                  placeholder="+7 700 123 4567"
                  type="tel"
                  className="w-full px-4 py-3 rounded-xl text-sm bg-white/[0.04] border border-white/10 text-white outline-none placeholder-gray-600 focus:border-amber-500/40 transition-colors"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-gray-400 mb-1 block">Детали съёмки</label>
                <textarea
                  value={details}
                  onChange={e => setDetails(e.target.value)}
                  placeholder="Что снимаем? Тема, пожелания..."
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl text-sm bg-white/[0.04] border border-white/10 text-white outline-none placeholder-gray-600 focus:border-amber-500/40 transition-colors resize-none"
                />
              </div>
            </div>

            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full mt-5 py-3.5 rounded-xl text-sm font-bold bg-amber-500 text-black transition-all hover:bg-amber-400 disabled:opacity-50"
            >
              {submitting ? 'Бронирование...' : 'Забронировать'}
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
