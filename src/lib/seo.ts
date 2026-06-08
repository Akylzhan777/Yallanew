const SITE_NAME = 'Yalla Influencers';
const SITE_URL = 'https://yallainfluencers.com';
const DEFAULT_IMAGE = `${SITE_URL}/og-image.svg`;

export type SeoLang = 'en' | 'ru' | 'ar';

interface HomeSeoCopy {
  title: string;
  description: string;
  keywords: string;
  ogLocale: string;
}

const HOME_SEO: Record<SeoLang, HomeSeoCopy> = {
  en: {
    title: 'Yalla Influencers | The #1 Advertising Marketplace in Dubai & GCC',
    description:
      'The largest creator and media marketplace in the GCC. Securely book verified bloggers, UGC, models, production teams, Telegram channels, and premium ad placements in Dubai.',
    keywords:
      'advertising marketplace Dubai, creator marketplace GCC, hire UGC creators UAE, video production Dubai, book bloggers Dubai, Telegram advertising UAE, influencer marketing GCC, verified professionals Dubai',
    ogLocale: 'en_US',
  },
  ru: {
    title: 'Yalla Influencers | Рекламный маркетплейс №1 в Дубае и GCC',
    description:
      'Крупнейший маркетплейс креаторов и медиа в GCC. Безопасно бронируйте верифицированных блогеров, UGC, моделей, продакшн-команды, Telegram-каналы и премиальные рекламные площадки в Дубае.',
    keywords:
      'рекламный маркетплейс Дубай, маркетплейс креаторов GCC, заказать UGC ОАЭ, видеопродакшн Дубай, реклама в Telegram ОАЭ, инфлюенсеры GCC, верифицированные профессионалы Дубай',
    ogLocale: 'ru_RU',
  },
  ar: {
    title: 'يلا إنفلونسرز | سوق الإعلانات رقم 1 في دبي ودول مجلس التعاون الخليجي',
    description:
      'أكبر سوق للمبدعين والإعلام في منطقة الخليج. احجز بأمان مدونين موثّقين، صناع UGC، عارضين، فرق إنتاج، قنوات تيليجرام، وإعلانات مميزة في دبي.',
    keywords:
      'سوق الإعلانات دبي, منصة صناع المحتوى الخليج, توظيف صناع UGC الإمارات, إنتاج فيديو دبي, الإعلان في تيليجرام الإمارات, مؤثرون الخليج, محترفون موثّقون دبي',
    ogLocale: 'ar_AE',
  },
};

// Canonical labels for every creator type we support
const CREATOR_TYPE_LABELS: Record<string, string> = {
  blogger: 'Influencer',
  influencer: 'Influencer',
  ugc: 'UGC Creator',
  model: 'Model',
  videographer: 'Videographer',
  photographer: 'Photographer',
  editor: 'Video Editor',
};

function creatorTypeLabel(type: string): string {
  return CREATOR_TYPE_LABELS[type?.toLowerCase()] ?? 'Content Creator';
}

function normalizeLang(lng: string | null | undefined): SeoLang {
  if (lng === 'ru' || lng === 'ar') return lng;
  return 'en';
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function setMeta(selector: string, attr: string, value: string) {
  let el = document.querySelector<HTMLMetaElement>(selector);
  if (!el) {
    el = document.createElement('meta');
    const m = selector.match(/\[(\w+)="([^"]+)"\]/);
    if (m) el.setAttribute(m[1], m[2]);
    document.head.appendChild(el);
  }
  el.setAttribute(attr, value);
}

function setLink(rel: string, href: string) {
  let el = document.querySelector<HTMLLinkElement>(`link[rel="${rel}"]:not([hreflang])`);
  if (!el) {
    el = document.createElement('link');
    el.rel = rel;
    document.head.appendChild(el);
  }
  el.href = href;
}

function setHreflangLinks() {
  const langs: Array<{ hreflang: string; href: string }> = [
    { hreflang: 'en', href: `${SITE_URL}/?lang=en` },
    { hreflang: 'ru', href: `${SITE_URL}/?lang=ru` },
    { hreflang: 'ar', href: `${SITE_URL}/?lang=ar` },
    { hreflang: 'x-default', href: SITE_URL },
  ];
  langs.forEach(({ hreflang, href }) => {
    let el = document.querySelector<HTMLLinkElement>(
      `link[rel="alternate"][hreflang="${hreflang}"]`
    );
    if (!el) {
      el = document.createElement('link');
      el.rel = 'alternate';
      el.setAttribute('hreflang', hreflang);
      document.head.appendChild(el);
    }
    el.href = href;
  });
}

function removeJsonLd(id: string) {
  document.getElementById(id)?.remove();
}

function injectJsonLd(id: string, data: object) {
  removeJsonLd(id);
  const s = document.createElement('script');
  s.type = 'application/ld+json';
  s.id = id;
  s.textContent = JSON.stringify(data);
  document.head.appendChild(s);
}

// ── Creator profile SEO ───────────────────────────────────────────────────────

export interface CreatorSeoData {
  display_name: string;
  username: string;
  bio: string;
  category: string;
  creator_type: string;
  location: string;
  avatar_url: string | null;
  followers_count: number;
  is_verified: boolean;
  packages: Array<{ name: string; price: number; description?: string }>;
}

export function applyCreatorSeo(p: CreatorSeoData) {
  const typeLabel = creatorTypeLabel(p.creator_type);
  const location = p.location || 'Dubai, UAE';
  const category = p.category || '';
  const profileUrl = `${SITE_URL}/${p.username}`;
  const image = p.avatar_url ?? DEFAULT_IMAGE;

  // Title: "[Name] – Premium [Type] in [Location] | Yalla Influencers"
  const title = `${p.display_name} – Premium ${typeLabel} in ${location} | ${SITE_NAME}`;

  // Template description with fallback to bio excerpt
  const templatedDesc = `Book ${p.display_name} for your next brand campaign. Professional ${typeLabel}${category ? ` specializing in ${category}` : ''}. View portfolio, packages, and hire directly on Yalla Influencers.`;
  const description = templatedDesc.length > 155 ? templatedDesc.slice(0, 152) + '…' : templatedDesc;

  // Keywords
  const keywords = [
    `${typeLabel} ${location}`,
    `hire ${typeLabel} Dubai`,
    `${p.display_name} portfolio`,
    `${category} content creator UAE`,
    `freelance ${typeLabel} UAE`,
    SITE_NAME,
  ].filter(Boolean).join(', ');

  // ── <title> ──────────────────────────────────────────────────────────────────
  document.title = title;

  // ── Basic meta ───────────────────────────────────────────────────────────────
  setMeta('[name="description"]', 'content', description);
  setMeta('[name="keywords"]', 'content', keywords);
  setMeta('[name="robots"]', 'content', 'index, follow');

  // ── Canonical ────────────────────────────────────────────────────────────────
  setLink('canonical', profileUrl);

  // ── Open Graph ───────────────────────────────────────────────────────────────
  setMeta('[property="og:type"]', 'content', 'profile');
  setMeta('[property="og:site_name"]', 'content', SITE_NAME);
  setMeta('[property="og:title"]', 'content', title);
  setMeta('[property="og:description"]', 'content', description);
  setMeta('[property="og:url"]', 'content', profileUrl);
  setMeta('[property="og:image"]', 'content', image);
  setMeta('[property="og:image:width"]', 'content', '1200');
  setMeta('[property="og:image:height"]', 'content', '630');
  setMeta('[property="og:locale"]', 'content', 'en_US');
  setMeta('[property="profile:username"]', 'content', p.username);

  // ── Twitter Card ─────────────────────────────────────────────────────────────
  setMeta('[name="twitter:card"]', 'content', 'summary_large_image');
  setMeta('[name="twitter:site"]', 'content', '@yallainfluencers');
  setMeta('[name="twitter:title"]', 'content', title);
  setMeta('[name="twitter:description"]', 'content', description);
  setMeta('[name="twitter:image"]', 'content', image);

  // ── JSON-LD: Person + ProfessionalService ─────────────────────────────────────
  const jsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': ['Person', 'ProfessionalService'],
    name: p.display_name,
    url: profileUrl,
    description,
    image,
    jobTitle: typeLabel,
    knowsAbout: category || undefined,
    address: {
      '@type': 'PostalAddress',
      addressLocality: location,
      addressCountry: 'AE',
    },
  };

  if (p.followers_count > 0) {
    jsonLd.numberOfFollowers = p.followers_count;
  }

  if (p.is_verified) {
    jsonLd.hasCredential = {
      '@type': 'EducationalOccupationalCredential',
      name: 'Verified Creator',
      credentialCategory: 'badge',
    };
  }

  if (p.packages.length === 1) {
    jsonLd.offers = {
      '@type': 'Offer',
      name: p.packages[0].name,
      description: p.packages[0].description ?? '',
      price: p.packages[0].price,
      priceCurrency: 'AED',
      seller: { '@type': 'Person', name: p.display_name },
      availability: 'https://schema.org/InStock',
    };
  } else if (p.packages.length > 1) {
    jsonLd.offers = p.packages.map(pk => ({
      '@type': 'Offer',
      name: pk.name,
      description: pk.description ?? '',
      price: pk.price,
      priceCurrency: 'AED',
      seller: { '@type': 'Person', name: p.display_name },
      availability: 'https://schema.org/InStock',
    }));
  }

  injectJsonLd('creator-jsonld', jsonLd);
}

export function applyHomeSeo(lang: string | null | undefined) {
  const code = normalizeLang(lang);
  const copy = HOME_SEO[code];

  document.title = copy.title;
  document.documentElement.setAttribute('lang', code);

  removeJsonLd('creator-jsonld');

  setLink('canonical', SITE_URL);
  setHreflangLinks();

  setMeta('[name="description"]', 'content', copy.description);
  setMeta('[name="keywords"]', 'content', copy.keywords);
  setMeta('[name="robots"]', 'content', 'index, follow');

  setMeta('[property="og:type"]', 'content', 'website');
  setMeta('[property="og:site_name"]', 'content', SITE_NAME);
  setMeta('[property="og:title"]', 'content', copy.title);
  setMeta('[property="og:description"]', 'content', copy.description);
  setMeta('[property="og:url"]', 'content', SITE_URL);
  setMeta('[property="og:image"]', 'content', DEFAULT_IMAGE);
  setMeta('[property="og:image:width"]', 'content', '1200');
  setMeta('[property="og:image:height"]', 'content', '630');
  setMeta('[property="og:locale"]', 'content', copy.ogLocale);

  setMeta('[name="twitter:card"]', 'content', 'summary_large_image');
  setMeta('[name="twitter:site"]', 'content', '@yallainfluencers');
  setMeta('[name="twitter:title"]', 'content', copy.title);
  setMeta('[name="twitter:description"]', 'content', copy.description);
  setMeta('[name="twitter:image"]', 'content', DEFAULT_IMAGE);

  injectJsonLd('home-jsonld', {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: SITE_URL,
    description: copy.description,
    inLanguage: code,
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${SITE_URL}/?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  });
}

export function resetDefaultSeo() {
  const saved = (typeof localStorage !== 'undefined' && localStorage.getItem('yalla_lang')) || 'en';
  applyHomeSeo(saved);
}
