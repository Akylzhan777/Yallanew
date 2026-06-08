import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase, BookingEvent, OperatorRow } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import RescheduleModal from '../components/RescheduleModal';

interface BookingWithOperator extends BookingEvent {
  operator?: OperatorRow;
}

interface Props {
  onClose: () => void;
  onBook?: () => void;
}

const WHATSAPP_SUPPORT = '971501234567';

function formatDateFull(dateStr: string, monthsFull: string[]): string {
  const d = new Date(dateStr + 'T00:00:00');
  return `${d.getDate()} ${monthsFull[d.getMonth()]} ${d.getFullYear()}`;
}

export default function UserDashboard({ onClose, onBook }: Props) {
  const { user, profile, refreshProfile } = useAuth();
  const { t } = useTranslation();
  const MONTHS_FULL: string[] = t('calendar.monthsFull', { returnObjects: true }) as string[];

  const [bookings, setBookings] = useState<BookingWithOperator[]>([]);
  const [operators, setOperators] = useState<OperatorRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [rescheduleBooking, setRescheduleBooking] = useState<BookingWithOperator | null>(null);
  const [toast, setToast] = useState('');
  const [avatarUploading, setAvatarUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3500);
  };

  const fetchData = async () => {
    if (!user) return;
    const [{ data: ops }, { data: bk }] = await Promise.all([
      supabase.from('operators').select('*').eq('is_active', true),
      supabase
        .from('booking_events')
        .select('*')
        .eq('user_id', user.id)
        .neq('status', 'cancelled')
        .order('date', { ascending: true })
        .order('start_time', { ascending: true }),
    ]);
    setOperators(ops ?? []);
    const opMap = new Map((ops ?? []).map((o: OperatorRow) => [o.id, o]));
    const enriched = (bk ?? []).map((b: BookingEvent) => ({
      ...b,
      operator: opMap.get(b.operator_id ?? ''),
    }));
    setBookings(enriched);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const handleAvatarClick = () => fileInputRef.current?.click();

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setAvatarUploading(true);
    const ext = file.name.split('.').pop();
    const path = `${user.id}/avatar.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(path, file, { upsert: true, contentType: file.type });
    if (uploadError) {
      showToast('Ошибка загрузки фото');
      setAvatarUploading(false);
      return;
    }
    const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
    const publicUrl = urlData.publicUrl + `?t=${Date.now()}`;
    await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', user.id);
    await refreshProfile();
    showToast('Фото профиля обновлено');
    setAvatarUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleCancel = async (id: string) => {
    setCancelling(true);
    const { error } = await supabase
      .from('booking_events')
      .update({ status: 'cancelled' })
      .eq('id', id)
      .eq('user_id', user!.id);
    if (error) {
      showToast(t('booking.cancelError'));
    } else {
      showToast(t('booking.cancelSuccess'));
      setBookings(prev => prev.filter(b => b.id !== id));
    }
    setCancelId(null);
    setCancelling(false);
  };

  const handleRescheduleSuccess = (updated: BookingEvent) => {
    const opMap = new Map(operators.map(o => [o.id, o]));
    setBookings(prev => prev.map(b =>
      b.id === updated.id ? { ...updated, operator: opMap.get(updated.operator_id ?? '') } : b
    ));
    setRescheduleBooking(null);
    showToast(t('booking.rescheduleSuccess'));
  };

  const todayStr = new Date().toISOString().slice(0, 10);
  const upcoming = bookings.filter(b => b.date >= todayStr);
  const nearest = upcoming[0] ?? null;
  const rest = upcoming.slice(1);

  const STATUS_CFG: Record<string, { label: string; color: string; bg: string; border: string }> = {
    pending:   { label: 'Ожидает подтверждения', color: '#F59E0B', bg: '#F59E0B10', border: '#F59E0B44' },
    confirmed: { label: 'Съемка подтверждена',   color: '#00C48C', bg: '#00C48C10', border: '#00C48C44' },
    completed: { label: 'Завершено',              color: '#8F90A6', bg: '#8F90A610', border: '#8F90A644' },
  };
  const sc = (s: string | null) => STATUS_CFG[s ?? 'pending'] ?? STATUS_CFG.pending;

  const avatarUrl = profile?.avatar_url ?? '';
  const displayName = profile?.name
    ? `${profile.name}${profile.surname ? ' ' + profile.surname : ''}`
    : user?.email?.split('@')[0] ?? 'Клиент';

  return (
    <div className="ud-overlay" onClick={onClose}>
      {toast && <div className="admin-toast">{toast}</div>}

      <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarChange} />

      {cancelId && (
        <div className="cal-modal-overlay" onClick={() => setCancelId(null)}>
          <div className="cal-modal" style={{ maxWidth: 340 }} onClick={e => e.stopPropagation()}>
            <h3 className="cal-modal-title">{t('booking.cancelConfirm')}</h3>
            <p style={{ color: '#8F90A6', fontSize: '0.88rem', margin: '8px 0 24px' }}>{t('booking.cancelWarning')}</p>
            <div className="cal-modal-actions">
              <button className="cal-modal-cancel" onClick={() => setCancelId(null)}>{t('booking.no')}</button>
              <button className="cal-modal-confirm" style={{ background: '#EF4444' }} onClick={() => handleCancel(cancelId)} disabled={cancelling}>
                {cancelling ? t('booking.cancelling') : t('booking.yesCancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      {rescheduleBooking && (
        <RescheduleModal
          booking={rescheduleBooking}
          onClose={() => setRescheduleBooking(null)}
          onSuccess={handleRescheduleSuccess}
        />
      )}

      <div className="ud-panel" onClick={e => e.stopPropagation()}>
        <div className="ud-topbar">
          <span className="ud-brand">Yalla Production</span>
          <button className="ud-close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="ud-profile-block">
          <div className="ud-avatar-wrap" onClick={handleAvatarClick} title="Изменить фото">
            {avatarUploading ? (
              <div className="ud-avatar-loading"><div className="ud-avatar-spinner" /></div>
            ) : avatarUrl ? (
              <img src={avatarUrl} alt="Avatar" className="ud-avatar-img" />
            ) : (
              <div className="ud-avatar-placeholder"><span>{displayName.charAt(0).toUpperCase()}</span></div>
            )}
            <div className="ud-avatar-overlay"><span>📷</span></div>
          </div>
          <div className="ud-profile-info">
            <div className="ud-profile-name">{displayName}</div>
            <div className="ud-profile-email">{user?.email}</div>
            <div className="ud-profile-badge">
              {upcoming.length > 0
                ? `${upcoming.length} предстоящ${upcoming.length === 1 ? 'ая' : 'их'} съёмк${upcoming.length === 1 ? 'а' : 'и'}`
                : 'Нет активных съёмок'}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="ud-loading">{t('loading')}</div>
        ) : nearest ? (
          <div className="ud-body">
            <div className="ud-section-label">Ближайшая съёмка</div>

            <div className="ud-nearest-card">
              <div className="ud-nearest-status-bar" style={{ background: sc(nearest.status).bg, border: `1px solid ${sc(nearest.status).border}` }}>
                <div className="ud-status-dot" style={{ background: sc(nearest.status).color }} />
                <span style={{ color: sc(nearest.status).color, fontWeight: 700, fontSize: '0.88rem' }}>
                  {sc(nearest.status).label}
                </span>
              </div>

              <div className="ud-nearest-main">
                <div className="ud-nearest-datetime">
                  <div className="ud-nearest-date">{formatDateFull(nearest.date, MONTHS_FULL)}</div>
                  <div className="ud-nearest-time">
                    {(nearest.start_time ?? '').slice(0, 5)}
                    <span className="ud-time-dash">—</span>
                    {(nearest.end_time ?? '').slice(0, 5)}
                  </div>
                </div>

                {nearest.operator && (
                  <div className="ud-nearest-operator">
                    {nearest.operator.photo ? (
                      <img src={nearest.operator.photo} alt={nearest.operator.name} className="ud-nearest-op-photo" />
                    ) : (
                      <div className="ud-nearest-op-initials">{nearest.operator.name.charAt(0)}</div>
                    )}
                    <div>
                      <div className="ud-nearest-op-name">{nearest.operator.name}</div>
                      <div className="ud-nearest-op-role">{nearest.operator.role || 'Оператор'}</div>
                    </div>
                  </div>
                )}
              </div>

              {(nearest.location || nearest.task_description) && (
                <div className="ud-nearest-details">
                  {nearest.location && (
                    <div className="ud-nearest-detail-row">
                      <span className="ud-detail-icon">📍</span>
                      <span className="ud-detail-text">{nearest.location}</span>
                    </div>
                  )}
                  {nearest.task_description && (
                    <div className="ud-nearest-detail-row">
                      <span className="ud-detail-icon">📝</span>
                      <span className="ud-detail-text">{nearest.task_description}</span>
                    </div>
                  )}
                </div>
              )}

              <div className="ud-nearest-actions">
                {nearest.location && (
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(nearest.location)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ud-action-btn ud-action-map"
                  >
                    🗺 Локация
                  </a>
                )}
                <a
                  href={`https://wa.me/${WHATSAPP_SUPPORT}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ud-action-btn ud-action-wa"
                >
                  💬 Связаться
                </a>
              </div>

              <div className="ud-nearest-mgmt">
                <button className="ud-mgmt-btn ud-mgmt-reschedule" onClick={() => setRescheduleBooking(nearest)}>
                  Перенести
                </button>
                <button className="ud-mgmt-btn ud-mgmt-cancel" onClick={() => setCancelId(nearest.id)}>
                  Отменить
                </button>
              </div>
            </div>

            {rest.length > 0 && (
              <div className="ud-rest-section">
                <div className="ud-section-label">Остальные съёмки</div>
                <div className="ud-rest-list">
                  {rest.map(b => {
                    const cfg = sc(b.status);
                    return (
                      <div key={b.id} className="ud-rest-card" style={{ borderLeft: `3px solid ${cfg.color}` }}>
                        <div className="ud-rest-left">
                          {b.operator?.photo ? (
                            <img src={b.operator.photo} alt={b.operator.name} className="ud-rest-op-photo" />
                          ) : (
                            <div className="ud-rest-op-initials">{b.operator?.name?.charAt(0) ?? '?'}</div>
                          )}
                          <div>
                            <div className="ud-rest-op-name">{b.operator?.name ?? 'Оператор'}</div>
                            <div className="ud-rest-date">
                              {b.date === todayStr ? 'Сегодня' : `${new Date(b.date + 'T00:00:00').getDate()} ${MONTHS_FULL[new Date(b.date + 'T00:00:00').getMonth()]}`}
                              {' · '}<strong>{b.start_time.slice(0, 5)} – {b.end_time.slice(0, 5)}</strong>
                            </div>
                            {b.location && <div className="ud-rest-loc">📍 {b.location}</div>}
                          </div>
                        </div>
                        <div className="ud-rest-right">
                          <span className="ud-rest-status" style={{ color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}` }}>
                            {cfg.label.split(' ')[0]}
                          </span>
                          <button className="ud-rest-reschedule" onClick={() => setRescheduleBooking(b)}>Перенести</button>
                          <button className="ud-rest-cancel" onClick={() => setCancelId(b.id)}>✕</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="ud-empty-full">
            <div className="ud-empty-icon-big">📷</div>
            <div className="ud-empty-title">Нет активных съёмок</div>
            <div className="ud-empty-sub">Забронируйте дату и время у вашего оператора</div>
            <button className="ud-book-cta" onClick={() => { onClose(); onBook?.(); }}>
              Забронировать съёмку
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
