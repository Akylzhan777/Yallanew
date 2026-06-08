import { useState, useEffect } from 'react';
import { MapPin, Star, CheckCircle, ChevronRight, ArrowLeft, Search, Filter, Users } from 'lucide-react';
import { supabase } from '../lib/supabase';

const NICHE_MAP: Record<string, { label: string; labelRu: string; type: string }> = {
  videographers: { label: 'Videographers',  labelRu: 'Видеографы',    type: 'videographer' },
  photographers: { label: 'Photographers',  labelRu: 'Фотографы',     type: 'photographer' },
  ugc:           { label: 'UGC Creators',   labelRu: 'UGC-креаторы',  type: 'ugc' },
  bloggers:      { label: 'Bloggers',       labelRu: 'Блогеры',       type: 'blogger' },
  influencers:   { label: 'Influencers',    labelRu: 'Инфлюенсеры',   type: 'influencer' },
  models:        { label: 'Models',         labelRu: 'Модели',         type: 'model' },
  editors:       { label: 'Video Editors',  labelRu: 'Видеомонтажёры', type: 'editor' },
  creators:      { label: 'Content Creators', labelRu: 'Контент-мейкеры', type: '' },
};

const CITY_MAP: Record<string, { label: string; labelRu: string; region: 'UAE' | 'KZ' }> = {
  // UAE
  dubai:       { label: 'Dubai',       labelRu: 'Дубай',      region: 'UAE' },
  abudhabi:    { label: 'Abu Dhabi',   labelRu: 'Абу-Даби',   region: 'UAE' },
  sharjah:     { label: 'Sharjah',     labelRu: 'Шарджа',     region: 'UAE' },
  // KZ
  almaty:      { label: 'Almaty',      labelRu: 'Алматы',     region: 'KZ' },
  astana:      { label: 'Astana',      labelRu: 'Астана',     region: 'KZ' },
  shymkent:    { label: 'Shymkent',   labelRu: 'Шымкент',    region: 'KZ' },
  karaganda:   { label: 'Karaganda',  labelRu: 'Қарағанды',  region: 'KZ' },
  aktobe:      { label: 'Aktobe',     labelRu: 'Ақтөбе',     region: 'KZ' },
  ust:         { label: 'Ust-Kamenogorsk', labelRu: 'Өскемен', region: 'KZ' },
  atyrau:      { label: 'Atyrau',     labelRu: 'Атырау',     region: 'KZ' },
  taraz:       { label: 'Taraz',      labelRu: 'Тараз',      region: 'KZ' },
};

interface CreatorCard {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  creator_type: string;
  location: string | null;
  followers_count: number | null;
  rating: number | null;
  is_verified: boolean;
  packages?: Array<{ name: string; price: number }>;
}

interface Props {
  niche: string;
  city: string;
}

function applyGeoSeo(niche: string, city: string) {
  const nicheInfo = NICHE_MAP[niche];
  const cityInfo = CITY_MAP[city];
  if (!nicheInfo || !cityInfo) return;

  const isKZ = cityInfo.region === 'KZ';
  const SITE = 'Yalla Influencers';

  if (isKZ) {
    const title = `Найти ${nicheInfo.labelRu} в ${cityInfo.labelRu} | Биржа ${SITE}`;
    const desc = `Заказать ${nicheInfo.labelRu.toLowerCase()} в ${cityInfo.labelRu}: съёмка Reels, UGC, реклама. Проверенные специалисты, безопасная оплата через эскроу. Биржа ${SITE}.`;
    document.title = title;
    document.querySelector<HTMLMetaElement>('meta[name="description"]')?.setAttribute('content', desc);
    document.querySelector<HTMLMetaElement>('meta[name="robots"]')?.setAttribute('content', 'index, follow');
    let canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) { canonical = document.createElement('link'); canonical.rel = 'canonical'; document.head.appendChild(canonical); }
    canonical.href = `https://yallainfluencers.com/${niche}/${city}`;
    document.documentElement.setAttribute('lang', 'ru');
  } else {
    const title = `Hire Top ${nicheInfo.label} in ${cityInfo.label} | ${SITE}`;
    const desc = `Find and hire the best ${nicheInfo.label.toLowerCase()}, UGC creators, and influencers in ${cityInfo.label}, UAE. Verified professionals, secure payments. ${SITE}.`;
    document.title = title;
    document.querySelector<HTMLMetaElement>('meta[name="description"]')?.setAttribute('content', desc);
    document.querySelector<HTMLMetaElement>('meta[name="robots"]')?.setAttribute('content', 'index, follow');
    let canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) { canonical = document.createElement('link'); canonical.rel = 'canonical'; document.head.appendChild(canonical); }
    canonical.href = `https://yallainfluencers.com/${niche}/${city}`;
    document.documentElement.setAttribute('lang', 'en');
  }
}

export default function GeoLandingPage({ niche, city }: Props) {
  const nicheInfo = NICHE_MAP[niche];
  const cityInfo = CITY_MAP[city];
  const [creators, setCreators] = useState<CreatorCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const isKZ = cityInfo?.region === 'KZ';

  useEffect(() => {
    if (!nicheInfo || !cityInfo) return;
    applyGeoSeo(niche, city);

    (async () => {
      setLoading(true);
      let q = supabase
        .from('creator_profiles')
        .select('id, username, display_name, avatar_url, creator_type, location, followers_count, rating, is_verified, packages')
        .eq('is_published', true)
        .eq('is_hidden', false)
        .neq('status', 'banned')
        .not('username', 'is', null);

      if (nicheInfo.type) {
        q = q.eq('creator_type', nicheInfo.type);
      }

      const { data } = await q.limit(24);
      let rows = (data ?? []) as CreatorCard[];

      // Client-side location filter: try city label match
      if (cityInfo.label) {
        const lbl = cityInfo.label.toLowerCase();
        const lblRu = cityInfo.labelRu.toLowerCase();
        const located = rows.filter(r =>
          r.location?.toLowerCase().includes(lbl) ||
          r.location?.toLowerCase().includes(lblRu)
        );
        // If enough results use location filter, otherwise show all (avoids empty page)
        if (located.length >= 3) rows = located;
      }

      setCreators(rows);
      setLoading(false);
    })();
  }, [niche, city]);

  // If route is invalid, redirect home
  if (!nicheInfo || !cityInfo) {
    window.location.replace('/');
    return null;
  }

  const filtered = search
    ? creators.filter(c =>
        c.display_name.toLowerCase().includes(search.toLowerCase()) ||
        c.location?.toLowerCase().includes(search.toLowerCase())
      )
    : creators;

  const currency = isKZ ? 'KZT' : 'AED';
  const h1 = isKZ
    ? `${nicheInfo.labelRu} в ${cityInfo.labelRu}`
    : `${nicheInfo.label} in ${cityInfo.label}`;
  const subTitle = isKZ
    ? `Найдите и закажите лучших ${nicheInfo.labelRu.toLowerCase()} — безопасная оплата, гарантия результата`
    : `Hire verified ${nicheInfo.label.toLowerCase()} for your brand campaigns — secure escrow, top talent`;

  return (
    <div className="min-h-screen" style={{ background: '#080d16' }}>
      {/* Back nav */}
      <div className="sticky top-0 z-20 px-4 py-3 flex items-center gap-3"
        style={{ background: 'rgba(8,13,22,0.95)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <button onClick={() => window.location.replace('/')}
          className="p-2 rounded-xl flex items-center justify-center transition-all hover:brightness-125"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#94a3b8' }}>
          <ArrowLeft size={16} />
        </button>
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm font-bold text-white truncate">{h1}</span>
          <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
            style={{ background: isKZ ? 'rgba(56,189,248,0.12)' : 'rgba(0,196,140,0.12)', color: isKZ ? '#38bdf8' : '#00C48C' }}>
            {isKZ ? '🇰🇿 KZ' : '🇦🇪 UAE'}
          </span>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Hero */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <MapPin size={14} style={{ color: isKZ ? '#38bdf8' : '#00C48C' }} />
            <span className="text-xs font-semibold" style={{ color: isKZ ? '#38bdf8' : '#00C48C' }}>
              {isKZ ? cityInfo.labelRu : cityInfo.label}
            </span>
          </div>
          <h1 className="text-2xl font-black text-white mb-2">{h1}</h1>
          <p className="text-sm" style={{ color: '#64748b' }}>{subTitle}</p>
        </div>

        {/* Stats bar */}
        <div className="flex items-center gap-4 mb-6 flex-wrap">
          <div className="flex items-center gap-2 text-sm" style={{ color: '#475569' }}>
            <Users size={14} />
            <span>{loading ? '...' : `${creators.length}${creators.length >= 24 ? '+' : ''} ${isKZ ? 'специалистов' : 'specialists'}`}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-medium" style={{ color: '#00C48C' }}>{isKZ ? 'Принимают заказы' : 'Accepting bookings'}</span>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: '#475569' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={isKZ ? 'Поиск по имени или городу...' : 'Search by name or location...'}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm text-white placeholder:text-gray-600 outline-none transition-all focus:ring-1 focus:ring-sky-500/40"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
          />
        </div>

        {/* Niche chips */}
        <div className="flex gap-2 flex-wrap mb-6">
          {Object.entries(NICHE_MAP).map(([slug, info]) => (
            <button
              key={slug}
              onClick={() => window.location.href = `/${slug}/${city}`}
              className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all hover:brightness-125"
              style={{
                background: slug === niche ? (isKZ ? 'rgba(56,189,248,0.15)' : 'rgba(0,196,140,0.15)') : 'rgba(255,255,255,0.04)',
                color: slug === niche ? (isKZ ? '#38bdf8' : '#00C48C') : '#475569',
                border: `1px solid ${slug === niche ? (isKZ ? 'rgba(56,189,248,0.3)' : 'rgba(0,196,140,0.3)') : 'rgba(255,255,255,0.08)'}`,
              }}
            >
              {isKZ ? info.labelRu : info.label}
            </button>
          ))}
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-2xl overflow-hidden animate-pulse"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', height: 220 }} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl p-12 text-center" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <Filter size={28} className="mx-auto mb-3" style={{ color: '#1e293b' }} />
            <p className="text-sm font-semibold text-white mb-1">
              {isKZ ? 'Специалисты не найдены' : 'No specialists found'}
            </p>
            <p className="text-xs" style={{ color: '#475569' }}>
              {isKZ ? 'Попробуйте изменить запрос или выбрать другую нишу' : 'Try a different search or browse another niche'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(creator => {
              const minPrice = creator.packages && creator.packages.length > 0
                ? Math.min(...creator.packages.map((p: { name: string; price: number }) => p.price))
                : null;
              return (
                <a
                  key={creator.id}
                  href={`/${creator.username}`}
                  className="group rounded-2xl overflow-hidden flex flex-col transition-all hover:scale-[1.02] hover:shadow-2xl"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', textDecoration: 'none' }}
                >
                  {/* Avatar */}
                  <div className="relative h-40 overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)' }}>
                    {creator.avatar_url ? (
                      <img src={creator.avatar_url} alt={creator.display_name} className="w-full h-full object-cover" loading="lazy" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-3xl font-black"
                        style={{ color: isKZ ? '#38bdf8' : '#00C48C', background: isKZ ? 'rgba(56,189,248,0.05)' : 'rgba(0,196,140,0.05)' }}>
                        {creator.display_name[0]?.toUpperCase()}
                      </div>
                    )}
                    {creator.is_verified && (
                      <div className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center"
                        style={{ background: 'rgba(0,196,140,0.9)', backdropFilter: 'blur(8px)' }}>
                        <CheckCircle size={13} color="#fff" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-4 flex-1 flex flex-col gap-2">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-bold text-white truncate">{creator.display_name}</span>
                      </div>
                      {creator.location && (
                        <div className="flex items-center gap-1 mt-0.5">
                          <MapPin size={11} style={{ color: '#475569' }} />
                          <span className="text-xs truncate" style={{ color: '#475569' }}>{creator.location}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between mt-auto">
                      {creator.rating ? (
                        <div className="flex items-center gap-1">
                          <Star size={11} style={{ color: '#f59e0b' }} fill="#f59e0b" />
                          <span className="text-xs font-semibold" style={{ color: '#f59e0b' }}>{Number(creator.rating).toFixed(1)}</span>
                        </div>
                      ) : <div />}
                      {minPrice ? (
                        <span className="text-xs font-bold" style={{ color: isKZ ? '#38bdf8' : '#00C48C' }}>
                          {isKZ ? 'от ' : 'from '}{minPrice.toLocaleString()} {currency}
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-xs font-semibold" style={{ color: isKZ ? '#38bdf8' : '#00C48C' }}>
                          {isKZ ? 'Открыт' : 'Open'} <ChevronRight size={11} />
                        </span>
                      )}
                    </div>
                  </div>
                </a>
              );
            })}
          </div>
        )}

        {/* SEO text block */}
        <div className="mt-12 rounded-2xl p-6" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
          {isKZ ? (
            <>
              <h2 className="text-base font-bold text-white mb-3">Как заказать {nicheInfo.labelRu.toLowerCase()} в {cityInfo.labelRu}?</h2>
              <p className="text-sm leading-relaxed" style={{ color: '#475569' }}>
                Yalla Influencers — биржа для поиска и найма профессиональных {nicheInfo.labelRu.toLowerCase()} в {cityInfo.labelRu} и по всему Казахстану.
                Все специалисты проверены, оплата через систему эскроу. Вы платите только после получения готового результата.
                Оставьте заявку напрямую через профиль исполнителя — без посредников, с защитой сделки.
              </p>
            </>
          ) : (
            <>
              <h2 className="text-base font-bold text-white mb-3">How to hire {nicheInfo.label.toLowerCase()} in {cityInfo.label}?</h2>
              <p className="text-sm leading-relaxed" style={{ color: '#475569' }}>
                Yalla Influencers is the leading marketplace for finding and hiring professional {nicheInfo.label.toLowerCase()} in {cityInfo.label} and across the UAE.
                All specialists are verified. Payments are secured through escrow — you only pay when satisfied with the result.
                Browse profiles, review portfolios, and book directly — no middlemen.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
