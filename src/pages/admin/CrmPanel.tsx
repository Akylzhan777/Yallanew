import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import PaymentCalendar from '../../components/PaymentCalendar';
import SendRawVideoModal from '../../components/SendRawVideoModal';

type PlanType = 'package' | 'unlimited';
type CrmView = 'list' | 'calendar';

interface Client {
  id: string;
  name: string;
  phone: string;
  total_bookings: number;
  last_booking_date: string | null;
  created_at: string;
  amount_paid: number;
  total_contract_amount: number;
  total_videos_bought: number;
  manual_completed_offset: number;
  plan_type: PlanType;
  is_barter: boolean;
  start_date: string | null;
  end_date: string | null;
  last_payment_date: string | null;
  drive_link: string | null;
}

interface ClientForm {
  name: string;
  phone: string;
  amount_paid: string;
  total_contract_amount: string;
  total_videos_bought: string;
  manual_completed_offset: string;
  plan_type: PlanType;
  is_barter: boolean;
  start_date: string;
  end_date: string;
  drive_link: string;
}

interface VideoUnit {
  id: string;
  client_id: string;
  editing_status: string;
}

interface ClientVideoStats {
  total: number;
  inProgress: number;
  done: number;
  remaining: number;
}

const emptyForm = (): ClientForm => ({
  name: '',
  phone: '',
  amount_paid: '',
  total_contract_amount: '',
  total_videos_bought: '',
  manual_completed_offset: '',
  plan_type: 'package',
  is_barter: false,
  start_date: '',
  end_date: '',
  drive_link: '',
});

const inputStyle = (err?: boolean): React.CSSProperties => ({
  width: '100%',
  background: '#0f1420',
  border: `1px solid ${err ? '#ef4444' : 'rgba(255,255,255,0.1)'}`,
  borderRadius: 10,
  padding: '11px 14px',
  color: '#e5e7eb',
  fontSize: '0.875rem',
  outline: 'none',
  boxSizing: 'border-box',
  transition: 'border-color 0.15s',
});

function daysRemaining(endDate: string | null): number | null {
  if (!endDate) return null;
  const end = new Date(endDate);
  const now = new Date();
  const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return diff;
}

function formatDateInput(iso: string | null): string {
  if (!iso) return '';
  return iso.slice(0, 10);
}

export default function CrmPanel() {
  const [clients, setClients] = useState<Client[]>([]);
  const [videoUnits, setVideoUnits] = useState<VideoUnit[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [crmView, setCrmView] = useState<CrmView>('list');
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Client | null>(null);
  const [form, setForm] = useState<ClientForm>(emptyForm());
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof ClientForm, boolean>>>({});
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [toast, setToast] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('info');
  const [sendTelegramClient, setSendTelegramClient] = useState<Client | null>(null);
  const [savingDriveLink, setSavingDriveLink] = useState<string | null>(null);
  const [driveLinkInputs, setDriveLinkInputs] = useState<Record<string, string>>({});

  const showToast = (msg: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast(msg);
    setToastType(type);
    setTimeout(() => setToast(''), 3200);
  };

  const fetchClients = async () => {
    const { data } = await supabase
      .from('clients')
      .select('*')
      .order('created_at', { ascending: false });
    const rows = data ?? [];
    setClients(rows);
    const inputs: Record<string, string> = {};
    rows.forEach(c => { inputs[c.id] = c.drive_link ?? ''; });
    setDriveLinkInputs(inputs);
    setLoading(false);
  };

  const fetchVideoUnits = useCallback(async () => {
    const { data } = await supabase
      .from('video_units')
      .select('id, client_id, editing_status')
      .not('client_id', 'is', null);
    setVideoUnits(data ?? []);
  }, []);

  useEffect(() => {
    const init = async () => {
      await Promise.all([fetchClients(), fetchVideoUnits()]);
    };
    init();

    const sub = supabase
      .channel('crm_video_units_watch')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'video_units' }, () => {
        fetchVideoUnits();
      })
      .subscribe();

    return () => { supabase.removeChannel(sub); };
  }, [fetchVideoUnits]);

  const getClientVideoStats = (clientId: string, client: Client): ClientVideoStats => {
    const units = videoUnits.filter(v => v.client_id === clientId);
    const total = units.length;
    const inProgress = units.filter(v => v.editing_status === 'in_progress' || v.editing_status === 'review').length;
    const completedTasks = units.filter(v => v.editing_status === 'completed').length;
    const done = completedTasks + (client.manual_completed_offset ?? 0);
    const bought = client.total_videos_bought ?? 0;
    const remaining = Math.max(0, bought - total);
    return { total, inProgress, done, remaining };
  };

  const filtered = clients.filter(c => {
    const q = search.toLowerCase();
    return c.name.toLowerCase().includes(q) || (c.phone || '').includes(q);
  });

  const openAdd = () => {
    setEditTarget(null);
    setForm(emptyForm());
    setFormErrors({});
    setModalOpen(true);
  };

  const openEdit = (c: Client) => {
    setEditTarget(c);
    setForm({
      name: c.name,
      phone: c.phone || '',
      amount_paid: String(c.amount_paid ?? 0),
      total_contract_amount: String(c.total_contract_amount ?? 0),
      total_videos_bought: String(c.total_videos_bought ?? 0),
      manual_completed_offset: String(c.manual_completed_offset ?? 0),
      plan_type: c.plan_type ?? 'package',
      is_barter: c.is_barter ?? false,
      start_date: formatDateInput(c.start_date),
      end_date: formatDateInput(c.end_date),
      drive_link: c.drive_link ?? '',
    });
    setFormErrors({});
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditTarget(null);
    setFormErrors({});
  };

  const validate = (): boolean => {
    const errs: Partial<Record<keyof ClientForm, boolean>> = {};
    if (!form.name.trim()) errs.name = true;
    if (!form.is_barter && form.amount_paid.trim() !== '' && isNaN(Number(form.amount_paid))) errs.amount_paid = true;
    if (form.total_contract_amount.trim() !== '' && isNaN(Number(form.total_contract_amount))) errs.total_contract_amount = true;
    if (form.plan_type === 'package') {
      if (form.total_videos_bought.trim() !== '' && isNaN(Number(form.total_videos_bought))) errs.total_videos_bought = true;
    }
    if (form.manual_completed_offset.trim() !== '' && isNaN(Number(form.manual_completed_offset))) errs.manual_completed_offset = true;
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);

    const newAmountPaid = form.is_barter ? 0 : (form.amount_paid.trim() === '' ? 0 : Number(form.amount_paid));
    const prevAmountPaid = editTarget?.amount_paid ?? -1;
    const paymentChanged = newAmountPaid !== prevAmountPaid;

    const payload: Partial<Client> = {
      name: form.name.trim(),
      phone: form.phone.trim(),
      amount_paid: newAmountPaid,
      total_contract_amount: form.is_barter ? 0 : (form.total_contract_amount.trim() === '' ? 0 : Number(form.total_contract_amount)),
      plan_type: form.plan_type,
      is_barter: form.is_barter,
      total_videos_bought: form.plan_type === 'package' ? (form.total_videos_bought.trim() === '' ? 0 : Math.max(0, parseInt(form.total_videos_bought, 10))) : 0,
      manual_completed_offset: form.manual_completed_offset.trim() === '' ? 0 : Math.max(0, parseInt(form.manual_completed_offset, 10)),
      start_date: form.plan_type === 'unlimited' && form.start_date ? new Date(form.start_date).toISOString() : null,
      end_date: form.plan_type === 'unlimited' && form.end_date ? new Date(form.end_date).toISOString() : null,
      drive_link: form.drive_link.trim() || null,
    };

    if (!form.is_barter && paymentChanged && newAmountPaid > 0) {
      payload.last_payment_date = new Date().toISOString();
    }

    if (editTarget) {
      const { error } = await supabase.from('clients').update(payload).eq('id', editTarget.id);
      if (error) { showToast('Error: ' + error.message); }
      else { showToast('Client updated'); closeModal(); fetchClients(); }
    } else {
      if (!form.is_barter && newAmountPaid > 0) {
        payload.last_payment_date = new Date().toISOString();
      }
      const { error } = await supabase.from('clients').insert(payload);
      if (error) { showToast('Error: ' + error.message); }
      else { showToast('Client added'); closeModal(); fetchClients(); }
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this client? This action cannot be undone.')) return;
    setDeletingId(id);
    const { error } = await supabase.from('clients').delete().eq('id', id);
    if (error) { showToast('Error: ' + error.message); }
    else { showToast('Client deleted'); fetchClients(); }
    setDeletingId(null);
  };

  const saveDriveLink = async (clientId: string) => {
    const link = (driveLinkInputs[clientId] ?? '').trim();
    setSavingDriveLink(clientId);
    const { error } = await supabase.from('clients').update({ drive_link: link || null }).eq('id', clientId);
    if (error) {
      showToast('Ошибка: ' + error.message, 'error');
    } else {
      setClients(prev => prev.map(c => c.id === clientId ? { ...c, drive_link: link || null } : c));
      showToast('Ссылка сохранена', 'success');
    }
    setSavingDriveLink(null);
  };

  const handleCalendarClientClick = (clientId: string) => {
    const c = clients.find(x => x.id === clientId);
    if (c) openEdit(c);
  };

  const exportCsv = () => {
    const headers = ['Name', 'Phone', 'Plan Type', 'Is Barter', 'Amount Paid (AED)', 'Videos Bought', 'Start Date', 'End Date', 'Created At'];
    const rows = filtered.map(c => [
      `"${c.name.replace(/"/g, '""')}"`,
      `"${c.phone || ''}"`,
      c.plan_type ?? 'package',
      c.is_barter ? 'Yes' : 'No',
      String(c.amount_paid ?? 0),
      String(c.total_videos_bought ?? 0),
      c.start_date ? new Date(c.start_date).toLocaleDateString('en-GB') : '',
      c.end_date ? new Date(c.end_date).toLocaleDateString('en-GB') : '',
      new Date(c.created_at).toLocaleDateString('en-GB'),
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `clients_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const totalRevenue = filtered.reduce((sum, c) => sum + (c.is_barter ? 0 : (c.amount_paid ?? 0)), 0);

  return (
    <div style={{ padding: '0 0 40px 0', position: 'relative' }}>
      {toast && (
        <div style={{
          position: 'fixed', top: 20, right: 20, zIndex: 9999,
          background: '#1e293b', border: '1px solid rgba(0,196,140,0.3)',
          borderRadius: 10, padding: '12px 18px',
          color: '#e2e8f0', fontSize: '0.875rem', fontWeight: 500,
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        }}>
          {toast}
        </div>
      )}

      {sendTelegramClient && (
        <SendRawVideoModal
          client={sendTelegramClient}
          onClose={() => setSendTelegramClient(null)}
        />
      )}

      {modalOpen && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
          zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 16,
        }} onClick={closeModal}>
          <div style={{
            background: '#131929', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 16, padding: '28px 28px 24px', width: '100%', maxWidth: 480,
            boxShadow: '0 24px 64px rgba(0,0,0,0.7)',
            maxHeight: '90vh', overflowY: 'auto',
          }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
              <span style={{ color: '#f1f5f9', fontSize: '1rem', fontWeight: 700 }}>
                {editTarget ? 'Edit Client' : 'Add Client'}
              </span>
              <button onClick={closeModal} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: 4 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={labelStyle}>Client Name <span style={{ color: '#ef4444' }}>*</span></label>
                <input
                  style={inputStyle(formErrors.name)}
                  placeholder="John Smith"
                  value={form.name}
                  onChange={e => { setForm(f => ({ ...f, name: e.target.value })); setFormErrors(fe => ({ ...fe, name: false })); }}
                  autoFocus
                />
                {formErrors.name && <span style={errStyle}>Required field</span>}
              </div>

              <div>
                <label style={labelStyle}>Phone</label>
                <input
                  style={inputStyle()}
                  placeholder="+971 50 123 4567"
                  value={form.phone}
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                />
              </div>

              <div>
                <label style={labelStyle}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
                    </svg>
                    Ссылка на Google Drive (Исходники)
                  </span>
                </label>
                <input
                  style={inputStyle()}
                  placeholder="https://drive.google.com/drive/folders/..."
                  value={form.drive_link}
                  onChange={e => setForm(f => ({ ...f, drive_link: e.target.value }))}
                />
                <span style={{ color: '#4b5563', fontSize: '0.72rem', marginTop: 4, display: 'block' }}>
                  Постоянная ссылка на папку клиента с исходниками
                </span>
              </div>

              <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 16 }}>
                <label style={labelStyle}>Plan Type</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {(['package', 'unlimited'] as PlanType[]).map(pt => (
                    <button
                      key={pt}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, plan_type: pt }))}
                      style={{
                        flex: 1,
                        padding: '9px 0',
                        borderRadius: 9,
                        border: form.plan_type === pt ? '1px solid rgba(0,196,140,0.5)' : '1px solid rgba(255,255,255,0.1)',
                        background: form.plan_type === pt ? 'rgba(0,196,140,0.12)' : 'rgba(255,255,255,0.03)',
                        color: form.plan_type === pt ? '#00C48C' : '#6b7280',
                        fontWeight: 700,
                        fontSize: '0.8rem',
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                      }}
                    >
                      {pt === 'package' ? 'Package' : 'Unlimited'}
                    </button>
                  ))}
                </div>
              </div>

              <label style={{
                display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer',
                background: form.is_barter ? 'rgba(251,191,36,0.06)' : 'rgba(255,255,255,0.02)',
                border: form.is_barter ? '1px solid rgba(251,191,36,0.25)' : '1px solid rgba(255,255,255,0.07)',
                borderRadius: 9, padding: '10px 12px', transition: 'all 0.15s',
              }}>
                <div
                  onClick={() => setForm(f => ({ ...f, is_barter: !f.is_barter }))}
                  style={{
                    width: 18, height: 18, borderRadius: 4,
                    border: form.is_barter ? '2px solid #fbbf24' : '2px solid rgba(255,255,255,0.2)',
                    background: form.is_barter ? '#fbbf24' : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0, transition: 'all 0.15s',
                  }}
                >
                  {form.is_barter && (
                    <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                      <path d="M2 6l3 3 5-5" stroke="#0f1420" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </div>
                <div onClick={() => setForm(f => ({ ...f, is_barter: !f.is_barter }))}>
                  <div style={{ color: form.is_barter ? '#fbbf24' : '#9ca3af', fontWeight: 600, fontSize: '0.85rem' }}>Barter</div>
                  <div style={{ color: '#4b5563', fontSize: '0.72rem', marginTop: 1 }}>
                    Income not counted; editing costs remain
                  </div>
                </div>
              </label>

              {!form.is_barter && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div>
                    <label style={labelStyle}>Total Contract Value (AED)</label>
                    <input
                      style={inputStyle(formErrors.total_contract_amount)}
                      placeholder="0"
                      value={form.total_contract_amount}
                      onChange={e => { setForm(f => ({ ...f, total_contract_amount: e.target.value })); setFormErrors(fe => ({ ...fe, total_contract_amount: false })); }}
                      type="text"
                      inputMode="numeric"
                    />
                    {formErrors.total_contract_amount && <span style={errStyle}>Must be a number</span>}
                  </div>
                  <div>
                    <label style={labelStyle}>Amount Paid (AED)</label>
                    <input
                      style={inputStyle(formErrors.amount_paid)}
                      placeholder="0"
                      value={form.amount_paid}
                      onChange={e => { setForm(f => ({ ...f, amount_paid: e.target.value })); setFormErrors(fe => ({ ...fe, amount_paid: false })); }}
                      type="text"
                      inputMode="numeric"
                    />
                    {formErrors.amount_paid && <span style={errStyle}>Must be a number</span>}
                  </div>
                  {(() => {
                    const contract = Number(form.total_contract_amount) || 0;
                    const paid = Number(form.amount_paid) || 0;
                    const debt = contract - paid;
                    if (contract <= 0) return null;
                    return (
                      <div style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        background: debt > 0 ? 'rgba(239,68,68,0.07)' : 'rgba(0,196,140,0.07)',
                        border: `1px solid ${debt > 0 ? 'rgba(239,68,68,0.22)' : 'rgba(0,196,140,0.22)'}`,
                        borderRadius: 9, padding: '10px 14px',
                      }}>
                        <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600 }}>Balance / Debt</span>
                        <span style={{ fontSize: '1rem', fontWeight: 800, color: debt > 0 ? '#f87171' : '#00C48C' }}>
                          {debt > 0 ? `-${debt.toLocaleString()} AED` : 'Fully Paid'}
                        </span>
                      </div>
                    );
                  })()}
                </div>
              )}

              {form.plan_type === 'package' && (
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div style={{ fontSize: '0.72rem', color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Video Package
                  </div>
                  <div>
                    <label style={labelStyle}>Videos Purchased (total)</label>
                    <input
                      style={inputStyle(formErrors.total_videos_bought)}
                      placeholder="0"
                      value={form.total_videos_bought}
                      onChange={e => { setForm(f => ({ ...f, total_videos_bought: e.target.value })); setFormErrors(fe => ({ ...fe, total_videos_bought: false })); }}
                      type="text"
                      inputMode="numeric"
                    />
                    {formErrors.total_videos_bought && <span style={errStyle}>Must be a number</span>}
                  </div>
                  <div>
                    <label style={labelStyle}>Already Completed (manual)</label>
                    <input
                      style={inputStyle(formErrors.manual_completed_offset)}
                      placeholder="0"
                      value={form.manual_completed_offset}
                      onChange={e => { setForm(f => ({ ...f, manual_completed_offset: e.target.value })); setFormErrors(fe => ({ ...fe, manual_completed_offset: false })); }}
                      type="text"
                      inputMode="numeric"
                    />
                    <span style={{ color: '#6b7280', fontSize: '0.72rem', marginTop: 4, display: 'block' }}>
                      For videos completed before automatic tracking began
                    </span>
                    {formErrors.manual_completed_offset && <span style={errStyle}>Must be a number</span>}
                  </div>
                </div>
              )}

              {form.plan_type === 'unlimited' && (
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div style={{ fontSize: '0.72rem', color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Unlimited Period
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                      <label style={labelStyle}>Start Date</label>
                      <input
                        type="date"
                        style={inputStyle()}
                        value={form.start_date}
                        onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label style={labelStyle}>End Date</label>
                      <input
                        type="date"
                        style={inputStyle()}
                        value={form.end_date}
                        onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div>
                    <label style={labelStyle}>Already Completed (manual)</label>
                    <input
                      style={inputStyle(formErrors.manual_completed_offset)}
                      placeholder="0"
                      value={form.manual_completed_offset}
                      onChange={e => { setForm(f => ({ ...f, manual_completed_offset: e.target.value })); setFormErrors(fe => ({ ...fe, manual_completed_offset: false })); }}
                      type="text"
                      inputMode="numeric"
                    />
                    <span style={{ color: '#6b7280', fontSize: '0.72rem', marginTop: 4, display: 'block' }}>
                      Videos completed before automatic tracking (counted in "Done")
                    </span>
                    {formErrors.manual_completed_offset && <span style={errStyle}>Must be a number</span>}
                  </div>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
              <button
                onClick={handleSave}
                disabled={saving}
                style={{
                  flex: 1,
                  background: saving ? '#1e3a2f' : 'linear-gradient(135deg, #0e7c4a, #0a6038)',
                  border: '1px solid rgba(0,196,140,0.3)',
                  borderRadius: 10, padding: '11px 0',
                  color: '#fff', fontWeight: 700, fontSize: '0.875rem',
                  cursor: saving ? 'not-allowed' : 'pointer',
                }}
              >
                {saving ? 'Saving...' : editTarget ? 'Save' : 'Add'}
              </button>
              <button
                onClick={closeModal}
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 10, padding: '11px 20px',
                  color: '#94a3b8', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer',
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
        {crmView === 'list' && (
          <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
            <svg style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }}
              width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
            </svg>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name or phone..."
              style={{
                width: '100%', background: '#1a1f2e',
                border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10,
                padding: '10px 14px 10px 38px', color: '#e5e7eb',
                fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button
            onClick={() => setCrmView('list')}
            style={{
              padding: '9px 14px', borderRadius: 9, fontWeight: 700, fontSize: '0.8rem',
              cursor: 'pointer', transition: 'all 0.15s',
              border: crmView === 'list' ? '1px solid rgba(0,196,140,0.4)' : '1px solid rgba(255,255,255,0.1)',
              background: crmView === 'list' ? 'rgba(0,196,140,0.12)' : 'rgba(255,255,255,0.04)',
              color: crmView === 'list' ? '#00C48C' : '#6b7280',
            }}
          >
            List
          </button>
          <button
            onClick={() => setCrmView('calendar')}
            style={{
              padding: '9px 14px', borderRadius: 9, fontWeight: 700, fontSize: '0.8rem',
              cursor: 'pointer', transition: 'all 0.15s',
              border: crmView === 'calendar' ? '1px solid rgba(59,130,246,0.4)' : '1px solid rgba(255,255,255,0.1)',
              background: crmView === 'calendar' ? 'rgba(59,130,246,0.12)' : 'rgba(255,255,255,0.04)',
              color: crmView === 'calendar' ? '#93c5fd' : '#6b7280',
              display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            Payment Calendar
          </button>
        </div>

        {crmView === 'list' && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ background: '#1a2535', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '6px 12px', color: '#9ca3af', fontSize: '0.8rem' }}>
                {filtered.length} client{filtered.length !== 1 ? 's' : ''}
              </span>
              {filtered.length > 0 && (
                <span style={{ background: 'rgba(0,196,140,0.1)', border: '1px solid rgba(0,196,140,0.2)', borderRadius: 8, padding: '6px 12px', color: '#00C48C', fontSize: '0.8rem', fontWeight: 600 }}>
                  {totalRevenue.toLocaleString()} AED
                </span>
              )}
            </div>

            <button
              onClick={exportCsv}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 10, padding: '10px 16px', color: '#9ca3af',
                fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              CSV
            </button>

            <button
              onClick={openAdd}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: 'linear-gradient(135deg, #0e7c4a, #0a6038)',
                border: '1px solid rgba(0,196,140,0.3)', borderRadius: 10,
                padding: '10px 18px', color: '#fff',
                fontSize: '0.875rem', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap',
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Add Client
            </button>
          </>
        )}

        {crmView === 'calendar' && (
          <button
            onClick={openAdd}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: 'linear-gradient(135deg, #0e7c4a, #0a6038)',
              border: '1px solid rgba(0,196,140,0.3)', borderRadius: 10,
              padding: '10px 18px', color: '#fff',
              fontSize: '0.875rem', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap',
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Add Client
          </button>
        )}
      </div>

      {crmView === 'calendar' ? (
        <div style={{
          background: '#131929', border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: 14, padding: '20px 20px 12px',
        }}>
          <PaymentCalendar
            clients={clients}
            onClientClick={handleCalendarClientClick}
          />
        </div>
      ) : loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#9ca3af', fontSize: '0.9rem' }}>Loading...</div>
      ) : filtered.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: 60, color: '#6b7280', fontSize: '0.9rem',
          background: '#1a1f2e', borderRadius: 14, border: '1px solid rgba(255,255,255,0.06)',
        }}>
          {search ? 'No clients found.' : 'No clients yet. Click "Add Client" to create the first one.'}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map(c => {
            const stats = getClientVideoStats(c.id, c);
            const planType = c.plan_type ?? 'package';
            const isBarter = c.is_barter ?? false;
            const bought = c.total_videos_bought ?? 0;
            const progressPct = planType === 'package' && bought > 0
              ? Math.min(100, Math.round((stats.done / bought) * 100))
              : 0;
            const days = daysRemaining(c.end_date);

            return (
              <div
                key={c.id}
                style={{
                  background: '#131929',
                  border: `1px solid ${isBarter ? 'rgba(251,191,36,0.15)' : 'rgba(255,255,255,0.07)'}`,
                  borderRadius: 14,
                  padding: '18px 20px',
                  transition: 'border-color 0.15s, box-shadow 0.15s',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = isBarter ? 'rgba(251,191,36,0.35)' : 'rgba(0,196,140,0.25)';
                  e.currentTarget.style.boxShadow = '0 4px 24px rgba(0,196,140,0.06)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = isBarter ? 'rgba(251,191,36,0.15)' : 'rgba(255,255,255,0.07)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 160 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 700, color: '#f1f5f9', fontSize: '0.95rem' }}>{c.name}</span>
                      <PlanBadge planType={planType} isBarter={isBarter} />
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                      {c.phone && (
                        <span style={{
                          fontFamily: 'monospace', color: '#00C48C',
                          background: 'rgba(0,196,140,0.08)',
                          padding: '2px 8px', borderRadius: 5, fontSize: '0.78rem',
                        }}>
                          {c.phone}
                        </span>
                      )}
                      {!isBarter && c.amount_paid > 0 && (
                        <span style={{
                          color: '#fbbf24', background: 'rgba(251,191,36,0.08)',
                          border: '1px solid rgba(251,191,36,0.2)',
                          padding: '2px 8px', borderRadius: 5, fontSize: '0.78rem', fontWeight: 700,
                        }}>
                          {c.amount_paid.toLocaleString()} AED
                        </span>
                      )}
                      {!isBarter && (() => {
                        const contract = c.total_contract_amount ?? 0;
                        const paid = c.amount_paid ?? 0;
                        const debt = contract - paid;
                        if (contract <= 0) return null;
                        if (debt <= 0) return (
                          <span style={{
                            color: '#00C48C', background: 'rgba(0,196,140,0.08)',
                            border: '1px solid rgba(0,196,140,0.2)',
                            padding: '2px 8px', borderRadius: 5, fontSize: '0.72rem', fontWeight: 600,
                            display: 'flex', alignItems: 'center', gap: 4,
                          }}>
                            <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                              <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                            Paid
                          </span>
                        );
                        return (
                          <span style={{
                            color: '#f87171', background: 'rgba(239,68,68,0.08)',
                            border: '1px solid rgba(239,68,68,0.2)',
                            padding: '2px 8px', borderRadius: 5, fontSize: '0.78rem', fontWeight: 700,
                          }}>
                            -{debt.toLocaleString()} AED debt
                          </span>
                        );
                      })()}
                      {isBarter && (
                        <span style={{
                          color: '#fbbf24', background: 'rgba(251,191,36,0.06)',
                          border: '1px solid rgba(251,191,36,0.15)',
                          padding: '2px 8px', borderRadius: 5, fontSize: '0.72rem', fontWeight: 600,
                        }}>
                          Barter — 0 AED income
                        </span>
                      )}
                      {!isBarter && c.last_payment_date && (
                        <span style={{
                          color: '#6b7280', fontSize: '0.72rem',
                          display: 'flex', alignItems: 'center', gap: 3,
                        }}>
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/>
                            <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                          </svg>
                          {new Date(c.last_payment_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      )}
                      <span style={{ color: '#4b5563', fontSize: '0.72rem' }}>
                        {new Date(c.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                  </div>

                  <div style={{ flex: 2, minWidth: 280 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, marginBottom: 10 }}>
                      {planType === 'package' ? (
                        <StatPill label="Total" value={bought} color="#60a5fa" />
                      ) : (
                        <DaysPill days={days} />
                      )}
                      <StatPill label="Shot" value={stats.total} color="#a78bfa" />
                      <StatPill label="In Progress" value={stats.inProgress} color="#fbbf24" />
                      <StatPill label="Done" value={stats.done} color="#00C48C" />
                    </div>

                    {planType === 'package' && bought > 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ flex: 1, height: 6, background: 'rgba(255,255,255,0.07)', borderRadius: 99, overflow: 'hidden' }}>
                          <div style={{
                            height: '100%',
                            width: `${progressPct}%`,
                            background: progressPct >= 100 ? '#00C48C' : progressPct >= 60 ? '#3b82f6' : '#fbbf24',
                            borderRadius: 99,
                            transition: 'width 0.4s ease',
                          }} />
                        </div>
                        <span style={{ fontSize: '0.72rem', color: '#6b7280', whiteSpace: 'nowrap', minWidth: 32, textAlign: 'right' }}>
                          {progressPct}%
                        </span>
                        {stats.remaining > 0 && (
                          <span style={{
                            fontSize: '0.72rem', color: '#f87171',
                            background: 'rgba(239,68,68,0.08)',
                            border: '1px solid rgba(239,68,68,0.2)',
                            padding: '1px 7px', borderRadius: 5, whiteSpace: 'nowrap',
                          }}>
                            -{stats.remaining} remaining
                          </span>
                        )}
                      </div>
                    )}

                    {planType === 'unlimited' && c.start_date && c.end_date && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: '0.72rem', color: '#6b7280' }}>
                          {new Date(c.start_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                          {' — '}
                          {new Date(c.end_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                        {days !== null && days <= 7 && days >= 0 && (
                          <span style={{
                            fontSize: '0.72rem', color: '#f87171',
                            background: 'rgba(239,68,68,0.08)',
                            border: '1px solid rgba(239,68,68,0.2)',
                            padding: '1px 7px', borderRadius: 5,
                          }}>
                            Ending soon
                          </span>
                        )}
                        {days !== null && days < 0 && (
                          <span style={{
                            fontSize: '0.72rem', color: '#9ca3af',
                            background: 'rgba(255,255,255,0.05)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            padding: '1px 7px', borderRadius: 5,
                          }}>
                            Expired
                          </span>
                        )}
                      </div>
                    )}

                    {planType === 'package' && bought === 0 && (
                      <span style={{ color: '#374151', fontSize: '0.78rem', fontStyle: 'italic' }}>
                        Package not configured
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0, minWidth: 200, maxWidth: 260 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <input
                        value={driveLinkInputs[c.id] ?? ''}
                        onChange={e => setDriveLinkInputs(prev => ({ ...prev, [c.id]: e.target.value }))}
                        onKeyDown={e => { if (e.key === 'Enter') saveDriveLink(c.id); }}
                        placeholder="https://drive.google.com/..."
                        title="Ссылка на Google Drive (Исходники)"
                        style={{
                          flex: 1,
                          background: '#0f1420',
                          border: c.drive_link ? '1px solid rgba(0,196,140,0.3)' : '1px solid rgba(255,255,255,0.08)',
                          borderRadius: 7,
                          padding: '5px 9px',
                          color: '#e5e7eb',
                          fontSize: '0.72rem',
                          outline: 'none',
                          fontFamily: 'ui-monospace, monospace',
                          minWidth: 0,
                        }}
                      />
                      <button
                        onClick={() => saveDriveLink(c.id)}
                        disabled={savingDriveLink === c.id}
                        title="Сохранить ссылку"
                        style={{
                          background: savingDriveLink === c.id ? 'rgba(255,255,255,0.03)' : 'rgba(0,196,140,0.1)',
                          border: '1px solid rgba(0,196,140,0.25)',
                          borderRadius: 7, padding: '5px 9px',
                          color: '#00C48C', fontSize: '0.72rem', fontWeight: 700,
                          cursor: savingDriveLink === c.id ? 'default' : 'pointer',
                          flexShrink: 0, whiteSpace: 'nowrap',
                          opacity: savingDriveLink === c.id ? 0.5 : 1,
                          transition: 'background 0.12s',
                        }}
                        onMouseEnter={e => { if (savingDriveLink !== c.id) e.currentTarget.style.background = 'rgba(0,196,140,0.2)'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = savingDriveLink === c.id ? 'rgba(255,255,255,0.03)' : 'rgba(0,196,140,0.1)'; }}
                      >
                        {savingDriveLink === c.id ? '...' : 'Save'}
                      </button>
                    </div>

                    <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                    <button
                      onClick={() => setSendTelegramClient(c)}
                      disabled={!c.drive_link}
                      title={c.drive_link ? 'Отправить исходники в Telegram клиента' : 'Сначала сохраните ссылку на Drive'}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 5,
                        background: c.drive_link ? 'rgba(13,71,161,0.15)' : 'rgba(255,255,255,0.03)',
                        border: c.drive_link ? '1px solid rgba(21,101,192,0.35)' : '1px solid rgba(255,255,255,0.07)',
                        borderRadius: 7, padding: '5px 10px',
                        color: c.drive_link ? '#64B5F6' : '#374151',
                        fontSize: '0.75rem', fontWeight: 600,
                        cursor: c.drive_link ? 'pointer' : 'not-allowed',
                        transition: 'background 0.15s', whiteSpace: 'nowrap',
                        flex: 1,
                      }}
                      onMouseEnter={e => { if (c.drive_link) e.currentTarget.style.background = 'rgba(13,71,161,0.25)'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = c.drive_link ? 'rgba(13,71,161,0.15)' : 'rgba(255,255,255,0.03)'; }}
                    >
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                      </svg>
                      Отправить исходники
                    </button>
                    <button
                      onClick={() => openEdit(c)}
                      style={{
                        background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.25)',
                        borderRadius: 7, padding: '5px 12px', color: '#60a5fa',
                        fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
                        transition: 'background 0.15s',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(59,130,246,0.2)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'rgba(59,130,246,0.1)')}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(c.id)}
                      disabled={deletingId === c.id}
                      style={{
                        background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
                        borderRadius: 7, padding: '5px 10px', color: '#f87171',
                        fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
                        opacity: deletingId === c.id ? 0.5 : 1,
                        transition: 'background 0.15s',
                      }}
                      onMouseEnter={e => { if (deletingId !== c.id) e.currentTarget.style.background = 'rgba(239,68,68,0.18)'; }}
                      onMouseLeave={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.08)')}
                    >
                      {deletingId === c.id ? '...' : 'Delete'}
                    </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  color: '#94a3b8',
  fontSize: '0.75rem',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  marginBottom: 6,
};

const errStyle: React.CSSProperties = {
  color: '#ef4444',
  fontSize: '0.75rem',
  marginTop: 4,
  display: 'block',
};

function StatPill({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: 8, padding: '6px 8px', textAlign: 'center',
    }}>
      <div style={{ fontSize: '1.1rem', fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: '0.62rem', color: '#6b7280', marginTop: 2, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
    </div>
  );
}

function DaysPill({ days }: { days: number | null }) {
  const expired = days !== null && days < 0;
  const warning = days !== null && days >= 0 && days <= 7;
  const color = expired ? '#6b7280' : warning ? '#f87171' : '#00C48C';
  const label = days === null ? '—' : expired ? 'Expired' : `${days}d`;
  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: 8, padding: '6px 8px', textAlign: 'center',
    }}>
      <div style={{ fontSize: '1.1rem', fontWeight: 800, color, lineHeight: 1 }}>{label}</div>
      <div style={{ fontSize: '0.62rem', color: '#6b7280', marginTop: 2, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Remaining</div>
    </div>
  );
}

function PlanBadge({ planType, isBarter }: { planType: PlanType; isBarter: boolean }) {
  if (isBarter) return (
    <span style={{
      fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em',
      color: '#fbbf24', background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.25)',
      padding: '2px 6px', borderRadius: 4,
    }}>Barter</span>
  );
  if (planType === 'unlimited') return (
    <span style={{
      fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em',
      color: '#60a5fa', background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.25)',
      padding: '2px 6px', borderRadius: 4,
    }}>Unlimited</span>
  );
  return (
    <span style={{
      fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em',
      color: '#00C48C', background: 'rgba(0,196,140,0.08)', border: '1px solid rgba(0,196,140,0.2)',
      padding: '2px 6px', borderRadius: 4,
    }}>Package</span>
  );
}
