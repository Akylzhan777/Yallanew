import { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Package,
  Image as ImageIcon,
  Inbox,
  Settings as SettingsIcon,
  LogOut,
  ExternalLink,
  Share2,
  Upload,
  Plus,
  Trash2,
  Check,
  X,
  Users,
  Eye,
  TrendingUp,
  Instagram,
  Youtube,
  Play,
  ChevronRight,
  Sparkles,
  Copy,
  Info,
  Video,
  Wallet,
  Gift,
  Send,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabase';
import { useCreatorAuth, CreatorPackage } from '../context/CreatorAuthContext';
import { useRegion } from '../context/RegionContext';

type Tab = 'overview' | 'packages' | 'portfolio' | 'orders' | 'settings' | 'wallet';

interface BrandOrder {
  id: string;
  buyer_name: string;
  buyer_email: string;
  package_name: string;
  package_price: number;
  creator_net_amount: number;
  status: string;
  created_at: string;
}

interface PortfolioItem {
  id: string;
  url: string;
  media_type: string;
  caption: string;
  created_at: string;
}

const UGC_TYPES = new Set(['ugc', 'blogger', 'model']);

function formatNum(n: number | null | undefined): string {
  const v = n ?? 0;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
  return String(v);
}

function emptyPackage(): CreatorPackage {
  return {
    id: crypto.randomUUID(),
    name: '',
    description: '',
    price: 0,
    deliveryDays: 5,
    includes: [''],
  };
}

export default function CreatorDashboard() {
  const { user, creatorProfile, loading, refreshCreatorProfile, signOut } = useCreatorAuth();
  const { t } = useTranslation();
  const { region, config: regionConfig } = useRegion();
  const currency = regionConfig.currency;
  const isKZ = region === 'KZ';
  const [tab, setTab] = useState<Tab>('overview');
  const [orders, setOrders] = useState<BrandOrder[]>([]);
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [shareCopied, setShareCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [mediaUploadError, setMediaUploadError] = useState<string | null>(null);

  const [editDisplayName, setEditDisplayName] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editFollowers, setEditFollowers] = useState('');
  const [editAvgViews, setEditAvgViews] = useState('');
  const [editEngRate, setEditEngRate] = useState('');
  const [editInstagram, setEditInstagram] = useState('');
  const [editYoutube, setEditYoutube] = useState('');
  const [editTiktok, setEditTiktok] = useState('');
  const [editPackages, setEditPackages] = useState<CreatorPackage[]>([]);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savedHint, setSavedHint] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const [uploadingMedia, setUploadingMedia] = useState(false);

  // Promo task state (UGC only)
  const [promoModalOpen, setPromoModalOpen] = useState(false);
  const [promoLink, setPromoLink] = useState('');
  const [promoSubmitting, setPromoSubmitting] = useState(false);
  const [promoSuccess, setPromoSuccess] = useState(false);

  // Model extended fields
  const cp = creatorProfile as unknown as Record<string, unknown> | null;
  const isModel = creatorProfile?.creator_type === 'model';
  const isUgc = creatorProfile?.creator_type === 'ugc';
  const isBlogger = creatorProfile?.creator_type === 'blogger';
  const showWallet = isModel || isUgc || isBlogger;
  const [modelBust, setModelBust] = useState('');
  const [modelWaist, setModelWaist] = useState('');
  const [modelHips, setModelHips] = useState('');
  const [modelShoeSize, setModelShoeSize] = useState('');
  const [modelClothingSize, setModelClothingSize] = useState('');
  const [modelHairColor, setModelHairColor] = useState('');
  const [modelEyeColor, setModelEyeColor] = useState('');
  const [modelSkills, setModelSkills] = useState('');
  const [modelFeatures, setModelFeatures] = useState('');
  const [videoCompUrl, setVideoCompUrl] = useState('');
  const [uploadingVideoComp, setUploadingVideoComp] = useState(false);

  const [walletBalance, setWalletBalance] = useState(0);
  const [bankAccountName, setBankAccountName] = useState('');
  const [bankName, setBankName] = useState('');
  const [bankIban, setBankIban] = useState('');
  const [savingBank, setSavingBank] = useState(false);
  const [bankSaved, setBankSaved] = useState(false);
  const [ibanError, setIbanError] = useState('');
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawSuccess, setWithdrawSuccess] = useState(false);

  useEffect(() => {
    if (!creatorProfile) return;
    setEditDisplayName(creatorProfile.display_name ?? '');
    setEditUsername(creatorProfile.username ?? creatorProfile.handle ?? '');
    setEditBio(creatorProfile.bio ?? '');
    setEditLocation(creatorProfile.location ?? '');
    setEditCategory(creatorProfile.category ?? '');
    setEditFollowers(String(creatorProfile.followers_count ?? ''));
    setEditAvgViews(String(creatorProfile.avg_views ?? ''));
    setEditEngRate(String(creatorProfile.engagement_rate ?? ''));
    setEditInstagram(creatorProfile.instagram_url ?? '');
    setEditYoutube(creatorProfile.youtube_url ?? '');
    setEditTiktok(creatorProfile.tiktok_url ?? '');
    setEditPackages(
      Array.isArray(creatorProfile.packages) ? (creatorProfile.packages as CreatorPackage[]) : []
    );
    if (cp) {
      setModelBust((cp.model_bust as string) ?? '');
      setModelWaist((cp.model_waist as string) ?? '');
      setModelHips((cp.model_hips as string) ?? '');
      setModelShoeSize((cp.model_shoe_size as string) ?? '');
      setModelClothingSize((cp.model_clothing_size as string) ?? '');
      setModelHairColor((cp.model_hair_color as string) ?? '');
      setModelEyeColor((cp.model_eye_color as string) ?? '');
      setModelSkills((cp.model_skills as string) ?? '');
      setModelFeatures((cp.model_features as string) ?? '');
      setVideoCompUrl((cp.video_comp_url as string) ?? '');
      setWalletBalance(Number(cp.wallet_balance) || 0);
      setBankAccountName((cp.bank_account_name as string) ?? '');
      setBankName((cp.bank_name as string) ?? '');
      setBankIban((cp.bank_iban as string) ?? '');
    }
  }, [creatorProfile]);

  useEffect(() => {
    if (!creatorProfile?.id) return;
    setDataLoading(true);
    Promise.all([
      supabase
        .from('marketplace_orders')
        .select('id, buyer_name, buyer_email, package_name, package_price, creator_net_amount, status, created_at')
        .eq('creator_id', creatorProfile.id)
        .order('created_at', { ascending: false })
        .limit(30),
      supabase
        .from('creator_portfolio')
        .select('*')
        .eq('creator_id', creatorProfile.id)
        .order('created_at', { ascending: false }),
    ])
      .then(([ordRes, portRes]) => {
        setOrders((ordRes?.data ?? []) as BrandOrder[]);
        setPortfolio((portRes?.data ?? []) as PortfolioItem[]);
      })
      .finally(() => setDataLoading(false));
  }, [creatorProfile?.id]);

  const saveSettings = async () => {
    if (!user || !creatorProfile) return;
    setSavingProfile(true);
    const updatePayload: Record<string, unknown> = {
      display_name: editDisplayName.trim() || creatorProfile.display_name,
      username: editUsername.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '') || creatorProfile.username,
      bio: editBio,
      location: editLocation,
      category: editCategory,
      followers_count: parseInt(editFollowers) || 0,
      avg_views: parseInt(editAvgViews) || 0,
      engagement_rate: parseFloat(editEngRate) || 0,
      instagram_url: editInstagram.trim() || null,
      youtube_url: editYoutube.trim() || null,
      tiktok_url: editTiktok.trim() || null,
      updated_at: new Date().toISOString(),
    };
    if (isModel) {
      updatePayload.model_bust = modelBust.trim() || null;
      updatePayload.model_waist = modelWaist.trim() || null;
      updatePayload.model_hips = modelHips.trim() || null;
      updatePayload.model_shoe_size = modelShoeSize.trim() || null;
      updatePayload.model_clothing_size = modelClothingSize.trim() || null;
      updatePayload.model_hair_color = modelHairColor.trim() || null;
      updatePayload.model_eye_color = modelEyeColor.trim() || null;
      updatePayload.model_skills = modelSkills.trim() || null;
      updatePayload.model_features = modelFeatures.trim() || null;
    }
    await supabase
      .from('creator_profiles')
      .update(updatePayload)
      .eq('user_id', user.id);
    await refreshCreatorProfile();
    setSavingProfile(false);
    setSavedHint(true);
    setTimeout(() => setSavedHint(false), 2000);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!user || !creatorProfile) return;
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true);
    const ext = file.name.split('.').pop();
    const path = `${user.id}/avatar_${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('creator-portfolio').upload(path, file, { upsert: true });
    if (!error) {
      const { data: urlData } = supabase.storage.from('creator-portfolio').getPublicUrl(path);
      await supabase
        .from('creator_profiles')
        .update({ avatar_url: urlData.publicUrl, updated_at: new Date().toISOString() })
        .eq('user_id', user.id);
      await refreshCreatorProfile();
    }
    setUploadingAvatar(false);
  };

  const savePackages = async () => {
    if (!user || !creatorProfile) return;
    setSavingProfile(true);
    const valid = editPackages.filter((p) => p.name?.trim() && p.price > 0);
    await supabase
      .from('creator_profiles')
      .update({ packages: valid, updated_at: new Date().toISOString() })
      .eq('user_id', user.id);
    await refreshCreatorProfile();
    setSavingProfile(false);
    setSavedHint(true);
    setTimeout(() => setSavedHint(false), 2000);
  };

  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!user || !creatorProfile) return;
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setMediaUploadError(null);
    const VIDEO_MAX_BYTES = 50 * 1024 * 1024;
    const oversized = files.find(f => f.type.startsWith('video') && f.size > VIDEO_MAX_BYTES);
    if (oversized) {
      setMediaUploadError(isKZ ? 'Размер видео не должен превышать 50 МБ' : 'Video file must not exceed 50 MB');
      e.target.value = '';
      return;
    }
    setUploadingMedia(true);
    for (const file of files) {
      const ext = file.name.split('.').pop();
      const fname = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
      const path = `${user.id}/${fname}`;
      const { error } = await supabase.storage.from('creator-portfolio').upload(path, file);
      if (!error) {
        const { data: urlData } = supabase.storage.from('creator-portfolio').getPublicUrl(path);
        const { data: inserted } = await supabase
          .from('creator_portfolio')
          .insert({
            creator_id: creatorProfile.id,
            user_id: user.id,
            media_type: file.type.startsWith('video') ? 'video' : 'image',
            url: urlData.publicUrl,
          })
          .select()
          .maybeSingle();
        if (inserted) setPortfolio((prev) => [inserted as PortfolioItem, ...prev]);
      }
    }
    setUploadingMedia(false);
  };

  const deletePortfolioItem = async (item: PortfolioItem) => {
    await supabase.from('creator_portfolio').delete().eq('id', item.id);
    setPortfolio((prev) => prev.filter((p) => p.id !== item.id));
  };

  const handleVideoCompUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!user || !creatorProfile) return;
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 50 * 1024 * 1024) return;
    setUploadingVideoComp(true);
    const ext = file.name.split('.').pop();
    const path = `${user.id}/video_comp_${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('creator-portfolio').upload(path, file, { upsert: true });
    if (!error) {
      const { data: urlData } = supabase.storage.from('creator-portfolio').getPublicUrl(path);
      await supabase
        .from('creator_profiles')
        .update({ video_comp_url: urlData.publicUrl, updated_at: new Date().toISOString() })
        .eq('user_id', user.id);
      setVideoCompUrl(urlData.publicUrl);
      await refreshCreatorProfile();
    }
    setUploadingVideoComp(false);
  };

  const onShare = async () => {
    const handle = creatorProfile?.username || creatorProfile?.handle;
    if (!handle) return;
    const url = `${window.location.origin}/${handle}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: creatorProfile?.display_name ?? t('cd.myProfile'), url });
      } else {
        await navigator.clipboard.writeText(url);
        setShareCopied(true);
        setTimeout(() => setShareCopied(false), 2200);
      }
    } catch {
      // user cancelled
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0B101B' }}>
        <div className="text-center">
          <div className="w-9 h-9 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm" style={{ color: '#64748b' }}>{t('cd.loadingDashboard')}</p>
        </div>
      </div>
    );
  }

  if (!creatorProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6" style={{ background: '#0B101B' }}>
        <div className="text-center max-w-sm">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: 'rgba(0,196,140,0.10)', border: '1px solid rgba(0,196,140,0.25)' }}
          >
            <Sparkles size={26} style={{ color: '#00C48C' }} />
          </div>
          <h1 className="text-lg font-bold text-white mb-2">{t('cd.profileNotReady')}</h1>
          <p className="text-sm mb-5" style={{ color: '#64748b' }}>
            {t('cd.finishOnboarding')}
          </p>
          <a
            href="/creator-onboarding"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white"
            style={{ background: 'linear-gradient(135deg, #0e7c4a, #0a5c38)', border: '1px solid rgba(0,196,140,0.30)' }}
          >
            {t('cd.continueOnboarding')} <ChevronRight size={14} />
          </a>
        </div>
      </div>
    );
  }

  const creatorType = creatorProfile?.creator_type;
  if (creatorType && !UGC_TYPES.has(creatorType)) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6" style={{ background: '#0B101B' }}>
        <div className="text-center max-w-sm">
          <p className="text-sm" style={{ color: '#64748b' }}>{t('cd.redirecting')}</p>
        </div>
      </div>
    );
  }

  const displayName = creatorProfile?.display_name || 'Creator';
  const handle = creatorProfile?.username || creatorProfile?.handle || '';
  const isPublished = creatorProfile?.is_published ?? false;
  const followers = creatorProfile?.followers_count ?? 0;
  const avgViews = creatorProfile?.avg_views ?? 0;
  const engRate = creatorProfile?.engagement_rate ?? 0;

  const activeOrders = orders.filter((o) => ['pending', 'in_progress', 'on_hold'].includes(o?.status));

  if (tab === 'wallet' && !showWallet) setTab('overview');

  const navItems: { id: Tab; icon: React.ReactNode; label: string }[] = [
    { id: 'overview', icon: <LayoutDashboard size={18} />, label: t('cd.nav.dashboard') },
    { id: 'packages', icon: <Package size={18} />, label: t('cd.nav.packages') },
    { id: 'portfolio', icon: <ImageIcon size={18} />, label: t('cd.nav.portfolio') },
    { id: 'orders', icon: <Inbox size={18} />, label: t('cd.nav.orders') },
    ...(showWallet ? [{ id: 'wallet' as Tab, icon: <Wallet size={18} />, label: t('cd.nav.wallet') }] : []),
    { id: 'settings', icon: <SettingsIcon size={18} />, label: t('cd.nav.settings') },
  ];

  const SidebarInner = (
    <>
      <div className="flex items-center gap-2.5 mb-5 px-2">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{
            background: 'rgba(0,196,140,0.10)',
            border: '1px solid rgba(0,196,140,0.25)',
            boxShadow: '0 0 18px rgba(0,196,140,0.10)',
          }}
        >
          <Sparkles size={15} style={{ color: '#00C48C' }} />
        </div>
        <div className="min-w-0">
          <div className="text-xs font-bold text-white truncate">{t('cd.studioName')}</div>
          <div className="text-xs" style={{ color: '#475569' }}>UGC · Influencer · Model</div>
        </div>
      </div>

      <div
        className="flex items-center gap-3 px-3 py-3 rounded-2xl mb-5"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
      >
        {creatorProfile?.avatar_url ? (
          <img
            src={creatorProfile.avatar_url}
            alt=""
            className="w-10 h-10 rounded-xl object-cover flex-shrink-0"
            style={{ border: '1px solid rgba(255,255,255,0.10)' }}
          />
        ) : (
          <div
            className="w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center text-sm font-bold"
            style={{ background: 'rgba(0,196,140,0.12)', color: '#00C48C', border: '1px solid rgba(0,196,140,0.20)' }}
          >
            {displayName.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="min-w-0">
          <div className="text-sm font-semibold text-white truncate">{displayName}</div>
          <div className="text-xs truncate" style={{ color: '#64748b' }}>
            {handle ? '@' + handle : user?.email}
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-1">
        {navItems.map((n) => (
          <button
            key={n.id}
            onClick={() => {
              setTab(n.id);
              setMobileNavOpen(false);
            }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-left transition-all duration-300"
            style={{
              background: tab === n.id ? 'rgba(0,196,140,0.08)' : 'transparent',
              color: tab === n.id ? '#00C48C' : '#94a3b8',
              borderLeft: tab === n.id ? '3px solid #00C48C' : '3px solid transparent',
            }}
          >
            {n.icon} {n.label}
          </button>
        ))}
      </nav>

      <div className="mt-4 space-y-2">
        {handle && (
          <a
            href={`/${handle}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl"
            style={{ background: 'rgba(0,196,140,0.04)', border: '1px solid rgba(0,196,140,0.18)' }}
          >
            <ExternalLink size={13} style={{ color: '#00C48C' }} />
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold truncate" style={{ color: '#00C48C' }}>
                /{handle}
              </div>
              <div className="text-[10px]" style={{ color: '#475569' }}>
                {t('cd.publicProfile')}
              </div>
            </div>
          </a>
        )}
        <button
          onClick={signOut}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 text-left"
          style={{ color: '#64748b' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = '#f87171';
            e.currentTarget.style.background = 'rgba(239,68,68,0.04)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = '#64748b';
            e.currentTarget.style.background = 'transparent';
          }}
        >
          <LogOut size={16} /> {t('cd.signOut')}
        </button>
      </div>
    </>
  );

  return (
    <div className="creator-dashboard-root min-h-screen flex" style={{ background: '#0B101B' }}>
      <aside
        className="hidden lg:flex flex-col w-64 flex-shrink-0 py-6 px-4"
        style={{
          background: 'rgba(255,255,255,0.02)',
          backdropFilter: 'blur(40px)',
          WebkitBackdropFilter: 'blur(40px)',
          borderRight: '1px solid rgba(255,255,255,0.05)',
          position: 'sticky',
          top: 0,
          height: '100dvh',
          overflowY: 'auto',
        }}
      >
        {SidebarInner}
      </aside>

      {mobileNavOpen && (
        <div
          className="fixed inset-0 z-50 lg:hidden flex"
          onClick={() => setMobileNavOpen(false)}
        >
          <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }} />
          <aside
            className="relative z-10 flex flex-col w-72 h-full py-6 px-4"
            style={{ background: '#0B101B', borderRight: '1px solid rgba(255,255,255,0.05)' }}
            onClick={(e) => e.stopPropagation()}
          >
            {SidebarInner}
          </aside>
        </div>
      )}

      <main className="flex-1 w-full max-w-full overflow-y-auto h-full px-4 sm:px-6 md:px-10 pb-20 md:pb-10">
        <header
          className="sticky top-0 z-10 -mx-4 sm:-mx-6 md:-mx-10 px-4 sm:px-6 md:px-10 py-4 flex items-center justify-between"
          style={{
            background: 'rgba(11,16,27,0.92)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderBottom: '1px solid rgba(255,255,255,0.04)',
          }}
        >
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setMobileNavOpen(true)}
              className="lg:hidden w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
              aria-label="Open navigation"
            >
              <LayoutDashboard size={16} style={{ color: '#94a3b8' }} />
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg sm:text-xl font-bold text-white truncate">
                  {t('cd.welcomeBack', { name: displayName })}
                </h1>
                {isPublished ? (
                  <span
                    className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
                    style={{
                      background: 'rgba(0,196,140,0.10)',
                      color: '#00C48C',
                      border: '1px solid rgba(0,196,140,0.30)',
                    }}
                  >
                    <span className="relative flex h-1.5 w-1.5">
                      <span
                        className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
                        style={{ background: '#00C48C' }}
                      />
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5" style={{ background: '#00C48C' }} />
                    </span>
                    {t('cd.statusLive')}
                  </span>
                ) : (
                  <span
                    className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
                    style={{ background: 'rgba(148,163,184,0.10)', color: '#94a3b8', border: '1px solid rgba(148,163,184,0.20)' }}
                  >
                    {t('cd.statusDraft')}
                  </span>
                )}
              </div>
              {handle && (
                <div className="text-xs mt-0.5" style={{ color: '#64748b' }}>
                  @{handle}
                </div>
              )}
            </div>
          </div>

          <button
            onClick={onShare}
            disabled={!handle}
            className="flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-40"
            style={{
              background: 'linear-gradient(135deg, #0e7c4a, #0a5c38)',
              color: '#fff',
              border: '1px solid rgba(0,196,140,0.30)',
              boxShadow: '0 4px 14px rgba(0,196,140,0.18)',
            }}
          >
            <Share2 size={14} />
            <span>{shareCopied ? t('cd.linkCopied') : t('cd.shareProfile')}</span>
          </button>
        </header>

        <div className="pt-6 max-w-6xl mx-auto">
          {tab === 'overview' && (
            <div className="space-y-6 animate-[fadeInUp_0.3s_ease-out]">
              {/* Profile Completion Progress */}
              {(() => {
                const checks: { key: string; done: boolean; hint: string; weight: number }[] = [
                  { key: 'avatar', done: !!creatorProfile?.avatar_url, hint: t('dashboard.progressHints.addAvatar'), weight: 20 },
                  { key: 'packages', done: editPackages.length > 0, hint: t('dashboard.progressHints.addPackages'), weight: 25 },
                  { key: 'portfolio', done: portfolio.length > 0, hint: t('dashboard.progressHints.addPortfolio'), weight: 20 },
                ];
                if (isModel) {
                  checks.push({ key: 'measurements', done: !!(modelBust || modelWaist || modelHips || modelHairColor), hint: t('dashboard.progressHints.addMeasurements'), weight: 20 });
                  checks.push({ key: 'videoComp', done: !!videoCompUrl, hint: t('dashboard.progressHints.addVideoComp'), weight: 15 });
                } else {
                  checks[0].weight = 25;
                  checks[1].weight = 35;
                  checks[2].weight = 40;
                }
                const totalWeight = checks.reduce((s, c) => s + c.weight, 0);
                const doneWeight = checks.filter(c => c.done).reduce((s, c) => s + c.weight, 0);
                const pct = Math.round((doneWeight / totalWeight) * 100);
                const incomplete = checks.filter(c => !c.done);
                return (
                  <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-bold text-white">{t('dashboard.profileProgress')}</span>
                      <span className="text-sm font-bold" style={{ color: pct === 100 ? '#00C48C' : '#fbbf24' }}>{pct}%</span>
                    </div>
                    <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: pct === 100 ? 'linear-gradient(90deg, #00C48C, #0ea472)' : 'linear-gradient(90deg, #fbbf24, #f59e0b)' }} />
                    </div>
                    {incomplete.length > 0 && (
                      <div className="mt-3 space-y-1.5">
                        {incomplete.slice(0, 3).map(c => (
                          <div key={c.key} className="flex items-center gap-2 text-xs" style={{ color: '#94a3b8' }}>
                            <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#fbbf24' }} />
                            {c.hint} <span className="font-semibold" style={{ color: '#fbbf24' }}>+{c.weight}%</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}
              {handle && (
                <div className="rounded-2xl p-5 sm:p-6 relative overflow-hidden"
                  style={{ background: 'linear-gradient(135deg, rgba(251,146,60,0.12), rgba(239,68,68,0.08))', border: '1px solid rgba(251,146,60,0.35)', boxShadow: '0 4px 24px rgba(251,146,60,0.08)' }}>
                  <div className="absolute top-0 right-0 w-40 h-40 rounded-full opacity-25"
                    style={{ background: 'radial-gradient(circle, rgba(251,146,60,0.4), transparent)', transform: 'translate(30%, -30%)' }} />
                  <div className="absolute bottom-0 left-0 w-24 h-24 rounded-full opacity-15"
                    style={{ background: 'radial-gradient(circle, rgba(239,68,68,0.3), transparent)', transform: 'translate(-30%, 30%)' }} />
                  <div className="relative z-10">
                    <div className="flex items-center gap-2.5 mb-2">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ background: 'rgba(251,146,60,0.2)', border: '1px solid rgba(251,146,60,0.4)' }}>
                        <Info size={16} style={{ color: '#fb923c' }} />
                      </div>
                      <h3 className="text-sm font-bold text-white">{t('dashboard.ctaTitle')}</h3>
                    </div>
                    <p className="text-xs mb-4 leading-relaxed" style={{ color: '#e2e8f0' }}>
                      {t('dashboard.ctaDesc')}
                    </p>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                      <div className="flex-1 flex items-center rounded-xl px-4 py-2.5 min-w-0"
                        style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(251,146,60,0.2)' }}>
                        <span className="text-sm font-mono truncate" style={{ color: '#fb923c' }}>
                          yallainfluencers.com/{handle}
                        </span>
                      </div>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(`https://yallainfluencers.com/${handle}`);
                          setLinkCopied(true);
                          setTimeout(() => setLinkCopied(false), 2500);
                        }}
                        className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap"
                        style={{
                          background: linkCopied ? 'rgba(0,196,140,0.15)' : 'linear-gradient(135deg, #fb923c, #ea580c)',
                          color: linkCopied ? '#00C48C' : '#fff',
                          border: `1px solid ${linkCopied ? 'rgba(0,196,140,0.3)' : 'rgba(251,146,60,0.5)'}`,
                          boxShadow: linkCopied ? 'none' : '0 4px 12px rgba(251,146,60,0.25)',
                        }}>
                        {linkCopied ? <><Check size={14} /> {t('dashboard.copied')}</> : <><Copy size={14} /> {t('dashboard.copyLink')}</>}
                      </button>
                    </div>
                  </div>
                </div>
              )}
              {isUgc && (
                <div className="rounded-2xl p-5 sm:p-6 relative overflow-hidden"
                  style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.18), rgba(56,189,248,0.14))', border: '1px solid rgba(99,102,241,0.35)', boxShadow: '0 4px 32px rgba(99,102,241,0.12)' }}>
                  <div className="absolute top-0 right-0 w-48 h-48 rounded-full opacity-20"
                    style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.5), transparent)', transform: 'translate(30%, -40%)' }} />
                  <div className="absolute bottom-0 left-0 w-32 h-32 rounded-full opacity-15"
                    style={{ background: 'radial-gradient(circle, rgba(56,189,248,0.4), transparent)', transform: 'translate(-30%, 40%)' }} />
                  <div className="relative z-10">
                    <div className="flex items-center gap-2.5 mb-2">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ background: 'linear-gradient(135deg, #6366f1, #38bdf8)', boxShadow: '0 4px 12px rgba(99,102,241,0.3)' }}>
                        <Gift size={17} className="text-white" />
                      </div>
                      <h3 className="text-sm font-bold text-white">{t(regionConfig.currency === 'KZT' ? 'promo.ugc_title_kz' : 'promo.ugc_title')}</h3>
                    </div>
                    <p className="text-xs mb-4 leading-relaxed" style={{ color: '#cbd5e1' }}>
                      {t(regionConfig.currency === 'KZT' ? 'promo.ugc_desc_kz' : 'promo.ugc_desc')}
                    </p>
                    <button
                      onClick={() => setPromoModalOpen(true)}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all hover:scale-[1.02] active:scale-[0.98]"
                      style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)', color: '#fff', border: '1px solid rgba(129,140,248,0.4)', boxShadow: '0 4px 16px rgba(99,102,241,0.3)' }}>
                      <Send size={14} /> {t('promo.submit_btn')}
                    </button>
                  </div>
                </div>
              )}
              {!isModel && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <StatCard
                    icon={<Users size={15} className="text-sky-400" />}
                    label={t('cd.stats.followers')}
                    value={formatNum(followers)}
                    hint={followers > 0 ? t('cd.stats.followersHint') : t('cd.stats.addInSettings')}
                    accent="#38bdf8"
                  />
                  <StatCard
                    icon={<Eye size={15} className="text-amber-400" />}
                    label={t('cd.stats.avgViews')}
                    value={formatNum(avgViews)}
                    hint={t('cd.stats.perPost')}
                    accent="#fbbf24"
                  />
                  <StatCard
                    icon={<TrendingUp size={15} className="text-emerald-400" />}
                    label={t('cd.stats.engRate')}
                    value={`${(engRate ?? 0).toFixed(1)}%`}
                    hint={t('cd.stats.engHint')}
                    accent="#00C48C"
                  />
                </div>
              )}

              <section>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-base font-bold text-white">{t('cd.activeOrders')}</h2>
                  {activeOrders.length > 0 && (
                    <button
                      onClick={() => setTab('orders')}
                      className="text-xs font-medium transition-colors"
                      style={{ color: '#00C48C' }}
                    >
                      {t('cd.viewAll')}
                    </button>
                  )}
                </div>

                {dataLoading ? (
                  <div
                    className="rounded-2xl p-8 flex items-center justify-center"
                    style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}
                  >
                    <div className="w-5 h-5 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
                  </div>
                ) : activeOrders.length === 0 ? (
                  <div
                    className="rounded-2xl p-10 text-center"
                    style={{
                      background:
                        'linear-gradient(180deg, rgba(255,255,255,0.025), rgba(255,255,255,0.01))',
                      border: '1px dashed rgba(255,255,255,0.10)',
                    }}
                  >
                    <div
                      className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center"
                      style={{ background: 'rgba(0,196,140,0.06)', border: '1px solid rgba(0,196,140,0.15)' }}
                    >
                      <Inbox size={24} style={{ color: '#00C48C' }} />
                    </div>
                    <h3 className="text-sm font-bold text-white mb-1">{t('cd.noOrdersYet')}</h3>
                    <p className="text-xs max-w-xs mx-auto" style={{ color: '#64748b', lineHeight: 1.5 }}>
                      {t('cd.noOrdersDesc')}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {activeOrders.slice(0, 4).map((o) => (
                      <OrderCard key={o.id} order={o} t={t} />
                    ))}
                  </div>
                )}
              </section>

              <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div
                  className="rounded-2xl p-5"
                  style={{
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.05)',
                  }}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <Package size={15} style={{ color: '#00C48C' }} />
                    <h3 className="text-sm font-bold text-white">{t('cd.yourPackages')}</h3>
                  </div>
                  {editPackages.length === 0 ? (
                    <p className="text-xs" style={{ color: '#64748b' }}>
                      {t('cd.noPackagesHint')}
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {editPackages.slice(0, 3).map((p) => (
                        <li
                          key={p.id}
                          className="flex items-center justify-between gap-3 px-3 py-2 rounded-xl"
                          style={{
                            background: 'rgba(255,255,255,0.025)',
                            border: '1px solid rgba(255,255,255,0.05)',
                          }}
                        >
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-white truncate">
                              {p?.name || t('cd.untitledPackage')}
                            </div>
                            <div className="text-[11px]" style={{ color: '#64748b' }}>
                              {t('cd.delivery')}: {p?.deliveryDays ?? 5} {t('cd.days')}
                            </div>
                          </div>
                          <div className="text-sm font-bold" style={{ color: '#00C48C' }}>
                            {(p?.price ?? 0).toLocaleString()} {currency}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                  <button
                    onClick={() => setTab('packages')}
                    className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold"
                    style={{ color: '#00C48C' }}
                  >
                    {t('cd.managePackages')} <ChevronRight size={12} />
                  </button>
                </div>

                <div
                  className="rounded-2xl p-5"
                  style={{
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.05)',
                  }}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <ImageIcon size={15} style={{ color: '#fbbf24' }} />
                    <h3 className="text-sm font-bold text-white">{t('cd.portfolioPreview')}</h3>
                  </div>
                  {portfolio.length === 0 ? (
                    <p className="text-xs" style={{ color: '#64748b' }}>
                      {t('cd.noPortfolioHint')}
                    </p>
                  ) : (
                    <div className="grid grid-cols-3 gap-2">
                      {portfolio.slice(0, 6).map((p) => (
                        <div
                          key={p.id}
                          className="aspect-square rounded-xl overflow-hidden"
                          style={{ background: 'rgba(255,255,255,0.04)' }}
                        >
                          {p.media_type === 'video' ? (
                            <div className="w-full h-full flex items-center justify-center" style={{ background: '#0a0f1a' }}>
                              <Play size={18} style={{ color: '#94a3b8' }} />
                            </div>
                          ) : (
                            <img src={p.url} alt="" className="w-full h-full object-cover" />
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  <button
                    onClick={() => setTab('portfolio')}
                    className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold"
                    style={{ color: '#fbbf24' }}
                  >
                    {t('cd.openPortfolio')} <ChevronRight size={12} />
                  </button>
                </div>
              </section>
            </div>
          )}

          {tab === 'packages' && (
            <div className="space-y-4 max-w-3xl animate-[fadeInUp_0.3s_ease-out]">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-white">{t('cd.nav.packages')}</h2>
                  <p className="text-xs mt-0.5" style={{ color: '#64748b' }}>
                    {t('cd.packagesDesc')}
                  </p>
                </div>
                <button
                  onClick={() => setEditPackages((prev) => [...prev, emptyPackage()])}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold"
                  style={{
                    background: 'rgba(0,196,140,0.10)',
                    color: '#00C48C',
                    border: '1px solid rgba(0,196,140,0.25)',
                  }}
                >
                  <Plus size={13} /> {t('cd.addPackage')}
                </button>
              </div>

              {isUgc && (
                <div className="rounded-xl px-4 py-3" style={{ background: 'rgba(56,189,248,0.06)', border: '1px solid rgba(56,189,248,0.2)' }}>
                  <p className="text-xs leading-relaxed" style={{ color: '#7dd3fc' }}>
                    {t('cd.ugcPricingHint')}
                  </p>
                </div>
              )}

              {isBlogger && (
                <div className="rounded-xl px-4 py-3" style={{ background: 'rgba(0,196,140,0.06)', border: '1px solid rgba(0,196,140,0.2)' }}>
                  <p className="text-xs leading-relaxed" style={{ color: '#6ee7b7' }}>
                    {t('cd.bloggerPricingHint')}
                  </p>
                </div>
              )}

              {editPackages.length === 0 ? (
                <div
                  className="rounded-2xl p-10 text-center"
                  style={{
                    background:
                      'linear-gradient(180deg, rgba(255,255,255,0.025), rgba(255,255,255,0.01))',
                    border: '1px dashed rgba(255,255,255,0.10)',
                  }}
                >
                  <Package size={28} className="mx-auto mb-3" style={{ color: '#475569' }} />
                  <p className="text-sm font-semibold text-white">{t('cd.noPackagesTitle')}</p>
                  <p className="text-xs mt-1" style={{ color: '#64748b' }}>
                    {t('cd.noPackagesExample')}
                  </p>
                </div>
              ) : (
                editPackages.map((pkg, i) => (
                  <div
                    key={pkg?.id ?? i}
                    className="rounded-2xl overflow-hidden"
                    style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
                  >
                    <div
                      className="flex items-center justify-between px-4 py-3"
                      style={{ background: 'rgba(0,196,140,0.04)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}
                    >
                      <span className="text-sm font-bold text-white">{t('cd.packageN', { n: i + 1 })}</span>
                      <button
                        onClick={() => setEditPackages((prev) => prev.filter((_, idx) => idx !== i))}
                        className="p-1.5 rounded-lg transition-colors"
                        style={{ color: '#64748b' }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = '#f87171')}
                        onMouseLeave={(e) => (e.currentTarget.style.color = '#64748b')}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <div className="p-4 space-y-3">
                      <div className="grid sm:grid-cols-2 gap-3">
                        <Field label={t('cd.fields.name')}>
                          <input
                            value={pkg?.name ?? ''}
                            onChange={(e) =>
                              setEditPackages((prev) =>
                                prev.map((p, idx) => (idx === i ? { ...p, name: e.target.value } : p))
                              )
                            }
                            placeholder={isModel ? t('packages.model_name_placeholder') : t('cd.fields.namePlaceholder')}
                            className={inputCls}
                          />
                        </Field>
                        <div className="grid grid-cols-2 gap-2">
                          <Field label={t('cd.fields.price')}>
                            <input
                              type="number"
                              min={0}
                              value={pkg?.price || ''}
                              onChange={(e) =>
                                setEditPackages((prev) =>
                                  prev.map((p, idx) =>
                                    idx === i ? { ...p, price: Number(e.target.value) } : p
                                  )
                                )
                              }
                              placeholder="2500"
                              className={inputCls}
                            />
                          </Field>
                          <Field label={isModel ? t('packages.duration_hours') : t('cd.fields.deliveryDays')}>
                            <input
                              type="number"
                              min={1}
                              max={60}
                              value={pkg?.deliveryDays ?? 5}
                              onChange={(e) =>
                                setEditPackages((prev) =>
                                  prev.map((p, idx) =>
                                    idx === i
                                      ? {
                                          ...p,
                                          deliveryDays: Math.min(60, Math.max(1, Number(e.target.value) || 1)),
                                        }
                                      : p
                                  )
                                )
                              }
                              className={inputCls}
                            />
                          </Field>
                        </div>
                      </div>
                      <Field label={t('cd.fields.description')}>
                        <input
                          value={pkg?.description ?? ''}
                          onChange={(e) =>
                            setEditPackages((prev) =>
                              prev.map((p, idx) =>
                                idx === i ? { ...p, description: e.target.value } : p
                              )
                            )
                          }
                          placeholder={isModel ? t('packages.model_desc_placeholder') : t('cd.fields.descPlaceholder')}
                          className={inputCls}
                        />
                      </Field>
                    </div>
                  </div>
                ))
              )}

              <div className="flex items-center gap-3">
                <button
                  onClick={savePackages}
                  disabled={savingProfile}
                  className="px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all hover:brightness-110 disabled:opacity-50"
                  style={{
                    background: 'linear-gradient(135deg, #0e7c4a, #0a5c38)',
                    color: '#fff',
                    border: '1px solid rgba(0,196,140,0.30)',
                  }}
                >
                  {savingProfile ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Check size={14} />
                  )}
                  {t('cd.savePackages')}
                </button>
                {savedHint && (
                  <span className="text-xs font-semibold" style={{ color: '#00C48C' }}>
                    {t('cd.saved')}
                  </span>
                )}
              </div>
            </div>
          )}

          {tab === 'portfolio' && (
            <div className="space-y-4 animate-[fadeInUp_0.3s_ease-out]">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <h2 className="text-lg font-bold text-white">{t('cd.nav.portfolio')}</h2>
                  <p className="text-xs mt-0.5" style={{ color: '#64748b' }}>
                    {t('cd.portfolioDesc')}
                  </p>
                </div>
                <label
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold cursor-pointer"
                  style={{
                    background: 'rgba(0,196,140,0.10)',
                    color: '#00C48C',
                    border: '1px solid rgba(0,196,140,0.25)',
                  }}
                >
                  {uploadingMedia ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-emerald-500/40 border-t-emerald-500 rounded-full animate-spin" />
                      {t('cd.uploading')}
                    </>
                  ) : (
                    <>
                      <Upload size={13} /> {t('cd.upload')}
                    </>
                  )}
                  <input
                    type="file"
                    multiple
                    accept="image/*,video/*"
                    className="hidden"
                    onChange={handleMediaUpload}
                  />
                </label>
              </div>

              {mediaUploadError && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium" style={{ background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.25)', color: '#f87171' }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  {mediaUploadError}
                </div>
              )}

              {/* Video Comp Card (Models only) */}
              {isModel && (
                <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div className="flex items-center gap-2 mb-2">
                    <Video size={15} style={{ color: '#f59e0b' }} />
                    <h3 className="text-sm font-bold text-white">{t('dashboard.model.videoCompTitle')}</h3>
                  </div>
                  <p className="text-xs mb-3" style={{ color: '#64748b' }}>{t('dashboard.model.videoCompHint')}</p>
                  {videoCompUrl ? (
                    <div className="space-y-2">
                      <div className="rounded-xl overflow-hidden aspect-video" style={{ background: '#0a0f1a', border: '1px solid rgba(255,255,255,0.06)' }}>
                        <video src={videoCompUrl} controls className="w-full h-full object-contain" />
                      </div>
                      <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold cursor-pointer" style={{ background: 'rgba(245,158,11,0.10)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.25)' }}>
                        {uploadingVideoComp ? <div className="w-3.5 h-3.5 border-2 border-amber-500/40 border-t-amber-500 rounded-full animate-spin" /> : <Upload size={12} />}
                        {t('dashboard.model.replaceVideo')}
                        <input type="file" accept="video/*" className="hidden" onChange={handleVideoCompUpload} />
                      </label>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center gap-2 rounded-xl p-8 cursor-pointer transition-all hover:border-amber-500/30" style={{ background: 'rgba(255,255,255,0.015)', border: '1px dashed rgba(255,255,255,0.12)' }}>
                      {uploadingVideoComp ? (
                        <div className="w-5 h-5 border-2 border-amber-500/40 border-t-amber-500 rounded-full animate-spin" />
                      ) : (
                        <>
                          <Video size={28} style={{ color: '#475569' }} />
                          <span className="text-xs font-semibold" style={{ color: '#94a3b8' }}>{t('dashboard.model.uploadVideo')}</span>
                          <span className="text-[10px]" style={{ color: '#475569' }}>MP4, MOV, WebM — max 50 MB</span>
                        </>
                      )}
                      <input type="file" accept="video/*" className="hidden" onChange={handleVideoCompUpload} />
                    </label>
                  )}
                </div>
              )}

              {dataLoading ? (
                <div
                  className="rounded-2xl p-10 flex items-center justify-center"
                  style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}
                >
                  <div className="w-5 h-5 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
                </div>
              ) : portfolio.length === 0 ? (
                <div
                  className="rounded-2xl p-10 text-center"
                  style={{
                    background:
                      'linear-gradient(180deg, rgba(255,255,255,0.025), rgba(255,255,255,0.01))',
                    border: '1px dashed rgba(255,255,255,0.10)',
                  }}
                >
                  <ImageIcon size={28} className="mx-auto mb-3" style={{ color: '#475569' }} />
                  <p className="text-sm font-semibold text-white">{t('cd.noPortfolioTitle')}</p>
                  <p className="text-xs mt-1" style={{ color: '#64748b' }}>
                    {t('cd.noPortfolioUpload')}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {portfolio.map((item) => (
                    <div
                      key={item.id}
                      className="aspect-square rounded-xl overflow-hidden relative group"
                      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
                    >
                      {item.media_type === 'video' ? (
                        <video
                          src={item.url}
                          preload="metadata"
                          muted
                          playsInline
                          controls
                          controlsList="nodownload"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <img src={item.url} alt="" className="w-full h-full object-cover" />
                      )}
                      <button
                        onClick={() => deletePortfolioItem(item)}
                        className="absolute top-2 right-2 w-7 h-7 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}
                        aria-label="Delete"
                      >
                        <Trash2 size={12} style={{ color: '#f87171' }} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === 'orders' && (
            <div className="space-y-4 animate-[fadeInUp_0.3s_ease-out]">
              <div>
                <h2 className="text-lg font-bold text-white">{t('cd.nav.orders')}</h2>
                <p className="text-xs mt-0.5" style={{ color: '#64748b' }}>
                  {t('cd.ordersDesc')}
                </p>
              </div>

              {dataLoading ? (
                <div
                  className="rounded-2xl p-10 flex items-center justify-center"
                  style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}
                >
                  <div className="w-5 h-5 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
                </div>
              ) : orders.length === 0 ? (
                <div
                  className="rounded-2xl p-10 text-center"
                  style={{
                    background:
                      'linear-gradient(180deg, rgba(255,255,255,0.025), rgba(255,255,255,0.01))',
                    border: '1px dashed rgba(255,255,255,0.10)',
                  }}
                >
                  <div
                    className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center"
                    style={{ background: 'rgba(0,196,140,0.06)', border: '1px solid rgba(0,196,140,0.15)' }}
                  >
                    <Inbox size={24} style={{ color: '#00C48C' }} />
                  </div>
                  <h3 className="text-sm font-bold text-white mb-1">{t('cd.noOrdersYet')}</h3>
                  <p className="text-xs max-w-xs mx-auto" style={{ color: '#64748b', lineHeight: 1.5 }}>
                    {t('cd.noOrdersDesc')}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {orders.map((o) => (
                    <OrderCard key={o.id} order={o} t={t} />
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === 'settings' && (
            <div className="space-y-5 max-w-2xl animate-[fadeInUp_0.3s_ease-out]">
              <div>
                <h2 className="text-lg font-bold text-white">{t('cd.nav.settings')}</h2>
                <p className="text-xs mt-0.5" style={{ color: '#64748b' }}>
                  {t('cd.settingsDesc')}
                </p>
              </div>

              <Section title={t('cd.sections.avatar')}>
                <div className="flex items-center gap-4">
                  <div className="relative group">
                    {creatorProfile?.avatar_url ? (
                      <img
                        src={creatorProfile.avatar_url}
                        alt=""
                        className="w-20 h-20 rounded-2xl object-cover"
                        style={{ border: '2px solid rgba(255,255,255,0.10)' }}
                      />
                    ) : (
                      <div
                        className="w-20 h-20 rounded-2xl flex items-center justify-center text-2xl font-bold"
                        style={{ background: 'rgba(0,196,140,0.12)', color: '#00C48C', border: '2px solid rgba(0,196,140,0.20)' }}
                      >
                        {(creatorProfile?.display_name ?? 'C').charAt(0).toUpperCase()}
                      </div>
                    )}
                    <label
                      className="absolute inset-0 rounded-2xl flex items-center justify-center cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
                    >
                      {uploadingAvatar ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <Upload size={18} className="text-white" />
                      )}
                      <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
                    </label>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{t('cd.profilePhoto')}</p>
                    <p className="text-xs mt-0.5" style={{ color: '#64748b' }}>{t('cd.profilePhotoHint')}</p>
                  </div>
                </div>
              </Section>

              <Section title={t('cd.sections.profile')}>
                <div className="grid sm:grid-cols-2 gap-3">
                  <Field label={t('cd.fields.displayName')}>
                    <input
                      value={editDisplayName}
                      onChange={(e) => setEditDisplayName(e.target.value)}
                      placeholder={t('cd.fields.displayNamePlaceholder')}
                      className={inputCls}
                    />
                  </Field>
                  <Field label={t('cd.fields.username')}>
                    <input
                      value={editUsername}
                      onChange={(e) => setEditUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
                      placeholder="your_username"
                      className={inputCls}
                    />
                  </Field>
                </div>
                <Field label={t('cd.fields.bio')}>
                  <textarea
                    value={editBio}
                    onChange={(e) => setEditBio(e.target.value)}
                    rows={3}
                    className={inputCls + ' resize-none'}
                    placeholder={t('cd.fields.bioPlaceholder')}
                  />
                </Field>
                <div className="grid sm:grid-cols-2 gap-3">
                  <Field label={t('cd.fields.location')}>
                    <input
                      value={editLocation}
                      onChange={(e) => setEditLocation(e.target.value)}
                      placeholder="Dubai, UAE"
                      className={inputCls}
                    />
                  </Field>
                  <Field label={t('cd.fields.category')}>
                    <input
                      value={editCategory}
                      onChange={(e) => setEditCategory(e.target.value)}
                      placeholder="Fashion, Beauty, Tech..."
                      className={inputCls}
                    />
                  </Field>
                </div>
              </Section>

              {!isModel && (
                <Section title={t('cd.sections.audienceStats')}>
                  <div className="grid grid-cols-3 gap-2">
                    <Field label={t('cd.fields.followers')}>
                      <input
                        type="number"
                        value={editFollowers}
                        onChange={(e) => setEditFollowers(e.target.value)}
                        placeholder="150000"
                        className={inputCls}
                      />
                    </Field>
                    <Field label={t('cd.fields.avgViews')}>
                      <input
                        type="number"
                        value={editAvgViews}
                        onChange={(e) => setEditAvgViews(e.target.value)}
                        placeholder="50000"
                        className={inputCls}
                      />
                    </Field>
                    <Field label={t('cd.fields.engPct')}>
                      <input
                        type="number"
                        step="0.1"
                        value={editEngRate}
                        onChange={(e) => setEditEngRate(e.target.value)}
                        placeholder="4.5"
                        className={inputCls}
                      />
                    </Field>
                  </div>
                </Section>
              )}

              <Section title={t('cd.sections.socialLinks')}>
                <Field label={<span className="flex items-center gap-1.5"><Instagram size={11} /> Instagram URL</span>}>
                  <input
                    value={editInstagram}
                    onChange={(e) => setEditInstagram(e.target.value)}
                    placeholder="https://instagram.com/yourhandle"
                    className={inputCls}
                  />
                </Field>
                <Field label={<span className="flex items-center gap-1.5"><Youtube size={11} /> YouTube URL</span>}>
                  <input
                    value={editYoutube}
                    onChange={(e) => setEditYoutube(e.target.value)}
                    placeholder="https://youtube.com/@yourchannel"
                    className={inputCls}
                  />
                </Field>
                <Field label={<span className="flex items-center gap-1.5"><Play size={11} /> TikTok URL</span>}>
                  <input
                    value={editTiktok}
                    onChange={(e) => setEditTiktok(e.target.value)}
                    placeholder="https://tiktok.com/@yourhandle"
                    className={inputCls}
                  />
                </Field>
              </Section>

              {isModel && (
                <Section title={t('dashboard.model.measurementsTitle')}>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <Field label={t('dashboard.model.bust')}>
                      <input value={modelBust} onChange={e => setModelBust(e.target.value)} placeholder="86 cm" className={inputCls} />
                    </Field>
                    <Field label={t('dashboard.model.waist')}>
                      <input value={modelWaist} onChange={e => setModelWaist(e.target.value)} placeholder="62 cm" className={inputCls} />
                    </Field>
                    <Field label={t('dashboard.model.hips')}>
                      <input value={modelHips} onChange={e => setModelHips(e.target.value)} placeholder="90 cm" className={inputCls} />
                    </Field>
                    <Field label={t('dashboard.model.shoeSize')}>
                      <input value={modelShoeSize} onChange={e => setModelShoeSize(e.target.value)} placeholder="38" className={inputCls} />
                    </Field>
                    <Field label={t('dashboard.model.clothingSize')}>
                      <select value={modelClothingSize} onChange={e => setModelClothingSize(e.target.value)} className={inputCls}>
                        <option value="">—</option>
                        <option value="XS">XS</option>
                        <option value="S">S</option>
                        <option value="M">M</option>
                        <option value="L">L</option>
                        <option value="XL">XL</option>
                      </select>
                    </Field>
                    <Field label={t('dashboard.model.hairColor')}>
                      <input value={modelHairColor} onChange={e => setModelHairColor(e.target.value)} placeholder="Blonde" className={inputCls} />
                    </Field>
                    <Field label={t('dashboard.model.eyeColor')}>
                      <input value={modelEyeColor} onChange={e => setModelEyeColor(e.target.value)} placeholder="Green" className={inputCls} />
                    </Field>
                  </div>
                </Section>
              )}

              {isModel && (
                <Section title={t('dashboard.model.skillsTitle')}>
                  <Field label={t('dashboard.model.skills')}>
                    <input value={modelSkills} onChange={e => setModelSkills(e.target.value)} placeholder={t('dashboard.model.skillsPlaceholder')} className={inputCls} />
                    <p className="text-[10px] mt-1" style={{ color: '#475569' }}>{t('dashboard.model.skillsHint')}</p>
                  </Field>
                  <Field label={t('dashboard.model.features')}>
                    <input value={modelFeatures} onChange={e => setModelFeatures(e.target.value)} placeholder={t('dashboard.model.featuresPlaceholder')} className={inputCls} />
                    <p className="text-[10px] mt-1" style={{ color: '#475569' }}>{t('dashboard.model.featuresHint')}</p>
                  </Field>
                </Section>
              )}

              <div className="flex items-center gap-3">
                <button
                  onClick={saveSettings}
                  disabled={savingProfile}
                  className="px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all hover:brightness-110 disabled:opacity-50"
                  style={{
                    background: 'linear-gradient(135deg, #0e7c4a, #0a5c38)',
                    color: '#fff',
                    border: '1px solid rgba(0,196,140,0.30)',
                  }}
                >
                  {savingProfile ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Check size={14} />
                  )}
                  {t('cd.saveChanges')}
                </button>
                {savedHint && (
                  <span className="text-xs font-semibold" style={{ color: '#00C48C' }}>
                    {t('cd.saved')}
                  </span>
                )}
              </div>
            </div>
          )}

          {tab === 'wallet' && showWallet && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-bold text-white">{t('cd.wallet.title')}</h2>
                <p className="text-xs mt-1" style={{ color: '#64748b' }}>
                  {t('cd.wallet.desc')}
                </p>
              </div>

              <div
                className="relative overflow-hidden rounded-2xl p-6"
                style={{
                  background: 'linear-gradient(135deg, rgba(0,196,140,0.08), rgba(0,196,140,0.02))',
                  border: '1px solid rgba(0,196,140,0.18)',
                  boxShadow: '0 0 40px rgba(0,196,140,0.05)',
                }}
              >
                <div className="text-[11px] uppercase tracking-wider font-semibold mb-2" style={{ color: '#94a3b8' }}>
                  {t('cd.wallet.availableBalance')}
                </div>
                <div className="text-4xl font-bold text-white mb-4">
                  {walletBalance.toLocaleString()} <span className="text-lg font-semibold" style={{ color: '#64748b' }}>{currency}</span>
                </div>
                <button
                  className="px-5 py-2.5 rounded-xl text-sm font-bold transition-all hover:brightness-110 flex items-center gap-2"
                  style={{
                    background: walletBalance > 0 && !withdrawing ? 'linear-gradient(135deg, #0e7c4a, #0a5c38)' : 'rgba(255,255,255,0.05)',
                    color: walletBalance > 0 ? '#fff' : '#475569',
                    border: `1px solid ${walletBalance > 0 ? 'rgba(0,196,140,0.30)' : 'rgba(255,255,255,0.08)'}`,
                    cursor: walletBalance > 0 && !withdrawing ? 'pointer' : 'not-allowed',
                  }}
                  disabled={walletBalance <= 0 || withdrawing}
                  onClick={async () => {
                    if (!bankIban || !bankAccountName) {
                      setIbanError(t('cd.wallet.fillBankFirst'));
                      return;
                    }
                    setWithdrawing(true);
                    setWithdrawSuccess(false);
                    const { error: wErr } = await supabase.from('withdrawal_requests').insert({
                      creator_id: creatorProfile?.id,
                      amount: walletBalance,
                      bank_account_name: bankAccountName,
                      bank_name: bankName,
                      bank_iban: bankIban,
                    });
                    if (!wErr) {
                      await supabase.from('creator_profiles').update({ wallet_balance: 0 }).eq('user_id', user?.id);
                      setWalletBalance(0);
                      setWithdrawSuccess(true);
                      setTimeout(() => setWithdrawSuccess(false), 5000);
                    }
                    setWithdrawing(false);
                  }}
                >
                  {withdrawing && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                  {t('cd.wallet.withdraw')}
                </button>
                {withdrawSuccess && (
                  <p className="text-xs font-semibold mt-3" style={{ color: '#00C48C' }}>
                    {t('cd.wallet.withdrawSuccess')}
                  </p>
                )}
                <div
                  className="absolute -bottom-8 -right-8 w-32 h-32 rounded-full opacity-20 blur-3xl pointer-events-none"
                  style={{ background: '#00C48C' }}
                />
              </div>

              <Section title={t('cd.wallet.bankDetails')}>
                <div className="space-y-3">
                  <Field label={t(isKZ ? 'cd.wallet.accountNameKz' : 'cd.wallet.accountName')}>
                    <input
                      value={bankAccountName}
                      onChange={(e) => setBankAccountName(e.target.value)}
                      placeholder={t(isKZ ? 'cd.wallet.accountNamePlaceholderKz' : 'cd.wallet.accountNamePlaceholder')}
                      className={inputCls}
                    />
                  </Field>
                  <Field label={t('cd.wallet.bankName')}>
                    <input
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      placeholder={t(isKZ ? 'cd.wallet.bankNamePlaceholderKz' : 'cd.wallet.bankNamePlaceholder')}
                      className={inputCls}
                    />
                  </Field>
                  <Field label={t(isKZ ? 'cd.wallet.cardOrIban' : 'cd.wallet.iban')}>
                    <input
                      value={bankIban}
                      onChange={(e) => {
                        setBankIban(isKZ ? e.target.value : e.target.value.toUpperCase());
                        setIbanError('');
                      }}
                      placeholder={isKZ ? 'XXXX XXXX XXXX XXXX или KZ...' : 'AE070331234567890123456'}
                      className={`${inputCls} ${ibanError ? '!border-red-500/60' : ''}`}
                    />
                    {ibanError && (
                      <p className="text-[10px] mt-1 text-red-400">{ibanError}</p>
                    )}
                    <p className="text-[10px] mt-1" style={{ color: '#475569' }}>
                      {t(isKZ ? 'cd.wallet.ibanHintKz' : 'cd.wallet.ibanHint')}
                    </p>
                  </Field>
                </div>

                <div className="flex items-center gap-3 mt-5">
                  <button
                    onClick={async () => {
                      if (!isKZ && bankIban && !bankIban.startsWith('AE')) {
                        setIbanError(t('cd.wallet.ibanInvalid'));
                        return;
                      }
                      setSavingBank(true);
                      setBankSaved(false);
                      await supabase
                        .from('creator_profiles')
                        .update({
                          bank_account_name: bankAccountName.trim(),
                          bank_name: bankName.trim(),
                          bank_iban: bankIban.trim(),
                        })
                        .eq('user_id', user?.id);
                      setSavingBank(false);
                      setBankSaved(true);
                      setTimeout(() => setBankSaved(false), 3000);
                    }}
                    disabled={savingBank}
                    className="px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all hover:brightness-110 disabled:opacity-50"
                    style={{
                      background: 'linear-gradient(135deg, #0e7c4a, #0a5c38)',
                      color: '#fff',
                      border: '1px solid rgba(0,196,140,0.30)',
                    }}
                  >
                    {savingBank ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <Check size={14} />
                    )}
                    {t('cd.wallet.saveDetails')}
                  </button>
                  {bankSaved && (
                    <span className="text-xs font-semibold" style={{ color: '#00C48C' }}>
                      {t('cd.saved')}
                    </span>
                  )}
                </div>
              </Section>
            </div>
          )}
        </div>
      </main>

      {/* Promo Task Modal */}
      {promoModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }}>
          <div className="w-full max-w-md rounded-2xl p-6 relative animate-[fadeInUp_0.2s_ease-out]"
            style={{ background: '#0f1520', border: '1px solid rgba(99,102,241,0.3)', boxShadow: '0 24px 64px rgba(0,0,0,0.5)' }}>
            <button onClick={() => { setPromoModalOpen(false); setPromoSuccess(false); setPromoLink(''); }}
              className="absolute top-4 right-4 w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
              style={{ background: 'rgba(255,255,255,0.05)', color: '#64748b' }}>
              <X size={16} />
            </button>

            {promoSuccess ? (
              <div className="text-center py-4">
                <div className="w-14 h-14 rounded-full mx-auto mb-4 flex items-center justify-center"
                  style={{ background: 'rgba(0,196,140,0.12)', border: '1px solid rgba(0,196,140,0.3)' }}>
                  <Check size={24} style={{ color: '#00C48C' }} />
                </div>
                <h3 className="text-base font-bold text-white mb-2">{t('promo.success_title')}</h3>
                <p className="text-xs leading-relaxed" style={{ color: '#94a3b8' }}>{t('promo.success_desc')}</p>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ background: 'linear-gradient(135deg, #6366f1, #38bdf8)', boxShadow: '0 4px 12px rgba(99,102,241,0.3)' }}>
                    <Gift size={18} className="text-white" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">{t('promo.modal_title')}</h3>
                    <p className="text-xs" style={{ color: '#64748b' }}>{t('promo.modal_subtitle')}</p>
                  </div>
                </div>

                <label className="block text-xs font-medium mb-1.5 uppercase tracking-wide" style={{ color: '#94a3b8' }}>
                  {t('promo.link_label')}
                </label>
                <input
                  type="url"
                  value={promoLink}
                  onChange={e => setPromoLink(e.target.value)}
                  placeholder={t('promo.link_placeholder')}
                  className="w-full rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 outline-none transition-all mb-4"
                  style={{ background: '#080d16', border: '1px solid rgba(99,102,241,0.25)' }}
                  onFocus={e => { e.currentTarget.style.borderColor = 'rgba(99,102,241,0.6)'; }}
                  onBlur={e => { e.currentTarget.style.borderColor = 'rgba(99,102,241,0.25)'; }}
                />

                <button
                  disabled={!promoLink.trim() || promoSubmitting}
                  onClick={async () => {
                    setPromoSubmitting(true);
                    await supabase.from('promo_reviews').insert({
                      creator_id: creatorProfile?.id,
                      video_url: promoLink.trim(),
                    });
                    setPromoSubmitting(false);
                    setPromoSuccess(true);
                  }}
                  className="w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-40"
                  style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)', color: '#fff', border: '1px solid rgba(129,140,248,0.4)', boxShadow: '0 4px 16px rgba(99,102,241,0.25)' }}>
                  {promoSubmitting
                    ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    : <><Send size={14} /> {t('promo.send_btn')}</>
                  }
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const inputCls =
  'w-full rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-600 outline-none transition-all bg-[#0a0f1a] border border-[rgba(255,255,255,0.08)] focus:border-emerald-500/40';

function Field({
  label,
  children,
}: {
  label: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-[11px] uppercase tracking-wide font-semibold mb-1.5" style={{ color: '#64748b' }}>
        {label}
      </label>
      {children}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      className="rounded-2xl p-5 space-y-3"
      style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}
    >
      <div className="text-xs font-bold uppercase tracking-wider" style={{ color: '#94a3b8' }}>
        {title}
      </div>
      {children}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  hint,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint: string;
  accent: string;
}) {
  return (
    <div
      className="relative overflow-hidden rounded-2xl p-5 transition-all duration-300 hover:bg-white/[0.04]"
      style={{
        background: 'rgba(255,255,255,0.025)',
        border: '1px solid rgba(255,255,255,0.05)',
        boxShadow: `0 0 24px ${accent}10`,
      }}
    >
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <span className="text-[11px] uppercase tracking-wider font-semibold" style={{ color: '#94a3b8' }}>
          {label}
        </span>
      </div>
      <div className="text-3xl font-bold text-white">{value}</div>
      <div className="text-xs mt-1" style={{ color: '#64748b' }}>
        {hint}
      </div>
      <div
        className="absolute -bottom-6 -right-6 w-24 h-24 rounded-full opacity-30 blur-2xl pointer-events-none"
        style={{ background: accent }}
      />
    </div>
  );
}

function OrderCard({ order, t }: { order: BrandOrder; t: (key: string) => string }) {
  const STATUS_TONE: Record<string, { bg: string; fg: string; bd: string; labelKey: string }> = {
    pending: { bg: 'rgba(251,191,36,0.10)', fg: '#fbbf24', bd: 'rgba(251,191,36,0.30)', labelKey: 'cd.status.pending' },
    on_hold: { bg: 'rgba(251,191,36,0.10)', fg: '#fbbf24', bd: 'rgba(251,191,36,0.30)', labelKey: 'cd.status.onHold' },
    in_progress: { bg: 'rgba(59,130,246,0.10)', fg: '#60a5fa', bd: 'rgba(59,130,246,0.30)', labelKey: 'cd.status.inProgress' },
    completed: { bg: 'rgba(0,196,140,0.10)', fg: '#00C48C', bd: 'rgba(0,196,140,0.30)', labelKey: 'cd.status.completed' },
    cancelled: { bg: 'rgba(239,68,68,0.10)', fg: '#f87171', bd: 'rgba(239,68,68,0.30)', labelKey: 'cd.status.cancelled' },
    paid: { bg: 'rgba(0,196,140,0.10)', fg: '#00C48C', bd: 'rgba(0,196,140,0.30)', labelKey: 'cd.status.paid' },
  };
  const tone = STATUS_TONE[order?.status] ?? STATUS_TONE.pending;
  return (
    <div
      className="rounded-2xl p-4"
      style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)' }}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="min-w-0">
          <div className="text-sm font-bold text-white truncate">
            {order?.buyer_name || 'Brand'}
          </div>
          <div className="text-xs truncate" style={{ color: '#64748b' }}>
            {order?.package_name || 'Package'}
          </div>
        </div>
        <span
          className="flex-shrink-0 px-2.5 py-0.5 rounded-full text-[10px] font-bold"
          style={{ background: tone.bg, color: tone.fg, border: `1px solid ${tone.bd}` }}
        >
          {t(tone.labelKey)}
        </span>
      </div>
      <div className="flex items-center justify-between mt-3">
        <span className="text-[11px]" style={{ color: '#64748b' }}>
          {order?.created_at ? new Date(order.created_at).toLocaleDateString() : ''}
        </span>
        <span className="text-sm font-bold" style={{ color: '#00C48C' }}>
          {(order?.creator_net_amount ?? order?.package_price ?? 0).toLocaleString()} {currency}
        </span>
      </div>
    </div>
  );
}
