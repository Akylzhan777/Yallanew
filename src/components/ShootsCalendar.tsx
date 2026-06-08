import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Lock, Unlock, Clock, User as UserIcon, Package, Phone, Mail } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { localIsoDate } from '../lib/slotUtils';

const UAE_TZ = 'Asia/Dubai';

interface Booking {
  id: string;
  client_name: string;
  client_email: string;
  client_phone: string;
  booking_date: string;
  booking_time: string;
  details: string;
  status: string;
  start_time?: string | null;
  end_time?: string | null;
}

interface Order {
  id: string;
  buyer_name: string;
  package_name: string;
  package_price: number;
  status: string;
  created_at: string;
}

interface Props {
  creatorId: string;
  bookings: Booking[];
  orders: Order[];
  onRefresh: () => void;
}

const STATUS_COLORS: Record<string, string> = {
  pending: '#fbbf24',
  confirmed: '#60a5fa',
  in_progress: '#f97316',
  completed: '#00C48C',
  paid: '#60a5fa',
  cancelled: '#94a3b8',
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'Ожидание',
  confirmed: 'Подтверждено',
  in_progress: 'В процессе',
  completed: 'Выполнено',
  paid: 'Оплачено',
  cancelled: 'Отменено',
};

const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const MONTHS = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];

function getMonthDays(year: number, month: number): (Date | null)[] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDow = (firstDay.getDay() + 6) % 7;
  const cells: (Date | null)[] = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= lastDay.getDate(); d++) {
    cells.push(new Date(year, month, d));
  }
  return cells;
}

export default function ShootsCalendar({ creatorId, bookings, orders, onRefresh }: Props) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [blockedDates, setBlockedDates] = useState<Set<string>>(new Set());
  const [blockingDate, setBlockingDate] = useState<string | null>(null);
  const [blockError, setBlockError] = useState<string | null>(null);

  useEffect(() => {
    loadBlockedDates();
  }, [creatorId]);

  async function loadBlockedDates() {
    const { data } = await supabase
      .from('creator_blocked_dates')
      .select('blocked_date')
      .eq('creator_id', creatorId);
    if (data) {
      setBlockedDates(new Set(data.map(d => d.blocked_date)));
    }
  }

  async function toggleBlockDate(dateStr: string) {
    setBlockingDate(dateStr);
    setBlockError(null);
    if (blockedDates.has(dateStr)) {
      await supabase
        .from('creator_blocked_dates')
        .delete()
        .eq('creator_id', creatorId)
        .eq('blocked_date', dateStr);
      setBlockedDates(prev => { const n = new Set(prev); n.delete(dateStr); return n; });
    } else {
      const { error } = await supabase
        .from('creator_blocked_dates')
        .insert({ creator_id: creatorId, blocked_date: dateStr });
      if (error) {
        // P0001 = RAISE EXCEPTION from our conflict-check trigger
        const msg = error.code === 'P0001'
          ? 'Невозможно заблокировать день! На эту дату уже оформлен заказ. Перенесите или отмените текущую съемку перед блокировкой.'
          : 'Не удалось заблокировать дату. Попробуйте ещё раз.';
        setBlockError(msg);
        setBlockingDate(null);
        return;
      }
      setBlockedDates(prev => new Set([...prev, dateStr]));
    }
    setBlockingDate(null);
  }

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  }

  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  }

  const cells = getMonthDays(viewYear, viewMonth);
  const todayStr = localIsoDate(today, UAE_TZ);

  function getBookingsForDate(dateStr: string): Booking[] {
    return bookings.filter(b => b.booking_date === dateStr && b.status !== 'cancelled');
  }

  function getOrdersForDate(dateStr: string): Order[] {
    return orders.filter(o => {
      const orderDate = o.created_at.split('T')[0];
      return orderDate === dateStr && o.status !== 'cancelled';
    });
  }

  function getDateEvents(dateStr: string) {
    const dateBookings = getBookingsForDate(dateStr);
    const dateOrders = getOrdersForDate(dateStr);
    return { dateBookings, dateOrders, total: dateBookings.length + dateOrders.length };
  }

  const selectedEvents = selectedDate ? getDateEvents(selectedDate) : null;
  const isBlocked = selectedDate ? blockedDates.has(selectedDate) : false;
  const isPast = selectedDate ? selectedDate < todayStr : false;

  return (
    <div className="space-y-4">
      {blockError && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          <span className="mt-0.5 shrink-0">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          </span>
          <span className="flex-1">{blockError}</span>
          <button onClick={() => setBlockError(null)} className="shrink-0 opacity-60 hover:opacity-100">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      )}
      {/* Month navigation */}
      <div className="flex items-center justify-between px-1">
        <button onClick={prevMonth} className="w-9 h-9 rounded-xl flex items-center justify-center bg-white/[0.04] border border-white/10 hover:bg-white/[0.08] transition-colors">
          <ChevronLeft size={16} className="text-gray-300" />
        </button>
        <h2 className="text-base font-bold text-white">
          {MONTHS[viewMonth]} {viewYear}
        </h2>
        <button onClick={nextMonth} className="w-9 h-9 rounded-xl flex items-center justify-center bg-white/[0.04] border border-white/10 hover:bg-white/[0.08] transition-colors">
          <ChevronRight size={16} className="text-gray-300" />
        </button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-1">
        {WEEKDAYS.map(d => (
          <div key={d} className="text-center text-[10px] font-semibold text-gray-500 py-1">{d}</div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-1">
        {cells.map((date, i) => {
          if (!date) return <div key={`empty-${i}`} className="aspect-square" />;
          const dateStr = localIsoDate(date, UAE_TZ);
          const isToday = dateStr === todayStr;
          const isSelected = dateStr === selectedDate;
          const dateIsBlocked = blockedDates.has(dateStr);
          const { total } = getDateEvents(dateStr);
          const dateIsPast = dateStr < todayStr;

          return (
            <button
              key={dateStr}
              onClick={() => setSelectedDate(dateStr === selectedDate ? null : dateStr)}
              className={`
                relative aspect-square rounded-xl flex flex-col items-center justify-center transition-all duration-200
                ${isSelected ? 'bg-amber-500/20 border-amber-500/50 ring-1 ring-amber-500/30' : 'hover:bg-white/[0.05]'}
                ${isToday && !isSelected ? 'border border-emerald-500/30' : !isSelected ? 'border border-transparent' : ''}
                ${dateIsBlocked ? 'bg-red-500/[0.06]' : ''}
                ${dateIsPast ? 'opacity-50' : ''}
              `}
            >
              <span className={`text-xs font-semibold ${isSelected ? 'text-amber-300' : isToday ? 'text-emerald-400' : dateIsBlocked ? 'text-red-400' : 'text-gray-200'}`}>
                {date.getDate()}
              </span>
              {total > 0 && (
                <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5">
                  {Array.from({ length: Math.min(total, 3) }).map((_, j) => (
                    <div key={j} className="w-1 h-1 rounded-full bg-amber-400" />
                  ))}
                </div>
              )}
              {dateIsBlocked && total === 0 && (
                <Lock size={8} className="absolute bottom-1.5 left-1/2 -translate-x-1/2 text-red-400/60" />
              )}
            </button>
          );
        })}
      </div>

      {/* Selected date details */}
      {selectedDate && (
        <div className="mt-4 space-y-3 animate-[fadeInUp_0.2s_ease-out]">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">
              {new Date(selectedDate + 'T00:00:00').toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })}
            </h3>
            {!isPast && (
              <button
                onClick={() => toggleBlockDate(selectedDate)}
                disabled={blockingDate === selectedDate}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                  isBlocked
                    ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                    : 'bg-red-500/10 border border-red-500/20 text-red-400'
                } ${blockingDate === selectedDate ? 'opacity-50' : ''}`}
              >
                {isBlocked ? <><Unlock size={11} /> Разблокировать</> : <><Lock size={11} /> Выходной</>}
              </button>
            )}
          </div>

          {isBlocked && (
            <div className="rounded-xl px-4 py-3 bg-red-500/[0.06] border border-red-500/10">
              <p className="text-xs text-red-300/80">Этот день отмечен как выходной. Клиенты не смогут забронировать на эту дату.</p>
            </div>
          )}

          {selectedEvents && selectedEvents.total === 0 && !isBlocked && (
            <div className="text-center py-6">
              <p className="text-xs text-gray-500">На эту дату съёмок нет</p>
            </div>
          )}

          {selectedEvents && selectedEvents.dateBookings.length > 0 && (
            <div className="space-y-2">
              {selectedEvents.dateBookings.map(b => {
                const color = STATUS_COLORS[b.status] || STATUS_COLORS.pending;
                const label = STATUS_LABELS[b.status] || b.status;
                return (
                  <div key={b.id} className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <UserIcon size={12} className="text-gray-400" />
                        <span className="text-sm font-semibold text-white">{b.client_name}</span>
                      </div>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold" style={{ color, background: `${color}15`, border: `1px solid ${color}30` }}>{label}</span>
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-gray-400">
                      <span className="flex items-center gap-1"><Clock size={10} />{b.booking_time}</span>
                      {b.client_phone && <span className="flex items-center gap-1"><Phone size={10} />{b.client_phone}</span>}
                      {b.client_email && <span className="flex items-center gap-1"><Mail size={10} />{b.client_email}</span>}
                    </div>
                    {b.details && <p className="text-[11px] text-gray-500 mt-2">{b.details}</p>}
                  </div>
                );
              })}
            </div>
          )}

          {selectedEvents && selectedEvents.dateOrders.length > 0 && (
            <div className="space-y-2">
              {selectedEvents.dateOrders.map(o => {
                const color = STATUS_COLORS[o.status] || STATUS_COLORS.pending;
                const label = STATUS_LABELS[o.status] || o.status;
                return (
                  <div key={o.id} className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <Package size={12} className="text-gray-400" />
                        <span className="text-sm font-semibold text-white">{o.buyer_name || 'Клиент'}</span>
                      </div>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold" style={{ color, background: `${color}15`, border: `1px solid ${color}30` }}>{label}</span>
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-gray-400">
                      <span className="flex items-center gap-1"><Package size={10} />{o.package_name}</span>
                      <span>{o.package_price.toLocaleString('ru-RU')} KZT</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
