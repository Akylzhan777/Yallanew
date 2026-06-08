import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ShoppingBag, Receipt, LogOut, Building2, CheckCircle, Clock, AlertCircle, XCircle, Shield, ChevronRight, RefreshCw, ArrowUpRight, MessageCircle, Globe, Save, LayoutDashboard, Menu, X, Wallet, CreditCard } from 'lucide-react';
import { useClientAuth, ClientProfile } from '../context/ClientAuthContext';
import { useRegion } from '../context/RegionContext';
import { supabase } from '../lib/supabase';
import DealMessenger from '../components/DealMessenger';

type Tab = 'dashboard' | 'orders' | 'messages' | 'billing' | 'profile';

interface DealChat {
  id: string;
  order_id: string;
  client_id: string;
  freelancer_id: string;
  status: string;
  created_at: string;
  freelancer_name?: string;
  order_package_name?: string;
  order_status?: string;
}

interface Order {
  id: string;
  creator_id: string;
  buyer_name: string;
  buyer_email: string;
  buyer_company: string;
  package_name: string;
  package_price: number;
  delivery_days: number;
  campaign_brief: string;
  platform_commission_pct: number;
  creator_net_amount: number;
  status: string;
  created_at: string;
  accepted_at: string | null;
  creator_display_name?: string;
  creator_avatar_url?: string;
  creator_username?: string;
  client_user_id?: string;
}

interface Transaction {
  id: string;
  type: string;
  status: string;
  amount: number;
  description: string;
  created_at: string;
  order_id: string | null;
}

function fmt(n: number) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function ClientDashboard() {
  const { t } = useTranslation();
  const { clientProfile, user, signOut, loading: authLoading } = useClientAuth();
  const { config: regionConfig } = useRegion();
  const currency = regionConfig.currency;
  const [paymentVerifying, setPaymentVerifying] = useState(false);
  const [tab, setTab] = useState<Tab>('dashboard');
  const [orders, setOrders] = useState<Order[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [chats, setChats] = useState<DealChat[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const email = user.email ?? '';
      const { data: rawOrders } = await supabase
        .from('marketplace_orders')
        .select('*')
        .or(`client_user_id.eq.${user.id},buyer_email.eq.${email}`)
        .order('created_at', { ascending: false });

      if (rawOrders && rawOrders.length > 0) {
        const legacyIds = (rawOrders as Order[]).filter(o => !o.client_user_id).map(o => o.id);
        if (legacyIds.length > 0) {
          await supabase.from('marketplace_orders').update({ client_user_id: user.id }).in('id', legacyIds);
        }
        const creatorIds = [...new Set((rawOrders as Order[]).map(o => o.creator_id))];
        const { data: creators } = await supabase.from('creator_profiles').select('id, display_name, avatar_url, username').in('id', creatorIds);
        const creatorMap = new Map((creators ?? []).map((c: { id: string; display_name: string; avatar_url: string | null; username: string | null }) => [c.id, c]));
        setOrders((rawOrders as Order[]).map(o => ({
          ...o,
          creator_display_name: creatorMap.get(o.creator_id)?.display_name ?? 'Creator',
          creator_avatar_url: creatorMap.get(o.creator_id)?.avatar_url ?? null,
          creator_username: creatorMap.get(o.creator_id)?.username ?? null,
        })));
      } else {
        setOrders([]);
      }
      setLoading(false);
    })();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: chatRows } = await supabase.from('deal_chats').select('*').eq('client_id', user.id).order('created_at', { ascending: false });
      if (chatRows && chatRows.length > 0) {
        const freelancerIds = [...new Set(chatRows.map((c: DealChat) => c.freelancer_id))];
        const orderIds = chatRows.map((c: DealChat) => c.order_id);
        const [{ data: profiles }, { data: orderRows }] = await Promise.all([
          supabase.from('creator_profiles').select('user_id, display_name').in('user_id', freelancerIds),
          supabase.from('marketplace_orders').select('id, package_name, status').in('id', orderIds),
        ]);
        const nameMap = new Map((profiles ?? []).map((p: { user_id: string; display_name: string }) => [p.user_id, p.display_name]));
        const orderMap = new Map((orderRows ?? []).map((o: { id: string; package_name: string; status: string }) => [o.id, o]));
        setChats(chatRows.map((c: DealChat) => ({
          ...c,
          freelancer_name: nameMap.get(c.freelancer_id) ?? 'Creator',
          order_package_name: orderMap.get(c.order_id)?.package_name ?? 'Order',
          order_status: orderMap.get(c.order_id)?.status ?? 'paid',
        })));
      } else {
        setChats([]);
      }
    })();
  }, [user]);

  useEffect(() => {
    setTransactions(orders.map(o => ({
      id: o.id, type: 'order', status: o.status, amount: o.package_price,
      description: `${o.package_name} — ${o.creator_display_name}`,
      created_at: o.created_at, order_id: o.id,
    })));
  }, [orders]);

  // Handle post-payment redirect: verify payment, wait for chat, navigate to it
  useEffect(() => {
    if (!user) return;
    const params = new URLSearchParams(window.location.search);
    const paymentStatus = params.get('payment');
    const orderId = params.get('order');
    if (paymentStatus !== 'success' || !orderId) return;

    // Clean URL immediately to prevent re-triggers
    window.history.replaceState({}, '', window.location.pathname);
    setPaymentVerifying(true);

    (async () => {
      try {
        // Call verify-payment to finalize order status
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
        await fetch(`${supabaseUrl}/functions/v1/verify-payment`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}` },
          body: JSON.stringify({ order_id: orderId }),
        });

        // Wait for deal_chat to be created by the trigger (retry up to 5 times)
        let chatId: string | null = null;
        for (let i = 0; i < 6; i++) {
          const { data: chat } = await supabase
            .from('deal_chats')
            .select('id')
            .eq('order_id', orderId)
            .eq('client_id', user.id)
            .maybeSingle();
          if (chat) { chatId = chat.id; break; }
          await new Promise(r => setTimeout(r, 1000));
        }

        if (chatId) {
          setTab('messages');
          setActiveChatId(chatId);
          // Refresh chats list
          const { data: chatRows } = await supabase.from('deal_chats').select('*').eq('client_id', user.id).order('created_at', { ascending: false });
          if (chatRows && chatRows.length > 0) {
            const freelancerIds = [...new Set(chatRows.map((c: DealChat) => c.freelancer_id))];
            const orderIds = chatRows.map((c: DealChat) => c.order_id);
            const [{ data: profiles }, { data: orderRows }] = await Promise.all([
              supabase.from('creator_profiles').select('user_id, display_name').in('user_id', freelancerIds),
              supabase.from('marketplace_orders').select('id, package_name, status').in('id', orderIds),
            ]);
            const nameMap = new Map((profiles ?? []).map((p: { user_id: string; display_name: string }) => [p.user_id, p.display_name]));
            const orderMap = new Map((orderRows ?? []).map((o: { id: string; package_name: string; status: string }) => [o.id, o]));
            setChats(chatRows.map((c: DealChat) => ({
              ...c,
              freelancer_name: nameMap.get(c.freelancer_id) ?? 'Creator',
              order_package_name: orderMap.get(c.order_id)?.package_name ?? 'Order',
              order_status: orderMap.get(c.order_id)?.status ?? 'paid',
            })));
          }
        } else {
          setTab('orders');
        }
      } catch {
        setTab('orders');
      } finally {
        setPaymentVerifying(false);
      }
    })();
  }, [user]);

  async function handleAcceptWork(orderId: string) {
    setAcceptingId(orderId);
    const { error } = await supabase.from('marketplace_orders')
      .update({ status: 'completed', accepted_at: new Date().toISOString() })
      .eq('id', orderId).eq('client_user_id', user!.id);
    if (!error) {
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'completed', accepted_at: new Date().toISOString() } : o));
    }
    setAcceptingId(null);
  }

  const totalSpent = orders.filter(o => o.status === 'completed').reduce((s, o) => s + o.package_price, 0);
  const activeCount = orders.filter(o => o.status === 'on_hold' || o.status === 'pending').length;

  if (!user) {
    if (authLoading) return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#080d16' }}>
        <div className="w-8 h-8 border-2 border-sky-500/30 border-t-sky-400 rounded-full animate-spin" />
      </div>
    );
    window.location.replace('/brand/signup');
    return null;
  }

  if (paymentVerifying) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#080d16', gap: 16 }}>
      <div className="w-10 h-10 border-2 border-emerald-500/30 border-t-emerald-400 rounded-full animate-spin" />
      <p className="text-sm text-gray-400 font-medium">Подтверждаем оплату...</p>
    </div>
  );

  const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
    pending:   { label: t('brand.status.pending'),    color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',   icon: <Clock size={13} /> },
    on_hold:   { label: t('brand.status.inProgress'), color: '#38bdf8', bg: 'rgba(56,189,248,0.1)',   icon: <Shield size={13} /> },
    completed: { label: t('brand.status.completed'),  color: '#00C48C', bg: 'rgba(0,196,140,0.1)',    icon: <CheckCircle size={13} /> },
    cancelled: { label: t('brand.status.cancelled'),  color: '#ef4444', bg: 'rgba(239,68,68,0.1)',    icon: <XCircle size={13} /> },
    disputed:  { label: t('brand.status.disputed'),   color: '#f97316', bg: 'rgba(249,115,22,0.1)',   icon: <AlertCircle size={13} /> },
  };

  const navItems: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: t('brand.nav.dashboard'), icon: <LayoutDashboard size={18} /> },
    { id: 'orders', label: t('brand.nav.orders'), icon: <ShoppingBag size={18} /> },
    { id: 'messages', label: t('brand.nav.messages'), icon: <MessageCircle size={18} /> },
    { id: 'profile', label: t('brand.nav.company'), icon: <Building2 size={18} /> },
    { id: 'billing', label: t('brand.nav.wallet'), icon: <Wallet size={18} /> },
  ];

  function switchTab(id: Tab) {
    setTab(id);
    setActiveChatId(null);
    setSidebarOpen(false);
  }

  return (
    <div className="min-h-screen flex" style={{ background: '#080d16' }}>
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" onClick={() => setSidebarOpen(false)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
        </div>
      )}

      {/* Sidebar */}
      <aside className={`fixed lg:sticky top-0 left-0 z-50 lg:z-10 h-screen w-64 flex flex-col transition-transform duration-200 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
        style={{ background: '#0a1019', borderRight: '1px solid rgba(255,255,255,0.06)' }}>
        {/* Logo area */}
        <div className="h-16 flex items-center justify-between px-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(56,189,248,0.12)', border: '1px solid rgba(56,189,248,0.25)' }}>
              <Building2 size={16} style={{ color: '#38bdf8' }} />
            </div>
            <div>
              <div className="text-sm font-bold text-white leading-none truncate max-w-[130px]">
                {clientProfile?.display_name || clientProfile?.company_name || user.email?.split('@')[0]}
              </div>
              <div className="text-[10px] mt-0.5 font-medium" style={{ color: '#475569' }}>{t('brand.portal')}</div>
            </div>
          </div>
          <button className="lg:hidden p-1" onClick={() => setSidebarOpen(false)}>
            <X size={18} style={{ color: '#64748b' }} />
          </button>
        </div>

        {/* Nav items */}
        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {navItems.map(item => (
            <button key={item.id} onClick={() => switchTab(item.id)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
              style={{
                background: tab === item.id ? 'rgba(56,189,248,0.1)' : 'transparent',
                color: tab === item.id ? '#38bdf8' : '#64748b',
                border: tab === item.id ? '1px solid rgba(56,189,248,0.2)' : '1px solid transparent',
              }}>
              {item.icon}
              {item.label}
            </button>
          ))}
        </nav>

        {/* Bottom actions */}
        <div className="p-3 space-y-2" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <a href="/" className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
            style={{ color: '#64748b' }}>
            <ArrowUpRight size={18} /> {t('brand.nav.marketplace')}
          </a>
          <button onClick={() => { signOut().then(() => window.location.replace('/brand/signup')); }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
            style={{ color: '#ef4444' }}>
            <LogOut size={18} /> {t('brand.nav.signOut')}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 min-w-0 flex flex-col">
        {/* Mobile header */}
        <div className="lg:hidden sticky top-0 z-30 h-14 flex items-center justify-between px-4"
          style={{ background: 'rgba(8,13,22,0.95)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <button onClick={() => setSidebarOpen(true)} className="p-2 -ml-2 rounded-lg" style={{ color: '#94a3b8' }}>
            <Menu size={20} />
          </button>
          <span className="text-sm font-bold text-white">{navItems.find(n => n.id === tab)?.label}</span>
          <div className="w-8" />
        </div>

        <div className="flex-1 overflow-y-auto p-4 lg:p-8">
          {/* Dashboard tab */}
          {tab === 'dashboard' && (
            <div className="max-w-3xl mx-auto space-y-6">
              <div>
                <h1 className="text-xl font-bold text-white">{t('brand.welcome', { name: clientProfile?.display_name || user.email?.split('@')[0] })}</h1>
                <p className="text-sm mt-1" style={{ color: '#64748b' }}>{t('brand.welcomeDesc')}</p>
              </div>

              {regionConfig.currency === 'KZT' && <KzPromoCarousel />}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  { label: t('brand.stats.totalOrders'), value: orders.length, accent: '#38bdf8' },
                  { label: t('brand.stats.active'), value: activeCount, accent: '#f59e0b' },
                  { label: t('brand.stats.totalSpent'), value: `${currency} ${fmt(totalSpent)}`, accent: '#00C48C' },
                ].map(s => (
                  <div key={s.label} className="rounded-2xl p-5"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                    <div className="text-2xl font-bold" style={{ color: s.accent }}>{s.value}</div>
                    <div className="text-xs mt-1 font-medium" style={{ color: '#475569' }}>{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Recent orders preview */}
              {orders.length > 0 && (
                <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <div className="px-5 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <span className="text-sm font-bold text-white">{t('brand.recentOrders')}</span>
                    <button onClick={() => setTab('orders')} className="text-xs font-medium" style={{ color: '#38bdf8' }}>{t('brand.viewAll')}</button>
                  </div>
                  {orders.slice(0, 3).map(order => {
                    const st = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.pending;
                    return (
                      <div key={order.id} className="px-5 py-3 flex items-center justify-between gap-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-lg flex-shrink-0 flex items-center justify-center text-sm font-bold"
                            style={{ background: 'rgba(56,189,248,0.08)', color: '#38bdf8' }}>
                            {(order.creator_display_name ?? 'C')[0].toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-white truncate">{order.package_name}</div>
                            <div className="text-xs" style={{ color: '#475569' }}>{order.creator_display_name}</div>
                          </div>
                        </div>
                        <span className="flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full flex-shrink-0" style={{ background: st.bg, color: st.color }}>
                          {st.icon} {st.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

              {orders.length === 0 && !loading && (
                <div className="rounded-2xl p-10 text-center" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <ShoppingBag size={36} className="mx-auto mb-3" style={{ color: '#1e293b' }} />
                  <p className="text-sm font-semibold text-white mb-1">{t('brand.noOrders')}</p>
                  <p className="text-xs mb-4" style={{ color: '#475569' }}>{t('brand.noOrdersDesc')}</p>
                  <a href="/" className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold"
                    style={{ background: 'rgba(56,189,248,0.1)', color: '#38bdf8', border: '1px solid rgba(56,189,248,0.25)' }}>
                    {t('brand.browseCreators')} <ChevronRight size={12} />
                  </a>
                </div>
              )}
            </div>
          )}

          {/* Orders tab */}
          {tab === 'orders' && (
            <div className="max-w-3xl mx-auto space-y-3">
              <h2 className="text-lg font-bold text-white mb-4">{t('brand.nav.orders')}</h2>
              {loading && (
                <div className="flex items-center justify-center py-16">
                  <RefreshCw size={20} className="animate-spin" style={{ color: '#38bdf8' }} />
                </div>
              )}
              {!loading && orders.length === 0 && (
                <div className="rounded-2xl p-12 text-center" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <ShoppingBag size={32} className="mx-auto mb-3" style={{ color: '#1e293b' }} />
                  <p className="text-sm font-semibold text-white mb-1">{t('brand.noOrders')}</p>
                  <p className="text-xs" style={{ color: '#475569' }}>{t('brand.noOrdersDesc')}</p>
                  <a href="/" className="inline-flex items-center gap-1.5 mt-4 px-4 py-2 rounded-xl text-xs font-semibold"
                    style={{ background: 'rgba(56,189,248,0.1)', color: '#38bdf8', border: '1px solid rgba(56,189,248,0.25)' }}>
                    {t('brand.browseCreators')} <ChevronRight size={12} />
                  </a>
                </div>
              )}
              {!loading && orders.map(order => {
                const st = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.pending;
                const isOnHold = order.status === 'on_hold';
                const isAccepting = acceptingId === order.id;
                return (
                  <div key={order.id} className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                    <div className="p-5">
                      <div className="flex items-start gap-4">
                        <div className="w-11 h-11 rounded-xl flex-shrink-0 overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>
                          {order.creator_avatar_url
                            ? <img src={order.creator_avatar_url} alt={order.creator_display_name} className="w-full h-full object-cover" />
                            : <div className="w-full h-full flex items-center justify-center text-lg font-bold" style={{ color: '#38bdf8' }}>{(order.creator_display_name ?? 'C')[0].toUpperCase()}</div>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-white text-sm">{order.creator_display_name}</span>
                            {order.creator_username && (
                              <a href={`/${order.creator_username}`} target="_blank" rel="noopener noreferrer" className="text-xs" style={{ color: '#475569' }}><ArrowUpRight size={11} /></a>
                            )}
                            <span className="flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: st.bg, color: st.color }}>{st.icon} {st.label}</span>
                          </div>
                          <div className="text-xs mt-1 font-medium" style={{ color: '#64748b' }}>{order.package_name}</div>
                          {order.campaign_brief && <p className="text-xs mt-1.5 line-clamp-2" style={{ color: '#475569' }}>{order.campaign_brief}</p>}
                          <div className="flex items-center gap-4 mt-2">
                            <span className="text-sm font-bold" style={{ color: '#f1f5f9' }}>{currency} {fmt(order.package_price)}</span>
                            <span className="text-xs" style={{ color: '#334155' }}>{timeAgo(order.created_at)}</span>
                          </div>
                        </div>
                      </div>
                      {isOnHold && (
                        <div className="mt-4 p-4 rounded-xl flex items-center justify-between gap-4 flex-wrap" style={{ background: 'rgba(56,189,248,0.05)', border: '1px solid rgba(56,189,248,0.15)' }}>
                          <div className="flex items-start gap-2.5">
                            <Shield size={15} className="mt-0.5 flex-shrink-0" style={{ color: '#38bdf8' }} />
                            <div>
                              <div className="text-xs font-semibold" style={{ color: '#38bdf8' }}>{t('brand.escrow.title')}</div>
                              <div className="text-xs mt-0.5" style={{ color: '#475569' }}>{t('brand.escrow.desc')}</div>
                            </div>
                          </div>
                          <button onClick={() => handleAcceptWork(order.id)} disabled={isAccepting}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all hover:brightness-110 active:scale-[0.97] disabled:opacity-60 flex-shrink-0"
                            style={{ background: 'linear-gradient(135deg, #0e7c4a, #0a5c38)', color: '#fff', border: '1px solid rgba(0,196,140,0.35)' }}>
                            {isAccepting ? <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><CheckCircle size={13} /> {t('brand.acceptWork')}</>}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Messages tab */}
          {tab === 'messages' && (
            <div className="max-w-3xl mx-auto">
              <h2 className="text-lg font-bold text-white mb-4">{t('brand.nav.messages')}</h2>
              {activeChatId ? (
                <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.07)', height: 'calc(100dvh - 160px)', minHeight: 400 }}>
                  {(() => {
                    const chat = chats.find(c => c.id === activeChatId);
                    if (!chat) return null;
                    return (
                      <DealMessenger
                        chatId={chat.id}
                        currentUserId={user!.id}
                        userRole="client"
                        orderId={chat.order_id}
                        orderStatus={chat.order_status ?? 'paid'}
                        partnerName={chat.freelancer_name ?? 'Создатель'}
                        partnerId={chat.freelancer_id}
                        partnerTable="creator_profiles"
                        onOrderUpdate={(s) => setChats(prev => prev.map(c => c.id === chat.id ? { ...c, order_status: s } : c))}
                        onClose={() => setActiveChatId(null)}
                      />
                    );
                  })()}
                </div>
              ) : (
                <div className="space-y-2">
                  {chats.length === 0 && (
                    <div className="rounded-2xl p-12 text-center" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <MessageCircle size={32} className="mx-auto mb-3" style={{ color: '#1e293b' }} />
                      <p className="text-sm font-semibold text-white mb-1">{t('brand.noMessages')}</p>
                      <p className="text-xs" style={{ color: '#475569' }}>{t('brand.noMessagesDesc')}</p>
                    </div>
                  )}
                  {chats.map(chat => (
                    <button key={chat.id} onClick={() => setActiveChatId(chat.id)}
                      className="w-full rounded-2xl p-4 text-left transition-all"
                      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
                      onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(56,189,248,0.25)'}
                      onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'}>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0"
                          style={{ background: 'rgba(0,196,140,0.1)', color: '#00C48C', border: '1px solid rgba(0,196,140,0.2)' }}>
                          {(chat.freelancer_name ?? 'C')[0].toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-bold text-white">{chat.freelancer_name}</div>
                          <div className="text-xs truncate" style={{ color: '#475569' }}>{chat.order_package_name}</div>
                        </div>
                        <ChevronRight size={14} style={{ color: '#334155' }} />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Company Profile tab */}
          {tab === 'profile' && (
            <div className="max-w-2xl mx-auto">
              <h2 className="text-lg font-bold text-white mb-4">{t('brand.nav.company')}</h2>
              <CompanyProfileTab userId={user.id} profile={clientProfile} />
            </div>
          )}

          {/* Wallet / Billing tab */}
          {tab === 'billing' && (
            <div className="max-w-3xl mx-auto space-y-5">
              <h2 className="text-lg font-bold text-white mb-4">{t('brand.nav.wallet')}</h2>

              {/* Balance card */}
              <div className="rounded-2xl p-6" style={{ background: 'linear-gradient(135deg, rgba(56,189,248,0.08), rgba(0,196,140,0.05))', border: '1px solid rgba(56,189,248,0.15)' }}>
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div>
                    <div className="text-xs font-medium mb-1" style={{ color: '#64748b' }}>{t('brand.stats.totalSpent')}</div>
                    <div className="text-3xl font-bold text-white">{currency} {fmt(totalSpent)}</div>
                    <div className="text-xs mt-1" style={{ color: '#475569' }}>{t('brand.wallet.across', { count: orders.filter(o => o.status === 'completed').length })}</div>
                  </div>
                  <button className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold transition-all hover:brightness-110"
                    style={{ background: 'linear-gradient(135deg, #0369a1, #0c4a6e)', color: '#fff', border: '1px solid rgba(56,189,248,0.3)' }}>
                    <CreditCard size={16} /> {t('brand.wallet.topUp')}
                  </button>
                </div>
              </div>

              {/* Transaction History */}
              <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <div className="px-5 py-3 flex items-center gap-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.02)' }}>
                  <Receipt size={14} style={{ color: '#38bdf8' }} />
                  <span className="text-sm font-bold text-white">{t('brand.wallet.history')}</span>
                </div>
                {loading && (
                  <div className="flex items-center justify-center py-10">
                    <RefreshCw size={18} className="animate-spin" style={{ color: '#38bdf8' }} />
                  </div>
                )}
                {!loading && transactions.length === 0 && (
                  <div className="px-5 py-10 text-center">
                    <p className="text-sm" style={{ color: '#475569' }}>{t('brand.wallet.noTransactions')}</p>
                  </div>
                )}
                {!loading && transactions.map((tx, i) => {
                  const st = STATUS_CONFIG[tx.status] ?? STATUS_CONFIG.pending;
                  return (
                    <div key={tx.id} className="px-5 py-4 flex items-center justify-between gap-3"
                      style={{ borderTop: i > 0 ? '1px solid rgba(255,255,255,0.04)' : undefined }}>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ background: 'rgba(56,189,248,0.08)', color: '#38bdf8', border: '1px solid rgba(56,189,248,0.15)' }}>
                          <ShoppingBag size={14} />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-white leading-tight">{tx.description}</div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs" style={{ color: '#334155' }}>{timeAgo(tx.created_at)}</span>
                            <span className="flex items-center gap-1 text-xs font-medium px-1.5 py-0.5 rounded-md" style={{ background: st.bg, color: st.color }}>{st.icon} {st.label}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="text-sm font-bold" style={{ color: '#ef4444' }}>- {currency} {fmt(tx.amount)}</div>
                      </div>
                    </div>
                  );
                })}
                {!loading && transactions.length > 0 && (
                  <div className="px-5 py-3 flex items-center justify-between" style={{ borderTop: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.01)' }}>
                    <span className="text-xs font-medium" style={{ color: '#475569' }}>{t('brand.wallet.totalCompleted')}</span>
                    <span className="text-sm font-bold" style={{ color: '#f1f5f9' }}>{currency} {fmt(totalSpent)}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

const KZ_BANNERS = [
  {
    image: 'https://images.pexels.com/photos/3379934/pexels-photo-3379934.jpeg?auto=compress&cs=tinysrgb&w=800',
    title: 'Хочешь, чтобы 20 блогеров в один день рассказали о твоём бизнесе?',
    tag: '🔥 Массовый охват',
  },
  {
    image: 'https://images.pexels.com/photos/3784324/pexels-photo-3784324.jpeg?auto=compress&cs=tinysrgb&w=800',
    title: 'Закажи крутого видеографа на весь день 🎥',
    sub: 'Снимем контент на месяц вперёд',
    tag: '📹 Съёмка под ключ',
  },
  {
    image: 'https://images.pexels.com/photos/3184298/pexels-photo-3184298.jpeg?auto=compress&cs=tinysrgb&w=800',
    title: 'Продвижение под ключ со скидкой ⚡',
    sub: 'SMM, контент и блогеры в одном пакете',
    tag: '💼 Пакетное предложение',
  },
];

function KzPromoCarousel() {
  return (
    <div className="relative -mx-0">
      <div
        className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-1 scrollbar-hide"
      >
        {KZ_BANNERS.map((banner, i) => (
          <button
            key={i}
            onClick={() => {}}
            className="relative flex-shrink-0 snap-start rounded-2xl overflow-hidden cursor-pointer transition-transform duration-300 hover:scale-[1.02] active:scale-95"
            style={{ width: 'min(280px, 85vw)', height: 176 }}
          >
            <img
              src={banner.image}
              alt={banner.title}
              className="absolute inset-0 w-full h-full object-cover"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-4 text-left">
              <span
                className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full mb-2"
                style={{ background: 'rgba(56,189,248,0.2)', color: '#7dd3fc', border: '1px solid rgba(56,189,248,0.3)' }}
              >
                {banner.tag}
              </span>
              <p className="text-white font-bold text-sm leading-snug line-clamp-2">{banner.title}</p>
              {banner.sub && (
                <p className="text-xs mt-1 font-medium" style={{ color: '#94a3b8' }}>{banner.sub}</p>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function CompanyProfileTab({ userId, profile }: { userId: string; profile: ClientProfile | null }) {
  const { t } = useTranslation();
  const [companyName, setCompanyName] = useState(profile?.company_name ?? '');
  const [website, setWebsite] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    supabase.from('client_profiles').select('company_name, website, description').eq('user_id', userId).maybeSingle()
      .then(({ data }) => {
        if (data) {
          setCompanyName(data.company_name ?? '');
          setWebsite(data.website ?? '');
          setDescription(data.description ?? '');
        }
      });
  }, [userId]);

  async function handleSave() {
    setSaving(true);
    await supabase.from('client_profiles').update({ company_name: companyName, website, description }).eq('user_id', userId);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  const inputCls = "w-full px-4 py-2.5 rounded-xl text-sm text-white placeholder:text-gray-600 outline-none transition-all focus:ring-1 focus:ring-sky-500/40";
  const inputStyle = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' };

  return (
    <div className="rounded-2xl p-6" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
      <div className="flex items-center gap-2 mb-5">
        <Building2 size={16} style={{ color: '#38bdf8' }} />
        <span className="text-sm font-bold text-white">{t('brand.profile.title')}</span>
      </div>
      <div className="space-y-4">
        <div>
          <label className="text-xs font-medium mb-1.5 block" style={{ color: '#94a3b8' }}>{t('brand.profile.companyName')}</label>
          <input value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder={t('brand.profile.companyNamePh')} className={inputCls} style={inputStyle} />
        </div>
        <div>
          <label className="text-xs font-medium mb-1.5 block" style={{ color: '#94a3b8' }}>{t('brand.profile.website')}</label>
          <div className="relative">
            <Globe size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: '#475569' }} />
            <input value={website} onChange={e => setWebsite(e.target.value)} placeholder="https://yourcompany.com" className={inputCls} style={{ ...inputStyle, paddingLeft: '2.5rem' }} />
          </div>
        </div>
        <div>
          <label className="text-xs font-medium mb-1.5 block" style={{ color: '#94a3b8' }}>{t('brand.profile.description')}</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder={t('brand.profile.descriptionPh')} rows={3}
            className="w-full px-4 py-2.5 rounded-xl text-sm text-white placeholder:text-gray-600 outline-none transition-all focus:ring-1 focus:ring-sky-500/40 resize-none"
            style={inputStyle} />
        </div>
        <div className="flex items-center gap-3 pt-2">
          <button onClick={handleSave} disabled={saving}
            className="px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all hover:brightness-110 disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #0369a1, #0c4a6e)', color: '#fff', border: '1px solid rgba(56,189,248,0.3)' }}>
            <Save size={14} /> {saving ? t('brand.profile.saving') : t('brand.profile.save')}
          </button>
          {saved && <span className="text-xs font-semibold" style={{ color: '#00C48C' }}>{t('brand.profile.saved')}</span>}
        </div>
      </div>
    </div>
  );
}
