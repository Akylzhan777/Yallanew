import { useState, useMemo, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import i18n from '../lib/i18n';
import { Search, Star, Users, Play, Instagram, Youtube, ChevronRight, ChevronDown, X, Check, ArrowRight, UserPlus, Send, LayoutDashboard, LogOut, Briefcase } from 'lucide-react';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { useAuth } from '../context/AuthContext';
import { useRegion } from '../context/RegionContext';
import JoinLanguageSelector from '../components/JoinLanguageSelector';
import { supabase } from '../lib/supabase';

type PageType = 'home' | 'ideas' | 'academy' | 'gallery' | 'calendar' | 'scripts' | 'referral' | 'collabs' | 'shop';

interface HomeProps {
  setPage: (p: PageType) => void;
  setShowModal: (v: boolean) => void;
  isGuest?: boolean;
  onLoginRequest?: () => void;
}

type Platform = 'all' | 'instagram' | 'youtube' | 'tiktok' | 'telegram';
type Category = 'all' | 'lifestyle' | 'beauty' | 'fitness' | 'food' | 'tech' | 'travel' | 'fashion' | 'business';
type CreatorType = 'all' | 'blogger' | 'model' | 'ugc' | 'videographer' | 'photographer' | 'editor' | 'telegram_channel';

interface Creator {
  id: string;
  name: string;
  handle: string;
  username: string;
  type: CreatorType;
  platform: Platform;
  category: Category;
  avatar: string;
  coverPhoto: string;
  followers: number;
  engagement: number;
  avgViews: number;
  location: string;
  rating: number;
  reviewCount: number;
  languages: string[];
  packages: Package[];
  bio: string;
  tags: string[];
  additionalRoles: string[];
  verified: boolean;
  featured?: boolean;
  promoted?: boolean;
}

interface Package {
  id: string;
  name: string;
  description: string;
  price: number;
  deliveryDays: number;
  includes: string[];
}

const PLATFORM_KEYS: Platform[] = ['all', 'instagram', 'youtube', 'tiktok', 'telegram'];
const PLATFORM_ICON: Record<Platform, React.ReactNode> = {
  all: null,
  instagram: <Instagram size={14} />,
  youtube: <Youtube size={14} />,
  tiktok: <Play size={14} />,
  telegram: <Send size={14} />,
};
const CATEGORY_KEYS: Category[] = ['all', 'lifestyle', 'beauty', 'fitness', 'food', 'tech', 'travel', 'fashion', 'business'];
const CREATOR_TYPE_KEYS: CreatorType[] = ['all', 'blogger', 'model', 'ugc', 'videographer', 'photographer', 'editor', 'telegram_channel'];

function formatFollowers(n: number): string {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(0) + 'K';
  return String(n);
}

const ROLE_SEARCH_MAP: Record<string, string[]> = {
  videographer: ['видеограф', 'videographer', 'оператор', 'operator', 'видеосъемка', 'видеосъёмка', 'video'],
  ugc: ['ugc', 'юджиси', 'юзер контент', 'creator'],
  editor: ['монтаж', 'монтажер', 'монтажёр', 'editor', 'editing', 'video editor'],
  photographer: ['фотограф', 'photographer', 'фото', 'photo', 'photography'],
  model: ['модель', 'model'],
  blogger: ['блогер', 'блоггер', 'blogger', 'influencer', 'инфлюенсер'],
  mobilographer: ['мобилограф', 'mobilographer'],
  telegram_channel: ['телеграм', 'telegram', 'канал', 'channel'],
};

const CARD_GRADIENTS = [
  'linear-gradient(130deg, #FCA042 0%, #9A5F0F 100%)',
  'linear-gradient(137deg, #FFE08A 0%, #E9A020 100%)',
  'linear-gradient(126deg, #A0D8F1 0%, #3B92C6 100%)',
  'linear-gradient(130deg, #F9C06A 0%, #D97706 100%)',
];

function dbProfileToCreator(p: Record<string, unknown>): Creator {
  const pkgs: Package[] = Array.isArray(p.packages) && (p.packages as unknown[]).length > 0
    ? (p.packages as Package[])
    : [{ id: 'default', name: '__noPackage__', description: '__noPackageDesc__', price: 0, deliveryDays: 3, includes: [] }];
  return {
    id: p.id as string,
    name: (p.display_name as string) || (p.full_name as string) || 'Creator',
    handle: (p.instagram_handle as string) || (p.username ? `@${p.username}` : ''),
    username: (p.username as string) || '',
    type: (p.creator_type as CreatorType) || 'blogger',
    platform: (p.primary_platform as Platform) || 'instagram',
    category: (p.category as Category) || 'lifestyle',
    avatar: (p.avatar_url as string) || 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=150',
    coverPhoto: (p.cover_url as string) || '',
    followers: (p.followers_count as number) || 0,
    engagement: (p.engagement_rate as number) || 0,
    avgViews: (p.avg_views as number) || 0,
    location: (p.location as string) || 'Dubai',
    rating: (p.rating as number) || 4.5,
    reviewCount: (p.review_count as number) || 0,
    languages: Array.isArray(p.languages) ? (p.languages as string[]) : [],
    packages: pkgs,
    bio: (p.bio as string) || '',
    tags: Array.isArray(p.tags) ? (p.tags as string[]) : [],
    additionalRoles: Array.isArray(p.additional_roles) ? (p.additional_roles as string[]) : [],
    verified: (p.is_verified as boolean) || false,
    featured: (p.is_featured as boolean) || false,
    promoted: (p.is_promoted as boolean) === true && p.promoted_until != null && new Date(p.promoted_until as string) > new Date(),
  };
}

/* ─── Creator Card ─── */
function CreatorCard({ creator, index = 0 }: { creator: Creator; index?: number }) {
  const { t } = useTranslation();
  const { formatPrice: fmtPrice } = useRegion();
  const minPrice = Math.min(...creator.packages.map(p => p.clientPrice ?? Math.round(p.price * 1.2)));
  const gradient = CARD_GRADIENTS[index % CARD_GRADIENTS.length];
  const profileUrl = creator.username ? `/${creator.username}` : '#';

  return (
    <a
      href={profileUrl}
      className="group cursor-pointer overflow-hidden transition-all duration-300 hover:-translate-y-2 flex flex-col no-underline"
      style={{ background: '#F4F4F4', borderRadius: 24, width: '100%', maxWidth: 320, boxShadow: '0 4px 20px rgba(0,0,0,0.08)', textDecoration: 'none' }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 16px 48px rgba(0,0,0,0.15)'; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.08)'; }}
    >
      {/* Gradient Banner */}
      <div className="relative mx-2 mt-2 rounded-[20px] overflow-hidden" style={{ height: 140, background: gradient }}>
        <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full"
          style={{ background: 'rgba(0,0,0,0.2)', backdropFilter: 'blur(8px)' }}>
          <Star size={12} fill="#FFC360" style={{ color: '#FFC360' }} />
          <span className="text-sm font-semibold text-white leading-none">{creator.rating.toFixed(2)}</span>
        </div>
        <div className="absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-medium"
          style={{ background: 'rgba(255,255,255,0.2)', color: '#fff', backdropFilter: 'blur(8px)' }}>
          {t(`marketplace.creatorType.${creator.type}`)}
        </div>
        {creator.promoted && (
          <div className="absolute bottom-3 left-3 flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black tracking-wider uppercase"
            style={{ background: 'linear-gradient(90deg,#fbbf24,#f59e0b)', color: '#422006', boxShadow: '0 2px 8px rgba(251,191,36,0.5)' }}>
            ★ TOP
          </div>
        )}
      </div>

      {/* Avatar */}
      <div className="flex justify-center -mt-10 relative z-10 mb-3">
        <div className="w-[122px] h-[122px] rounded-full overflow-hidden"
          style={{ border: '4px solid #F4F4F4', boxShadow: '0 4px 16px rgba(0,0,0,0.12)' }}>
          <img src={creator.avatar} alt={creator.name} className="w-full h-full object-cover" />
        </div>
      </div>

      {/* Name + handle */}
      <div className="text-center px-4 mb-4">
        <div className="font-medium text-2xl leading-tight mb-1" style={{ color: '#171717', fontFamily: "'sofia-pro', sans-serif" }}>{creator.name}</div>
        <div className="text-base opacity-40" style={{ color: '#000' }}>{creator.handle}</div>
      </div>

      {/* Divider */}
      <div className="mx-5 mb-4" style={{ height: 1, background: 'rgba(255,255,255,1)' }} />

      {/* Price + Book */}
      <div className="flex items-end justify-between px-5 pb-5 mt-auto">
        <div>
          <div className="text-base opacity-40" style={{ color: '#000' }}>{t('marketplace.card.startingFrom', 'from')}</div>
          <div className="text-2xl font-medium" style={{ color: '#171717' }}>
            {minPrice > 0 ? fmtPrice(minPrice) : '—'}
          </div>
        </div>
        <span
          className="flex items-center gap-1.5 px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-200 hover:brightness-110 active:scale-95"
          style={{ background: '#FFC360', color: '#422006' }}
        >
          {t('marketplace.card.book', 'Book Now')} <ChevronRight size={14} />
        </span>
      </div>
    </a>
  );
}

/* ─── Client Orders Panel ─── */
function ClientOrdersPanel({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [orders, setOrders] = useState<Record<string, unknown>[]>([]);
  const [searched, setSearched] = useState(false);

  const findOrders = async () => {
    if (!email) return;
    const { data } = await supabase
      .from('marketplace_orders')
      .select('*')
      .eq('client_email', email)
      .order('created_at', { ascending: false });
    setOrders(data || []);
    setSearched(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)' }} />
      <div className="relative w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl overflow-hidden"
        style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)', maxHeight: '92dvh', overflowY: 'auto' }}
        onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full flex items-center justify-center"
          style={{ background: 'rgba(255,255,255,0.06)', color: '#94a3b8' }}>
          <X size={16} />
        </button>
        <div className="px-6 py-8">
          <h2 className="text-lg font-bold text-white mb-2">{t('marketplace.orders.title')}</h2>
          <p className="text-sm mb-5" style={{ color: '#64748b' }}>{t('marketplace.orders.emailHint')}</p>
          <div className="flex gap-2 mb-6">
            <input
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder={t('marketplace.orders.yourEmail')}
              className="flex-1 rounded-xl py-3 px-4 text-sm outline-none"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
              onKeyDown={e => e.key === 'Enter' && findOrders()}
            />
            <button onClick={findOrders} className="px-4 py-3 rounded-xl text-sm font-semibold" style={{ background: '#FFC360', color: '#422006' }}>
              {t('marketplace.orders.findOrders')}
            </button>
          </div>
          {searched && orders.length === 0 && (
            <p className="text-sm text-center py-8" style={{ color: '#475569' }}>{t('marketplace.orders.noOrders')}</p>
          )}
          {orders.map(o => (
            <div key={o.id as string} className="rounded-xl p-4 mb-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="flex justify-between items-start mb-2">
                <div className="text-sm font-semibold text-white">{(o.package_name as string) || 'Order'}</div>
                <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(255,195,96,0.12)', color: '#FFC360' }}>
                  {t(`marketplace.orders.status.${o.status as string}`, o.status as string)}
                </span>
              </div>
              <div className="text-xs" style={{ color: '#64748b' }}>{t('marketplace.orders.amount')}: {formatPrice((o.amount as number) ?? 0)}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   HOME PAGE
   ═══════════════════════════════════════════════════════════════ */
export default function Home({ isGuest, onLoginRequest }: HomeProps) {
  const { t } = useTranslation();
  const { profile, signOut } = useAuth();
  const { region, formatPrice, config: regionConfig } = useRegion();
  const [search, setSearch] = useState('');
  const [platform, setPlatform] = useState<Platform>('all');
  const [category, setCategory] = useState<Category>('all');
  const [creatorType, setCreatorType] = useState<CreatorType>('all');
  const [minBudget, setMinBudget] = useState('');
  const [maxBudget, setMaxBudget] = useState('');
  const [openDropdown, setOpenDropdown] = useState<'platform' | 'category' | 'creatorType' | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [dbCreators, setDbCreators] = useState<Creator[]>([]);
  const [creatorsLoaded, setCreatorsLoaded] = useState(false);
  const [showOrders, setShowOrders] = useState(false);
  const [joinLangOpen, setJoinLangOpen] = useState(false);

  const handleDashboardClick = () => {
    if (profile?.role === 'admin') { window.location.href = '/admin'; return; }
    if (profile?.role === 'manager') { window.location.href = '/manager-panel'; return; }
    window.location.href = '/creator-dashboard';
  };

  const handleSignOut = async () => {
    await signOut();
    window.location.replace('/');
  };

  // ── Carousel logic ──
  const carouselRef = useRef<HTMLDivElement>(null);
  const carouselPaused = useRef(false);
  const dragState = useRef({ isDown: false, startX: 0, scrollLeft: 0 });

  useEffect(() => {
    const el = carouselRef.current;
    if (!el) return;
    let animId: number;
    const tick = () => {
      if (!carouselPaused.current && !dragState.current.isDown && el.scrollWidth > el.clientWidth) {
        el.scrollLeft += 0.6;
        if (el.scrollLeft >= el.scrollWidth - el.clientWidth) {
          el.scrollLeft = 0;
        }
      }
      animId = requestAnimationFrame(tick);
    };
    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, []);

  const handleCarouselMouseDown = (e: React.MouseEvent) => {
    const el = carouselRef.current!;
    dragState.current = { isDown: true, startX: e.pageX - el.offsetLeft, scrollLeft: el.scrollLeft };
    el.style.cursor = 'grabbing';
  };
  const handleCarouselMouseUp = () => {
    dragState.current.isDown = false;
    if (carouselRef.current) carouselRef.current.style.cursor = 'grab';
  };
  const handleCarouselMouseMove = (e: React.MouseEvent) => {
    if (!dragState.current.isDown) return;
    e.preventDefault();
    const el = carouselRef.current!;
    const x = e.pageX - el.offsetLeft;
    const walk = (x - dragState.current.startX) * 1.5;
    el.scrollLeft = dragState.current.scrollLeft - walk;
  };

  const [heroData, setHeroData] = useState<{
    desktop_bg_url?: string;
    mobile_bg_url?: string;
    background_image?: string;
    heading_line1?: string;
    heading_accent?: string;
    heading_line2?: string;
    subtitle?: string;
    badge_text?: string;
    stats?: { value: string; label: string }[];
  } | null>(null);

  useEffect(() => {
    supabase.from('site_settings').select('value').eq('key', 'homepage_hero').maybeSingle()
      .then(({ data }) => { if (data?.value) setHeroData(data.value as typeof heroData); });
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('payment') !== 'success') return;
    const orderId = params.get('order');
    if (!orderId) return;
    (async () => {
      try {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
        const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
        await fetch(`${supabaseUrl}/functions/v1/verify-payment`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${anonKey}` },
          body: JSON.stringify({ order_id: orderId }),
        });
      } catch (e) { console.error('[payment verify]', e); }
      finally {
        const url = new URL(window.location.href);
        url.searchParams.delete('payment');
        url.searchParams.delete('order');
        window.history.replaceState({}, '', url.toString());
      }
    })();
  }, []);

  useEffect(() => {
    supabase
      .from('creator_profiles').select('*').eq('is_published', true).eq('is_hidden', false).neq('status', 'banned').neq('status', 'hidden').eq('region', region)
      .order('is_promoted', { ascending: false }).order('is_featured', { ascending: false }).order('created_at', { ascending: false })
      .then(({ data }) => {
        setDbCreators((data ?? []).map(p => dbProfileToCreator(p as Record<string, unknown>)));
        setCreatorsLoaded(true);
      });
  }, [region]);

  const filtered = useMemo(() => {
    const list = dbCreators.filter(c => {
      if (platform !== 'all' && c.platform !== platform) return false;
      if (category !== 'all' && c.category !== category) return false;
      if (creatorType !== 'all' && c.type !== creatorType) return false;
      if (minBudget || maxBudget) {
        const creatorMin = Math.min(...c.packages.map(p => (p as Package & { clientPrice?: number }).clientPrice ?? Math.round(p.price * 1.2)));
        const min = parseInt(minBudget) || 0;
        const max = parseInt(maxBudget) || Infinity;
        if (creatorMin < min || creatorMin > max) return false;
      }
      if (search) {
        const q = search.toLowerCase().trim();
        const allRoles = [c.type, ...(c.additionalRoles || [])];
        const roleKeywords = allRoles.flatMap(r => ROLE_SEARCH_MAP[r] || [r]);
        const haystack = [
          c.name, c.handle, c.location, c.category, c.type,
          ...(c.additionalRoles || []),
          ...(c.tags || []),
          ...roleKeywords,
        ].join(' ').toLowerCase();
        return haystack.includes(q);
      }
      return true;
    });
    // Pin promoted creators at the top (KZ region already handled by DB order, but enforce client-side too)
    list.sort((a, b) => (b.promoted ? 1 : 0) - (a.promoted ? 1 : 0));
    return list;
  }, [search, platform, category, creatorType, minBudget, maxBudget, dbCreators]);

  const featured = filtered.filter(c => c.featured);
  const isEmpty = creatorsLoaded && dbCreators.length === 0;

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setOpenDropdown(null);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div style={{ background: '#171717', minHeight: '100dvh', paddingBottom: 80 }}>

      {/* ══════ HERO SECTION ══════ */}
      <div className="relative w-full overflow-x-clip" style={{ background: '#171717' }}>

        {/* Glow blobs (decorative, absolute is fine here) */}
        <div className="absolute pointer-events-none" style={{ width: 745, height: 770, borderRadius: '50%', top: '-632px', left: '12%', background: '#E17D00', filter: 'blur(250px)', opacity: 0.7 }} />
        <div className="absolute pointer-events-none" style={{ width: 511, height: 256, borderRadius: '50%', top: '-242px', left: '21%', background: '#ffffff', filter: 'blur(48px)', opacity: 0.08 }} />
        <div className="absolute pointer-events-none" style={{ width: 240, height: 128, borderRadius: '50%', top: '-111px', left: '30%', background: '#ffffff', filter: 'blur(16px)', opacity: 0.04 }} />

        {/* CMS Background */}
        {(() => {
          const desktopUrl = heroData?.desktop_bg_url || heroData?.background_image;
          const mobileUrl = heroData?.mobile_bg_url || desktopUrl;
          if (!desktopUrl && !mobileUrl) return null;
          return (
            <>
              <img src={desktopUrl!} alt="" className="absolute inset-0 w-full h-full object-cover opacity-[0.06] hidden md:block pointer-events-none" />
              <img src={mobileUrl!} alt="" className="absolute inset-0 w-full h-full object-cover opacity-[0.06] block md:hidden pointer-events-none" />
            </>
          );
        })()}

        {/* ── Top Nav ── */}
        <div className="relative z-20 max-w-[1344px] mx-auto px-6 sm:px-8 lg:px-12 h-16 flex items-center justify-between">
          <a href="/" className="flex-shrink-0">
            <span className="text-2xl font-semibold" style={{ color: '#FFC360', fontFamily: "'sofia-pro', 'Sofia Pro', sans-serif" }}>Yalla</span>
          </a>
          <div className="flex items-center gap-2">
            <LanguageSwitcher variant="dark" />
            {isGuest ? (
              <>
                <a href="/brand/signup"
                  className="flex items-center gap-1.5 px-3 sm:px-5 py-2.5 rounded-full text-sm font-normal transition-all"
                  style={{ background: 'rgba(255,255,255,0.08)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.14)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}>
                  <Briefcase size={14} />
                  <span className="hidden sm:inline">{t('nav.forBrands', 'For Brands')}</span>
                  <span className="sm:hidden">{t('nav.brands', 'Brands')}</span>
                </a>
                <button onClick={() => setJoinLangOpen(true)}
                  className="flex items-center gap-1.5 px-3 sm:px-5 py-2.5 rounded-full text-sm font-medium transition-all"
                  style={{ background: '#FFC360', color: '#422006', cursor: 'pointer' }}>
                  <UserPlus size={14} />
                  <span className="hidden sm:inline">{t('nav.forCreators', 'For Creators')}</span>
                  <span className="sm:hidden">{t('nav.creators', 'Creators')}</span>
                </button>
              </>
            ) : (
              <>
                <button onClick={handleDashboardClick}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all"
                  style={{ background: 'rgba(255,195,96,0.9)', color: '#422006', cursor: 'pointer' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,195,96,1)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,195,96,0.9)'; }}>
                  <LayoutDashboard size={14} />
                  {t('nav.dashboard', 'Dashboard')}
                </button>
                <button onClick={handleSignOut}
                  className="flex items-center gap-1.5 px-3 py-2.5 rounded-full text-sm transition-all"
                  style={{ background: 'rgba(255,255,255,0.08)', color: '#94a3b8', cursor: 'pointer' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.14)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}>
                  <LogOut size={13} />
                </button>
              </>
            )}
          </div>
        </div>

        {/* ── Two-column hero content ── */}
        <div className="relative z-10 w-full px-4 sm:px-8 md:px-12 pt-12 pb-24 md:pt-16 md:pb-32">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-center w-full md:min-h-[600px]">

            {/* Левая колонка (Текст и поиск) */}
            <div className="flex flex-col items-center md:items-start text-center md:text-left space-y-6 z-10">
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold leading-tight"
                style={{
                  color: '#FFFFFF',
                  fontFamily: "'sofia-pro', 'Sofia Pro', sans-serif",
                  maxWidth: 595,
                }}>
                {i18n.language === 'en' && heroData?.heading_line1 ? heroData.heading_line1 : t(region === 'KZ' ? 'marketplace.heroLine1_kz' : 'marketplace.heroLine1')}{' '}
                <span style={{ background: 'linear-gradient(135deg, #FFC360 0%, #E17D00 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  {i18n.language === 'en' && heroData?.heading_accent ? heroData.heading_accent : t(region === 'KZ' ? 'marketplace.heroAccent_kz' : 'marketplace.heroAccent')}
                </span>
                {' '}{i18n.language === 'en' && heroData?.heading_line2 ? heroData.heading_line2 : t(region === 'KZ' ? 'marketplace.heroLine2_kz' : 'marketplace.heroLine2')}
              </h1>

              <p className="text-lg text-white/70 max-w-lg mt-6">
                {i18n.language === 'en' && heroData?.subtitle ? heroData.subtitle : t(region === 'KZ' ? 'marketplace.heroSubtitle_kz' : 'marketplace.heroSubtitle')}
              </p>

              {/* Search bar */}
              <div className="flex items-center gap-0 w-full max-w-lg lg:max-w-2xl">
                <div className="relative flex-1 h-[48px] sm:h-[56px]">
                  <Search size={20} className="absolute left-4 sm:left-5 top-1/2 -translate-y-1/2 pointer-events-none text-white opacity-60" />
                  <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder={t('marketplace.searchPlaceholder')}
                    className="w-full h-full rounded-l-full pr-4 text-base sm:text-lg font-light placeholder-white/60 outline-none transition-all"
                    style={{ paddingLeft: '2.75rem', background: 'rgba(217,217,217,0.1)', border: 'none', color: '#fff' }}
                    onFocus={e => { e.currentTarget.style.background = 'rgba(217,217,217,0.15)'; }}
                    onBlur={e => { e.currentTarget.style.background = 'rgba(217,217,217,0.1)'; }}
                  />
                </div>
                <button
                  className="flex-shrink-0 h-[48px] sm:h-[56px] flex items-center gap-2 px-4 sm:px-6 rounded-r-full text-sm font-medium transition-all hover:brightness-110 active:scale-95"
                  style={{ background: '#FFC360', color: '#422006' }}>
                  {t('marketplace.card.book', 'Search now')}
                </button>
              </div>
            </div>

            {/* Правая колонка (Карточки) */}
            <div className="hidden md:block relative w-full min-h-[450px]">
              {/* Карточка 1: Creators */}
              <div className="absolute top-0 left-0 z-10 w-[260px] scale-95 origin-top-left h-80 bg-black/40 backdrop-blur-md rounded-[32px] border border-white/10 p-4 flex flex-col justify-between shadow-2xl overflow-hidden group">
                <div className="relative z-10">
                  <h3 className="text-white text-xl font-medium">Creators</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="w-2 h-2 bg-green-400 rounded-full shadow-[0_0_8px_#4ade80]"></span>
                    <span className="text-white/80 text-sm">489 online</span>
                  </div>
                </div>
                <img src="https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=640" className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-500" alt="Creator" />
                <button onClick={() => setJoinLangOpen(true)} className="relative z-10 bg-white/20 hover:bg-white/30 backdrop-blur-md text-white text-sm py-2 px-6 rounded-full w-max mx-auto mb-2 transition-colors">Join Now</button>
              </div>

              {/* Карточка 2: Clients */}
              <div className="absolute bottom-0 right-0 z-20 w-[260px] shadow-2xl h-80 bg-black/40 backdrop-blur-md rounded-[32px] border border-white/10 p-4 flex flex-col justify-between overflow-hidden group">
                <div className="relative z-10">
                  <h3 className="text-white text-xl font-medium">Clients</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="w-2 h-2 bg-green-400 rounded-full shadow-[0_0_8px_#4ade80]"></span>
                    <span className="text-white/80 text-sm">9 503 online</span>
                  </div>
                </div>
                <img src="/source_bg_removal_[Background_removed].png" className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-500" alt="Client" />
                <button onClick={() => setShowOrders(true)} className="relative z-10 bg-white/20 hover:bg-white/30 backdrop-blur-md text-white text-sm py-2 px-6 rounded-full w-max mx-auto mb-2 transition-colors">Join Now</button>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* ══════ WHITE CONTENT SECTION ══════ */}
      <div className="max-w-[1344px] mx-auto px-2 sm:px-6 lg:px-8 -mt-4">
        <div className="bg-white rounded-[28px] sm:rounded-[40px] overflow-hidden px-4 sm:px-10 py-8 sm:py-10">

          {/* Filter bar */}
          <div ref={dropdownRef} className="flex flex-wrap items-center justify-between gap-4 mb-8">
            <h2 className="text-xl font-medium" style={{ color: '#171717', fontFamily: "'sofia-pro', sans-serif" }}>
              {t('marketplace.results.allCreators', 'All Creators')}
            </h2>

            <div className="flex flex-wrap items-center gap-2">
              {/* Platform dropdown */}
              <div className="relative">
                <button
                  onClick={() => setOpenDropdown(openDropdown === 'platform' ? null : 'platform')}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-full text-sm transition-all"
                  style={{ background: 'transparent', border: '1px solid rgba(0,0,0,0.1)', color: '#171717' }}>
                  <span>{t(`marketplace.platform.${platform}`)}</span>
                  <ChevronDown size={14} style={{ transform: openDropdown === 'platform' ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                </button>
                {openDropdown === 'platform' && (
                  <div className="absolute top-full left-0 mt-2 min-w-[180px] rounded-2xl overflow-hidden z-50 shadow-xl"
                    style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)' }}>
                    {PLATFORM_KEYS.map(val => (
                      <button key={val}
                        onClick={() => { setPlatform(val); setOpenDropdown(null); }}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-left transition-all hover:bg-gray-50"
                        style={{ color: platform === val ? '#E17D00' : '#171717' }}>
                        {PLATFORM_ICON[val]}
                        {t(`marketplace.platform.${val}`)}
                        {platform === val && <Check size={13} className="ml-auto" style={{ color: '#E17D00' }} />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Category dropdown */}
              <div className="relative">
                <button
                  onClick={() => setOpenDropdown(openDropdown === 'category' ? null : 'category')}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-full text-sm transition-all"
                  style={{ background: 'transparent', border: '1px solid rgba(0,0,0,0.1)', color: '#171717' }}>
                  <span>{t(`marketplace.category.${category}`, 'Niches')}</span>
                  <ChevronDown size={14} style={{ transform: openDropdown === 'category' ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                </button>
                {openDropdown === 'category' && (
                  <div className="absolute top-full left-0 mt-2 min-w-[180px] rounded-2xl overflow-hidden z-50 shadow-xl"
                    style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)' }}>
                    {CATEGORY_KEYS.map(val => (
                      <button key={val}
                        onClick={() => { setCategory(val); setOpenDropdown(null); }}
                        className="w-full flex items-center px-4 py-2.5 text-sm text-left transition-all hover:bg-gray-50"
                        style={{ color: category === val ? '#E17D00' : '#171717' }}>
                        {t(`marketplace.category.${val}`)}
                        {category === val && <Check size={13} className="ml-auto" style={{ color: '#E17D00' }} />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Creator type dropdown */}
              <div className="relative">
                <button
                  onClick={() => setOpenDropdown(openDropdown === 'creatorType' ? null : 'creatorType')}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-full text-sm transition-all"
                  style={{ background: 'transparent', border: '1px solid rgba(0,0,0,0.1)', color: '#171717' }}>
                  <span>{t(`marketplace.creatorType.${creatorType}`, 'Type')}</span>
                  <ChevronDown size={14} style={{ transform: openDropdown === 'creatorType' ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                </button>
                {openDropdown === 'creatorType' && (
                  <div className="absolute top-full left-0 mt-2 min-w-[180px] rounded-2xl overflow-hidden z-50 shadow-xl"
                    style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)' }}>
                    {CREATOR_TYPE_KEYS.map(val => (
                      <button key={val}
                        onClick={() => { setCreatorType(val); setOpenDropdown(null); }}
                        className="w-full flex items-center px-4 py-2.5 text-sm text-left transition-all hover:bg-gray-50"
                        style={{ color: creatorType === val ? '#E17D00' : '#171717' }}>
                        {t(`marketplace.creatorType.${val}`)}
                        {creatorType === val && <Check size={13} className="ml-auto" style={{ color: '#E17D00' }} />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Budget filter */}
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full" style={{ border: '1px solid rgba(0,0,0,0.1)' }}>
                <span className="text-xs font-medium whitespace-nowrap" style={{ color: '#64748b' }}>{t('marketplace.budget')}:</span>
                <input
                  type="number"
                  min={0}
                  value={minBudget}
                  onChange={e => setMinBudget(e.target.value)}
                  placeholder={t('marketplace.budgetMin')}
                  className="w-16 text-xs text-center bg-transparent outline-none"
                  style={{ color: '#171717' }}
                />
                <span className="text-xs" style={{ color: '#94a3b8' }}>–</span>
                <input
                  type="number"
                  min={0}
                  value={maxBudget}
                  onChange={e => setMaxBudget(e.target.value)}
                  placeholder={t('marketplace.budgetMax')}
                  className="w-16 text-xs text-center bg-transparent outline-none"
                  style={{ color: '#171717' }}
                />
                <span className="text-[10px] font-semibold" style={{ color: '#94a3b8' }}>{regionConfig.currency}</span>
              </div>

              {/* Reset */}
              {(platform !== 'all' || category !== 'all' || creatorType !== 'all' || minBudget || maxBudget) && (
                <button
                  onClick={() => { setPlatform('all'); setCategory('all'); setCreatorType('all'); setMinBudget(''); setMaxBudget(''); }}
                  className="flex items-center gap-1 px-3 py-2.5 rounded-full text-xs font-medium transition-all hover:bg-gray-100"
                  style={{ color: '#64748b' }}>
                  <X size={12} /> Reset
                </button>
              )}

              <span className="text-sm px-4 py-2.5 rounded-full" style={{ background: 'rgba(0,0,0,0.05)', color: '#666' }}>
                {t('marketplace.results.creatorCount_other', { count: filtered.length })}
              </span>
            </div>
          </div>

          {/* ── Featured ── */}
          {featured.length > 0 && !search && platform === 'all' && category === 'all' && creatorType === 'all' && (
            <div className="mb-10">
              <div className="flex items-center gap-3 mb-5">
                <Star size={16} fill="#fbbf24" style={{ color: '#fbbf24' }} />
                <span className="text-base font-medium" style={{ color: '#171717' }}>{t('marketplace.featured.title')}</span>
              </div>
              <div className="flex overflow-x-auto gap-4 sm:gap-6 px-4 lg:px-0 snap-x snap-mandatory [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                {featured.map((c, i) => (
                  <div key={c.id} className="min-w-[280px] sm:min-w-[320px] shrink-0 snap-center">
                    <CreatorCard creator={c} index={i} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── All Results ── */}
          {isEmpty ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-4"
                style={{ background: 'rgba(255,195,96,0.1)', border: '1px solid rgba(255,195,96,0.2)' }}>
                <Star size={36} style={{ color: '#FFC360' }} />
              </div>
              <h3 className="text-xl font-bold mb-2" style={{ color: '#171717' }}>Coming Soon</h3>
              <p className="text-sm max-w-xs" style={{ color: '#64748b', lineHeight: 1.7 }}>
                New creators are joining right now. Be the first to discover top UAE influencers.
              </p>
              <button onClick={() => setJoinLangOpen(true)}
                className="mt-6 flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold transition-all hover:brightness-110"
                style={{ background: '#FFC360', color: '#422006' }}>
                <UserPlus size={15} /> {t('marketplace.cta.button', 'Join as a Creator')}
              </button>
            </div>
          ) : !creatorsLoaded ? (
            <div className="flex gap-4 sm:gap-6 px-4 lg:px-0 overflow-hidden">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="rounded-3xl h-[470px] min-w-[280px] sm:min-w-[320px] shrink-0 animate-pulse" style={{ background: '#f0f0f0' }} />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16" style={{ color: '#475569' }}>
              <Search size={32} className="mx-auto mb-3 opacity-30" />
              <div className="font-semibold mb-1">{t('marketplace.results.noCreators')}</div>
              <div className="text-sm">{t('marketplace.results.noCreatorsHint')}</div>
            </div>
          ) : (
            <div
              ref={carouselRef}
              className="flex overflow-x-auto gap-4 sm:gap-6 px-4 lg:px-0 snap-x snap-mandatory cursor-grab select-none [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
              onMouseEnter={() => { carouselPaused.current = true; }}
              onMouseLeave={() => { carouselPaused.current = false; handleCarouselMouseUp(); }}
              onMouseDown={handleCarouselMouseDown}
              onMouseUp={handleCarouselMouseUp}
              onMouseMove={handleCarouselMouseMove}
            >
              {filtered.map((c, i) => (
                <div key={c.id} className="min-w-[280px] sm:min-w-[320px] shrink-0 snap-center">
                  <CreatorCard creator={c} index={i} />
                </div>
              ))}
            </div>
          )}

        </div>
      </div>

      {/* ── Modals ── */}
      {showOrders && <ClientOrdersPanel onClose={() => setShowOrders(false)} />}
      {joinLangOpen && <JoinLanguageSelector onClose={() => setJoinLangOpen(false)} />}

    </div>
  );
}
