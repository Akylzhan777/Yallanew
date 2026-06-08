import { useEffect, useState } from 'react';
import { supabase, BookingEvent, OperatorRow } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

const RU_MONTHS_SHORT = ['янв','фев','мар','апр','май','июн','июл','авг','сен','окт','ноя','дек'];
const RU_DAYS_SHORT = ['Вс','Пн','Вт','Ср','Чт','Пт','Сб'];
const RU_MONTHS_FULL = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];

function localIsoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function formatDateRu(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return `${d.getDate()} ${RU_MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}, ${RU_DAYS_SHORT[d.getDay()]}`;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  pending:   { label: 'Ожидает',     color: '#F59E0B', bg: '#FEF3C715', border: '#F59E0B44' },
  confirmed: { label: 'Подтверждено', color: '#059669', bg: '#D1FAE515', border: '#05966944' },
  completed: { label: 'Завершено',    color: '#6B7280', bg: '#F3F4F615', border: '#6B728044' },
  cancelled: { label: 'Отменено',     color: '#DC2626', bg: '#FEE2E215', border: '#DC262644' },
};

type ManagerTab = 'shootings' | 'calendar';

export default function ManagerDashboard() {
  const { profile } = useAuth();
  const [tab, setTab] = useState<ManagerTab>('shootings');
  const [bookings, setBookings] = useState<BookingEvent[]>([]);
  const [operators, setOperators] = useState<OperatorRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [toast, setToast] = useState('');
  const [calMonth, setCalMonth] = useState(() => new Date());

  useEffect(() => {
    loadData();
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const loadData = async () => {
    setLoading(true);
    const today = localIsoDate(new Date());
    const [bRes, oRes] = await Promise.all([
      supabase.from('booking_events').select('*').gte('date', today).order('date').order('start_time'),
      supabase.from('operators').select('*').order('sort_order'),
    ]);
    if (bRes.data) setBookings(bRes.data);
    if (oRes.data) setOperators(oRes.data);
    setLoading(false);
  };

  const updateStatus = async (id: string, status: string) => {
    setUpdating(id);
    const { error } = await supabase.from('booking_events').update({ status }).eq('id', id);
    if (!error) {
      setBookings(prev => prev.map(b => b.id === id ? { ...b, status } : b));
      showToast(status === 'confirmed' ? 'Съёмка подтверждена' : 'Съёмка отклонена');
    }
    setUpdating(null);
  };

  const getOperatorName = (id: string) => operators.find(o => o.id === id)?.name ?? '—';

  const calDays = (() => {
    const first = new Date(calMonth.getFullYear(), calMonth.getMonth(), 1);
    const last = new Date(calMonth.getFullYear(), calMonth.getMonth() + 1, 0);
    const days: (Date | null)[] = [];
    for (let i = 0; i < first.getDay(); i++) days.push(null);
    for (let i = 1; i <= last.getDate(); i++) days.push(new Date(calMonth.getFullYear(), calMonth.getMonth(), i));
    return days;
  })();

  const bookingsByDate = bookings.reduce<Record<string, BookingEvent[]>>((acc, b) => {
    (acc[b.date] = acc[b.date] || []).push(b);
    return acc;
  }, {});

  if (!profile) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#F8FAFC' }}>
        <div className="admin-spinner" />
      </div>
    );
  }

  if (profile.role !== 'manager' && profile.role !== 'admin') {
    return (
      <div className="mgr-forbidden">
        <div style={{ fontSize: '2.5rem', marginBottom: 16 }}>🔒</div>
        <h2>Нет доступа</h2>
        <p>Эта страница доступна только менеджерам.</p>
        <a href="/" className="mgr-back-link">← На главную</a>
      </div>
    );
  }

  const pendingBookings = bookings.filter(b => b.status === 'pending');
  const upcomingBookings = bookings.filter(b => b.status !== 'cancelled');

  return (
    <div className="mgr-layout">
      {toast && <div className="mgr-toast">{toast}</div>}

      <aside className="mgr-sidebar">
        <div className="mgr-logo">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M15 10l4.553-2.069A1 1 0 0 1 21 8.82v6.36a1 1 0 0 1-1.447.89L15 14"/>
            <rect x="1" y="6" width="15" height="12" rx="2"/>
          </svg>
          <span>Manager Panel</span>
        </div>

        <nav className="mgr-nav">
          <button
            className={`mgr-nav-btn ${tab === 'shootings' ? 'active' : ''}`}
            onClick={() => setTab('shootings')}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="3" width="20" height="14" rx="2"/>
              <path d="M8 21h8M12 17v4"/>
            </svg>
            Съёмки
            {pendingBookings.length > 0 && (
              <span className="mgr-badge">{pendingBookings.length}</span>
            )}
          </button>
          <button
            className={`mgr-nav-btn ${tab === 'calendar' ? 'active' : ''}`}
            onClick={() => setTab('calendar')}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2"/>
              <path d="M16 2v4M8 2v4M3 10h18"/>
            </svg>
            Календарь занятости
          </button>
        </nav>

        <div className="mgr-sidebar-footer">
          <div className="mgr-sidebar-user">
            <div className="mgr-avatar">
              {profile.name ? profile.name.charAt(0).toUpperCase() : 'M'}
            </div>
            <div>
              <div className="mgr-sidebar-name">{profile.name} {profile.surname}</div>
              <div className="mgr-sidebar-role">Менеджер</div>
            </div>
          </div>
          <a href="/" className="mgr-back-btn">← На главную</a>
        </div>
      </aside>

      <main className="mgr-main">
        <div className="mgr-header">
          <div>
            <h1 className="mgr-title">
              {tab === 'shootings' ? 'Предстоящие съёмки' : 'Календарь занятости'}
            </h1>
            <p className="mgr-subtitle">
              {tab === 'shootings'
                ? `${upcomingBookings.length} предстоящих • ${pendingBookings.length} ожидают подтверждения`
                : `${RU_MONTHS_FULL[calMonth.getMonth()]} ${calMonth.getFullYear()}`
              }
            </p>
          </div>
        </div>

        {loading ? (
          <div className="mgr-loading">
            <div className="admin-spinner" />
          </div>
        ) : tab === 'shootings' ? (
          <div className="mgr-shootings">
            {upcomingBookings.length === 0 ? (
              <div className="mgr-empty">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" strokeWidth="1.5">
                  <rect x="3" y="4" width="18" height="18" rx="2"/>
                  <path d="M16 2v4M8 2v4M3 10h18"/>
                </svg>
                <p>Нет предстоящих съёмок</p>
              </div>
            ) : (
              upcomingBookings.map(b => {
                const sc = STATUS_CONFIG[b.status ?? 'pending'] ?? STATUS_CONFIG.pending;
                const isPending = b.status === 'pending';
                return (
                  <div key={b.id} className="mgr-card">
                    <div className="mgr-card-head">
                      <div className="mgr-card-date">
                        <span className="mgr-card-date-text">{formatDateRu(b.date)}</span>
                        <span className="mgr-card-time">{b.start_time ?? ''} – {b.end_time ?? ''}</span>
                      </div>
                      <span
                        className="mgr-status-pill"
                        style={{ color: sc.color, background: sc.bg, border: `1px solid ${sc.border}` }}
                      >
                        {sc.label}
                      </span>
                    </div>

                    <div className="mgr-card-body">
                      <div className="mgr-card-row">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                          <circle cx="12" cy="7" r="4"/>
                        </svg>
                        <span className="mgr-card-label">Клиент</span>
                        <span className="mgr-card-val">{b.client_name || '—'}</span>
                      </div>
                      <div className="mgr-card-row">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M15 10l4.553-2.069A1 1 0 0 1 21 8.82v6.36a1 1 0 0 1-1.447.89L15 14"/>
                          <rect x="1" y="6" width="15" height="12" rx="2"/>
                        </svg>
                        <span className="mgr-card-label">Оператор</span>
                        <span className="mgr-card-val">{getOperatorName(b.operator_id ?? '')}</span>
                      </div>
                      {b.location && (
                        <div className="mgr-card-row">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/>
                            <circle cx="12" cy="10" r="3"/>
                          </svg>
                          <span className="mgr-card-label">Локация</span>
                          <span className="mgr-card-val">{b.location}</span>
                        </div>
                      )}
                      {b.whatsapp && (
                        <div className="mgr-card-row">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.65 3.32 2 2 0 0 1 3.62 1h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 8.91a16 16 0 0 0 6.06 6.06l.8-.8a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                          </svg>
                          <span className="mgr-card-label">WhatsApp</span>
                          <span className="mgr-card-val">{b.whatsapp}</span>
                        </div>
                      )}
                      {b.task_description && (
                        <div className="mgr-card-row mgr-card-row--wrap">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                            <polyline points="14,2 14,8 20,8"/>
                          </svg>
                          <span className="mgr-card-label">Задача</span>
                          <span className="mgr-card-val mgr-card-val--muted">{b.task_description}</span>
                        </div>
                      )}
                    </div>

                    {isPending && (
                      <div className="mgr-card-actions">
                        <button
                          className="mgr-btn-confirm"
                          disabled={updating === b.id}
                          onClick={() => updateStatus(b.id, 'confirmed')}
                        >
                          {updating === b.id ? '...' : 'Подтвердить'}
                        </button>
                        <button
                          className="mgr-btn-cancel"
                          disabled={updating === b.id}
                          onClick={() => updateStatus(b.id, 'cancelled')}
                        >
                          Отклонить
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        ) : (
          <div className="mgr-cal-wrap">
            <div className="mgr-cal-nav">
              <button className="mgr-cal-nav-btn" onClick={() => setCalMonth(m => new Date(m.getFullYear(), m.getMonth()-1, 1))}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="15 18 9 12 15 6"/>
                </svg>
              </button>
              <span className="mgr-cal-month">{RU_MONTHS_FULL[calMonth.getMonth()]} {calMonth.getFullYear()}</span>
              <button className="mgr-cal-nav-btn" onClick={() => setCalMonth(m => new Date(m.getFullYear(), m.getMonth()+1, 1))}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </button>
            </div>

            <div className="mgr-cal-grid">
              {['Вс','Пн','Вт','Ср','Чт','Пт','Сб'].map(d => (
                <div key={d} className="mgr-cal-dow">{d}</div>
              ))}
              {calDays.map((day, i) => {
                if (!day) return <div key={`empty-${i}`} />;
                const iso = localIsoDate(day);
                const dayBookings = bookingsByDate[iso] ?? [];
                const isToday = iso === localIsoDate(new Date());
                return (
                  <div key={iso} className={`mgr-cal-day ${isToday ? 'today' : ''} ${dayBookings.length > 0 ? 'has-bookings' : ''}`}>
                    <span className="mgr-cal-day-num">{day.getDate()}</span>
                    {dayBookings.length > 0 && (
                      <div className="mgr-cal-day-dots">
                        {dayBookings.slice(0,3).map(b => {
                          const sc = STATUS_CONFIG[b.status ?? 'pending'] ?? STATUS_CONFIG.pending;
                          return <span key={b.id} className="mgr-cal-dot" style={{ background: sc.color }} title={`${b.start_time ?? ''} ${b.client_name ?? ''}`} />;
                        })}
                      </div>
                    )}
                    {dayBookings.length > 0 && (
                      <div className="mgr-cal-day-tooltip">
                        {dayBookings.map(b => (
                          <div key={b.id} className="mgr-cal-tooltip-row">
                            <span style={{ color: (STATUS_CONFIG[b.status ?? 'pending'] ?? STATUS_CONFIG.pending).color }}>●</span>
                            <span>{b.start_time ?? ''} {b.client_name || '—'}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="mgr-cal-legend">
              {Object.entries(STATUS_CONFIG).map(([key, sc]) => (
                <div key={key} className="mgr-cal-legend-item">
                  <span className="mgr-cal-dot" style={{ background: sc.color }} />
                  <span>{sc.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      <nav className="mgr-mobile-nav">
        <button className={`mgr-mobile-tab ${tab === 'shootings' ? 'active' : ''}`} onClick={() => setTab('shootings')}>
          <span className="mgr-mobile-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="15" height="12" rx="2"/><path d="M17 9.5l4-2v9l-4-2"/></svg>
          </span>
          <span>Съёмки</span>
          {pendingBookings.length > 0 && <span className="mgr-mobile-badge">{pendingBookings.length}</span>}
        </button>
        <button className={`mgr-mobile-tab ${tab === 'calendar' ? 'active' : ''}`} onClick={() => setTab('calendar')}>
          <span className="mgr-mobile-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
          </span>
          <span>Календарь</span>
        </button>
        <a href="/" className="mgr-mobile-tab">
          <span className="mgr-mobile-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>
          </span>
          <span>На сайт</span>
        </a>
      </nav>
    </div>
  );
}
