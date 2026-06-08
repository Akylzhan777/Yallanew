import { useCallback, useEffect, useRef, useState } from 'react';
import { Trash2, Plus, X, Film } from 'lucide-react';
import { supabase } from '../../lib/supabase';

// ─── Types ───────────────────────────────────────────────────────────────────

interface RetainerClient {
  id: string;
  first_name: string;
  last_name: string;
  profession: string;
  is_retainer: boolean;
  retainer_amount: string | null;
  next_payment_date: string | null;
}

interface EditState {
  is_retainer: boolean;
  retainer_amount: string;
  next_payment_date: string;
}

interface Expense {
  id: string;
  title: string;
  amount: string;
  is_monthly: boolean;
  created_at: string;
}

interface LogisticsExpense {
  id: string;
  date: string;
  category: string;
  amount: number;
  note: string | null;
  created_at: string;
}

interface ProductionLog {
  id: string;
  client_id: string;
  date: string;
  videos_count: number;
  cost_per_video: number;
  created_at: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const DEFAULT_COST_PER_VIDEO = 75;

const LOGISTICS_CATEGORIES = [
  'Такси/Careem',
  'Бензин',
  'Salik',
  'Парковка',
  'Водитель',
  'Другое',
] as const;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseAmount(val: string | number | null | undefined): number {
  return Number(String(val ?? '').replace(/\D/g, '')) || 0;
}

function getDubaiDateStr(): string {
  const now = new Date();
  const dubaiMs = now.getTime() + (4 * 60 - now.getTimezoneOffset()) * 60000;
  const d = new Date(dubaiMs);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getDubaiYearMonth(): { year: number; month: number } {
  const now = new Date();
  const dubaiMs = now.getTime() + (4 * 60 - now.getTimezoneOffset()) * 60000;
  const d = new Date(dubaiMs);
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}

function getDubaiEndOfMonth(): string {
  const { year, month } = getDubaiYearMonth();
  const lastDay = new Date(year, month, 0);
  return `${year}-${String(month).padStart(2, '0')}-${String(lastDay.getDate()).padStart(2, '0')}`;
}

function getDaysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const today = getDubaiDateStr();
  const todayMs = new Date(today + 'T00:00:00').getTime();
  const targetMs = new Date(dateStr + 'T00:00:00').getTime();
  return Math.round((targetMs - todayMs) / (1000 * 60 * 60 * 24));
}

function formatDateRu(dateStr: string): string {
  const d = new Date(dateStr.includes('T') ? dateStr : dateStr + 'T00:00:00');
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}

function isCurrentMonth(dateStr: string, year: number, month: number): boolean {
  const d = new Date(dateStr.includes('T') ? dateStr : dateStr + 'T00:00:00');
  return d.getFullYear() === year && d.getMonth() + 1 === month;
}

// ─── Styles ──────────────────────────────────────────────────────────────────

function badgeStyle(color: string, bg: string): React.CSSProperties {
  return {
    display: 'inline-flex', alignItems: 'center',
    padding: '3px 10px', borderRadius: 20, fontSize: '0.72rem', fontWeight: 700,
    color, background: bg, border: `1px solid ${color}40`, whiteSpace: 'nowrap',
  };
}

const fieldLabel: React.CSSProperties = {
  fontSize: '0.7rem', fontWeight: 700, color: '#4B5563',
  letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 5,
};

const inputStyle: React.CSSProperties = {
  width: '100%', background: '#0c1624', border: '1px solid #1a3a5c',
  borderRadius: 8, padding: '9px 12px', color: '#e5e7eb',
  fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box',
};

// ─── KPI Card ────────────────────────────────────────────────────────────────

interface KpiCardProps {
  icon: string;
  title: string;
  value: string;
  sub?: string;
  accent: string;
  bg: string;
  border: string;
  pulse?: boolean;
  hero?: boolean;
}

function KpiCard({ icon, title, value, sub, accent, bg, border, pulse, hero }: KpiCardProps) {
  return (
    <div
      style={{
        background: bg, border: `1px solid ${border}`, borderRadius: 16,
        padding: hero ? '22px 24px' : '18px 20px',
        display: 'flex', flexDirection: 'column', gap: 6,
        position: 'relative', overflow: 'hidden',
        transition: 'transform 0.15s, box-shadow 0.15s',
        ...(hero ? { boxShadow: `0 0 0 1px ${accent}40, 0 4px 24px ${accent}18` } : {}),
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)';
        (e.currentTarget as HTMLDivElement).style.boxShadow = `0 8px 32px ${accent}30`;
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
        (e.currentTarget as HTMLDivElement).style.boxShadow = hero ? `0 0 0 1px ${accent}40, 0 4px 24px ${accent}18` : 'none';
      }}
    >
      {pulse && (
        <span style={{
          position: 'absolute', top: 12, right: 12,
          width: 8, height: 8, borderRadius: '50%',
          background: '#EF4444', animation: 'kpi-pulse 1.5s infinite',
        }} />
      )}
      <div style={{
        fontSize: '0.68rem', fontWeight: 700, color: accent,
        letterSpacing: '0.07em', textTransform: 'uppercase',
        display: 'flex', alignItems: 'center', gap: 5,
      }}>
        <span>{icon}</span><span>{title}</span>
      </div>
      <div style={{
        fontSize: hero ? '1.65rem' : '1.4rem', fontWeight: 800,
        color: hero ? accent : '#F9FAFB', lineHeight: 1.1, letterSpacing: '-0.02em',
      }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: '0.72rem', color: '#6B7280', marginTop: 2 }}>{sub}</div>}
      <div style={{
        position: 'absolute', bottom: -14, right: -14,
        width: 80, height: 80, borderRadius: '50%',
        background: `${accent}12`, pointerEvents: 'none',
      }} />
    </div>
  );
}

// ─── Margin Badge ────────────────────────────────────────────────────────────

function MarginBadge({ revenue, cogs }: { revenue: number; cogs: number }) {
  if (revenue <= 0) return null;
  const profit = revenue - cogs;
  const margin = Math.round((profit / revenue) * 100);

  let color: string;
  let bg: string;
  let label: string;

  if (margin >= 70) {
    color = '#22C55E'; bg = '#052e16'; label = `Маржа: ${margin}%`;
  } else if (margin >= 40) {
    color = '#F97316'; bg = '#2D1400'; label = `Маржа: ${margin}%`;
  } else {
    color = '#EF4444'; bg = '#2D0E0E'; label = `Убыточный: ${margin}%`;
  }

  return (
    <span style={{
      ...badgeStyle(color, bg),
      fontWeight: margin < 40 ? 800 : 700,
      boxShadow: margin < 40 ? `0 0 0 1px ${color}40` : undefined,
    }}>
      {margin >= 70 ? '💎' : margin >= 40 ? '⚠️' : '🚨'} {label}
    </span>
  );
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ days }: { days: number | null }) {
  if (days === null) return <span style={badgeStyle('#4B5563', '#1F2937')}>—</span>;
  if (days < 0) return <span style={badgeStyle('#EF4444', '#2D0E0E')}>Просрочено</span>;
  if (days === 0) return <span style={badgeStyle('#F59E0B', '#2D1F00')}>Сегодня!</span>;
  if (days <= 3) return <span style={badgeStyle('#F97316', '#2D1400')}>{days}д</span>;
  if (days <= 7) return <span style={badgeStyle('#EAB308', '#2A2000')}>{days}д</span>;
  return <span style={badgeStyle('#22C55E', '#0A1F0A')}>{days}д</span>;
}

// ─── Add Reels Modal ──────────────────────────────────────────────────────────

interface AddReelsModalProps {
  client: RetainerClient;
  onClose: () => void;
  onSaved: () => void;
  showToast: (msg: string, type?: 'success' | 'error') => void;
}

function AddReelsModal({ client, onClose, onSaved, showToast }: AddReelsModalProps) {
  const [count, setCount] = useState('1');
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setTimeout(() => inputRef.current?.select(), 80); }, []);

  const submit = async () => {
    const n = parseInt(count);
    if (isNaN(n) || n < 1) { showToast('Введите число больше 0', 'error'); return; }
    setSaving(true);
    const { error } = await supabase.from('production_logs').insert({
      client_id: client.id,
      videos_count: n,
      cost_per_video: DEFAULT_COST_PER_VIDEO,
    });
    if (error) showToast('Ошибка: ' + error.message, 'error');
    else { showToast(`+${n} рилс${n === 1 ? '' : n <= 4 ? 'а' : 'ов'} добавлено`); onSaved(); onClose(); }
    setSaving(false);
  };

  const onKey = (e: React.KeyboardEvent) => { if (e.key === 'Enter') submit(); if (e.key === 'Escape') onClose(); };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
      zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{
        background: '#0D1117', border: '1px solid #1F2937', borderRadius: 18,
        padding: '26px 28px 22px', width: '100%', maxWidth: 360,
        boxShadow: '0 24px 64px rgba(0,0,0,0.7)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Film size={16} color="#A78BFA" />
            <span style={{ fontWeight: 800, fontSize: '1rem', color: '#fff' }}>Добавить рилсы</span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#6B7280', cursor: 'pointer', padding: 4 }}>
            <X size={18} />
          </button>
        </div>
        <div style={{ fontSize: '0.78rem', color: '#6B7280', marginBottom: 20 }}>
          {client.first_name} {client.last_name}
        </div>
        <div style={{ marginBottom: 18 }}>
          <div style={fieldLabel}>Сколько рилсов сдано?</div>
          <input ref={inputRef} type="number" min="1" step="1" value={count}
            onChange={e => setCount(e.target.value)} onKeyDown={onKey}
            style={{ ...inputStyle, fontSize: '1.3rem', fontWeight: 700, textAlign: 'center' }} />
          <div style={{ fontSize: '0.72rem', color: '#4B5563', marginTop: 6, textAlign: 'center' }}>
            Себестоимость: {(parseInt(count) || 0) * DEFAULT_COST_PER_VIDEO} AED ({DEFAULT_COST_PER_VIDEO} AED/видео)
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={submit} disabled={saving} style={{
            flex: 1, padding: '11px 0', borderRadius: 9, border: 'none',
            background: saving ? '#1F2937' : 'linear-gradient(135deg, #5B21B6 0%, #A78BFA 100%)',
            color: saving ? '#4B5563' : '#fff', fontWeight: 700, fontSize: '0.9rem',
            cursor: saving ? 'default' : 'pointer', transition: 'all 0.15s',
          }}>
            {saving ? 'Сохранение...' : 'Сохранить'}
          </button>
          <button onClick={onClose} style={{
            padding: '11px 20px', borderRadius: 9, border: '1px solid #374151',
            background: 'transparent', color: '#6B7280', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer',
          }}>Отмена</button>
        </div>
      </div>
    </div>
  );
}

// ─── Add Expense Modal ────────────────────────────────────────────────────────

interface AddExpenseModalProps {
  onClose: () => void;
  onSaved: () => void;
  showToast: (msg: string, type?: 'success' | 'error') => void;
}

function AddExpenseModal({ onClose, onSaved, showToast }: AddExpenseModalProps) {
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [isMonthly, setIsMonthly] = useState(true);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!title.trim() || !amount.trim()) { showToast('Заполните название и сумму', 'error'); return; }
    setSaving(true);
    const { error } = await supabase.from('business_expenses').insert({
      title: title.trim(), amount: amount.trim(), is_monthly: isMonthly,
    });
    if (error) showToast('Ошибка: ' + error.message, 'error');
    else { showToast('Расход добавлен'); onSaved(); onClose(); }
    setSaving(false);
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
      zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{
        background: '#0D1117', border: '1px solid #1F2937', borderRadius: 18,
        padding: '28px 28px 24px', width: '100%', maxWidth: 420,
        boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
          <div style={{ fontWeight: 800, fontSize: '1rem', color: '#fff' }}>Добавить расход</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#6B7280', cursor: 'pointer', padding: 4 }}>
            <X size={18} />
          </button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <div style={fieldLabel}>Название</div>
            <input type="text" placeholder="напр. Зарплата оператора" value={title}
              onChange={e => setTitle(e.target.value)} style={inputStyle} autoFocus />
          </div>
          <div>
            <div style={fieldLabel}>Сумма (AED)</div>
            <input type="text" placeholder="напр. 7000" value={amount}
              onChange={e => setAmount(e.target.value)} style={inputStyle} />
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
            <input type="checkbox" checked={isMonthly} onChange={e => setIsMonthly(e.target.checked)}
              style={{ width: 16, height: 16, accentColor: '#F59E0B', cursor: 'pointer' }} />
            <span style={{ fontSize: '0.85rem', color: isMonthly ? '#F59E0B' : '#6B7280', fontWeight: 600 }}>
              Ежемесячный расход
            </span>
          </label>
          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            <button onClick={submit} disabled={saving} style={{
              flex: 1, padding: '11px 0', borderRadius: 9, border: 'none',
              background: saving ? '#1F2937' : 'linear-gradient(135deg, #B45309 0%, #F59E0B 100%)',
              color: saving ? '#4B5563' : '#fff', fontWeight: 700, fontSize: '0.9rem',
              cursor: saving ? 'default' : 'pointer', transition: 'all 0.15s',
            }}>
              {saving ? 'Сохранение...' : 'Добавить'}
            </button>
            <button onClick={onClose} style={{
              padding: '11px 20px', borderRadius: 9, border: '1px solid #374151',
              background: 'transparent', color: '#6B7280', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer',
            }}>Отмена</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

type FinTab = 'retainers' | 'expenses' | 'logistics';

export default function BillingPanel() {
  const [clients, setClients] = useState<RetainerClient[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [logistics, setLogistics] = useState<LogisticsExpense[]>([]);
  const [productionLogs, setProductionLogs] = useState<ProductionLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Record<string, EditState>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [search, setSearch] = useState('');
  const [filterRetainer, setFilterRetainer] = useState<'all' | 'retainer' | 'other'>('all');
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [deletingExpense, setDeletingExpense] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<FinTab>('retainers');
  const [addReelsClient, setAddReelsClient] = useState<RetainerClient | null>(null);

  const [adminWaNumber, setAdminWaNumber] = useState('');
  const [adminWaLoading, setAdminWaLoading] = useState(true);
  const [adminWaSaving, setAdminWaSaving] = useState(false);
  const [adminWaInput, setAdminWaInput] = useState('');

  const today = getDubaiDateStr();

  const [logDate, setLogDate] = useState(today);
  const [logCategory, setLogCategory] = useState<string>(LOGISTICS_CATEGORIES[0]);
  const [logAmount, setLogAmount] = useState('');
  const [logNote, setLogNote] = useState('');
  const [logSaving, setLogSaving] = useState(false);
  const [deletingLog, setDeletingLog] = useState<string | null>(null);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadAdminWa = useCallback(async () => {
    setAdminWaLoading(true);
    const { data } = await supabase.from('app_settings').select('admin_whatsapp_number').eq('id', 1).maybeSingle();
    const val = (data as { admin_whatsapp_number?: string } | null)?.admin_whatsapp_number ?? '';
    setAdminWaNumber(val); setAdminWaInput(val); setAdminWaLoading(false);
  }, []);

  const saveAdminWa = async () => {
    setAdminWaSaving(true);
    const cleaned = adminWaInput.replace(/\D/g, '');
    const { error } = await supabase.from('app_settings').update({ admin_whatsapp_number: cleaned || null }).eq('id', 1);
    if (error) showToast('Ошибка: ' + error.message, 'error');
    else { setAdminWaNumber(cleaned); showToast('Номер WhatsApp сохранён'); }
    setAdminWaSaving(false);
  };

  const load = useCallback(async () => {
    setLoading(true);
    const [clientsRes, expensesRes, logisticsRes, prodRes] = await Promise.all([
      supabase.from('portfolio_clients')
        .select('id, first_name, last_name, profession, is_retainer, retainer_amount, next_payment_date')
        .order('is_retainer', { ascending: false })
        .order('next_payment_date', { ascending: true }),
      supabase.from('business_expenses').select('*').order('created_at', { ascending: false }),
      supabase.from('logistics_expenses').select('*').order('date', { ascending: false }).order('created_at', { ascending: false }),
      supabase.from('production_logs').select('*').order('date', { ascending: false }),
    ]);
    if (!clientsRes.error && clientsRes.data) setClients(clientsRes.data as RetainerClient[]);
    if (!expensesRes.error && expensesRes.data) setExpenses(expensesRes.data as Expense[]);
    if (!logisticsRes.error && logisticsRes.data) setLogistics(logisticsRes.data as LogisticsExpense[]);
    if (!prodRes.error && prodRes.data) setProductionLogs(prodRes.data as ProductionLog[]);
    setLoading(false);
  }, []);

  const reloadExpenses = useCallback(async () => {
    const { data, error } = await supabase.from('business_expenses').select('*').order('created_at', { ascending: false });
    if (!error && data) setExpenses(data as Expense[]);
  }, []);

  const reloadLogistics = useCallback(async () => {
    const { data, error } = await supabase.from('logistics_expenses').select('*').order('date', { ascending: false }).order('created_at', { ascending: false });
    if (!error && data) setLogistics(data as LogisticsExpense[]);
  }, []);

  const reloadProduction = useCallback(async () => {
    const { data, error } = await supabase.from('production_logs').select('*').order('date', { ascending: false });
    if (!error && data) setProductionLogs(data as ProductionLog[]);
  }, []);

  useEffect(() => { load(); loadAdminWa(); }, [load, loadAdminWa]);

  // ── KPI Math ──────────────────────────────────────────────────────────────

  const { year: curYear, month: curMonth } = getDubaiYearMonth();

  const retainerClients = clients.filter(c => c.is_retainer);
  const endOfMonth = getDubaiEndOfMonth();

  const mrr = retainerClients.reduce((s, c) => s + parseAmount(c.retainer_amount), 0);
  const debtors = retainerClients.filter(c => c.next_payment_date && c.next_payment_date < today);
  const debts = debtors.reduce((s, c) => s + parseAmount(c.retainer_amount), 0);
  const expectedThisMonth = retainerClients
    .filter(c => c.next_payment_date && c.next_payment_date >= today && c.next_payment_date <= endOfMonth)
    .reduce((s, c) => s + parseAmount(c.retainer_amount), 0);
  const arpu = retainerClients.length > 0 ? Math.round(mrr / retainerClients.length) : 0;
  const ltvIndex = clients.length > 0 ? Math.round((retainerClients.length / clients.length) * 100) : 0;

  const fixedExpenses = expenses.reduce((s, e) => s + parseAmount(e.amount), 0);

  const currentMonthLogistics = logistics.filter(l => isCurrentMonth(l.date, curYear, curMonth));
  const logisticsMonthTotal = currentMonthLogistics.reduce((s, l) => s + Number(l.amount), 0);

  const currentMonthProd = productionLogs.filter(p => isCurrentMonth(p.date, curYear, curMonth));
  const totalVideosMonth = currentMonthProd.reduce((s, p) => s + p.videos_count, 0);
  const cogsMonth = currentMonthProd.reduce((s, p) => s + p.videos_count * Number(p.cost_per_video), 0);

  const clientVideosThisMonth = (clientId: string) =>
    currentMonthProd.filter(p => p.client_id === clientId).reduce((s, p) => s + p.videos_count, 0);

  const totalExpenses = fixedExpenses + logisticsMonthTotal + cogsMonth;
  const netProfit = mrr - totalExpenses;

  const fmt = (n: number) => n.toLocaleString('en-US') + ' AED';

  // ── Client filtering ──────────────────────────────────────────────────────

  const filtered = clients.filter(c => {
    const name = `${c.first_name} ${c.last_name} ${c.profession}`.toLowerCase();
    if (search && !name.includes(search.toLowerCase())) return false;
    if (filterRetainer === 'retainer' && !c.is_retainer) return false;
    if (filterRetainer === 'other' && c.is_retainer) return false;
    return true;
  });

  // ── Client edit handlers ───────────────────────────────────────────────────

  const startEdit = (client: RetainerClient) => {
    setEditing(prev => ({
      ...prev,
      [client.id]: {
        is_retainer: client.is_retainer,
        retainer_amount: client.retainer_amount ?? '',
        next_payment_date: client.next_payment_date ?? '',
      },
    }));
  };

  const cancelEdit = (id: string) => {
    setEditing(prev => { const n = { ...prev }; delete n[id]; return n; });
  };

  const saveClient = async (id: string) => {
    const state = editing[id];
    if (!state) return;
    setSaving(prev => ({ ...prev, [id]: true }));
    const { error } = await supabase.from('portfolio_clients').update({
      is_retainer: state.is_retainer,
      retainer_amount: state.retainer_amount.trim() || null,
      next_payment_date: state.next_payment_date || null,
    }).eq('id', id);
    if (error) showToast('Ошибка: ' + error.message, 'error');
    else { showToast('Сохранено'); cancelEdit(id); await load(); }
    setSaving(prev => ({ ...prev, [id]: false }));
  };

  // ── Expense handlers ───────────────────────────────────────────────────────

  const deleteExpense = async (id: string) => {
    setDeletingExpense(id);
    const { error } = await supabase.from('business_expenses').delete().eq('id', id);
    if (error) showToast('Ошибка: ' + error.message, 'error');
    else { showToast('Расход удалён'); await reloadExpenses(); }
    setDeletingExpense(null);
  };

  // ── Logistics handlers ─────────────────────────────────────────────────────

  const addLogistics = async () => {
    const amt = parseFloat(logAmount);
    if (!logDate || !logCategory || isNaN(amt) || amt <= 0) {
      showToast('Заполните дату, категорию и сумму', 'error'); return;
    }
    setLogSaving(true);
    const { error } = await supabase.from('logistics_expenses').insert({
      date: logDate, category: logCategory, amount: amt, note: logNote.trim() || null,
    });
    if (error) showToast('Ошибка: ' + error.message, 'error');
    else { showToast('Запись добавлена'); setLogAmount(''); setLogNote(''); await reloadLogistics(); }
    setLogSaving(false);
  };

  const deleteLogistics = async (id: string) => {
    setDeletingLog(id);
    const { error } = await supabase.from('logistics_expenses').delete().eq('id', id);
    if (error) showToast('Ошибка: ' + error.message, 'error');
    else { showToast('Запись удалена'); await reloadLogistics(); }
    setDeletingLog(null);
  };

  // ── Category color map ────────────────────────────────────────────────────

  const catColor: Record<string, { color: string; bg: string }> = {
    'Такси/Careem': { color: '#38BDF8', bg: '#071b2e' },
    'Бензин':       { color: '#4ADE80', bg: '#052e16' },
    'Salik':        { color: '#FACC15', bg: '#2A2000' },
    'Парковка':     { color: '#A78BFA', bg: '#1e0a3c' },
    'Водитель':     { color: '#FB923C', bg: '#2D1400' },
    'Другое':       { color: '#9CA3AF', bg: '#1F2937' },
  };
  const getCatStyle = (cat: string) => catColor[cat] ?? catColor['Другое'];

  // ── Tabs ──────────────────────────────────────────────────────────────────

  const tabs: { id: FinTab; label: string; icon: string }[] = [
    { id: 'retainers', label: 'Клиенты / Ретейнеры', icon: '💎' },
    { id: 'expenses', label: 'Расходы бизнеса', icon: '📉' },
    { id: 'logistics', label: 'Логистика', icon: '🚗' },
  ];

  return (
    <div style={{ padding: '0 0 60px 0' }}>
      <style>{`
        @keyframes kpi-pulse {
          0%   { box-shadow: 0 0 0 0 rgba(239,68,68,0.5); }
          70%  { box-shadow: 0 0 0 8px rgba(239,68,68,0); }
          100% { box-shadow: 0 0 0 0 rgba(239,68,68,0); }
        }
      `}</style>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: 20, right: 20, zIndex: 9999,
          padding: '12px 20px', borderRadius: 10,
          background: toast.type === 'success' ? '#14532d' : '#450a0a',
          border: `1px solid ${toast.type === 'success' ? '#22C55E40' : '#EF444440'}`,
          color: toast.type === 'success' ? '#86EFAC' : '#FCA5A5',
          fontSize: '0.875rem', fontWeight: 600, boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        }}>
          {toast.msg}
        </div>
      )}

      {showAddExpense && (
        <AddExpenseModal onClose={() => setShowAddExpense(false)} onSaved={reloadExpenses} showToast={showToast} />
      )}

      {addReelsClient && (
        <AddReelsModal
          client={addReelsClient}
          onClose={() => setAddReelsClient(null)}
          onSaved={reloadProduction}
          showToast={showToast}
        />
      )}

      {/* ── KPI Cards ────────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(165px, 1fr))', gap: 14, marginBottom: 24 }}>
        <KpiCard icon="💰" title="MRR (Доход)" value={fmt(mrr)}
          sub={`${retainerClients.length} ретейнер-клиентов`}
          accent="#22C55E" bg="linear-gradient(135deg, #052e16 0%, #0D1117 100%)" border="#22C55E25" />
        <KpiCard icon="🚨" title="Просрочено" value={fmt(debts)}
          sub={debtors.length > 0 ? `${debtors.length} клиент${debtors.length === 1 ? '' : debtors.length <= 4 ? 'а' : 'ов'}` : 'Всё в порядке'}
          accent="#EF4444" bg="linear-gradient(135deg, #2d0e0e 0%, #0D1117 100%)" border="#EF444425" pulse={debts > 0} />
        <KpiCard icon="💸" title="Ожидается в этом месяце" value={fmt(expectedThisMonth)}
          sub="До конца месяца"
          accent="#0EA5E9" bg="linear-gradient(135deg, #071b2e 0%, #0D1117 100%)" border="#0EA5E925" />
        <KpiCard icon="📊" title="Средний чек" value={fmt(arpu)}
          sub="ARPU по ретейнерам"
          accent="#F59E0B" bg="linear-gradient(135deg, #2d1f00 0%, #0D1117 100%)" border="#F59E0B25" />
        <KpiCard icon="🎯" title="Доля постоянников" value={`${ltvIndex}%`}
          sub={`${retainerClients.length} из ${clients.length} клиентов`}
          accent="#0EA5E9" bg="linear-gradient(135deg, #071b2e 0%, #0D1117 100%)" border="#0EA5E925" />
        <KpiCard icon="🎬" title="Себестоимость (COGS)" value={fmt(cogsMonth)}
          sub={`Всего видео: ${totalVideosMonth} × ${DEFAULT_COST_PER_VIDEO} AED`}
          accent="#A78BFA" bg="linear-gradient(135deg, #1e0a3c 0%, #0D1117 100%)" border="#A78BFA25" />
        <KpiCard icon="📉" title="Расходы" value={fmt(totalExpenses)}
          sub={`Фикс: ${fmt(fixedExpenses)} · Лог: ${fmt(logisticsMonthTotal)} · COGS: ${fmt(cogsMonth)}`}
          accent="#F97316" bg="linear-gradient(135deg, #2d1400 0%, #0D1117 100%)" border="#F9731625" />
        <KpiCard icon="💎" title="Чистая прибыль" value={fmt(netProfit)}
          sub={`MRR ${fmt(mrr)} − Фикс − Лог − COGS`}
          accent={netProfit >= 0 ? '#10B981' : '#EF4444'}
          bg={netProfit >= 0 ? 'linear-gradient(135deg, #022c22 0%, #0D1117 100%)' : 'linear-gradient(135deg, #2d0e0e 0%, #0D1117 100%)'}
          border={netProfit >= 0 ? '#10B98135' : '#EF444435'}
          hero />
      </div>

      {/* ── Admin WhatsApp ────────────────────────────────────────────────── */}
      <div style={{
        background: '#0D1117', border: '1px solid #1a3a5c', borderRadius: 14,
        padding: '18px 22px', marginBottom: 28,
        display: 'flex', alignItems: 'flex-end', gap: 16, flexWrap: 'wrap',
      }}>
        <div style={{ flex: '1 1 260px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span style={{ fontSize: '1.1rem' }}>📱</span>
            <span style={{ fontWeight: 700, color: '#fff', fontSize: '0.9rem' }}>WhatsApp для уведомлений</span>
            {adminWaNumber && <span style={badgeStyle('#22C55E', '#0A1F0A')}>Настроен</span>}
            {!adminWaNumber && !adminWaLoading && <span style={badgeStyle('#EF4444', '#2D0E0E')}>Не задан</span>}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#6B7280', marginBottom: 10 }}>
            Формат: без «+», например <code style={{ color: '#0EA5E9' }}>971585973177</code>
          </div>
          <input type="text" placeholder="971585973177" value={adminWaInput}
            onChange={e => setAdminWaInput(e.target.value)} disabled={adminWaLoading}
            style={{ ...inputStyle, opacity: adminWaLoading ? 0.5 : 1 }} />
        </div>
        <button onClick={saveAdminWa}
          disabled={adminWaSaving || adminWaLoading || adminWaInput === adminWaNumber}
          style={{
            padding: '10px 22px', borderRadius: 8, border: 'none',
            background: (adminWaSaving || adminWaInput === adminWaNumber) ? '#1F2937' : 'linear-gradient(135deg, #0369A1 0%, #0EA5E9 100%)',
            color: (adminWaSaving || adminWaInput === adminWaNumber) ? '#4B5563' : '#fff',
            fontWeight: 700, fontSize: '0.85rem',
            cursor: (adminWaSaving || adminWaInput === adminWaNumber) ? 'default' : 'pointer',
            transition: 'all 0.15s', whiteSpace: 'nowrap', flexShrink: 0,
          }}>
          {adminWaSaving ? 'Сохранение...' : 'Сохранить'}
        </button>
      </div>

      {/* ── Section Tabs ─────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
            display: 'flex', alignItems: 'center', gap: 7,
            padding: '9px 18px', borderRadius: 10,
            border: activeTab === tab.id ? '1px solid #0EA5E9' : '1px solid #1F2937',
            background: activeTab === tab.id ? '#0EA5E918' : '#0D1117',
            color: activeTab === tab.id ? '#0EA5E9' : '#6B7280',
            fontWeight: 700, fontSize: '0.83rem', cursor: 'pointer', transition: 'all 0.15s',
          }}>
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* TAB: RETAINERS                                                      */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'retainers' && (
        <>
          <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
            <input type="text" placeholder="Поиск по имени / специализации..."
              value={search} onChange={e => setSearch(e.target.value)}
              style={{ flex: '1 1 220px', background: '#0c1624', border: '1px solid #1a3a5c', borderRadius: 8, padding: '9px 14px', color: '#e5e7eb', fontSize: '0.875rem', outline: 'none' }} />
            {(['all', 'retainer', 'other'] as const).map(f => (
              <button key={f} onClick={() => setFilterRetainer(f)} style={{
                padding: '8px 16px', borderRadius: 8,
                border: filterRetainer === f ? '1px solid #0EA5E9' : '1px solid #1F2937',
                background: filterRetainer === f ? '#0EA5E918' : '#0D1117',
                color: filterRetainer === f ? '#0EA5E9' : '#6B7280',
                fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
              }}>
                {f === 'all' ? 'Все' : f === 'retainer' ? 'Ретейнер' : 'Разовые'}
              </button>
            ))}
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', color: '#4B5563', padding: 40 }}>Загрузка...</div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#4B5563', padding: 40 }}>Клиентов не найдено</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {filtered.map(client => {
                const isEditing = !!editing[client.id];
                const state = editing[client.id];
                const days = getDaysUntil(isEditing ? state.next_payment_date : client.next_payment_date);
                const isRetainer = isEditing ? state.is_retainer : client.is_retainer;
                const videosThisMonth = clientVideosThisMonth(client.id);
                const clientCogs = videosThisMonth * DEFAULT_COST_PER_VIDEO;
                const clientRevenue = parseAmount(client.retainer_amount);

                return (
                  <div key={client.id} style={{
                    background: '#0D1117',
                    border: isRetainer ? `1px solid ${(days !== null && days <= 3) ? '#F97316' : '#22C55E'}30` : '1px solid #1F2937',
                    borderRadius: 14, padding: '18px 22px', transition: 'border-color 0.2s',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
                      <div style={{
                        width: 44, height: 44, borderRadius: 12,
                        background: isRetainer ? '#22C55E18' : '#1F2937',
                        border: isRetainer ? '1px solid #22C55E35' : '1px solid #374151',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '1.1rem', flexShrink: 0,
                      }}>
                        {isRetainer ? '💎' : '👤'}
                      </div>
                      <div style={{ flex: 1, minWidth: 180 }}>
                        <div style={{ fontWeight: 700, color: '#fff', fontSize: '0.95rem' }}>
                          {client.first_name} {client.last_name}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: '#6B7280', marginTop: 2 }}>
                          {client.profession || '—'}
                        </div>
                        {!isEditing && (
                          <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                            {client.is_retainer
                              ? <span style={badgeStyle('#22C55E', '#0A1F0A')}>Ретейнер</span>
                              : <span style={badgeStyle('#4B5563', '#1F2937')}>Разовый</span>}
                            {client.retainer_amount && <span style={badgeStyle('#0EA5E9', '#071B2E')}>{client.retainer_amount}</span>}
                            {client.is_retainer && clientRevenue > 0 && (
                              <MarginBadge revenue={clientRevenue} cogs={clientCogs} />
                            )}
                            {client.is_retainer && client.next_payment_date && (
                              <span style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>
                                {new Date(client.next_payment_date + 'T00:00:00').toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
                              </span>
                            )}
                            {client.is_retainer && <StatusBadge days={days} />}
                          </div>
                        )}
                        {/* Production counter row */}
                        {!isEditing && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10, flexWrap: 'wrap' }}>
                            <div style={{
                              display: 'flex', alignItems: 'center', gap: 6,
                              background: '#1e0a3c', border: '1px solid #A78BFA30',
                              borderRadius: 8, padding: '5px 10px',
                            }}>
                              <Film size={13} color="#A78BFA" />
                              <span style={{ fontSize: '0.78rem', color: '#9CA3AF' }}>Рилсов в этом месяце:</span>
                              <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#A78BFA' }}>{videosThisMonth}</span>
                              {clientCogs > 0 && (
                                <span style={{ fontSize: '0.7rem', color: '#6B7280' }}>({clientCogs} AED)</span>
                              )}
                            </div>
                            <button
                              onClick={() => setAddReelsClient(client)}
                              style={{
                                display: 'flex', alignItems: 'center', gap: 5,
                                padding: '5px 12px', borderRadius: 8,
                                border: '1px solid #A78BFA40', background: '#A78BFA12',
                                color: '#A78BFA', fontSize: '0.75rem', fontWeight: 700,
                                cursor: 'pointer', transition: 'all 0.15s',
                              }}
                              onMouseEnter={e => { e.currentTarget.style.background = '#A78BFA22'; }}
                              onMouseLeave={e => { e.currentTarget.style.background = '#A78BFA12'; }}
                            >
                              <Plus size={12} />Добавить рилсы
                            </button>
                          </div>
                        )}
                      </div>
                      {isEditing ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, flex: '1 1 280px', minWidth: 280 }}>
                          <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                            <input type="checkbox" checked={state.is_retainer}
                              onChange={e => setEditing(prev => ({ ...prev, [client.id]: { ...prev[client.id], is_retainer: e.target.checked } }))}
                              style={{ width: 16, height: 16, accentColor: '#22C55E', cursor: 'pointer' }} />
                            <span style={{ color: state.is_retainer ? '#22C55E' : '#9CA3AF', fontWeight: 600, fontSize: '0.85rem' }}>
                              {state.is_retainer ? 'Ретейнер активен' : 'Не на ретейнере'}
                            </span>
                          </label>
                          <div>
                            <div style={fieldLabel}>Сумма ретейнера</div>
                            <input type="text" placeholder="напр. 15000 AED" value={state.retainer_amount}
                              onChange={e => setEditing(prev => ({ ...prev, [client.id]: { ...prev[client.id], retainer_amount: e.target.value } }))}
                              disabled={!state.is_retainer} style={{ ...inputStyle, opacity: state.is_retainer ? 1 : 0.4 }} />
                          </div>
                          <div>
                            <div style={fieldLabel}>Следующий платёж</div>
                            <input type="date" value={state.next_payment_date}
                              onChange={e => setEditing(prev => ({ ...prev, [client.id]: { ...prev[client.id], next_payment_date: e.target.value } }))}
                              disabled={!state.is_retainer} style={{ ...inputStyle, colorScheme: 'dark', opacity: state.is_retainer ? 1 : 0.4 }} />
                          </div>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button onClick={() => saveClient(client.id)} disabled={saving[client.id]} style={{
                              flex: 1, padding: '9px 0', borderRadius: 8, border: 'none',
                              background: saving[client.id] ? '#1F2937' : 'linear-gradient(135deg, #15803D 0%, #16A34A 100%)',
                              color: saving[client.id] ? '#4B5563' : '#fff', fontWeight: 700, fontSize: '0.85rem',
                              cursor: saving[client.id] ? 'default' : 'pointer', transition: 'all 0.15s',
                            }}>
                              {saving[client.id] ? 'Сохранение...' : 'Сохранить'}
                            </button>
                            <button onClick={() => cancelEdit(client.id)} style={{
                              padding: '9px 18px', borderRadius: 8, border: '1px solid #374151',
                              background: 'transparent', color: '#6B7280', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer',
                            }}>Отмена</button>
                          </div>
                        </div>
                      ) : (
                        <button onClick={() => startEdit(client)} style={{
                          padding: '8px 18px', borderRadius: 8, border: '1px solid #1F2937',
                          background: 'transparent', color: '#9CA3AF', fontWeight: 600, fontSize: '0.8rem',
                          cursor: 'pointer', transition: 'all 0.15s', flexShrink: 0,
                        }}
                          onMouseEnter={e => { e.currentTarget.style.borderColor = '#0EA5E9'; e.currentTarget.style.color = '#0EA5E9'; }}
                          onMouseLeave={e => { e.currentTarget.style.borderColor = '#1F2937'; e.currentTarget.style.color = '#9CA3AF'; }}
                        >
                          Редактировать
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* TAB: FIXED EXPENSES                                                 */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'expenses' && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: '1rem', color: '#fff', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>📉</span><span>Расходы бизнеса</span>
                <span style={badgeStyle('#F97316', '#2D1400')}>Фиксированные</span>
              </div>
              <div style={{ fontSize: '0.78rem', color: '#6B7280', marginTop: 4 }}>
                Зарплаты, подписки и другие постоянные расходы.
              </div>
            </div>
            <button onClick={() => setShowAddExpense(true)} style={{
              display: 'flex', alignItems: 'center', gap: 7,
              padding: '10px 20px', borderRadius: 10, border: '1px solid #F9731640',
              background: '#F9731612', color: '#F97316', fontWeight: 700, fontSize: '0.85rem',
              cursor: 'pointer', transition: 'all 0.15s', flexShrink: 0,
            }}
              onMouseEnter={e => { e.currentTarget.style.background = '#F9731622'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#F9731612'; }}
            >
              <Plus size={16} />Добавить расход
            </button>
          </div>

          {expenses.length === 0 ? (
            <div style={{
              textAlign: 'center', padding: '36px 20px', background: '#0D1117',
              border: '1px dashed #1F2937', borderRadius: 14, color: '#4B5563', fontSize: '0.875rem',
            }}>
              Расходы ещё не добавлены.
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
              {expenses.map(exp => (
                <div key={exp.id} style={{
                  background: '#0D1117', border: '1px solid #1F2937', borderRadius: 12,
                  padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 14, transition: 'border-color 0.15s',
                }}
                  onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = '#F9731640'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = '#1F2937'; }}
                >
                  <div style={{
                    width: 40, height: 40, borderRadius: 10, background: '#F9731612', border: '1px solid #F9731630',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', flexShrink: 0,
                  }}>📉</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, color: '#E5E7EB', fontSize: '0.875rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {exp.title}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                      <span style={{ fontWeight: 800, color: '#F97316', fontSize: '0.9rem' }}>
                        {parseAmount(exp.amount).toLocaleString('en-US')} AED
                      </span>
                      {exp.is_monthly && <span style={badgeStyle('#F59E0B', '#2D1F00')}>ежемесячно</span>}
                    </div>
                  </div>
                  <button onClick={() => deleteExpense(exp.id)} disabled={deletingExpense === exp.id} style={{
                    background: 'none', border: '1px solid #374151', borderRadius: 8, padding: '7px',
                    cursor: deletingExpense === exp.id ? 'default' : 'pointer',
                    color: '#4B5563', display: 'flex', alignItems: 'center',
                    opacity: deletingExpense === exp.id ? 0.4 : 1, transition: 'all 0.15s', flexShrink: 0,
                  }}
                    onMouseEnter={e => { if (deletingExpense !== exp.id) { e.currentTarget.style.borderColor = '#EF4444'; e.currentTarget.style.color = '#EF4444'; } }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = '#374151'; e.currentTarget.style.color = '#4B5563'; }}
                  ><Trash2 size={15} /></button>
                </div>
              ))}
            </div>
          )}

          {expenses.length > 0 && (
            <div style={{
              marginTop: 16, padding: '14px 18px', background: '#0D1117',
              border: '1px solid #F9731625', borderRadius: 12,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10,
            }}>
              <span style={{ fontSize: '0.8rem', color: '#6B7280', fontWeight: 600 }}>
                Итого ({expenses.length} статей)
              </span>
              <span style={{ fontWeight: 800, fontSize: '1.05rem', color: '#F97316' }}>{fmt(fixedExpenses)}</span>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* TAB: LOGISTICS                                                       */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'logistics' && (
        <div>
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontWeight: 800, fontSize: '1rem', color: '#fff', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span>🚗</span><span>Логистика (Daily Logistics)</span>
              <span style={badgeStyle('#38BDF8', '#071b2e')}>Текущий месяц: {fmt(logisticsMonthTotal)}</span>
            </div>
            <div style={{ fontSize: '0.78rem', color: '#6B7280' }}>
              Ежедневные переменные расходы: такси, бензин, парковки. Сумма за текущий месяц учитывается в Чистой прибыли.
            </div>
          </div>

          {/* Quick-add form */}
          <div style={{
            background: '#0D1117', border: '1px solid #1a3a5c', borderRadius: 14,
            padding: '18px 20px', marginBottom: 24,
          }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#4B5563', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 14 }}>
              Быстрое добавление
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div style={{ flex: '0 0 140px' }}>
                <div style={fieldLabel}>Дата</div>
                <input type="date" value={logDate} onChange={e => setLogDate(e.target.value)}
                  style={{ ...inputStyle, colorScheme: 'dark' }} />
              </div>
              <div style={{ flex: '1 1 160px' }}>
                <div style={fieldLabel}>Категория</div>
                <select value={logCategory} onChange={e => setLogCategory(e.target.value)}
                  style={{ ...inputStyle, cursor: 'pointer' }}>
                  {LOGISTICS_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div style={{ flex: '0 0 120px' }}>
                <div style={fieldLabel}>Сумма (AED)</div>
                <input type="number" min="0" step="0.5" placeholder="0" value={logAmount}
                  onChange={e => setLogAmount(e.target.value)} style={inputStyle} />
              </div>
              <div style={{ flex: '1 1 180px' }}>
                <div style={fieldLabel}>Примечание</div>
                <input type="text" placeholder="напр. Съемка в Dubai Mall" value={logNote}
                  onChange={e => setLogNote(e.target.value)} style={inputStyle} />
              </div>
              <button onClick={addLogistics} disabled={logSaving} style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '9px 20px', borderRadius: 8, border: 'none',
                background: logSaving ? '#1F2937' : 'linear-gradient(135deg, #0369A1 0%, #38BDF8 100%)',
                color: logSaving ? '#4B5563' : '#fff', fontWeight: 700, fontSize: '0.85rem',
                cursor: logSaving ? 'default' : 'pointer', transition: 'all 0.15s',
                whiteSpace: 'nowrap', flexShrink: 0, height: 40,
              }}>
                <Plus size={15} />{logSaving ? 'Добавление...' : 'Добавить'}
              </button>
            </div>
          </div>

          {/* History table */}
          {logistics.length === 0 ? (
            <div style={{
              textAlign: 'center', padding: '36px 20px', background: '#0D1117',
              border: '1px dashed #1F2937', borderRadius: 14, color: '#4B5563', fontSize: '0.875rem',
            }}>
              Записей нет. Добавьте первую запись выше.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr>
                    {['Дата', 'Категория', 'Сумма', 'Примечание', ''].map((h, i) => (
                      <th key={i} style={{
                        textAlign: i === 2 ? 'right' : 'left',
                        padding: '10px 14px', color: '#4B5563',
                        fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.06em',
                        textTransform: 'uppercase', borderBottom: '1px solid #1F2937',
                        whiteSpace: 'nowrap',
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {logistics.map((log, idx) => {
                    const cs = getCatStyle(log.category);
                    const thisMonth = isCurrentMonth(log.date, curYear, curMonth);
                    return (
                      <tr key={log.id} style={{
                        borderBottom: '1px solid #111827',
                        background: idx % 2 === 0 ? '#0D1117' : '#080e17',
                        opacity: thisMonth ? 1 : 0.55,
                      }}>
                        <td style={{ padding: '12px 14px', color: '#9CA3AF', whiteSpace: 'nowrap' }}>
                          {formatDateRu(log.date)}
                          {thisMonth && <span style={{ ...badgeStyle('#22C55E', '#0A1F0A'), marginLeft: 6, fontSize: '0.62rem' }}>этот месяц</span>}
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <span style={badgeStyle(cs.color, cs.bg)}>{log.category}</span>
                        </td>
                        <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 700, color: '#F97316', whiteSpace: 'nowrap' }}>
                          {Number(log.amount).toLocaleString('en-US')} AED
                        </td>
                        <td style={{ padding: '12px 14px', color: '#6B7280', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {log.note || '—'}
                        </td>
                        <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                          <button onClick={() => deleteLogistics(log.id)} disabled={deletingLog === log.id} style={{
                            background: 'none', border: '1px solid #374151', borderRadius: 7, padding: '6px',
                            cursor: deletingLog === log.id ? 'default' : 'pointer',
                            color: '#4B5563', display: 'inline-flex', alignItems: 'center',
                            opacity: deletingLog === log.id ? 0.4 : 1, transition: 'all 0.15s',
                          }}
                            onMouseEnter={e => { if (deletingLog !== log.id) { e.currentTarget.style.borderColor = '#EF4444'; e.currentTarget.style.color = '#EF4444'; } }}
                            onMouseLeave={e => { e.currentTarget.style.borderColor = '#374151'; e.currentTarget.style.color = '#4B5563'; }}
                          ><Trash2 size={14} /></button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={2} style={{ padding: '12px 14px', color: '#6B7280', fontSize: '0.78rem', fontWeight: 600 }}>
                      Итого за текущий месяц ({currentMonthLogistics.length} записей)
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 800, color: '#F97316', fontSize: '1rem', whiteSpace: 'nowrap' }}>
                      {fmt(logisticsMonthTotal)}
                    </td>
                    <td colSpan={2} />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
