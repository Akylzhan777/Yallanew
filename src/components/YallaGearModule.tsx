import { useState, useEffect, useRef } from 'react';
import { X, Camera, Zap, ShoppingBag, MapPin, Clock, Tag, ChevronRight, Plus, Shield, Search, ArrowLeft, Upload, Check, Trash2 } from 'lucide-react';
import { useCreatorAuth } from '../context/CreatorAuthContext';
import { supabase } from '../lib/supabase';

type GearTab = 'rent' | 'market' | 'radar';

interface GearListing {
  id: string;
  title: string;
  photos: string[];
  price: number;
  priceUnit: string;
  city: string;
  owner: string;
  ownerAvatar: string;
  condition?: string;
  tags: string[];
  safeDeal: boolean;
}

interface SosRequest {
  id: string;
  what: string;
  when: string;
  city: string;
  budget: string;
  author: string;
  authorAvatar: string;
  createdAt: string;
  tags: string[];
}

const FALLBACK_RENT: GearListing[] = [
  { id: '1', title: 'Sony FX3 + Sigma 24-70 f/2.8', photos: ['https://images.pexels.com/photos/2873486/pexels-photo-2873486.jpeg?auto=compress&cs=tinysrgb&w=400&h=300&fit=crop'], price: 25000, priceUnit: 'KZT/день', city: 'Алматы', owner: 'Арсен К.', ownerAvatar: 'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop', tags: ['Камера', 'Объектив'], safeDeal: true },
  { id: '2', title: 'DJI Ronin RS3 Pro', photos: ['https://images.pexels.com/photos/3945683/pexels-photo-3945683.jpeg?auto=compress&cs=tinysrgb&w=400&h=300&fit=crop'], price: 12000, priceUnit: 'KZT/день', city: 'Алматы', owner: 'Данияр М.', ownerAvatar: 'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop', tags: ['Стаб'], safeDeal: false },
  { id: '3', title: 'Aputure 600D Pro + Softbox', photos: ['https://images.pexels.com/photos/3379934/pexels-photo-3379934.jpeg?auto=compress&cs=tinysrgb&w=400&h=300&fit=crop'], price: 18000, priceUnit: 'KZT/день', city: 'Астана', owner: 'Алихан Т.', ownerAvatar: 'https://images.pexels.com/photos/614810/pexels-photo-614810.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop', tags: ['Свет'], safeDeal: true },
];

const FALLBACK_MARKET: GearListing[] = [
  { id: 'm1', title: 'Sony A7III (15K пробег)', photos: ['https://images.pexels.com/photos/1787236/pexels-photo-1787236.jpeg?auto=compress&cs=tinysrgb&w=400&h=300&fit=crop'], price: 650000, priceUnit: 'KZT', city: 'Алматы', owner: 'Максим Л.', ownerAvatar: 'https://images.pexels.com/photos/1043471/pexels-photo-1043471.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop', condition: 'Отличное', tags: ['Камера'], safeDeal: true },
  { id: 'm2', title: 'Zhiyun Crane 4 (новый)', photos: ['https://images.pexels.com/photos/3945683/pexels-photo-3945683.jpeg?auto=compress&cs=tinysrgb&w=400&h=300&fit=crop'], price: 280000, priceUnit: 'KZT', city: 'Астана', owner: 'Куаныш А.', ownerAvatar: 'https://images.pexels.com/photos/2182970/pexels-photo-2182970.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop', condition: 'Как новый', tags: ['Стаб'], safeDeal: false },
];

const SOS_REQUESTS: SosRequest[] = [
  { id: 's1', what: 'Sony FX3 + 24-70 на завтра', when: 'Завтра', city: 'Алматы', budget: '25 000 KZT', author: 'Диас Н.', authorAvatar: 'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop', createdAt: '5 мин назад', tags: ['Камера', 'Объектив'] },
  { id: 's2', what: 'Дрон с 4K на свадьбу', when: 'Сегодня', city: 'Астана', budget: '40 000 KZT', author: 'Аслан М.', authorAvatar: 'https://images.pexels.com/photos/91227/pexels-photo-91227.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop', createdAt: '12 мин назад', tags: ['Дрон'] },
  { id: 's3', what: 'Свет Aputure любой + стойки', when: 'Сегодня', city: 'Алматы', budget: '15 000 KZT', author: 'Марат К.', authorAvatar: 'https://images.pexels.com/photos/2340978/pexels-photo-2340978.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop', createdAt: '28 мин назад', tags: ['Свет'] },
  { id: 's4', what: 'Накамерный микрофон + рекордер', when: 'На 1 день', city: 'Шымкент', budget: '10 000 KZT', author: 'Нурлан Б.', authorAvatar: 'https://images.pexels.com/photos/1043471/pexels-photo-1043471.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop', createdAt: '1 час назад', tags: ['Звук'] },
];

const TAG_COLORS: Record<string, string> = {
  'Камера': '#3b82f6',
  'Объектив': '#8b5cf6',
  'Дрон': '#06b6d4',
  'Свет': '#f59e0b',
  'Звук': '#10b981',
  'Стаб': '#ec4899',
};

const PLACEHOLDER_AVATAR = 'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop';
const PLACEHOLDER_PHOTO = 'https://images.pexels.com/photos/2873486/pexels-photo-2873486.jpeg?auto=compress&cs=tinysrgb&w=400&h=300&fit=crop';

function fmtPrice(n: number) { return n.toLocaleString('ru-RU'); }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToListing(l: any, type: 'rent' | 'sell'): GearListing {
  const photos: string[] = Array.isArray(l.photo_urls) ? l.photo_urls : [];
  return {
    id: l.id,
    title: l.title,
    photos: photos.length ? photos : [PLACEHOLDER_PHOTO],
    price: Number(l.price) || 0,
    priceUnit: type === 'rent' ? 'KZT/день' : 'KZT',
    city: l.city || '',
    owner: l.owner_name || 'Видеограф',
    ownerAvatar: PLACEHOLDER_AVATAR,
    condition: type === 'sell' ? l.description?.slice(0, 30) || undefined : undefined,
    tags: l.category ? [l.category] : [],
    safeDeal: !!l.safe_deal,
  };
}

export default function YallaGearModule({ onClose }: { onClose: () => void }) {
  const { user, creatorProfile } = useCreatorAuth();
  const [tab, setTab] = useState<GearTab>('radar');
  const [showSosForm, setShowSosForm] = useState(false);
  const [showAddListing, setShowAddListing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Live listings
  const [rentListings, setRentListings] = useState<GearListing[]>([]);
  const [marketListings, setMarketListings] = useState<GearListing[]>([]);

  // Add-listing form state
  const [formTitle, setFormTitle] = useState('');
  const [formPrice, setFormPrice] = useState('');
  const [formType, setFormType] = useState<'rent' | 'sell'>('rent');
  const [formCity, setFormCity] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formSafeDeal, setFormSafeDeal] = useState(true);
  const [formPhotos, setFormPhotos] = useState<File[]>([]);
  const [formPreviewUrls, setFormPreviewUrls] = useState<string[]>([]);
  const [publishing, setPublishing] = useState(false);
  const [publishDone, setPublishDone] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  // SOS form
  const [sosTag, setSosTag] = useState('');
  const [sosWhen, setSosWhen] = useState('');
  const [sosCity, setSosCity] = useState('');

  const price = parseFloat(formPrice) || 0;
  const safeDealFee = formSafeDeal && price > 0 ? Math.round(price * 0.1) : 0;

  useEffect(() => { loadListings(); }, []);

  async function loadListings() {
    const { data } = await supabase
      .from('gear_listings')
      .select('*')
      .eq('status', 'active')
      .order('created_at', { ascending: false });
    const rows = data ?? [];
    const rent = rows.filter(r => r.listing_type === 'rent').map(r => rowToListing(r, 'rent'));
    const market = rows.filter(r => r.listing_type === 'sell').map(r => rowToListing(r, 'sell'));
    setRentListings(rent.length ? rent : FALLBACK_RENT);
    setMarketListings(market.length ? market : FALLBACK_MARKET);
  }

  function handlePhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    const combined = [...formPhotos, ...files].slice(0, 5);
    setFormPhotos(combined);
    setFormPreviewUrls(combined.map(f => URL.createObjectURL(f)));
    e.target.value = '';
  }

  function removePhoto(idx: number) {
    const next = formPhotos.filter((_, i) => i !== idx);
    setFormPhotos(next);
    setFormPreviewUrls(next.map(f => URL.createObjectURL(f)));
  }

  async function handlePublish() {
    if (!formTitle.trim() || !formPrice || !formCity.trim() || publishing) return;
    setPublishing(true);
    try {
      const uploadedUrls: string[] = [];
      for (const file of formPhotos) {
        const ext = file.name.split('.').pop() ?? 'jpg';
        const path = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
        const { data: up, error: upErr } = await supabase.storage
          .from('gear-photos')
          .upload(path, file, { upsert: false });
        if (!upErr && up) {
          const { data: { publicUrl } } = supabase.storage.from('gear-photos').getPublicUrl(path);
          uploadedUrls.push(publicUrl);
        }
      }

      await supabase.from('gear_listings').insert({
        creator_user_id: user?.id ?? null,
        title: formTitle.trim(),
        description: formDesc.trim(),
        price,
        listing_type: formType,
        city: formCity.trim(),
        category: formCategory,
        photo_urls: uploadedUrls,
        safe_deal: formSafeDeal,
        safe_deal_fee: safeDealFee,
        owner_name: creatorProfile?.display_name || 'Видеограф',
        status: 'active',
      });

      setPublishDone(true);
      setTimeout(async () => {
        setPublishDone(false);
        setShowAddListing(false);
        // Reset form
        setFormTitle(''); setFormPrice(''); setFormCity(''); setFormDesc('');
        setFormCategory(''); setFormSafeDeal(true); setFormPhotos([]); setFormPreviewUrls([]);
        await loadListings();
      }, 1400);
    } catch (e) {
      console.error('Publish error:', e);
    } finally {
      setPublishing(false);
    }
  }

  const tabs: { id: GearTab; label: string; icon: React.ReactNode }[] = [
    { id: 'radar', label: 'Радар', icon: <Zap size={14} /> },
    { id: 'rent', label: 'Аренда', icon: <Camera size={14} /> },
    { id: 'market', label: 'Маркет', icon: <ShoppingBag size={14} /> },
  ];

  const filteredRent = rentListings.filter(l => !searchQuery || l.title.toLowerCase().includes(searchQuery.toLowerCase()) || l.city.toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredMarket = marketListings.filter(l => !searchQuery || l.title.toLowerCase().includes(searchQuery.toLowerCase()) || l.city.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="fixed inset-0 z-[90] flex flex-col" style={{ background: '#080d16' }}>
      {/* Header */}
      <div className="flex-shrink-0 px-4 pt-4 pb-3 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <ArrowLeft size={16} className="text-gray-400" />
          </button>
          <div>
            <h1 className="text-base font-bold text-white">Yalla Gear</h1>
            <p className="text-[10px] text-gray-500">Аренда, продажа и срочные запросы</p>
          </div>
        </div>
        <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500" style={{ background: 'rgba(255,255,255,0.04)' }}>
          <X size={15} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex-shrink-0 flex items-center gap-1 px-4 py-2.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
        {tabs.map(t => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all"
              style={{
                background: active ? (t.id === 'radar' ? 'rgba(239,68,68,0.12)' : 'rgba(251,191,36,0.1)') : 'rgba(255,255,255,0.03)',
                border: `1px solid ${active ? (t.id === 'radar' ? 'rgba(239,68,68,0.3)' : 'rgba(251,191,36,0.2)') : 'rgba(255,255,255,0.06)'}`,
                color: active ? (t.id === 'radar' ? '#f87171' : '#fbbf24') : '#64748b',
              }}
            >
              {t.icon}
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* ── RADAR TAB ─────────────────────────────────────────────────── */}
        {tab === 'radar' && (
          <div className="px-4 pt-4 pb-24">
            <button
              onClick={() => setShowSosForm(true)}
              className="w-full flex items-center gap-3 px-5 py-4 rounded-2xl mb-5 transition-all active:scale-[0.98]"
              style={{ background: 'linear-gradient(135deg, rgba(239,68,68,0.15), rgba(239,68,68,0.06))', border: '1px solid rgba(239,68,68,0.3)' }}
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(239,68,68,0.2)' }}>
                <Zap size={18} className="text-red-400" fill="currentColor" />
              </div>
              <div className="text-left flex-1">
                <div className="text-sm font-bold text-white">Срочно нужна техника!</div>
                <div className="text-[10px] text-red-300/70 mt-0.5">Опубликуй запрос — видеографы рядом увидят</div>
              </div>
              <ChevronRight size={16} className="text-red-400/60" />
            </button>

            <div className="flex items-center gap-2 mb-3">
              <Zap size={12} className="text-red-400" />
              <span className="text-xs font-bold text-gray-300">Горящие запросы</span>
              <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold bg-red-500/10 text-red-400 border border-red-500/20">{SOS_REQUESTS.length}</span>
            </div>

            <div className="space-y-3">
              {SOS_REQUESTS.map(req => (
                <div key={req.id} className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div className="flex items-start gap-3">
                    <img src={req.authorAvatar} alt="" className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold text-white">{req.author}</span>
                        <span className="text-[9px] text-gray-600">{req.createdAt}</span>
                      </div>
                      <p className="text-sm text-gray-200 leading-snug mb-2">{req.what}</p>
                      <div className="flex flex-wrap items-center gap-1.5 mb-2.5">
                        {req.tags.map(tag => (
                          <span key={tag} className="text-[9px] font-bold px-2 py-0.5 rounded-lg" style={{ background: `${TAG_COLORS[tag] ?? '#64748b'}18`, color: TAG_COLORS[tag] ?? '#64748b', border: `1px solid ${TAG_COLORS[tag] ?? '#64748b'}30` }}>
                            {tag}
                          </span>
                        ))}
                        <span className="text-[9px] font-semibold px-2 py-0.5 rounded-lg bg-white/[0.04] text-gray-400 border border-white/[0.08]">
                          <Clock size={8} className="inline mr-0.5" />{req.when}
                        </span>
                        <span className="text-[9px] font-semibold px-2 py-0.5 rounded-lg bg-white/[0.04] text-gray-400 border border-white/[0.08]">
                          <MapPin size={8} className="inline mr-0.5" />{req.city}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-amber-400">{req.budget}</span>
                        <button className="px-3 py-1.5 rounded-lg text-[10px] font-bold bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 transition-all active:scale-95">
                          Предложить свою
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── RENT TAB ──────────────────────────────────────────────────── */}
        {tab === 'rent' && (
          <div className="px-4 pt-4 pb-24">
            <div className="relative mb-4">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Поиск техники..."
                className="w-full pl-9 pr-4 py-2.5 rounded-xl text-xs text-white bg-white/[0.04] border border-white/[0.08] outline-none placeholder-gray-600 focus:border-amber-500/30 transition-colors"
              />
            </div>

            <div className="space-y-3">
              {filteredRent.map(item => (
                <div key={item.id} className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div className="flex gap-3 p-3">
                    <img src={item.photos[0]} alt={item.title} className="w-24 h-20 rounded-xl object-cover flex-shrink-0" />
                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      <div>
                        <h3 className="text-xs font-bold text-white leading-tight mb-1 truncate">{item.title}</h3>
                        <div className="flex flex-wrap gap-1 mb-1.5">
                          {item.tags.map(tag => (
                            <span key={tag} className="text-[8px] font-bold px-1.5 py-0.5 rounded" style={{ background: `${TAG_COLORS[tag] ?? '#64748b'}18`, color: TAG_COLORS[tag] ?? '#64748b' }}>
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-sm font-bold text-amber-400">{fmtPrice(item.price)}</span>
                          <span className="text-[9px] text-gray-500 ml-1">{item.priceUnit}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <MapPin size={9} className="text-gray-500" />
                          <span className="text-[9px] text-gray-500">{item.city}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 px-3 pb-3">
                    <img src={item.ownerAvatar} alt="" className="w-5 h-5 rounded-full object-cover" />
                    <span className="text-[10px] text-gray-400">{item.owner}</span>
                    {item.safeDeal && (
                      <div className="ml-auto flex items-center gap-1">
                        <Shield size={9} className="text-emerald-400" />
                        <span className="text-[9px] font-bold text-emerald-400">Safe Deal</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {filteredRent.length === 0 && (
                <div className="text-center py-12 text-gray-500 text-xs">Объявлений не найдено</div>
              )}
            </div>
          </div>
        )}

        {/* ── MARKET TAB ────────────────────────────────────────────────── */}
        {tab === 'market' && (
          <div className="px-4 pt-4 pb-24">
            <div className="relative mb-4">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Поиск объявлений..."
                className="w-full pl-9 pr-4 py-2.5 rounded-xl text-xs text-white bg-white/[0.04] border border-white/[0.08] outline-none placeholder-gray-600 focus:border-amber-500/30 transition-colors"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              {filteredMarket.map(item => (
                <div key={item.id} className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div className="relative">
                    <img src={item.photos[0]} alt={item.title} className="w-full h-28 object-cover" />
                    {item.condition && (
                      <span className="absolute top-2 left-2 text-[8px] font-bold px-2 py-0.5 rounded-lg bg-black/70 text-emerald-400 backdrop-blur-sm">
                        {item.condition}
                      </span>
                    )}
                    {item.safeDeal && (
                      <span className="absolute top-2 right-2 text-[8px] font-bold px-1.5 py-0.5 rounded-lg bg-black/70 text-emerald-400 backdrop-blur-sm flex items-center gap-0.5">
                        <Shield size={8} />SD
                      </span>
                    )}
                  </div>
                  <div className="p-2.5">
                    <h3 className="text-[10px] font-bold text-white leading-tight mb-1.5 line-clamp-2">{item.title}</h3>
                    <div className="text-sm font-bold text-amber-400 mb-1">{fmtPrice(item.price)} <span className="text-[9px] text-gray-500 font-normal">{item.priceUnit}</span></div>
                    <div className="flex items-center gap-1">
                      <MapPin size={8} className="text-gray-600" />
                      <span className="text-[9px] text-gray-500">{item.city}</span>
                    </div>
                  </div>
                </div>
              ))}
              {filteredMarket.length === 0 && (
                <div className="col-span-2 text-center py-12 text-gray-500 text-xs">Объявлений не найдено</div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* FAB — Add listing */}
      {(tab === 'rent' || tab === 'market') && (
        <button
          onClick={() => { setFormType(tab === 'rent' ? 'rent' : 'sell'); setShowAddListing(true); }}
          className="fixed bottom-6 right-5 z-[100] w-14 h-14 rounded-2xl flex items-center justify-center shadow-2xl transition-all active:scale-90"
          style={{ background: 'linear-gradient(135deg, #fbbf24, #f59e0b)', boxShadow: '0 8px 32px rgba(251,191,36,0.3)' }}
        >
          <Plus size={22} className="text-black" strokeWidth={3} />
        </button>
      )}

      {/* SOS Quick Form */}
      {showSosForm && (
        <div className="fixed inset-0 z-[110] flex items-end justify-center" onClick={() => setShowSosForm(false)}>
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <div className="relative w-full max-w-lg rounded-t-3xl p-5 animate-[slideUp_0.3s_ease-out]" style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)' }} onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 bg-gray-600 rounded-full mx-auto mb-4" />
            <div className="flex items-center gap-2 mb-4">
              <Zap size={16} className="text-red-400" fill="currentColor" />
              <h3 className="text-base font-bold text-white">Срочный запрос</h3>
            </div>
            <div className="mb-3">
              <label className="text-[10px] font-bold text-gray-400 mb-1.5 block uppercase tracking-wider">Что нужно?</label>
              <div className="flex flex-wrap gap-2">
                {['Камера', 'Объектив', 'Дрон', 'Свет', 'Звук', 'Стаб'].map(tag => (
                  <button key={tag} onClick={() => setSosTag(sosTag === tag ? '' : tag)} className="px-3 py-2 rounded-xl text-xs font-bold transition-all"
                    style={{ background: sosTag === tag ? `${TAG_COLORS[tag]}20` : 'rgba(255,255,255,0.04)', border: `1px solid ${sosTag === tag ? TAG_COLORS[tag] + '50' : 'rgba(255,255,255,0.08)'}`, color: sosTag === tag ? TAG_COLORS[tag] : '#64748b' }}>
                    {tag}
                  </button>
                ))}
              </div>
            </div>
            <div className="mb-3">
              <label className="text-[10px] font-bold text-gray-400 mb-1.5 block uppercase tracking-wider">На когда?</label>
              <div className="flex gap-2">
                {['Сегодня', 'Завтра', 'На 1 день'].map(opt => (
                  <button key={opt} onClick={() => setSosWhen(sosWhen === opt ? '' : opt)} className="px-3 py-2 rounded-xl text-xs font-bold transition-all"
                    style={{ background: sosWhen === opt ? 'rgba(239,68,68,0.12)' : 'rgba(255,255,255,0.04)', border: `1px solid ${sosWhen === opt ? 'rgba(239,68,68,0.4)' : 'rgba(255,255,255,0.08)'}`, color: sosWhen === opt ? '#f87171' : '#64748b' }}>
                    <Clock size={10} className="inline mr-1" />{opt}
                  </button>
                ))}
              </div>
            </div>
            <div className="mb-5">
              <label className="text-[10px] font-bold text-gray-400 mb-1.5 block uppercase tracking-wider">Город</label>
              <div className="flex gap-2">
                {['Алматы', 'Астана', 'Шымкент'].map(c => (
                  <button key={c} onClick={() => setSosCity(sosCity === c ? '' : c)} className="px-3 py-2 rounded-xl text-xs font-bold transition-all"
                    style={{ background: sosCity === c ? 'rgba(251,191,36,0.1)' : 'rgba(255,255,255,0.04)', border: `1px solid ${sosCity === c ? 'rgba(251,191,36,0.3)' : 'rgba(255,255,255,0.08)'}`, color: sosCity === c ? '#fbbf24' : '#64748b' }}>
                    <MapPin size={10} className="inline mr-1" />{c}
                  </button>
                ))}
              </div>
            </div>
            <button onClick={() => setShowSosForm(false)} className="w-full py-3.5 rounded-2xl text-sm font-bold transition-all active:scale-[0.98]" style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)', color: '#fff' }}>
              Опубликовать запрос
            </button>
          </div>
        </div>
      )}

      {/* ── Add Listing Form ────────────────────────────────────────────── */}
      {showAddListing && (
        <div className="fixed inset-0 z-[110] flex items-end justify-center" onClick={() => !publishing && setShowAddListing(false)}>
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <div
            className="relative w-full max-w-lg rounded-t-3xl animate-[slideUp_0.3s_ease-out] overflow-y-auto"
            style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)', maxHeight: '90vh' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="px-5 pt-5 pb-6">
              <div className="w-10 h-1 bg-gray-600 rounded-full mx-auto mb-4" />
              <div className="flex items-center gap-2 mb-5">
                <Tag size={16} className="text-amber-400" />
                <h3 className="text-base font-bold text-white">Добавить объявление</h3>
              </div>

              {/* Photo upload */}
              <div className="mb-4">
                <label className="text-[10px] font-bold text-gray-400 mb-2 block uppercase tracking-wider">
                  Фото техники <span className="text-gray-600 normal-case">(до 5 шт)</span>
                </label>
                <div className="flex gap-2 flex-wrap">
                  {formPreviewUrls.map((url, i) => (
                    <div key={i} className="relative w-16 h-16 rounded-xl overflow-hidden flex-shrink-0" style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
                      <img src={url} alt="" className="w-full h-full object-cover" />
                      <button
                        onClick={() => removePhoto(i)}
                        className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full flex items-center justify-center"
                        style={{ background: 'rgba(0,0,0,0.7)' }}
                      >
                        <Trash2 size={9} className="text-red-400" />
                      </button>
                    </div>
                  ))}
                  {formPhotos.length < 5 && (
                    <button
                      onClick={() => photoInputRef.current?.click()}
                      className="w-16 h-16 rounded-xl flex flex-col items-center justify-center gap-1 flex-shrink-0 transition-all active:scale-95"
                      style={{ background: 'rgba(255,255,255,0.04)', border: '1px dashed rgba(255,255,255,0.15)' }}
                    >
                      <Upload size={14} className="text-gray-500" />
                      <span className="text-[8px] text-gray-600">Фото</span>
                    </button>
                  )}
                  <input
                    ref={photoInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handlePhotoSelect}
                  />
                </div>
              </div>

              <div className="space-y-3 mb-4">
                {/* Type toggle */}
                <div className="grid grid-cols-2 gap-2">
                  {(['rent', 'sell'] as const).map(t => (
                    <button
                      key={t}
                      onClick={() => setFormType(t)}
                      className="py-2.5 rounded-xl text-xs font-bold transition-all"
                      style={{
                        background: formType === t ? 'rgba(251,191,36,0.12)' : 'rgba(255,255,255,0.04)',
                        border: `1px solid ${formType === t ? 'rgba(251,191,36,0.35)' : 'rgba(255,255,255,0.08)'}`,
                        color: formType === t ? '#fbbf24' : '#64748b',
                      }}
                    >
                      {t === 'rent' ? 'Аренда / день' : 'Продажа'}
                    </button>
                  ))}
                </div>

                <input
                  value={formTitle}
                  onChange={e => setFormTitle(e.target.value)}
                  placeholder="Название (Sony FX3 Body)"
                  className="w-full px-4 py-3 rounded-xl text-sm bg-white/[0.04] border border-white/10 text-white outline-none placeholder-gray-600 focus:border-amber-500/40 transition-colors"
                />

                <div className="grid grid-cols-2 gap-3">
                  <input
                    value={formPrice}
                    onChange={e => setFormPrice(e.target.value)}
                    placeholder={formType === 'rent' ? 'Цена KZT/день' : 'Цена KZT'}
                    type="number"
                    className="w-full px-4 py-3 rounded-xl text-sm bg-white/[0.04] border border-white/10 text-white outline-none placeholder-gray-600 focus:border-amber-500/40 transition-colors"
                  />
                  <select
                    value={formCategory}
                    onChange={e => setFormCategory(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl text-sm bg-[#0a0f1a] border border-white/10 text-gray-400 outline-none focus:border-amber-500/40 appearance-none"
                  >
                    <option value="">Категория</option>
                    {['Камера', 'Объектив', 'Дрон', 'Свет', 'Звук', 'Стаб'].map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <select
                  value={formCity}
                  onChange={e => setFormCity(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl text-sm bg-[#0a0f1a] border border-white/10 text-gray-400 outline-none focus:border-amber-500/40 appearance-none"
                >
                  <option value="">Выберите город</option>
                  {['Алматы', 'Астана', 'Шымкент', 'Атырау', 'Актобе', 'Павлодар', 'Семей', 'Тараз'].map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>

                <textarea
                  value={formDesc}
                  onChange={e => setFormDesc(e.target.value)}
                  placeholder="Состояние, комплектация, условия аренды..."
                  rows={2}
                  className="w-full px-4 py-3 rounded-xl text-sm bg-white/[0.04] border border-white/10 text-white outline-none placeholder-gray-600 focus:border-amber-500/40 resize-none transition-colors"
                />
              </div>

              {/* Safe Deal toggle */}
              <button
                onClick={() => setFormSafeDeal(v => !v)}
                className="w-full rounded-xl p-3.5 mb-1.5 transition-all"
                style={{ background: formSafeDeal ? 'rgba(16,185,129,0.06)' : 'rgba(255,255,255,0.03)', border: `1px solid ${formSafeDeal ? 'rgba(16,185,129,0.25)' : 'rgba(255,255,255,0.08)'}` }}
              >
                <div className="flex items-center gap-3">
                  <Shield size={15} className={formSafeDeal ? 'text-emerald-400' : 'text-gray-600'} />
                  <div className="flex-1 text-left">
                    <div className={`text-[11px] font-bold ${formSafeDeal ? 'text-emerald-400' : 'text-gray-500'}`}>Safe Deal Guarantee</div>
                    <div className="text-[9px] text-gray-600">Защита сделки — платформа берёт 10% комиссию</div>
                  </div>
                  {/* Toggle pill */}
                  <div
                    className="w-10 h-5.5 rounded-full flex items-center px-0.5 transition-all flex-shrink-0"
                    style={{
                      background: formSafeDeal ? 'rgba(16,185,129,0.35)' : 'rgba(255,255,255,0.08)',
                      minWidth: 40,
                      height: 22,
                      position: 'relative',
                    }}
                  >
                    <div
                      className="w-4 h-4 rounded-full transition-all"
                      style={{
                        background: formSafeDeal ? '#10b981' : '#475569',
                        transform: formSafeDeal ? 'translateX(18px)' : 'translateX(0)',
                      }}
                    />
                  </div>
                </div>
              </button>

              {/* Fee breakdown — visible when Safe Deal is on and price entered */}
              {formSafeDeal && price > 0 && (
                <div className="rounded-xl px-4 py-3 mb-4" style={{ background: 'rgba(16,185,129,0.04)', border: '1px solid rgba(16,185,129,0.12)' }}>
                  <div className="flex justify-between text-[10px] mb-1">
                    <span className="text-gray-500">Сумма сделки</span>
                    <span className="text-white font-semibold">{fmtPrice(price)} KZT</span>
                  </div>
                  <div className="flex justify-between text-[10px] mb-1">
                    <span className="text-gray-500">Комиссия Safe Deal (10%)</span>
                    <span className="text-red-400 font-semibold">− {fmtPrice(safeDealFee)} KZT</span>
                  </div>
                  <div className="flex justify-between text-[10px] pt-1" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                    <span className="text-emerald-400 font-bold">Вы получите</span>
                    <span className="text-emerald-400 font-bold">{fmtPrice(price - safeDealFee)} KZT</span>
                  </div>
                </div>
              )}

              <button
                onClick={handlePublish}
                disabled={publishing || publishDone || !formTitle.trim() || !formPrice || !formCity}
                className="w-full py-3.5 rounded-2xl text-sm font-bold transition-all active:scale-[0.98] disabled:opacity-50"
                style={{
                  background: publishDone ? 'rgba(16,185,129,0.15)' : 'linear-gradient(135deg, #fbbf24, #f59e0b)',
                  color: publishDone ? '#10b981' : '#0F1520',
                  border: publishDone ? '1px solid rgba(16,185,129,0.35)' : 'none',
                }}
              >
                {publishDone ? (
                  <span className="flex items-center justify-center gap-2"><Check size={15} /> Опубликовано!</span>
                ) : publishing ? 'Публикация...' : 'Опубликовать'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </div>
  );
}
