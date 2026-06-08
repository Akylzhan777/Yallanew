import { useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import {
  Users, ShoppingBag, DollarSign, TrendingUp, Shield, Ban,
  Trash2, CheckCircle, Clock, XCircle, RefreshCw, ExternalLink,
  Search, ChevronDown, AlertTriangle, Eye, EyeOff, Pencil,
  Plus, X, Save, Film, Upload, Link, Play, LayoutDashboard, Image,
  Smartphone,
} from 'lucide-react';

// ── Types ────────────────────────────────────────────────────────────────────

interface Package {
  id: string;
  name: string;
  description: string;
  price: number;
  deliverables: string;
  delivery_days: number;
}

interface CreatorRow {
  id: string;
  user_id: string;
  display_name: string;
  username: string | null;
  handle: string | null;
  bio: string | null;
  bio_en: string | null;
  bio_ru: string | null;
  bio_ar: string | null;
  category: string;
  location: string | null;
  avatar_url: string | null;
  followers_count: number;
  avg_views: number;
  engagement_rate: number;
  instagram_url: string | null;
  tiktok_url: string | null;
  youtube_url: string | null;
  whatsapp_number: string | null;
  packages: Package[];
  is_published: boolean;
  is_verified: boolean;
  is_hidden: boolean;
  is_featured: boolean;
  status: string;
  onboarding_done: boolean;
  profile_completion: number;
  orders_completed: number;
  balance_total_earned: number;
  balance_on_hold: number;
  created_at: string;
  creator_type: string;
  region: string;
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

type SubTab = 'overview' | 'creators' | 'orders' | 'stocks' | 'editor';

// ── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES = [
  'lifestyle', 'beauty', 'fitness', 'food', 'travel', 'fashion',
  'tech', 'business', 'education', 'entertainment', 'gaming', 'music', 'other',
];

const ORDER_STATUS_META: Record<string, { label: string; color: string; bg: string; icon: JSX.Element }> = {
  on_hold:     { label: 'On Hold',     color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',   icon: <Clock size={12} /> },
  in_progress: { label: 'In Progress', color: '#3b82f6', bg: 'rgba(59,130,246,0.1)',  icon: <TrendingUp size={12} /> },
  pending:     { label: 'Pending',     color: '#64748b', bg: 'rgba(100,116,139,0.1)', icon: <Clock size={12} /> },
  completed:   { label: 'Completed',   color: '#22c55e', bg: 'rgba(34,197,94,0.1)',   icon: <CheckCircle size={12} /> },
  cancelled:   { label: 'Cancelled',   color: '#ef4444', bg: 'rgba(239,68,68,0.1)',   icon: <XCircle size={12} /> },
  refunded:    { label: 'Refunded',    color: '#a78bfa', bg: 'rgba(167,139,250,0.1)', icon: <RefreshCw size={12} /> },
};

const CREATOR_STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  active: { label: 'Active', color: '#22c55e', bg: 'rgba(34,197,94,0.1)' },
  hidden: { label: 'Hidden', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
  banned: { label: 'Banned', color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
};

// ── Small helpers ─────────────────────────────────────────────────────────────

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

function fmtReach(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function newPkg(): Package {
  return { id: crypto.randomUUID(), name: '', description: '', price: 0, deliverables: '', delivery_days: 3 };
}

// ── Confirm Modal ─────────────────────────────────────────────────────────────

function ConfirmModal({ title, body, confirmLabel, confirmColor, onConfirm, onCancel }: {
  title: string; body: string; confirmLabel: string; confirmColor: string;
  onConfirm: () => void; onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.75)' }}>
      <div className="rounded-2xl p-6 w-[340px] flex flex-col gap-4" style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="flex items-center gap-3">
          <AlertTriangle size={20} style={{ color: confirmColor }} />
          <span className="text-white font-semibold">{title}</span>
        </div>
        <p style={{ color: '#94a3b8', fontSize: '0.875rem', lineHeight: '1.5' }}>{body}</p>
        <div className="flex gap-3 pt-1">
          <button onClick={onCancel} className="flex-1 py-2.5 rounded-xl text-sm font-medium" style={{ background: 'rgba(255,255,255,0.05)', color: '#94a3b8' }}>Отмена</button>
          <button onClick={onConfirm} className="flex-1 py-2.5 rounded-xl text-sm font-medium" style={{ background: `${confirmColor}18`, color: confirmColor, border: `1px solid ${confirmColor}40` }}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

// ── Edit Creator Modal ────────────────────────────────────────────────────────

interface EditForm {
  display_name: string;
  username: string;
  handle: string;
  bio: string;
  category: string;
  location: string;
  region: string;
  followers_count: string;
  avg_views: string;
  engagement_rate: string;
  instagram_url: string;
  tiktok_url: string;
  youtube_url: string;
  is_verified: boolean;
  is_published: boolean;
  is_featured: boolean;
  status: string;
  packages: Package[];
}

function toForm(c: CreatorRow): EditForm {
  return {
    display_name: c.display_name,
    username: c.username ?? '',
    handle: c.handle ?? '',
    bio: c.bio ?? '',
    category: c.category,
    location: c.location ?? '',
    region: c.region ?? 'UAE',
    followers_count: String(c.followers_count),
    avg_views: String(c.avg_views),
    engagement_rate: String(c.engagement_rate),
    instagram_url: c.instagram_url ?? '',
    tiktok_url: c.tiktok_url ?? '',
    youtube_url: c.youtube_url ?? '',
    is_verified: c.is_verified,
    is_published: c.is_published,
    is_featured: c.is_featured ?? false,
    status: c.status,
    packages: c.packages?.length ? c.packages : [],
  };
}

function EditCreatorModal({ creator, onSave, onClose, showToast }: {
  creator: CreatorRow;
  onSave: (updated: CreatorRow) => void;
  onClose: () => void;
  showToast: (msg: string, ok?: boolean) => void;
}) {
  const [form, setForm] = useState<EditForm>(toForm(creator));
  const [saving, setSaving] = useState(false);
  const [email, setEmail] = useState<string>('');
  const [avatarUrl, setAvatarUrl] = useState<string>(creator.avatar_url ?? '');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.rpc('get_creator_emails');
      if (data) {
        const match = data.find((r: any) => r.user_id === creator.user_id);
        if (match) setEmail(match.email);
      }
    })();
  }, [creator.user_id]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const ext = file.name.split('.').pop() ?? 'jpg';
    const path = `${creator.user_id}/avatar_${Date.now()}.${ext}`;
    const { error: uploadErr } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
    if (uploadErr) {
      showToast('Ошибка загрузки: ' + uploadErr.message, false);
      setUploading(false);
      return;
    }
    const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
    const newUrl = urlData.publicUrl;
    const { error: updateErr } = await supabase.from('creator_profiles').update({ avatar_url: newUrl }).eq('id', creator.id);
    if (updateErr) {
      showToast('Ошибка обновления профиля: ' + updateErr.message, false);
    } else {
      setAvatarUrl(newUrl);
      showToast('Аватар успешно обновлен');
      onSave({ ...creator, avatar_url: newUrl });
    }
    setUploading(false);
  };

  const set = (k: keyof EditForm, v: string | boolean | Package[]) =>
    setForm(prev => ({ ...prev, [k]: v }));

  const setPkg = (idx: number, field: keyof Package, val: string | number) => {
    const updated = form.packages.map((p, i) => i === idx ? { ...p, [field]: val } : p);
    set('packages', updated);
  };

  const addPkg = () => set('packages', [...form.packages, newPkg()]);

  const removePkg = (idx: number) => set('packages', form.packages.filter((_, i) => i !== idx));

  const save = async () => {
    if (!form.display_name.trim()) { showToast('Display Name обязателен', false); return; }
    setSaving(true);
    const payload = {
      display_name: form.display_name.trim(),
      username: form.username.trim() || null,
      handle: form.handle.trim() || null,
      bio: form.bio.trim(),
      category: form.category,
      location: form.location.trim(),
      region: form.region,
      followers_count: parseInt(form.followers_count) || 0,
      avg_views: parseInt(form.avg_views) || 0,
      engagement_rate: parseFloat(form.engagement_rate) || 0,
      instagram_url: form.instagram_url.trim() || null,
      tiktok_url: form.tiktok_url.trim() || null,
      youtube_url: form.youtube_url.trim() || null,
      is_verified: form.is_verified,
      is_published: form.is_published,
      is_featured: form.is_featured,
      status: form.status,
      is_hidden: form.status === 'hidden' || form.status === 'banned',
      packages: form.packages,
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase.from('creator_profiles').update(payload).eq('id', creator.id);
    if (error) {
      showToast('Ошибка сохранения: ' + error.message, false);
    } else {
      onSave({ ...creator, ...payload, packages: form.packages });
      showToast('Профиль успешно обновлён');
      onClose();
    }
    setSaving(false);
  };

  const inputStyle = {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.1)',
    color: '#e2e8f0',
    borderRadius: 10,
    padding: '8px 12px',
    width: '100%',
    fontSize: '0.875rem',
    outline: 'none',
  };

  const labelStyle = { color: '#64748b', fontSize: '0.75rem', fontWeight: 500, marginBottom: 4, display: 'block' as const };

  const sectionStyle = {
    background: 'rgba(255,255,255,0.025)',
    border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: 14,
    padding: '16px 20px',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto py-8 px-4"
      style={{ background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(6px)' }}>
      <div className="w-full max-w-3xl flex flex-col gap-5"
        style={{ background: '#0d1525', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 20 }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-0">
          <div className="flex items-center gap-3">
            {avatarUrl
              ? <img src={avatarUrl} alt="" className="w-10 h-10 rounded-full object-cover" />
              : <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold" style={{ background: 'rgba(0,196,140,0.15)', color: '#00C48C' }}>{(creator.display_name[0] ?? '?').toUpperCase()}</div>}
            <div>
              <p className="text-white font-semibold">{creator.display_name}</p>
              <p className="text-xs" style={{ color: '#64748b' }}>ID: {creator.id.slice(0, 8)}...</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg transition-all" style={{ background: 'rgba(255,255,255,0.04)', color: '#64748b' }}>
            <X size={18} />
          </button>
        </div>

        <div className="px-6 pb-6 flex flex-col gap-5">

          {/* Profile Media / Avatar */}
          <div style={sectionStyle}>
            <p className="text-white font-medium text-sm mb-4">Медиа профиля</p>
            <div className="flex items-center gap-5">
              <div className="relative">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="avatar" className="w-20 h-20 rounded-2xl object-cover" style={{ border: '2px solid rgba(56,189,248,0.3)' }} />
                ) : (
                  <div className="w-20 h-20 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.04)', border: '2px dashed rgba(255,255,255,0.15)' }}>
                    <Image size={24} style={{ color: '#475569' }} />
                  </div>
                )}
                {uploading && (
                  <div className="absolute inset-0 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.7)' }}>
                    <div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#38bdf8', borderTopColor: 'transparent' }} />
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <label className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all hover:brightness-110" style={{ background: 'rgba(56,189,248,0.1)', color: '#38bdf8', border: '1px solid rgba(56,189,248,0.25)' }}>
                  <Upload size={14} />
                  {avatarUrl ? 'Изменить фото' : 'Загрузить фото'}
                  <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleAvatarUpload} disabled={uploading} />
                </label>
                <p className="text-[10px]" style={{ color: '#475569' }}>JPG, PNG, WebP. Макс 5MB.</p>
              </div>
            </div>
          </div>

          {/* Basic Info */}
          <div style={sectionStyle}>
            <p className="text-white font-medium text-sm mb-4">Основная информация</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label style={labelStyle}>Display Name *</label>
                <input style={inputStyle} value={form.display_name} onChange={e => set('display_name', e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>Username (URL handle)</label>
                <input style={inputStyle} value={form.username} onChange={e => set('username', e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))} placeholder="username" />
              </div>
              <div>
                <label style={labelStyle}>Handle / @nickname</label>
                <input style={inputStyle} value={form.handle} onChange={e => set('handle', e.target.value)} placeholder="@handle" />
              </div>
              <div>
                <label style={labelStyle}>Локация</label>
                <input style={inputStyle} value={form.location} onChange={e => set('location', e.target.value)} placeholder="Dubai, UAE" />
              </div>
              <div>
                <label style={labelStyle}>Регион профиля</label>
                <select
                  value={form.region}
                  onChange={e => set('region', e.target.value)}
                  style={{ ...inputStyle, cursor: 'pointer' }}
                >
                  <option value="UAE">UAE — United Arab Emirates</option>
                  <option value="KZ">KZ — Kazakhstan</option>
                </select>
              </div>
              <div className="col-span-2">
                <label style={labelStyle}>WhatsApp</label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 relative">
                    <input
                      style={inputStyle}
                      value={creator.whatsapp_number ?? ''}
                      readOnly
                      placeholder="Нет номера"
                    />
                  </div>
                  {creator.whatsapp_number && (
                    <>
                      <a
                        href={`https://wa.me/${creator.whatsapp_number.replace(/[\s+\-()]/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all hover:brightness-110"
                        style={{ background: 'rgba(34,197,94,0.12)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.25)' }}
                      >
                        <Smartphone size={13} /> Написать
                      </a>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(creator.whatsapp_number!);
                          showToast('Номер скопирован');
                        }}
                        className="flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-bold transition-all hover:brightness-110"
                        style={{ background: 'rgba(255,255,255,0.04)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.1)' }}
                      >
                        <Link size={12} /> Copy
                      </button>
                    </>
                  )}
                </div>
              </div>
              <div className="col-span-2">
                <label style={labelStyle}>Email</label>
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <input style={inputStyle} value={email} readOnly placeholder="Загрузка..." />
                  </div>
                  {email && (
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(email);
                        showToast('Email скопирован');
                      }}
                      className="flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-bold transition-all hover:brightness-110"
                      style={{ background: 'rgba(255,255,255,0.04)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.1)' }}
                    >
                      <Link size={12} /> Copy
                    </button>
                  )}
                </div>
              </div>
              <div className="col-span-2">
                <label style={labelStyle}>Категория / Ниша</label>
                <select style={inputStyle} value={form.category} onChange={e => set('category', e.target.value)}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <label style={labelStyle}>Bio</label>
                <textarea rows={3} style={{ ...inputStyle, resize: 'vertical' }} value={form.bio} onChange={e => set('bio', e.target.value)} />
              </div>
            </div>
          </div>

          {/* Stats */}
          <div style={sectionStyle}>
            <p className="text-white font-medium text-sm mb-4">Статистика</p>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label style={labelStyle}>Подписчики</label>
                <input type="number" min={0} style={inputStyle} value={form.followers_count} onChange={e => set('followers_count', e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>Avg Views</label>
                <input type="number" min={0} style={inputStyle} value={form.avg_views} onChange={e => set('avg_views', e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>Engagement Rate (%)</label>
                <input type="number" min={0} step={0.01} style={inputStyle} value={form.engagement_rate} onChange={e => set('engagement_rate', e.target.value)} />
              </div>
            </div>
          </div>

          {/* Social Links */}
          <div style={sectionStyle}>
            <p className="text-white font-medium text-sm mb-4">Социальные сети</p>
            <div className="grid grid-cols-1 gap-3">
              <div>
                <label style={labelStyle}>Instagram URL</label>
                <input style={inputStyle} value={form.instagram_url} onChange={e => set('instagram_url', e.target.value)} placeholder="https://instagram.com/..." />
              </div>
              <div>
                <label style={labelStyle}>TikTok URL</label>
                <input style={inputStyle} value={form.tiktok_url} onChange={e => set('tiktok_url', e.target.value)} placeholder="https://tiktok.com/@..." />
              </div>
              <div>
                <label style={labelStyle}>YouTube URL</label>
                <input style={inputStyle} value={form.youtube_url} onChange={e => set('youtube_url', e.target.value)} placeholder="https://youtube.com/..." />
              </div>
            </div>
          </div>

          {/* Moderation Status */}
          <div style={sectionStyle}>
            <p className="text-white font-medium text-sm mb-4">Статус модерации</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 sm:col-span-1">
                <label style={labelStyle}>Статус аккаунта</label>
                <select style={inputStyle} value={form.status} onChange={e => set('status', e.target.value)}>
                  <option value="active">Active</option>
                  <option value="hidden">Hidden</option>
                  <option value="banned">Banned</option>
                </select>
              </div>
              <div className="col-span-2 sm:col-span-1 flex flex-col gap-3 pt-1 sm:pt-5">
                {/* Verified toggle */}
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <div onClick={() => set('is_verified', !form.is_verified)}
                    className="w-9 h-5 rounded-full transition-all flex-shrink-0 relative"
                    style={{ background: form.is_verified ? '#00C48C' : 'rgba(255,255,255,0.1)', cursor: 'pointer' }}>
                    <div className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all"
                      style={{ left: form.is_verified ? '18px' : '2px' }} />
                  </div>
                  <span className="text-sm" style={{ color: form.is_verified ? '#00C48C' : '#64748b' }}>
                    <Shield size={13} className="inline mr-1" />Верифицирован
                  </span>
                </label>
                {/* Published toggle */}
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <div onClick={() => set('is_published', !form.is_published)}
                    className="w-9 h-5 rounded-full transition-all flex-shrink-0 relative"
                    style={{ background: form.is_published ? '#3b82f6' : 'rgba(255,255,255,0.1)', cursor: 'pointer' }}>
                    <div className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all"
                      style={{ left: form.is_published ? '18px' : '2px' }} />
                  </div>
                  <span className="text-sm" style={{ color: form.is_published ? '#3b82f6' : '#64748b' }}>
                    <Eye size={13} className="inline mr-1" />Опубликован
                  </span>
                </label>
                {/* Featured toggle */}
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <div onClick={() => set('is_featured', !form.is_featured)}
                    className="w-9 h-5 rounded-full transition-all flex-shrink-0 relative"
                    style={{ background: form.is_featured ? '#f59e0b' : 'rgba(255,255,255,0.1)', cursor: 'pointer' }}>
                    <div className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all"
                      style={{ left: form.is_featured ? '18px' : '2px' }} />
                  </div>
                  <span className="text-sm" style={{ color: form.is_featured ? '#f59e0b' : '#64748b' }}>
                    <span className="inline mr-1" style={{ fontSize: 13 }}>⭐</span>Featured (топ выдачи)
                  </span>
                </label>
              </div>
            </div>
          </div>

          {/* Packages */}
          <div style={sectionStyle}>
            <div className="flex items-center justify-between mb-4">
              <p className="text-white font-medium text-sm">Пакеты (Packages)</p>
              <button onClick={addPkg}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                style={{ background: 'rgba(0,196,140,0.1)', color: '#00C48C', border: '1px solid rgba(0,196,140,0.2)' }}>
                <Plus size={13} /> Добавить пакет
              </button>
            </div>
            <div className="flex flex-col gap-3">
              {form.packages.length === 0 && (
                <p className="text-center py-4 text-sm" style={{ color: '#374151' }}>Нет пакетов. Нажмите «Добавить пакет».</p>
              )}
              {form.packages.map((pkg, idx) => (
                <div key={pkg.id} className="p-4 rounded-xl flex flex-col gap-3"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium" style={{ color: '#64748b' }}>Пакет {idx + 1}</span>
                    <button onClick={() => removePkg(idx)} className="p-1 rounded-lg transition-all"
                      style={{ color: '#475569' }}
                      onMouseEnter={e => (e.currentTarget.style.color = '#ef4444')}
                      onMouseLeave={e => (e.currentTarget.style.color = '#475569')}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label style={labelStyle}>Название</label>
                      <input style={inputStyle} value={pkg.name} onChange={e => setPkg(idx, 'name', e.target.value)} placeholder="Basic, Standard, Premium…" />
                    </div>
                    <div>
                      <label style={labelStyle}>Цена (AED)</label>
                      <input type="number" min={0} style={inputStyle} value={pkg.price} onChange={e => setPkg(idx, 'price', parseFloat(e.target.value) || 0)} />
                    </div>
                    <div className="col-span-2">
                      <label style={labelStyle}>Описание</label>
                      <textarea rows={2} style={{ ...inputStyle, resize: 'vertical' }} value={pkg.description} onChange={e => setPkg(idx, 'description', e.target.value)} />
                    </div>
                    <div>
                      <label style={labelStyle}>Что входит (deliverables)</label>
                      <input style={inputStyle} value={pkg.deliverables} onChange={e => setPkg(idx, 'deliverables', e.target.value)} placeholder="1 Reel, Story, ..." />
                    </div>
                    <div>
                      <label style={labelStyle}>Срок выполнения (дней)</label>
                      <input type="number" min={1} style={inputStyle} value={pkg.delivery_days} onChange={e => setPkg(idx, 'delivery_days', parseInt(e.target.value) || 1)} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 py-3 rounded-xl text-sm font-medium transition-all"
              style={{ background: 'rgba(255,255,255,0.04)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.08)' }}>
              Отмена
            </button>
            <button onClick={save} disabled={saving}
              className="flex-1 py-3 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2"
              style={{ background: saving ? 'rgba(0,196,140,0.1)' : '#00C48C', color: saving ? '#00C48C' : '#0a0f1a' }}>
              {saving ? <><RefreshCw size={14} className="animate-spin" /> Сохранение…</> : <><Save size={14} /> Сохранить изменения</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

type PendingAction = { type: 'ban'; id: string } | { type: 'delete'; id: string };

export default function InfluencersPanel() {
  const [subTab, setSubTab] = useState<SubTab>('overview');
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [creators, setCreators] = useState<CreatorRow[]>([]);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [creatorStatusFilter, setCreatorStatusFilter] = useState<string>('all');
  const [orderFilter, setOrderFilter] = useState<string>('all');
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [editingCreator, setEditingCreator] = useState<CreatorRow | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  // Stock state
  const [stockSubTab, setStockSubTab] = useState<'moderation' | 'upload' | 'analytics'>('moderation');
  const [pendingStock, setPendingStock] = useState<StockRow[]>([]);
  const [allStock, setAllStock] = useState<StockRow[]>([]);
  const [stockLoading, setStockLoading] = useState(false);
  const [sTitle, setSTitle] = useState('');
  const [sCategory, setSCategory] = useState('Drone');
  const [sPrice, setSPrice] = useState(50);
  const [sDescription, setSDescription] = useState('');
  const [sPreviewFile, setSPreviewFile] = useState<File | null>(null);
  const [sOriginalLink, setSOriginalLink] = useState('');
  const [sUploading, setSUploading] = useState(false);
  const [sFileKey, setSFileKey] = useState(0);

  // CMS Editor state
  const [heroHeadingLine1, setHeroHeadingLine1] = useState('');
  const [heroAccent, setHeroAccent] = useState('');
  const [heroHeadingLine2, setHeroHeadingLine2] = useState('');
  const [heroSubtitle, setHeroSubtitle] = useState('');
  const [heroBadge, setHeroBadge] = useState('');
  const [heroStats, setHeroStats] = useState<{value: string; label: string}[]>([]);
  const [heroImageUrl, setHeroImageUrl] = useState('');
  const [heroMobileImageUrl, setHeroMobileImageUrl] = useState('');
  const [cmsLoading, setCmsLoading] = useState(false);
  const [cmsSaving, setCmsSaving] = useState(false);
  const [cmsUploading, setCmsUploading] = useState(false);
  const [cmsMobileUploading, setCmsMobileUploading] = useState(false);

  const showToast = useCallback((msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  }, []);

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

  useEffect(() => { loadData(); }, [loadData]);

  const reachStats = useMemo(() => {
    const ugcActive = creators.filter(c => c.creator_type === 'ugc' && c.status === 'active' && !c.is_hidden);
    const totalReach = ugcActive.reduce((s, c) => s + (c.followers_count || 0), 0);
    const reachUAE = ugcActive.filter(c => c.region === 'UAE').reduce((s, c) => s + (c.followers_count || 0), 0);
    const reachKZ = ugcActive.filter(c => c.region === 'KZ').reduce((s, c) => s + (c.followers_count || 0), 0);
    return { totalReach, reachUAE, reachKZ };
  }, [creators]);

  // ── Stock data ───────────────────────────────────────────────────────────
  const loadStockData = useCallback(async () => {
    setStockLoading(true);
    const [{ data: pending }, { data: approved }] = await Promise.all([
      supabase.from('stock_footage').select('*').eq('status', 'pending_approval').order('created_at', { ascending: false }),
      supabase.from('stock_footage').select('*').or('status.eq.approved,is_admin_global.eq.true').order('sales_count', { ascending: false }),
    ]);
    setPendingStock((pending ?? []) as StockRow[]);
    setAllStock((approved ?? []) as StockRow[]);
    setStockLoading(false);
  }, []);

  useEffect(() => { if (subTab === 'stocks') loadStockData(); }, [subTab, loadStockData]);

  // CMS: load hero settings
  const loadCmsData = useCallback(async () => {
    setCmsLoading(true);
    const { data } = await supabase.from('site_settings').select('value').eq('key', 'homepage_hero').maybeSingle();
    if (data?.value) {
      const v = data.value as Record<string, unknown>;
      setHeroHeadingLine1((v.heading_line1 as string) || '');
      setHeroAccent((v.heading_accent as string) || '');
      setHeroHeadingLine2((v.heading_line2 as string) || '');
      setHeroSubtitle((v.subtitle as string) || '');
      setHeroBadge((v.badge_text as string) || '');
      setHeroImageUrl((v.desktop_bg_url as string) || (v.background_image as string) || '');
      setHeroMobileImageUrl((v.mobile_bg_url as string) || '');
      setHeroStats((v.stats as {value: string; label: string}[]) || []);
    }
    setCmsLoading(false);
  }, []);

  useEffect(() => { if (subTab === 'editor') loadCmsData(); }, [subTab, loadCmsData]);

  const handleCmsSave = async () => {
    setCmsSaving(true);
    const value = {
      desktop_bg_url: heroImageUrl,
      mobile_bg_url: heroMobileImageUrl,
      heading_line1: heroHeadingLine1,
      heading_accent: heroAccent,
      heading_line2: heroHeadingLine2,
      subtitle: heroSubtitle,
      badge_text: heroBadge,
      stats: heroStats,
    };
    const { error } = await supabase.from('site_settings').upsert({ key: 'homepage_hero', value, updated_at: new Date().toISOString() }, { onConflict: 'key' });
    setCmsSaving(false);
    showToast(error ? 'Ошибка сохранения' : 'Настройки успешно обновлены!', !error);
  };

  const handleHeroImageUpload = async (file: File) => {
    setCmsUploading(true);
    const ext = file.name.split('.').pop();
    const path = `hero/desktop_${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('site-assets').upload(path, file, { upsert: true });
    if (error) {
      showToast('Ошибка загрузки изображения', false);
      setCmsUploading(false);
      return;
    }
    const { data: urlData } = supabase.storage.from('site-assets').getPublicUrl(path);
    setHeroImageUrl(urlData.publicUrl);
    setCmsUploading(false);
    showToast('Десктоп-изображение загружено');
  };

  const handleHeroMobileImageUpload = async (file: File) => {
    setCmsMobileUploading(true);
    const ext = file.name.split('.').pop();
    const path = `hero/mobile_${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('site-assets').upload(path, file, { upsert: true });
    if (error) {
      showToast('Ошибка загрузки изображения', false);
      setCmsMobileUploading(false);
      return;
    }
    const { data: urlData } = supabase.storage.from('site-assets').getPublicUrl(path);
    setHeroMobileImageUrl(urlData.publicUrl);
    setCmsMobileUploading(false);
    showToast('Мобильное изображение загружено');
  };

  const approveStock = async (id: string) => {
    setActionLoading(id);
    const { error } = await supabase.from('stock_footage').update({ status: 'approved' }).eq('id', id);
    if (!error) { setPendingStock(prev => prev.filter(s => s.id !== id)); showToast('Футаж одобрен и опубликован'); loadStockData(); }
    else showToast('Ошибка одобрения', false);
    setActionLoading(null);
  };

  const rejectStock = async (id: string) => {
    setActionLoading(id);
    const { error } = await supabase.from('stock_footage').update({ status: 'rejected' }).eq('id', id);
    if (!error) { setPendingStock(prev => prev.filter(s => s.id !== id)); showToast('Футаж отклонен'); }
    else showToast('Ошибка', false);
    setActionLoading(null);
  };

  const deleteStock = async (id: string) => {
    setActionLoading(id);
    const { error } = await supabase.from('stock_footage').delete().eq('id', id);
    if (!error) { setAllStock(prev => prev.filter(s => s.id !== id)); showToast('Футаж удален'); }
    else showToast('Ошибка удаления', false);
    setActionLoading(null);
  };

  const uploadAdminStock = async () => {
    if (!sTitle.trim() || !sPrice || !sPreviewFile) return;
    setSUploading(true);
    const ts = Date.now();
    const previewPath = `admin/${ts}-${sPreviewFile.name}`;
    const { error: upErr } = await supabase.storage.from('stock-previews').upload(previewPath, sPreviewFile);
    if (upErr) { showToast('Ошибка загрузки файла', false); setSUploading(false); return; }
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
    } else showToast('Ошибка сохранения', false);
    setSUploading(false);
  };

  // ── Creator actions ───────────────────────────────────────────────────────

  const toggleVerify = async (id: string, current: boolean) => {
    setActionLoading(id);
    const { error } = await supabase.from('creator_profiles').update({ is_verified: !current }).eq('id', id);
    if (!error) { setCreators(prev => prev.map(c => c.id === id ? { ...c, is_verified: !current } : c)); showToast(current ? 'Верификация снята' : 'Креатор верифицирован'); }
    else showToast('Ошибка обновления', false);
    setActionLoading(null);
  };

  const toggleHidden = async (id: string, current: boolean) => {
    setActionLoading(id);
    const newHidden = !current;
    const newStatus = newHidden ? 'hidden' : 'active';
    const { error } = await supabase.from('creator_profiles').update({ is_hidden: newHidden, status: newStatus }).eq('id', id);
    if (!error) {
      setCreators(prev => prev.map(c => c.id === id ? { ...c, is_hidden: newHidden, status: newStatus } : c));
      showToast(newHidden ? 'Скрыт с маркетплейса' : 'Виден на маркетплейсе');
    } else showToast('Ошибка обновления', false);
    setActionLoading(null);
  };

  const banCreator = async (id: string) => {
    setActionLoading(id);
    const { error } = await supabase.from('creator_profiles').update({ status: 'banned', is_published: false, is_hidden: true }).eq('id', id);
    if (!error) {
      setCreators(prev => prev.map(c => c.id === id ? { ...c, status: 'banned', is_published: false, is_hidden: true } : c));
      showToast('Креатор заблокирован и удалён с маркетплейса');
    } else showToast('Ошибка блокировки', false);
    setActionLoading(null);
    setPendingAction(null);
  };

  const unbanCreator = async (id: string) => {
    setActionLoading(id);
    const { error } = await supabase.from('creator_profiles').update({ status: 'active', is_hidden: false }).eq('id', id);
    if (!error) {
      setCreators(prev => prev.map(c => c.id === id ? { ...c, status: 'active', is_hidden: false } : c));
      showToast('Блокировка снята');
    } else showToast('Ошибка разблокировки', false);
    setActionLoading(null);
  };

  const deleteCreator = async (id: string) => {
    setActionLoading(id);
    const { error } = await supabase.from('creator_profiles').delete().eq('id', id);
    if (!error) { setCreators(prev => prev.filter(c => c.id !== id)); showToast('Профиль удалён навсегда'); }
    else showToast('Ошибка удаления', false);
    setActionLoading(null);
    setPendingAction(null);
  };

  const updateOrderStatus = async (id: string, status: string) => {
    setActionLoading(id);
    const { error } = await supabase.from('marketplace_orders').update({ status, updated_at: new Date().toISOString() }).eq('id', id);
    if (!error) { setOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o)); showToast('Статус сделки обновлён'); }
    else showToast('Ошибка обновления', false);
    setActionLoading(null);
  };

  const handleEditSave = (updated: CreatorRow) => {
    setCreators(prev => prev.map(c => c.id === updated.id ? updated : c));
  };

  // ── Filters ───────────────────────────────────────────────────────────────

  const filteredCreators = creators.filter(c => {
    const matchSearch = !search || c.display_name.toLowerCase().includes(search.toLowerCase()) || (c.username ?? '').toLowerCase().includes(search.toLowerCase());
    const matchStatus = creatorStatusFilter === 'all' || c.status === creatorStatusFilter;
    return matchSearch && matchStatus;
  });

  const filteredOrders = orders.filter(o =>
    (orderFilter === 'all' || o.status === orderFilter) &&
    (!search || o.buyer_name.toLowerCase().includes(search.toLowerCase()) || o.buyer_email.toLowerCase().includes(search.toLowerCase()))
  );

  const confirmProps = pendingAction?.type === 'ban'
    ? {
        title: 'Заблокировать этого креатора?',
        body: 'Аккаунт будет приостановлен. Публичный профиль покажет «Аккаунт заблокирован». Блокировку можно снять позже.',
        confirmLabel: 'Заблокировать',
        confirmColor: '#ef4444',
        onConfirm: () => banCreator(pendingAction.id),
      }
    : pendingAction?.type === 'delete'
    ? {
        title: 'Удалить профиль навсегда?',
        body: 'Удалит профиль, все пакеты и портфолио. Заказы, связанные с профилем, потеряют привязку. Это действие нельзя отменить.',
        confirmLabel: 'Удалить навсегда',
        confirmColor: '#ef4444',
        onConfirm: () => deleteCreator(pendingAction.id),
      }
    : null;

  const SUB_TABS: { id: SubTab; label: string; icon: JSX.Element }[] = [
    { id: 'overview',  label: 'Обзор',                         icon: <TrendingUp size={14} /> },
    { id: 'creators',  label: `Креаторы (${creators.length})`,  icon: <Users size={14} /> },
    { id: 'orders',    label: `Сделки (${orders.length})`,      icon: <ShoppingBag size={14} /> },
    { id: 'stocks',    label: `Стоки${pendingStock.length ? ` (${pendingStock.length})` : ''}`, icon: <Film size={14} /> },
    { id: 'editor',    label: 'Редактор',                       icon: <LayoutDashboard size={14} /> },
  ];

  return (
    <div style={{ position: 'relative' }}>
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 px-4 py-3 rounded-xl text-sm font-medium shadow-xl"
          style={{ background: toast.ok ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)', border: `1px solid ${toast.ok ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`, color: toast.ok ? '#22c55e' : '#ef4444' }}>
          {toast.msg}
        </div>
      )}

      {pendingAction && confirmProps && (
        <ConfirmModal {...confirmProps} onCancel={() => setPendingAction(null)} />
      )}

      {editingCreator && (
        <EditCreatorModal
          creator={editingCreator}
          onSave={handleEditSave}
          onClose={() => setEditingCreator(null)}
          showToast={showToast}
        />
      )}

      {/* Total Reach Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="relative overflow-hidden rounded-2xl p-5" style={{ background: 'linear-gradient(135deg, rgba(0,196,140,0.08), rgba(0,196,140,0.02))', border: '1px solid rgba(0,196,140,0.18)' }}>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(0,196,140,0.12)' }}>
              <TrendingUp size={16} style={{ color: '#00C48C' }} />
            </div>
            <span className="text-[11px] uppercase tracking-wider font-semibold" style={{ color: '#94a3b8' }}>UGC Total Reach</span>
          </div>
          <div className="text-3xl font-bold text-white">{fmtReach(reachStats.totalReach)}</div>
          <div className="text-[10px] mt-1" style={{ color: '#64748b' }}>All active UGC creators</div>
          <div className="absolute -bottom-6 -right-6 w-20 h-20 rounded-full opacity-20 blur-2xl pointer-events-none" style={{ background: '#00C48C' }} />
        </div>
        <div className="relative overflow-hidden rounded-2xl p-5" style={{ background: 'linear-gradient(135deg, rgba(59,130,246,0.08), rgba(59,130,246,0.02))', border: '1px solid rgba(59,130,246,0.18)' }}>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(59,130,246,0.12)' }}>
              <Users size={16} style={{ color: '#3b82f6' }} />
            </div>
            <span className="text-[11px] uppercase tracking-wider font-semibold" style={{ color: '#94a3b8' }}>Dubai (UAE)</span>
          </div>
          <div className="text-3xl font-bold text-white">{fmtReach(reachStats.reachUAE)}</div>
          <div className="text-[10px] mt-1" style={{ color: '#64748b' }}>UAE region creators</div>
          <div className="absolute -bottom-6 -right-6 w-20 h-20 rounded-full opacity-20 blur-2xl pointer-events-none" style={{ background: '#3b82f6' }} />
        </div>
        <div className="relative overflow-hidden rounded-2xl p-5" style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.08), rgba(245,158,11,0.02))', border: '1px solid rgba(245,158,11,0.18)' }}>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(245,158,11,0.12)' }}>
              <Users size={16} style={{ color: '#f59e0b' }} />
            </div>
            <span className="text-[11px] uppercase tracking-wider font-semibold" style={{ color: '#94a3b8' }}>Kazakhstan (KZ)</span>
          </div>
          <div className="text-3xl font-bold text-white">{fmtReach(reachStats.reachKZ)}</div>
          <div className="text-[10px] mt-1" style={{ color: '#64748b' }}>KZ region creators</div>
          <div className="absolute -bottom-6 -right-6 w-20 h-20 rounded-full opacity-20 blur-2xl pointer-events-none" style={{ background: '#f59e0b' }} />
        </div>
      </div>

      {/* Sub-tab bar */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
          {SUB_TABS.map(t => (
            <button key={t.id} onClick={() => { setSubTab(t.id); setSearch(''); }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all"
              style={{
                background: subTab === t.id ? 'rgba(0,196,140,0.12)' : 'transparent',
                color: subTab === t.id ? '#00C48C' : '#64748b',
                border: subTab === t.id ? '1px solid rgba(0,196,140,0.25)' : '1px solid transparent',
              }}>
              {t.icon}{t.label}
            </button>
          ))}
        </div>
        <button onClick={loadData} disabled={loading}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all"
          style={{ background: 'rgba(255,255,255,0.04)', color: '#64748b', border: '1px solid rgba(255,255,255,0.07)' }}>
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Обновить
        </button>
      </div>

      {/* ── OVERVIEW ── */}
      {subTab === 'overview' && (
        <div className="space-y-6">
          {loading || !metrics ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="rounded-2xl h-28 animate-pulse" style={{ background: 'rgba(255,255,255,0.03)' }} />
              ))}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'Всего креаторов',     value: metrics.totalCreators.toString(),              sub: `+${metrics.newThisWeek} за неделю`,  icon: <Users size={18} />,       color: '#3b82f6' },
                  { label: 'Активны на площадке', value: metrics.activeCreators.toString(),             sub: 'видны на маркетплейсе',              icon: <Eye size={18} />,         color: '#00C48C' },
                  { label: 'Заблокированы',        value: metrics.bannedCreators.toString(),            sub: 'приостановлены',                     icon: <Ban size={18} />,         color: '#ef4444' },
                  { label: 'Новых за неделю',      value: metrics.newThisWeek.toString(),               sub: 'последние 7 дней',                   icon: <TrendingUp size={18} />,  color: '#f59e0b' },
                  { label: 'Активных сделок',      value: metrics.activeDeals.toString(),               sub: 'on_hold + in_progress',              icon: <ShoppingBag size={18} />, color: '#f59e0b' },
                  { label: 'В Escrow (On Hold)',   value: `AED ${metrics.escrowTotal.toFixed(2)}`,      sub: 'ожидают подтверждения',              icon: <Clock size={18} />,       color: '#f59e0b' },
                  { label: 'Выручка платформы',    value: `AED ${metrics.completedRevenue.toFixed(2)}`, sub: 'с завершённых сделок',               icon: <DollarSign size={18} />,  color: '#22c55e' },
                  { label: 'Всего заказов',         value: orders.length.toString(),                    sub: 'за всё время',                       icon: <ShoppingBag size={18} />, color: '#64748b' },
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
                <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <h3 className="text-white font-semibold">Последние заказы</h3>
                </div>
                <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                  {orders.slice(0, 8).map(o => (
                    <div key={o.id} className="px-6 py-3 flex items-center gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white font-medium truncate">{o.buyer_name || o.buyer_email}</p>
                        <p className="text-xs truncate" style={{ color: '#64748b' }}>→ {(o.creator as { display_name: string } | undefined)?.display_name ?? 'Неизвестно'} · {o.package_name}</p>
                      </div>
                      <p className="text-sm font-semibold text-white">AED {o.package_price}</p>
                      <OrderStatusBadge status={o.status} />
                      <p className="text-xs" style={{ color: '#374151' }}>{fmtDate(o.created_at)}</p>
                    </div>
                  ))}
                  {orders.length === 0 && (
                    <div className="px-6 py-10 text-center" style={{ color: '#374151' }}>Заказов пока нет</div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── CREATORS ── */}
      {subTab === 'creators' && (
        <div className="space-y-4">
          <div className="flex gap-3 flex-wrap">
            <div className="relative flex-1 max-w-sm">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#374151' }} />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Поиск по имени или @username..."
                className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#e2e8f0' }} />
            </div>
            <div className="relative">
              <select value={creatorStatusFilter} onChange={e => setCreatorStatusFilter(e.target.value)}
                className="appearance-none pl-3 pr-8 py-2.5 rounded-xl text-sm outline-none"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#e2e8f0' }}>
                <option value="all">Все статусы</option>
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
                  {['Креатор', 'Категория', 'Подписчики', 'Статус', 'Профиль', 'Дата', 'Действия'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium whitespace-nowrap" style={{ color: '#374151' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredCreators.map(c => (
                  <tr key={c.id}
                    style={{
                      borderBottom: '1px solid rgba(255,255,255,0.03)',
                      background: c.status === 'banned' ? 'rgba(239,68,68,0.04)' : c.is_hidden ? 'rgba(245,158,11,0.03)' : 'transparent',
                      opacity: c.status === 'banned' ? 0.75 : 1,
                    }}>
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
                    <td className="px-4 py-3">
                      <span className="text-xs px-2 py-0.5 rounded-full whitespace-nowrap" style={{ background: 'rgba(255,255,255,0.05)', color: '#94a3b8' }}>{c.category}</span>
                    </td>
                    <td className="px-4 py-3 text-white">{fmt(c.followers_count)}</td>
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
                    <td className="px-4 py-3 text-xs whitespace-nowrap" style={{ color: '#64748b' }}>{fmtDate(c.created_at)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {/* Edit */}
                        <button onClick={() => setEditingCreator(c)} disabled={actionLoading === c.id}
                          title="Редактировать профиль"
                          className="p-1.5 rounded-lg transition-all"
                          style={{ background: 'rgba(255,255,255,0.04)', color: '#475569' }}
                          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#00C48C'; (e.currentTarget as HTMLButtonElement).style.background = 'rgba(0,196,140,0.1)'; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = '#475569'; (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.04)'; }}>
                          <Pencil size={13} />
                        </button>
                        {/* Verify */}
                        <button onClick={() => toggleVerify(c.id, c.is_verified)} disabled={actionLoading === c.id || c.status === 'banned'}
                          title={c.is_verified ? 'Снять верификацию' : 'Верифицировать'}
                          className="p-1.5 rounded-lg transition-all"
                          style={{ background: c.is_verified ? 'rgba(0,196,140,0.15)' : 'rgba(255,255,255,0.04)', color: c.is_verified ? '#00C48C' : '#475569' }}>
                          <Shield size={13} />
                        </button>
                        {/* Hide/Show */}
                        <button onClick={() => c.status !== 'banned' && toggleHidden(c.id, c.is_hidden)}
                          disabled={actionLoading === c.id || c.status === 'banned'}
                          title={c.is_hidden ? 'Показать на маркетплейсе' : 'Скрыть с маркетплейса'}
                          className="p-1.5 rounded-lg transition-all"
                          style={{ background: c.is_hidden ? 'rgba(245,158,11,0.15)' : 'rgba(255,255,255,0.04)', color: c.is_hidden ? '#f59e0b' : '#475569' }}>
                          {c.is_hidden ? <EyeOff size={13} /> : <Eye size={13} />}
                        </button>
                        {/* Ban/Unban */}
                        {c.status === 'banned' ? (
                          <button onClick={() => unbanCreator(c.id)} disabled={actionLoading === c.id}
                            title="Разблокировать"
                            className="p-1.5 rounded-lg transition-all"
                            style={{ background: 'rgba(34,197,94,0.12)', color: '#22c55e' }}>
                            <CheckCircle size={13} />
                          </button>
                        ) : (
                          <button onClick={() => setPendingAction({ type: 'ban', id: c.id })} disabled={actionLoading === c.id}
                            title="Заблокировать"
                            className="p-1.5 rounded-lg transition-all"
                            style={{ background: 'rgba(255,255,255,0.04)', color: '#475569' }}
                            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#ef4444'; (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.1)'; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = '#475569'; (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.04)'; }}>
                            <Ban size={13} />
                          </button>
                        )}
                        {/* Delete */}
                        <button onClick={() => setPendingAction({ type: 'delete', id: c.id })} disabled={actionLoading === c.id}
                          title="Удалить профиль навсегда"
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
              <div className="py-16 text-center" style={{ color: '#374151' }}>Креаторы не найдены</div>
            )}
          </div>
        </div>
      )}

      {/* ── ORDERS ── */}
      {subTab === 'orders' && (
        <div className="space-y-4">
          <div className="flex gap-3 flex-wrap">
            <div className="relative flex-1 max-w-sm">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#374151' }} />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Поиск по покупателю..."
                className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#e2e8f0' }} />
            </div>
            <div className="relative">
              <select value={orderFilter} onChange={e => setOrderFilter(e.target.value)}
                className="appearance-none pl-3 pr-8 py-2.5 rounded-xl text-sm outline-none"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#e2e8f0' }}>
                <option value="all">Все статусы</option>
                {Object.keys(ORDER_STATUS_META).map(s => <option key={s} value={s}>{ORDER_STATUS_META[s].label}</option>)}
              </select>
              <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: '#374151' }} />
            </div>
          </div>

          <div className="rounded-2xl overflow-x-auto" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  {['Покупатель', 'Креатор', 'Пакет', 'Сумма', 'Выплата', 'Статус', 'Дата', 'Изменить статус'].map(h => (
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
              <div className="py-16 text-center" style={{ color: '#374151' }}>Заказов не найдено</div>
            )}
          </div>
        </div>
      )}

      {/* ── STOCKS ── */}
      {/* ── CMS Editor Tab ── */}
      {subTab === 'editor' && (
        <div className="space-y-6">
          {cmsLoading ? (
            <div className="py-16 text-center"><div className="w-6 h-6 mx-auto border-2 rounded-full animate-spin" style={{ borderColor: 'rgba(0,196,140,0.2)', borderTopColor: '#00C48C' }} /></div>
          ) : (
            <>
              {/* Hero background images - Desktop & Mobile */}
              <div className="grid md:grid-cols-2 gap-4">
                {/* Desktop image */}
                <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div className="flex items-center gap-2 mb-3">
                    <Image size={16} style={{ color: '#00C48C' }} />
                    <span className="text-white font-semibold text-sm">Десктоп (16:9)</span>
                  </div>
                  {heroImageUrl && (
                    <div className="mb-3 rounded-xl overflow-hidden h-32 relative" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
                      <img src={heroImageUrl} alt="Desktop bg" className="w-full h-full object-cover" />
                      <button onClick={() => setHeroImageUrl('')} className="absolute top-2 right-2 p-1.5 rounded-lg" style={{ background: 'rgba(0,0,0,0.7)' }}>
                        <X size={14} style={{ color: '#ef4444' }} />
                      </button>
                    </div>
                  )}
                  <label className="flex items-center gap-3 cursor-pointer px-4 py-3 rounded-xl transition-all"
                    style={{ background: 'rgba(0,196,140,0.06)', border: '1px solid rgba(0,196,140,0.2)' }}>
                    <Upload size={16} style={{ color: '#00C48C' }} />
                    <span className="text-sm" style={{ color: '#94a3b8' }}>{cmsUploading ? 'Загрузка...' : 'Выбрать файл'}</span>
                    <input type="file" accept="image/*" className="hidden" disabled={cmsUploading}
                      onChange={e => { if (e.target.files?.[0]) handleHeroImageUpload(e.target.files[0]); }} />
                  </label>
                </div>

                {/* Mobile image */}
                <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div className="flex items-center gap-2 mb-3">
                    <Smartphone size={16} style={{ color: '#38bdf8' }} />
                    <span className="text-white font-semibold text-sm">Мобильная (9:16)</span>
                  </div>
                  {heroMobileImageUrl && (
                    <div className="mb-3 rounded-xl overflow-hidden h-32 relative" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
                      <img src={heroMobileImageUrl} alt="Mobile bg" className="w-full h-full object-cover" />
                      <button onClick={() => setHeroMobileImageUrl('')} className="absolute top-2 right-2 p-1.5 rounded-lg" style={{ background: 'rgba(0,0,0,0.7)' }}>
                        <X size={14} style={{ color: '#ef4444' }} />
                      </button>
                    </div>
                  )}
                  <label className="flex items-center gap-3 cursor-pointer px-4 py-3 rounded-xl transition-all"
                    style={{ background: 'rgba(56,189,248,0.06)', border: '1px solid rgba(56,189,248,0.2)' }}>
                    <Upload size={16} style={{ color: '#38bdf8' }} />
                    <span className="text-sm" style={{ color: '#94a3b8' }}>{cmsMobileUploading ? 'Загрузка...' : 'Выбрать файл'}</span>
                    <input type="file" accept="image/*" className="hidden" disabled={cmsMobileUploading}
                      onChange={e => { if (e.target.files?.[0]) handleHeroMobileImageUpload(e.target.files[0]); }} />
                  </label>
                </div>
              </div>

              {/* Text fields */}
              <div className="rounded-2xl p-6" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="flex items-center gap-2 mb-5">
                  <Pencil size={16} style={{ color: '#00C48C' }} />
                  <span className="text-white font-semibold text-sm">Тексты Hero-секции</span>
                </div>
                <div className="grid gap-4">
                  <div>
                    <label className="block text-xs font-medium mb-1.5" style={{ color: '#64748b' }}>Бейдж (над заголовком)</label>
                    <input value={heroBadge} onChange={e => setHeroBadge(e.target.value)}
                      className="w-full rounded-xl px-4 py-2.5 text-sm text-white outline-none"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
                      placeholder="CREATOR MARKETPLACE" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1.5" style={{ color: '#64748b' }}>Заголовок — строка 1</label>
                    <input value={heroHeadingLine1} onChange={e => setHeroHeadingLine1(e.target.value)}
                      className="w-full rounded-xl px-4 py-2.5 text-sm text-white outline-none"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
                      placeholder="Find Top" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1.5" style={{ color: '#64748b' }}>Заголовок — цветное слово</label>
                    <input value={heroAccent} onChange={e => setHeroAccent(e.target.value)}
                      className="w-full rounded-xl px-4 py-2.5 text-sm text-white outline-none"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
                      placeholder="Creators" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1.5" style={{ color: '#64748b' }}>Заголовок — строка 2</label>
                    <input value={heroHeadingLine2} onChange={e => setHeroHeadingLine2(e.target.value)}
                      className="w-full rounded-xl px-4 py-2.5 text-sm text-white outline-none"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
                      placeholder="for Your Brand" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1.5" style={{ color: '#64748b' }}>Подзаголовок</label>
                    <textarea value={heroSubtitle} onChange={e => setHeroSubtitle(e.target.value)}
                      className="w-full rounded-xl px-4 py-2.5 text-sm text-white outline-none resize-none"
                      rows={2}
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
                      placeholder="Connect with verified content creators..." />
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className="rounded-2xl p-6" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="flex items-center gap-2 mb-5">
                  <TrendingUp size={16} style={{ color: '#00C48C' }} />
                  <span className="text-white font-semibold text-sm">Статистика (цифры)</span>
                </div>
                <div className="grid gap-3">
                  {heroStats.map((stat, idx) => (
                    <div key={idx} className="grid grid-cols-2 gap-3">
                      <input value={stat.value} onChange={e => { const s = [...heroStats]; s[idx] = { ...s[idx], value: e.target.value }; setHeroStats(s); }}
                        className="rounded-xl px-4 py-2.5 text-sm text-white outline-none"
                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
                        placeholder="200+" />
                      <input value={stat.label} onChange={e => { const s = [...heroStats]; s[idx] = { ...s[idx], label: e.target.value }; setHeroStats(s); }}
                        className="rounded-xl px-4 py-2.5 text-sm text-white outline-none"
                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
                        placeholder="Verified Creators" />
                    </div>
                  ))}
                  <button onClick={() => setHeroStats([...heroStats, { value: '', label: '' }])}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium"
                    style={{ background: 'rgba(255,255,255,0.04)', color: '#64748b', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <Plus size={12} /> Добавить метрику
                  </button>
                </div>
              </div>

              {/* Save button */}
              <button onClick={handleCmsSave} disabled={cmsSaving}
                className="w-full py-3.5 rounded-2xl text-sm font-bold transition-all flex items-center justify-center gap-2"
                style={{ background: 'linear-gradient(135deg, #00C48C, #00a87a)', color: '#fff', opacity: cmsSaving ? 0.7 : 1 }}>
                <Save size={16} /> {cmsSaving ? 'Сохранение...' : 'Сохранить изменения'}
              </button>
            </>
          )}
        </div>
      )}

      {subTab === 'stocks' && (
        <div className="space-y-6">
          {/* Stock sub-tabs */}
          <div className="flex gap-2">
            {([
              { id: 'moderation' as const, label: `Модерация${pendingStock.length ? ` (${pendingStock.length})` : ''}` },
              { id: 'upload' as const, label: 'Загрузить свои стоки' },
              { id: 'analytics' as const, label: 'Все футажи и аналитика' },
            ]).map(st => (
              <button key={st.id} onClick={() => setStockSubTab(st.id)}
                className="px-4 py-2 rounded-xl text-sm font-medium transition-all"
                style={{
                  background: stockSubTab === st.id ? 'rgba(0,196,140,0.1)' : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${stockSubTab === st.id ? 'rgba(0,196,140,0.3)' : 'rgba(255,255,255,0.06)'}`,
                  color: stockSubTab === st.id ? '#00C48C' : '#64748b',
                }}>
                {st.label}
              </button>
            ))}
          </div>

          {/* Moderation */}
          {stockSubTab === 'moderation' && (
            <div className="space-y-4">
              {stockLoading ? (
                <div className="py-16 text-center"><div className="w-6 h-6 mx-auto border-2 rounded-full animate-spin" style={{ borderColor: 'rgba(0,196,140,0.2)', borderTopColor: '#00C48C' }} /></div>
              ) : pendingStock.length === 0 ? (
                <div className="rounded-2xl py-16 text-center" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <CheckCircle size={32} className="mx-auto mb-3" style={{ color: '#22c55e' }} />
                  <p className="text-white font-medium">Все чисто</p>
                  <p className="text-xs mt-1" style={{ color: '#64748b' }}>Нет футажей на модерации</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {pendingStock.map(item => (
                    <div key={item.id} className="rounded-2xl p-5 flex gap-5" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <div className="w-36 h-24 rounded-xl overflow-hidden flex-shrink-0 relative" style={{ background: 'rgba(0,0,0,0.3)' }}>
                        {item.preview_url ? (
                          <img src={item.preview_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center"><Play size={20} style={{ color: '#374151' }} /></div>
                        )}
                        <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded text-[9px] font-bold" style={{ background: 'rgba(0,0,0,0.7)', color: '#fff' }}>{item.resolution}</div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-white font-semibold">{item.title}</p>
                            <p className="text-xs mt-0.5" style={{ color: '#64748b' }}>{item.category} · от {item.seller_name}</p>
                          </div>
                          <p className="text-sm font-bold flex-shrink-0" style={{ color: '#00C48C' }}>{item.price} AED</p>
                        </div>
                        {item.description && <p className="text-xs mt-2 line-clamp-2" style={{ color: '#94a3b8' }}>{item.description}</p>}
                        {(item.original_link || item.original_path) && (
                          <a href={item.original_link || '#'} target="_blank" rel="noreferrer"
                            className="inline-flex items-center gap-1 text-xs mt-2" style={{ color: '#60a5fa' }}>
                            <Link size={10} /> Ссылка на оригинал
                          </a>
                        )}
                        <div className="flex items-center gap-2 mt-3">
                          <button onClick={() => approveStock(item.id)} disabled={actionLoading === item.id}
                            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all"
                            style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', color: '#22c55e' }}>
                            <CheckCircle size={12} /> Одобрить
                          </button>
                          <button onClick={() => rejectStock(item.id)} disabled={actionLoading === item.id}
                            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all"
                            style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444' }}>
                            <XCircle size={12} /> Отклонить
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Upload admin stock */}
          {stockSubTab === 'upload' && (
            <div className="max-w-xl">
              <div className="rounded-2xl p-6 space-y-5" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div>
                  <p className="text-white font-semibold mb-1">Загрузить глобальный сток</p>
                  <p className="text-xs" style={{ color: '#64748b' }}>Публикуется мгновенно как сток платформы. 100% выручки остается компании.</p>
                </div>

                <div>
                  <label className="block text-xs font-medium mb-1.5 uppercase tracking-wide" style={{ color: '#64748b' }}>Название *</label>
                  <input value={sTitle} onChange={e => setSTitle(e.target.value)} placeholder="Aerial Dubai Marina Sunset"
                    className="w-full rounded-xl px-4 py-3 text-sm outline-none"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#e2e8f0' }} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium mb-1.5 uppercase tracking-wide" style={{ color: '#64748b' }}>Категория *</label>
                    <select value={sCategory} onChange={e => setSCategory(e.target.value)}
                      className="w-full rounded-xl px-4 py-3 text-sm outline-none appearance-none"
                      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#e2e8f0' }}>
                      {['Drone', 'City', 'Interior', 'Nature', 'People', 'Food', 'Tech', 'Abstract', 'Lifestyle'].map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1.5 uppercase tracking-wide" style={{ color: '#64748b' }}>Цена (AED) *</label>
                    <input type="number" min={1} value={sPrice} onChange={e => setSPrice(Number(e.target.value))}
                      className="w-full rounded-xl px-4 py-3 text-sm outline-none"
                      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#e2e8f0' }} />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium mb-1.5 uppercase tracking-wide" style={{ color: '#64748b' }}>Описание</label>
                  <textarea value={sDescription} onChange={e => setSDescription(e.target.value)} rows={2}
                    placeholder="4K 60fps aerial footage of Downtown Dubai at golden hour..."
                    className="w-full rounded-xl px-4 py-3 text-sm outline-none resize-none"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#e2e8f0' }} />
                </div>

                <div>
                  <label className="block text-xs font-medium mb-1.5 uppercase tracking-wide" style={{ color: '#64748b' }}>Превью (видео/изображение) *</label>
                  <label className="flex items-center gap-2 px-4 py-3 rounded-xl cursor-pointer transition-all"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px dashed rgba(255,255,255,0.15)', color: '#64748b' }}>
                    <Upload size={15} />
                    <span className="text-sm">{sPreviewFile ? sPreviewFile.name : 'Выберите файл...'}</span>
                    <input key={sFileKey} type="file" accept="image/*,video/*" className="hidden" onChange={e => setSPreviewFile(e.target.files?.[0] ?? null)} />
                  </label>
                </div>

                <div>
                  <label className="block text-xs font-medium mb-1.5 uppercase tracking-wide" style={{ color: '#64748b' }}>Ссылка на оригинал (Google Drive / Dropbox)</label>
                  <div className="relative">
                    <Link size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: '#374151' }} />
                    <input value={sOriginalLink} onChange={e => setSOriginalLink(e.target.value)}
                      placeholder="https://drive.google.com/file/d/..."
                      className="w-full pl-9 pr-4 rounded-xl py-3 text-sm outline-none"
                      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#e2e8f0' }} />
                  </div>
                </div>

                <button onClick={uploadAdminStock} disabled={sUploading || !sTitle.trim() || !sPrice || !sPreviewFile}
                  className="w-full py-3 rounded-xl text-sm font-bold transition-all disabled:opacity-40"
                  style={{ background: 'rgba(0,196,140,0.15)', border: '1px solid rgba(0,196,140,0.3)', color: '#00C48C' }}>
                  {sUploading ? 'Загрузка...' : 'Опубликовать сток'}
                </button>
              </div>
            </div>
          )}

          {/* Analytics */}
          {stockSubTab === 'analytics' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <p className="text-xs" style={{ color: '#64748b' }}>Всего клипов</p>
                  <p className="text-xl font-bold text-white mt-1">{allStock.length}</p>
                </div>
                <div className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <p className="text-xs" style={{ color: '#64748b' }}>Продаж</p>
                  <p className="text-xl font-bold text-white mt-1">{allStock.reduce((s, f) => s + f.sales_count, 0)}</p>
                </div>
                <div className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <p className="text-xs" style={{ color: '#64748b' }}>Общая выручка (AED)</p>
                  <p className="text-xl font-bold" style={{ color: '#00C48C' }}>{allStock.reduce((s, f) => s + f.sales_count * f.price, 0).toLocaleString()}</p>
                </div>
                <div className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <p className="text-xs" style={{ color: '#64748b' }}>Мои стоки (Admin)</p>
                  <p className="text-xl font-bold text-white mt-1">{allStock.filter(f => f.is_admin_global).length}</p>
                </div>
              </div>

              {stockLoading ? (
                <div className="py-16 text-center"><div className="w-6 h-6 mx-auto border-2 rounded-full animate-spin" style={{ borderColor: 'rgba(0,196,140,0.2)', borderTopColor: '#00C48C' }} /></div>
              ) : (
                <div className="rounded-2xl overflow-x-auto" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <table className="w-full text-sm">
                    <thead>
                      <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        {['Название', 'Автор', 'Категория', 'Цена', 'Продажи', 'Выручка', ''].map(h => (
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
                              title="Удалить"
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
                    <div className="py-16 text-center" style={{ color: '#374151' }}>Нет одобренных стоков</div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
