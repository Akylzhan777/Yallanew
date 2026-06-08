import { useState, useEffect } from 'react';
import { MapPin, Star, CheckCircle, ChevronRight, ArrowLeft, Search, Users, Globe, Tag } from 'lucide-react';
import { supabase } from '../lib/supabase';

// ── Slug lookup tables ─────────────────────────────────────────────────────────

export const CREATOR_TYPE_SLUGS: Record<string, { label: string; labelRu: string; dbType: string | null }> = {
  'ugc-creators':    { label: 'UGC Creators',      labelRu: 'UGC-креаторы',       dbType: 'ugc' },
  'influencers':     { label: 'Influencers',        labelRu: 'Инфлюенсеры',        dbType: 'influencer' },
  'bloggers':        { label: 'Bloggers',           labelRu: 'Блогеры',             dbType: 'blogger' },
  'videographers':   { label: 'Videographers',      labelRu: 'Видеографы',          dbType: 'videographer' },
  'photographers':   { label: 'Photographers',      labelRu: 'Фотографы',           dbType: 'photographer' },
  'models':          { label: 'Models',             labelRu: 'Модели',              dbType: 'model' },
  'editors':         { label: 'Video Editors',      labelRu: 'Видеомонтажёры',      dbType: 'editor' },
  'creators':        { label: 'Content Creators',   labelRu: 'Контент-мейкеры',     dbType: null },
};

export const LOCATION_SLUGS: Record<string, { label: string; labelRu: string; country: string; region: 'UAE' | 'KZ'; searchTerms: string[] }> = {
  // UAE
  'dubai':         { label: 'Dubai',         labelRu: 'Дубай',       country: 'UAE', region: 'UAE', searchTerms: ['dubai', 'дубай'] },
  'abu-dhabi':     { label: 'Abu Dhabi',     labelRu: 'Абу-Даби',    country: 'UAE', region: 'UAE', searchTerms: ['abu dhabi', 'abudhabi', 'абу-даби'] },
  'sharjah':       { label: 'Sharjah',       labelRu: 'Шарджа',      country: 'UAE', region: 'UAE', searchTerms: ['sharjah', 'шарджа'] },
  'uae':           { label: 'UAE',           labelRu: 'ОАЭ',         country: 'UAE', region: 'UAE', searchTerms: ['uae', 'emirates', 'оаэ', 'dubai', 'abu dhabi'] },
  // KZ
  'almaty':        { label: 'Almaty',        labelRu: 'Алматы',      country: 'Kazakhstan', region: 'KZ', searchTerms: ['almaty', 'алматы'] },
  'astana':        { label: 'Astana',        labelRu: 'Астана',      country: 'Kazakhstan', region: 'KZ', searchTerms: ['astana', 'астана', 'nur-sultan', 'нур-султан'] },
  'shymkent':      { label: 'Shymkent',      labelRu: 'Шымкент',     country: 'Kazakhstan', region: 'KZ', searchTerms: ['shymkent', 'шымкент'] },
  'karaganda':     { label: 'Karaganda',     labelRu: 'Қарағанды',   country: 'Kazakhstan', region: 'KZ', searchTerms: ['karaganda', 'қарағанды', 'карагanda'] },
  'aktobe':        { label: 'Aktobe',        labelRu: 'Ақтөбе',      country: 'Kazakhstan', region: 'KZ', searchTerms: ['aktobe', 'актюбинск', 'ақтөбе'] },
  'kazakhstan':    { label: 'Kazakhstan',    labelRu: 'Казахстан',   country: 'Kazakhstan', region: 'KZ', searchTerms: ['kazakhstan', 'казахстан', 'almaty', 'astana'] },
};

export const LANGUAGE_SLUGS: Record<string, { label: string; labelRu: string; dbTerm: string }> = {
  'russian':  { label: 'Russian',  labelRu: 'Русский',     dbTerm: 'Russian' },
  'english':  { label: 'English',  labelRu: 'Английский',  dbTerm: 'English' },
  'arabic':   { label: 'Arabic',   labelRu: 'Арабский',    dbTerm: 'Arabic' },
  'kazakh':   { label: 'Kazakh',   labelRu: 'Казахский',   dbTerm: 'Kazakh' },
  'turkish':  { label: 'Turkish',  labelRu: 'Турецкий',    dbTerm: 'Turkish' },
};

export const CATEGORY_SLUGS: Record<string, { label: string; labelRu: string; dbTerm: string }> = {
  'beauty':       { label: 'Beauty',          labelRu: 'Красота',        dbTerm: 'beauty' },
  'fashion':      { label: 'Fashion',          labelRu: 'Мода',           dbTerm: 'fashion' },
  'food':         { label: 'Food & Beverage',  labelRu: 'Еда',            dbTerm: 'food' },
  'travel':       { label: 'Travel',           labelRu: 'Путешествия',    dbTerm: 'travel' },
  'fitness':      { label: 'Fitness',          labelRu: 'Фитнес',         dbTerm: 'fitness' },
  'lifestyle':    { label: 'Lifestyle',        labelRu: 'Лайфстайл',      dbTerm: 'lifestyle' },
  'tech':         { label: 'Tech',             labelRu: 'Технологии',     dbTerm: 'tech' },
  'finance':      { label: 'Finance',          labelRu: 'Финансы',        dbTerm: 'finance' },
  'real-estate':  { label: 'Real Estate',      labelRu: 'Недвижимость',   dbTerm: 'real-estate' },
  'business':     { label: 'Business',         labelRu: 'Бизнес',         dbTerm: 'business' },
  'parenting':    { label: 'Parenting',         labelRu: 'Дети / Мамы',   dbTerm: 'parenting' },
  'gaming':       { label: 'Gaming',            labelRu: 'Гейминг',        dbTerm: 'gaming' },
};

interface CreatorCard {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  creator_type: string;
  category: string;
  location: string | null;
  languages: string[] | null;
  followers_count: number | null;
  rating: number | null;
  is_verified: boolean;
  packages?: Array<{ name: string; price: number; clientPrice?: number }>;
}

export interface FilterParams {
  typeSlug: string;
  locationSlug: string;
  languageSlug?: string;
  categorySlug?: string;
}

function buildSeoMeta(params: FilterParams, isKZ: boolean) {
  const typeInfo = CREATOR_TYPE_SLUGS[params.typeSlug];
  const locInfo = LOCATION_SLUGS[params.locationSlug];
  const langInfo = params.languageSlug ? LANGUAGE_SLUGS[params.languageSlug] : null;
  const catInfo = params.categorySlug ? CATEGORY_SLUGS[params.categorySlug] : null;

  if (!typeInfo || !locInfo) return null;

  const SITE = 'Yalla Influencers';

  if (isKZ) {
    const lang = langInfo?.labelRu ?? '';
    const cat = catInfo?.labelRu ?? '';
    const city = locInfo.labelRu;
    const type = typeInfo.labelRu;
    const prefix = [lang, cat].filter(Boolean).join(' ');
    const title = `${prefix ? prefix + ' ' : ''}${type} в ${city} | Биржа ${SITE}`;
    const h1 = `Заказать${prefix ? ' ' + prefix.toLowerCase() : ''} ${type.toLowerCase()} в ${city}`;
    const desc = `Находите и нанимайте лучших${langInfo ? ' ' + lang.toLowerCase() + '-говорящих' : ''}${catInfo ? ' ' + cat.toLowerCase() : ''} ${type.toLowerCase()} в ${city} для создания контента в Instagram и TikTok. Безопасная оплата через эскроу. Биржа ${SITE}.`;
    return { title, h1, desc };
  } else {
    const lang = langInfo?.label ?? '';
    const cat = catInfo?.label ?? '';
    const city = locInfo.label;
    const type = typeInfo.label;
    const prefix = [lang, cat].filter(Boolean).join(' ');
    const title = `${prefix ? prefix + ' ' : ''}${type} in ${city} | ${SITE}`;
    const h1 = `Hire ${prefix ? prefix + ' ' : ''}${type} in ${city}`;
    const desc = `Find and hire${langInfo ? ' ' + lang + '-speaking' : ''}${catInfo ? ' ' + cat : ''} ${type.toLowerCase()} in ${city} for TikTok and Instagram content. Verified profiles, secure payments. ${SITE}.`;
    return { title, h1, desc };
  }
}

function applyFilterSeo(params: FilterParams, isKZ: boolean) {
  const meta = buildSeoMeta(params, isKZ);
  if (!meta) return;

  document.title = meta.title;

  const setMeta = (sel: string, val: string) => {
    let el = document.querySelector<HTMLMetaElement>(sel);
    if (!el) { el = document.createElement('meta'); const m = sel.match(/\[(\w+)="([^"]+)"\]/); if (m) el.setAttribute(m[1], m[2]); document.head.appendChild(el); }
    el.setAttribute('content', val);
  };
  setMeta('[name="description"]', meta.desc);
  setMeta('[name="robots"]', 'index, follow');

  const slugParts = [params.typeSlug, params.locationSlug, params.languageSlug, params.categorySlug].filter(Boolean).join('/');
  let canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!canonical) { canonical = document.createElement('link'); canonical.rel = 'canonical'; document.head.appendChild(canonical); }
  canonical.href = `https://yallainfluencers.com/${slugParts}`;

  document.documentElement.setAttribute('lang', isKZ ? 'ru' : 'en');
}

export default function FilterLandingPage({ typeSlug, locationSlug, languageSlug, categorySlug }: FilterParams) {
  const typeInfo = CREATOR_TYPE_SLUGS[typeSlug];
  const locInfo = LOCATION_SLUGS[locationSlug];
  const langInfo = languageSlug ? LANGUAGE_SLUGS[languageSlug] : null;
  const catInfo = categorySlug ? CATEGORY_SLUGS[categorySlug] : null;

  const isKZ = locInfo?.region === 'KZ';
  const [creators, setCreators] = useState<CreatorCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!typeInfo || !locInfo) return;
    applyFilterSeo({ typeSlug, locationSlug, languageSlug, categorySlug }, isKZ);

    (async () => {
      setLoading(true);
      let q = supabase
        .from('creator_profiles')
        .select('id, username, display_name, avatar_url, creator_type, category, location, languages, followers_count, rating, is_verified, packages')
        .eq('is_published', true)
        .eq('is_hidden', false)
        .neq('status', 'banned')
        .not('username', 'is', null);

      if (typeInfo.dbType) {
        q = q.eq('creator_type', typeInfo.dbType);
      }
      if (catInfo) {
        q = q.ilike('category', `%${catInfo.dbTerm}%`);
      }

      const { data } = await q.limit(48);
      let rows = (data ?? []) as CreatorCard[];

      // Location filter (client-side for flexibility)
      const locTerms = locInfo.searchTerms;
      const withLocation = rows.filter(r =>
        r.location && locTerms.some(t => r.location!.toLowerCase().includes(t.toLowerCase()))
      );
      if (withLocation.length >= 3) rows = withLocation;

      // Language filter (client-side)
      if (langInfo) {
        const withLang = rows.filter(r =>
          r.languages && r.languages.some(l => l.toLowerCase().includes(langInfo.dbTerm.toLowerCase()))
        );
        if (withLang.length >= 2) rows = withLang;
      }

      setCreators(rows);
      setLoading(false);
    })();
  }, [typeSlug, locationSlug, languageSlug, categorySlug]);

  if (!typeInfo || !locInfo) {
    window.location.replace('/');
    return null;
  }

  const seoMeta = buildSeoMeta({ typeSlug, locationSlug, languageSlug, categorySlug }, isKZ);
  const h1 = seoMeta?.h1 ?? '';

  const filtered = search
    ? creators.filter(c =>
        c.display_name.toLowerCase().includes(search.toLowerCase()) ||
        c.location?.toLowerCase().includes(search.toLowerCase()) ||
        c.category?.toLowerCase().includes(search.toLowerCase())
      )
    : creators;

  const currency = isKZ ? 'KZT' : 'AED';

  // Breadcrumb parts
  const breadcrumbs = [
    { label: isKZ ? typeInfo.labelRu : typeInfo.label, href: `/${typeSlug}/${locationSlug}` },
    ...(locInfo ? [{ label: isKZ ? locInfo.labelRu : locInfo.label, href: `/${typeSlug}/${locationSlug}` }] : []),
    ...(langInfo ? [{ label: isKZ ? langInfo.labelRu : langInfo.label, href: `/${typeSlug}/${locationSlug}/${languageSlug}` }] : []),
    ...(catInfo ? [{ label: isKZ ? catInfo.labelRu : catInfo.label, href: `/${typeSlug}/${locationSlug}/${languageSlug}/${categorySlug}` }] : []),
  ];

  return (
    <div className="min-h-screen" style={{ background: '#080d16' }}>
      {/* Sticky nav */}
      <div className="sticky top-0 z-20 px-4 py-3 flex items-center gap-3"
        style={{ background: 'rgba(8,13,22,0.96)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <button onClick={() => window.history.back()}
          className="p-2 rounded-xl flex-shrink-0 transition-all hover:brightness-125"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#94a3b8' }}>
          <ArrowLeft size={16} />
        </button>
        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
          {breadcrumbs.map((bc, i) => (
            <span key={i} className="flex items-center gap-1.5">
              {i > 0 && <ChevronRight size={10} style={{ color: '#1e293b', flexShrink: 0 }} />}
              <span className={`text-xs font-semibold truncate ${i === breadcrumbs.length - 1 ? 'text-white' : ''}`}
                style={{ color: i === breadcrumbs.length - 1 ? '#fff' : '#475569' }}>
                {bc.label}
              </span>
            </span>
          ))}
        </div>
        <span className="ml-auto flex-shrink-0 text-xs font-bold px-2 py-0.5 rounded-full"
          style={{ background: isKZ ? 'rgba(56,189,248,0.1)' : 'rgba(0,196,140,0.1)', color: isKZ ? '#38bdf8' : '#00C48C', border: `1px solid ${isKZ ? 'rgba(56,189,248,0.25)' : 'rgba(0,196,140,0.25)'}` }}>
          {isKZ ? '🇰🇿 KZ' : '🇦🇪 UAE'}
        </span>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Hero */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <div className="flex items-center gap-1.5">
              <MapPin size={12} style={{ color: isKZ ? '#38bdf8' : '#00C48C' }} />
              <span className="text-xs font-semibold" style={{ color: isKZ ? '#38bdf8' : '#00C48C' }}>
                {isKZ ? locInfo.labelRu : locInfo.label}
              </span>
            </div>
            {langInfo && (
              <div className="flex items-center gap-1.5">
                <Globe size={11} style={{ color: '#475569' }} />
                <span className="text-xs" style={{ color: '#475569' }}>{isKZ ? langInfo.labelRu : langInfo.label}</span>
              </div>
            )}
            {catInfo && (
              <div className="flex items-center gap-1.5">
                <Tag size={11} style={{ color: '#475569' }} />
                <span className="text-xs" style={{ color: '#475569' }}>{isKZ ? catInfo.labelRu : catInfo.label}</span>
              </div>
            )}
          </div>
          <h1 className="text-2xl font-black text-white mb-2">{h1}</h1>
          <p className="text-sm" style={{ color: '#64748b' }}>
            {isKZ
              ? `Проверенные ${typeInfo.labelRu.toLowerCase()} с защитой через эскроу — оплата только после получения результата`
              : `Verified ${typeInfo.label.toLowerCase()} with escrow protection — you only pay when satisfied`}
          </p>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 mb-5 flex-wrap">
          <div className="flex items-center gap-2 text-sm" style={{ color: '#475569' }}>
            <Users size={14} />
            <span>{loading ? '...' : `${creators.length}${creators.length >= 48 ? '+' : ''} ${isKZ ? 'специалистов' : 'specialists'}`}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-medium" style={{ color: '#00C48C' }}>{isKZ ? 'Принимают заказы' : 'Accepting bookings'}</span>
          </div>
        </div>

        {/* Refinement chips */}
        <div className="mb-5 space-y-2">
          {/* Language chips */}
          {!languageSlug && (
            <div className="flex gap-2 flex-wrap">
              <span className="text-xs font-semibold" style={{ color: '#334155', alignSelf: 'center' }}>{isKZ ? 'Язык:' : 'Language:'}</span>
              {Object.entries(LANGUAGE_SLUGS).map(([slug, info]) => (
                <a key={slug}
                  href={`/${typeSlug}/${locationSlug}/${slug}${categorySlug ? '/' + categorySlug : ''}`}
                  className="px-3 py-1 rounded-full text-xs font-semibold transition-all hover:brightness-125"
                  style={{ background: 'rgba(255,255,255,0.04)', color: '#475569', border: '1px solid rgba(255,255,255,0.07)', textDecoration: 'none' }}>
                  {isKZ ? info.labelRu : info.label}
                </a>
              ))}
            </div>
          )}
          {/* Category chips */}
          {!categorySlug && (
            <div className="flex gap-2 flex-wrap">
              <span className="text-xs font-semibold" style={{ color: '#334155', alignSelf: 'center' }}>{isKZ ? 'Ниша:' : 'Niche:'}</span>
              {Object.entries(CATEGORY_SLUGS).map(([slug, info]) => (
                <a key={slug}
                  href={`/${typeSlug}/${locationSlug}${languageSlug ? '/' + languageSlug : ''}/${slug}`}
                  className="px-3 py-1 rounded-full text-xs font-semibold transition-all hover:brightness-125"
                  style={{ background: 'rgba(255,255,255,0.04)', color: '#475569', border: '1px solid rgba(255,255,255,0.07)', textDecoration: 'none' }}>
                  {isKZ ? info.labelRu : info.label}
                </a>
              ))}
            </div>
          )}
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: '#334155' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={isKZ ? 'Поиск по имени...' : 'Search by name...'}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm text-white placeholder:text-gray-700 outline-none focus:ring-1 focus:ring-sky-500/30 transition-all"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
          />
        </div>

        {/* Creator grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-2xl animate-pulse"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', height: 220 }} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl p-12 text-center" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <Users size={28} className="mx-auto mb-3" style={{ color: '#1e293b' }} />
            <p className="text-sm font-semibold text-white mb-1">
              {isKZ ? 'Специалисты не найдены' : 'No specialists found'}
            </p>
            <p className="text-xs mb-4" style={{ color: '#334155' }}>
              {isKZ ? 'Попробуйте убрать некоторые фильтры' : 'Try removing some filters'}
            </p>
            <a href={`/${typeSlug}/${locationSlug}`}
              className="text-xs font-semibold px-4 py-2 rounded-xl inline-block"
              style={{ background: 'rgba(255,255,255,0.05)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.08)', textDecoration: 'none' }}>
              {isKZ ? `Все ${typeInfo.labelRu.toLowerCase()} в ${locInfo.labelRu}` : `All ${typeInfo.label.toLowerCase()} in ${locInfo.label}`}
            </a>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(creator => {
              const pkgs = (creator.packages ?? []) as Array<{ name: string; price: number; clientPrice?: number }>;
              const minPrice = pkgs.length > 0 ? Math.min(...pkgs.map(p => p.clientPrice ?? p.price)) : null;
              return (
                <a key={creator.id} href={`/${creator.username}`}
                  className="group rounded-2xl overflow-hidden flex flex-col transition-all hover:scale-[1.02] hover:shadow-2xl"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', textDecoration: 'none' }}>
                  {/* Avatar */}
                  <div className="relative h-40 overflow-hidden bg-slate-900">
                    {creator.avatar_url ? (
                      <img src={creator.avatar_url} alt={creator.display_name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />
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
                    {creator.languages && creator.languages.length > 0 && (
                      <div className="absolute bottom-2 left-2 flex gap-1">
                        {creator.languages.slice(0, 2).map(l => (
                          <span key={l} className="text-xs px-1.5 py-0.5 rounded font-medium"
                            style={{ background: 'rgba(0,0,0,0.7)', color: '#94a3b8', backdropFilter: 'blur(8px)' }}>
                            {l}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  {/* Info */}
                  <div className="p-4 flex-1 flex flex-col gap-2">
                    <div>
                      <p className="text-sm font-bold text-white truncate">{creator.display_name}</p>
                      <div className="flex items-center gap-1 mt-0.5">
                        {creator.location && (
                          <>
                            <MapPin size={11} style={{ color: '#334155' }} />
                            <span className="text-xs truncate" style={{ color: '#334155' }}>{creator.location}</span>
                          </>
                        )}
                      </div>
                    </div>
                    {creator.category && (
                      <span className="text-xs px-2 py-0.5 rounded-full w-fit font-medium"
                        style={{ background: 'rgba(255,255,255,0.04)', color: '#475569', border: '1px solid rgba(255,255,255,0.06)' }}>
                        {creator.category}
                      </span>
                    )}
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
                        <span className="flex items-center gap-0.5 text-xs font-semibold" style={{ color: isKZ ? '#38bdf8' : '#00C48C' }}>
                          {isKZ ? 'Профиль' : 'View'} <ChevronRight size={11} />
                        </span>
                      )}
                    </div>
                  </div>
                </a>
              );
            })}
          </div>
        )}

        {/* SEO text */}
        <div className="mt-12 rounded-2xl p-6" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
          <h2 className="text-base font-bold text-white mb-3">{seoMeta?.h1}</h2>
          <p className="text-sm leading-relaxed" style={{ color: '#475569' }}>
            {isKZ
              ? `Yalla Influencers — ведущая биржа для найма ${typeInfo.labelRu.toLowerCase()} в ${locInfo.labelRu}${langInfo ? `, говорящих на ${langInfo.labelRu.toLowerCase()}` : ''}${catInfo ? ` в нише ${catInfo.labelRu.toLowerCase()}` : ''}. Все специалисты верифицированы, оплата через эскроу — вы платите только после получения готового контента.`
              : `Yalla Influencers is the leading marketplace to hire ${typeInfo.label.toLowerCase()} in ${locInfo.label}${langInfo ? ` who speak ${langInfo.label}` : ''}${catInfo ? ` specializing in ${catInfo.label}` : ''}. All creators are verified, payments protected by escrow.`}
          </p>
          {/* Sub-filter links */}
          {!languageSlug && !categorySlug && (
            <div className="mt-4 flex flex-wrap gap-2">
              {Object.entries(LANGUAGE_SLUGS).slice(0, 4).map(([slug, info]) => (
                <a key={slug} href={`/${typeSlug}/${locationSlug}/${slug}`}
                  className="text-xs px-3 py-1.5 rounded-full transition-all hover:brightness-125"
                  style={{ background: 'rgba(255,255,255,0.04)', color: '#475569', border: '1px solid rgba(255,255,255,0.07)', textDecoration: 'none' }}>
                  {isKZ ? info.labelRu : info.label} {isKZ ? typeInfo.labelRu.toLowerCase() : typeInfo.label.toLowerCase()}
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
