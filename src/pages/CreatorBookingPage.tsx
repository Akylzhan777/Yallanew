import { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { supabase } from '../lib/supabase';
import {
  WORK_START, WORK_END, TIME_STEP,
  localIsoDate, timeToMinutes, minutesToTime,
  getAllTimeOptions, isWeekday, addDays,
  buildBookingWeeks, RU_MONTHS_FULL, RU_MONTHS_SHORT, getOccupiedRanges, BUFFER_MINUTES,
} from '../lib/slotUtils';

const UAE_TZ = 'Asia/Dubai';
const KZ_TZ  = 'Asia/Almaty';

interface CreatorInfo {
  id: string;
  display_name: string;
  handle: string | null;
  username: string;
  avatar_url: string | null;
  category: string;
  creator_type: string;
  location: string;
  is_published: boolean;
  region: string | null;
  packages: CreatorPackage[];
  booking_buffer?: number;
  working_days?: number[];
}

interface CreatorPackage {
  id: string;
  name: string;
  price: number;
  clientPrice?: number;
  deliveryDays?: number;
  description?: string;
}

interface BookingRow {
  id: string;
  booking_date: string;
  booking_time: string | null;
  start_time: string | null;
  end_time: string | null;
  status: string;
}

interface BlockedDate {
  blocked_date: string;
}

const ALL_TIME_OPTIONS = getAllTimeOptions();
const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const MONTHS_FULL  = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS_EN = ['Mon','Tue','Wed','Thu','Fri'];
const DAYS_RU = ['Пн','Вт','Ср','Чт','Пт','Сб','Вс'];

// ─── KZ booking form (package + contact, Russian UI) ─────────────────────────
interface KzFormProps {
  selectedDate: string;
  selectedTime: string;
  packages: CreatorPackage[];
  onSubmit: (name: string, phone: string, details: string, packageId: string | null) => Promise<void>;
  onClose: () => void;
}

const KzBookingForm = memo(({ selectedDate, selectedTime, packages, onSubmit, onClose }: KzFormProps) => {
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [details, setDetails] = useState('');
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState('');

  const handleSubmit = async () => {
    if (!clientName.trim()) { setErr('Введите ваше имя'); return; }
    const digits = clientPhone.replace(/\D/g, '');
    if (digits.length < 10) { setErr('Введите корректный номер телефона'); return; }
    setErr('');
    setSubmitting(true);
    await onSubmit(clientName.trim(), digits, details.trim(), selectedPackageId);
    setSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={onClose}>
      {err && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[110] px-4 py-2.5 rounded-xl bg-red-500/90 text-white text-sm font-medium shadow-lg">
          {err}
        </div>
      )}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-lg rounded-t-3xl p-6"
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
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/[0.06] flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-[11px] font-semibold text-gray-400 mb-1 block">Ваше имя</label>
            <input value={clientName} onChange={e => setClientName(e.target.value)} placeholder="Как вас зовут?"
              className="w-full px-4 py-3 rounded-xl text-sm bg-white/[0.04] border border-white/10 text-white outline-none placeholder-gray-600 focus:border-amber-500/40 transition-colors" />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-gray-400 mb-1 block">Телефон / WhatsApp</label>
            <input value={clientPhone} onChange={e => setClientPhone(e.target.value)} placeholder="+7 700 123 4567" type="tel"
              className="w-full px-4 py-3 rounded-xl text-sm bg-white/[0.04] border border-white/10 text-white outline-none placeholder-gray-600 focus:border-amber-500/40 transition-colors" />
          </div>
          {packages.length > 0 && (
            <div>
              <label className="text-[11px] font-semibold text-gray-400 mb-1.5 block">Услуга</label>
              <div className="space-y-2">
                {packages.map(pkg => {
                  const price = pkg.clientPrice ?? Math.round(pkg.price * 1.2);
                  const active = selectedPackageId === pkg.id;
                  return (
                    <button key={pkg.id} type="button" onClick={() => setSelectedPackageId(active ? null : pkg.id)}
                      className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm transition-all border ${active ? 'bg-amber-500/15 border-amber-500/40 ring-1 ring-amber-500/30' : 'bg-white/[0.03] border-white/10 hover:border-white/20'}`}>
                      <div className="text-left">
                        <div className={`font-semibold text-xs ${active ? 'text-amber-300' : 'text-gray-200'}`}>{pkg.name}</div>
                        {pkg.description && <div className="text-[10px] text-gray-500 mt-0.5 line-clamp-1">{pkg.description}</div>}
                      </div>
                      <div className={`font-bold text-sm flex-shrink-0 ml-3 ${active ? 'text-amber-400' : 'text-gray-300'}`}>{price.toLocaleString('ru-RU')} ₸</div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          <div>
            <label className="text-[11px] font-semibold text-gray-400 mb-1 block">Детали съёмки</label>
            <textarea value={details} onChange={e => setDetails(e.target.value)} placeholder="Что снимаем? Тема, пожелания..."
              rows={3} maxLength={500}
              className="w-full px-4 py-3 rounded-xl text-sm bg-white/[0.04] border border-white/10 text-white outline-none placeholder-gray-600 focus:border-amber-500/40 transition-colors resize-none" />
            <div className="text-right text-[10px] text-gray-600 mt-1">{details.length} / 500</div>
          </div>
        </div>
        <button onClick={handleSubmit} disabled={submitting}
          className="w-full mt-5 py-3.5 rounded-xl text-sm font-bold bg-amber-500 text-black transition-all hover:bg-amber-400 disabled:opacity-50">
          {submitting ? 'Бронирование...' : 'Забронировать'}
        </button>
      </div>
    </div>
  );
});

// ─── UAE calendar helpers ─────────────────────────────────────────────────────
function buildUaeCalendarWeeks(): Array<Array<Date | null>> {
  const todayStr = localIsoDate(new Date(), UAE_TZ);
  const [ty, tm, td] = todayStr.split('-').map(Number);
  const today = new Date(Date.UTC(ty, tm - 1, td));
  const weekdays: Date[] = [];
  for (let i = 1; weekdays.length < 20; i++) {
    const d = addDays(today, i);
    if (isWeekday(d)) weekdays.push(d);
  }
  if (weekdays.length === 0) return [];
  const getMondayOf = (d: Date): Date => {
    const r = new Date(d);
    const dow = r.getUTCDay();
    r.setUTCDate(r.getUTCDate() + (dow === 0 ? -6 : 1 - dow));
    return r;
  };
  const weekStart = getMondayOf(weekdays[0]);
  const weekEnd   = getMondayOf(weekdays[weekdays.length - 1]);
  const weeks: Array<Array<Date | null>> = [];
  let cursor = new Date(weekStart);
  while (cursor <= weekEnd) {
    const week: Array<Date | null> = [];
    for (let i = 0; i < 5; i++) {
      const day = addDays(cursor, i);
      const iso = localIsoDate(day, UAE_TZ);
      week.push(weekdays.some(wd => localIsoDate(wd, UAE_TZ) === iso) ? day : null);
    }
    weeks.push(week);
    cursor = addDays(cursor, 7);
  }
  return weeks;
}

function getUaeOccupied(bookings: BookingRow[], dateStr: string): Array<{ start: number; end: number }> {
  return bookings
    .filter(b => b.booking_date === dateStr && b.status !== 'cancelled')
    .map(b => ({
      start: Math.max(WORK_START * 60, timeToMinutes(b.start_time ?? '00:00')),
      end:   Math.min(WORK_END * 60,   timeToMinutes(b.end_time   ?? '00:00')),
    }));
}

function isRangeFree(bookings: BookingRow[], dateStr: string, startMin: number, endMin: number): boolean {
  return !bookings.filter(b => b.booking_date === dateStr && b.status !== 'cancelled').some(b => {
    const bs = timeToMinutes(b.start_time ?? '00:00');
    const be = timeToMinutes(b.end_time   ?? '00:00');
    return startMin < be && endMin > bs;
  });
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function CreatorBookingPage({ handle }: { handle: string }) {
  const [creator, setCreator] = useState<CreatorInfo | null | 'loading'>('loading');
  const [bookings, setBookings]     = useState<BookingRow[]>([]);
  const [blockedDates, setBlockedDates] = useState<Set<string>>(new Set());
  const [loading, setLoading]       = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [toast, setToast]           = useState('');
  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3500); };

  // ── fetch creator (by username or handle) ──
  useEffect(() => {
    const slug = decodeURIComponent(handle).replace(/^@/, '').toLowerCase();
    (async () => {
      // Try username first (preferred), then handle fallback (legacy UAE links)
      let { data } = await supabase
        .from('creator_profiles')
        .select('id, display_name, handle, username, avatar_url, category, creator_type, location, is_published, region, packages, booking_buffer, working_days')
        .eq('username', slug)
        .maybeSingle();
      if (!data) {
        ({ data } = await supabase
          .from('creator_profiles')
          .select('id, display_name, handle, username, avatar_url, category, creator_type, location, is_published, region, packages, booking_buffer, working_days')
          .eq('handle', slug)
          .maybeSingle());
      }
      setCreator(data ? { ...data as CreatorInfo, packages: Array.isArray((data as CreatorInfo).packages) ? (data as CreatorInfo).packages : [] } : null);
    })();
  }, [handle]);

  const fetchBookings = useCallback(async () => {
    if (!creator || creator === 'loading') return;
    const tz = creator.region === 'KZ' ? KZ_TZ : UAE_TZ;
    const today = localIsoDate(new Date(), tz);
    const [{ data: bData, error: bErr }, { data: blData, error: blErr }] = await Promise.all([
      supabase.from('creator_bookings')
        .select('id, booking_date, booking_time, start_time, end_time, status')
        .eq('creator_id', creator.id)
        .in('status', ['pending', 'confirmed', 'in_progress'])
        .gte('booking_date', today),
      supabase.from('creator_blocked_dates')
        .select('blocked_date')
        .eq('creator_id', creator.id),
    ]);
    if (bErr || blErr) { setFetchError(true); setLoading(false); return; }
    setBookings(bData ?? []);
    setBlockedDates(new Set((blData ?? []).map((d: BlockedDate) => d.blocked_date)));
    setLoading(false);
  }, [creator]);

  useEffect(() => {
    if (!creator || creator === 'loading') return;
    setLoading(true);
    fetchBookings();
  }, [fetchBookings, creator]);

  const isKz = creator && creator !== 'loading' && creator.region === 'KZ';
  const tz = isKz ? KZ_TZ : UAE_TZ;

  // ═══════════════════════════════════════════════════════════════
  //  KZ FLOW STATE
  // ═══════════════════════════════════════════════════════════════
  const [kzSelectedDate, setKzSelectedDate] = useState('');
  const [kzSelectedTime, setKzSelectedTime] = useState('');
  const [kzShowForm, setKzShowForm]         = useState(false);
  const [kzSuccess, setKzSuccess]           = useState(false);

  const kzWeeks   = useMemo(() => buildBookingWeeks(KZ_TZ), []);
  const kzToday   = useMemo(() => localIsoDate(new Date(), KZ_TZ), []);
  const kzMonthHeading = useMemo(() => {
    const days = kzWeeks.flat().filter((d): d is Date => d !== null && localIsoDate(d, KZ_TZ) >= kzToday);
    if (!days.length) return '';
    const first = localIsoDate(days[0], KZ_TZ);
    const last  = localIsoDate(days[days.length - 1], KZ_TZ);
    const fm = parseInt(first.slice(5, 7)) - 1, fy = parseInt(first.slice(0, 4));
    const lm = parseInt(last.slice(5, 7)) - 1,  ly = parseInt(last.slice(0, 4));
    return fm === lm && fy === ly ? `${RU_MONTHS_FULL[fm]} ${fy}` : `${RU_MONTHS_SHORT[fm]} — ${RU_MONTHS_SHORT[lm]} ${ly}`;
  }, [kzWeeks, kzToday]);

  const kzOccupiedForDate = useMemo(
    () => kzSelectedDate ? getOccupiedRanges(bookings, kzSelectedDate, (creator !== 'loading' && creator?.booking_buffer) || BUFFER_MINUTES) : [],
    [bookings, kzSelectedDate, creator],
  );
  const kzCalMap = useMemo(() => {
    const bufferMin  = (creator !== 'loading' && creator?.booking_buffer) || BUFFER_MINUTES;
    const totalMin   = (WORK_END - WORK_START) * 60;
    const map = new Map<string, { fullyBooked: boolean; hasSomeBookings: boolean }>();
    for (const week of kzWeeks) {
      for (const day of week) {
        if (!day) continue;
        const ds = localIsoDate(day, KZ_TZ);
        const occ = getOccupiedRanges(bookings, ds, bufferMin);
        const occMin = occ.reduce((s, r) => s + (r.end - r.start), 0);
        map.set(ds, { fullyBooked: occMin >= totalMin - TIME_STEP, hasSomeBookings: occ.length > 0 });
      }
    }
    return map;
  }, [bookings, kzWeeks, creator]);

  const kzIsTimeDisabled = useCallback((t: string): boolean => {
    const tMin = timeToMinutes(t);
    const tMax = tMin + 60;
    if (tMax > WORK_END * 60) return true;
    if (kzOccupiedForDate.some(r => tMin < r.end && tMax > r.start)) return true;
    if (kzSelectedDate === kzToday) {
      const now = new Date();
      if (tMin < now.getHours() * 60 + now.getMinutes() + 60) return true;
    }
    return false;
  }, [kzOccupiedForDate, kzSelectedDate, kzToday]);

  const handleKzFormSubmit = async (name: string, phone: string, details: string, packageId: string | null) => {
    if (!creator || creator === 'loading') return;
    const { error } = await supabase.functions.invoke('kz-book-notify', {
      body: { creator_id: creator.id, client_name: name, client_phone: phone, booking_date: kzSelectedDate, booking_time: kzSelectedTime, details, ...(packageId ? { package_id: packageId } : {}) },
    });
    if (error) {
      let errorType = 'generic';
      try { errorType = (await (error as { context?: Response }).context?.json?.())?.error_type ?? 'generic'; } catch { /* ignore */ }
      if (errorType === 'slot_conflict') {
        showToast('К сожалению, этот слот только что забронировали. Выберите другое время.');
        setKzSelectedTime('');
        setKzShowForm(false);
        fetchBookings();
      } else {
        showToast('Ошибка при бронировании. Проверьте соединение с сетью.');
      }
      return;
    }
    setKzSuccess(true);
  };

  // ═══════════════════════════════════════════════════════════════
  //  UAE FLOW STATE
  // ═══════════════════════════════════════════════════════════════
  const [uaeSelectedDate, setUaeSelectedDate] = useState('');
  const [uaeModalOpen, setUaeModalOpen]       = useState(false);
  const [uaeSuccess, setUaeSuccess]           = useState(false);
  const [submitting, setSubmitting]           = useState(false);
  const [startTime, setStartTime]             = useState('');
  const [endTime, setEndTime]                 = useState('');
  const [clientName, setClientName]           = useState('');
  const [whatsappRaw, setWhatsappRaw]         = useState('');
  const [taskDesc, setTaskDesc]               = useState('');

  const uaeWeeks = useMemo(() => buildUaeCalendarWeeks(), []);
  const uaeToday = useMemo(() => localIsoDate(new Date(), UAE_TZ), []);
  const uaeHeading = useMemo(() => {
    const days = uaeWeeks.flat().filter((d): d is Date => d !== null);
    if (!days.length) return '';
    const f = days[0], l = days[days.length - 1];
    return f.getMonth() === l.getMonth()
      ? `${MONTHS_FULL[f.getMonth()]} ${f.getFullYear()}`
      : `${MONTHS_SHORT[f.getMonth()]} — ${MONTHS_SHORT[l.getMonth()]} ${l.getFullYear()}`;
  }, [uaeWeeks]);

  const uaeOccupied = useMemo(() => uaeSelectedDate ? getUaeOccupied(bookings, uaeSelectedDate) : [], [bookings, uaeSelectedDate]);
  const startMin = startTime ? timeToMinutes(startTime) : -1;
  const endMin   = endTime   ? timeToMinutes(endTime)   : -1;
  const isRangeConflict = startTime && endTime ? !isRangeFree(bookings, uaeSelectedDate, startMin, endMin) : false;
  const durationMin = startMin > 0 && endMin > 0 ? endMin - startMin : 0;
  const durationLabel = durationMin > 0 ? (durationMin >= 60 ? `${Math.floor(durationMin / 60)}h${durationMin % 60 > 0 ? ` ${durationMin % 60}min` : ''}` : `${durationMin}min`) : '';

  const getValidEndOptions = () => {
    if (!startTime) return [];
    const occ = getUaeOccupied(bookings, uaeSelectedDate);
    const opts: string[] = [];
    for (let m = startMin + TIME_STEP; m <= WORK_END * 60; m += TIME_STEP) {
      if (occ.some(r => r.start < m && r.end > startMin)) break;
      opts.push(minutesToTime(m));
    }
    return opts;
  };

  const isStartDisabled = (t: string) => {
    const tMin = timeToMinutes(t);
    const occ = getUaeOccupied(bookings, uaeSelectedDate);
    return !(!occ.some(r => r.start < tMin && r.end > tMin) && occ.every(r => r.start >= tMin + TIME_STEP || r.end <= tMin));
  };

  const openUaeModal = (preset?: string) => {
    setStartTime(preset ?? '');
    setEndTime(''); setClientName(''); setWhatsappRaw(''); setTaskDesc(''); setUaeSuccess(false); setUaeModalOpen(true);
  };

  const confirmUaeBooking = async () => {
    if (!creator || creator === 'loading') return;
    if (!startTime) { showToast('Please select a start time'); return; }
    if (!endTime)   { showToast('Please select an end time'); return; }
    if (isRangeConflict) { showToast('Selected time overlaps with an existing booking'); return; }
    if (!clientName.trim()) { showToast('Please enter your name'); return; }
    const digits = whatsappRaw.replace(/\D/g, '');
    if (digits.length < 7) { showToast('Please enter a valid WhatsApp number'); return; }
    setSubmitting(true);
    const { error } = await supabase.from('creator_bookings').insert({
      creator_id: creator.id, booking_date: uaeSelectedDate,
      start_time: startTime, end_time: endTime, booking_time: startTime,
      client_name: clientName.trim(), client_phone: digits, details: taskDesc.trim(), status: 'pending',
    });
    setSubmitting(false);
    if (error) { showToast('Failed to book. Please try again.'); return; }
    setUaeSuccess(true);
    fetchBookings();
  };

  // ═══════════════════════════════════════════════════════════════
  //  LOADING / ERROR STATES
  // ═══════════════════════════════════════════════════════════════
  if (creator === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0B101B' }}>
        <div className="w-8 h-8 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!creator || !creator.is_published) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6" style={{ background: '#0B101B' }}>
        <div className="text-center">
          <h2 className="text-xl font-bold text-white mb-2">{isKz ? 'Профиль не найден' : 'Creator not found'}</h2>
          <p className="text-sm text-gray-400 mb-6">{isKz ? 'Проверьте ссылку или обратитесь к видеографу' : 'This booking page does not exist or the creator is no longer available.'}</p>
          <a href="/" className="inline-block px-5 py-2.5 rounded-xl text-sm font-bold bg-amber-500/10 border border-amber-500/20 text-amber-400">{isKz ? 'На главную' : 'Back to Home'}</a>
        </div>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6" style={{ background: '#0B101B' }}>
        <div className="text-center max-w-sm">
          <h1 className="text-lg font-bold text-white mb-2">{isKz ? 'Ошибка соединения с сервером' : 'Connection Error'}</h1>
          <p className="text-sm text-gray-400 mb-6">{isKz ? 'Не удалось загрузить расписание. Пожалуйста, обновите страницу.' : 'Could not load the schedule. Please refresh.'}</p>
          <button onClick={() => window.location.reload()} className="px-5 py-2.5 rounded-xl text-sm font-bold bg-amber-500/10 border border-amber-500/20 text-amber-400">
            {isKz ? 'Обновить страницу' : 'Refresh'}
          </button>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════
  //  KZ RENDER
  // ═══════════════════════════════════════════════════════════════
  if (isKz) {
    if (kzSuccess) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#0B101B] px-6">
          <div className="text-center max-w-sm">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-4">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#00C48C" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            </div>
            <h1 className="text-xl font-bold text-white mb-2">Бронирование отправлено!</h1>
            <p className="text-sm text-gray-400 mb-1">
              Дата: {new Date(kzSelectedDate + 'T00:00:00').toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })} в {kzSelectedTime}
            </p>
            <p className="text-xs text-gray-500 mt-3">Видеограф получит уведомление и подтвердит бронь.</p>
            <button onClick={() => window.location.reload()} className="mt-6 px-5 py-2.5 rounded-xl text-sm font-bold bg-amber-500/10 border border-amber-500/20 text-amber-400">Забронировать ещё</button>
          </div>
        </div>
      );
    }

    const dateBlocked = kzSelectedDate ? blockedDates.has(kzSelectedDate) : false;

    return (
      <div className="min-h-screen bg-[#0B101B] text-white">
        {toast && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] px-4 py-2.5 rounded-xl bg-red-500/90 text-white text-sm font-medium shadow-lg">
            {toast}
          </div>
        )}

        <div className="px-5 pt-10 pb-6">
          <div className="flex items-center gap-4 mb-4">
            {creator.avatar_url
              ? <img src={creator.avatar_url} alt={creator.display_name} className="w-14 h-14 rounded-full object-cover border-2 border-amber-500/20" />
              : <div className="w-14 h-14 rounded-full bg-amber-500/10 border-2 border-amber-500/20 flex items-center justify-center"><span className="text-lg font-bold text-amber-400">{creator.display_name[0]}</span></div>
            }
            <div>
              <h1 className="text-lg font-bold text-white">{creator.display_name}</h1>
              <p className="text-xs text-gray-400 capitalize">{creator.creator_type === 'videographer' ? 'Видеограф' : creator.creator_type}</p>
              {creator.location && <p className="text-xs text-gray-500 mt-0.5">{creator.location}</p>}
            </div>
          </div>
          <p className="text-sm text-gray-300">Выберите удобную дату и время для съёмки</p>
        </div>

        <div className="px-5">
          <div className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="text-sm font-bold text-white mb-3">{kzMonthHeading}</div>
            <div className="grid grid-cols-7 gap-1 mb-2">
              {DAYS_RU.map(d => <div key={d} className="text-center text-[10px] font-semibold text-gray-500">{d}</div>)}
            </div>
            {kzWeeks.map((week, wi) => (
              <div key={wi} className="grid grid-cols-7 gap-1 mb-1">
                {week.map((day, di) => {
                  if (!day) return <div key={`e-${wi}-${di}`} className="aspect-[1.2]" />;
                  const ds = localIsoDate(day, KZ_TZ);
                  const isPast = ds < kzToday;
                  const isToday = ds === kzToday;
                  const isSel = ds === kzSelectedDate;
                  const isBlocked = blockedDates.has(ds);
                  const workDays = creator.working_days ?? [0,1,2,3,4,5,6];
                  const isNonWork = !workDays.includes(day.getUTCDay());
                  const cell = kzCalMap.get(ds);
                  const fullyBooked = isPast || isNonWork || (cell?.fullyBooked ?? false) || isBlocked;
                  const partial = !isPast && !isNonWork && (cell?.hasSomeBookings ?? false);
                  return (
                    <button key={ds} onClick={() => !fullyBooked && (setKzSelectedDate(ds), setKzSelectedTime(''), setKzShowForm(false))} disabled={fullyBooked}
                      className={`relative aspect-[1.2] rounded-xl flex flex-col items-center justify-center transition-all text-center ${isSel ? 'bg-amber-500/20 ring-1 ring-amber-500/40' : fullyBooked ? 'opacity-30 cursor-default' : 'hover:bg-white/[0.05]'} ${isToday && !isSel ? 'ring-1 ring-emerald-500/30' : ''}`}>
                      <span className={`text-xs font-semibold ${isSel ? 'text-amber-300' : isToday ? 'text-emerald-400' : isPast || isNonWork ? 'text-gray-600' : 'text-gray-200'}`}>{parseInt(ds.slice(8), 10)}</span>
                      <span className={`text-[9px] mt-0.5 ${isPast || isNonWork ? 'text-gray-700' : 'text-gray-500'}`}>{RU_MONTHS_SHORT[parseInt(ds.slice(5,7))-1]}</span>
                      {!fullyBooked && !partial && <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 text-[7px] font-bold text-emerald-400">Своб.</span>}
                      {!fullyBooked && partial && <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 text-[7px] font-bold text-amber-400">Есть</span>}
                      {!isNonWork && !isPast && (cell?.fullyBooked || isBlocked) && <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 text-[7px] font-bold text-red-400/60">—</span>}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {kzSelectedDate && !dateBlocked && (
          <div className="px-5 mt-4">
            <div className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-bold text-white">{new Date(kzSelectedDate + 'T00:00:00').toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}</span>
                <span className="text-[11px] text-gray-500">{kzOccupiedForDate.length === 0 ? 'Полностью свободен' : `${kzOccupiedForDate.length} бронирование`}</span>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {ALL_TIME_OPTIONS.slice(0, -1).map(opt => {
                  const dis = kzIsTimeDisabled(opt);
                  const act = kzSelectedTime === opt;
                  return (
                    <button key={opt} onClick={() => !dis && (setKzSelectedTime(opt), setKzShowForm(true))} disabled={dis}
                      className={`py-2 rounded-lg text-xs font-semibold transition-all ${act ? 'bg-amber-500 text-black' : dis ? 'bg-white/[0.02] text-gray-600 opacity-40' : 'bg-white/[0.05] text-gray-200 border border-white/10 hover:border-amber-500/30'}`}>
                      {opt}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {kzSelectedDate && dateBlocked && (
          <div className="px-5 mt-4">
            <div className="rounded-2xl p-5 text-center" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <p className="text-sm text-red-300/80">Видеограф недоступен в этот день</p>
            </div>
          </div>
        )}

        {kzShowForm && (
          <KzBookingForm
            selectedDate={kzSelectedDate}
            selectedTime={kzSelectedTime}
            packages={creator.packages}
            onSubmit={handleKzFormSubmit}
            onClose={() => setKzShowForm(false)}
          />
        )}

        <style>{`
          @keyframes slideUp { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        `}</style>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════
  //  UAE RENDER
  // ═══════════════════════════════════════════════════════════════
  const validEndOptions = getValidEndOptions();

  const renderTimeline = () => {
    if (!uaeSelectedDate) return null;
    const totalMin = (WORK_END - WORK_START) * 60;
    return (
      <div className="cal-timeline">
        <div className="cal-timeline-track">
          {uaeOccupied.map((r, i) => {
            const left  = ((r.start - WORK_START * 60) / totalMin) * 100;
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

  return (
    <div className="cal-page">
      {toast && <div className="admin-toast">{toast}</div>}

      {uaeModalOpen && (
        <div className="cal-modal-overlay" onClick={() => !uaeSuccess && setUaeModalOpen(false)}>
          <div className="cal-modal-sheet" onClick={e => e.stopPropagation()}>
            <div className="cal-modal-drag-handle" />

            {uaeSuccess ? (
              <div className="cal-booking-success">
                <div className="cal-success-icon cal-success-icon--animated">
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                </div>
                <div className="cal-success-text-block">
                  <h3 className="cal-success-title">Booking Submitted!</h3>
                  <p className="cal-success-subtitle-en">{creator.display_name} will confirm your booking shortly.</p>
                </div>
                <div className="cal-success-divider" />
                <button className="cal-success-close-link" onClick={() => setUaeModalOpen(false)}>Close</button>
              </div>
            ) : (
              <>
                <div className="cal-modal-sheet-head">
                  <div>
                    <div className="cal-modal-sheet-tag">
                      {uaeSelectedDate ? (() => { const d = new Date(uaeSelectedDate + 'T00:00:00'); return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`; })() : ''}
                    </div>
                    <h3 className="cal-modal-sheet-title">Confirm Booking</h3>
                  </div>
                  <button className="cal-modal-sheet-close" onClick={() => setUaeModalOpen(false)}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg>
                  </button>
                </div>

                <div className="cal-modal-op-row">
                  {creator.avatar_url
                    ? <img src={creator.avatar_url} alt={creator.display_name} className="cal-modal-op-photo" />
                    : <div className="cal-modal-op-photo" style={{ background: 'rgba(0,196,140,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', fontWeight: 700, color: '#00C48C' }}>{creator.display_name[0]?.toUpperCase()}</div>
                  }
                  <div>
                    <div className="cal-modal-op-name">{creator.display_name}</div>
                    <div className="cal-modal-op-role">{creator.creator_type} · {creator.category}</div>
                  </div>
                  {startTime && endTime && !isRangeConflict && (
                    <div className="cal-modal-time-badge">{startTime} – {endTime}{durationLabel && <span> · {durationLabel}</span>}</div>
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
                        const dis = isStartDisabled(opt);
                        const act = startTime === opt;
                        return (
                          <button key={opt} className={`cal-time-chip${act ? ' active' : ''}${dis ? ' disabled' : ''}`}
                            onClick={() => { if (!dis) { setStartTime(opt); setEndTime(''); } }} disabled={dis}>{opt}</button>
                        );
                      })}
                    </div>
                  </div>

                  {startTime && (
                    <div className="cal-time-grid-wrap">
                      <div className="cal-time-grid-label">End</div>
                      <div className="cal-time-chip-grid">
                        {validEndOptions.map(opt => (
                          <button key={opt} className={`cal-time-chip${endTime === opt ? ' active' : ''}`} onClick={() => setEndTime(opt)}>{opt}</button>
                        ))}
                      </div>
                    </div>
                  )}

                  {isRangeConflict && <div className="cal-conflict-warning">This time overlaps with an existing booking</div>}

                  <div className="cal-modal-fields-grid">
                    <div className="cal-modal-field-new">
                      <div className="cal-field-icon"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></div>
                      <input value={clientName} onChange={e => setClientName(e.target.value)} placeholder="Your name" className="cal-field-input" />
                    </div>
                    <div className="cal-phone-wrap">
                      <div className="cal-modal-field-new">
                        <div className="cal-field-icon"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.18 2 2 0 0 1 3.6 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.6a16 16 0 0 0 6 6l.95-.95a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21.72 16l.2.92z"/></svg></div>
                        <input value={whatsappRaw} onChange={e => setWhatsappRaw(e.target.value)} placeholder="+971 50 123 4567" type="tel" className="cal-field-input" />
                      </div>
                      <div className="cal-phone-helper"><span>Please enter your active WhatsApp number with country code.</span></div>
                    </div>
                    <div className="cal-modal-field-new cal-modal-field-textarea">
                      <div className="cal-field-icon cal-field-icon-top"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/></svg></div>
                      <textarea value={taskDesc} onChange={e => setTaskDesc(e.target.value)} placeholder="What are we shooting? (Topic, wishes, location...)" className="cal-field-input cal-field-textarea" rows={3} />
                    </div>
                  </div>
                </div>

                <div className="cal-modal-sheet-footer">
                  <button className="cal-modal-sheet-cancel" onClick={() => setUaeModalOpen(false)}>Cancel</button>
                  <button className="cal-modal-sheet-confirm" onClick={confirmUaeBooking} disabled={submitting || !startTime || !endTime || !!isRangeConflict}>
                    {submitting ? 'Booking...' : 'Confirm'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Header */}
      <div className="cal-header">
        <div className="cal-header-row">
          <a href={`/${creator.username || creator.handle || ''}`} className="cal-back-icon-btn" aria-label="Back">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
          </a>
          <div className="cal-operator-pill">
            {creator.avatar_url
              ? <img src={creator.avatar_url} alt={creator.display_name} className="cal-op-avatar-sm" />
              : <div className="cal-op-avatar-sm" style={{ background: 'rgba(0,196,140,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 700, color: '#00C48C', borderRadius: '50%' }}>{creator.display_name[0]?.toUpperCase()}</div>
            }
            <div className="cal-operator-pill-info">
              <span className="cal-operator-pill-name">{creator.display_name}</span>
              <span className="cal-operator-pill-role">{creator.creator_type} · {creator.category}</span>
            </div>
          </div>
        </div>
        <div className="cal-header-title-row"><h1 className="cal-title">Choose a Date</h1></div>
      </div>

      {loading ? (
        <div className="loading-spinner">Loading...</div>
      ) : (
        <div className="cal-layout">
          <div className="cal-grid-card">
            <div className="cal-grid-heading"><span className="cal-month-label">{uaeHeading}</span></div>
            <div className="cal-weekdays-row">{DAYS_EN.map(d => <div key={d} className="cal-weekday-label">{d}</div>)}</div>
            {uaeWeeks.map((week, wi) => (
              <div key={wi} className="cal-week-row">
                {week.map((day, di) => {
                  if (!day) return <div key={`e-${wi}-${di}`} className="cal-day-empty" />;
                  const ds = localIsoDate(day, UAE_TZ);
                  const isSel = ds === uaeSelectedDate;
                  const isToday = ds === uaeToday;
                  const occ = getUaeOccupied(bookings, ds);
                  const totalWorkMin = (WORK_END - WORK_START) * 60;
                  const occMin = occ.reduce((s, r) => s + (r.end - r.start), 0);
                  const freeMin = totalWorkMin - occMin;
                  const fullyBooked = freeMin < TIME_STEP;
                  return (
                    <button key={ds} onClick={() => setUaeSelectedDate(ds)}
                      className={`cal-day-btn${isSel ? ' selected' : ''}${isToday ? ' today' : ''}`}>
                      <span className="cal-day-num">{day.getDate()}</span>
                      <span className="cal-day-mon">{MONTHS_SHORT[day.getMonth()]}</span>
                      {fullyBooked && occ.length > 0 && <span className="cal-day-badge occupied">—</span>}
                      {!fullyBooked && occ.length > 0 && <span className="cal-day-badge partial">Few left</span>}
                      {freeMin >= 60 && occ.length === 0 && <span className="cal-day-badge free">Free</span>}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>

          <div className="cal-slots-card">
            {!uaeSelectedDate ? (
              <div className="cal-slots-empty">
                <div className="cal-slots-empty-icon">📅</div>
                <p>Pick a date to see available time slots</p>
              </div>
            ) : (
              <>
                <div className="cal-slots-header">
                  <span className="cal-slots-date">{(() => { const d = new Date(uaeSelectedDate + 'T00:00:00'); return `${d.getDate()} ${MONTHS_FULL[d.getMonth()]}`; })()}</span>
                  <span className="cal-slots-count">{uaeOccupied.length === 0 ? 'Fully available' : `${uaeOccupied.length} booking${uaeOccupied.length === 1 ? '' : 's'}`}</span>
                </div>
                <div className="cal-slots-grid">
                  {ALL_TIME_OPTIONS.slice(0, -1).map(opt => {
                    const dis = isStartDisabled(opt);
                    return (
                      <button key={opt} className={`cal-slot-bubble${dis ? ' taken' : ' free'}`}
                        onClick={() => { if (!dis) openUaeModal(opt); }} disabled={dis}>{opt}</button>
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
