import { useState, useEffect, useRef } from 'react';
import { LogOut, Camera, CalendarDays, Wallet, Check, MessageSquare, X, DollarSign, TrendingUp, Zap, MessageCircle, ChevronRight, Search, ArrowLeft, Phone, Mail, Aperture, Home, User, Upload, Image, CreditCard as Edit3, Package, CreditCard, Link2, Sun, Moon, Sunset, Copy, Rocket } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useCreatorAuth } from '../context/CreatorAuthContext';
import DealMessenger from '../components/DealMessenger';
import ShootsCalendar from '../components/ShootsCalendar';
import YallaGearModule from '../components/YallaGearModule';

// Admin: set this to the URL of the Instagram Bio guide screenshot, or null for placeholder
const LINK_IN_BIO_GUIDE_IMAGE: string | null = null;

interface CreatorBooking {
  id: string;
  creator_id: string;
  client_name: string;
  client_email: string;
  client_phone: string;
  booking_date: string;
  booking_time: string;
  details: string;
  status: string;
  created_at: string;
  start_time?: string | null;
  end_time?: string | null;
}

interface ProductionDealChat {
  id: string;
  order_id: string;
  client_id: string;
  freelancer_id: string;
  status: string;
  created_at: string;
  client_name?: string;
  order_package_name?: string;
  order_status?: string;
}

interface KzPkg { id: string; name: string; price: number; deliveryDays: number; description: string }
interface PortfolioItem { url: string; type?: 'image' | 'video'; videoId?: string; title?: string; clientName?: string; description?: string }

type Tab = 'home' | 'shoots' | 'messages' | 'wallet' | 'profile';

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  pending:    { label: 'Ожидание',   color: '#fbbf24' },
  confirmed:  { label: 'Подтверждено', color: '#60a5fa' },
  in_progress:{ label: 'В процессе', color: '#f97316' },
  completed:  { label: 'Выполнено',  color: '#00C48C' },
  cancelled:  { label: 'Отменено',   color: '#94a3b8' },
};

function fmt(n: number) {
  return n.toLocaleString('ru-RU', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function greeting() {
  const h = new Date().getHours();
  if (h < 6)  return { text: 'Доброй ночи', Icon: Moon };
  if (h < 12) return { text: 'Доброе утро', Icon: Sun };
  if (h < 18) return { text: 'Добрый день', Icon: Sun };
  if (h < 22) return { text: 'Добрый вечер', Icon: Sunset };
  return       { text: 'Доброй ночи', Icon: Moon };
}

// Profile sub-sections
type ProfileSection = null | 'editProfile' | 'packages' | 'portfolio' | 'bank' | 'biohint' | 'whatsapp';

const BOOST_PKGS = [
  { days: 3,  price: 4900,  label: '3 дня',   highlight: false },
  { days: 7,  price: 9900,  label: '7 дней',  highlight: true  },
  { days: 30, price: 29900, label: '30 дней', highlight: false },
];

export default function ProductionDashboard() {
  const { session, user, creatorProfile, signOut } = useCreatorAuth();
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('home');
  const [profileSection, setProfileSection] = useState<ProfileSection>(null);

  // Bookings
  const [bookings, setBookings] = useState<CreatorBooking[]>([]);
  const [calendarOrders, setCalendarOrders] = useState<{ id: string; buyer_name: string; package_name: string; package_price: number; status: string; created_at: string }[]>([]);

  // Messages (deal chats)
  const [dealChats, setDealChats] = useState<ProductionDealChat[]>([]);
  const [activeDealChatId, setActiveDealChatId] = useState<string | null>(null);
  const [chatSearch, setChatSearch] = useState('');

  // Wallet
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState('');
  const [payoutMethod, setPayoutMethod] = useState<'bank' | 'crypto' | 'cash'>('bank');
  const [payoutDetails, setPayoutDetails] = useState('');
  const [payoutSubmitting, setPayoutSubmitting] = useState(false);
  const [payoutRequests, setPayoutRequests] = useState<
    { id: string; amount: number; payment_method: string; status: string; created_at: string }[]
  >([]);

  // KZ: bank details
  const [bankName, setBankName] = useState('');
  const [bankAccountName, setBankAccountName] = useState('');
  const [bankIban, setBankIban] = useState('');
  const [savingBank, setSavingBank] = useState(false);
  const [bankSaved, setBankSaved] = useState(false);

  // KZ: WhatsApp number
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [savingWhatsapp, setSavingWhatsapp] = useState(false);
  const [whatsappSaved, setWhatsappSaved] = useState(false);

  // KZ: Edit profile form
  const [editDisplayName, setEditDisplayName] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [savingEditProfile, setSavingEditProfile] = useState(false);
  const [editProfileSaved, setEditProfileSaved] = useState(false);

  // KZ: withdrawal
  const [kzWithdrawAmount, setKzWithdrawAmount] = useState('');
  const [kzWithdrawMethod, setKzWithdrawMethod] = useState<'kaspi' | 'bank_transfer'>('kaspi');
  const [kzWithdrawSubmitting, setKzWithdrawSubmitting] = useState(false);
  const [kzWithdrawals, setKzWithdrawals] = useState<
    { id: string; amount: number; currency: string; status: string; created_at: string }[]
  >([]);

  // KZ: Link in Bio copy
  const [linkCopied, setLinkCopied] = useState(false);

  // Wallet from creator_wallets table
  const [walletData, setWalletData] = useState<{ balance_available: number; balance_on_hold: number } | null>(null);

  // KZ: Portfolio
  const [portfolioItems, setPortfolioItems] = useState<PortfolioItem[]>([]);
  const [portfolioUploading, setPortfolioUploading] = useState(false);
  const [portfolioUploadPct, setPortfolioUploadPct] = useState(0);
  const [editingPortfolioIdx, setEditingPortfolioIdx] = useState<number | null>(null);

  // KZ: Packages
  const [editPackages, setEditPackages] = useState<KzPkg[]>([]);
  const [packagesSaving, setPackagesSaving] = useState(false);
  const [packagesSavedMsg, setPackagesSavedMsg] = useState(false);

  // Messages in home promo
  const [showMessages, setShowMessages] = useState(false);

  // KZ: Profile Boost
  const [showBoostModal, setShowBoostModal] = useState(false);
  const [boostDays, setBoostDays] = useState<number>(7);
  const [boostLoading, setBoostLoading] = useState(false);
  // KZ: Yalla Gear
  const [showGear, setShowGear] = useState(false);

  const screenshotInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [linkBioScreenshot, setLinkBioScreenshot] = useState<string | null>(null);
  const [uploadingScreenshot, setUploadingScreenshot] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const isKZ = creatorProfile?.region === 'KZ';
  const currency = isKZ ? 'KZT' : 'AED';
  const minPayout = isKZ ? 5000 : 100;

  // ── Load data ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user || !creatorProfile) return;
    loadBookings();
    loadPayouts();
    loadWallet();
    setAvatarUrl(creatorProfile.avatar_url ?? null);
    const savedScreenshot = (creatorProfile as { bio_screenshot_url?: string }).bio_screenshot_url ?? null;
    if (savedScreenshot) setLinkBioScreenshot(savedScreenshot);
    if (isKZ) {
      setBankName((creatorProfile as { bank_name?: string }).bank_name ?? '');
      setBankAccountName((creatorProfile as { bank_account_name?: string }).bank_account_name ?? '');
      setBankIban((creatorProfile as { bank_iban?: string }).bank_iban ?? '');
      setWhatsappNumber((creatorProfile as { whatsapp_number?: string }).whatsapp_number ?? '');
      loadWithdrawals();
      // Load portfolio_items (rich), fall back to portfolio_urls (legacy string[])
      const rawItems = (creatorProfile as { portfolio_items?: unknown }).portfolio_items;
      if (Array.isArray(rawItems) && rawItems.length > 0) {
        setPortfolioItems(rawItems as PortfolioItem[]);
      } else {
        const legacyUrls = Array.isArray(creatorProfile.portfolio_urls) ? (creatorProfile.portfolio_urls as string[]) : [];
        setPortfolioItems(legacyUrls.map(url => ({ url })));
      }
      const pkgs = (creatorProfile.packages ?? []) as KzPkg[];
      setEditPackages(pkgs.length ? pkgs : [{ id: crypto.randomUUID(), name: '', price: 0, deliveryDays: 1, description: '' }]);
    }
  }, [user, creatorProfile]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: chatRows } = await supabase.from('deal_chats').select('*').eq('freelancer_id', user.id).order('created_at', { ascending: false });
      if (chatRows && chatRows.length > 0) {
        const clientIds = [...new Set(chatRows.map((c: ProductionDealChat) => c.client_id))];
        const orderIds = chatRows.map((c: ProductionDealChat) => c.order_id);
        const [{ data: cpRows }, { data: orderRows }] = await Promise.all([
          supabase.from('client_profiles').select('user_id, display_name').in('user_id', clientIds),
          supabase.from('marketplace_orders').select('id, package_name, status, buyer_name').in('id', orderIds),
        ]);
        const nameMap = new Map((cpRows ?? []).map((p: { user_id: string; display_name: string }) => [p.user_id, p.display_name]));
        const orderMap = new Map((orderRows ?? []).map((o: { id: string; package_name: string; status: string; buyer_name?: string }) => [o.id, o]));
        setDealChats(chatRows.map((c: ProductionDealChat) => {
          const order = orderMap.get(c.order_id);
          const clientName = nameMap.get(c.client_id) || order?.buyer_name || 'Клиент';
          return {
            ...c,
            client_name: clientName,
            order_package_name: order?.package_name ?? 'Заказ',
            order_status: order?.status ?? 'paid',
          };
        }));
      }
    })();
  }, [user]);

  async function loadBookings() {
    if (!creatorProfile) { setLoading(false); return; }
    const [{ data: bookingData }, { data: orderData }] = await Promise.all([
      supabase.from('creator_bookings').select('*').eq('creator_id', creatorProfile.id).order('booking_date', { ascending: false }),
      supabase.from('marketplace_orders').select('id, buyer_name, package_name, package_price, status, created_at').eq('creator_id', creatorProfile.id).in('status', ['paid', 'completed', 'in_progress']),
    ]);
    setBookings(bookingData ?? []);
    setCalendarOrders(orderData ?? []);
    setLoading(false);
  }

  async function loadPayouts() {
    if (!user) return;
    const { data } = await supabase.from('payout_requests').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
    if (data) setPayoutRequests(data);
  }

  async function loadWithdrawals() {
    if (!user) return;
    const { data } = await supabase.from('withdrawal_requests').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
    if (data) setKzWithdrawals(data);
  }

  async function loadWallet() {
    if (!creatorProfile) return;
    const cur = creatorProfile.region === 'KZ' ? 'KZT' : 'AED';
    const { data } = await supabase
      .from('creator_wallets')
      .select('balance_available, balance_on_hold')
      .eq('creator_id', creatorProfile.id)
      .eq('currency', cur)
      .maybeSingle();
    if (data) setWalletData(data);
  }

  async function saveBankDetails() {
    if (!user) return;
    setSavingBank(true);
    await supabase.from('creator_profiles').update({ bank_name: bankName, bank_account_name: bankAccountName, bank_iban: bankIban }).eq('user_id', user.id);
    setSavingBank(false);
    setBankSaved(true);
    setTimeout(() => setBankSaved(false), 3000);
  }

  async function saveWhatsappNumber() {
    if (!user) return;
    setSavingWhatsapp(true);
    await supabase.from('creator_profiles').update({ whatsapp_number: whatsappNumber }).eq('user_id', user.id);
    setSavingWhatsapp(false);
    setWhatsappSaved(true);
    setTimeout(() => setWhatsappSaved(false), 3000);
  }

  async function submitKzWithdrawal() {
    if (!creatorProfile) return;
    const amt = parseFloat(kzWithdrawAmount);
    if (isNaN(amt) || amt < minPayout || amt > balance) return;
    setKzWithdrawSubmitting(true);
    const { error } = await supabase.from('withdrawal_requests').insert({
      user_id: user!.id,
      amount: amt,
      currency: 'KZT',
      payment_method: kzWithdrawMethod,
      details: `${bankAccountName} / ${bankIban}`,
    });
    if (!error) {
      await supabase.from('creator_wallets')
        .update({ balance_available: balance - amt })
        .eq('creator_id', creatorProfile.id)
        .eq('currency', 'KZT');
      await loadWallet();
      await loadWithdrawals();
      setKzWithdrawAmount('');
    }
    setKzWithdrawSubmitting(false);
  }

  async function uploadPortfolioFiles(files: File[]) {
    if (!user) return;
    const room = 100 - portfolioItems.length;
    const batch = files.slice(0, Math.max(0, room));
    if (batch.length === 0) return;
    setPortfolioUploading(true);
    let current = [...portfolioItems];
    const failed: string[] = [];
    for (let idx = 0; idx < batch.length; idx++) {
      const file = batch[idx];
      setPortfolioUploadPct(Math.round((idx / batch.length) * 100));
      try {
        if (file.type.startsWith('video')) {
          const res = await fetch('https://cybxtdcomnmswqrworzc.supabase.co/functions/v1/bunny-upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title: file.name }),
          });
          if (!res.ok) throw new Error('bunny-upload failed');
          const { videoId, libraryId, apiKey } = await res.json() as { videoId: string; libraryId: number; apiKey: string };
          const putRes = await fetch(`https://video.bunnycdn.com/library/${libraryId}/videos/${videoId}`, {
            method: 'PUT', headers: { AccessKey: apiKey }, body: file,
          });
          if (!putRes.ok) throw new Error('Bunny upload failed');
          current = [...current, { url: `https://iframe.mediadelivery.net/embed/679977/${videoId}`, type: 'video' as const, videoId, title: file.name }];
        } else {
          const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
          const path = `${user.id}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
          const { error } = await supabase.storage.from('videographer-portfolio').upload(path, file, { upsert: false, contentType: file.type || undefined });
          if (error) throw error;
          const { data: urlData } = supabase.storage.from('videographer-portfolio').getPublicUrl(path);
          current = [...current, { url: urlData.publicUrl, type: 'image' as const, title: file.name }];
        }
        setPortfolioItems(current);
        await savePortfolioItems(current);
      } catch (e) {
        console.error('Portfolio upload error:', file.name, e);
        failed.push(file.name);
      }
    }
    setPortfolioUploadPct(100);
    setPortfolioUploading(false);
    if (failed.length) alert('Не удалось загрузить: ' + failed.join(', '));
  }

  async function savePortfolioItems(items: PortfolioItem[]) {
    if (!user) return;
    const urls = items.map(i => i.url);
    await supabase.from('creator_profiles').update({ portfolio_items: items, portfolio_urls: urls }).eq('user_id', user.id);
  }

  async function deletePortfolioVideo(idx: number) {
    if (!user) return;
    const item = portfolioItems[idx];
    if (item.url.includes('/videographer-portfolio/')) {
      const pathPart = item.url.split('/videographer-portfolio/')[1];
      if (pathPart) await supabase.storage.from('videographer-portfolio').remove([decodeURIComponent(pathPart)]);
    }
    const newItems = portfolioItems.filter((_, i) => i !== idx);
    setPortfolioItems(newItems);
    if (editingPortfolioIdx === idx) setEditingPortfolioIdx(null);
    await savePortfolioItems(newItems);
  }

  async function updatePortfolioItemMeta(idx: number, patch: Partial<PortfolioItem>) {
    if (!user) return;
    const newItems = portfolioItems.map((it, i) => i === idx ? { ...it, ...patch } : it);
    setPortfolioItems(newItems);
    await savePortfolioItems(newItems);
  }

  async function saveKzPackages() {
    if (!user) return;
    setPackagesSaving(true);
    const valid = editPackages.filter(p => p.name.trim() && p.price > 0);
    await supabase.from('creator_profiles').update({ packages: valid }).eq('user_id', user.id);
    setPackagesSaving(false);
    setPackagesSavedMsg(true);
    setTimeout(() => setPackagesSavedMsg(false), 3000);
  }

  async function updateBookingStatus(id: string, status: string) {
    await supabase.from('creator_bookings').update({ status }).eq('id', id);
    loadBookings();
  }

  async function submitPayoutRequest() {
    if (!user || !creatorProfile) return;
    const amt = parseFloat(payoutAmount);
    if (isNaN(amt) || amt < 100 || amt > balance) return;
    setPayoutSubmitting(true);
    const { error } = await supabase.from('payout_requests').insert({ user_id: user.id, amount: amt, payment_method: payoutMethod, details: payoutDetails });
    if (!error) {
      await supabase.from('creator_wallets')
        .update({ balance_available: balance - amt })
        .eq('creator_id', creatorProfile.id)
        .eq('currency', 'AED');
      await loadWallet();
      await loadPayouts();
      setShowPayoutModal(false);
      setPayoutAmount('');
      setPayoutDetails('');
    }
    setPayoutSubmitting(false);
  }

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploadingAvatar(true);
    const ext = file.name.split('.').pop() ?? 'jpg';
    const path = `${user.id}/avatar_${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
    if (!error) {
      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
      const newUrl = urlData.publicUrl;
      setAvatarUrl(newUrl);
      await supabase.from('creator_profiles').update({ avatar_url: newUrl }).eq('user_id', user.id);
    }
    setUploadingAvatar(false);
    // reset input so same file can be re-selected
    e.target.value = '';
  }

  async function startBoostCheckout() {
    if (!user || !creatorProfile) return;
    setBoostLoading(true);
    const { data: { session: authSession } } = await supabase.auth.getSession();
    const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/boost-checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authSession?.access_token}`,
        'Apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ user_id: user.id, days: boostDays, creator_name: creatorProfile.display_name }),
    });
    const json = await res.json();
    setBoostLoading(false);
    if (json.url) {
      window.location.href = json.url;
    }
  }

  async function handleScreenshotUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploadingScreenshot(true);
    const ext = file.name.split('.').pop() ?? 'jpg';
    const path = `${user.id}/link_bio_${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
    if (!error) {
      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
      const newUrl = urlData.publicUrl;
      setLinkBioScreenshot(newUrl);
      await supabase.from('creator_profiles').update({ bio_screenshot_url: newUrl }).eq('user_id', user.id);
    }
    setUploadingScreenshot(false);
    e.target.value = '';
  }

  // ── Guards ─────────────────────────────────────────────────────────────────
  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0B101B]">
        <div className="text-center">
          <p className="text-sm text-gray-400">Войдите, чтобы открыть дашборд</p>
          <a href="/creator-login" className="inline-block mt-4 px-5 py-2.5 rounded-xl text-sm font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Войти</a>
        </div>
      </div>
    );
  }
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0B101B]">
        <div className="w-8 h-8 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
      </div>
    );
  }
  if (!creatorProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0B101B]">
        <div className="text-center max-w-sm px-4">
          <h2 className="text-lg font-bold text-white mb-2">Профиль не найден</h2>
          <a href="/creator-onboarding" className="inline-block mt-4 px-5 py-2.5 rounded-xl text-xs font-medium bg-white/[0.04] text-gray-400 border border-white/10">Завершить регистрацию</a>
        </div>
      </div>
    );
  }

  // ── Derived values ────────────────────────────────────────────────────────
  const upcoming = bookings.filter(b => ['pending', 'confirmed', 'in_progress'].includes(b.status) && new Date(b.booking_date) >= new Date(new Date().toDateString()));
  const completed = bookings.filter(b => b.status === 'completed');
  const totalEarned = creatorProfile.balance_total_earned ?? 0;
  const balance = walletData?.balance_available ?? creatorProfile.balance_available ?? 0;
  const filteredChats = dealChats.filter(c => !chatSearch || (c.client_name ?? '').toLowerCase().includes(chatSearch.toLowerCase()));
  const profileUrl = creatorProfile.username ? `https://yallainfluencers.com/${creatorProfile.username}` : null;
  const { text: greetText, Icon: GreetIcon } = greeting();
  const firstName = (creatorProfile.display_name ?? '').split(' ')[0] || 'Видеограф';
  const cityLabel = (creatorProfile as { location?: string }).location ?? '';

  // ── Nav items ──────────────────────────────────────────────────────────────
  const navItems: { id: Tab; icon: React.ReactNode; label: string }[] = [
    { id: 'home',     icon: <Home size={22} />,          label: 'Главная'     },
    { id: 'shoots',   icon: <CalendarDays size={22} />,  label: 'Съёмки'      },
    { id: 'messages', icon: <MessageCircle size={22} />, label: 'Сообщения'   },
    { id: 'wallet',   icon: <Wallet size={22} />,        label: 'Кошелёк'     },
    { id: 'profile',  icon: <User size={22} />,          label: 'Профиль'     },
  ];

  // Promo banners — image posters (replace src with real afisha URLs later)
  const banners = [
    { src: 'https://images.pexels.com/photos/3379934/pexels-photo-3379934.jpeg?auto=compress&cs=tinysrgb&w=400&h=560&fit=crop', alt: 'Промо 1' },
    { src: 'https://images.pexels.com/photos/1264210/pexels-photo-1264210.jpeg?auto=compress&cs=tinysrgb&w=400&h=560&fit=crop', alt: 'Промо 2' },
    { src: 'https://images.pexels.com/photos/2510428/pexels-photo-2510428.jpeg?auto=compress&cs=tinysrgb&w=400&h=560&fit=crop', alt: 'Промо 3' },
    { src: 'https://images.pexels.com/photos/3379933/pexels-photo-3379933.jpeg?auto=compress&cs=tinysrgb&w=400&h=560&fit=crop', alt: 'Промо 4' },
  ];

  // ── Helper UI ──────────────────────────────────────────────────────────────
  function MenuRow({ icon, label, sub, onClick }: { icon: React.ReactNode; label: string; sub?: string; onClick: () => void }) {
    return (
      <button onClick={onClick} className="w-full flex items-center gap-4 px-4 py-4 hover:bg-white/[0.03] transition-colors active:scale-[0.99]">
        <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 bg-white/[0.05] border border-white/[0.08]">
          {icon}
        </div>
        <div className="flex-1 text-left">
          <div className="text-sm font-semibold text-white">{label}</div>
          {sub && <div className="text-xs text-gray-500 mt-0.5">{sub}</div>}
        </div>
        <ChevronRight size={16} className="text-gray-600 flex-shrink-0" />
      </button>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen bg-[#080D14] text-white overflow-x-hidden">

      {/* ── Scrollable content area (with bottom nav padding) ── */}
      <div className="pb-24 min-h-screen">

        {/* ══ HOME TAB ══════════════════════════════════════════════════════ */}
        {tab === 'home' && !showMessages && (
          <div className="animate-[fadeInUp_0.4s_ease-out]">

            {/* Greeting header */}
            <div className="px-5 pt-12 pb-4">
              <div className="flex items-center gap-2 mb-0.5">
                <GreetIcon size={16} className="text-amber-400" />
                <span className="text-xs text-gray-400">{greetText}</span>
              </div>
              <h1 className="text-2xl font-bold text-white">{firstName} 👋</h1>
              {cityLabel && (
                <div className="flex items-center gap-1.5 mt-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span className="text-xs text-gray-500">{cityLabel}</span>
                </div>
              )}
            </div>

            {/* KZ Link in Bio banner (pinned top) */}
            {isKZ && profileUrl && (
              <div className="mx-5 mb-4 rounded-2xl overflow-hidden border border-amber-500/20" style={{ background: 'linear-gradient(135deg,rgba(251,191,36,0.07) 0%,rgba(245,101,0,0.04) 100%)' }}>
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Link2 size={13} className="text-amber-400" />
                    <span className="text-xs font-bold text-white">Ваша ссылка для Instagram Bio</span>
                  </div>
                  <p className="text-[10px] text-gray-500 mb-3">Вставьте в Bio вашего Instagram — клиенты забронируют съёмку напрямую.</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 px-3 py-2 rounded-xl text-[10px] font-mono text-amber-300 truncate" style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(251,191,36,0.12)' }}>
                      {profileUrl}
                    </div>
                    <button
                      onClick={() => { navigator.clipboard.writeText(profileUrl); setLinkCopied(true); setTimeout(() => setLinkCopied(false), 2000); }}
                      className="flex items-center gap-1 px-3 py-2 rounded-xl text-[10px] font-bold flex-shrink-0 transition-all"
                      style={{ background: linkCopied ? 'rgba(0,196,140,0.12)' : 'rgba(251,191,36,0.1)', color: linkCopied ? '#00C48C' : '#fbbf24', border: `1px solid ${linkCopied ? 'rgba(0,196,140,0.3)' : 'rgba(251,191,36,0.2)'}` }}
                    >
                      {linkCopied ? <Check size={11} /> : <Copy size={11} />}
                      {linkCopied ? 'Скопировано' : 'Копировать'}
                    </button>
                  </div>
                </div>
                {(LINK_IN_BIO_GUIDE_IMAGE || linkBioScreenshot) && (
                  <div className="mx-4 mb-4 rounded-xl overflow-hidden border border-white/[0.05]">
                    <img
                      src={linkBioScreenshot ?? LINK_IN_BIO_GUIDE_IMAGE!}
                      alt="Инструкция Bio Instagram"
                      className="w-full max-h-64 object-contain mx-auto"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Promo Carousel — image posters */}
            <div className="mb-5">
              <div
                className="flex gap-3 overflow-x-auto pl-5 pr-5 pb-1 hide-scrollbar"
                style={{ scrollSnapType: 'x mandatory' }}
              >
                {banners.map((b, i) => (
                  <div
                    key={i}
                    className={`flex-shrink-0 rounded-2xl overflow-hidden relative${isKZ && i === 0 ? ' cursor-pointer' : ''}`}
                    style={{ width: 160, height: 224, scrollSnapAlign: 'start', boxShadow: '0 4px 20px rgba(0,0,0,0.4)' }}
                    onClick={isKZ && i === 0 ? () => setShowBoostModal(true) : undefined}
                  >
                    <img
                      src={b.src}
                      alt={b.alt}
                      className={`w-full h-full object-cover transition-transform duration-200${isKZ && i === 0 ? ' hover:scale-105 active:scale-95' : ''}`}
                      draggable={false}
                    />
                    {isKZ && i === 0 && (
                      <div className="absolute inset-0 flex flex-col justify-end p-3 bg-gradient-to-t from-black/80 via-black/30 to-transparent">
                        <div className="flex items-center gap-1 mb-0.5">
                          <span className="text-sm font-bold text-white leading-tight">Стань №1 в поиске 🚀</span>
                        </div>
                        <p className="text-[10px] text-white/80 leading-snug">Продвинь профиль в ТОП и забирай лучшие заказы</p>
                        <div className="mt-2 px-2.5 py-1 rounded-lg bg-amber-500 text-[9px] font-black text-black uppercase tracking-wide text-center">
                          Продвинуть
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Yalla Gear — KZ only entry widget */}
            {isKZ && (
              <div className="px-5 mb-5">
                <button
                  onClick={() => setShowGear(true)}
                  className="w-full flex items-center gap-4 p-4 rounded-2xl transition-all active:scale-[0.98]"
                  style={{ background: 'linear-gradient(135deg, rgba(251,191,36,0.08), rgba(6,182,212,0.06))', border: '1px solid rgba(251,191,36,0.15)' }}
                >
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(251,191,36,0.12)', border: '1px solid rgba(251,191,36,0.25)' }}>
                    <Camera size={22} className="text-amber-400" />
                  </div>
                  <div className="text-left flex-1">
                    <div className="text-sm font-bold text-white">Yalla Gear: Аренда и Маркет</div>
                    <p className="text-[10px] text-gray-400 mt-0.5">Сдавай в аренду, покупай, ищи технику для съемок</p>
                  </div>
                  <ChevronRight size={16} className="text-amber-400/60 flex-shrink-0" />
                </button>
              </div>
            )}

            {/* Stats row */}
            <div className="px-5 grid grid-cols-2 gap-3 mb-5">
              <div className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="flex items-center gap-1.5 mb-2">
                  <DollarSign size={12} className="text-emerald-400" />
                  <span className="text-[10px] uppercase tracking-wider font-semibold text-gray-500">Заработано</span>
                </div>
                <div className="text-2xl font-bold text-white">{fmt(totalEarned)}</div>
                <div className="text-[10px] text-gray-600 mt-0.5">{currency}</div>
              </div>
              <div className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="flex items-center gap-1.5 mb-2">
                  <Zap size={12} className="text-amber-400" />
                  <span className="text-[10px] uppercase tracking-wider font-semibold text-gray-500">Ближайшие</span>
                </div>
                <div className="text-2xl font-bold text-white">{upcoming.length}</div>
                <div className="text-[10px] text-gray-600 mt-0.5">съёмок</div>
              </div>
            </div>

            {/* Upcoming shoots preview */}
            <div className="px-5 mb-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-bold text-white">Ближайшие съёмки</h2>
                <button onClick={() => setTab('shoots')} className="text-xs text-amber-400">Все →</button>
              </div>
              {upcoming.length === 0 ? (
                <div className="rounded-2xl p-8 text-center" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <Camera size={28} className="mx-auto mb-2 text-gray-700" />
                  <p className="text-xs text-gray-500">Нет ближайших съёмок</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {upcoming.slice(0, 3).map(b => {
                    const s = STATUS_MAP[b.status] || STATUS_MAP.pending;
                    return (
                      <div key={b.id} className="flex items-center gap-3 p-4 rounded-2xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${s.color}12`, border: `1px solid ${s.color}25` }}>
                          <CalendarDays size={16} style={{ color: s.color }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold text-white truncate">{b.client_name}</div>
                          <div className="text-[10px] text-gray-500">{new Date(b.booking_date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })} · {b.booking_time}</div>
                        </div>
                        <span className="text-[10px] font-bold px-2.5 py-1 rounded-lg flex-shrink-0" style={{ color: s.color, background: `${s.color}15`, border: `1px solid ${s.color}30` }}>{s.label}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Messages preview */}
            {dealChats.length > 0 && (
              <div className="px-5 mb-5">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-bold text-white">Сообщения</h2>
                  <button onClick={() => setShowMessages(true)} className="text-xs text-amber-400">Все →</button>
                </div>
                <div className="space-y-2">
                  {dealChats.slice(0, 2).map(chat => (
                    <button key={chat.id} onClick={() => { setShowMessages(true); setActiveDealChatId(chat.id); }} className="w-full flex items-center gap-3 p-4 rounded-2xl text-left transition-colors hover:bg-white/[0.04]" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(251,191,36,0.12)', border: '1px solid rgba(251,191,36,0.2)' }}>
                        <span className="text-sm font-bold text-amber-300">{(chat.client_name ?? 'C')[0].toUpperCase()}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-white truncate">{chat.client_name}</div>
                        <div className="text-[10px] text-gray-500 truncate">{chat.order_package_name}</div>
                      </div>
                      <ChevronRight size={14} className="text-gray-600" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══ MESSAGES overlay (over home) ══════════════════════════════════ */}
        {tab === 'home' && showMessages && (
          <div className="animate-[fadeInUp_0.3s_ease-out] px-5 pt-12">
            {activeDealChatId ? (
              <div className="space-y-3">
                <button onClick={() => setActiveDealChatId(null)} className="flex items-center gap-2 text-xs font-medium text-gray-400 hover:text-white mb-2">
                  <ArrowLeft size={14} /> Назад к сообщениям
                </button>
                {(() => {
                  const chat = dealChats.find(c => c.id === activeDealChatId);
                  if (!chat) return null;
                  return (
                    <DealMessenger
                      chatId={chat.id}
                      currentUserId={user!.id}
                      userRole="freelancer"
                      orderId={chat.order_id}
                      orderStatus={chat.order_status ?? 'paid'}
                      partnerName={chat.client_name || 'Клиент'}
                      partnerId={chat.client_id}
                      partnerTable="client_profiles"
                      onOrderUpdate={s => setDealChats(prev => prev.map(c => c.id === chat.id ? { ...c, order_status: s } : c))}
                      onClose={() => setActiveDealChatId(null)}
                    />
                  );
                })()}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-3 mb-2">
                  <button onClick={() => setShowMessages(false)} className="flex items-center gap-2 text-xs font-medium text-gray-400 hover:text-white">
                    <ArrowLeft size={14} /> Назад
                  </button>
                  <h2 className="text-lg font-bold text-white flex-1">Сообщения</h2>
                </div>
                <div className="relative mb-3">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input value={chatSearch} onChange={e => setChatSearch(e.target.value)} placeholder="Поиск диалогов..." className="w-full pl-9 pr-3 py-2.5 rounded-xl text-sm bg-white/[0.03] border border-white/10 text-white outline-none placeholder-gray-600 focus:border-amber-500/30 transition-colors" />
                </div>
                {filteredChats.length === 0 ? (
                  <div className="text-center py-16">
                    <MessageCircle size={36} className="mx-auto mb-4 text-gray-700" />
                    <p className="text-sm text-gray-400">Диалогов пока нет</p>
                  </div>
                ) : filteredChats.map(chat => (
                  <button key={chat.id} onClick={() => setActiveDealChatId(chat.id)} className="w-full flex items-center gap-3 p-4 rounded-2xl bg-white/[0.03] border border-white/[0.05] hover:bg-white/[0.05] transition-colors text-left">
                    <div className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(251,191,36,0.12)', border: '1px solid rgba(251,191,36,0.2)' }}>
                      <span className="text-sm font-bold text-amber-300">{(chat.client_name ?? 'C')[0].toUpperCase()}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-white truncate">{chat.client_name}</div>
                      <div className="text-xs text-gray-500 truncate">{chat.order_package_name}</div>
                    </div>
                    <ChevronRight size={14} className="text-gray-600" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ══ SHOOTS TAB ════════════════════════════════════════════════════ */}
        {tab === 'shoots' && (
          <div className="animate-[fadeInUp_0.3s_ease-out] px-5 pt-12 pb-8 min-h-[calc(100vh-6rem)]">
            <h1 className="text-2xl font-bold text-white mb-4">Мои съёмки</h1>

            {/* Personal booking link */}
            {creatorProfile.username && (
              <div className="rounded-2xl p-4 mb-5" style={{ background: 'rgba(251,191,36,0.04)', border: '1px solid rgba(251,191,36,0.12)' }}>
                <div className="text-[11px] font-bold text-amber-400/80 mb-1.5">Ваша ссылка для бронирования</div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 min-w-0 px-3 py-2 rounded-lg bg-black/30 border border-white/[0.06] overflow-hidden">
                    <span className="text-xs text-gray-300 truncate block">yallainfluencers.com/booking/{creatorProfile.username}</span>
                  </div>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(`https://yallainfluencers.com/booking/${creatorProfile.username}`);
                      setLinkCopied(true);
                      setTimeout(() => setLinkCopied(false), 2000);
                    }}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold bg-amber-500/10 border border-amber-500/20 text-amber-400 flex-shrink-0 transition-all"
                  >
                    {linkCopied ? <><Check size={12} /> Скопировано</> : <><Copy size={12} /> Копировать</>}
                  </button>
                </div>
                <p className="text-[10px] text-gray-500 mt-2">Отправьте эту ссылку клиентам — они смогут выбрать дату и время, и забронировать съёмку</p>
              </div>
            )}

            <ShootsCalendar
              creatorId={creatorProfile.id}
              bookings={bookings}
              orders={calendarOrders}
              onRefresh={loadBookings}
            />

            {/* Upcoming bookings list */}
            {upcoming.length > 0 && (
              <div className="mt-8">
                <h2 className="text-sm font-bold text-gray-300 mb-3">Ближайшие съёмки</h2>
                <div className="space-y-3">
                  {upcoming.map(b => {
                    const s = STATUS_MAP[b.status] || STATUS_MAP.pending;
                    return (
                      <div key={b.id} className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div>
                            <div className="text-base font-bold text-white">{b.client_name}</div>
                            <div className="text-xs text-gray-400 mt-0.5">
                              {new Date(b.booking_date).toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })} · {b.booking_time}
                            </div>
                          </div>
                          <span className="flex-shrink-0 px-2.5 py-1 rounded-lg text-[10px] font-bold" style={{ color: s.color, background: `${s.color}15`, border: `1px solid ${s.color}30` }}>{s.label}</span>
                        </div>
                        {b.details && <p className="text-xs mb-3 text-gray-400">{b.details}</p>}
                        <div className="flex items-center gap-3 flex-wrap text-[11px] text-gray-500 mb-3">
                          {b.client_email && <span className="flex items-center gap-1"><Mail size={10} />{b.client_email}</span>}
                          {b.client_phone && <span className="flex items-center gap-1"><Phone size={10} />{b.client_phone}</span>}
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          {b.status === 'pending' && <>
                            <button onClick={() => updateBookingStatus(b.id, 'confirmed')} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                              <Check size={12} /> Подтвердить
                            </button>
                            <button onClick={() => updateBookingStatus(b.id, 'cancelled')} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-white/[0.04] border border-white/10 text-gray-300">
                              <X size={12} /> Отклонить
                            </button>
                          </>}
                          {b.status === 'confirmed' && (
                            <button onClick={() => updateBookingStatus(b.id, 'completed')} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-amber-500/10 border border-amber-500/20 text-amber-400">
                              <Check size={12} /> Отметить выполненным
                            </button>
                          )}
                          {b.client_phone && (
                            <a href={`https://wa.me/${b.client_phone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-white/[0.04] border border-white/10 text-gray-300">
                              <MessageSquare size={12} /> WhatsApp
                            </a>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══ MESSAGES TAB ══════════════════════════════════════════════════ */}
        {tab === 'messages' && !activeDealChatId && (
          <div className="animate-[fadeInUp_0.3s_ease-out] px-5 pt-12">
            <h1 className="text-2xl font-bold text-white mb-4">Сообщения</h1>
            <div className="relative mb-4">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input value={chatSearch} onChange={e => setChatSearch(e.target.value)} placeholder="Поиск диалогов..." className="w-full pl-9 pr-3 py-2.5 rounded-xl text-sm bg-white/[0.03] border border-white/10 text-white outline-none placeholder-gray-600 focus:border-amber-500/30 transition-colors" />
            </div>
            {filteredChats.length === 0 ? (
              <div className="text-center py-20">
                <MessageCircle size={40} className="mx-auto mb-4 text-gray-700" />
                <p className="text-sm text-gray-400">Диалогов пока нет</p>
                <p className="text-xs mt-1 text-gray-600">После оплаты заказа клиент сможет написать вам</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredChats.map(chat => (
                  <button key={chat.id} onClick={() => setActiveDealChatId(chat.id)} className="w-full flex items-center gap-3 p-4 rounded-2xl bg-white/[0.03] border border-white/[0.05] hover:bg-white/[0.05] transition-colors text-left">
                    <div className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(251,191,36,0.12)', border: '1px solid rgba(251,191,36,0.2)' }}>
                      <span className="text-sm font-bold text-amber-300">{(chat.client_name ?? 'C')[0].toUpperCase()}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-white truncate">{chat.client_name}</div>
                      <div className="text-xs text-gray-500 truncate">{chat.order_package_name}</div>
                    </div>
                    <ChevronRight size={14} className="text-gray-600" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'messages' && activeDealChatId && (
          <div className="animate-[fadeInUp_0.3s_ease-out] flex flex-col" style={{ height: '100dvh' }}>
            <div className="flex items-center gap-2 px-5 pt-12 pb-2 flex-shrink-0">
              <button onClick={() => setActiveDealChatId(null)} className="flex items-center gap-2 text-xs font-medium text-gray-400 hover:text-white">
                <ArrowLeft size={14} /> Назад к сообщениям
              </button>
            </div>
            <div className="flex-1 overflow-hidden rounded-t-2xl mx-4 mb-0" style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
            {(() => {
              const chat = dealChats.find(c => c.id === activeDealChatId);
              if (!chat) return null;
              return (
                <DealMessenger
                  chatId={chat.id}
                  currentUserId={user!.id}
                  userRole="freelancer"
                  orderId={chat.order_id}
                  orderStatus={chat.order_status ?? 'paid'}
                  partnerName={chat.client_name || 'Клиент'}
                  partnerId={chat.client_id}
                  partnerTable="client_profiles"
                  onOrderUpdate={s => setDealChats(prev => prev.map(c => c.id === chat.id ? { ...c, order_status: s } : c))}
                  onClose={() => setActiveDealChatId(null)}
                />
              );
            })()}
            </div>
          </div>
        )}

        {/* ══ WALLET TAB ════════════════════════════════════════════════════ */}
        {tab === 'wallet' && (
          <div className="animate-[fadeInUp_0.3s_ease-out] px-5 pt-12">
            <h1 className="text-2xl font-bold text-white mb-6">Кошелёк</h1>

            {/* Balance card */}
            <div className="rounded-2xl p-6 mb-3" style={{ background: 'linear-gradient(135deg,rgba(251,191,36,0.08) 0%,rgba(245,101,0,0.04) 100%)', border: '1px solid rgba(251,191,36,0.2)' }}>
              <div className="text-xs uppercase tracking-wider font-semibold text-gray-400 mb-2">Доступный баланс</div>
              <div className="text-4xl font-bold text-white">{fmt(balance)} <span className="text-lg font-normal text-gray-500">{currency}</span></div>
              <div className="text-xs text-gray-500 mt-1">В обработке: {fmt(creatorProfile.balance_pending ?? 0)} · Всего: {fmt(totalEarned)} {currency}</div>
            </div>

            {/* KZ: frozen/escrow balance card */}
            {isKZ && (walletData?.balance_on_hold ?? creatorProfile.balance_on_hold ?? 0) > 0 && (
              <div className="rounded-2xl p-4 mb-5 flex items-center gap-3" style={{ background: 'rgba(56,189,248,0.05)', border: '1px solid rgba(56,189,248,0.18)' }}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(56,189,248,0.1)' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-sky-400">Заморожено в эскроу</div>
                  <div className="text-lg font-bold text-white">{fmt(walletData?.balance_on_hold ?? creatorProfile.balance_on_hold ?? 0)} <span className="text-xs font-normal text-gray-500">KZT</span></div>
                  <div className="text-[10px] text-gray-500 mt-0.5">Разморозится после подтверждения заказчиком</div>
                </div>
              </div>
            )}

            {/* KZ withdrawal */}
            {isKZ ? (
              <div className="space-y-3 mb-6">
                <h3 className="text-sm font-bold text-white">Вывод средств</h3>
                <div className="rounded-2xl p-5 space-y-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div>
                    <label className="block text-[10px] uppercase tracking-wide font-semibold text-gray-600 mb-1.5">Сумма (KZT)</label>
                    <input type="number" value={kzWithdrawAmount} onChange={e => setKzWithdrawAmount(e.target.value)} placeholder={`Мин. ${fmt(minPayout)}`} className="w-full px-4 py-3 rounded-xl text-sm bg-[#0a0f1a] border border-white/10 text-white outline-none focus:border-amber-500/40 transition-colors" />
                    <p className="text-[10px] text-gray-600 mt-1">Доступно: {fmt(balance)} KZT · Мин: {fmt(minPayout)} KZT</p>
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-wide font-semibold text-gray-600 mb-1.5">Способ</label>
                    <div className="grid grid-cols-2 gap-2">
                      {(['kaspi', 'bank_transfer'] as const).map(m => (
                        <button key={m} onClick={() => setKzWithdrawMethod(m)} className="px-3 py-2.5 rounded-xl text-xs font-bold capitalize transition-all" style={{ background: kzWithdrawMethod === m ? 'rgba(251,191,36,0.10)' : 'rgba(255,255,255,0.03)', color: kzWithdrawMethod === m ? '#fbbf24' : '#94a3b8', border: kzWithdrawMethod === m ? '1px solid rgba(251,191,36,0.30)' : '1px solid rgba(255,255,255,0.08)' }}>
                          {m === 'kaspi' ? 'Kaspi' : 'Банк. перевод'}
                        </button>
                      ))}
                    </div>
                  </div>
                  <button onClick={submitKzWithdrawal} disabled={kzWithdrawSubmitting || !kzWithdrawAmount || parseFloat(kzWithdrawAmount) < minPayout || parseFloat(kzWithdrawAmount) > balance} className="w-full py-3 rounded-xl text-sm font-bold transition-all disabled:opacity-40" style={{ background: 'rgba(251,191,36,0.10)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.25)' }}>
                    {kzWithdrawSubmitting ? 'Отправка...' : 'Запросить вывод'}
                  </button>
                </div>

                {kzWithdrawals.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold text-gray-400 mb-2">История запросов</h4>
                    <div className="space-y-2">
                      {kzWithdrawals.map(w => (
                        <div key={w.id} className="flex items-center justify-between p-4 rounded-2xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                          <div>
                            <div className="text-sm font-bold text-white">{fmt(w.amount)} {w.currency}</div>
                            <div className="text-[10px] text-gray-500">{new Date(w.created_at).toLocaleDateString('ru-RU')}</div>
                          </div>
                          <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold capitalize" style={{ background: w.status === 'paid' ? 'rgba(0,196,140,0.15)' : w.status === 'rejected' ? 'rgba(239,68,68,0.15)' : 'rgba(251,191,36,0.15)', color: w.status === 'paid' ? '#00C48C' : w.status === 'rejected' ? '#f87171' : '#fbbf24' }}>{w.status}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="mb-5">
                <button onClick={() => setShowPayoutModal(true)} disabled={balance < 100} className="w-full py-3 rounded-xl text-sm font-bold mb-4 transition-all disabled:opacity-40" style={{ background: 'rgba(251,191,36,0.10)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.25)' }}>
                  Запросить вывод
                </button>
                {balance < 100 && <p className="text-[11px] text-gray-500 text-center">Минимальная сумма вывода — 100 AED</p>}

                {payoutRequests.length > 0 && (
                  <div className="space-y-2 mt-4">
                    {payoutRequests.map(p => (
                      <div key={p.id} className="flex items-center justify-between p-4 rounded-2xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <div>
                          <div className="text-sm font-bold text-white">{fmt(p.amount)} AED</div>
                          <div className="text-[10px] text-gray-500">{p.payment_method} · {new Date(p.created_at).toLocaleDateString()}</div>
                        </div>
                        <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold capitalize" style={{ background: p.status === 'paid' ? 'rgba(0,196,140,0.15)' : p.status === 'rejected' ? 'rgba(239,68,68,0.15)' : 'rgba(251,191,36,0.15)', color: p.status === 'paid' ? '#00C48C' : p.status === 'rejected' ? '#f87171' : '#fbbf24' }}>{p.status}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ══ PROFILE TAB ═══════════════════════════════════════════════════ */}
        {tab === 'profile' && !profileSection && (
          <div className="animate-[fadeInUp_0.3s_ease-out]">
            {/* Profile header */}
            <div className="px-5 pt-12 pb-6 flex items-center gap-4">
              <div className="relative flex-shrink-0">
                <button
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={uploadingAvatar}
                  className="w-16 h-16 rounded-2xl overflow-hidden bg-gradient-to-br from-amber-400/20 to-orange-400/20 border border-white/10 flex items-center justify-center focus:outline-none active:scale-95 transition-transform"
                >
                  {(avatarUrl || creatorProfile.avatar_url) ? (
                    <img src={avatarUrl ?? creatorProfile.avatar_url!} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-xl font-bold text-amber-300">{(creatorProfile.display_name || 'V')[0].toUpperCase()}</span>
                  )}
                  {uploadingAvatar && (
                    <div className="absolute inset-0 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)' }}>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    </div>
                  )}
                </button>
                {/* Camera badge */}
                <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center pointer-events-none" style={{ background: '#fbbf24', border: '2px solid #080D14' }}>
                  <Camera size={9} color="#422006" strokeWidth={2.5} />
                </div>
                <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
              </div>
              <div>
                <div className="text-lg font-bold text-white">{creatorProfile.display_name}</div>
                {creatorProfile.username && <div className="text-xs text-amber-400/70">@{creatorProfile.username}</div>}
                {(creatorProfile as { phone?: string }).phone && (
                  <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-1"><Phone size={10} />{(creatorProfile as { phone?: string }).phone}</div>
                )}
              </div>
            </div>

            {/* Stats mini-row */}
            <div className="grid grid-cols-3 mx-5 mb-6 divide-x divide-white/[0.05] rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
              {[
                { label: 'Съёмок', value: completed.length || creatorProfile.orders_completed || 0 },
                { label: 'Отзывов', value: (creatorProfile as { reviews_count?: number }).reviews_count ?? 0 },
                { label: 'В портфолио', value: portfolioItems.length },
              ].map((s, i) => (
                <div key={i} className="flex flex-col items-center py-4">
                  <div className="text-xl font-bold text-white">{s.value}</div>
                  <div className="text-[10px] text-gray-500 mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>

            {/* Menu list */}
            <div className="mx-5 rounded-2xl overflow-hidden divide-y divide-white/[0.05]" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <MenuRow icon={<Edit3 size={18} className="text-blue-400" />} label="Редактировать профиль" sub="Имя, фото, описание" onClick={() => {
                setEditDisplayName(creatorProfile.display_name ?? '');
                setEditBio((creatorProfile as { bio?: string }).bio ?? '');
                setEditLocation((creatorProfile as { location?: string }).location ?? '');
                setEditProfileSaved(false);
                setProfileSection('editProfile');
              }} />
              <MenuRow icon={<Package size={18} className="text-amber-400" />} label="Мои услуги" sub={`${(creatorProfile.packages as KzPkg[] ?? []).length} пакетов`} onClick={() => setProfileSection('packages')} />
              <MenuRow icon={<Image size={18} className="text-emerald-400" />} label="Моё портфолио" sub={`${portfolioItems.length}/100 файлов`} onClick={() => setProfileSection('portfolio')} />
              {isKZ && <MenuRow icon={<CreditCard size={18} className="text-purple-400" />} label="Банковские реквизиты" sub="Kaspi, счёт для выплат" onClick={() => setProfileSection('bank')} />}
              {isKZ && <MenuRow icon={<Link2 size={18} className="text-amber-400" />} label="Ссылка в Bio" sub="Инструкция для Instagram" onClick={() => setProfileSection('biohint')} />}
              {isKZ && <MenuRow icon={<MessageSquare size={18} className="text-emerald-400" />} label="WhatsApp для заявок" sub={whatsappNumber || 'Не указан'} onClick={() => setProfileSection('whatsapp')} />}
            </div>

            {/* KZ: Boost button */}
            {isKZ && (
              <div className="mx-5 mt-4">
                <button
                  onClick={() => setShowBoostModal(true)}
                  className="w-full flex items-center justify-center gap-2.5 py-4 rounded-2xl text-sm font-bold transition-all active:scale-[0.99]"
                  style={{ background: 'linear-gradient(135deg,rgba(251,191,36,0.15) 0%,rgba(245,101,0,0.10) 100%)', border: '1px solid rgba(251,191,36,0.35)', color: '#fbbf24' }}
                >
                  <Rocket size={17} />
                  Продвинуть профиль в ТОП
                </button>
                {creatorProfile.is_promoted && creatorProfile.promoted_until && new Date(creatorProfile.promoted_until as string) > new Date() && (
                  <p className="text-[10px] text-emerald-400 text-center mt-2 flex items-center justify-center gap-1">
                    <Check size={10} /> Активно до {new Date(creatorProfile.promoted_until as string).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}
                  </p>
                )}
              </div>
            )}

            {/* Logout */}
            <div className="mx-5 mt-4 mb-2">
              <button onClick={signOut} className="w-full py-3.5 rounded-2xl text-sm font-bold text-red-400 transition-all hover:bg-red-500/10 active:scale-[0.99]" style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)' }}>
                <LogOut size={15} className="inline mr-2" />
                Выйти
              </button>
            </div>
          </div>
        )}

        {/* ── Profile: Packages sub-page ─────────────────────────────────── */}
        {tab === 'profile' && profileSection === 'packages' && (
          <div className="animate-[fadeInUp_0.3s_ease-out] px-5 pt-12">
            <button onClick={() => setProfileSection(null)} className="flex items-center gap-2 text-xs font-medium text-gray-400 hover:text-white mb-5">
              <ArrowLeft size={14} /> Назад
            </button>
            <h2 className="text-xl font-bold text-white mb-5">Мои услуги</h2>
            <div className="space-y-4">
              {editPackages.map((pkg, i) => (
                <div key={pkg.id} className="rounded-2xl p-5 space-y-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">Услуга {i + 1}</span>
                    <button onClick={() => setEditPackages(prev => prev.filter((_, pi) => pi !== i))} className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.15)' }}><X size={11} color="#f87171" /></button>
                  </div>
                  <input value={pkg.name} onChange={e => setEditPackages(prev => prev.map((p, pi) => pi === i ? { ...p, name: e.target.value } : p))} placeholder="Название" className="w-full px-3 py-2.5 rounded-xl text-sm bg-[#0a0f1a] border border-white/10 text-white outline-none focus:border-amber-500/40 transition-colors" />
                  <div className="grid grid-cols-2 gap-3">
                    <input type="number" value={pkg.price || ''} onChange={e => setEditPackages(prev => prev.map((p, pi) => pi === i ? { ...p, price: parseInt(e.target.value) || 0 } : p))} placeholder="Цена KZT" className="w-full px-3 py-2.5 rounded-xl text-sm bg-[#0a0f1a] border border-white/10 text-white outline-none focus:border-amber-500/40 transition-colors" />
                    <input type="number" value={pkg.deliveryDays || ''} onChange={e => setEditPackages(prev => prev.map((p, pi) => pi === i ? { ...p, deliveryDays: parseInt(e.target.value) || 1 } : p))} placeholder="Дней" min={1} className="w-full px-3 py-2.5 rounded-xl text-sm bg-[#0a0f1a] border border-white/10 text-white outline-none focus:border-amber-500/40 transition-colors" />
                  </div>
                  <textarea value={pkg.description} onChange={e => setEditPackages(prev => prev.map((p, pi) => pi === i ? { ...p, description: e.target.value } : p))} placeholder="Описание..." rows={2} className="w-full px-3 py-2.5 rounded-xl text-sm bg-[#0a0f1a] border border-white/10 text-white outline-none focus:border-amber-500/40 transition-colors resize-none" />
                </div>
              ))}
              <button onClick={() => setEditPackages(prev => [...prev, { id: crypto.randomUUID(), name: '', price: 0, deliveryDays: 1, description: '' }])} className="w-full py-3 rounded-xl text-sm font-bold border border-dashed transition-all" style={{ background: 'rgba(255,255,255,0.02)', color: '#475569', borderColor: 'rgba(255,255,255,0.1)' }}>
                + Добавить услугу
              </button>
              <button onClick={saveKzPackages} disabled={packagesSaving || editPackages.filter(p => p.name.trim() && p.price > 0).length === 0} className="w-full py-3 rounded-xl text-sm font-bold transition-all disabled:opacity-40" style={{ background: packagesSavedMsg ? 'rgba(0,196,140,0.12)' : 'rgba(251,191,36,0.10)', color: packagesSavedMsg ? '#00C48C' : '#fbbf24', border: `1px solid ${packagesSavedMsg ? 'rgba(0,196,140,0.3)' : 'rgba(251,191,36,0.25)'}` }}>
                {packagesSaving ? '...' : packagesSavedMsg ? 'Сохранено!' : 'Сохранить услуги'}
              </button>
            </div>
          </div>
        )}

        {/* ── Profile: Portfolio sub-page ────────────────────────────────── */}
        {tab === 'profile' && profileSection === 'portfolio' && (
          <div className="animate-[fadeInUp_0.3s_ease-out] px-5 pt-12">
            <button onClick={() => { setProfileSection(null); setEditingPortfolioIdx(null); }} className="flex items-center gap-2 text-xs font-medium text-gray-400 hover:text-white mb-5">
              <ArrowLeft size={14} /> Назад
            </button>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-bold text-white">Моё портфолио</h2>
              <span className="text-xs text-gray-500">{portfolioItems.length}/100</span>
            </div>

            {portfolioUploading && (
              <div className="rounded-2xl px-4 py-3 mb-4" style={{ background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.2)' }}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-amber-400 font-medium">Загрузка...</span>
                  <span className="text-xs text-gray-500">{portfolioUploadPct}%</span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                  <div className="h-full rounded-full bg-amber-400 transition-all duration-500" style={{ width: `${portfolioUploadPct}%` }} />
                </div>
              </div>
            )}

            <div className="space-y-3 mb-4">
              {portfolioItems.map((item, i) => (
                <div key={i} className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.03)', border: editingPortfolioIdx === i ? '1px solid rgba(251,191,36,0.3)' : '1px solid rgba(255,255,255,0.05)' }}>
                  {/* Bunny iframe preview */}
                  {item.url.includes('iframe.mediadelivery.net') && (
                    <div className="w-full rounded-t-2xl overflow-hidden" style={{ aspectRatio: '16/9' }}>
                      <iframe src={item.url} className="w-full h-full" allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture" allowFullScreen style={{ border: 'none' }} />
                    </div>
                  )}
                  {/* Image preview */}
                  {item.type === 'image' && (
                    <div className="w-full rounded-t-2xl overflow-hidden" style={{ maxHeight: 180 }}>
                      <img src={item.url} alt={item.title || ''} className="w-full object-cover" style={{ maxHeight: 180 }} />
                    </div>
                  )}
                  {/* Preview row */}
                  <div className="flex items-center gap-3 p-4">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.15)' }}>
                      {item.type === 'image'
                        ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                        : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-white truncate">{item.title || `Файл ${i + 1}`}</p>
                      {item.clientName && <p className="text-[10px] text-gray-500 truncate">{item.clientName}</p>}
                      {!item.url.includes('iframe.mediadelivery.net') && (
                        <a href={item.url} target="_blank" rel="noreferrer" className="text-[10px] text-amber-400/70 hover:text-amber-400">Открыть ↗</a>
                      )}
                    </div>
                    <button
                      onClick={() => setEditingPortfolioIdx(editingPortfolioIdx === i ? null : i)}
                      className="px-2.5 py-1.5 rounded-lg text-[10px] font-bold mr-1"
                      style={{ background: editingPortfolioIdx === i ? 'rgba(251,191,36,0.12)' : 'rgba(255,255,255,0.04)', color: editingPortfolioIdx === i ? '#fbbf24' : '#94a3b8', border: editingPortfolioIdx === i ? '1px solid rgba(251,191,36,0.25)' : '1px solid rgba(255,255,255,0.08)' }}
                    >
                      {editingPortfolioIdx === i ? 'Готово' : 'Ред.'}
                    </button>
                    <button onClick={() => deletePortfolioVideo(i)} className="px-2.5 py-1.5 rounded-lg text-[10px] font-bold" style={{ background: 'rgba(248,113,113,0.08)', color: '#f87171', border: '1px solid rgba(248,113,113,0.2)' }}>✕</button>
                  </div>
                  {/* Inline metadata editor */}
                  {editingPortfolioIdx === i && (
                    <div className="px-4 pb-4 space-y-2.5" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                      <div className="pt-3">
                        <label className="block text-[10px] uppercase tracking-wide font-semibold text-gray-600 mb-1">Название проекта</label>
                        <input
                          value={item.title ?? ''}
                          onChange={e => setPortfolioItems(prev => prev.map((it, pi) => pi === i ? { ...it, title: e.target.value } : it))}
                          onBlur={() => updatePortfolioItemMeta(i, { title: item.title })}
                          placeholder="Рекламный ролик Kaspi.kz"
                          className="w-full px-3 py-2 rounded-xl text-sm bg-[#0a0f1a] border border-white/10 text-white outline-none focus:border-amber-500/40 transition-colors"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] uppercase tracking-wide font-semibold text-gray-600 mb-1">Клиент / Для кого снято</label>
                        <input
                          value={item.clientName ?? ''}
                          onChange={e => setPortfolioItems(prev => prev.map((it, pi) => pi === i ? { ...it, clientName: e.target.value } : it))}
                          onBlur={() => updatePortfolioItemMeta(i, { clientName: item.clientName })}
                          placeholder="Kaspi, Yandex, локальный ресторан..."
                          className="w-full px-3 py-2 rounded-xl text-sm bg-[#0a0f1a] border border-white/10 text-white outline-none focus:border-amber-500/40 transition-colors"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] uppercase tracking-wide font-semibold text-gray-600 mb-1">Описание / Оборудование</label>
                        <textarea
                          value={item.description ?? ''}
                          onChange={e => setPortfolioItems(prev => prev.map((it, pi) => pi === i ? { ...it, description: e.target.value } : it))}
                          onBlur={() => updatePortfolioItemMeta(i, { description: item.description })}
                          placeholder="Sony A7 IV, дроуслайдер, стедикам..."
                          rows={2}
                          className="w-full px-3 py-2 rounded-xl text-sm bg-[#0a0f1a] border border-white/10 text-white outline-none focus:border-amber-500/40 transition-colors resize-none"
                        />
                      </div>
                      <button
                        onClick={() => { updatePortfolioItemMeta(i, { title: item.title, clientName: item.clientName, description: item.description }); setEditingPortfolioIdx(null); }}
                        className="w-full py-2 rounded-xl text-xs font-bold"
                        style={{ background: 'rgba(0,196,140,0.10)', color: '#00C48C', border: '1px solid rgba(0,196,140,0.25)' }}
                      >
                        Сохранить
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {portfolioItems.length < 100 && !portfolioUploading && (
              <label className="flex flex-col items-center justify-center py-10 rounded-2xl cursor-pointer transition-all" style={{ border: '2px dashed rgba(255,255,255,0.1)' }}>
                <Upload size={28} className="text-gray-600 mb-2" />
                <span className="text-sm font-medium text-gray-500">Загрузить видео или фото</span>
                <span className="text-xs text-gray-700 mt-1">{portfolioItems.length}/100 · можно выбрать несколько · видео до 1 ГБ</span>
                <input type="file" multiple accept="image/*,video/mp4,video/quicktime,video/webm,video/x-msvideo,video/mpeg" className="hidden" disabled={portfolioUploading} onChange={e => { const fs = Array.from(e.target.files ?? []); if (fs.length) uploadPortfolioFiles(fs); e.currentTarget.value = ''; }} />
              </label>
            )}
            {portfolioItems.length >= 100 && <p className="text-xs text-gray-600 text-center mt-2">Максимум 100 файлов в портфолио</p>}
          </div>
        )}

        {/* ── Profile: Bank details sub-page ────────────────────────────── */}
        {tab === 'profile' && profileSection === 'bank' && (
          <div className="animate-[fadeInUp_0.3s_ease-out] px-5 pt-12">
            <button onClick={() => setProfileSection(null)} className="flex items-center gap-2 text-xs font-medium text-gray-400 hover:text-white mb-5">
              <ArrowLeft size={14} /> Назад
            </button>
            <h2 className="text-xl font-bold text-white mb-5">Банковские реквизиты</h2>
            <div className="rounded-2xl p-5 space-y-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
              {[
                { label: 'Банк', value: bankName, set: setBankName, placeholder: 'Kaspi Bank, Halyk...' },
                { label: 'Имя владельца счёта', value: bankAccountName, set: setBankAccountName, placeholder: 'Иван Иванов' },
                { label: 'Номер счёта / IBAN', value: bankIban, set: setBankIban, placeholder: 'KZ...' },
              ].map(f => (
                <div key={f.label}>
                  <label className="block text-[10px] uppercase tracking-wide font-semibold text-gray-600 mb-1.5">{f.label}</label>
                  <input value={f.value} onChange={e => f.set(e.target.value)} placeholder={f.placeholder} className="w-full px-4 py-3 rounded-xl text-sm bg-[#0a0f1a] border border-white/10 text-white outline-none focus:border-amber-500/40 transition-colors" />
                </div>
              ))}
              <button onClick={saveBankDetails} disabled={savingBank} className="w-full py-3 rounded-xl text-sm font-bold transition-all disabled:opacity-40" style={{ background: bankSaved ? 'rgba(0,196,140,0.12)' : 'rgba(251,191,36,0.10)', color: bankSaved ? '#00C48C' : '#fbbf24', border: `1px solid ${bankSaved ? 'rgba(0,196,140,0.3)' : 'rgba(251,191,36,0.25)'}` }}>
                {savingBank ? 'Сохранение...' : bankSaved ? 'Сохранено!' : 'Сохранить реквизиты'}
              </button>
            </div>
          </div>
        )}

        {/* ── Profile: Bio link hint sub-page ──────────────────────────────  */}
        {tab === 'profile' && profileSection === 'biohint' && (
          <div className="animate-[fadeInUp_0.3s_ease-out] px-5 pt-12">
            <button onClick={() => setProfileSection(null)} className="flex items-center gap-2 text-xs font-medium text-gray-400 hover:text-white mb-5">
              <ArrowLeft size={14} /> Назад
            </button>
            <h2 className="text-xl font-bold text-white mb-5">Ссылка в Bio</h2>
            {profileUrl && (
              <div className="rounded-2xl p-5 mb-5 space-y-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <p className="text-xs text-gray-400">Вставьте эту ссылку в Bio вашего Instagram — клиенты смогут сразу забронировать съёмку.</p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 px-3 py-2.5 rounded-xl text-xs font-mono text-amber-300 truncate" style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(251,191,36,0.12)' }}>{profileUrl}</div>
                  <button onClick={() => { navigator.clipboard.writeText(profileUrl); setLinkCopied(true); setTimeout(() => setLinkCopied(false), 2000); }} className="flex items-center gap-1 px-3 py-2.5 rounded-xl text-xs font-bold transition-all flex-shrink-0" style={{ background: linkCopied ? 'rgba(0,196,140,0.12)' : 'rgba(251,191,36,0.1)', color: linkCopied ? '#00C48C' : '#fbbf24', border: `1px solid ${linkCopied ? 'rgba(0,196,140,0.3)' : 'rgba(251,191,36,0.2)'}` }}>
                    {linkCopied ? <Check size={12} /> : <Copy size={12} />}
                    {linkCopied ? 'Скопировано' : 'Копировать'}
                  </button>
                </div>
              </div>
            )}
            {/* Screenshot guide */}
            <div className="rounded-2xl overflow-hidden mb-5" style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
              {(LINK_IN_BIO_GUIDE_IMAGE || linkBioScreenshot) ? (
                <img src={linkBioScreenshot ?? LINK_IN_BIO_GUIDE_IMAGE!} alt="Инструкция Bio" className="w-full max-h-96 object-contain mx-auto" />
              ) : (
                <div className="flex flex-col items-center justify-center py-12" style={{ background: 'rgba(255,255,255,0.02)' }}>
                  <Image size={28} className="text-gray-700 mb-2" />
                  <p className="text-xs text-gray-600">Скриншот-инструкция</p>
                </div>
              )}
            </div>
            {/* Upload screenshot button */}
            <input ref={screenshotInputRef} type="file" accept="image/*" className="hidden" onChange={handleScreenshotUpload} />
            {linkBioScreenshot ? (
              <div className="flex items-center gap-2 text-xs text-emerald-400">
                <Check size={12} /> Скриншот загружен
              </div>
            ) : (
              <button onClick={() => screenshotInputRef.current?.click()} disabled={uploadingScreenshot} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold" style={{ background: 'rgba(251,191,36,0.08)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.2)' }}>
                {uploadingScreenshot ? <div className="w-3 h-3 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin" /> : <Upload size={13} />}
                Загрузить скриншот
              </button>
            )}
          </div>
        )}

        {/* ── Profile: WhatsApp for bookings sub-page ───────────────────── */}
        {tab === 'profile' && profileSection === 'editProfile' && (
          <div className="animate-[fadeInUp_0.3s_ease-out] px-5 pt-12 pb-8">
            <button onClick={() => setProfileSection(null)} className="flex items-center gap-2 text-xs font-medium text-gray-400 hover:text-white mb-5">
              <ArrowLeft size={14} /> Назад
            </button>
            <h2 className="text-xl font-bold text-white mb-1">Редактировать профиль</h2>
            <p className="text-xs text-gray-500 mb-5">Имя, описание и город — видны клиентам на вашей странице.</p>
            <div className="rounded-2xl p-5 space-y-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div>
                <label className="block text-[10px] uppercase tracking-wide font-semibold text-gray-600 mb-1.5">Имя / Никнейм</label>
                <input
                  value={editDisplayName}
                  onChange={e => setEditDisplayName(e.target.value)}
                  placeholder="Ваше имя или псевдоним"
                  className="w-full px-4 py-3 rounded-xl text-sm bg-[#0a0f1a] border border-white/10 text-white outline-none focus:border-blue-500/40 transition-colors"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-wide font-semibold text-gray-600 mb-1.5">О себе</label>
                <textarea
                  value={editBio}
                  onChange={e => setEditBio(e.target.value)}
                  placeholder="Расскажите о своём опыте, специализации..."
                  rows={4}
                  className="w-full px-4 py-3 rounded-xl text-sm bg-[#0a0f1a] border border-white/10 text-white outline-none focus:border-blue-500/40 transition-colors resize-none"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-wide font-semibold text-gray-600 mb-1.5">Город</label>
                <select
                  value={editLocation}
                  onChange={e => setEditLocation(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl text-sm bg-[#0a0f1a] border border-white/10 text-white outline-none focus:border-blue-500/40 transition-colors appearance-none"
                >
                  <option value="">— Выберите город —</option>
                  <option value="Almaty">Алматы</option>
                  <option value="Astana">Астана</option>
                  <option value="Shymkent">Шымкент</option>
                  <option value="Karaganda">Караганда</option>
                  <option value="Aktobe">Актобе</option>
                  <option value="Taraz">Тараз</option>
                  <option value="Atyrau">Атырау</option>
                  <option value="Ust-Kamenogorsk">Усть-Каменогорск</option>
                  <option value="Pavlodar">Павлодар</option>
                  <option value="Semey">Семей</option>
                </select>
              </div>
              <button
                onClick={async () => {
                  if (!editDisplayName.trim() || savingEditProfile) return;
                  setSavingEditProfile(true);
                  await supabase
                    .from('creator_profiles')
                    .update({
                      display_name: editDisplayName.trim(),
                      bio: editBio.trim(),
                      location: editLocation,
                    })
                    .eq('user_id', user!.id);
                  setSavingEditProfile(false);
                  setEditProfileSaved(true);
                  setTimeout(() => {
                    setEditProfileSaved(false);
                    setProfileSection(null);
                  }, 1500);
                }}
                disabled={savingEditProfile || !editDisplayName.trim()}
                className="w-full py-3 rounded-xl text-sm font-bold transition-all disabled:opacity-40"
                style={{
                  background: editProfileSaved ? 'rgba(0,196,140,0.12)' : 'rgba(59,130,246,0.10)',
                  color: editProfileSaved ? '#00C48C' : '#60a5fa',
                  border: `1px solid ${editProfileSaved ? 'rgba(0,196,140,0.3)' : 'rgba(59,130,246,0.25)'}`,
                }}
              >
                {savingEditProfile ? 'Сохранение...' : editProfileSaved ? 'Сохранено!' : 'Сохранить'}
              </button>
            </div>
          </div>
        )}

        {tab === 'profile' && profileSection === 'whatsapp' && (
          <div className="animate-[fadeInUp_0.3s_ease-out] px-5 pt-12">
            <button onClick={() => setProfileSection(null)} className="flex items-center gap-2 text-xs font-medium text-gray-400 hover:text-white mb-5">
              <ArrowLeft size={14} /> Назад
            </button>
            <h2 className="text-xl font-bold text-white mb-2">WhatsApp для заявок</h2>
            <p className="text-xs text-gray-500 mb-5">Когда клиент бронирует съёмку, вам придёт уведомление на этот номер.</p>
            <div className="rounded-2xl p-5 space-y-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div>
                <label className="block text-[10px] uppercase tracking-wide font-semibold text-gray-600 mb-1.5">Номер WhatsApp</label>
                <input
                  type="tel"
                  value={whatsappNumber}
                  onChange={e => setWhatsappNumber(e.target.value)}
                  placeholder="+77001234567"
                  className="w-full px-4 py-3 rounded-xl text-sm bg-[#0a0f1a] border border-white/10 text-white outline-none focus:border-emerald-500/40 transition-colors"
                />
                <p className="text-[10px] text-gray-600 mt-1">Формат: +7 XXX XXX XX XX (Казахстан)</p>
              </div>
              <button
                onClick={saveWhatsappNumber}
                disabled={savingWhatsapp || !whatsappNumber.trim()}
                className="w-full py-3 rounded-xl text-sm font-bold transition-all disabled:opacity-40"
                style={{ background: whatsappSaved ? 'rgba(0,196,140,0.12)' : 'rgba(0,196,140,0.08)', color: '#00C48C', border: `1px solid ${whatsappSaved ? 'rgba(0,196,140,0.3)' : 'rgba(0,196,140,0.2)'}` }}
              >
                {savingWhatsapp ? 'Сохранение...' : whatsappSaved ? 'Сохранено!' : 'Сохранить номер'}
              </button>
            </div>
          </div>
        )}

      </div>

      {/* ── Fixed Bottom Navigation ─────────────────────────────────────── */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around px-1 w-full" style={{ background: 'rgba(8,13,20,0.95)', backdropFilter: 'blur(24px)', borderTop: '1px solid rgba(255,255,255,0.06)', paddingBottom: 'env(safe-area-inset-bottom,0px)' }}>
        {navItems.map(item => (
          <button
            key={item.id}
            onClick={() => {
              setTab(item.id);
              setProfileSection(null);
              setShowMessages(false);
              setActiveDealChatId(null);
            }}
            className="flex flex-col items-center gap-0.5 py-3 px-1 flex-1 min-w-0 transition-all relative"
          >
            <span style={{ color: tab === item.id ? '#fbbf24' : '#475569' }}>{item.icon}</span>
            <span className="text-[10px] font-semibold" style={{ color: tab === item.id ? '#fbbf24' : '#475569' }}>{item.label}</span>
            {tab === item.id && <div className="w-1 h-1 rounded-full bg-amber-400 absolute bottom-2" />}
          </button>
        ))}
      </nav>

      {/* ── KZ Yalla Gear Module ──────────────────────────────────────────── */}
      {showGear && isKZ && <YallaGearModule onClose={() => setShowGear(false)} />}

      {/* ── KZ Profile Boost Modal ─────────────────────────────────────── */}
      {showBoostModal && isKZ && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center p-4 bg-black/70 backdrop-blur-sm" onClick={() => setShowBoostModal(false)}>
          <div className="w-full max-w-sm rounded-3xl overflow-hidden" style={{ background: '#0F1520', border: '1px solid rgba(255,255,255,0.1)' }} onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="px-5 pt-6 pb-4 flex items-start justify-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Rocket size={16} className="text-amber-400" />
                  <span className="text-base font-bold text-white">Продвижение в ТОП</span>
                </div>
                <p className="text-xs text-gray-500">Ваш профиль закрепится выше всех на витрине</p>
              </div>
              <button onClick={() => setShowBoostModal(false)} className="w-8 h-8 rounded-xl flex items-center justify-center text-gray-500 hover:text-white" style={{ background: 'rgba(255,255,255,0.04)' }}>
                <X size={15} />
              </button>
            </div>

            {/* Packages */}
            <div className="p-5 space-y-3">
              {BOOST_PKGS.map(pkg => (
                <button
                  key={pkg.days}
                  onClick={() => setBoostDays(pkg.days)}
                  className="w-full flex items-center justify-between px-4 py-3.5 rounded-2xl transition-all"
                  style={{
                    background: boostDays === pkg.days
                      ? (pkg.highlight ? 'rgba(251,191,36,0.12)' : 'rgba(251,191,36,0.07)')
                      : 'rgba(255,255,255,0.03)',
                    border: boostDays === pkg.days
                      ? '1px solid rgba(251,191,36,0.4)'
                      : '1px solid rgba(255,255,255,0.07)',
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded-full flex-shrink-0 flex items-center justify-center" style={{ border: `2px solid ${boostDays === pkg.days ? '#fbbf24' : '#334155'}` }}>
                      {boostDays === pkg.days && <div className="w-2 h-2 rounded-full bg-amber-400" />}
                    </div>
                    <div className="text-left">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white">{pkg.label}</span>
                        {pkg.highlight && <span className="px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider" style={{ background: 'rgba(251,191,36,0.15)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.3)' }}>Популярный</span>}
                      </div>
                    </div>
                  </div>
                  <span className="text-sm font-bold" style={{ color: boostDays === pkg.days ? '#fbbf24' : '#94a3b8' }}>
                    {pkg.price.toLocaleString('ru-RU')} ₸
                  </span>
                </button>
              ))}

              <button
                onClick={startBoostCheckout}
                disabled={boostLoading}
                className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-2xl text-sm font-bold mt-1 transition-all disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg,#fbbf24 0%,#f59e0b 100%)', color: '#0F1520' }}
              >
                {boostLoading
                  ? <div className="w-4 h-4 border-2 border-[#0F1520]/30 border-t-[#0F1520] rounded-full animate-spin" />
                  : <Rocket size={15} />
                }
                {boostLoading ? 'Переход к оплате...' : 'Оплатить'}
              </button>

              <p className="text-[10px] text-gray-600 text-center">Безопасная оплата через Stripe · Оплата в тенге (KZT)</p>
            </div>
          </div>
        </div>
      )}

      {/* ── AED Payout Modal (non-KZ) ─────────────────────────────────── */}
      {showPayoutModal && !isKZ && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={() => setShowPayoutModal(false)}>
          <div className="w-full max-w-md rounded-2xl bg-[#0F1520] border border-white/10 p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-white">Запросить вывод</h3>
              <button onClick={() => setShowPayoutModal(false)} className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/[0.04] text-gray-400"><X size={16} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-[11px] uppercase tracking-wide font-semibold text-gray-500 mb-1.5">Сумма (AED)</label>
                <input type="number" value={payoutAmount} onChange={e => setPayoutAmount(e.target.value)} placeholder="100" min={100} max={balance} className="w-full px-4 py-3 rounded-xl text-sm bg-[#0a0f1a] border border-white/10 text-white outline-none focus:border-amber-500/40 transition-colors" />
                <p className="text-[11px] text-gray-500 mt-1">Доступно: {fmt(balance)} AED · Мин: 100 AED</p>
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-wide font-semibold text-gray-500 mb-1.5">Способ</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['bank', 'crypto', 'cash'] as const).map(m => (
                    <button key={m} onClick={() => setPayoutMethod(m)} className="px-3 py-2.5 rounded-xl text-xs font-bold capitalize transition-all" style={{ background: payoutMethod === m ? 'rgba(251,191,36,0.10)' : 'rgba(255,255,255,0.03)', color: payoutMethod === m ? '#fbbf24' : '#94a3b8', border: payoutMethod === m ? '1px solid rgba(251,191,36,0.30)' : '1px solid rgba(255,255,255,0.08)' }}>{m}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-wide font-semibold text-gray-500 mb-1.5">Реквизиты</label>
                <textarea value={payoutDetails} onChange={e => setPayoutDetails(e.target.value)} placeholder={payoutMethod === 'bank' ? 'IBAN, имя, банк' : payoutMethod === 'crypto' ? 'Адрес кошелька' : 'Место получения'} rows={3} className="w-full px-4 py-3 rounded-xl text-sm bg-[#0a0f1a] border border-white/10 text-white outline-none focus:border-amber-500/40 transition-colors resize-none" />
              </div>
              <button onClick={submitPayoutRequest} disabled={payoutSubmitting || !payoutAmount || parseFloat(payoutAmount) < 100 || parseFloat(payoutAmount) > balance} className="w-full py-3 rounded-xl text-sm font-bold bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-300 border border-amber-500/30 disabled:opacity-40">
                {payoutSubmitting ? 'Отправка...' : 'Отправить запрос'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
