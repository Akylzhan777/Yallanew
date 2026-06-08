import { useCallback, useEffect, useRef, useState } from 'react';
import { DataProvider } from '../context/DataContext';
import { supabase, Product, Lead, BookingEvent, OperatorRow } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useAppSettings } from '../context/AppSettingsContext';
import ShootingsPanel from '../components/ShootingsPanel';
import LandingEditor from '../components/LandingEditor';
import TeamPanel from '../components/TeamPanel';
import PackagesEditor from '../components/PackagesEditor';
import AdminSettings from './admin/Settings';
import CrmPanel from './admin/CrmPanel';
import BillingPanel from './admin/BillingPanel';
import AdminTasksPanel from './admin/AdminTasksPanel';
import ShootingsAccountingPanel from './admin/ShootingsAccountingPanel';
import EditorsPanelComponent from './admin/EditorsPanel';
import LocationsPanel from './admin/LocationsPanel';
import RobotControlCenter from '../components/RobotControlCenter';
import InfluencersPanel from './admin/InfluencersPanel';
import EditingOrdersPanel from './admin/EditingOrdersPanel';
import PayoutsPanel from './admin/PayoutsPanel';
import AdminPresentation from './admin/AdminPresentation';
import WhatsAppPanel from './admin/WhatsAppPanel';
import BrandsPanel from './admin/BrandsPanel';
import { Calendar, Check, Search } from 'lucide-react';

type Tab = 'leads' | 'users' | 'shop' | 'calendar' | 'portfolio' | 'operators' | 'shootings' | 'landing' | 'team' | 'packages' | 'settings' | 'crm' | 'editors' | 'robot' | 'billing' | 'tasks' | 'shootings_accounting' | 'locations' | 'influencers' | 'editing_orders' | 'payouts' | 'presentation' | 'whatsapp' | 'promo_reviews' | 'creators_crm' | 'brands';

interface PortfolioClient {
  id: string;
  first_name: string;
  last_name: string;
  profession: string;
  duration: string;
  badge: string;
  stats: string;
  content_type: string;
  cover_img: string;
  videos: Array<{ type: 'iframe' | 'video'; src: string; title: string; poster?: string }>;
  sort_order: number;
  category: string;
  followers_count: string;
  case_task: string;
  case_solution: string;
  case_result: string;
}

const PORTFOLIO_CATEGORIES = [
  'Недвижимость',
  'Бьюти',
  'Фитнес',
  'Финансы',
  'Рестораны',
  'Технологии',
  'Мода',
  'Образование',
  'Другое',
];

const EMPTY_CLIENT: Omit<PortfolioClient, 'id' | 'sort_order'> & { sort_order: string } = {
  first_name: '', last_name: '', profession: '', duration: '',
  badge: 'REELS', stats: '', content_type: '', cover_img: '',
  videos: [], sort_order: '0', category: '', followers_count: '',
  case_task: '', case_solution: '', case_result: '',
};

type UserRow = {
  id: string;
  name: string;
  surname: string;
  balance: number;
  current_subs: string;
  is_admin: boolean;
  created_at: string;
};

const EMPTY_PRODUCT = { name: '', price: '', description: '', img_url: '' };

async function testTelegramNotification(): Promise<string> {
  try {
    const botToken = import.meta.env.VITE_TELEGRAM_BOT_TOKEN as string;
    const chatId = import.meta.env.VITE_TELEGRAM_CHAT_ID as string;
    if (!botToken || !chatId) return 'Ошибка: переменные VITE_TELEGRAM_BOT_TOKEN или VITE_TELEGRAM_CHAT_ID не заданы';

    const text = [
      '✅ ТЕСТ - YALLA PRODUCTION',
      '',
      '📸 НОВАЯ ЗАЯВКА - YALLA PRODUCTION',
      '',
      '👤 Оператор: Alex Test',
      '🗓 Дата: 1 января 2026',
      '⏰ Время: 11:00 – 13:00',
      '📍 Локация: Дубай Марина',
      '📞 WhatsApp: +7 999 000 00 00',
      '📝 Задача: Тестовое сообщение из админ-панели',
      '👤 Клиент: Тест Клиент',
    ].join('\n');

    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text }),
    });
    const json = await res.json();
    if (json.ok) return 'Сообщение отправлено! Проверьте Telegram.';
    return `Ошибка Telegram: ${json.description ?? JSON.stringify(json)}`;
  } catch (e) {
    return `Ошибка сети: ${String(e)}`;
  }
}

async function testDriverSchedule(): Promise<{ ok: boolean; message: string }> {
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
    const res = await fetch(`${supabaseUrl}/functions/v1/driver-daily-schedule`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseAnonKey}`,
      },
      body: JSON.stringify({}),
    });
    const json = await res.json();
    if (res.ok && json.ok) {
      return { ok: true, message: 'Сообщение отправлено Арману!' };
    }
    return { ok: false, message: json.reason ?? json.error ?? 'Ошибка отправки' };
  } catch (e) {
    return { ok: false, message: `Ошибка сети: ${String(e)}` };
  }
}

function AdminDashboardInner() {
  const { profile, loading } = useAuth();
  const { settings } = useAppSettings();
  const [tab, setTab] = useState<Tab>('shootings');
  const [tgTesting, setTgTesting] = useState(false);
  const [tgResult, setTgResult] = useState('');
  const [driverTesting, setDriverTesting] = useState(false);
  const [driverResult, setDriverResult] = useState<{ ok: boolean; message: string } | null>(null);

  const handleTestTelegram = async () => {
    setTgTesting(true);
    setTgResult('');
    const result = await testTelegramNotification();
    setTgResult(result);
    setTgTesting(false);
    setTimeout(() => setTgResult(''), 6000);
  };

  const handleTestDriver = async () => {
    setDriverTesting(true);
    setDriverResult(null);
    const result = await testDriverSchedule();
    setDriverResult(result);
    setDriverTesting(false);
    setTimeout(() => setDriverResult(null), 6000);
  };

  if (!loading && !profile) {
    window.location.replace('/login');
    return null;
  }

  if (loading || !profile) {
    return (
      <div className="admin-layout">
        <aside className="admin-sidebar">
          <div className="admin-logo">
            {settings.logo_url ? (
              <img src={settings.logo_url} alt="logo" style={{ height: 28, width: 28, objectFit: 'contain', borderRadius: 6 }} />
            ) : (
              <span>⚙️</span>
            )}
            <span>{settings.admin_panel_title}</span>
          </div>
        </aside>
        <main className="admin-main" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="admin-spinner" />
        </main>
      </div>
    );
  }

  const tabs: { id: Tab; icon: string; label: string }[] = [
    { id: 'shootings', icon: '🎬', label: 'Съёмки' },
    { id: 'crm', icon: '👥', label: 'CRM / Клиенты' },
    { id: 'leads', icon: '📋', label: 'Заявки' },
    { id: 'team', icon: '🔑', label: 'Команда / Доступы' },
    { id: 'users', icon: '🙍', label: 'Пользователи' },
    { id: 'portfolio', icon: '🖼️', label: 'Портфолио' },
    { id: 'shop', icon: '🛍️', label: 'Магазин' },
    { id: 'calendar', icon: '📅', label: 'Календарь' },
    { id: 'operators', icon: '🎥', label: 'Операторы' },
    { id: 'editors', icon: '✂️', label: 'Монтажеры' },
    { id: 'shootings_accounting', icon: '🎬', label: 'Учет съемок' },
    { id: 'locations', icon: '📍', label: 'Локации' },
    { id: 'robot', icon: '🤖', label: 'Сценарии Робота' },
    { id: 'billing', icon: '💰', label: 'Контроль оплат' },
    { id: 'tasks', icon: '🎯', label: 'Мои задачи' },
    { id: 'landing', icon: '🌐', label: 'Редактор сайта' },
    { id: 'presentation', icon: '🚀', label: 'Презентация' },
    { id: 'packages', icon: '💳', label: 'Пакеты баланса' },
    { id: 'settings', icon: '⚙️', label: 'Настройки платформы' },
    { id: 'influencers', icon: '⭐', label: 'Инфлюенсеры' },
    { id: 'editing_orders', icon: '🎬', label: 'Editing Orders' },
    { id: 'payouts', icon: '💸', label: 'Выплаты' },
    { id: 'whatsapp', icon: '💬', label: 'WhatsApp Marketing' },
    { id: 'promo_reviews', icon: '🎁', label: 'UGC Обзоры' },
    { id: 'creators_crm', icon: '📇', label: 'База креаторов' },
    { id: 'brands', icon: '🏢', label: 'Бренды / Клиенты' },
  ];

  const tabTitles: Record<Tab, string> = {
    shootings: 'Съёмки',
    crm: 'CRM / База клиентов',
    leads: 'Заявки на сотрудничество',
    team: 'Команда / Доступы',
    users: 'Управление пользователями',
    portfolio: 'Управление портфолио',
    shop: 'Управление магазином',
    calendar: 'Управление слотами',
    operators: 'Управление операторами',
    editors: 'Управление монтажерами',
    shootings_accounting: 'Учет съемок / Баланс клиентов',
    locations: 'Локации для съёмок',
    robot: 'Центр управления Роботом',
    billing: 'Контроль оплат / Ретейнеры',
    tasks: 'Мои задачи',
    landing: 'Редактор сайта',
    presentation: 'Управление презентацией',
    packages: 'Пакеты пополнения баланса',
    settings: 'Настройки платформы',
    influencers: 'Инфлюенсеры / Маркетплейс',
    editing_orders: 'Editing Orders',
    payouts: 'Управление выплатами',
    whatsapp: 'WhatsApp Marketing',
    promo_reviews: 'UGC Обзоры / Промо-задания',
    creators_crm: 'База креаторов (CRM)',
    brands: 'Бренды / Клиенты (CRM)',
  };

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <div className="admin-logo">
          {settings.logo_url ? (
            <img src={settings.logo_url} alt="logo" style={{ height: 28, width: 28, objectFit: 'contain', borderRadius: 6 }} />
          ) : (
            <span>⚙️</span>
          )}
          <span>{settings.admin_panel_title}</span>
        </div>
        <nav className="admin-nav">
          {tabs.map(t => (
            <button
              key={t.id}
              className={`admin-nav-btn ${tab === t.id ? 'active' : ''}`}
              onClick={() => setTab(t.id)}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </nav>
        <div className="admin-sidebar-footer">
          <div className="admin-sidebar-user">
            <div className="admin-sidebar-avatar">
              {profile.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{profile.name} {profile.surname}</div>
              <div style={{ fontSize: '0.75rem', color: '#00C48C' }}>Администратор</div>
            </div>
          </div>
          <button
            className="admin-back-btn"
            onClick={async () => { await supabase.auth.signOut(); window.location.replace('/'); }}
          >
            ← Вернуться в портал
          </button>
        </div>
      </aside>

      <main className="admin-main">
        <div className="admin-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h1 className="admin-title">{tabTitles[tab]}</h1>
            <div className="admin-badge">Admin</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            {tgResult && (
              <span style={{
                fontSize: '0.73rem',
                color: tgResult.startsWith('Ошибка') ? '#FF5C5C' : '#22c55e',
                background: tgResult.startsWith('Ошибка') ? '#FF5C5C12' : '#22c55e12',
                border: `1px solid ${tgResult.startsWith('Ошибка') ? '#FF5C5C44' : '#22c55e44'}`,
                borderRadius: 6,
                padding: '3px 8px',
                maxWidth: 220,
              }}>
                {tgResult}
              </span>
            )}
            {driverResult && (
              <span style={{
                fontSize: '0.73rem',
                color: driverResult.ok ? '#22c55e' : '#FF5C5C',
                background: driverResult.ok ? '#22c55e12' : '#FF5C5C12',
                border: `1px solid ${driverResult.ok ? '#22c55e44' : '#FF5C5C44'}`,
                borderRadius: 6,
                padding: '3px 8px',
                maxWidth: 240,
                whiteSpace: 'nowrap',
              }}>
                {driverResult.message}
              </span>
            )}
            <button
              onClick={handleTestDriver}
              disabled={driverTesting}
              style={{
                background: driverTesting ? '#1a1e2a' : 'linear-gradient(135deg, #0f6dbf, #0b55a0)',
                color: '#fff',
                border: '1px solid #2563EB55',
                borderRadius: 8,
                padding: '6px 14px',
                fontWeight: 600,
                fontSize: '0.78rem',
                cursor: driverTesting ? 'not-allowed' : 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s',
                opacity: driverTesting ? 0.7 : 1,
              }}
            >
              {driverTesting ? 'Отправка...' : 'Тест сообщения Арману'}
            </button>
            <button
              onClick={handleTestTelegram}
              disabled={tgTesting}
              style={{
                background: tgTesting ? '#1a2a1a' : 'linear-gradient(135deg, #1a8f4a, #14723a)',
                color: '#fff',
                border: '1px solid #22c55e55',
                borderRadius: 8,
                padding: '6px 14px',
                fontWeight: 600,
                fontSize: '0.78rem',
                cursor: tgTesting ? 'not-allowed' : 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s',
                opacity: tgTesting ? 0.7 : 1,
              }}
            >
              {tgTesting ? 'Отправка...' : 'Проверить Telegram'}
            </button>
          </div>
        </div>

        {tab === 'shootings' && (
          <>
            <MonthlyIncomeWidget />
            <ShootingsPanel />
          </>
        )}
        {tab === 'crm' && <CrmPanel />}
        {tab === 'leads' && <LeadsPanel />}
        {tab === 'team' && <TeamPanel />}
        {tab === 'users' && <UsersPanel />}
        {tab === 'portfolio' && <PortfolioPanel />}
        {tab === 'shop' && <ShopPanel />}
        {tab === 'calendar' && <CalendarPanel />}
        {tab === 'operators' && <OperatorsPanel />}
        {tab === 'editors' && <EditorsPanelComponent />}
        {tab === 'shootings_accounting' && <ShootingsAccountingPanel />}
        {tab === 'locations' && <LocationsPanel />}
        {tab === 'robot' && <RobotControlCenter />}
        {tab === 'billing' && <BillingPanel />}
        {tab === 'tasks' && <AdminTasksPanel />}
        {tab === 'landing' && <LandingEditor />}
        {tab === 'packages' && <PackagesEditor />}
        {tab === 'settings' && <AdminSettings />}
        {tab === 'influencers' && <InfluencersPanel />}
        {tab === 'editing_orders' && <EditingOrdersPanel />}
        {tab === 'payouts' && <PayoutsPanel />}
        {tab === 'presentation' && <AdminPresentation />}
        {tab === 'whatsapp' && <WhatsAppPanel />}
        {tab === 'promo_reviews' && <PromoReviewsPanel />}
        {tab === 'creators_crm' && <CreatorsCrmPanel />}
        {tab === 'brands' && <BrandsPanel />}
      </main>

      <nav className="admin-mobile-nav">
        {[
          { id: 'shootings' as Tab, label: 'Съёмки', icon: (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="15" height="12" rx="2"/><path d="M17 9.5l4-2v9l-4-2"/></svg>) },
          { id: 'leads' as Tab, label: 'Заявки', icon: (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>) },
          { id: 'operators' as Tab, label: 'Операторы', icon: (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>) },
          { id: 'landing' as Tab, label: 'Сайт', icon: (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>) },
          { id: 'users' as Tab, label: 'Люди', icon: (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>) },
        ].map(t => (
          <button key={t.id} className={`admin-mobile-tab ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>
            <span className="admin-mobile-tab-icon">{t.icon}</span>
            <span className="admin-mobile-tab-label">{t.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

/* ─── MONTHLY INCOME WIDGET ───────────────────────────────────────────────── */
function MonthlyIncomeWidget() {
  const [monthlyIncome, setMonthlyIncome] = useState<number | null>(null);
  const [prevMonthIncome, setPrevMonthIncome] = useState<number | null>(null);

  const fetchIncome = useCallback(async () => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).toISOString();

    const startOfPrev = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
    const endOfPrev = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999).toISOString();

    const [{ data: current }, { data: prev }] = await Promise.all([
      supabase
        .from('clients')
        .select('amount_paid')
        .eq('is_barter', false)
        .gte('last_payment_date', startOfMonth)
        .lte('last_payment_date', endOfMonth),
      supabase
        .from('clients')
        .select('amount_paid')
        .eq('is_barter', false)
        .gte('last_payment_date', startOfPrev)
        .lte('last_payment_date', endOfPrev),
    ]);

    const total = (current ?? []).reduce((s, c) => s + (c.amount_paid ?? 0), 0);
    const prevTotal = (prev ?? []).reduce((s, c) => s + (c.amount_paid ?? 0), 0);
    setMonthlyIncome(total);
    setPrevMonthIncome(prevTotal);
  }, []);

  useEffect(() => {
    fetchIncome();

    const sub = supabase
      .channel('monthly_income_watch')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'clients' }, () => {
        fetchIncome();
      })
      .subscribe();

    return () => { supabase.removeChannel(sub); };
  }, [fetchIncome]);

  const now = new Date();
  const monthName = now.toLocaleString('en-US', { month: 'long' });
  const diff = monthlyIncome !== null && prevMonthIncome !== null ? monthlyIncome - prevMonthIncome : null;
  const isUp = diff !== null && diff >= 0;

  return (
    <div style={{
      display: 'flex', alignItems: 'stretch', gap: 16,
      marginBottom: 24, flexWrap: 'wrap',
    }}>
      <div style={{
        flex: '1 1 260px',
        background: 'linear-gradient(135deg, rgba(0,196,140,0.08) 0%, rgba(0,140,100,0.04) 100%)',
        border: '1px solid rgba(0,196,140,0.22)',
        borderRadius: 14, padding: '20px 24px',
        display: 'flex', flexDirection: 'column', gap: 6,
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', right: 20, top: 16, opacity: 0.08 }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="#00C48C" stroke="none">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
          </svg>
        </div>
        <div style={{ fontSize: '0.7rem', color: '#6b7280', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Income — {monthName} {now.getFullYear()}
        </div>
        <div style={{ fontSize: '2rem', fontWeight: 900, color: '#00C48C', lineHeight: 1, letterSpacing: '-0.02em' }}>
          {monthlyIncome === null
            ? '...'
            : `${monthlyIncome.toLocaleString()} AED`
          }
        </div>
        {diff !== null && prevMonthIncome !== null && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 5,
            fontSize: '0.75rem', fontWeight: 600,
            color: isUp ? '#4ade80' : '#f87171',
          }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
              style={{ transform: isUp ? 'none' : 'rotate(180deg)' }}>
              <polyline points="18 15 12 9 6 15"/>
            </svg>
            {Math.abs(diff).toLocaleString()} AED vs last month
            {prevMonthIncome > 0 && (
              <span style={{ color: '#4b5563', fontWeight: 500 }}>
                ({Math.round(Math.abs(diff / prevMonthIncome) * 100)}%)
              </span>
            )}
          </div>
        )}
        <div style={{ fontSize: '0.7rem', color: '#374151', marginTop: 2 }}>
          Based on last_payment_date this month — non-barter clients only
        </div>
      </div>

      <div style={{
        flex: '0 0 auto',
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: 14, padding: '20px 24px',
        display: 'flex', flexDirection: 'column', gap: 6, minWidth: 160,
      }}>
        <div style={{ fontSize: '0.7rem', color: '#6b7280', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Last Month
        </div>
        <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#94a3b8', lineHeight: 1 }}>
          {prevMonthIncome === null ? '...' : `${prevMonthIncome.toLocaleString()} AED`}
        </div>
        <div style={{ fontSize: '0.7rem', color: '#374151' }}>
          {new Date(now.getFullYear(), now.getMonth() - 1, 1).toLocaleString('en-US', { month: 'long', year: 'numeric' })}
        </div>
      </div>
    </div>
  );
}

/* ─── LEADS PANEL ─────────────────────────────────────────────────────────── */
function LeadsPanel() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [converting, setConverting] = useState<string | null>(null);
  const [toast, setToast] = useState('');
  const [showCreate, setShowCreate] = useState<Lead | null>(null);
  const [newEmail, setNewEmail] = useState('');
  const [newPass, setNewPass] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const fetchLeads = async () => {
    const { data } = await supabase
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false });
    setLeads(data ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchLeads(); }, []);

  const markReviewed = async (lead: Lead) => {
    setConverting(lead.id);
    await supabase.from('leads').update({ status: 'reviewed' }).eq('id', lead.id);
    showToast('Статус обновлён');
    await fetchLeads();
    setConverting(null);
  };

  const openCreate = (lead: Lead) => {
    setShowCreate(lead);
    setNewEmail('');
    setNewPass('');
    setCreateError('');
  };

  const handleCreateAccount = async () => {
    if (!showCreate || !newEmail.trim() || newPass.length < 6) return;
    setCreating(true);
    setCreateError('');

    const { data, error: signUpError } = await supabase.auth.admin
      ? await (supabase as any).auth.admin.createUser({
          email: newEmail.trim(),
          password: newPass,
          email_confirm: true,
        })
      : { data: null, error: new Error('Admin API not available on client') };

    if (signUpError || !data?.user) {
      const nameParts = showCreate.name.trim().split(' ');
      const firstName = nameParts[0] ?? showCreate.name;
      const lastName = nameParts.slice(1).join(' ') || '';
      const referralCode = firstName.toUpperCase() + '_' + Math.random().toString(36).substring(2, 6).toUpperCase();

      const { data: signUpData, error: err2 } = await supabase.auth.signUp({
        email: newEmail.trim(),
        password: newPass,
        options: { data: { name: firstName, surname: lastName } }
      });

      if (err2 || !signUpData.user) {
        setCreateError(err2?.message ?? 'Ошибка создания аккаунта');
        setCreating(false);
        return;
      }

      await supabase.from('profiles').insert({
        id: signUpData.user.id,
        name: firstName,
        surname: lastName,
        dob: '',
        avatar_url: `https://placehold.co/200x200/1a8a6e/FFF?text=${firstName.charAt(0).toUpperCase()}`,
        balance: 3,
        referral_code: referralCode,
        invited_count: 0,
        earned_count: 0,
        current_subs: '0',
        start_subs: '0',
        growth: '+0',
        total_views: '0',
        videos_filmed: 0,
      });

      await supabase.from('leads').update({ status: 'converted' }).eq('id', showCreate.id);
      showToast(`Аккаунт для ${showCreate.name} создан`);
      setShowCreate(null);
      await fetchLeads();
    } else {
      const user = data.user;
      const nameParts = showCreate.name.trim().split(' ');
      const firstName = nameParts[0] ?? showCreate.name;
      const lastName = nameParts.slice(1).join(' ') || '';
      const referralCode = firstName.toUpperCase() + '_' + Math.random().toString(36).substring(2, 6).toUpperCase();

      await supabase.from('profiles').insert({
        id: user.id,
        name: firstName,
        surname: lastName,
        dob: '',
        avatar_url: `https://placehold.co/200x200/1a8a6e/FFF?text=${firstName.charAt(0).toUpperCase()}`,
        balance: 3,
        referral_code: referralCode,
        invited_count: 0,
        earned_count: 0,
        current_subs: '0',
        start_subs: '0',
        growth: '+0',
        total_views: '0',
        videos_filmed: 0,
      });

      await supabase.from('leads').update({ status: 'converted' }).eq('id', showCreate.id);
      showToast(`Аккаунт для ${showCreate.name} создан`);
      setShowCreate(null);
      await fetchLeads();
    }

    setCreating(false);
  };

  const statusColors: Record<string, string> = {
    new: '#FF9800',
    reviewed: '#00C48C',
    converted: '#5D5FEF',
  };
  const statusLabels: Record<string, string> = {
    new: 'Новая',
    reviewed: 'Просмотрена',
    converted: 'Конвертирована',
  };

  if (loading) return <AdminLoader />;

  return (
    <div>
      {toast && <div className="admin-toast">{toast}</div>}

      {showCreate && (
        <div className="admin-modal-overlay" onClick={() => setShowCreate(null)}>
          <div className="admin-modal" onClick={e => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3>Создать аккаунт клиента</h3>
              <button className="admin-modal-close" onClick={() => setShowCreate(null)}>✕</button>
            </div>
            <div className="admin-modal-body">
              <p style={{ color: '#8F90A6', marginBottom: 16 }}>
                Создание аккаунта для <strong style={{ color: '#fff' }}>{showCreate.name}</strong> ({showCreate.instagram})
              </p>
              <div className="admin-field">
                <label className="admin-label">Email для входа *</label>
                <input
                  className="admin-input"
                  type="email"
                  placeholder="client@email.com"
                  value={newEmail}
                  onChange={e => setNewEmail(e.target.value)}
                />
              </div>
              <div className="admin-field" style={{ marginTop: 12 }}>
                <label className="admin-label">Временный пароль * (мин. 6 символов)</label>
                <input
                  className="admin-input"
                  type="text"
                  placeholder="Придумайте пароль"
                  value={newPass}
                  onChange={e => setNewPass(e.target.value)}
                />
              </div>
              {createError && <p style={{ color: 'var(--danger)', fontSize: '0.85rem', marginTop: 8 }}>{createError}</p>}
            </div>
            <div className="admin-modal-footer">
              <button className="admin-btn-ghost" onClick={() => setShowCreate(null)}>Отмена</button>
              <button
                className="admin-btn-primary"
                onClick={handleCreateAccount}
                disabled={creating || !newEmail.trim() || newPass.length < 6}
              >
                {creating ? 'Создаём...' : 'Создать аккаунт'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="admin-stats-row">
        <div className="admin-stat-card">
          <div className="admin-stat-num">{leads.length}</div>
          <div className="admin-stat-lbl">Всего заявок</div>
        </div>
        <div className="admin-stat-card" style={{ '--stat-accent': '#FF9800' } as React.CSSProperties}>
          <div className="admin-stat-num">{leads.filter(l => l.status === 'new').length}</div>
          <div className="admin-stat-lbl">Новых</div>
        </div>
        <div className="admin-stat-card success">
          <div className="admin-stat-num">{leads.filter(l => l.status === 'converted').length}</div>
          <div className="admin-stat-lbl">Конвертированных</div>
        </div>
      </div>

      {leads.length === 0 ? (
        <div className="admin-empty">Заявок пока нет. Они появятся здесь после заполнения формы на сайте.</div>
      ) : (
        <div className="admin-leads-list">
          {leads.map(lead => (
            <div key={lead.id} className="admin-lead-card">
              <div className="admin-lead-avatar">
                {lead.name.charAt(0).toUpperCase()}
              </div>
              <div className="admin-lead-info">
                <div className="admin-lead-name">{lead.name}</div>
                <div className="admin-lead-insta">{lead.instagram}</div>
                <div className="admin-lead-goals">{lead.goals}</div>
              </div>
              <div className="admin-lead-meta">
                <span
                  className="admin-lead-status"
                  style={{ background: statusColors[lead.status] + '22', color: statusColors[lead.status] }}
                >
                  {statusLabels[lead.status] ?? lead.status}
                </span>
                <span className="admin-td-muted" style={{ fontSize: '0.78rem' }}>
                  {new Date(lead.created_at).toLocaleDateString('ru-RU')}
                </span>
              </div>
              <div className="admin-lead-actions">
                {lead.status === 'new' && (
                  <button
                    className="admin-edit-btn"
                    onClick={() => markReviewed(lead)}
                    disabled={converting === lead.id}
                  >
                    {converting === lead.id ? '...' : '✓ Просмотрена'}
                  </button>
                )}
                {lead.status !== 'converted' && (
                  <button
                    className="admin-btn-primary"
                    style={{ padding: '6px 14px', fontSize: '0.82rem' }}
                    onClick={() => openCreate(lead)}
                  >
                    + Создать аккаунт
                  </button>
                )}
                {lead.status === 'converted' && (
                  <span style={{ color: '#5D5FEF', fontSize: '0.82rem', fontWeight: 600 }}>
                    Аккаунт создан
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── USERS PANEL ─────────────────────────────────────────────────────────── */
const PAGE_SIZE = 20;

function UsersPanel() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [saving, setSaving] = useState<string | null>(null);
  const [edits, setEdits] = useState<Record<string, Partial<UserRow>>>({});
  const [toast, setToast] = useState('');
  const fetchedRef = useRef(false);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  };

  const fetchUsers = async (pageIndex: number, replace = false) => {
    setLoading(true);
    const { data } = await supabase
      .from('profiles')
      .select('id, name, surname, balance, current_subs, is_admin, created_at')
      .order('created_at', { ascending: false })
      .range(pageIndex * PAGE_SIZE, pageIndex * PAGE_SIZE + PAGE_SIZE - 1);
    const rows = data ?? [];
    setUsers(prev => replace ? rows : [...prev, ...rows]);
    setHasMore(rows.length === PAGE_SIZE);
    setLoading(false);
  };

  useEffect(() => {
    if (!fetchedRef.current) {
      fetchedRef.current = true;
      fetchUsers(0, true);
    }
  }, []);

  const getEdit = (id: string, field: keyof UserRow, fallback: unknown) =>
    edits[id]?.[field] !== undefined ? edits[id][field] : fallback;

  const setEdit = (id: string, field: keyof UserRow, value: unknown) => {
    setEdits(prev => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
  };

  const handleSave = async (user: UserRow) => {
    const patch = edits[user.id];
    if (!patch || Object.keys(patch).length === 0) return;
    setSaving(user.id);
    const { error } = await supabase.from('profiles').update(patch).eq('id', user.id);
    if (!error) {
      showToast(`Данные пользователя ${user.name} сохранены`);
      setEdits(prev => { const n = { ...prev }; delete n[user.id]; return n; });
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, ...patch } : u));
    }
    setSaving(null);
  };

  const loadMore = () => {
    const next = page + 1;
    setPage(next);
    fetchUsers(next);
  };

  const isDirty = (id: string) => edits[id] && Object.keys(edits[id]).length > 0;

  return (
    <div>
      {toast && <div className="admin-toast">{toast}</div>}
      {loading && users.length === 0 ? <AdminLoader /> : (
        <>
          <div className="admin-table-card">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Пользователь</th>
                  <th>Баланс (видео)</th>
                  <th>Подписчики</th>
                  <th>Роль</th>
                  <th>Зарегистрирован</th>
                  <th>Действия</th>
                </tr>
              </thead>
              <tbody>
                {users.map(user => (
                  <tr key={user.id} style={{ background: isDirty(user.id) ? 'rgba(93,95,239,0.04)' : undefined }}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div className="admin-user-avatar">
                          {(user.name || '?').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="admin-td-bold">{user.name} {user.surname}</div>
                          <div style={{ fontSize: '0.78rem', color: '#555', fontFamily: 'monospace' }}>
                            {user.id.slice(0, 8)}…
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <input
                        className="admin-inline-input"
                        type="number"
                        min={0}
                        value={getEdit(user.id, 'balance', user.balance) as number}
                        onChange={e => setEdit(user.id, 'balance', parseInt(e.target.value) || 0)}
                      />
                    </td>
                    <td>
                      <input
                        className="admin-inline-input"
                        type="text"
                        placeholder="15 200"
                        value={getEdit(user.id, 'current_subs', user.current_subs) as string}
                        onChange={e => setEdit(user.id, 'current_subs', e.target.value)}
                      />
                    </td>
                    <td>
                      <span className={`admin-role-badge ${user.is_admin ? 'admin' : 'user'}`}>
                        {user.is_admin ? 'Admin' : 'User'}
                      </span>
                    </td>
                    <td className="admin-td-muted">
                      {new Date(user.created_at).toLocaleDateString('ru-RU')}
                    </td>
                    <td>
                      <button
                        className="admin-save-btn"
                        onClick={() => handleSave(user)}
                        disabled={!isDirty(user.id) || saving === user.id}
                        style={{ opacity: isDirty(user.id) ? 1 : 0.35 }}
                      >
                        {saving === user.id ? '...' : '💾 Сохранить'}
                      </button>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && !loading && (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', color: '#555', padding: 30 }}>
                      Нет пользователей
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {hasMore && (
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: 16 }}>
              <button
                className="admin-btn-ghost"
                onClick={loadMore}
                disabled={loading}
                style={{ minWidth: 180 }}
              >
                {loading ? 'Загрузка...' : `Загрузить ещё (${PAGE_SIZE})`}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ─── SHOP PANEL ──────────────────────────────────────────────────────────── */
function ShopPanel() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(EMPTY_PRODUCT);
  const [editId, setEditId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const formRef = useRef<HTMLDivElement>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  };

  const fetchProducts = async () => {
    const { data } = await supabase.from('products').select('*').order('created_at');
    setProducts(data ?? []);
    setLoading(false);
  };
  useEffect(() => { fetchProducts(); }, []);

  const startEdit = (p: Product) => {
    setEditId(p.id);
    setForm({ name: p.name, price: p.price, description: p.description, img_url: p.img_url });
    formRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const cancelEdit = () => { setEditId(null); setForm(EMPTY_PRODUCT); };

  const handleSave = async () => {
    if (!form.name.trim() || !form.price.trim()) return;
    setSaving(true);
    if (editId) {
      await supabase.from('products').update({
        name: form.name, price: form.price, description: form.description, img_url: form.img_url,
      }).eq('id', editId);
      showToast(`Товар "${form.name}" обновлён`);
    } else {
      await supabase.from('products').insert({
        name: form.name, price: form.price, description: form.description, img_url: form.img_url,
      });
      showToast(`Товар "${form.name}" добавлен`);
    }
    cancelEdit();
    await fetchProducts();
    setSaving(false);
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Удалить товар "${name}"?`)) return;
    await supabase.from('products').delete().eq('id', id);
    showToast(`Товар удалён`);
    await fetchProducts();
  };

  return (
    <div>
      {toast && <div className="admin-toast">{toast}</div>}
      <div className="admin-form-card" ref={formRef}>
        <h3 className="admin-form-title">
          {editId ? '✏️ Редактировать товар' : '+ Добавить новый товар'}
        </h3>
        <div className="admin-form-grid">
          <div className="admin-field">
            <label className="admin-label">Название *</label>
            <input
              className="admin-input"
              placeholder="DJI Osmo Mobile 6"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            />
          </div>
          <div className="admin-field">
            <label className="admin-label">Цена *</label>
            <input
              className="admin-input"
              placeholder="15 990 ₽"
              value={form.price}
              onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
            />
          </div>
          <div className="admin-field admin-field-full">
            <label className="admin-label">Описание</label>
            <input
              className="admin-input"
              placeholder="Краткое описание товара"
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            />
          </div>
          <div className="admin-field admin-field-full">
            <label className="admin-label">URL изображения</label>
            <input
              className="admin-input"
              placeholder="https://example.com/image.jpg"
              value={form.img_url}
              onChange={e => setForm(f => ({ ...f, img_url: e.target.value }))}
            />
            {form.img_url && (
              <img
                src={form.img_url}
                alt="preview"
                className="admin-img-preview"
                onError={e => (e.currentTarget.style.display = 'none')}
              />
            )}
          </div>
        </div>
        <div className="admin-form-actions">
          <button
            className="admin-btn-primary"
            onClick={handleSave}
            disabled={saving || !form.name.trim() || !form.price.trim()}
          >
            {saving ? 'Сохранение...' : editId ? '💾 Сохранить изменения' : '+ Добавить товар'}
          </button>
          {editId && (
            <button className="admin-btn-ghost" onClick={cancelEdit}>Отмена</button>
          )}
        </div>
      </div>

      {loading ? <AdminLoader /> : (
        <div className="admin-table-card">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Фото</th>
                <th>Название</th>
                <th>Цена</th>
                <th>Описание</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              {products.map(p => (
                <tr key={p.id} style={{ background: editId === p.id ? 'rgba(93,95,239,0.05)' : undefined }}>
                  <td>
                    <img
                      src={p.img_url || 'https://placehold.co/60x45/252830/FFF?text=?'}
                      alt={p.name}
                      className="admin-thumb"
                      onError={e => (e.currentTarget.src = 'https://placehold.co/60x45/252830/FFF?text=?')}
                    />
                  </td>
                  <td className="admin-td-bold">{p.name}</td>
                  <td><span className="admin-price-tag">{p.price}</span></td>
                  <td className="admin-td-muted">{p.description}</td>
                  <td>
                    <div className="admin-row-actions">
                      <button className="admin-edit-btn" onClick={() => startEdit(p)}>✏️ Изменить</button>
                      <button className="admin-delete-btn" onClick={() => handleDelete(p.id, p.name)}>🗑️</button>
                    </div>
                  </td>
                </tr>
              ))}
              {products.length === 0 && (
                <tr><td colSpan={5} style={{ textAlign: 'center', color: '#555', padding: 30 }}>Нет товаров</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ─── CALENDAR PANEL ──────────────────────────────────────────────────────── */

const WORK_START = 9;
const WORK_END = 18;
const SLOT_STEP = 60;
const BUFFER_MINUTES = 60;

function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function minutesToTime(m: number): string {
  const h = Math.floor(m / 60);
  const min = m % 60;
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

function getAvailableSlots(bookings: BookingEvent[], dateStr: string): string[] {
  const dayBookings = bookings.filter(b => b.date === dateStr);
  const slots: string[] = [];
  for (let m = WORK_START * 60; m < WORK_END * 60; m += SLOT_STEP) {
    const slotStart = m;
    const slotEnd = m + SLOT_STEP;
    const blocked = dayBookings.some(b => {
      const bStart = timeToMinutes(b.start_time ?? '00:00');
      const bEnd = timeToMinutes(b.end_time ?? '00:00') + BUFFER_MINUTES;
      return slotStart < bEnd && slotEnd > bStart;
    });
    if (!blocked) slots.push(minutesToTime(slotStart));
  }
  return slots;
}

function isoDate(d: Date): string {
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const da = String(d.getDate()).padStart(2, '0');
  return `${y}-${mo}-${da}`;
}

function isWeekday(d: Date): boolean {
  const dow = d.getDay();
  return dow !== 0 && dow !== 6;
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function CalendarPanel() {
  const [bookings, setBookings] = useState<BookingEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [toast, setToast] = useState('');
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ startTime: '', endTime: '', clientName: '', notes: '' });
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const fetchBookings = async () => {
    const { data } = await supabase.from('booking_events').select('*').order('date').order('start_time');
    setBookings(data ?? []);
    setLoading(false);
  };
  useEffect(() => { fetchBookings(); }, []);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const calDays: Date[] = [];
  for (let i = 0; calDays.length < 28; i++) {
    const d = addDays(today, i);
    if (isWeekday(d)) calDays.push(d);
  }

  const weeks: Date[][] = [];
  for (let i = 0; i < calDays.length; i += 5) weeks.push(calDays.slice(i, i + 5));

  const availableSlots = selectedDate ? getAvailableSlots(bookings, selectedDate) : [];
  const dayBookings = selectedDate ? bookings.filter(b => b.date === selectedDate) : [];

  const openModal = () => {
    setForm({ startTime: '', endTime: '', clientName: '', notes: '' });
    setModal(true);
  };

  const handleBook = async () => {
    if (!form.clientName.trim() || !form.startTime || !form.endTime) {
      showToast('Заполните все обязательные поля');
      return;
    }
    if (timeToMinutes(form.endTime) <= timeToMinutes(form.startTime)) {
      showToast('Время окончания должно быть позже начала');
      return;
    }
    setSaving(true);
    const { error } = await supabase.from('booking_events').insert({
      date: selectedDate,
      start_time: form.startTime,
      end_time: form.endTime,
      client_name: form.clientName.trim(),
      notes: form.notes.trim(),
    });
    if (error) { showToast(`Ошибка: ${error.message}`); setSaving(false); return; }
    showToast('Бронирование добавлено');
    setModal(false);
    await fetchBookings();
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Удалить это бронирование?')) return;
    await supabase.from('booking_events').delete().eq('id', id);
    showToast('Бронирование удалено');
    await fetchBookings();
  };

  const totalBookings = bookings.length;
  const todayBookings = bookings.filter(b => b.date === isoDate(today)).length;

  const RU_DAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт'];
  const RU_MONTHS = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];

  function formatDateRu(d: Date): string {
    return `${d.getDate()} ${RU_MONTHS[d.getMonth()]}`;
  }

  return (
    <div>
      {toast && <div className="admin-toast">{toast}</div>}

      <div className="admin-stats-row">
        <div className="admin-stat-card">
          <div className="admin-stat-num">{totalBookings}</div>
          <div className="admin-stat-lbl">Всего броней</div>
        </div>
        <div className="admin-stat-card success">
          <div className="admin-stat-num">{todayBookings}</div>
          <div className="admin-stat-lbl">Сегодня</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-num">{BUFFER_MINUTES}м</div>
          <div className="admin-stat-lbl">Буфер на дорогу</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20, alignItems: 'start' }}>
        <div className="admin-form-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid #2C2F3A' }}>
            <h3 className="admin-form-title" style={{ margin: 0 }}>Календарь — ближайшие 4 недели</h3>
            <p style={{ color: '#8F90A6', fontSize: '0.82rem', margin: '4px 0 0' }}>
              Только рабочие дни (Пн–Пт). Нажмите на дату, чтобы увидеть слоты.
            </p>
          </div>
          <div style={{ padding: 20 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6, marginBottom: 8 }}>
              {RU_DAYS.map(d => (
                <div key={d} style={{ textAlign: 'center', fontSize: '0.75rem', color: '#8F90A6', fontWeight: 600, padding: '4px 0' }}>{d}</div>
              ))}
            </div>
            {weeks.map((week, wi) => (
              <div key={wi} style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6, marginBottom: 6 }}>
                {week.map(day => {
                  const ds = isoDate(day);
                  const isToday = ds === isoDate(new Date());
                  const isSelected = ds === selectedDate;
                  const dayBookingCount = bookings.filter(b => b.date === ds).length;
                  const available = getAvailableSlots(bookings, ds).length;
                  return (
                    <button
                      key={ds}
                      onClick={() => setSelectedDate(ds)}
                      style={{
                        background: isSelected ? '#2563EB' : isToday ? '#1a2a4a' : '#1A1D25',
                        border: isSelected ? '2px solid #2563EB' : isToday ? '2px solid #2563EB55' : '1px solid #2C2F3A',
                        borderRadius: 10,
                        padding: '10px 6px',
                        cursor: 'pointer',
                        textAlign: 'center',
                        transition: 'all 0.15s',
                        color: isSelected ? 'white' : '#e0e0e0',
                      }}
                    >
                      <div style={{ fontSize: '1rem', fontWeight: 700 }}>{day.getDate()}</div>
                      <div style={{ fontSize: '0.68rem', color: isSelected ? '#bbd5ff' : '#8F90A6', marginTop: 1 }}>{RU_MONTHS[day.getMonth()]}</div>
                      {dayBookingCount > 0 && (
                        <div style={{ marginTop: 4, display: 'flex', justifyContent: 'center', gap: 2 }}>
                          <span style={{
                            background: isSelected ? 'rgba(255,255,255,0.25)' : '#FF5C5C33',
                            color: isSelected ? 'white' : '#FF5C5C',
                            fontSize: '0.65rem',
                            fontWeight: 700,
                            borderRadius: 4,
                            padding: '1px 5px',
                          }}>{dayBookingCount} бр.</span>
                        </div>
                      )}
                      {available > 0 && dayBookingCount === 0 && (
                        <div style={{ marginTop: 4 }}>
                          <span style={{ background: '#00C48C22', color: '#00C48C', fontSize: '0.65rem', borderRadius: 4, padding: '1px 5px' }}>
                            {available} св.
                          </span>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {selectedDate ? (
            <>
              <div className="admin-form-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <div>
                    <div style={{ fontWeight: 700, color: '#e0e0e0', fontSize: '0.95rem' }}>
                      {(() => {
                        const d = new Date(selectedDate + 'T00:00:00');
                        return `${d.getDate()} ${RU_MONTHS[d.getMonth()]}, ${d.getFullYear()}`;
                      })()}
                    </div>
                    <div style={{ color: '#8F90A6', fontSize: '0.78rem', marginTop: 2 }}>
                      Рабочее время 09:00–18:00
                    </div>
                  </div>
                  <button
                    onClick={openModal}
                    style={{
                      background: 'linear-gradient(135deg, #2563EB, #1d4fd8)',
                      color: 'white',
                      border: 'none',
                      borderRadius: 10,
                      padding: '9px 18px',
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                      boxShadow: '0 3px 12px rgba(37,99,235,0.4)',
                    }}
                  >
                    + Забронировать
                  </button>
                </div>

                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: '0.78rem', color: '#8F90A6', fontWeight: 600, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Свободные слоты
                  </div>
                  {availableSlots.length === 0 ? (
                    <div style={{ color: '#FF5C5C', fontSize: '0.85rem', padding: '10px 0' }}>День полностью занят</div>
                  ) : (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {availableSlots.map(s => (
                        <span key={s} style={{
                          background: '#00C48C15',
                          border: '1px solid #00C48C44',
                          color: '#00C48C',
                          borderRadius: 7,
                          padding: '5px 12px',
                          fontSize: '0.82rem',
                          fontWeight: 600,
                        }}>{s}</span>
                      ))}
                    </div>
                  )}
                </div>

                {dayBookings.length > 0 && (
                  <div>
                    <div style={{ fontSize: '0.78rem', color: '#8F90A6', fontWeight: 600, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Бронирования
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {dayBookings.map(b => (
                        <div key={b.id} style={{
                          background: '#1A1D25',
                          border: '1px solid #FF5C5C33',
                          borderLeft: '3px solid #FF5C5C',
                          borderRadius: 8,
                          padding: '10px 12px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'flex-start',
                          gap: 8,
                        }}>
                          <div>
                            <div style={{ fontWeight: 700, color: '#e0e0e0', fontSize: '0.88rem' }}>
                              {(b.start_time ?? '').slice(0,5)} – {(b.end_time ?? '').slice(0,5)}
                              <span style={{ marginLeft: 8, fontSize: '0.72rem', color: '#FF5C5C', background: '#FF5C5C22', borderRadius: 4, padding: '1px 6px' }}>
                                +{BUFFER_MINUTES}м буфер
                              </span>
                            </div>
                            <div style={{ color: '#8F90A6', fontSize: '0.8rem', marginTop: 2 }}>{b.client_name}</div>
                            {b.notes && <div style={{ color: '#666', fontSize: '0.75rem', marginTop: 1 }}>{b.notes}</div>}
                          </div>
                          <button
                            onClick={() => handleDelete(b.id)}
                            style={{
                              background: 'transparent',
                              border: '1px solid #3E414B',
                              color: '#FF5C5C',
                              borderRadius: 6,
                              padding: '4px 8px',
                              cursor: 'pointer',
                              fontSize: '0.8rem',
                              flexShrink: 0,
                            }}
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="admin-form-card" style={{ textAlign: 'center', color: '#8F90A6', padding: 32 }}>
              <div style={{ fontSize: '2rem', marginBottom: 10 }}>📅</div>
              <div style={{ fontWeight: 600, marginBottom: 6 }}>Выберите дату</div>
              <div style={{ fontSize: '0.82rem' }}>Нажмите на любой день в календаре слева</div>
            </div>
          )}
        </div>
      </div>

      {modal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 100,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
        }}>
          <div style={{
            background: '#141620', border: '1px solid #2C2F3A', borderRadius: 20,
            padding: 32, width: '100%', maxWidth: 440, boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
          }}>
            <h3 style={{ margin: '0 0 6px', color: '#e0e0e0', fontSize: '1.1rem', fontWeight: 700 }}>
              Новое бронирование
            </h3>
            <p style={{ color: '#8F90A6', fontSize: '0.82rem', margin: '0 0 24px' }}>
              {(() => {
                const d = new Date(selectedDate + 'T00:00:00');
                return `${d.getDate()} ${RU_MONTHS[d.getMonth()]}, ${d.getFullYear()}`;
              })()}
              {' · '}рабочее время 09:00–18:00
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="admin-field">
                <label className="admin-label">Имя клиента *</label>
                <input
                  className="admin-input"
                  placeholder="Ahmed Al Rashidi"
                  value={form.clientName}
                  onChange={e => setForm(f => ({ ...f, clientName: e.target.value }))}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="admin-field">
                  <label className="admin-label">Начало *</label>
                  <select
                    className="admin-input"
                    value={form.startTime}
                    onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))}
                    style={{ cursor: 'pointer' }}
                  >
                    <option value="">— выберите</option>
                    {availableSlots.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="admin-field">
                  <label className="admin-label">Конец *</label>
                  <select
                    className="admin-input"
                    value={form.endTime}
                    onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))}
                    style={{ cursor: 'pointer' }}
                  >
                    <option value="">— выберите</option>
                    {Array.from({ length: (WORK_END - WORK_START) }, (_, i) => minutesToTime((WORK_START + i + 1) * 60))
                      .filter(t => !form.startTime || timeToMinutes(t) > timeToMinutes(form.startTime))
                      .map(s => <option key={s} value={s}>{s}</option>)
                    }
                  </select>
                </div>
              </div>
              {form.startTime && form.endTime && (
                <div style={{
                  background: '#2563EB15',
                  border: '1px solid #2563EB44',
                  borderRadius: 8,
                  padding: '10px 14px',
                  fontSize: '0.82rem',
                  color: '#7EB3FF',
                }}>
                  Съемка: {form.startTime}–{form.endTime} · Буфер до {minutesToTime(timeToMinutes(form.endTime) + BUFFER_MINUTES)} · Следующий клиент не раньше {minutesToTime(Math.min(timeToMinutes(form.endTime) + BUFFER_MINUTES, WORK_END * 60))}
                </div>
              )}
              <div className="admin-field">
                <label className="admin-label">Заметки</label>
                <input
                  className="admin-input"
                  placeholder="Дополнительная информация..."
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
              <button
                onClick={handleBook}
                disabled={saving || !form.clientName.trim() || !form.startTime || !form.endTime}
                style={{
                  flex: 1,
                  background: 'linear-gradient(135deg, #2563EB, #1d4fd8)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 10,
                  padding: '13px 20px',
                  fontWeight: 700,
                  fontSize: '0.95rem',
                  cursor: saving ? 'not-allowed' : 'pointer',
                  opacity: (!form.clientName.trim() || !form.startTime || !form.endTime) ? 0.5 : 1,
                  boxShadow: '0 4px 16px rgba(37,99,235,0.35)',
                }}
              >
                {saving ? 'Сохранение...' : 'Забронировать'}
              </button>
              <button
                onClick={() => setModal(false)}
                style={{
                  background: 'transparent',
                  border: '1px solid #3E414B',
                  color: '#8F90A6',
                  borderRadius: 10,
                  padding: '13px 20px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── PORTFOLIO PANEL ─────────────────────────────────────────────────────── */
function PortfolioPanel() {
  const [clients, setClients] = useState<PortfolioClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ ...EMPTY_CLIENT });
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const [videoRows, setVideoRows] = useState<{ src: string; title: string; poster: string }[]>([{ src: '', title: '', poster: '' }]);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingPoster, setUploadingPoster] = useState<number | null>(null);
  const [uploadingVideo, setUploadingVideo] = useState<number | null>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const posterInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const videoInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const formRef = useRef<HTMLDivElement>(null);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2500); };

  const handleCoverUpload = async (file: File) => {
    setUploadingCover(true);
    const ext = file.name.split('.').pop();
    const path = `portfolio-covers/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabase.storage.from('operator-photos').upload(path, file, { upsert: false });
    if (error) { showToast(`Ошибка загрузки: ${error.message}`); setUploadingCover(false); return; }
    const { data: urlData } = supabase.storage.from('operator-photos').getPublicUrl(path);
    setForm(f => ({ ...f, cover_img: urlData.publicUrl }));
    setUploadingCover(false);
  };

  const handlePosterUpload = async (file: File, rowIndex: number) => {
    setUploadingPoster(rowIndex);
    const ext = file.name.split('.').pop();
    const path = `video-posters/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabase.storage.from('portfolio-images').upload(path, file, { upsert: false });
    if (error) { showToast(`Ошибка загрузки обложки: ${error.message}`); setUploadingPoster(null); return; }
    const { data: urlData } = supabase.storage.from('portfolio-images').getPublicUrl(path);
    updateVideoRow(rowIndex, 'poster', urlData.publicUrl);
    setUploadingPoster(null);
  };

  const handleVideoUpload = async (file: File, rowIndex: number) => {
    setUploadingVideo(rowIndex);
    const ext = file.name.split('.').pop();
    const path = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabase.storage.from('portfolio-videos').upload(path, file, { upsert: false });
    if (error) { showToast(`Ошибка загрузки видео: ${error.message}`); setUploadingVideo(null); return; }
    const { data: urlData } = supabase.storage.from('portfolio-videos').getPublicUrl(path);
    updateVideoRow(rowIndex, 'src', urlData.publicUrl);
    setUploadingVideo(null);
  };

  const fetchClients = async () => {
    const { data } = await supabase
      .from('portfolio_clients')
      .select('*')
      .order('sort_order');
    setClients(data ?? []);
    setLoading(false);
  };
  useEffect(() => { fetchClients(); }, []);

  const detectPlatform = (url: string): string => {
    if (!url.trim()) return '';
    if (url.match(/youtube\.com|youtu\.be/)) return 'YouTube';
    if (url.match(/vimeo\.com/)) return 'Vimeo';
    if (url.match(/tiktok\.com/)) return 'TikTok';
    if (url.match(/instagram\.com/)) return 'Instagram';
    if (url.match(/\.(mp4|webm|ogg)/i)) return 'Видео файл';
    return 'Ссылка';
  };

  const addVideoRow = () => setVideoRows(r => [...r, { src: '', title: '', poster: '' }]);
  const removeVideoRow = (i: number) => setVideoRows(r => r.filter((_, idx) => idx !== i));
  const updateVideoRow = (i: number, field: 'src' | 'title' | 'poster', val: string) =>
    setVideoRows(r => r.map((row, idx) => idx === i ? { ...row, [field]: val } : row));

  const startEdit = (c: PortfolioClient) => {
    setEditId(c.id);
    setForm({
      first_name: c.first_name,
      last_name: c.last_name,
      profession: c.profession,
      duration: c.duration,
      badge: c.badge,
      stats: c.stats,
      content_type: c.content_type,
      cover_img: c.cover_img,
      videos: c.videos,
      sort_order: String(c.sort_order),
      category: c.category ?? '',
      followers_count: c.followers_count ?? '',
      case_task: c.case_task ?? '',
      case_solution: c.case_solution ?? '',
      case_result: c.case_result ?? '',
    });
    setVideoRows(c.videos.length > 0
      ? c.videos.map(v => ({ src: v.src, title: v.title, poster: v.poster ?? '' }))
      : [{ src: '', title: '', poster: '' }]
    );
    formRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setEditId(null);
    setForm({ ...EMPTY_CLIENT });
    setVideoRows([{ src: '', title: '', poster: '' }]);
  };

  const handleSave = async () => {
    if (!form.first_name.trim() || !form.last_name.trim()) {
      showToast('Заполните имя и фамилию');
      return;
    }
    setSaving(true);
    const videos = videoRows
      .filter(r => r.src.trim())
      .map(r => ({ type: 'iframe' as const, src: r.src.trim(), title: r.title.trim() || r.src.trim(), poster: r.poster.trim() || undefined }));
    const payload = {
      first_name: form.first_name.trim(),
      last_name: form.last_name.trim(),
      profession: form.profession.trim(),
      duration: form.duration.trim(),
      badge: form.badge.trim().toUpperCase(),
      stats: form.stats.trim(),
      content_type: form.content_type.trim().toUpperCase(),
      cover_img: form.cover_img.trim(),
      videos,
      sort_order: parseInt(form.sort_order) || 0,
      category: form.category.trim(),
      followers_count: form.followers_count.trim(),
      case_task: form.case_task.trim(),
      case_solution: form.case_solution.trim(),
      case_result: form.case_result.trim(),
    };
    if (editId) {
      const { error } = await supabase.from('portfolio_clients').update(payload).eq('id', editId);
      if (error) { showToast(`Ошибка: ${error.message}`); setSaving(false); return; }
      showToast(`Клиент "${payload.first_name} ${payload.last_name}" обновлён`);
    } else {
      const { error } = await supabase.from('portfolio_clients').insert(payload);
      if (error) { showToast(`Ошибка: ${error.message}`); setSaving(false); return; }
      showToast(`Клиент "${payload.first_name} ${payload.last_name}" добавлен`);
    }
    cancelEdit();
    await fetchClients();
    setSaving(false);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Удалить клиента "${name}"?`)) return;
    await supabase.from('portfolio_clients').delete().eq('id', id);
    showToast('Клиент удалён');
    await fetchClients();
  };

  return (
    <div>
      {toast && <div className="admin-toast">{toast}</div>}

      <div className="admin-form-card" ref={formRef}>
        <h3 className="admin-form-title">
          {editId ? '✏️ Редактировать клиента' : '+ Добавить нового клиента'}
        </h3>
        <div className="admin-form-grid">
          <div className="admin-field">
            <label className="admin-label">Имя *</label>
            <input className="admin-input" placeholder="Ahmed" value={form.first_name}
              onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))} />
          </div>
          <div className="admin-field">
            <label className="admin-label">Фамилия *</label>
            <input className="admin-input" placeholder="Al Rashidi" value={form.last_name}
              onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))} />
          </div>
          <div className="admin-field">
            <label className="admin-label">Профессия</label>
            <input className="admin-input" placeholder="Top Real Estate Broker" value={form.profession}
              onChange={e => setForm(f => ({ ...f, profession: e.target.value }))} />
          </div>
          <div className="admin-field">
            <label className="admin-label">Срок работы</label>
            <input className="admin-input" placeholder="14 месяцев" value={form.duration}
              onChange={e => setForm(f => ({ ...f, duration: e.target.value }))} />
          </div>
          <div className="admin-field">
            <label className="admin-label">Бейдж (REELS / STORIES)</label>
            <input className="admin-input" placeholder="REELS" value={form.badge}
              onChange={e => setForm(f => ({ ...f, badge: e.target.value }))} />
          </div>
          <div className="admin-field">
            <label className="admin-label">Категория (ниша) *</label>
            <select
              className="admin-input"
              value={form.category}
              onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
            >
              <option value="">— выберите категорию —</option>
              {PORTFOLIO_CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
          <div className="admin-field">
            <label className="admin-label">Подписчики (e.g. 150K)</label>
            <input className="admin-input" placeholder="150K" value={form.followers_count}
              onChange={e => setForm(f => ({ ...f, followers_count: e.target.value }))} />
          </div>
          <div className="admin-field">
            <label className="admin-label">Статистика</label>
            <input className="admin-input" placeholder="2.4M views" value={form.stats}
              onChange={e => setForm(f => ({ ...f, stats: e.target.value }))} />
          </div>
          <div className="admin-field">
            <label className="admin-label">Тип контента</label>
            <input className="admin-input" placeholder="EXPERT CONTENT" value={form.content_type}
              onChange={e => setForm(f => ({ ...f, content_type: e.target.value }))} />
          </div>
          <div className="admin-field">
            <label className="admin-label">Порядок отображения</label>
            <input className="admin-input" type="number" placeholder="1" value={form.sort_order}
              onChange={e => setForm(f => ({ ...f, sort_order: e.target.value }))} />
          </div>
          <div className="admin-field admin-field-full">
            <label className="admin-label">Обложка (фото)</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {form.cover_img ? (
                <img
                  src={form.cover_img}
                  alt="cover preview"
                  style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover', border: '2px solid #2a2d38', flexShrink: 0 }}
                  onError={e => (e.currentTarget.style.display = 'none')}
                />
              ) : (
                <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#1a1c24', border: '2px dashed #3E414B', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: '1.2rem', color: '#555' }}>👤</span>
                </div>
              )}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <input
                  ref={coverInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleCoverUpload(f); e.target.value = ''; }}
                />
                <button
                  type="button"
                  onClick={() => coverInputRef.current?.click()}
                  disabled={uploadingCover}
                  style={{
                    background: uploadingCover ? '#1a1c24' : '#16181f',
                    border: '1px solid #3E414B',
                    color: uploadingCover ? '#555' : '#e0e0e0',
                    borderRadius: 8,
                    padding: '8px 16px',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: uploadingCover ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    transition: 'border-color 0.15s',
                    alignSelf: 'flex-start',
                  }}
                >
                  {uploadingCover ? (
                    <>
                      <span style={{ width: 14, height: 14, border: '2px solid #555', borderTopColor: '#2563EB', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />
                      Загрузка...
                    </>
                  ) : (
                    <>
                      <span style={{ fontSize: '1rem' }}>📁</span>
                      {form.cover_img ? 'Заменить фото' : 'Загрузить фото'}
                    </>
                  )}
                </button>
                <input
                  className="admin-input"
                  placeholder="или вставьте URL вручную..."
                  value={form.cover_img}
                  onChange={e => setForm(f => ({ ...f, cover_img: e.target.value }))}
                  style={{ fontSize: '0.8rem' }}
                />
              </div>
            </div>
          </div>
          <div className="admin-field admin-field-full">
            <label className="admin-label">Видео / Ролики</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {videoRows.map((row, i) => (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '12px', background: '#1a1c24', borderRadius: 10, border: '1px solid #2a2d38' }}>
                  {/* row header: title + remove */}
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input
                      className="admin-input"
                      placeholder="Подпись к видео"
                      value={row.title}
                      onChange={e => updateVideoRow(i, 'title', e.target.value)}
                      style={{ flex: 1 }}
                    />
                    <button
                      onClick={() => removeVideoRow(i)}
                      title="Удалить"
                      style={{
                        background: 'transparent',
                        border: '1px solid #3E414B',
                        color: '#FF5C5C',
                        borderRadius: 8,
                        padding: '8px 10px',
                        cursor: 'pointer',
                        flexShrink: 0,
                        fontSize: '1rem',
                        lineHeight: 1,
                      }}
                    >✕</button>
                  </div>

                  {/* video file upload */}
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input
                      ref={el => { videoInputRefs.current[i] = el; }}
                      type="file"
                      accept="video/mp4,video/webm,video/mov,video/*"
                      style={{ display: 'none' }}
                      onChange={e => { const f = e.target.files?.[0]; if (f) handleVideoUpload(f, i); e.target.value = ''; }}
                    />
                    <button
                      type="button"
                      onClick={() => videoInputRefs.current[i]?.click()}
                      disabled={uploadingVideo === i}
                      style={{
                        flex: 1,
                        background: '#16181f',
                        border: `1px dashed ${row.src && /\.(mp4|webm|mov)/i.test(row.src) ? '#00C48C' : '#3E414B'}`,
                        color: uploadingVideo === i ? '#555' : (row.src && /\.(mp4|webm|mov)/i.test(row.src) ? '#00C48C' : '#e0e0e0'),
                        borderRadius: 8,
                        padding: '9px 14px',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        cursor: uploadingVideo === i ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        transition: 'all 0.15s',
                        textAlign: 'left' as const,
                      }}
                    >
                      {uploadingVideo === i ? (
                        <>
                          <span style={{ width: 13, height: 13, border: '2px solid #555', borderTopColor: '#2563EB', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite', flexShrink: 0 }} />
                          Загрузка видео...
                        </>
                      ) : row.src && /\.(mp4|webm|mov)/i.test(row.src) ? (
                        <>
                          <span style={{ fontSize: '0.9rem' }}>✅</span>
                          Видео загружено — заменить
                        </>
                      ) : (
                        <>
                          <span style={{ fontSize: '0.9rem' }}>🎬</span>
                          Загрузить видео (MP4 / WebM)
                        </>
                      )}
                    </button>
                  </div>

                  {/* URL fallback */}
                  <div>
                    <input
                      className="admin-input"
                      placeholder="или вставьте URL вручную (YouTube, Vimeo...)"
                      value={row.src}
                      onChange={e => updateVideoRow(i, 'src', e.target.value)}
                      style={{ fontSize: '0.8rem' }}
                    />
                    {row.src && (
                      <span style={{ fontSize: '0.73rem', color: '#00C48C', marginTop: 3, display: 'block' }}>
                        {detectPlatform(row.src)}
                      </span>
                    )}
                  </div>

                  {/* poster upload */}
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input
                      ref={el => { posterInputRefs.current[i] = el; }}
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={e => { const f = e.target.files?.[0]; if (f) handlePosterUpload(f, i); e.target.value = ''; }}
                    />
                    <button
                      type="button"
                      onClick={() => posterInputRefs.current[i]?.click()}
                      disabled={uploadingPoster === i}
                      style={{
                        flex: 1,
                        background: '#16181f',
                        border: `1px dashed ${row.poster ? '#00C48C55' : '#2a2d38'}`,
                        color: uploadingPoster === i ? '#555' : (row.poster ? '#00C48C' : '#555'),
                        borderRadius: 8,
                        padding: '7px 14px',
                        fontSize: '0.78rem',
                        fontWeight: 500,
                        cursor: uploadingPoster === i ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        transition: 'all 0.15s',
                        textAlign: 'left' as const,
                      }}
                    >
                      {uploadingPoster === i ? (
                        <>
                          <span style={{ width: 12, height: 12, border: '2px solid #555', borderTopColor: '#2563EB', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite', flexShrink: 0 }} />
                          Загрузка обложки...
                        </>
                      ) : row.poster ? (
                        <>
                          <span>✅</span> Обложка загружена — заменить
                        </>
                      ) : (
                        <>
                          <span>🖼️</span> Загрузить обложку (опционально)
                        </>
                      )}
                    </button>
                    {row.poster && (
                      <img
                        src={row.poster}
                        alt="thumb preview"
                        style={{ width: 32, height: 56, objectFit: 'cover', borderRadius: 5, flexShrink: 0, border: '1px solid #00C48C44' }}
                        onError={e => (e.currentTarget.style.display = 'none')}
                      />
                    )}
                  </div>
                </div>
              ))}
              <button
                onClick={addVideoRow}
                style={{
                  alignSelf: 'flex-start',
                  background: 'transparent',
                  border: '1px dashed #3E414B',
                  color: '#2563EB',
                  borderRadius: 8,
                  padding: '8px 18px',
                  fontSize: '0.88rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'border-color 0.15s, background 0.15s',
                }}
              >
                + Добавить ещё видео
              </button>
            </div>
            <span style={{ color: '#444', fontSize: '0.75rem', marginTop: 6, display: 'block' }}>
              Загрузите MP4/WebM или вставьте YouTube/Vimeo ссылку
            </span>
          </div>

          <div className="admin-field admin-field-full" style={{ marginTop: 8 }}>
            <label className="admin-label" style={{ fontSize: '0.95rem', fontWeight: 700, color: '#e0e0e0', marginBottom: 12, display: 'block' }}>
              Кейс (Case Study)
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <label className="admin-label">Задача</label>
                <textarea
                  className="admin-input"
                  rows={3}
                  placeholder="Упаковать личный бренд эксперта, увеличить охваты и привлечь новых клиентов через Reels..."
                  value={form.case_task}
                  onChange={e => setForm(f => ({ ...f, case_task: e.target.value }))}
                  style={{ resize: 'vertical', lineHeight: 1.5 }}
                />
              </div>
              <div>
                <label className="admin-label">Решение</label>
                <textarea
                  className="admin-input"
                  rows={3}
                  placeholder="Пакет Безлимит: 8 Reels в месяц, профессиональная съёмка, монтаж с субтитрами..."
                  value={form.case_solution}
                  onChange={e => setForm(f => ({ ...f, case_solution: e.target.value }))}
                  style={{ resize: 'vertical', lineHeight: 1.5 }}
                />
              </div>
              <div>
                <label className="admin-label">Результат</label>
                <textarea
                  className="admin-input"
                  rows={3}
                  placeholder="Охваты выросли на 340% за 3 месяца, пришло 12 новых клиентов из Reels..."
                  value={form.case_result}
                  onChange={e => setForm(f => ({ ...f, case_result: e.target.value }))}
                  style={{ resize: 'vertical', lineHeight: 1.5 }}
                />
              </div>
            </div>
          </div>
        </div>
        <div style={{
          position: 'sticky',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 20,
          background: 'linear-gradient(to top, #141620 70%, transparent)',
          padding: '20px 0 4px',
          marginTop: 24,
          display: 'flex',
          gap: 12,
          alignItems: 'center',
        }}>
          <button
            onClick={handleSave}
            disabled={saving || !form.first_name.trim() || !form.last_name.trim()}
            style={{
              background: saving ? '#444' : 'linear-gradient(135deg, #2563EB 0%, #1d4fd8 100%)',
              color: 'white',
              border: 'none',
              padding: '14px 36px',
              borderRadius: 12,
              fontWeight: 700,
              fontSize: '1rem',
              cursor: saving ? 'not-allowed' : 'pointer',
              opacity: (!form.first_name.trim() || !form.last_name.trim()) ? 0.5 : 1,
              boxShadow: '0 4px 24px rgba(37,99,235,0.45)',
              minWidth: 240,
              transition: 'all 0.2s',
              letterSpacing: '0.02em',
            }}
          >
            {saving ? 'Сохранение...' : editId ? 'Сохранить изменения' : 'Добавить клиента'}
          </button>
          {editId && (
            <button
              onClick={cancelEdit}
              style={{
                background: 'transparent',
                color: '#8F90A6',
                border: '1px solid #3E414B',
                padding: '14px 24px',
                borderRadius: 12,
                fontWeight: 600,
                fontSize: '0.95rem',
                cursor: 'pointer',
              }}
            >
              Отмена
            </button>
          )}
        </div>
      </div>

      {loading ? <AdminLoader /> : clients.length === 0 ? (
        <div className="admin-empty">Нет клиентов в портфолио. Добавьте первого!</div>
      ) : (
        <div className="admin-gallery-grid">
          {clients.map(c => (
            <div key={c.id} className="admin-gallery-card">
              <img
                src={c.cover_img || 'https://placehold.co/260x160/111/555?text=No+Image'}
                alt={c.first_name}
                className="admin-gallery-thumb"
                onError={e => (e.currentTarget.src = 'https://placehold.co/260x160/111/555?text=No+Image')}
              />
              <div className="admin-gallery-info">
                <div className="admin-gallery-title">{c.first_name} {c.last_name}</div>
                <div className="admin-gallery-meta">
                  {c.category && <span style={{ color: '#60a5fa', fontWeight: 600 }}>{c.category} · </span>}
                  {c.followers_count && <span>{c.followers_count} · </span>}
                  {c.profession} · {c.stats} · {c.videos.length} видео
                </div>
              </div>
              <div className="admin-gallery-delete">
                <div className="admin-row-actions">
                  <button className="admin-edit-btn" onClick={() => startEdit(c)}>✏️</button>
                  <button className="admin-delete-btn"
                    onClick={() => handleDelete(c.id, `${c.first_name} ${c.last_name}`)}>🗑️</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── OPERATORS PANEL ─────────────────────────────────────────────────────── */
const EMPTY_OPERATOR = { name: '', role: '', photo: '', telegram_id: '', phone_number: '', sort_order: '0', is_active: true };

function OperatorsPanel() {
  const [operators, setOperators] = useState<OperatorRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(EMPTY_OPERATOR);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [toast, setToast] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null);
  const [dispatching, setDispatching] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2800); };

  const handleTestDispatch = async () => {
    setDispatching(true);
    try {
      const { error } = await supabase.functions.invoke('driver-daily-schedule');
      if (error) throw error;
      showToast('Рассылка успешно отправлена!');
    } catch (err) {
      showToast('Ошибка рассылки: ' + String(err));
    } finally {
      setDispatching(false);
    }
  };

  const fetchOperators = async () => {
    const { data } = await supabase.from('operators').select('*').order('sort_order');
    setOperators(data ?? []);
    setLoading(false);
  };
  useEffect(() => { fetchOperators(); }, []);

  const startEdit = (op: OperatorRow) => {
    setEditId(op.id);
    setForm({ name: op.name, role: op.role, photo: op.photo, telegram_id: op.telegram_id, phone_number: op.phone_number || '', sort_order: String(op.sort_order), is_active: op.is_active });
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
  };

  const cancelEdit = () => { setEditId(null); setForm(EMPTY_OPERATOR); };

  const handlePhotoUpload = async (file: File) => {
    if (!file) return;
    setUploading(true);
    const ext = file.name.split('.').pop() ?? 'jpg';
    const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabase.storage.from('operator-photos').upload(path, file, { upsert: true });
    if (error) {
      showToast('Ошибка загрузки фото: ' + error.message);
      setUploading(false);
      return;
    }
    const { data: urlData } = supabase.storage.from('operator-photos').getPublicUrl(path);
    setForm(f => ({ ...f, photo: urlData.publicUrl }));
    setUploading(false);
    showToast('Фото загружено');
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      role: form.role.trim(),
      photo: form.photo.trim(),
      telegram_id: form.telegram_id.trim(),
      phone_number: form.phone_number.trim(),
      sort_order: parseInt(form.sort_order) || 0,
      is_active: form.is_active,
    };
    if (editId) {
      await supabase.from('operators').update(payload).eq('id', editId);
      showToast(`Оператор "${form.name}" обновлён`);
    } else {
      await supabase.from('operators').insert(payload);
      showToast(`Оператор "${form.name}" добавлен`);
    }
    cancelEdit();
    await fetchOperators();
    setSaving(false);
  };

  const confirmAndDelete = async () => {
    if (!confirmDelete) return;
    await supabase.from('operators').delete().eq('id', confirmDelete.id);
    showToast('Оператор удалён');
    setConfirmDelete(null);
    await fetchOperators();
  };

  const toggleActive = async (op: OperatorRow) => {
    const { error } = await supabase
      .from('operators')
      .update({ is_active: !op.is_active })
      .eq('id', op.id);
    if (error) {
      showToast('Ошибка: ' + error.message);
      return;
    }
    showToast(op.is_active ? `${op.name} скрыт` : `${op.name} активирован`);
    await fetchOperators();
  };

  return (
    <div>
      {toast && <div className="admin-toast">{toast}</div>}

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
        <button
          className="admin-btn-primary"
          onClick={handleTestDispatch}
          disabled={dispatching}
          style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 260 }}
        >
          {dispatching ? (
            <>
              <div className="admin-spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
              Отправляем...
            </>
          ) : (
            'Тест: Отправить расписание сейчас'
          )}
        </button>
      </div>

      {confirmDelete && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#1C1E26', border: '1px solid #FF5C5C55', borderRadius: 16, padding: '32px 28px', maxWidth: 420, width: '100%', textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', marginBottom: 12 }}>🗑️</div>
            <h3 style={{ color: '#fff', margin: '0 0 8px', fontSize: '1.1rem' }}>Удалить оператора?</h3>
            <p style={{ color: '#8F90A6', margin: '0 0 24px', fontSize: '0.9rem' }}>
              Оператор <strong style={{ color: '#fff' }}>{confirmDelete.name}</strong> будет удалён безвозвратно.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button className="admin-btn-ghost" onClick={() => setConfirmDelete(null)} style={{ flex: 1 }}>Отмена</button>
              <button className="admin-delete-btn" onClick={confirmAndDelete} style={{ flex: 1 }}>Да, удалить</button>
            </div>
          </div>
        </div>
      )}

      <div className="admin-form-card" ref={formRef}>
        <h3 className="admin-form-title">
          {editId ? 'Редактировать оператора' : '+ Добавить нового оператора'}
        </h3>
        <div className="admin-form-grid">
          <div className="admin-field">
            <label className="admin-label">Имя *</label>
            <input
              className="admin-input"
              placeholder="Alex Petrov"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            />
          </div>
          <div className="admin-field">
            <label className="admin-label">Специализация</label>
            <input
              className="admin-input"
              placeholder="FPV Pilot, Editor, Videographer…"
              value={form.role}
              onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
            />
          </div>
          <div className="admin-field">
            <label className="admin-label">Telegram ID</label>
            <input
              className="admin-input"
              placeholder="123456789"
              value={form.telegram_id}
              onChange={e => setForm(f => ({ ...f, telegram_id: e.target.value }))}
            />
          </div>
          <div className="admin-field">
            <label className="admin-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              Номер WhatsApp
              <span style={{ fontSize: '0.68rem', background: '#00C48C18', border: '1px solid #00C48C44', color: '#00C48C', borderRadius: 5, padding: '1px 7px', fontWeight: 700 }}>
                Для ночной рассылки
              </span>
            </label>
            <input
              className="admin-input"
              placeholder="994553559500"
              value={form.phone_number}
              onChange={e => setForm(f => ({ ...f, phone_number: e.target.value }))}
            />
          </div>
          <div className="admin-field">
            <label className="admin-label">Порядок отображения</label>
            <input
              className="admin-input"
              type="number"
              placeholder="1"
              value={form.sort_order}
              onChange={e => setForm(f => ({ ...f, sort_order: e.target.value }))}
            />
          </div>

          <div className="admin-field admin-field-full">
            <label className="admin-label">Фото оператора</label>
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 200 }}>
                <input
                  className="admin-input"
                  placeholder="https://example.com/photo.jpg или загрузи файл →"
                  value={form.photo}
                  onChange={e => setForm(f => ({ ...f, photo: e.target.value }))}
                  style={{ marginBottom: 8 }}
                />
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  style={{ display: 'none' }}
                  onChange={e => { const f = e.target.files?.[0]; if (f) handlePhotoUpload(f); }}
                />
                <button
                  type="button"
                  className="admin-btn-ghost"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  style={{ width: '100%', justifyContent: 'center', fontSize: '0.85rem' }}
                >
                  {uploading ? 'Загрузка...' : 'Загрузить с устройства'}
                </button>
              </div>
              {form.photo && (
                <img
                  src={form.photo}
                  alt="preview"
                  style={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'cover', border: '2px solid #2C2F3A', flexShrink: 0 }}
                  onError={e => (e.currentTarget.style.display = 'none')}
                />
              )}
            </div>
          </div>

          <div className="admin-field admin-field-full" style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <input
              type="checkbox"
              id="op-active"
              checked={form.is_active}
              onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))}
              style={{ width: 18, height: 18, accentColor: '#00C48C', cursor: 'pointer', flexShrink: 0 }}
            />
            <label htmlFor="op-active" className="admin-label" style={{ margin: 0, cursor: 'pointer' }}>
              Показывать на странице бронирования
            </label>
          </div>
        </div>
        <div className="admin-form-actions">
          <button
            className="admin-btn-primary"
            onClick={handleSave}
            disabled={saving || uploading || !form.name.trim()}
          >
            {saving ? 'Сохранение...' : editId ? 'Сохранить изменения' : '+ Добавить оператора'}
          </button>
          {editId && (
            <button className="admin-btn-ghost" onClick={cancelEdit}>Отмена</button>
          )}
        </div>
      </div>

      <div className="admin-table-wrap">
        {loading ? (
          <AdminLoader />
        ) : operators.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#8F90A6' }}>Операторов ещё нет. Добавьте первого выше.</div>
        ) : (
          <div className="ops-admin-grid">
            {operators.map(op => (
              <div key={op.id} className={`ops-admin-card${op.is_active ? '' : ' ops-admin-card--hidden'}`}>
                <div className="ops-admin-card-top">
                  {op.photo ? (
                    <img
                      src={op.photo}
                      alt={op.name}
                      className="ops-admin-avatar"
                      onError={e => (e.currentTarget.style.display = 'none')}
                    />
                  ) : (
                    <div className="ops-admin-avatar-placeholder">{op.name.charAt(0)}</div>
                  )}
                  <div className="ops-admin-info">
                    <div className="ops-admin-name">{op.name}</div>
                    <div className="ops-admin-role">{op.role || '—'}</div>
                    {op.telegram_id && (
                      <div className="ops-admin-tg">TG: {op.telegram_id}</div>
                    )}
                    {op.phone_number && (
                      <div className="ops-admin-tg" style={{ color: '#00C48C' }}>WA: {op.phone_number}</div>
                    )}
                  </div>
                  <div className={`ops-admin-badge${op.is_active ? '' : ' ops-admin-badge--off'}`}>
                    {op.is_active ? 'Активен' : 'Скрыт'}
                  </div>
                </div>
                <div className="ops-admin-actions">
                  <button className="admin-save-btn ops-admin-btn" onClick={() => startEdit(op)}>
                    Редактировать
                  </button>
                  <button className="admin-btn-ghost ops-admin-btn" onClick={() => toggleActive(op)}>
                    {op.is_active ? 'Скрыть' : 'Показать'}
                  </button>
                  <button className="admin-delete-btn ops-admin-btn" onClick={() => setConfirmDelete({ id: op.id, name: op.name })}>
                    Удалить
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  return (
    <DataProvider>
      <AdminDashboardInner />
    </DataProvider>
  );
}

function AdminLoader() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
      <div className="admin-spinner" />
    </div>
  );
}

/* ── Promo Reviews Panel ── */
function PromoReviewsPanel() {
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from('promo_reviews')
      .select('*, creator_profiles(display_name, username, user_id)')
      .order('created_at', { ascending: false });
    setReviews(data ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function approve(review: any) {
    await supabase.from('promo_reviews').update({ status: 'approved', reviewed_at: new Date().toISOString() }).eq('id', review.id);
    // Credit creator wallet
    const creatorId = review.creator_id;
    const { data: profile } = await supabase.from('creator_profiles').select('wallet_balance').eq('id', creatorId).maybeSingle();
    const newBalance = (profile?.wallet_balance ?? 0) + 185;
    await supabase.from('creator_profiles').update({ wallet_balance: newBalance }).eq('id', creatorId);
    load();
  }

  async function reject(reviewId: string) {
    await supabase.from('promo_reviews').update({ status: 'rejected', reviewed_at: new Date().toISOString() }).eq('id', reviewId);
    load();
  }

  if (loading) return <AdminLoader />;

  const pending = reviews.filter(r => r.status === 'pending');
  const reviewed = reviews.filter(r => r.status !== 'pending');

  return (
    <div className="space-y-6">
      <div className="rounded-xl p-5" style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.2)' }}>
        <h3 className="text-sm font-bold text-white mb-1">Промо-задания UGC-креаторов</h3>
        <p className="text-xs" style={{ color: '#94a3b8' }}>Обзоры на платформу от UGC-креаторов. Одобрение начисляет 185 AED на баланс.</p>
      </div>

      {pending.length === 0 && <p className="text-sm" style={{ color: '#64748b' }}>Нет заявок на модерацию.</p>}

      {pending.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-xs uppercase tracking-wide font-bold" style={{ color: '#fbbf24' }}>Ожидают проверки ({pending.length})</h4>
          {pending.map(r => (
            <div key={r.id} className="rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-white truncate">{r.creator_profiles?.display_name || 'Unknown'}</div>
                <a href={r.video_url} target="_blank" rel="noopener noreferrer" className="text-xs underline truncate block" style={{ color: '#38bdf8' }}>{r.video_url}</a>
                <div className="text-[10px] mt-1" style={{ color: '#475569' }}>{new Date(r.created_at).toLocaleString()}</div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button onClick={() => approve(r)} className="px-3 py-1.5 rounded-lg text-xs font-bold" style={{ background: 'rgba(0,196,140,0.15)', color: '#00C48C', border: '1px solid rgba(0,196,140,0.3)' }}>
                  Одобрить (+185 AED)
                </button>
                <button onClick={() => reject(r.id)} className="px-3 py-1.5 rounded-lg text-xs font-bold" style={{ background: 'rgba(239,68,68,0.12)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.25)' }}>
                  Отклонить
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {reviewed.length > 0 && (
        <div className="space-y-2 mt-6">
          <h4 className="text-xs uppercase tracking-wide font-bold" style={{ color: '#64748b' }}>Обработанные ({reviewed.length})</h4>
          {reviewed.slice(0, 20).map(r => (
            <div key={r.id} className="rounded-xl p-3 flex items-center gap-3" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${r.status === 'approved' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                {r.status === 'approved' ? 'Одобрено' : 'Отклонено'}
              </span>
              <span className="text-xs text-white truncate flex-1">{r.creator_profiles?.display_name}</span>
              <a href={r.video_url} target="_blank" rel="noopener noreferrer" className="text-[10px] underline" style={{ color: '#64748b' }}>Ссылка</a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Creators CRM Panel ── */
function CreatorsCrmPanel() {
  const [creators, setCreators] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedCreator, setSelectedCreator] = useState<any | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('creator_profiles')
        .select('id, user_id, display_name, username, creator_type, category, whatsapp_number, avatar_url, onboarding_done, created_at, wallet_balance, location, followers_count, avg_views, engagement_rate, instagram_url, tiktok_url, youtube_url, bio')
        .order('created_at', { ascending: false });

      const profiles = data ?? [];

      // Fetch emails via RPC (admin-only, uses auth.users)
      let emailMap: Record<string, string> = {};
      const { data: emailRows } = await supabase.rpc('get_creator_emails');
      if (emailRows) {
        for (const row of emailRows) {
          emailMap[row.user_id] = row.email ?? '';
        }
      }

      setCreators(profiles.map(p => ({ ...p, email: emailMap[p.user_id] || '' })));
      setLoading(false);
    })();
  }, []);

  const filtered = creators.filter(c => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (c.display_name || '').toLowerCase().includes(q)
      || (c.username || '').toLowerCase().includes(q)
      || (c.email || '').toLowerCase().includes(q)
      || (c.whatsapp_number || '').includes(q);
  });

  function copyPhone(id: string, phone: string) {
    navigator.clipboard.writeText(phone);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  function copyToClipboard(field: string, value: string) {
    navigator.clipboard.writeText(value);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  }

  function cleanPhone(phone: string): string {
    return phone.replace(/[\s+\-()]/g, '');
  }

  if (loading) return <AdminLoader />;

  return (
    <div className="space-y-4">
      <div className="rounded-xl p-5" style={{ background: 'rgba(56,189,248,0.06)', border: '1px solid rgba(56,189,248,0.2)' }}>
        <h3 className="text-sm font-bold text-white mb-1">CRM-база креаторов</h3>
        <p className="text-xs" style={{ color: '#94a3b8' }}>Все зарегистрированные креаторы. Кликните на строку для просмотра детальной карточки с контактами.</p>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex-1 relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#475569' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Поиск по имени, email, телефону..."
            className="w-full rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-slate-600 outline-none"
            style={{ background: '#0a0f1a', border: '1px solid rgba(255,255,255,0.08)' }}
          />
        </div>
        <span className="text-xs font-bold px-3 py-1 rounded-full" style={{ background: 'rgba(0,196,140,0.1)', color: '#00C48C' }}>
          {creators.length} total
        </span>
      </div>

      <div className="overflow-x-auto rounded-xl" style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
        <table className="w-full text-left text-xs">
          <thead>
            <tr style={{ background: 'rgba(255,255,255,0.03)' }}>
              <th className="px-4 py-3 font-bold text-slate-400">Имя</th>
              <th className="px-4 py-3 font-bold text-slate-400">Тип</th>
              <th className="px-4 py-3 font-bold text-slate-400">Ниша</th>
              <th className="px-4 py-3 font-bold text-slate-400">WhatsApp</th>
              <th className="px-4 py-3 font-bold text-slate-400">Email</th>
              <th className="px-4 py-3 font-bold text-slate-400">Баланс</th>
              <th className="px-4 py-3 font-bold text-slate-400">Профиль</th>
              <th className="px-4 py-3 font-bold text-slate-400">Дата</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(c => (
              <tr key={c.id} className="border-t cursor-pointer transition-colors hover:bg-white/[0.02]" style={{ borderColor: 'rgba(255,255,255,0.04)' }} onClick={() => setSelectedCreator(c)}>
                <td className="px-4 py-3 text-white font-semibold whitespace-nowrap">{c.display_name || '-'}</td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: 'rgba(99,102,241,0.12)', color: '#a5b4fc' }}>
                    {c.creator_type || '-'}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-400 whitespace-nowrap">{c.category || '-'}</td>
                <td className="px-4 py-3 whitespace-nowrap">
                  {c.whatsapp_number ? (
                    <button
                      onClick={(e) => { e.stopPropagation(); copyPhone(c.id, c.whatsapp_number); }}
                      className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold transition-all"
                      style={{
                        background: copiedId === c.id ? 'rgba(0,196,140,0.15)' : 'rgba(255,255,255,0.04)',
                        color: copiedId === c.id ? '#00C48C' : '#38bdf8',
                        border: `1px solid ${copiedId === c.id ? 'rgba(0,196,140,0.3)' : 'rgba(56,189,248,0.2)'}`,
                      }}
                    >
                      {copiedId === c.id ? <><Check size={10} /> Copied</> : c.whatsapp_number}
                    </button>
                  ) : (
                    <span className="text-slate-600">-</span>
                  )}
                </td>
                <td className="px-4 py-3 text-slate-400 whitespace-nowrap">{c.email || '-'}</td>
                <td className="px-4 py-3 text-white font-semibold">{c.wallet_balance ?? 0} AED</td>
                <td className="px-4 py-3">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${c.onboarding_done ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
                    {c.onboarding_done ? 'Complete' : 'Incomplete'}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{c.created_at ? new Date(c.created_at).toLocaleDateString() : '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="text-center py-8 text-sm" style={{ color: '#475569' }}>Нет результатов</div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedCreator && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }} onClick={() => setSelectedCreator(null)}>
          <div className="w-full max-w-lg rounded-2xl p-6 relative" style={{ background: '#0f1520', border: '1px solid rgba(56,189,248,0.2)', boxShadow: '0 24px 64px rgba(0,0,0,0.5)' }} onClick={e => e.stopPropagation()}>
            <button onClick={() => setSelectedCreator(null)} className="absolute top-4 right-4 w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.05)', color: '#64748b' }}>
              <span className="text-lg leading-none">&times;</span>
            </button>

            {/* Header */}
            <div className="flex items-center gap-4 mb-5">
              {selectedCreator.avatar_url ? (
                <img src={selectedCreator.avatar_url} alt="" className="w-14 h-14 rounded-xl object-cover" style={{ border: '2px solid rgba(56,189,248,0.3)' }} />
              ) : (
                <div className="w-14 h-14 rounded-xl flex items-center justify-center text-lg font-bold" style={{ background: 'rgba(56,189,248,0.1)', color: '#38bdf8', border: '2px solid rgba(56,189,248,0.3)' }}>
                  {(selectedCreator.display_name || '?')[0]}
                </div>
              )}
              <div>
                <h3 className="text-base font-bold text-white">{selectedCreator.display_name || 'Unknown'}</h3>
                {selectedCreator.username && <p className="text-xs" style={{ color: '#64748b' }}>@{selectedCreator.username}</p>}
                <div className="flex items-center gap-2 mt-1">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: 'rgba(99,102,241,0.12)', color: '#a5b4fc' }}>{selectedCreator.creator_type || '-'}</span>
                  {selectedCreator.category && <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: 'rgba(255,255,255,0.05)', color: '#94a3b8' }}>{selectedCreator.category}</span>}
                </div>
              </div>
            </div>

            {/* Contact Info Block */}
            <div className="rounded-xl p-4 mb-4" style={{ background: 'rgba(56,189,248,0.04)', border: '1px solid rgba(56,189,248,0.15)' }}>
              <h4 className="text-xs uppercase tracking-wide font-bold mb-3" style={{ color: '#38bdf8' }}>Контактная информация</h4>
              <div className="space-y-3">
                {/* WhatsApp */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(34,197,94,0.12)' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="#22c55e"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.11.546 4.09 1.504 5.812L0 24l6.335-1.652A11.96 11.96 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.75c-1.97 0-3.834-.53-5.445-1.456l-.39-.232-3.759.98.999-3.648-.254-.404A9.72 9.72 0 012.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75z"/></svg>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-wide" style={{ color: '#64748b' }}>WhatsApp</div>
                      {selectedCreator.whatsapp_number ? (
                        <a
                          href={`https://wa.me/${cleanPhone(selectedCreator.whatsapp_number)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-semibold underline decoration-dotted underline-offset-2 hover:brightness-125 transition-all"
                          style={{ color: '#22c55e' }}
                        >
                          {selectedCreator.whatsapp_number}
                        </a>
                      ) : (
                        <span className="text-sm" style={{ color: '#475569' }}>Не указан</span>
                      )}
                    </div>
                  </div>
                  {selectedCreator.whatsapp_number && (
                    <button
                      onClick={() => copyToClipboard('wa', selectedCreator.whatsapp_number)}
                      className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
                      style={{ background: copiedField === 'wa' ? 'rgba(0,196,140,0.15)' : 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                    >
                      {copiedField === 'wa' ? <Check size={12} style={{ color: '#00C48C' }} /> : <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>}
                    </button>
                  )}
                </div>

                {/* Email */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(56,189,248,0.12)' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M22 7l-10 6L2 7"/></svg>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-wide" style={{ color: '#64748b' }}>Email</div>
                      <span className="text-sm font-semibold" style={{ color: selectedCreator.email ? '#e2e8f0' : '#475569' }}>
                        {selectedCreator.email || 'Не указан'}
                      </span>
                    </div>
                  </div>
                  {selectedCreator.email && (
                    <button
                      onClick={() => copyToClipboard('email', selectedCreator.email)}
                      className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
                      style={{ background: copiedField === 'email' ? 'rgba(0,196,140,0.15)' : 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                    >
                      {copiedField === 'email' ? <Check size={12} style={{ color: '#00C48C' }} /> : <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="rounded-xl p-3 text-center" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div className="text-sm font-bold text-white">{selectedCreator.followers_count ? Number(selectedCreator.followers_count).toLocaleString() : '-'}</div>
                <div className="text-[10px]" style={{ color: '#64748b' }}>Подписчики</div>
              </div>
              <div className="rounded-xl p-3 text-center" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div className="text-sm font-bold text-white">{selectedCreator.avg_views ? Number(selectedCreator.avg_views).toLocaleString() : '-'}</div>
                <div className="text-[10px]" style={{ color: '#64748b' }}>Avg Views</div>
              </div>
              <div className="rounded-xl p-3 text-center" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div className="text-sm font-bold" style={{ color: '#00C48C' }}>{selectedCreator.wallet_balance ?? 0} AED</div>
                <div className="text-[10px]" style={{ color: '#64748b' }}>Баланс</div>
              </div>
            </div>

            {/* Extra info */}
            <div className="space-y-2 text-xs">
              {selectedCreator.location && (
                <div className="flex items-center gap-2">
                  <span style={{ color: '#64748b' }}>Локация:</span>
                  <span className="text-white">{selectedCreator.location}</span>
                </div>
              )}
              {selectedCreator.instagram_url && (
                <div className="flex items-center gap-2">
                  <span style={{ color: '#64748b' }}>Instagram:</span>
                  <a href={selectedCreator.instagram_url} target="_blank" rel="noopener noreferrer" className="underline" style={{ color: '#e879f9' }}>{selectedCreator.instagram_url}</a>
                </div>
              )}
              {selectedCreator.tiktok_url && (
                <div className="flex items-center gap-2">
                  <span style={{ color: '#64748b' }}>TikTok:</span>
                  <a href={selectedCreator.tiktok_url} target="_blank" rel="noopener noreferrer" className="underline" style={{ color: '#38bdf8' }}>{selectedCreator.tiktok_url}</a>
                </div>
              )}
              <div className="flex items-center gap-2">
                <span style={{ color: '#64748b' }}>Регистрация:</span>
                <span className="text-white">{selectedCreator.created_at ? new Date(selectedCreator.created_at).toLocaleDateString() : '-'}</span>
              </div>
            </div>

            {/* Quick WhatsApp CTA */}
            {selectedCreator.whatsapp_number && (
              <a
                href={`https://wa.me/${cleanPhone(selectedCreator.whatsapp_number)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-5 w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all hover:brightness-110 active:scale-[0.98]"
                style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)', color: '#fff', border: '1px solid rgba(34,197,94,0.4)', boxShadow: '0 4px 16px rgba(34,197,94,0.2)' }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.11.546 4.09 1.504 5.812L0 24l6.335-1.652A11.96 11.96 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.75c-1.97 0-3.834-.53-5.445-1.456l-.39-.232-3.759.98.999-3.648-.254-.404A9.72 9.72 0 012.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75z"/></svg>
                Написать в WhatsApp
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
