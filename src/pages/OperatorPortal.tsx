import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { safeGetItem, safeSetItem, safeRemoveItem } from '../utils/safeStorage';

const OPERATOR_PASSWORD = import.meta.env.VITE_OPERATOR_PASSWORD || 'yallaoperator';
const PASS_KEY = 'operator_portal_auth';
const LAST_LINKS_KEY = 'op_last_links';

interface CrmClient {
  id: string;
  name: string;
  phone: string | null;
}

interface TodayBooking {
  id: string;
  client_name: string;
  start_time: string;
  whatsapp: string | null;
}

interface ClientOption {
  clientId: string;
  clientName: string;
  phone: string | null;
  bookingId: string | null;
  bookingTime: string | null;
  isToday: boolean;
}

interface VideoItem {
  id: number;
  script: string;
  format: 'vertical' | 'horizontal';
}

interface VideoForm {
  client_name: string;
  client_id: string | null;
  raw_video_link: string;
  cover_photo_link: string;
  booking_id: string | null;
}

interface FormErrors {
  client_id?: boolean;
  scripts?: number[];
  raw_video_link?: boolean;
  cover_photo_link?: boolean;
  raw_video_link_access?: boolean;
  cover_photo_link_access?: boolean;
}

interface RecentUnit {
  id: string;
  client_name: string;
  editing_status: string;
  created_at: string;
}

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pending',
  in_progress: 'In Progress',
  review: 'In Review',
  completed: 'Done',
};

function getTodayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatPhone(phone: string | null): string {
  if (!phone) return '';
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length >= 10) return '+' + cleaned;
  return phone;
}

let videoItemCounter = 0;
const newVideoItem = (): VideoItem => ({ id: ++videoItemCounter, script: '', format: 'vertical' });

const emptyForm = (keepCover?: string): VideoForm => ({
  client_name: '',
  client_id: null,
  raw_video_link: '',
  cover_photo_link: keepCover ?? '',
  booking_id: null,
});

function isValidUrl(url: string): boolean {
  if (!url.trim()) return false;
  try {
    new URL(url.trim());
    return true;
  } catch {
    return false;
  }
}

async function triggerWhatsAppNotifications(): Promise<void> {
  try {
    const { data: editors, error } = await supabase
      .from('editor_balances')
      .select('editor_name, whatsapp_number')
      .not('whatsapp_number', 'is', null);

    if (error || !editors || editors.length === 0) return;

    const fetchedNumbers = editors
      .map((e: any) => e.whatsapp_number)
      .filter((num: string | null): num is string => num !== null && num !== '');

    const message = '🔥 A new editing task just came in! Click the link and claim it now: https://yallainfluencers.com/edit';
    console.log('SENDING WHATSAPP TO:', fetchedNumbers, 'MESSAGE:', message);
  } catch {
    // silently fail
  }
}

function buildOptions(clients: CrmClient[], todayBookings: TodayBooking[]): ClientOption[] {
  const todayOptions: ClientOption[] = [];
  const otherOptions: ClientOption[] = [];

  const bookedClientNames = new Set(todayBookings.map(b => b.client_name.toLowerCase().trim()));

  for (const booking of todayBookings) {
    const matchedClient = clients.find(
      c => c.name.toLowerCase().trim() === booking.client_name.toLowerCase().trim()
    );
    todayOptions.push({
      clientId: matchedClient?.id ?? `booking-${booking.id}`,
      clientName: booking.client_name,
      phone: matchedClient?.phone ?? booking.whatsapp ?? null,
      bookingId: booking.id,
      bookingTime: booking.start_time,
      isToday: true,
    });
  }

  for (const client of clients) {
    if (!bookedClientNames.has(client.name.toLowerCase().trim())) {
      otherOptions.push({
        clientId: client.id,
        clientName: client.name,
        phone: client.phone,
        bookingId: null,
        bookingTime: null,
        isToday: false,
      });
    }
  }

  return [...todayOptions, ...otherOptions];
}

export default function OperatorPortal() {
  const [authed, setAuthed] = useState(() => safeGetItem(PASS_KEY) === 'true');
  const [passInput, setPassInput] = useState('');
  const [passError, setPassError] = useState(false);
  const [toast, setToast] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState<VideoForm>(emptyForm());
  const [videos, setVideos] = useState<VideoItem[]>([newVideoItem()]);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [accessConfirmed, setAccessConfirmed] = useState(false);
  const [keepPhoto, setKeepPhoto] = useState(false);
  const [recentUnits, setRecentUnits] = useState<RecentUnit[]>([]);
  const [loadingRecent, setLoadingRecent] = useState(false);
  const [loadingClients, setLoadingClients] = useState(false);
  const [quantityConfirm, setQuantityConfirm] = useState<{ open: boolean; count: number } | null>(null);

  const [clientOptions, setClientOptions] = useState<ClientOption[]>([]);
  const [search, setSearch] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3200);
  };

  const fetchRecentUnits = async () => {
    setLoadingRecent(true);
    const { data } = await supabase
      .from('video_units')
      .select('id, client_name, editing_status, created_at')
      .order('created_at', { ascending: false })
      .limit(5);
    setRecentUnits(data ?? []);
    setLoadingRecent(false);
  };

  useEffect(() => {
    if (!authed) return;
    fetchRecentUnits();
  }, [authed]);

  useEffect(() => {
    if (!dropdownOpen) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [dropdownOpen]);

  const handleLogin = () => {
    if (passInput === OPERATOR_PASSWORD) {
      safeSetItem(PASS_KEY, 'true');
      setAuthed(true);
      setPassError(false);
    } else {
      setPassError(true);
    }
  };

  const openModal = async () => {
    const prevCover = keepPhoto ? formData.cover_photo_link : '';
    setFormData(emptyForm(prevCover));
    setVideos([newVideoItem()]);
    setFormErrors({});
    setAccessConfirmed(false);
    setSearch('');
    setDropdownOpen(false);
    setClientOptions([]);
    setModalOpen(true);
    setLoadingClients(true);

    const today = getTodayStr();
    const [clientsRes, bookingsRes] = await Promise.all([
      supabase.from('clients').select('id, name, phone').order('name', { ascending: true }),
      supabase
        .from('booking_events')
        .select('id, client_name, start_time, whatsapp')
        .eq('date', today)
        .order('start_time', { ascending: true }),
    ]);

    const clients: CrmClient[] = clientsRes.data ?? [];
    const todayBookings: TodayBooking[] = (bookingsRes.data ?? []).map(b => ({
      id: b.id,
      client_name: b.client_name,
      start_time: b.start_time,
      whatsapp: b.whatsapp ?? null,
    }));

    const options = buildOptions(clients, todayBookings);
    setClientOptions(options);
    setLoadingClients(false);

    if (todayBookings.length === 1) {
      const booking = todayBookings[0];
      const matched = options.find(o => o.bookingId === booking.id);
      if (matched) {
        setFormData(f => ({
          ...f,
          client_name: matched.clientName,
          client_id: matched.clientId.startsWith('booking-') ? null : matched.clientId,
          booking_id: matched.bookingId,
          cover_photo_link: prevCover,
        }));
      }
    }
  };

  const closeModal = () => {
    setModalOpen(false);
    setFormErrors({});
    setAccessConfirmed(false);
    setDropdownOpen(false);
    setSearch('');
  };

  const applyLastLinks = () => {
    try {
      const saved = JSON.parse(safeGetItem(LAST_LINKS_KEY) || 'null');
      if (saved?.raw_video_link || saved?.cover_photo_link) {
        setFormData(f => ({
          ...f,
          raw_video_link: saved.raw_video_link || f.raw_video_link,
          cover_photo_link: saved.cover_photo_link || f.cover_photo_link,
        }));
        setFormErrors(fe => ({ ...fe, raw_video_link: false, cover_photo_link: false, raw_video_link_access: false, cover_photo_link_access: false }));
        showToast('Last links applied');
      } else {
        showToast('No previous links saved yet');
      }
    } catch {
      showToast('No previous links saved yet');
    }
  };

  const selectOption = (opt: ClientOption) => {
    setFormData(f => ({
      ...f,
      client_name: opt.clientName,
      client_id: opt.clientId.startsWith('booking-') ? null : opt.clientId,
      booking_id: opt.bookingId,
      raw_video_link: '',
      cover_photo_link: keepPhoto ? f.cover_photo_link : '',
    }));
    setFormErrors(fe => ({ ...fe, client_id: false, raw_video_link: false, cover_photo_link: false, raw_video_link_access: false, cover_photo_link_access: false }));
    setDropdownOpen(false);
    setSearch('');
  };

  const validate = (): { ok: boolean; message?: string } => {
    const errors: FormErrors = {};

    if (!formData.client_name.trim()) {
      errors.client_id = true;
    }

    if (!formData.raw_video_link.trim()) {
      errors.raw_video_link = true;
    } else if (!isValidUrl(formData.raw_video_link)) {
      errors.raw_video_link = true;
    }

    if (!formData.cover_photo_link.trim()) {
      errors.cover_photo_link = true;
    } else if (!isValidUrl(formData.cover_photo_link)) {
      errors.cover_photo_link = true;
    }

    const invalidScriptIds = videos
      .filter(v => v.script.trim().length < 10)
      .map(v => v.id);
    if (invalidScriptIds.length > 0) errors.scripts = invalidScriptIds;

    setFormErrors(errors);

    if (Object.keys(errors).length === 0) return { ok: true };

    if (errors.client_id) return { ok: false, message: 'Ошибка: Выберите клиента!' };
    if (errors.scripts?.length) return { ok: false, message: 'Ошибка: Добавьте сценарий/название для КАЖДОГО видео (минимум 10 символов)!' };
    if (errors.raw_video_link) return { ok: false, message: 'Ошибка: Введите корректную ссылку на видео!' };
    if (errors.cover_photo_link) return { ok: false, message: 'Ошибка: Введите корректную ссылку на обложку!' };

    return { ok: false, message: 'Ошибка: Заполните все обязательные поля!' };
  };

  const handleSubmit = async () => {
    console.log('[OperatorPortal] handleSubmit clicked', { formData, videos, accessConfirmed });
    try {
      const result = validate();
      if (!result.ok) {
        console.warn('[OperatorPortal] validation failed', result.message);
        if (result.message) showToast(result.message);
        return;
      }

      if (!accessConfirmed) {
        showToast('Ошибка: Подтвердите, что ссылки доступны всем!');
        return;
      }

      console.log('[OperatorPortal] opening quantity confirm, videos:', videos.length);
      setQuantityConfirm({ open: true, count: videos.length });
    } catch (e) {
      console.error('[OperatorPortal] handleSubmit error', e);
      showToast('Ошибка: ' + String(e));
    }
  };

  const handleConfirmSubmit = async (confirmedCount: number) => {
    setSubmitting(true);

    try {
      const firstVideo = videos[0];
      const combinedScript = videos
        .map(v => v.script.trim())
        .filter(Boolean)
        .join('\n\n---\n\n');

      const rewardAmount = confirmedCount * 10000;

      const payload = {
        booking_id: formData.booking_id || null,
        client_id: formData.client_id || null,
        client_name: formData.client_name.trim(),
        script: combinedScript,
        raw_video_link: formData.raw_video_link.trim(),
        cover_photo_link: formData.cover_photo_link.trim(),
        video_format: firstVideo?.format ?? 'vertical',
        video_count: confirmedCount,
        reward_amount: rewardAmount,
      };

      console.log('[OperatorPortal] inserting video_units (single task)', payload);
      const { data: insertData, error } = await supabase.from('video_units').insert(payload).select();
      console.log('[OperatorPortal] insert result', { insertData, error });

      if (error) {
        console.error('[OperatorPortal] video_units insert failed', error);
        throw new Error(error.message || 'Database error');
      }

      const clientIdForLog = formData.client_id;
      if (clientIdForLog) {
        supabase.from('production_logs').insert({
          client_id: clientIdForLog,
          videos_count: confirmedCount,
          cost_per_video: 10000,
          date: new Date().toISOString(),
        }).then(({ error: logErr }) => {
          if (logErr) console.error('production_logs insert failed:', logErr.message);
        });
      }

      safeSetItem(LAST_LINKS_KEY, JSON.stringify({
        raw_video_link: formData.raw_video_link.trim(),
        cover_photo_link: formData.cover_photo_link.trim(),
      }));

      showToast(`Задача отправлена: ${confirmedCount} видео, оплата ${rewardAmount.toLocaleString('ru-RU')} KZT`);

      supabase.functions.invoke('editor-automations', {
        body: { action: 'broadcast_new_task', taskTitle: formData.client_name.trim() },
      }).catch(() => {});

      const savedCover = keepPhoto ? formData.cover_photo_link.trim() : '';
      setFormData(emptyForm(savedCover));
      setVideos([newVideoItem()]);
      setAccessConfirmed(false);
      setQuantityConfirm(null);
      closeModal();
      fetchRecentUnits();
      triggerWhatsAppNotifications();
    } catch (e) {
      console.error('[OperatorPortal] handleConfirmSubmit error', e);
      showToast('Ошибка: ' + String(e instanceof Error ? e.message : e));
    } finally {
      setSubmitting(false);
    }
  };

  const q = search.toLowerCase().trim();
  const filteredOptions = clientOptions.filter(opt => {
    if (!q) return true;
    const nameMatch = opt.clientName.toLowerCase().includes(q);
    const phoneDigits = (opt.phone ?? '').replace(/\D/g, '');
    const queryDigits = q.replace(/\D/g, '');
    const phoneMatch = phoneDigits.length > 0 && queryDigits.length > 0 && phoneDigits.includes(queryDigits);
    return nameMatch || phoneMatch;
  });

  const filteredToday = filteredOptions.filter(o => o.isToday);
  const filteredOther = filteredOptions.filter(o => !o.isToday);

  const selectedOption = clientOptions.find(
    o => o.clientId === formData.client_id || (o.bookingId && o.bookingId === formData.booking_id)
  );

  const todayCount = clientOptions.filter(o => o.isToday).length;
  const isWorking = submitting;

  if (!authed) {
    return (
      <div className="editor-login-wrap">
        <div className="editor-login-card">
          <div className="editor-login-logo">
            <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
              <rect width="36" height="36" rx="10" fill="#3B82F6" fillOpacity="0.15"/>
              <path d="M10 22l4-4 3 3 5-6 4 5" stroke="#3B82F6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="26" cy="12" r="3" fill="#3B82F6"/>
            </svg>
          </div>
          <h1 className="editor-login-title">Operator Portal</h1>
          <p className="editor-login-sub">Enter password to access</p>
          <input
            className={`editor-login-input${passError ? ' editor-login-input--err' : ''}`}
            type="password"
            placeholder="Password"
            value={passInput}
            onChange={e => { setPassInput(e.target.value); setPassError(false); }}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            autoFocus
          />
          {passError && <p className="editor-login-err">Incorrect password</p>}
          <button className="editor-login-btn" style={{ background: '#3B82F6' }} onClick={handleLogin}>Login</button>
        </div>
      </div>
    );
  }

  return (
    <div className="op-root">
      {toast && <div className="op-toast">{toast}</div>}

      {modalOpen && (
        <div className="op-modal-overlay" onClick={closeModal}>
          <div className="op-modal op-modal--wide" onClick={e => e.stopPropagation()}>
            <div className="op-modal-header">
              <span className="op-modal-title">Upload Video for Editing</span>
              <button className="op-modal-close" onClick={closeModal}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            <div className="op-modal-body">

              {/* ── Today banner ── */}
              {todayCount > 0 && !selectedOption && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  background: 'rgba(0,196,140,0.07)',
                  border: '1px solid rgba(0,196,140,0.2)',
                  borderRadius: 10, padding: '9px 14px', marginBottom: 4,
                }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#00C48C" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                    <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
                    <line x1="3" y1="10" x2="21" y2="10"/>
                  </svg>
                  <span style={{ fontSize: '0.78rem', color: '#6ee7b7' }}>
                    Today <strong style={{ color: '#e2e8f0' }}>{todayCount} {todayCount === 1 ? 'booking' : 'bookings'}</strong> — shown at the top of the list
                  </span>
                </div>
              )}

              {/* ── Selected client banner ── */}
              {selectedOption?.isToday && (
                <div style={{
                  display: 'flex', alignItems: 'flex-start', gap: 10,
                  background: 'rgba(0,196,140,0.07)',
                  border: '1px solid rgba(0,196,140,0.22)',
                  borderRadius: 10, padding: '10px 14px', marginBottom: 4,
                }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00C48C" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                    <polyline points="22 4 12 14.01 9 11.01"/>
                  </svg>
                  <div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#00C48C' }}>
                      Client with a booking today
                    </div>
                    <div style={{ fontSize: '0.76rem', color: '#6ee7b7', marginTop: 2 }}>
                      <strong style={{ color: '#e2e8f0' }}>{selectedOption.clientName}</strong>
                      {selectedOption.bookingTime && (
                        <span style={{ color: '#9ca3af', marginLeft: 6 }}>· {selectedOption.bookingTime.slice(0, 5)}</span>
                      )}
                      {selectedOption.phone && (
                        <span style={{ color: '#9ca3af', marginLeft: 6 }}>· {formatPhone(selectedOption.phone)}</span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* ── 1. Client Selection ── */}
              <div className="op-field">
                <label className="op-field-label">
                  Client Name <span className="op-field-req">*</span>
                </label>

                <div className="op-dropdown-wrap" ref={dropdownRef}>
                  <button
                    className={`op-dropdown-trigger${formErrors.client_id ? ' op-field-input--err' : ''}`}
                    onClick={() => !loadingClients && setDropdownOpen(o => !o)}
                    type="button"
                    disabled={loadingClients}
                  >
                    {loadingClients ? (
                      <span className="op-dropdown-placeholder" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span className="op-btn-spinner op-btn-spinner--dark" style={{ width: 13, height: 13 }} />
                        Loading...
                      </span>
                    ) : selectedOption ? (
                      <span className="op-dropdown-selected" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {selectedOption.isToday && (
                          <span style={{
                            fontSize: '0.62rem', fontWeight: 800, textTransform: 'uppercase',
                            letterSpacing: '0.06em', color: '#00C48C',
                            background: 'rgba(0,196,140,0.12)', border: '1px solid rgba(0,196,140,0.25)',
                            padding: '1px 5px', borderRadius: 3, flexShrink: 0,
                          }}>
                            Today
                          </span>
                        )}
                        <span style={{ fontWeight: 700 }}>{selectedOption.clientName}</span>
                        {selectedOption.phone && (
                          <span style={{ color: '#6b7280', fontWeight: 400, fontFamily: 'monospace', fontSize: '0.82rem' }}>
                            {formatPhone(selectedOption.phone)}
                          </span>
                        )}
                      </span>
                    ) : (
                      <span className="op-dropdown-placeholder">--- Select a client ---</span>
                    )}
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, opacity: 0.5, transform: dropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}>
                      <polyline points="6 9 12 15 18 9"/>
                    </svg>
                  </button>

                  {dropdownOpen && (
                    <div className="op-dropdown-panel">
                      <div className="op-dropdown-search-wrap">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                        </svg>
                        <input
                          className="op-dropdown-search"
                          placeholder="Name or phone number..."
                          value={search}
                          onChange={e => setSearch(e.target.value)}
                          autoFocus
                        />
                      </div>
                      <div className="op-dropdown-list">
                        {filteredOptions.length === 0 && (
                          <div className="op-dropdown-empty">
                            {clientOptions.length === 0
                              ? 'No clients in the database. Add them via Admin → CRM.'
                              : 'Client not found'}
                          </div>
                        )}

                        {filteredToday.length > 0 && (
                          <>
                            <div style={{
                              padding: '5px 12px 3px', fontSize: '0.65rem', fontWeight: 700,
                              textTransform: 'uppercase', letterSpacing: '0.07em',
                              color: '#00C48C', background: 'rgba(0,196,140,0.05)',
                              borderBottom: '1px solid rgba(0,196,140,0.1)',
                            }}>
                              Today's Bookings
                            </div>
                            {filteredToday.map(opt => (
                              <ClientOptionItem
                                key={opt.clientId + (opt.bookingId ?? '')}
                                opt={opt}
                                active={selectedOption?.clientId === opt.clientId && selectedOption?.bookingId === opt.bookingId}
                                onSelect={selectOption}
                              />
                            ))}
                          </>
                        )}

                        {filteredOther.length > 0 && (
                          <>
                            {filteredToday.length > 0 && (
                              <div style={{
                                padding: '5px 12px 3px', fontSize: '0.65rem', fontWeight: 700,
                                textTransform: 'uppercase', letterSpacing: '0.07em',
                                color: '#6b7280', background: 'rgba(255,255,255,0.02)',
                                borderBottom: '1px solid rgba(255,255,255,0.06)',
                              }}>
                                All Clients
                              </div>
                            )}
                            {filteredOther.map(opt => (
                              <ClientOptionItem
                                key={opt.clientId}
                                opt={opt}
                                active={selectedOption?.clientId === opt.clientId}
                                onSelect={selectOption}
                              />
                            ))}
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {formErrors.client_id && <span className="op-field-err-msg">Required field</span>}
                <div className="op-manual-warning">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                  Search by name <strong>or</strong> phone number. To add a new client — Admin → CRM.
                </div>
              </div>

              {/* ── 2. Video Scripts (dynamic) ── */}
              <div className="op-field">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <label className="op-field-label" style={{ marginBottom: 0 }}>
                    Videos from this folder <span className="op-field-req">*</span>
                  </label>
                  <span style={{
                    fontSize: '0.7rem', color: '#6b7280',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 5, padding: '2px 8px', fontWeight: 600,
                  }}>
                    {videos.length} {videos.length === 1 ? 'video' : 'videos'}
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {videos.map((v, index) => {
                    const hasError = (formErrors.scripts ?? []).includes(v.id);
                    return (
                      <div key={v.id} style={{
                        background: 'rgba(255,255,255,0.02)',
                        border: `1px solid ${hasError ? 'rgba(239,68,68,0.45)' : 'rgba(255,255,255,0.07)'}`,
                        borderRadius: 10, padding: '12px 14px',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                          <span style={{
                            fontSize: '0.72rem', fontWeight: 700,
                            textTransform: 'uppercase', letterSpacing: '0.06em',
                            color: hasError ? '#f87171' : '#64748b',
                          }}>
                            Title / Script for Video #{index + 1}
                          </span>
                          {videos.length > 1 && (
                            <button
                              type="button"
                              onClick={() => {
                                setVideos(vs => vs.filter(x => x.id !== v.id));
                                setFormErrors(fe => ({ ...fe, scripts: (fe.scripts ?? []).filter(id => id !== v.id) }));
                              }}
                              style={{
                                background: 'rgba(239,68,68,0.08)',
                                border: '1px solid rgba(239,68,68,0.2)',
                                borderRadius: 6, padding: '3px 8px',
                                color: '#f87171', cursor: 'pointer',
                                display: 'flex', alignItems: 'center', gap: 4,
                                fontSize: '0.72rem', fontWeight: 600,
                              }}
                              title="Remove this video"
                            >
                              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="3 6 5 6 21 6"/>
                                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                                <path d="M10 11v6M14 11v6"/>
                                <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                              </svg>
                              Remove
                            </button>
                          )}
                        </div>
                        <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
                          {(['vertical', 'horizontal'] as const).map(fmt => {
                            const isActive = v.format === fmt;
                            const isVert = fmt === 'vertical';
                            return (
                              <button
                                key={fmt}
                                type="button"
                                onClick={() => setVideos(vs => vs.map(x => x.id === v.id ? { ...x, format: fmt } : x))}
                                style={{
                                  flex: 1,
                                  padding: '7px 10px',
                                  borderRadius: 8,
                                  border: isActive
                                    ? `1.5px solid ${isVert ? 'rgba(192,132,252,0.6)' : 'rgba(96,165,250,0.6)'}`
                                    : '1.5px solid rgba(255,255,255,0.07)',
                                  background: isActive
                                    ? isVert ? 'rgba(168,85,247,0.14)' : 'rgba(59,130,246,0.14)'
                                    : 'rgba(255,255,255,0.02)',
                                  color: isActive
                                    ? isVert ? '#D8B4FE' : '#93C5FD'
                                    : '#64748b',
                                  cursor: 'pointer',
                                  fontSize: '0.75rem',
                                  fontWeight: isActive ? 700 : 500,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: 5,
                                  transition: 'all 0.15s',
                                }}
                              >
                                {isVert ? '📱' : '🖥️'}
                                {isVert ? 'Vertical (9:16)' : 'Horizontal (16:9)'}
                              </button>
                            );
                          })}
                        </div>
                        <textarea
                          className={`op-field-textarea${hasError ? ' op-field-input--err' : ''}`}
                          placeholder="Script or editing instructions for this video..."
                          value={v.script}
                          rows={3}
                          style={{ marginBottom: 0 }}
                          onChange={e => {
                            const val = e.target.value;
                            setVideos(vs => vs.map(x => x.id === v.id ? { ...x, script: val } : x));
                            if (val.trim().length >= 10) {
                              setFormErrors(fe => ({ ...fe, scripts: (fe.scripts ?? []).filter(id => id !== v.id) }));
                            }
                          }}
                        />
                        {hasError && (
                          <span className="op-field-err-msg" style={{ marginTop: 4 }}>
                            Minimum 10 characters
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={() => setVideos(vs => [...vs, newVideoItem()])}
                  style={{
                    marginTop: 10,
                    width: '100%',
                    background: 'rgba(59,130,246,0.07)',
                    border: '1px dashed rgba(59,130,246,0.35)',
                    borderRadius: 10, padding: '10px 0',
                    color: '#60a5fa', fontWeight: 700, fontSize: '0.85rem',
                    cursor: 'pointer', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', gap: 7,
                    transition: 'background 0.15s, border-color 0.15s',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(59,130,246,0.13)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(59,130,246,0.07)'; }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                  </svg>
                  + Add another video from this folder
                </button>
              </div>

              {/* ── 3. Video Source Link ── */}
              <div className="op-field">
                <div className="op-field-label-row">
                  <label className="op-field-label">
                    Video Source Link <span className="op-field-req">*</span>
                  </label>
                  <button className="op-reuse-btn" type="button" onClick={applyLastLinks} title="Fill both link fields with the last used links">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4.96"/>
                    </svg>
                    Reuse last links
                  </button>
                </div>
                <input
                  className={`op-field-input${formErrors.raw_video_link || formErrors.raw_video_link_access ? ' op-field-input--err' : ''}`}
                  type="url"
                  placeholder="https://drive.google.com/..."
                  value={formData.raw_video_link}
                  onChange={e => { setFormData(f => ({ ...f, raw_video_link: e.target.value })); setFormErrors(fe => ({ ...fe, raw_video_link: false, raw_video_link_access: false })); }}
                />
                {formErrors.raw_video_link && <span className="op-field-err-msg">Required field</span>}
                {formErrors.raw_video_link_access && (
                  <span className="op-field-err-msg op-access-err">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                    </svg>
                    Access Denied: Please check your link sharing settings!
                  </span>
                )}
              </div>

              {/* ── 4. Photo/Cover Link ── */}
              <div className="op-field">
                <div className="op-field-label-row">
                  <label className="op-field-label">
                    Photo/Cover Link <span className="op-field-req">*</span>
                  </label>
                  <label className="op-keep-toggle" title="When ON, this field won't be cleared after submission">
                    <span className="op-keep-toggle-label">Keep for next video</span>
                    <button
                      type="button"
                      className={`op-toggle-switch${keepPhoto ? ' op-toggle-switch--on' : ''}`}
                      onClick={() => setKeepPhoto(v => !v)}
                      aria-label="Keep photo link for next video"
                    >
                      <span className="op-toggle-knob" />
                    </button>
                  </label>
                </div>
                <input
                  className={`op-field-input${formErrors.cover_photo_link || formErrors.cover_photo_link_access ? ' op-field-input--err' : ''}`}
                  type="url"
                  placeholder="https://drive.google.com/..."
                  value={formData.cover_photo_link}
                  onChange={e => { setFormData(f => ({ ...f, cover_photo_link: e.target.value })); setFormErrors(fe => ({ ...fe, cover_photo_link: false, cover_photo_link_access: false })); }}
                />
                {formErrors.cover_photo_link && <span className="op-field-err-msg">Required field</span>}
                {formErrors.cover_photo_link_access && (
                  <span className="op-field-err-msg op-access-err">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                    </svg>
                    Access Denied: Please check your link sharing settings!
                  </span>
                )}
                {keepPhoto && (
                  <span className="op-keep-hint">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                    </svg>
                    This link will persist after submission
                  </span>
                )}
              </div>

              {/* ── 5. Access Confirmation ── */}
              <label className="op-access-confirm">
                <input
                  type="checkbox"
                  className="op-access-checkbox"
                  checked={accessConfirmed}
                  onChange={e => setAccessConfirmed(e.target.checked)}
                />
                <span className="op-access-text">
                  I confirm that <strong>"Link sharing"</strong> is turned ON (Anyone with the link can view).
                </span>
              </label>

            </div>

            <div className="op-modal-footer">
              <button className="op-modal-cancel" onClick={closeModal} disabled={isWorking}>Cancel</button>
              <button
                className="op-modal-submit"
                disabled={isWorking}
                onClick={handleSubmit}
                title={!accessConfirmed ? 'Please confirm link sharing is enabled' : ''}
                style={!accessConfirmed && !isWorking ? { opacity: 0.7 } : undefined}
              >
                {submitting ? (
                  <>
                    <span className="op-btn-spinner" />
                    Отправка...
                  </>
                ) : (
                  <>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="22" y1="2" x2="11" y2="13"/>
                      <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                    </svg>
                    Send to Editors
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <header className="op-header">
        <div className="op-header-left">
          <div className="op-header-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
              <circle cx="12" cy="13" r="4"/>
            </svg>
          </div>
          <span className="op-header-title">Operator Portal</span>
        </div>
        <button className="op-logout-btn" onClick={() => { safeRemoveItem(PASS_KEY); setAuthed(false); }}>
          Logout
        </button>
      </header>

      <div className="op-page-body">
        <div className="op-upload-hero op-upload-hero--compact">
          <div className="op-upload-icon op-upload-icon--sm">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="23 7 16 12 23 17 23 7"/>
              <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
            </svg>
          </div>
          <div className="op-upload-text">
            <h2 className="op-upload-title">Send Video to Editors</h2>
            <p className="op-upload-sub">Fill in reel details: client, script, and source links</p>
          </div>
          <button className="op-upload-btn" onClick={openModal}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Upload New Video
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div style={{ background: 'linear-gradient(135deg, rgba(37,99,235,0.08) 0%, rgba(14,165,233,0.05) 100%)', border: '1px solid rgba(96,165,250,0.25)', borderRadius: 14, padding: '18px 20px', display: 'flex', gap: 14, alignItems: 'flex-start', boxShadow: '0 0 18px rgba(96,165,250,0.06)' }}>
            <div style={{ flexShrink: 0, width: 38, height: 38, borderRadius: 10, background: 'rgba(96,165,250,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#60A5FA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
            </div>
            <div>
              <p style={{ margin: '0 0 5px', fontSize: '0.88rem', fontWeight: 700, color: '#93C5FD', letterSpacing: '0.01em' }}>📝 Always add a script!</p>
              <p style={{ margin: 0, fontSize: '0.78rem', color: '#8F90A6', lineHeight: 1.55 }}>Editors need clear instructions to cut the perfect video. Please describe what needs to be done.</p>
            </div>
          </div>

          <div style={{ background: 'linear-gradient(135deg, rgba(168,85,247,0.08) 0%, rgba(236,72,153,0.05) 100%)', border: '1px solid rgba(192,132,252,0.25)', borderRadius: 14, padding: '18px 20px', display: 'flex', gap: 14, alignItems: 'flex-start', boxShadow: '0 0 18px rgba(192,132,252,0.06)' }}>
            <div style={{ flexShrink: 0, width: 38, height: 38, borderRadius: 10, background: 'rgba(192,132,252,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#C084FC" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
            </div>
            <div>
              <p style={{ margin: '0 0 5px', fontSize: '0.88rem', fontWeight: 700, color: '#D8B4FE', letterSpacing: '0.01em' }}>🖼️ Don't forget the cover!</p>
              <p style={{ margin: 0, fontSize: '0.78rem', color: '#8F90A6', lineHeight: 1.55 }}>Upload a photo for the video thumbnail. A good cover is just as important as the reel itself.</p>
            </div>
          </div>
        </div>

        <div className="op-recent-section">
          <div className="op-recent-header">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
            Recently Uploaded
          </div>

          {loadingRecent ? (
            <div className="op-recent-loading">
              <div className="op-spinner op-spinner--sm" />
              <span>Loading...</span>
            </div>
          ) : recentUnits.length === 0 ? (
            <div className="op-recent-empty">No videos submitted yet. Upload your first reel above.</div>
          ) : (
            <div className="op-recent-list">
              {recentUnits.map((u, i) => {
                const statusClass = `op-unit-status--${u.editing_status || 'pending'}`;
                const label = STATUS_LABEL[u.editing_status] || 'Pending';
                const d = new Date(u.created_at);
                const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
                const timeStr = `${months[d.getMonth()]} ${d.getDate()}, ${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`;
                return (
                  <div key={u.id} className="op-recent-row">
                    <span className="op-recent-idx">{i + 1}</span>
                    <span className="op-recent-name">{u.client_name}</span>
                    <span className="op-recent-time">{timeStr}</span>
                    <span className={`op-unit-status ${statusClass}`}>{label}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {quantityConfirm?.open && (
        <QuantityConfirmDialog
          defaultCount={quantityConfirm.count}
          submitting={submitting}
          onBack={() => { if (!submitting) setQuantityConfirm(null); }}
          onConfirm={handleConfirmSubmit}
        />
      )}
    </div>
  );
}

function QuantityConfirmDialog({
  defaultCount,
  submitting,
  onBack,
  onConfirm,
}: {
  defaultCount: number;
  submitting: boolean;
  onBack: () => void;
  onConfirm: (count: number) => void;
}) {
  const [countStr, setCountStr] = useState(String(defaultCount));
  const parsed = parseInt(countStr, 10);
  const count = Number.isFinite(parsed) && parsed >= 1 ? parsed : 0;
  const canSubmit = count >= 1 && !submitting;

  const handleSubmitClick = () => {
    if (!canSubmit) return;
    onConfirm(count);
  };

  const handleBlur = () => {
    if (count < 1) setCountStr('1');
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 100000,
        background: 'rgba(0,0,0,0.82)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '16px',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
      }}
      onClick={() => { if (!submitting) onBack(); }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#0f172a',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 16,
          padding: '28px 28px 24px',
          width: '100%',
          maxWidth: 420,
          boxShadow: '0 24px 60px rgba(0,0,0,0.6)',
          position: 'relative',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'rgba(251,191,36,0.12)',
            border: '1px solid rgba(251,191,36,0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FBBF24" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
          </div>
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#f1f5f9', letterSpacing: '-0.01em' }}>
            Подтверждение количества
          </h3>
        </div>

        <p style={{ margin: '14px 0 6px', fontSize: '0.85rem', color: '#94a3b8', lineHeight: 1.6 }}>
          Сколько всего видео вы сейчас отправляете?
        </p>
        <p style={{ margin: '0 0 18px', fontSize: '0.78rem', color: '#64748b', lineHeight: 1.5 }}>
          Если это ссылка на папку, укажите точное количество роликов внутри.
        </p>

        <div style={{ marginBottom: 22 }}>
          <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>
            Количество видео <span style={{ color: '#ef4444' }}>*</span>
          </label>
          <input
            type="number"
            inputMode="numeric"
            min={1}
            required
            value={countStr}
            disabled={submitting}
            onChange={e => setCountStr(e.target.value.replace(/[^\d]/g, ''))}
            onBlur={handleBlur}
            style={{
              width: '100%', boxSizing: 'border-box',
              background: 'rgba(255,255,255,0.05)',
              border: '1.5px solid rgba(255,255,255,0.12)',
              borderRadius: 10, padding: '11px 14px',
              color: '#f1f5f9', fontSize: '1.1rem', fontWeight: 700,
              outline: 'none', appearance: 'none',
            }}
            autoFocus
          />
          <div style={{ marginTop: 8, fontSize: '0.75rem', color: '#475569', display: 'flex', alignItems: 'center', gap: 5 }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            Стоимость производства: <strong style={{ color: '#fbbf24' }}>{(count * 10000).toLocaleString('ru-RU')} KZT</strong>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            type="button"
            onClick={onBack}
            disabled={submitting}
            style={{
              flex: 1, padding: '11px 0',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 10, color: '#94a3b8',
              fontSize: '0.88rem', fontWeight: 600,
              cursor: submitting ? 'not-allowed' : 'pointer',
              opacity: submitting ? 0.5 : 1,
            }}
          >
            Назад
          </button>
          <button
            type="button"
            onClick={handleSubmitClick}
            disabled={count < 1 || submitting}
            style={{
              flex: 2, padding: '11px 0',
              background: count >= 1 && !submitting ? '#2563EB' : 'rgba(37,99,235,0.55)',
              border: 'none', borderRadius: 10,
              color: '#fff', fontSize: '0.88rem', fontWeight: 700,
              cursor: count >= 1 && !submitting ? 'pointer' : 'not-allowed',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              transition: 'background 0.15s',
            }}
          >
            {submitting ? (
              <>
                <span
                  style={{
                    width: 14, height: 14, borderRadius: '50%',
                    border: '2px solid rgba(255,255,255,0.35)',
                    borderTopColor: '#fff',
                    display: 'inline-block',
                    animation: 'op-spin 0.7s linear infinite',
                  }}
                />
                Отправка...
              </>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                  <polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
                Подтвердить и отправить
              </>
            )}
          </button>
        </div>
        <style>{`@keyframes op-spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );
}

function ClientOptionItem({
  opt,
  active,
  onSelect,
}: {
  opt: ClientOption;
  active: boolean;
  onSelect: (opt: ClientOption) => void;
}) {
  return (
    <button
      className={`op-dropdown-item${active ? ' op-dropdown-item--active' : ''}`}
      onClick={() => onSelect(opt)}
      style={{ display: 'flex', alignItems: 'center', gap: 8 }}
    >
      <span style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0, textAlign: 'left' }}>
        <span className="op-dropdown-item-name" style={{ fontWeight: 700 }}>{opt.clientName}</span>
        {opt.phone && (
          <span style={{
            fontSize: '0.72rem', color: '#9ca3af', fontFamily: 'monospace',
            letterSpacing: '0.02em', marginTop: 1,
          }}>
            {formatPhone(opt.phone)}
          </span>
        )}
        {opt.bookingTime && (
          <span style={{ fontSize: '0.7rem', color: '#00C48C', marginTop: 1 }}>
            Booking: {opt.bookingTime.slice(0, 5)}
          </span>
        )}
      </span>
      {opt.isToday && !active && (
        <span style={{
          fontSize: '0.62rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em',
          color: '#00C48C', background: 'rgba(0,196,140,0.1)',
          border: '1px solid rgba(0,196,140,0.25)',
          padding: '2px 6px', borderRadius: 4, flexShrink: 0,
        }}>
          Today
        </span>
      )}
    </button>
  );
}
