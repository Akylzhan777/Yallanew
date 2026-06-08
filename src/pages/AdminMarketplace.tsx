import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import {
  Users, ShoppingBag, DollarSign, TrendingUp, Shield, Ban,
  Trash2, CheckCircle, Clock, XCircle, RefreshCw, ExternalLink,
  ArrowLeft, Search, ChevronDown, AlertTriangle, Eye, EyeOff,
  Film, Upload, Link, Play,
} from 'lucide-react';

// ── Types ────────────────────────────────────────────────────────────────────

interface CreatorRow {
  id: string;
  user_id: string;
  display_name: string;
  username: string | null;
  avatar_url: string | null;
  category: string;
  followers_count: number;
  is_published: boolean;
  is_verified: boolean;
  is_hidden: boolean;
  status: string; // 'active' | 'hidden' | 'banned'
  onboarding_done: boolean;
  profile_completion: number;
  orders_completed: number;
  balance_total_earned: number;
  balance_on_hold: number;
  created_at: string;
}

interface OrderRow {
  id: string;
  creator_id: string;
  buyer_name: string;
  buyer_email: string;
  package_name: string;
  package_price: number;
  creator_net_amount: number;
  status: string;
  created_at: string;
  creator?: { display_name: string; username: string | null };
}

interface Metrics {
  totalCreators: number;
  activeCreators: number;
  bannedCreators: number;
  newThisWeek: number;
  activeDeals: number;
  escrowTotal: number;
  completedRevenue: number;
}

interface StockRow {
  id: string;
  seller_id: string;
  seller_name: string;
  title: string;
  category: string;
  description: string;
  price: number;
  preview_url: string;
  original_path: string;
  original_link: string | null;
  duration_seconds: number;
  resolution: string;
  views: number;
  sales_count: number;
  status: string;
  is_admin_global: boolean;
  created_at: string;
}

type Tab = 'overview' | 'creators' | 'orders' | 'stocks';

// ── Helpers ──────────────────────────────────────────────────────────────────

const ORDER_STATUS_META: Record<string, { label: string; color: string; bg: string; icon: JSX.Element }> = {
  on_hold:     { label: 'On Hold',     color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',  icon: <Clock size={12} /> },
  in_progress: { label: 'In Progress', color: '#3b82f6', bg: 'rgba(59,130,246,0.1)', icon: <TrendingUp size={12} /> },
  pending:     { label: 'Pending',     color: '#64748b', bg: 'rgba(100,116,139,0.1)', icon: <Clock size={12} /> },
  completed:   { label: 'Completed',   color: '#22c55e', bg: 'rgba(34,197,94,0.1)',  icon: <CheckCircle size={12} /> },
  cancelled:   { label: 'Cancelled',   color: '#ef4444', bg: 'rgba(239,68,68,0.1)',  icon: <XCircle size={12} /> },
  refunded:    { label: 'Refunded',    color: '#a78bfa', bg: 'rgba(167,139,250,0.1)', icon: <RefreshCw size={12} /> },
};

const CREATOR_STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  active: { label: 'Active', color: '#22c55e', bg: 'rgba(34,197,94,0.1)' },
  hidden: { label: 'Hidden', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
  banned: { label: 'Banned', color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
};

function OrderStatusBadge({ status }: { status: string }) {
  const meta = ORDER_STATUS_META[status] ?? ORDER_STATUS_META['pending'];
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
      style={{ color: meta.color, background: meta.bg }}>
      {meta.icon}{meta.label}
    </span>
  );
}

function CreatorStatusBadge({ status }: { status: string }) {
  const meta = CREATOR_STATUS_META[status] ?? CREATOR_STATUS_META['active'];
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold"
      style={{ color: meta.color, background: meta.bg }}>
      {meta.label}
    </span>
  );
}

function fmt(n: number) {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ── Confirm Modal ─────────────────────────────────────────────────────────────

interface ConfirmModalProps {
  title: string;
  body: string;
  confirmLabel: string;
  confirmColor: string;
  onConfirm: () => void;
  onCancel: () => void;
}

function ConfirmModal({ title, body, confirmLabel, confirmColor, onConfirm, onCancel }: ConfirmModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.75)' }}>
      <div className="rounded-2xl p-6 w-[340px] flex flex-col gap-4" style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="flex items-center gap-3">
          <AlertTriangle size={20} style={{ color: confirmColor }} />
          <span className="text-white font-semibold">{title}</span>
        </div>
        <p style={{ color: '#94a3b8', fontSize: '0.875rem', lineHeight: '1.5' }}>{body}</p>
        <div className="flex gap-3 pt-1">
          <button onClick={onCancel} className="flex-1 py-2.5 rounded-xl text-sm font-medium" style={{ background: 'rgba(255,255,255,0.05)', color: '#94a3b8' }}>Cancel</button>
          <button onClick={onConfirm} className="flex-1 py-2.5 rounded-xl text-sm font-medium" style={{ background: `${confirmColor}18`, color: confirmColor, border: `1px solid ${confirmColor}40` }}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

type PendingAction = { type: 'ban'; id: string } | { type: 'delete'; id: string };

export default function AdminMarketplace() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [tab, setTab] = useState<Tab>('overview');
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [creators, setCreators] = useState<CreatorRow[]>([]);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [creatorStatusFilter, setCreatorStatusFilter] = useState<string>('all');
  const [orderFilter, setOrderFilter] = useState<string>('all');
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  // Stock state
  const [stockTab, setStockTab] = useState<'moderation' | 'upload' | 'analytics'>('moderation');
  const [pendingStock, setPendingStock] = useState<StockRow[]>([]);
  const [allStock, setAllStock] = useState<StockRow[]>([]);
  const [stockLoading, setStockLoading] = useState(false);
  // Stock upload form
  const [sTitle, setSTitle] = useState('');
  const [sCategory, setSCategory] = useState('Drone');
  const [sPrice, setSPrice] = useState(50);
  const [sDescription, setSDescription] = useState('');
  const [sPreviewFile, setSPreviewFile] = useState<File | null>(null);
  const [sOriginalLink, setSOriginalLink] = useState('');
  const [sUploading, setSUploading] = useState(false);
  const [sFileKey, setSFileKey] = useState(0);

  // ── Auth check ──────────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setAuthed(false); return; }
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', session.user.id).maybeSingle();
      setAuthed(profile?.role === 'admin');
    })();
  }, []);

  // ── Data loading ─────────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [{ data: cData }, { data: oData }] = await Promise.all([
        supabase.from('creator_profiles').select('*').order('created_at', { ascending: false }),
        supabase.from('marketplace_orders').select('*, creator:creator_profiles(display_name,username)').order('created_at', { ascending: false }),
      ]);

      const c = (cData ?? []) as CreatorRow[];
      const o = (oData ?? []) as OrderRow[];
      setCreators(c);
      setOrders(o);

      const weekStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      setMetrics({
        totalCreators: c.length,
        activeCreators: c.filter(x => x.status === 'active' && !x.is_hidden).length,
        bannedCreators: c.filter(x => x.status === 'banned').length,
        newThisWeek: c.filter(x => x.created_at >= weekStart).length,
        activeDeals: o.filter(x => x.status === 'on_hold' || x.status === 'in_progress').length,
        escrowTotal: o.filter(x => x.status === 'on_hold').reduce((s, x) => s + x.package_price, 0),
        completedRevenue: o.filter(x => x.status === 'completed').reduce((s, x) => s + (x.package_price - x.creator_net_amount), 0),
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (authed) loadData(); }, [authed, loadData]);

  // ── Stock data loading ────────────────────────────────────────────────────────
  const loadStockData = async () => {
    setStockLoading(true);
    const [{ data: pending }, { data: approved }] = await Promise.all([
      supabase.from('stock_footage').select('*').eq('status', 'pending_approval').order('created_at', { ascending: false }),
      supabase.from('stock_footage').select('*').or('status.eq.approved,is_admin_global.eq.true').order('sales_count', { ascending: false }),
    ]);
    setPendingStock((pending ?? []) as StockRow[]);
    setAllStock((approved ?? []) as StockRow[]);
    setStockLoading(false);
  };

  useEffect(() => { if (authed && tab === 'stocks') loadStockData(); }, [authed, tab]);

  const approveStock = async (id: string) => {
    setActionLoading(id);
    const { error } = await supabase.from('stock_footage').update({ status: 'approved' }).eq('id', id);
    if (!error) {
      setPendingStock(prev => prev.filter(s => s.id !== id));
      showToast('Footage approved and published');
      loadStockData();
    } else showToast('Failed to approve', false);
    setActionLoading(null);
  };

  const rejectStock = async (id: string) => {
    setActionLoading(id);
    const { error } = await supabase.from('stock_footage').update({ status: 'rejected' }).eq('id', id);
    if (!error) {
      setPendingStock(prev => prev.filter(s => s.id !== id));
      showToast('Footage rejected');
    } else showToast('Failed to reject', false);
    setActionLoading(null);
  };

  const deleteStock = async (id: string) => {
    setActionLoading(id);
    const { error } = await supabase.from('stock_footage').delete().eq('id', id);
    if (!error) {
      setAllStock(prev => prev.filter(s => s.id !== id));
      showToast('Footage deleted');
    } else showToast('Failed to delete', false);
    setActionLoading(null);
  };

  const uploadAdminStock = async () => {
    if (!sTitle.trim() || !sPrice || !sPreviewFile) return;
    setSUploading(true);
    const ts = Date.now();
    const previewPath = `admin/${ts}-${sPreviewFile.name}`;
    const { error: upErr } = await supabase.storage.from('stock-previews').upload(previewPath, sPreviewFile);
    if (upErr) { showToast('Upload failed', false); setSUploading(false); return; }
    const { data: { publicUrl } } = supabase.storage.from('stock-previews').getPublicUrl(previewPath);
    const { error: dbErr } = await supabase.from('stock_footage').insert({
      seller_id: 'admin',
      seller_name: 'Platform',
      title: sTitle.trim(),
      category: sCategory,
      description: sDescription.trim(),
      price: sPrice,
      preview_url: publicUrl,
      thumbnail_url: publicUrl,
      original_path: '',
      original_link: sOriginalLink.trim() || null,
      duration_seconds: 0,
      resolution: '4K',
      status: 'approved',
      is_admin_global: true,
    });
    if (!dbErr) {
      showToast('Успешно загружено');
      setSTitle(''); setSDescription(''); setSPrice(50); setSPreviewFile(null); setSOriginalLink('');
      setSFileKey(k => k + 1);
      loadStockData();
    } else showToast('Failed to save', false);
    setSUploading(false);
  };

  // ── Toast helper ─────────────────────────────────────────────────────────────
  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  // ── Creator actions ──────────────────────────────────────────────────────────

  const toggleVerify = async (id: string, current: boolean) => {
    setActionLoading(id);
    const { error } = await supabase.from('creator_profiles').update({ is_verified: !current }).eq('id', id);
    if (!error) { setCreators(prev => prev.map(c => c.id === id ? { ...c, is_verified: !current } : c)); showToast(current ? 'Verification removed' : 'Creator verified'); }
    else showToast('Failed to update', false);
    setActionLoading(null);
  };

  const toggleHidden = async (id: string, current: boolean) => {
    setActionLoading(id);
    const newHidden = !current;
    const newStatus = newHidden ? 'hidden' : 'active';
    const { error } = await supabase.from('creator_profiles').update({ is_hidden: newHidden, status: newStatus }).eq('id', id);
    if (!error) {
      setCreators(prev => prev.map(c => c.id === id ? { ...c, is_hidden: newHidden, status: newStatus } : c));
      showToast(newHidden ? 'Creator hidden from marketplace' : 'Creator visible on marketplace');
    } else showToast('Failed to update', false);
    setActionLoading(null);
  };

  const banCreator = async (id: string) => {
    setActionLoading(id);
    const { error } = await supabase.from('creator_profiles').update({ status: 'banned', is_published: false, is_hidden: true }).eq('id', id);
    if (!error) {
      setCreators(prev => prev.map(c => c.id === id ? { ...c, status: 'banned', is_published: false, is_hidden: true } : c));
      showToast('Creator banned and removed from marketplace');
    } else showToast('Failed to ban', false);
    setActionLoading(null);
    setPendingAction(null);
  };

  const unbanCreator = async (id: string) => {
    setActionLoading(id);
    const { error } = await supabase.from('creator_profiles').update({ status: 'active', is_hidden: false }).eq('id', id);
    if (!error) {
      setCreators(prev => prev.map(c => c.id === id ? { ...c, status: 'active', is_hidden: false } : c));
      showToast('Creator unbanned');
    } else showToast('Failed to unban', false);
    setActionLoading(null);
  };

  const deleteCreator = async (id: string) => {
    setActionLoading(id);
    const { error } = await supabase.from('creator_profiles').delete().eq('id', id);
    if (!error) { setCreators(prev => prev.filter(c => c.id !== id)); showToast('Profile permanently deleted'); }
    else showToast('Failed to delete', false);
    setActionLoading(null);
    setPendingAction(null);
  };

  const updateOrderStatus = async (id: string, status: string) => {
    setActionLoading(id);
    const { error } = await supabase.from('marketplace_orders').update({ status, updated_at: new Date().toISOString() }).eq('id', id);
    if (!error) { setOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o)); showToast('Order status updated'); }
    else showToast('Failed to update', false);
    setActionLoading(null);
  };

  // ── Filters ───────────────────────────────────────────────────────────────────
  const filteredCreators = creators.filter(c => {
    const matchSearch = !search || c.display_name.toLowerCase().includes(search.toLowerCase()) || (c.username ?? '').toLowerCase().includes(search.toLowerCase());
    const matchStatus = creatorStatusFilter === 'all' || c.status === creatorStatusFilter;
    return matchSearch && matchStatus;
  });

  const filteredOrders = orders.filter(o =>
    (orderFilter === 'all' || o.status === orderFilter) &&
    (!search || o.buyer_name.toLowerCase().includes(search.toLowerCase()) || o.buyer_email.toLowerCase().includes(search.toLowerCase()))
  );

  // ── Render guards ─────────────────────────────────────────────────────────────
  if (authed === null) {
    return (
      <div className="admin-marketplace-root flex items-center justify-center min-h-screen" style={{ background: '#0a0f1a' }}>
        <div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: 'rgba(0,196,140,0.2)', borderTopColor: '#00C48C' }} />
      </div>
    );
  }

  if (authed === false) {
    return (
      <div className="admin-marketplace-root flex flex-col items-center justify-center min-h-screen gap-4" style={{ background: '#0a0f1a' }}>
        <Shield size={48} style={{ color: '#ef4444' }} />
        <p className="text-white text-lg font-semibold">Access Denied</p>
        <p style={{ color: '#64748b' }}>Admin privileges required.</p>
        <a href="/" className="px-4 py-2 rounded-xl text-sm font-medium" style={{ background: 'rgba(255,255,255,0.06)', color: '#e2e8f0' }}>Go Home</a>
      </div>
    );
  }

  const TABS: { id: Tab; label: string; icon: JSX.Element }[] = [
    { id: 'overview', label: 'Overview', icon: <TrendingUp size={15} /> },
    { id: 'creators', label: `Creators (${creators.length})`, icon: <Users size={15} /> },
    { id: 'orders',   label: `Orders (${orders.length})`,     icon: <ShoppingBag size={15} /> },
    { id: 'stocks',   label: `Stocks${pendingStock.length ? ` (${pendingStock.length})` : ''}`, icon: <Film size={15} /> },
  ];

  // pending action labels for confirm modal
  const confirmProps = pendingAction?.type === 'ban'
    ? {
        title: 'Ban this Creator?',
        body: 'The account will be suspended. The creator cannot log in to their dashboard and their public profile will show "Account suspended". You can unban them later.',
        confirmLabel: 'Ban Account',
        confirmColor: '#ef4444',
        onConfirm: () => banCreator(pendingAction.id),
      }
    : pendingAction?.type === 'delete'
    ? {
        title: 'Permanently Delete Profile?',
        body: 'This will delete the creator profile, all packages, and portfolio data. Orders linked to this profile will be orphaned. This cannot be undone.',
        confirmLabel: 'Delete Forever',
        confirmColor: '#ef4444',
        onConfirm: () => deleteCreator(pendingAction.id),
      }
    : null;

  return (
    <div className="admin-marketplace-root min-h-screen" style={{ background: '#0a0f1a' }}>
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 px-4 py-3 rounded-xl text-sm font-medium shadow-xl"
          style={{ background: toast.ok ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)', border: `1px solid ${toast.ok ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`, color: toast.ok ? '#22c55e' : '#ef4444' }}>
          {toast.msg}
        </div>
      )}

      {/* Confirm modal */}
      {pendingAction && confirmProps && (
        <ConfirmModal
          {...confirmProps}
          onCancel={() => setPendingAction(null)}
        />
      )}

      {/* Header */}
      <div className="sticky top-0 z-30" style={{ background: 'rgba(10,15,26,0.96)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center gap-4">
          <a href="/admin" className="flex items-center gap-1.5 text-sm" style={{ color: '#64748b' }}>
            <ArrowLeft size={15} /> Admin
          </a>
          <span style={{ color: '#1e293b' }}>/</span>
          <span className="text-white font-semibold">Marketplace Control</span>
          <div className="ml-auto flex items-center gap-2">
            <button onClick={loadData} disabled={loading}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium"
              style={{ background: 'rgba(255,255,255,0.04)', color: '#64748b', border: '1px solid rgba(255,255,255,0.06)' }}>
              <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Refresh
            </button>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-6 flex gap-1">
          {TABS.map(t => (
            <button key={t.id} onClick={() => { setTab(t.id); setSearch(''); }}
              className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-all border-b-2"
              style={{ borderColor: tab === t.id ? '#00C48C' : 'transparent', color: tab === t.id ? '#00C48C' : '#64748b', background: 'transparent' }}>
              {t.icon}{t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">

        {/* ── OVERVIEW ───────────────────────────────────────────────────────── */}
        {tab === 'overview' && (
          <>
            {loading || !metrics ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="rounded-2xl h-28 animate-pulse" style={{ background: 'rgba(255,255,255,0.03)' }} />
                ))}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {[
                    { label: 'Total Creators',     value: metrics.totalCreators.toString(),                   sub: `+${metrics.newThisWeek} this week`,  icon: <Users size={18} />,       color: '#3b82f6' },
                    { label: 'Active & Visible',   value: metrics.activeCreators.toString(),                  sub: 'on marketplace',                     icon: <Eye size={18} />,         color: '#00C48C' },
                    { label: 'Banned Accounts',    value: metrics.bannedCreators.toString(),                  sub: 'suspended',                          icon: <Ban size={18} />,         color: '#ef4444' },
                    { label: 'New This Week',      value: metrics.newThisWeek.toString(),                     sub: 'last 7 days',                        icon: <TrendingUp size={18} />,  color: '#f59e0b' },
                    { label: 'Active Deals',       value: metrics.activeDeals.toString(),                     sub: 'on_hold + in_progress',              icon: <ShoppingBag size={18} />, color: '#f59e0b' },
                    { label: 'Escrow (On Hold)',   value: `AED ${metrics.escrowTotal.toFixed(2)}`,            sub: 'awaiting release',                   icon: <Clock size={18} />,       color: '#f59e0b' },
                    { label: 'Platform Revenue',   value: `AED ${metrics.completedRevenue.toFixed(2)}`,       sub: 'from completed deals',               icon: <DollarSign size={18} />,  color: '#22c55e' },
                    { label: 'Total Orders',       value: orders.length.toString(),                           sub: 'all time',                           icon: <ShoppingBag size={18} />, color: '#64748b' },
                  ].map(m => (
                    <div key={m.label} className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <div className="flex items-start justify-between mb-3">
                        <p className="text-xs font-medium" style={{ color: '#64748b' }}>{m.label}</p>
                        <div className="p-2 rounded-xl" style={{ background: `${m.color}18` }}>
                          <span style={{ color: m.color }}>{m.icon}</span>
                        </div>
                      </div>
                      <p className="text-2xl font-bold text-white">{m.value}</p>
                      <p className="text-xs mt-1" style={{ color: '#374151' }}>{m.sub}</p>
                    </div>
                  ))}
                </div>

                <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div className="px-6 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <h3 className="text-white font-semibold">Recent Orders</h3>
                  </div>
                  <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                    {orders.slice(0, 8).map(o => (
                      <div key={o.id} className="px-6 py-3 flex items-center gap-4">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-white font-medium truncate">{o.buyer_name || o.buyer_email}</p>
                          <p className="text-xs truncate" style={{ color: '#64748b' }}>→ {(o.creator as { display_name: string } | undefined)?.display_name ?? 'Unknown'} · {o.package_name}</p>
                        </div>
                        <p className="text-sm font-semibold text-white">AED {o.package_price}</p>
                        <OrderStatusBadge status={o.status} />
                        <p className="text-xs" style={{ color: '#374151' }}>{fmtDate(o.created_at)}</p>
                      </div>
                    ))}
                    {orders.length === 0 && (
                      <div className="px-6 py-10 text-center" style={{ color: '#374151' }}>No orders yet</div>
                    )}
                  </div>
                </div>
              </>
            )}
          </>
        )}

        {/* ── CREATORS ───────────────────────────────────────────────────────── */}
        {tab === 'creators' && (
          <div className="space-y-4">
            <div className="flex gap-3 flex-wrap">
              <div className="relative flex-1 max-w-sm">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#374151' }} />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or @username..."
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#e2e8f0' }} />
              </div>
              <div className="relative">
                <select value={creatorStatusFilter} onChange={e => setCreatorStatusFilter(e.target.value)}
                  className="appearance-none pl-3 pr-8 py-2.5 rounded-xl text-sm outline-none"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#e2e8f0' }}>
                  <option value="all">All statuses</option>
                  <option value="active">Active</option>
                  <option value="hidden">Hidden</option>
                  <option value="banned">Banned</option>
                </select>
                <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: '#374151' }} />
              </div>
            </div>

            <div className="rounded-2xl overflow-x-auto" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    {['Creator', 'Category', 'Followers', 'Moderation', 'Profile', 'Joined', 'Actions'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-medium whitespace-nowrap" style={{ color: '#374151' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredCreators.map(c => (
                    <tr key={c.id} className="transition-colors"
                      style={{
                        borderBottom: '1px solid rgba(255,255,255,0.03)',
                        background: c.status === 'banned' ? 'rgba(239,68,68,0.04)' : c.is_hidden ? 'rgba(245,158,11,0.03)' : 'transparent',
                        opacity: c.status === 'banned' ? 0.75 : 1,
                      }}>

                      {/* Creator cell */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          {c.avatar_url
                            ? <img src={c.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                            : <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ background: 'rgba(0,196,140,0.15)', color: '#00C48C' }}>{(c.display_name[0] ?? '?').toUpperCase()}</div>}
                          <div className="min-w-0">
                            <p className="text-white font-medium truncate">{c.display_name}</p>
                            {c.username && (
                              <a href={`/${c.username}`} target="_blank" rel="noopener noreferrer"
                                className="text-xs flex items-center gap-0.5 w-fit" style={{ color: '#00C48C' }}>
                                /{c.username} <ExternalLink size={9} />
                              </a>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="px-4 py-3">
                        <span className="text-xs px-2 py-0.5 rounded-full whitespace-nowrap" style={{ background: 'rgba(255,255,255,0.05)', color: '#94a3b8' }}>{c.category}</span>
                      </td>

                      {/* Followers */}
                      <td className="px-4 py-3 text-white">{fmt(c.followers_count)}</td>

                      {/* Moderation status */}
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1">
                          <CreatorStatusBadge status={c.status} />
                          {c.is_verified && (
                            <span className="inline-flex items-center gap-1 text-xs" style={{ color: '#00C48C' }}>
                              <Shield size={10} /> Verified
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Profile completion */}
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <div className="w-14 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                              <div className="h-full rounded-full" style={{ width: `${c.profile_completion}%`, background: '#00C48C' }} />
                            </div>
                            <span className="text-xs" style={{ color: '#64748b' }}>{c.profile_completion}%</span>
                          </div>
                          {c.is_published
                            ? <span className="text-xs" style={{ color: '#22c55e' }}>Live</span>
                            : <span className="text-xs" style={{ color: '#374151' }}>Draft</span>}
                        </div>
                      </td>

                      {/* Joined */}
                      <td className="px-4 py-3 text-xs whitespace-nowrap" style={{ color: '#64748b' }}>{fmtDate(c.created_at)}</td>

                      {/* Actions */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">

                          {/* Verify / Unverify */}
                          <button onClick={() => toggleVerify(c.id, c.is_verified)} disabled={actionLoading === c.id || c.status === 'banned'}
                            title={c.is_verified ? 'Remove verification' : 'Verify creator'}
                            className="p-1.5 rounded-lg transition-all"
                            style={{ background: c.is_verified ? 'rgba(0,196,140,0.15)' : 'rgba(255,255,255,0.04)', color: c.is_verified ? '#00C48C' : '#475569' }}>
                            <Shield size={13} />
                          </button>

                          {/* Hide / Show */}
                          <button
                            onClick={() => c.status !== 'banned' && toggleHidden(c.id, c.is_hidden)}
                            disabled={actionLoading === c.id || c.status === 'banned'}
                            title={c.is_hidden ? 'Show on marketplace' : 'Hide from marketplace'}
                            className="p-1.5 rounded-lg transition-all"
                            style={{ background: c.is_hidden ? 'rgba(245,158,11,0.15)' : 'rgba(255,255,255,0.04)', color: c.is_hidden ? '#f59e0b' : '#475569' }}>
                            {c.is_hidden ? <EyeOff size={13} /> : <Eye size={13} />}
                          </button>

                          {/* Ban / Unban */}
                          {c.status === 'banned' ? (
                            <button onClick={() => unbanCreator(c.id)} disabled={actionLoading === c.id}
                              title="Unban creator"
                              className="p-1.5 rounded-lg transition-all"
                              style={{ background: 'rgba(34,197,94,0.12)', color: '#22c55e' }}>
                              <CheckCircle size={13} />
                            </button>
                          ) : (
                            <button onClick={() => setPendingAction({ type: 'ban', id: c.id })} disabled={actionLoading === c.id}
                              title="Ban user"
                              className="p-1.5 rounded-lg transition-all"
                              style={{ background: 'rgba(255,255,255,0.04)', color: '#475569' }}
                              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#ef4444'; (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.1)'; }}
                              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = '#475569'; (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.04)'; }}>
                              <Ban size={13} />
                            </button>
                          )}

                          {/* Delete */}
                          <button onClick={() => setPendingAction({ type: 'delete', id: c.id })} disabled={actionLoading === c.id}
                            title="Delete profile permanently"
                            className="p-1.5 rounded-lg transition-all"
                            style={{ background: 'rgba(255,255,255,0.04)', color: '#475569' }}
                            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#ef4444'; (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.1)'; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = '#475569'; (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.04)'; }}>
                            <Trash2 size={13} />
                          </button>

                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredCreators.length === 0 && (
                <div className="py-16 text-center" style={{ color: '#374151' }}>No creators found</div>
              )}
            </div>
          </div>
        )}

        {/* ── ORDERS ─────────────────────────────────────────────────────────── */}
        {tab === 'orders' && (
          <div className="space-y-4">
            <div className="flex gap-3 flex-wrap">
              <div className="relative flex-1 max-w-sm">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#374151' }} />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by buyer..."
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#e2e8f0' }} />
              </div>
              <div className="relative">
                <select value={orderFilter} onChange={e => setOrderFilter(e.target.value)}
                  className="appearance-none pl-3 pr-8 py-2.5 rounded-xl text-sm outline-none"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#e2e8f0' }}>
                  <option value="all">All statuses</option>
                  {Object.keys(ORDER_STATUS_META).map(s => <option key={s} value={s}>{ORDER_STATUS_META[s].label}</option>)}
                </select>
                <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: '#374151' }} />
              </div>
            </div>

            <div className="rounded-2xl overflow-x-auto" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    {['Buyer', 'Creator', 'Package', 'Amount', 'Creator Net', 'Status', 'Date', 'Actions'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-medium whitespace-nowrap" style={{ color: '#374151' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map(o => (
                    <tr key={o.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                      <td className="px-4 py-3">
                        <p className="text-white font-medium">{o.buyer_name || '—'}</p>
                        <p className="text-xs" style={{ color: '#64748b' }}>{o.buyer_email}</p>
                      </td>
                      <td className="px-4 py-3 text-white whitespace-nowrap">{(o.creator as { display_name: string } | undefined)?.display_name ?? '—'}</td>
                      <td className="px-4 py-3" style={{ color: '#94a3b8' }}>{o.package_name}</td>
                      <td className="px-4 py-3 text-white font-semibold whitespace-nowrap">AED {o.package_price}</td>
                      <td className="px-4 py-3 whitespace-nowrap" style={{ color: '#00C48C' }}>AED {o.creator_net_amount}</td>
                      <td className="px-4 py-3"><OrderStatusBadge status={o.status} /></td>
                      <td className="px-4 py-3 text-xs whitespace-nowrap" style={{ color: '#64748b' }}>{fmtDate(o.created_at)}</td>
                      <td className="px-4 py-3">
                        <div className="relative">
                          <select defaultValue={o.status}
                            onChange={e => updateOrderStatus(o.id, e.target.value)}
                            disabled={actionLoading === o.id}
                            className="appearance-none pl-2 pr-6 py-1 rounded-lg text-xs outline-none"
                            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#94a3b8', cursor: 'pointer' }}>
                            {Object.keys(ORDER_STATUS_META).map(s => <option key={s} value={s}>{ORDER_STATUS_META[s].label}</option>)}
                          </select>
                          <ChevronDown size={10} className="absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: '#374151' }} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredOrders.length === 0 && (
                <div className="py-16 text-center" style={{ color: '#374151' }}>No orders found</div>
              )}
            </div>
          </div>
        )}

        {/* ── STOCKS ──────────────────────────────────────────────────────────── */}
        {tab === 'stocks' && (
          <div className="space-y-6">
            {/* Sub-tabs */}
            <div className="flex gap-2">
              {([
                { id: 'moderation' as const, label: `Moderation${pendingStock.length ? ` (${pendingStock.length})` : ''}` },
                { id: 'upload' as const, label: 'Upload Stock' },
                { id: 'analytics' as const, label: 'All Footage & Analytics' },
              ]).map(st => (
                <button key={st.id} onClick={() => setStockTab(st.id)}
                  className="px-4 py-2 rounded-xl text-sm font-medium transition-all"
                  style={{
                    background: stockTab === st.id ? 'rgba(0,196,140,0.1)' : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${stockTab === st.id ? 'rgba(0,196,140,0.3)' : 'rgba(255,255,255,0.06)'}`,
                    color: stockTab === st.id ? '#00C48C' : '#64748b',
                  }}>
                  {st.label}
                </button>
              ))}
            </div>

            {/* Moderation sub-tab */}
            {stockTab === 'moderation' && (
              <div className="space-y-4">
                {stockLoading ? (
                  <div className="py-16 text-center"><div className="w-6 h-6 mx-auto border-2 rounded-full animate-spin" style={{ borderColor: 'rgba(0,196,140,0.2)', borderTopColor: '#00C48C' }} /></div>
                ) : pendingStock.length === 0 ? (
                  <div className="rounded-2xl py-16 text-center" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <CheckCircle size={32} className="mx-auto mb-3" style={{ color: '#22c55e' }} />
                    <p className="text-white font-medium">All clear</p>
                    <p className="text-xs mt-1" style={{ color: '#64748b' }}>No footage pending approval</p>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {pendingStock.map(item => (
                      <div key={item.id} className="rounded-2xl p-5 flex gap-5" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)' }}>
                        {/* Preview */}
                        <div className="w-36 h-24 rounded-xl overflow-hidden flex-shrink-0 relative" style={{ background: 'rgba(0,0,0,0.3)' }}>
                          {item.preview_url ? (
                            <img src={item.preview_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center"><Play size={20} style={{ color: '#374151' }} /></div>
                          )}
                          <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded text-[9px] font-bold" style={{ background: 'rgba(0,0,0,0.7)', color: '#fff' }}>{item.resolution}</div>
                        </div>
                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-white font-semibold">{item.title}</p>
                              <p className="text-xs mt-0.5" style={{ color: '#64748b' }}>{item.category} · by {item.seller_name}</p>
                            </div>
                            <p className="text-sm font-bold flex-shrink-0" style={{ color: '#00C48C' }}>{item.price} AED</p>
                          </div>
                          {item.description && <p className="text-xs mt-2 line-clamp-2" style={{ color: '#94a3b8' }}>{item.description}</p>}
                          {(item.original_link || item.original_path) && (
                            <a href={item.original_link || '#'} target="_blank" rel="noreferrer"
                              className="inline-flex items-center gap-1 text-xs mt-2" style={{ color: '#60a5fa' }}>
                              <Link size={10} /> Original file link
                            </a>
                          )}
                          <div className="flex items-center gap-2 mt-3">
                            <button onClick={() => approveStock(item.id)} disabled={actionLoading === item.id}
                              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all"
                              style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', color: '#22c55e' }}>
                              <CheckCircle size={12} /> Approve
                            </button>
                            <button onClick={() => rejectStock(item.id)} disabled={actionLoading === item.id}
                              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all"
                              style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444' }}>
                              <XCircle size={12} /> Reject
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Upload sub-tab */}
            {stockTab === 'upload' && (
              <div className="max-w-xl">
                <div className="rounded-2xl p-6 space-y-5" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div>
                    <p className="text-white font-semibold mb-1">Upload Global Stock Footage</p>
                    <p className="text-xs" style={{ color: '#64748b' }}>This will be published immediately as a platform-owned clip. 100% revenue goes to the company.</p>
                  </div>

                  <div>
                    <label className="block text-xs font-medium mb-1.5 uppercase tracking-wide" style={{ color: '#64748b' }}>Title *</label>
                    <input value={sTitle} onChange={e => setSTitle(e.target.value)} placeholder="Aerial Dubai Marina Sunset"
                      className="w-full rounded-xl px-4 py-3 text-sm outline-none"
                      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#e2e8f0' }} />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium mb-1.5 uppercase tracking-wide" style={{ color: '#64748b' }}>Category *</label>
                      <select value={sCategory} onChange={e => setSCategory(e.target.value)}
                        className="w-full rounded-xl px-4 py-3 text-sm outline-none appearance-none"
                        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#e2e8f0' }}>
                        {['Drone', 'City', 'Interior', 'Nature', 'People', 'Food', 'Tech', 'Abstract', 'Lifestyle'].map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1.5 uppercase tracking-wide" style={{ color: '#64748b' }}>Price (AED) *</label>
                      <input type="number" min={1} value={sPrice} onChange={e => setSPrice(Number(e.target.value))}
                        className="w-full rounded-xl px-4 py-3 text-sm outline-none"
                        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#e2e8f0' }} />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium mb-1.5 uppercase tracking-wide" style={{ color: '#64748b' }}>Description</label>
                    <textarea value={sDescription} onChange={e => setSDescription(e.target.value)} rows={2}
                      placeholder="4K 60fps aerial footage of Downtown Dubai at golden hour..."
                      className="w-full rounded-xl px-4 py-3 text-sm outline-none resize-none"
                      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#e2e8f0' }} />
                  </div>

                  <div>
                    <label className="block text-xs font-medium mb-1.5 uppercase tracking-wide" style={{ color: '#64748b' }}>Preview Video / Image *</label>
                    <label className="flex items-center gap-2 px-4 py-3 rounded-xl cursor-pointer transition-all"
                      style={{ background: 'rgba(255,255,255,0.04)', border: '1px dashed rgba(255,255,255,0.15)', color: '#64748b' }}>
                      <Upload size={15} />
                      <span className="text-sm">{sPreviewFile ? sPreviewFile.name : 'Choose file...'}</span>
                      <input key={sFileKey} type="file" accept="image/*,video/*" className="hidden" onChange={e => setSPreviewFile(e.target.files?.[0] ?? null)} />
                    </label>
                  </div>

                  <div>
                    <label className="block text-xs font-medium mb-1.5 uppercase tracking-wide" style={{ color: '#64748b' }}>Original File Link (Google Drive / Dropbox)</label>
                    <div className="relative">
                      <Link size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: '#374151' }} />
                      <input value={sOriginalLink} onChange={e => setSOriginalLink(e.target.value)}
                        placeholder="https://drive.google.com/file/d/..."
                        className="w-full pl-9 pr-4 rounded-xl px-4 py-3 text-sm outline-none"
                        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#e2e8f0' }} />
                    </div>
                  </div>

                  <button onClick={uploadAdminStock} disabled={sUploading || !sTitle.trim() || !sPrice || !sPreviewFile}
                    className="w-full py-3 rounded-xl text-sm font-bold transition-all disabled:opacity-40"
                    style={{ background: 'rgba(0,196,140,0.15)', border: '1px solid rgba(0,196,140,0.3)', color: '#00C48C' }}>
                    {sUploading ? 'Uploading...' : 'Publish Stock Footage'}
                  </button>
                </div>
              </div>
            )}

            {/* Analytics sub-tab */}
            {stockTab === 'analytics' && (
              <div className="space-y-4">
                {/* Summary cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <p className="text-xs" style={{ color: '#64748b' }}>Total Clips</p>
                    <p className="text-xl font-bold text-white mt-1">{allStock.length}</p>
                  </div>
                  <div className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <p className="text-xs" style={{ color: '#64748b' }}>Total Sales</p>
                    <p className="text-xl font-bold text-white mt-1">{allStock.reduce((s, f) => s + f.sales_count, 0)}</p>
                  </div>
                  <div className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <p className="text-xs" style={{ color: '#64748b' }}>Total Revenue (AED)</p>
                    <p className="text-xl font-bold" style={{ color: '#00C48C' }}>{allStock.reduce((s, f) => s + f.sales_count * f.price, 0).toLocaleString()}</p>
                  </div>
                  <div className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <p className="text-xs" style={{ color: '#64748b' }}>Platform (Admin) Clips</p>
                    <p className="text-xl font-bold text-white mt-1">{allStock.filter(f => f.is_admin_global).length}</p>
                  </div>
                </div>

                {/* Table */}
                {stockLoading ? (
                  <div className="py-16 text-center"><div className="w-6 h-6 mx-auto border-2 rounded-full animate-spin" style={{ borderColor: 'rgba(0,196,140,0.2)', borderTopColor: '#00C48C' }} /></div>
                ) : (
                  <div className="rounded-2xl overflow-x-auto" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <table className="w-full text-sm">
                      <thead>
                        <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                          {['Title', 'Author', 'Category', 'Price', 'Sales', 'Revenue', 'Actions'].map(h => (
                            <th key={h} className="px-4 py-3 text-left text-xs font-medium whitespace-nowrap" style={{ color: '#374151' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {allStock.map(f => (
                          <tr key={f.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2.5">
                                <div className="w-10 h-7 rounded overflow-hidden flex-shrink-0" style={{ background: 'rgba(0,0,0,0.3)' }}>
                                  {f.preview_url ? <img src={f.preview_url} alt="" className="w-full h-full object-cover" /> : <Play size={12} className="mx-auto mt-1.5" style={{ color: '#374151' }} />}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-white font-medium truncate">{f.title}</p>
                                  {f.is_admin_global && <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: 'rgba(96,165,250,0.1)', color: '#60a5fa' }}>Admin</span>}
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap" style={{ color: '#94a3b8' }}>{f.seller_name}</td>
                            <td className="px-4 py-3">
                              <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.05)', color: '#94a3b8' }}>{f.category}</span>
                            </td>
                            <td className="px-4 py-3 text-white font-semibold">{f.price} AED</td>
                            <td className="px-4 py-3 text-white">{f.sales_count}</td>
                            <td className="px-4 py-3 font-semibold" style={{ color: '#00C48C' }}>{(f.sales_count * f.price).toLocaleString()} AED</td>
                            <td className="px-4 py-3">
                              <button onClick={() => deleteStock(f.id)} disabled={actionLoading === f.id}
                                title="Delete footage"
                                className="p-1.5 rounded-lg transition-all"
                                style={{ background: 'rgba(255,255,255,0.04)', color: '#475569' }}
                                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#ef4444'; (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.1)'; }}
                                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = '#475569'; (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.04)'; }}>
                                <Trash2 size={13} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {allStock.length === 0 && (
                      <div className="py-16 text-center" style={{ color: '#374151' }}>No approved footage yet</div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
