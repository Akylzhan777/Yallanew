import { useEffect, useRef, useState } from 'react';
import { supabase, BookingEvent, OperatorRow } from '../lib/supabase';

async function resendWaConfirmation(booking: BookingEvent): Promise<{ ok: boolean; error?: string }> {
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
    const wa = booking.whatsapp || booking.notes?.match(/WA:\s*([^·]+)/)?.[1]?.trim() || '';
    const resp = await fetch(`${supabaseUrl}/functions/v1/whatsapp-confirm`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseAnonKey}`,
      },
      body: JSON.stringify({
        name: booking.client_name,
        phone: wa,
        date: booking.date,
        startTime: booking.start_time,
        endTime: booking.end_time,
      }),
    });
    const data = await resp.json();
    if (data.ok) return { ok: true };
    return { ok: false, error: data.reason || data.error || 'Unknown error' };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

const RU_MONTHS_SHORT = ['янв','фев','мар','апр','май','июн','июл','авг','сен','окт','ноя','дек'];
const RU_MONTHS_FULL = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
const RU_DAYS_SHORT = ['Вс','Пн','Вт','Ср','Чт','Пт','Сб'];

function localIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function formatDateRu(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return `${d.getDate()} ${RU_MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}, ${RU_DAYS_SHORT[d.getDay()]}`;
}

function parseWhatsapp(booking: BookingEvent): string {
  if (booking.whatsapp) return booking.whatsapp;
  const match = booking.notes?.match(/WA:\s*([^·]+)/);
  return match ? match[1].trim() : '';
}

function parseLocation(booking: BookingEvent): string {
  if (booking.location) return booking.location;
  const parts = booking.notes?.split('·');
  return parts && parts.length > 1 ? parts[1].trim() : '';
}

function parseTaskDescription(booking: BookingEvent): string {
  if (booking.task_description) return booking.task_description;
  const parts = booking.notes?.split('·');
  return parts && parts.length > 2 ? parts.slice(2).join('·').trim() : '';
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  pending:   { label: 'Ожидает',     color: '#F59E0B', bg: '#F59E0B15', border: '#F59E0B44' },
  confirmed: { label: 'Подтверждено', color: '#00C48C', bg: '#00C48C15', border: '#00C48C44' },
  completed: { label: 'Завершено',    color: '#8F90A6', bg: '#8F90A615', border: '#8F90A644' },
};

const STATUS_CYCLE: Record<string, string> = {
  pending: 'confirmed',
  confirmed: 'completed',
  completed: 'pending',
};

interface EditForm {
  client_name: string;
  whatsapp: string;
  location: string;
  task_description: string;
  scripts_notes: string;
  start_time: string;
  end_time: string;
  operator_id: string;
  pickup_location: string;
  status: string;
}

type TimeFilter = 'all' | 'morning' | 'afternoon' | 'evening';
type StatFilter = 'today' | 'upcoming' | 'confirmed';

const TIME_FILTERS: { id: TimeFilter; label: string; range: string }[] = [
  { id: 'all',       label: 'Все',      range: '' },
  { id: 'morning',   label: 'Утро',     range: '09:00–12:00' },
  { id: 'afternoon', label: 'День',     range: '12:00–17:00' },
  { id: 'evening',   label: 'Вечер',    range: '17:00–21:00' },
];

function matchesTimeFilter(b: BookingEvent, filter: TimeFilter): boolean {
  if (filter === 'all') return true;
  const h = parseInt((b.start_time ?? '00:00').split(':')[0], 10);
  if (filter === 'morning')   return h >= 9  && h < 12;
  if (filter === 'afternoon') return h >= 12 && h < 17;
  if (filter === 'evening')   return h >= 17 && h < 21;
  return true;
}

type BookingWithClientAvatar = BookingEvent & { client_avatar_url?: string };

export default function ShootingsPanel() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [currentDate, setCurrentDate] = useState<Date>(new Date(today));
  const [bookings, setBookings] = useState<BookingWithClientAvatar[]>([]);
  const [operators, setOperators] = useState<OperatorRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [waSending, setWaSending] = useState<Record<string, boolean>>({});
  const [calMonthOffset, setCalMonthOffset] = useState(0);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');
  const [statFilter, setStatFilter] = useState<StatFilter>('today');
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3500);
  };

  const fetchAll = async () => {
    const [{ data: bData }, { data: oData }] = await Promise.all([
      supabase.from('booking_events').select('*').order('date').order('start_time'),
      supabase.from('operators').select('*').order('sort_order'),
    ]);
    const rawBookings: BookingEvent[] = bData ?? [];
    const userIds = [...new Set(rawBookings.map(b => b.user_id).filter(Boolean))] as string[];
    let avatarMap: Record<string, string> = {};
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, avatar_url')
        .in('id', userIds);
      if (profiles) {
        avatarMap = Object.fromEntries(profiles.map((p: { id: string; avatar_url: string }) => [p.id, p.avatar_url]));
      }
    }
    const enriched: BookingWithClientAvatar[] = rawBookings.map(b => ({
      ...b,
      client_avatar_url: b.user_id ? avatarMap[b.user_id] : undefined,
    }));
    setBookings(enriched);
    setOperators(oData ?? []);
    setLoading(false);
  };

  useEffect(() => {
    fetchAll();

    channelRef.current = supabase
      .channel('shootings-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'booking_events' }, () => {
        fetchAll();
      })
      .subscribe();

    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, []);

  const getOperator = (id: string) => operators.find(o => o.id === id);

  const todayStr = localIsoDate(today);
  const currentDateStr = localIsoDate(currentDate);

  const filteredBookings = (() => {
    if (statFilter === 'today') {
      return bookings
        .filter(b => b.date === currentDateStr)
        .filter(b => matchesTimeFilter(b, timeFilter));
    }
    if (statFilter === 'upcoming') {
      return bookings
        .filter(b => b.date >= todayStr)
        .filter(b => matchesTimeFilter(b, timeFilter))
        .sort((a, b) => a.date.localeCompare(b.date) || (a.start_time ?? '').localeCompare(b.start_time ?? ''));
    }
    if (statFilter === 'confirmed') {
      return bookings
        .filter(b => (b.status || 'pending') === 'confirmed' && b.date >= todayStr)
        .filter(b => matchesTimeFilter(b, timeFilter))
        .sort((a, b) => a.date.localeCompare(b.date) || (a.start_time ?? '').localeCompare(b.start_time ?? ''));
    }
    return [];
  })();

  const navigateDay = (delta: number) => {
    setCurrentDate(d => addDays(d, delta));
  };

  const goToNearestBooking = () => {
    const next = bookings
      .filter(b => b.date >= todayStr)
      .sort((a, b) => a.date.localeCompare(b.date))[0];
    if (next) {
      setCurrentDate(new Date(next.date + 'T00:00:00'));
      setStatFilter('today');
    }
  };

  const openEdit = (b: BookingEvent) => {
    setEditId(b.id);
    setEditForm({
      client_name: b.client_name ?? '',
      whatsapp: parseWhatsapp(b),
      location: parseLocation(b),
      task_description: parseTaskDescription(b),
      scripts_notes: b.scripts_notes ?? '',
      start_time: (b.start_time ?? '').slice(0, 5),
      end_time: (b.end_time ?? '').slice(0, 5),
      operator_id: b.operator_id ?? '',
      pickup_location: b.pickup_location ?? '',
      status: b.status ?? 'pending',
    });
  };

  const cancelEdit = () => {
    setEditId(null);
    setEditForm(null);
  };

  const saveEdit = async () => {
    if (!editId || !editForm) return;
    setSaving(true);
    const { error } = await supabase.from('booking_events').update({
      client_name: editForm.client_name,
      whatsapp: editForm.whatsapp,
      location: editForm.location,
      task_description: editForm.task_description,
      scripts_notes: editForm.scripts_notes,
      start_time: editForm.start_time,
      end_time: editForm.end_time,
      operator_id: editForm.operator_id,
      pickup_location: editForm.pickup_location,
      status: editForm.status,
      notes: `WA: ${editForm.whatsapp} · ${editForm.location} · ${editForm.task_description}`,
    }).eq('id', editId);
    if (!error) {
      showToast('Запись обновлена');
      cancelEdit();
      await fetchAll();
    } else {
      showToast('Ошибка: ' + error.message);
    }
    setSaving(false);
  };

  const deleteBooking = async (id: string) => {
    if (!confirm('Удалить эту запись?')) return;
    await supabase.from('booking_events').delete().eq('id', id);
    showToast('Запись удалена');
    await fetchAll();
  };

  const cycleStatus = async (b: BookingEvent) => {
    const current = b.status || 'pending';
    const next = STATUS_CYCLE[current] ?? 'pending';
    setBookings(prev => prev.map(bk => bk.id === b.id ? { ...bk, status: next } : bk));
    try {
      const { error } = await supabase.from('booking_events').update({ status: next }).eq('id', b.id);
      if (error) throw error;
      showToast('Статус обновлен');
    } catch (e) {
      setBookings(prev => prev.map(bk => bk.id === b.id ? { ...bk, status: current } : bk));
      showToast('Ошибка обновления статуса');
    }
  };

  const handleResendWa = async (b: BookingEvent) => {
    setWaSending(s => ({ ...s, [b.id]: true }));
    const result = await resendWaConfirmation(b);
    setWaSending(s => ({ ...s, [b.id]: false }));
    if (result.ok) {
      showToast(`Confirmation sent to ${b.client_name}`);
    } else {
      showToast(`Error: ${result.error}`);
    }
  };

  const totalToday = bookings.filter(b => b.date === todayStr).length;
  const totalUpcoming = bookings.filter(b => b.date >= todayStr).length;
  const totalConfirmed = bookings.filter(b => (b.status || 'pending') === 'confirmed' && b.date >= todayStr).length;

  const nearestBooking = bookings
    .filter(b => b.date >= todayStr)
    .sort((a, b) => a.date.localeCompare(b.date))[0];

  const calendarDays = (): Array<{ date: Date | null; iso: string | null }> => {
    const now = new Date();
    const base = new Date(now.getFullYear(), now.getMonth() + calMonthOffset, 1);
    const year = base.getFullYear();
    const month = base.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDow = firstDay.getDay();
    const offset = startDow === 0 ? 6 : startDow - 1;
    const days: Array<{ date: Date | null; iso: string | null }> = [];
    for (let i = 0; i < offset; i++) days.push({ date: null, iso: null });
    for (let d = 1; d <= lastDay.getDate(); d++) {
      const dt = new Date(year, month, d);
      days.push({ date: dt, iso: localIsoDate(dt) });
    }
    const remainder = days.length % 7;
    if (remainder > 0) for (let i = 0; i < 7 - remainder; i++) days.push({ date: null, iso: null });
    return days;
  };

  const calDays = calendarDays();
  const calBase = (() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() + calMonthOffset, 1);
  })();

  const statCardStyle = (active: boolean, accent?: string): React.CSSProperties => ({
    background: active ? (accent ? `${accent}18` : '#2563EB18') : '#141620',
    border: `1px solid ${active ? (accent ?? '#2563EB') + '55' : '#2C2F3A'}`,
    borderRadius: 14,
    padding: '16px 20px',
    cursor: 'pointer',
    transition: 'all 0.18s',
    transform: active ? 'translateY(-1px)' : 'none',
    boxShadow: active ? `0 4px 20px ${(accent ?? '#2563EB')}22` : 'none',
    outline: 'none',
    textAlign: 'left' as const,
    width: '100%',
  });

  const listLabel = statFilter === 'today'
    ? `Съёмки · ${formatDateRu(currentDateStr)}`
    : statFilter === 'upcoming'
    ? 'Все предстоящие съёмки'
    : 'Подтверждённые съёмки';

  return (
    <div>
      {toast && <div className="admin-toast">{toast}</div>}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
        <button
          style={statCardStyle(statFilter === 'today')}
          onClick={() => { setStatFilter('today'); setCurrentDate(new Date(today)); }}
          onMouseEnter={e => { if (statFilter !== 'today') (e.currentTarget as HTMLElement).style.borderColor = '#3E414B'; }}
          onMouseLeave={e => { if (statFilter !== 'today') (e.currentTarget as HTMLElement).style.borderColor = '#2C2F3A'; }}
        >
          <div className="admin-stat-num">{totalToday}</div>
          <div className="admin-stat-lbl">Сегодня</div>
        </button>

        <button
          style={statCardStyle(statFilter === 'upcoming', '#3B82F6')}
          onClick={() => { setStatFilter('upcoming'); setViewMode('list'); }}
          onMouseEnter={e => { if (statFilter !== 'upcoming') (e.currentTarget as HTMLElement).style.borderColor = '#3B82F655'; }}
          onMouseLeave={e => { if (statFilter !== 'upcoming') (e.currentTarget as HTMLElement).style.borderColor = '#2C2F3A'; }}
        >
          <div className="admin-stat-num" style={{ color: statFilter === 'upcoming' ? '#7EB3FF' : '#e0e0e0' }}>{totalUpcoming}</div>
          <div className="admin-stat-lbl">Предстоящих</div>
          {statFilter !== 'upcoming' && <div style={{ fontSize: '0.68rem', color: '#3B82F6', marginTop: 3 }}>нажми, чтобы показать</div>}
        </button>

        <button
          style={statCardStyle(statFilter === 'confirmed', '#00C48C')}
          onClick={() => { setStatFilter('confirmed'); setViewMode('list'); }}
          onMouseEnter={e => { if (statFilter !== 'confirmed') (e.currentTarget as HTMLElement).style.borderColor = '#00C48C55'; }}
          onMouseLeave={e => { if (statFilter !== 'confirmed') (e.currentTarget as HTMLElement).style.borderColor = '#2C2F3A'; }}
        >
          <div className="admin-stat-num" style={{ color: statFilter === 'confirmed' ? '#00C48C' : '#e0e0e0' }}>{totalConfirmed}</div>
          <div className="admin-stat-lbl">Подтверждено</div>
          {statFilter !== 'confirmed' && <div style={{ fontSize: '0.68rem', color: '#00C48C', marginTop: 3 }}>нажми, чтобы показать</div>}
        </button>
      </div>

      <div className="flex flex-wrap gap-2 mb-5 items-center">
        <div style={{ display: 'flex', background: '#1A1D25', border: '1px solid #2C2F3A', borderRadius: 10, overflow: 'hidden' }}>
          {(['list', 'calendar'] as const).map(mode => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              style={{
                padding: '8px 20px',
                fontWeight: 700,
                fontSize: '0.85rem',
                cursor: 'pointer',
                border: 'none',
                background: viewMode === mode ? '#2563EB' : 'transparent',
                color: viewMode === mode ? '#fff' : '#8F90A6',
                transition: 'all 0.15s',
              }}
            >
              {mode === 'list' ? 'Список' : 'Календарь'}
            </button>
          ))}
        </div>

        {viewMode === 'list' && statFilter === 'today' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#1A1D25', border: '1px solid #2C2F3A', borderRadius: 10, padding: '6px 12px' }}>
            <button
              onClick={() => navigateDay(-1)}
              style={{ background: 'transparent', border: 'none', color: '#8F90A6', cursor: 'pointer', fontSize: '1.1rem', padding: '0 4px', lineHeight: 1 }}
            >
              ‹
            </button>
            <span style={{ fontWeight: 700, color: '#e0e0e0', fontSize: '0.9rem', minWidth: 180, textAlign: 'center' }}>
              {formatDateRu(currentDateStr)}
              {currentDateStr === todayStr && (
                <span style={{ marginLeft: 8, fontSize: '0.72rem', background: '#2563EB22', color: '#7EB3FF', borderRadius: 5, padding: '1px 7px' }}>сегодня</span>
              )}
            </span>
            <button
              onClick={() => navigateDay(1)}
              style={{ background: 'transparent', border: 'none', color: '#8F90A6', cursor: 'pointer', fontSize: '1.1rem', padding: '0 4px', lineHeight: 1 }}
            >
              ›
            </button>
            <button
              onClick={() => setCurrentDate(new Date(today))}
              disabled={currentDateStr === todayStr}
              style={{
                marginLeft: 6,
                background: 'transparent',
                border: '1px solid #3E414B',
                borderRadius: 7,
                color: '#8F90A6',
                fontSize: '0.75rem',
                padding: '3px 10px',
                cursor: currentDateStr === todayStr ? 'default' : 'pointer',
                opacity: currentDateStr === todayStr ? 0.4 : 1,
              }}
            >
              Сегодня
            </button>
          </div>
        )}

        {statFilter !== 'today' && viewMode === 'list' && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: '#1A1D25',
            border: '1px solid #2C2F3A',
            borderRadius: 10,
            padding: '7px 14px',
            fontSize: '0.85rem',
            color: '#8F90A6',
          }}>
            <span style={{ fontSize: '0.75rem' }}>
              {statFilter === 'upcoming' ? '📅 Все предстоящие' : '✅ Подтверждённые'} · {filteredBookings.length} записей
            </span>
            <button
              onClick={() => { setStatFilter('today'); setCurrentDate(new Date(today)); }}
              style={{
                background: 'transparent',
                border: '1px solid #3E414B',
                borderRadius: 6,
                color: '#8F90A6',
                fontSize: '0.72rem',
                padding: '2px 8px',
                cursor: 'pointer',
              }}
            >
              ← Сегодня
            </button>
          </div>
        )}

        {viewMode === 'list' && (
          <div style={{ display: 'flex', background: '#1A1D25', border: '1px solid #2C2F3A', borderRadius: 10, overflow: 'hidden' }}>
            {TIME_FILTERS.map(f => (
              <button
                key={f.id}
                onClick={() => setTimeFilter(f.id)}
                title={f.range || 'Все съёмки'}
                style={{
                  padding: '8px 14px',
                  fontWeight: 600,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  border: 'none',
                  background: timeFilter === f.id ? '#2563EB' : 'transparent',
                  color: timeFilter === f.id ? '#fff' : '#8F90A6',
                  transition: 'all 0.15s',
                  whiteSpace: 'nowrap',
                }}
              >
                {f.label}
                {f.range && <span style={{ fontSize: '0.68rem', marginLeft: 4, opacity: 0.7 }}>{f.range}</span>}
              </button>
            ))}
          </div>
        )}
      </div>

      {viewMode === 'list' ? (
        <div>
          <div style={{ fontSize: '0.78rem', color: '#555', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 12 }}>
            {listLabel}
          </div>

          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><div className="admin-spinner" /></div>
          ) : filteredBookings.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '50px 20px', color: '#8F90A6' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>📷</div>
              <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 6 }}>Нет съёмок на этот день</div>
              <div style={{ fontSize: '0.85rem', marginBottom: 20 }}>
                {nearestBooking
                  ? `Ближайшая съёмка — ${formatDateRu(nearestBooking.date)}`
                  : 'Переключитесь на другую дату или дождитесь новых заявок'}
              </div>
              {nearestBooking && (
                <button
                  onClick={goToNearestBooking}
                  style={{
                    background: '#2563EB',
                    border: 'none',
                    borderRadius: 10,
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: '0.88rem',
                    padding: '10px 22px',
                    cursor: 'pointer',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#1D4ED8')}
                  onMouseLeave={e => (e.currentTarget.style.background = '#2563EB')}
                >
                  📅 Показать ближайшую запись
                </button>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {filteredBookings.map(b => {
                const op = getOperator(b.operator_id ?? '');
                const wa = parseWhatsapp(b);
                const loc = parseLocation(b);
                const task = parseTaskDescription(b);
                const status = b.status || 'pending';
                const sc = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending;
                const isEditing = editId === b.id;
                const showDate = statFilter !== 'today';

                return (
                  <div
                    key={b.id}
                    style={{
                      background: '#141620',
                      border: `1px solid ${isEditing ? '#2563EB55' : '#2C2F3A'}`,
                      borderLeft: `3px solid ${sc.color}`,
                      borderRadius: 14,
                      transition: 'border-color 0.15s',
                    }}
                    className="p-3 sm:p-5"
                  >
                    {isEditing && editForm ? (
                      <div>
                        <div style={{ fontWeight: 700, color: '#e0e0e0', marginBottom: 16, fontSize: '0.95rem' }}>Редактировать запись</div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                          <div className="admin-field">
                            <label className="admin-label">Клиент</label>
                            <input className="admin-input" value={editForm.client_name} onChange={e => setEditForm(f => f ? { ...f, client_name: e.target.value } : f)} />
                          </div>
                          <div className="admin-field">
                            <label className="admin-label">WhatsApp</label>
                            <input className="admin-input" value={editForm.whatsapp} onChange={e => setEditForm(f => f ? { ...f, whatsapp: e.target.value } : f)} placeholder="+971 50 000 0000" />
                          </div>
                          <div className="admin-field">
                            <label className="admin-label">Начало</label>
                            <input className="admin-input" type="time" value={editForm.start_time} onChange={e => setEditForm(f => f ? { ...f, start_time: e.target.value } : f)} />
                          </div>
                          <div className="admin-field">
                            <label className="admin-label">Конец</label>
                            <input className="admin-input" type="time" value={editForm.end_time} onChange={e => setEditForm(f => f ? { ...f, end_time: e.target.value } : f)} />
                          </div>
                          <div className="admin-field">
                            <label className="admin-label">Оператор</label>
                            <select className="admin-input" value={editForm.operator_id} onChange={e => setEditForm(f => f ? { ...f, operator_id: e.target.value } : f)} style={{ cursor: 'pointer' }}>
                              <option value="">— не назначен</option>
                              {operators.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                            </select>
                          </div>
                          <div className="admin-field">
                            <label className="admin-label">Статус</label>
                            <select className="admin-input" value={editForm.status} onChange={e => setEditForm(f => f ? { ...f, status: e.target.value } : f)} style={{ cursor: 'pointer' }}>
                              <option value="pending">Ожидает</option>
                              <option value="confirmed">Подтверждено</option>
                              <option value="completed">Завершено</option>
                            </select>
                          </div>
                          <div className="admin-field" style={{ gridColumn: '1 / -1' }}>
                            <label className="admin-label">Локация съёмки</label>
                            <input className="admin-input" value={editForm.location} onChange={e => setEditForm(f => f ? { ...f, location: e.target.value } : f)} placeholder="Dubai Marina, JBR..." />
                          </div>
                          <div className="admin-field" style={{ gridColumn: '1 / -1' }}>
                            <label className="admin-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              Точка сбора оператора ({'{pickup_location}'})
                              <span style={{ fontSize: '0.68rem', background: '#3B82F618', border: '1px solid #3B82F644', color: '#7EB3FF', borderRadius: 5, padding: '1px 7px', fontWeight: 700 }}>
                                В шаблоне водителя
                              </span>
                            </label>
                            <input className="admin-input" value={editForm.pickup_location} onChange={e => setEditForm(f => f ? { ...f, pickup_location: e.target.value } : f)} placeholder="Откуда забрать оператора..." />
                          </div>
                          <div className="admin-field" style={{ gridColumn: '1 / -1' }}>
                            <label className="admin-label">Задача</label>
                            <input className="admin-input" value={editForm.task_description} onChange={e => setEditForm(f => f ? { ...f, task_description: e.target.value } : f)} placeholder="Описание съёмки..." />
                          </div>
                          <div className="admin-field" style={{ gridColumn: '1 / -1' }}>
                            <label className="admin-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              Скрипты и заметки для оператора
                              <span style={{ fontSize: '0.68rem', background: '#F59E0B18', border: '1px solid #F59E0B44', color: '#F59E0B', borderRadius: 5, padding: '1px 7px', fontWeight: 700 }}>
                                Включено в WhatsApp-рассылку
                              </span>
                            </label>
                            <textarea
                              className="admin-input"
                              value={editForm.scripts_notes}
                              onChange={e => setEditForm(f => f ? { ...f, scripts_notes: e.target.value } : f)}
                              placeholder="Ссылки на скрипты, детали образа, инструкции оператору..."
                              rows={3}
                              style={{ resize: 'vertical', fontFamily: 'inherit' }}
                            />
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 10 }}>
                          <button className="admin-btn-primary" onClick={saveEdit} disabled={saving} style={{ padding: '8px 22px' }}>
                            {saving ? 'Сохранение...' : 'Сохранить'}
                          </button>
                          <button className="admin-btn-ghost" onClick={cancelEdit} style={{ padding: '8px 18px' }}>Отмена</button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                        <div style={{
                          background: '#1A1D25',
                          border: '2px solid #2563EB44',
                          borderRadius: 10,
                          padding: showDate ? '8px 14px' : '10px 16px',
                          minWidth: showDate ? 120 : 96,
                          textAlign: 'center',
                          flexShrink: 0,
                        }}>
                          {showDate && (
                            <div style={{ fontSize: '0.68rem', color: '#8F90A6', marginBottom: 4, whiteSpace: 'nowrap' }}>
                              {formatDateRu(b.date).split(',')[0]}
                            </div>
                          )}
                          <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#fff', letterSpacing: '-0.03em', lineHeight: 1 }}>
                            {(b.start_time ?? '').slice(0, 5)}
                          </div>
                          <div style={{ fontSize: '0.7rem', color: '#555', margin: '3px 0 2px' }}>—</div>
                          <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#7EB3FF' }}>
                            {(b.end_time ?? '').slice(0, 5)}
                          </div>
                        </div>

                        {op ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                            {op.photo ? (
                              <img
                                src={op.photo}
                                alt={op.name}
                                style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover', border: '2px solid #2C2F3A', flexShrink: 0 }}
                                onError={e => (e.currentTarget.style.display = 'none')}
                              />
                            ) : (
                              <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#2563EB22', border: '2px solid #2563EB44', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', fontWeight: 700, color: '#7EB3FF', flexShrink: 0 }}>
                                {op.name.charAt(0)}
                              </div>
                            )}
                            <div>
                              <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#e0e0e0' }}>{op.name}</div>
                              <div style={{ fontSize: '0.75rem', color: '#8F90A6' }}>{op.role || 'Оператор'}</div>
                            </div>
                          </div>
                        ) : (
                          <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#2C2F3A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', color: '#555', flexShrink: 0 }}>?</div>
                        )}

                        <div style={{ flex: 1, minWidth: 160 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                            {(b as BookingWithClientAvatar).client_avatar_url ? (
                              <img
                                src={(b as BookingWithClientAvatar).client_avatar_url}
                                alt={b.client_name ?? ''}
                                style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', border: '1px solid #2C2F3A', flexShrink: 0 }}
                                onError={e => (e.currentTarget.style.display = 'none')}
                              />
                            ) : null}
                            <div style={{ fontWeight: 700, color: '#e0e0e0', fontSize: '0.95rem' }}>{b.client_name}</div>
                          </div>
                          {wa && (
                            <a
                              href={`https://wa.me/${wa.replace(/\D/g, '')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 5,
                                background: '#00C48C15',
                                border: '1px solid #00C48C44',
                                borderRadius: 7,
                                padding: '3px 10px',
                                color: '#00C48C',
                                fontSize: '0.8rem',
                                fontWeight: 600,
                                textDecoration: 'none',
                                marginBottom: 6,
                                transition: 'background 0.15s',
                              }}
                            >
                              <span style={{ fontSize: '0.9rem' }}>📞</span> {wa}
                            </a>
                          )}
                          {loc && (
                            <div style={{ fontSize: '0.8rem', color: '#8F90A6', marginBottom: 3 }}>
                              <span style={{ marginRight: 4 }}>📍</span>{loc}
                            </div>
                          )}
                          {b.pickup_location && (
                            <div style={{ fontSize: '0.78rem', color: '#7EB3FF', marginBottom: 3 }}>
                              <span style={{ marginRight: 4 }}>🗺</span>Сбор: {b.pickup_location}
                            </div>
                          )}
                          {task && (
                            <div style={{ fontSize: '0.78rem', color: '#666', fontStyle: 'italic' }}>
                              {task}
                            </div>
                          )}
                          {b.scripts_notes && (
                            <div style={{
                              marginTop: 6,
                              padding: '6px 10px',
                              background: '#F59E0B10',
                              border: '1px solid #F59E0B33',
                              borderRadius: 8,
                              fontSize: '0.78rem',
                              color: '#F59E0B',
                              whiteSpace: 'pre-wrap',
                              wordBreak: 'break-word',
                            }}>
                              <span style={{ fontWeight: 700, marginRight: 5 }}>Скрипты/Заметки:</span>
                              {b.scripts_notes}
                            </div>
                          )}
                          <div style={{ marginTop: 6, display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                            <span style={{
                              display: 'inline-flex', alignItems: 'center', gap: 4,
                              background: b.needs_script ? '#10b98115' : '#1e293b',
                              border: `1px solid ${b.needs_script ? '#10b98144' : '#2C2F3A'}`,
                              borderRadius: 6, padding: '2px 9px',
                              fontSize: '0.72rem', fontWeight: 700,
                              color: b.needs_script ? '#10b981' : '#555',
                              whiteSpace: 'nowrap',
                            }}>
                              Script: {b.needs_script ? 'Yes' : 'No'}
                            </span>
                            {(() => {
                              const es = (b.editing_status || 'pending') as 'pending' | 'in_progress' | 'review' | 'completed';
                              const EDIT_COLORS: Record<string, { label: string; color: string; bg: string; border: string }> = {
                                pending:     { label: 'Монтаж: Ожидает',   color: '#94A3B8', bg: '#94A3B810', border: '#94A3B830' },
                                in_progress: { label: 'Монтаж: В работе',  color: '#F59E0B', bg: '#F59E0B10', border: '#F59E0B35' },
                                review:      { label: 'Монтаж: На ревью',  color: '#3B82F6', bg: '#3B82F610', border: '#3B82F635' },
                                completed:   { label: 'Монтаж: Готово',    color: '#00C48C', bg: '#00C48C10', border: '#00C48C35' },
                              };
                              const cfg = EDIT_COLORS[es] ?? EDIT_COLORS['pending'];
                              return (
                                <span style={{
                                  display: 'inline-flex', alignItems: 'center', gap: 4,
                                  background: cfg.bg, border: `1px solid ${cfg.border}`,
                                  borderRadius: 6, padding: '2px 9px',
                                  fontSize: '0.72rem', fontWeight: 700, color: cfg.color,
                                  whiteSpace: 'nowrap',
                                }}>
                                  {cfg.label}
                                </span>
                              );
                            })()}
                            {b.final_video_link && (
                              <a
                                href={b.final_video_link}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                  display: 'inline-flex', alignItems: 'center', gap: 4,
                                  background: '#00C48C10', border: '1px solid #00C48C35',
                                  borderRadius: 6, padding: '2px 9px',
                                  fontSize: '0.72rem', fontWeight: 700, color: '#00C48C',
                                  textDecoration: 'none', whiteSpace: 'nowrap',
                                }}
                              >
                                Финальное видео
                              </a>
                            )}
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                          <button
                            onClick={() => cycleStatus(b)}
                            style={{
                              background: sc.bg,
                              border: `1px solid ${sc.border}`,
                              borderRadius: 8,
                              color: sc.color,
                              padding: '5px 12px',
                              fontSize: '0.78rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {sc.label}
                          </button>
                          <button
                            onClick={() => handleResendWa(b)}
                            disabled={waSending[b.id]}
                            title="Resend WA Confirmation"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 5,
                              background: waSending[b.id] ? '#00C48C08' : '#00C48C12',
                              border: '1px solid #00C48C44',
                              borderRadius: 8,
                              color: waSending[b.id] ? '#00C48C88' : '#00C48C',
                              padding: '5px 11px',
                              fontSize: '0.78rem',
                              fontWeight: 700,
                              cursor: waSending[b.id] ? 'default' : 'pointer',
                              whiteSpace: 'nowrap',
                              transition: 'all 0.15s',
                              opacity: waSending[b.id] ? 0.7 : 1,
                            }}
                          >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink: 0 }}>
                              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                            </svg>
                            {waSending[b.id] ? 'Sending...' : 'Send WA'}
                          </button>
                          <button
                            onClick={() => openEdit(b)}
                            className="admin-edit-btn"
                            style={{ padding: '5px 12px', fontSize: '0.78rem' }}
                          >
                            Изменить
                          </button>
                          <button
                            onClick={() => deleteBooking(b.id)}
                            className="admin-delete-btn"
                            style={{ padding: '5px 10px', fontSize: '0.78rem' }}
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <button
              onClick={() => setCalMonthOffset(o => o - 1)}
              style={{ background: '#1A1D25', border: '1px solid #2C2F3A', color: '#8F90A6', borderRadius: 8, padding: '6px 14px', cursor: 'pointer', fontSize: '1rem' }}
            >
              ‹
            </button>
            <span style={{ fontWeight: 700, color: '#e0e0e0', fontSize: '1rem' }}>
              {RU_MONTHS_FULL[calBase.getMonth()]} {calBase.getFullYear()}
            </span>
            <button
              onClick={() => setCalMonthOffset(o => o + 1)}
              style={{ background: '#1A1D25', border: '1px solid #2C2F3A', color: '#8F90A6', borderRadius: 8, padding: '6px 14px', cursor: 'pointer', fontSize: '1rem' }}
            >
              ›
            </button>
          </div>

          <div className="admin-form-card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid #2C2F3A' }}>
              {['Пн','Вт','Ср','Чт','Пт','Сб','Вс'].map(d => (
                <div key={d} style={{ textAlign: 'center', padding: '10px 0', fontSize: '0.75rem', fontWeight: 600, color: '#8F90A6' }}>{d}</div>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
              {calDays.map((cell, i) => {
                if (!cell.date || !cell.iso) {
                  return <div key={i} style={{ minHeight: 80, borderRight: '1px solid #1e2028', borderBottom: '1px solid #1e2028', background: '#0d0f14' }} />;
                }
                const isToday = cell.iso === todayStr;
                const isSelected = cell.iso === currentDateStr;
                const dayBs = bookings.filter(b => b.date === cell.iso);
                const isPast = cell.iso < todayStr;

                const opMap: Record<string, number> = {};
                dayBs.forEach(b => {
                  const opId = b.operator_id ?? 'unknown';
                  opMap[opId] = (opMap[opId] || 0) + 1;
                });

                return (
                  <div
                    key={i}
                    onClick={() => { setCurrentDate(cell.date!); setViewMode('list'); setStatFilter('today'); }}
                    style={{
                      minHeight: 80,
                      borderRight: '1px solid #1e2028',
                      borderBottom: '1px solid #1e2028',
                      padding: '8px 6px',
                      cursor: 'pointer',
                      background: isSelected ? '#2563EB12' : isToday ? '#1a2a4a' : 'transparent',
                      transition: 'background 0.12s',
                      position: 'relative',
                    }}
                  >
                    <div style={{
                      fontSize: '0.85rem',
                      fontWeight: isToday ? 800 : 600,
                      color: isToday ? '#7EB3FF' : isPast ? '#444' : '#e0e0e0',
                      marginBottom: 5,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                    }}>
                      {cell.date.getDate()}
                      {isToday && <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#7EB3FF', flexShrink: 0 }} />}
                    </div>
                    {dayBs.length === 0 && !isPast && (
                      <div style={{ fontSize: '0.68rem', color: '#00C48C88' }}>свободно</div>
                    )}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      {Object.entries(opMap).slice(0, 3).map(([opId, count]) => {
                        const op = getOperator(opId);
                        return (
                          <div key={opId} style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                            background: '#FF5C5C15',
                            border: '1px solid #FF5C5C33',
                            borderRadius: 5,
                            padding: '2px 5px',
                          }}>
                            {op?.photo ? (
                              <img src={op.photo} alt="" style={{ width: 14, height: 14, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                            ) : (
                              <div style={{ width: 14, height: 14, borderRadius: '50%', background: '#2563EB44', flexShrink: 0 }} />
                            )}
                            <span style={{ fontSize: '0.65rem', color: '#FF9070', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {op ? op.name.split(' ')[0] : 'Неизв.'}{count > 1 ? ` ×${count}` : ''}
                            </span>
                          </div>
                        );
                      })}
                      {Object.keys(opMap).length > 3 && (
                        <div style={{ fontSize: '0.65rem', color: '#8F90A6' }}>+ещё</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ marginTop: 16, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {operators.map(op => {
              const opBookings = bookings.filter(b => b.operator_id === op.id && b.date >= todayStr);
              return (
                <div key={op.id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  background: '#1A1D25',
                  border: '1px solid #2C2F3A',
                  borderRadius: 10,
                  padding: '8px 14px',
                }}>
                  {op.photo ? (
                    <img src={op.photo} alt={op.name} style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#2563EB22', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#7EB3FF', fontSize: '0.9rem' }}>{op.name.charAt(0)}</div>
                  )}
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#e0e0e0' }}>{op.name}</div>
                    <div style={{ fontSize: '0.72rem', color: '#8F90A6' }}>{opBookings.length} предстоящих</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
