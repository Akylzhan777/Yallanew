import { useEffect } from 'react';
import { ArrowLeft, Clock, Tag, ChevronRight } from 'lucide-react';

export interface BlogPost {
  slug: string;
  title: string;
  titleRu: string;
  excerpt: string;
  excerptRu: string;
  body: string;
  bodyRu: string;
  tag: string;
  tagRu: string;
  date: string;
  readMin: number;
  image: string;
}

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: 'how-to-choose-videographer',
    title: 'How to Choose a Videographer for Your Brand',
    titleRu: 'Как выбрать видеографа для бизнеса',
    excerpt: 'Not all videographers are equal. Here\'s what to check before you book — from portfolio red flags to equipment lists.',
    excerptRu: 'Не все видеографы одинаковы. Рассказываем, что проверить перед бронированием — от красных флагов в портфолио до списка оборудования.',
    body: `
## Why the right videographer matters

A mediocre video can hurt a brand more than no video at all. Viewers form an opinion in the first 3 seconds, so production quality signals trust.

## 1. Portfolio first, price second

Always start with the portfolio. Look for:
- **Consistency** — does quality vary wildly between projects?
- **Color grading** — is it intentional or just Instagram filters?
- **Audio quality** — bad sound kills otherwise great footage.

## 2. Equipment is context, not a guarantee

A Sony FX3 in the wrong hands will produce worse results than a Sony A7IV in the right ones. Ask what they shoot with, but weigh it against the actual output.

## 3. Communication speed

A videographer who takes 48 hours to reply to an inquiry will take 2 weeks to deliver a revision. Fast responses are a proxy for professionalism.

## 4. Understand the deliverables upfront

Agree in writing on:
- Number of final edited clips
- Resolution and format (4K ProRes vs 1080p H.264)
- Color grade included or extra
- Turnaround time
- Revision rounds

## 5. Escrow protects both sides

On Yalla Influencers, all KZ payments go through escrow — funds are only released to the creator when you confirm the work is complete. This removes the risk of prepayment disputes.
    `.trim(),
    bodyRu: `
## Почему важен правильный видеограф

Посредственное видео может навредить бренду больше, чем его отсутствие. Зрители формируют впечатление за первые 3 секунды, поэтому качество съёмки — это сигнал доверия.

## 1. Сначала портфолио, потом цена

Всегда начинайте с портфолио. Обращайте внимание на:
- **Стабильность** — сильно ли различается качество между проектами?
- **Цветокоррекция** — намеренная или просто фильтры из Instagram?
- **Качество звука** — плохой звук убивает даже хороший визуал.

## 2. Оборудование — контекст, а не гарантия

Sony FX3 в неправильных руках даст худший результат, чем Sony A7IV в правильных. Спросите, на что снимают, но оценивайте конкретный результат.

## 3. Скорость коммуникации

Видеограф, который отвечает на запрос 48 часов, будет сдавать правки 2 недели. Быстрый ответ — косвенный признак профессионализма.

## 4. Заранее договоритесь о результате

Зафиксируйте письменно:
- Количество финальных роликов
- Разрешение и формат (4K ProRes или 1080p H.264)
- Включена ли цветокоррекция
- Срок сдачи
- Количество правок

## 5. Эскроу защищает обе стороны

На Yalla Influencers все платежи в KZ проходят через эскроу — средства переводятся исполнителю только после того, как вы подтвердите готовность работы.
    `.trim(),
    tag: 'Videography',
    tagRu: 'Видеография',
    date: '2026-05-20',
    readMin: 5,
    image: 'https://images.pexels.com/photos/3784324/pexels-photo-3784324.jpeg?auto=compress&cs=tinysrgb&w=800',
  },
  {
    slug: 'why-brands-need-ugc',
    title: 'Why Every Business Needs UGC in 2026',
    titleRu: 'Почему каждому бизнесу нужен UGC в 2026 году',
    excerpt: 'User-generated content converts 4x better than studio ads. Here\'s why UGC is no longer optional for modern brands.',
    excerptRu: 'UGC конвертирует в 4 раза лучше студийной рекламы. Объясняем, почему UGC-контент стал обязательным для современных брендов.',
    body: `
## The trust crisis in advertising

Digital ads have a trust problem. Consumers scroll past polished studio content but stop for authentic-looking footage. UGC bridges that gap.

## What is UGC?

User-Generated Content (UGC) refers to content created by real people — not by the brand itself. On Yalla Influencers, UGC creators produce authentic-looking videos and photos specifically designed for brand campaigns.

## The numbers

- UGC-based ads get **4x higher click-through rates** than polished brand ads (Nielsen, 2025)
- **79% of consumers** say UGC highly impacts their purchasing decisions
- Cost per acquisition drops by an average of **50%** when using UGC in paid social

## The algorithm advantage

TikTok and Instagram Reels favor content that looks native to the platform. Studio-produced content often gets tagged as "too ad-like" by the algorithm and receives reduced distribution. UGC blends in.

## How to brief a UGC creator

1. Define the **hook** — what should make someone stop scrolling?
2. Specify the **call to action** — "shop now", "visit the link in bio", etc.
3. Keep it **under 30 seconds** for maximum retention
4. Allow **creative freedom** — the best UGC comes from creators who feel the product

## Where to start

Browse UGC creators on Yalla Influencers and filter by city, niche, and follower count. All creators are verified and payments are protected by escrow.
    `.trim(),
    bodyRu: `
## Кризис доверия к рекламе

У цифровой рекламы проблема с доверием. Потребители пролистывают глянцевый студийный контент, но останавливаются на аутентичных роликах. UGC закрывает этот разрыв.

## Что такое UGC?

UGC (User-Generated Content) — контент, созданный реальными людьми, а не брендом. На Yalla Influencers UGC-креаторы снимают аутентичные видео и фото специально для рекламных кампаний.

## Цифры

- Реклама с UGC получает **в 4 раза больше кликов**, чем полированная студийная (Nielsen, 2025)
- **79% потребителей** говорят, что UGC сильно влияет на их решение о покупке
- Стоимость привлечения клиента снижается в среднем на **50%** при использовании UGC

## Преимущество в алгоритме

TikTok и Instagram Reels отдают предпочтение контенту, который выглядит нативно. Студийные ролики алгоритм часто воспринимает как "слишком рекламные" и ограничивает охват. UGC вписывается органично.

## Как ставить задачу UGC-креатору

1. Определите **хук** — что заставит остановить скролл?
2. Укажите **призыв к действию** — "купить", "перейти по ссылке" и т.д.
3. Держите **длину до 30 секунд** для максимального удержания
4. Дайте **творческую свободу** — лучший UGC получается у тех, кто чувствует продукт

## С чего начать

Найдите UGC-креаторов на Yalla Influencers, отфильтруйте по городу, нише и охвату. Все исполнители проверены, оплата защищена эскроу.
    `.trim(),
    tag: 'UGC',
    tagRu: 'UGC',
    date: '2026-05-28',
    readMin: 4,
    image: 'https://images.pexels.com/photos/3379934/pexels-photo-3379934.jpeg?auto=compress&cs=tinysrgb&w=800',
  },
  {
    slug: 'influencer-marketing-kazakhstan',
    title: 'Influencer Marketing in Kazakhstan: 2026 Guide',
    titleRu: 'Инфлюенсер-маркетинг в Казахстане: гайд 2026',
    excerpt: 'The KZ creator economy is booming. Instagram and TikTok penetration is at an all-time high. Here\'s how brands can tap in.',
    excerptRu: 'Экономика контента в Казахстане бурно растёт. Охват Instagram и TikTok достиг рекордных показателей. Рассказываем, как брендам войти в этот рынок.',
    body: `
## Why Kazakhstan?

Kazakhstan's digital economy is growing faster than most of Central Asia. With 20M+ smartphone users and Instagram penetration topping 40%, the influencer market is reaching critical mass.

## Platform breakdown (KZ, 2026)

| Platform | Primary age group | Best content type |
|---|---|---|
| Instagram | 18–34 | Reels, Stories |
| TikTok | 15–28 | Short-form video |
| YouTube | 25–45 | Long-form reviews |
| Telegram | 25–45 | News, offers, community |

## Language strategy

Most Kazakhstani influencers post in Russian. Kazakh-language content is growing rapidly and reaches an underserved, highly engaged audience. Bilingual campaigns (Russian + Kazakh) perform 30–40% better by reach.

## Payment and contracts

Cash-in-hand deals are risky. Platforms like Yalla Influencers offer escrow-based payments — money is held until work is delivered and approved. This is especially important for brands working with creators for the first time.

## Micro vs macro influencers

In Kazakhstan, micro-influencers (10K–100K followers) often outperform macro ones on engagement rate. Urban audiences in Almaty and Astana are particularly active.

## How to run a campaign

1. Define your KPI (reach, clicks, sales)
2. Choose city + niche on Yalla Influencers
3. Book 3–5 micro-influencers for A/B testing
4. Approve deliverables via the platform
5. Release payment from escrow
    `.trim(),
    bodyRu: `
## Почему Казахстан?

Цифровая экономика Казахстана растёт быстрее большинства стран Центральной Азии. 20+ млн пользователей смартфонов и охват Instagram более 40% — рынок инфлюенсер-маркетинга достиг критической массы.

## Платформы (KZ, 2026)

| Платформа | Основная аудитория | Лучший формат |
|---|---|---|
| Instagram | 18–34 | Reels, Stories |
| TikTok | 15–28 | Короткие видео |
| YouTube | 25–45 | Длинные обзоры |
| Telegram | 25–45 | Новости, оферты |

## Языковая стратегия

Большинство казахстанских инфлюенсеров ведут блоги на русском. Казахскоязычный контент активно растёт и охватывает недостаточно занятую, но высокововлечённую аудиторию. Двуязычные кампании (рус + каз) дают на 30–40% больше охвата.

## Оплата и договорённости

Расчёты "из рук в руки" — это риск. Площадки вроде Yalla Influencers предлагают эскроу: деньги хранятся на платформе до тех пор, пока работа не будет сдана и принята. Особенно важно при первом сотрудничестве.

## Микро vs макро инфлюенсеры

В Казахстане микроинфлюенсеры (10K–100K подписчиков) часто превосходят макро по вовлечённости. Городская аудитория Алматы и Астаны особенно активна.

## Как запустить кампанию

1. Определите KPI (охват, клики, продажи)
2. Выберите город и нишу на Yalla Influencers
3. Закажите 3–5 микроинфлюенсеров для A/B-тестирования
4. Примите контент через платформу
5. Разблокируйте оплату из эскроу
    `.trim(),
    tag: 'Marketing',
    tagRu: 'Маркетинг',
    date: '2026-06-01',
    readMin: 6,
    image: 'https://images.pexels.com/photos/3184298/pexels-photo-3184298.jpeg?auto=compress&cs=tinysrgb&w=800',
  },
  {
    slug: 'ugc-vs-influencer-what-to-choose',
    title: 'UGC vs Influencer Marketing: What to Choose?',
    titleRu: 'UGC vs инфлюенсер-маркетинг: что выбрать?',
    excerpt: 'UGC and influencer marketing are often confused. They serve different goals — here\'s how to pick the right one for your budget and KPI.',
    excerptRu: 'UGC и инфлюенсер-маркетинг часто путают. Они решают разные задачи — объясняем, как выбрать формат под свой бюджет и KPI.',
    body: `
## The difference in one sentence

**Influencer marketing** pays for reach and authority. **UGC** pays for authentic creative assets.

## When to use influencer marketing

- You need brand awareness in a specific community
- You want an endorsement from a trusted voice
- You're launching a product and need social proof at scale

## When to use UGC

- You're running paid ads and need fresh creatives
- Your current studio ads have high CPM and low CTR
- You want content that looks native on TikTok/Reels
- Your budget is tight and you need high volume at low cost

## Cost comparison

| Format | Average cost (KZ market) | Expected CPM on paid social |
|---|---|---|
| Macro influencer post | 150,000–500,000 KZT | High organic, limited ad use |
| UGC video (30 sec) | 20,000–60,000 KZT | 30–60% lower than studio |
| Micro influencer Reel | 15,000–50,000 KZT | Medium organic + ad use |

## The hybrid approach

The most effective brands use both: micro-influencers to generate UGC, then amplify top-performing content as paid ads. This creates a flywheel of authentic-looking, algorithm-friendly content.
    `.trim(),
    bodyRu: `
## Разница в одном предложении

**Инфлюенсер-маркетинг** — оплата за охват и авторитет. **UGC** — оплата за аутентичные креативы.

## Когда использовать инфлюенсер-маркетинг

- Нужен охват в конкретном сообществе
- Нужен отзыв от доверенного лица
- Запускаете продукт и нужно социальное доказательство в масштабе

## Когда использовать UGC

- Запускаете платную рекламу и нужны свежие креативы
- Студийная реклама даёт высокий CPM и низкий CTR
- Хотите нативный контент для TikTok/Reels
- Бюджет ограничен и нужен большой объём по низкой цене

## Сравнение стоимости

| Формат | Средняя стоимость (KZ) | Ожидаемый CPM в платной рекламе |
|---|---|---|
| Пост макроинфлюенсера | 150 000–500 000 KZT | Высокий охват, ограниченное применение |
| UGC-видео (30 сек) | 20 000–60 000 KZT | На 30–60% ниже студийного |
| Reel микроинфлюенсера | 15 000–50 000 KZT | Средний охват + применение в рекламе |

## Гибридный подход

Самые эффективные бренды используют оба формата: микроинфлюенсеры создают UGC, а лучший контент усиливается через платную рекламу. Это запускает маховик аутентичного, нативного для алгоритма контента.
    `.trim(),
    tag: 'Strategy',
    tagRu: 'Стратегия',
    date: '2026-06-05',
    readMin: 4,
    image: 'https://images.pexels.com/photos/7586374/pexels-photo-7586374.jpeg?auto=compress&cs=tinysrgb&w=800',
  },
];

function formatDate(dateStr: string, isRu: boolean) {
  const d = new Date(dateStr);
  return d.toLocaleDateString(isRu ? 'ru-RU' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

function renderMarkdown(md: string) {
  const lines = md.split('\n');
  const elements: React.ReactNode[] = [];
  let key = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith('## ')) {
      elements.push(<h2 key={key++} className="text-lg font-bold text-white mt-8 mb-3">{line.slice(3)}</h2>);
    } else if (line.startsWith('- ')) {
      const items: string[] = [line.slice(2)];
      while (i + 1 < lines.length && lines[i + 1].startsWith('- ')) {
        i++;
        items.push(lines[i].slice(2));
      }
      elements.push(
        <ul key={key++} className="list-disc list-inside space-y-1 mb-3">
          {items.map((item, idx) => {
            const parts = item.split(/\*\*(.*?)\*\*/g);
            return (
              <li key={idx} className="text-sm" style={{ color: '#94a3b8' }}>
                {parts.map((p, pi) => pi % 2 === 1 ? <strong key={pi} className="text-white font-semibold">{p}</strong> : p)}
              </li>
            );
          })}
        </ul>
      );
    } else if (line.startsWith('| ')) {
      const rows: string[][] = [];
      while (i < lines.length && lines[i].startsWith('| ')) {
        if (!lines[i].includes('---')) {
          rows.push(lines[i].split('|').filter(c => c.trim()).map(c => c.trim()));
        }
        i++;
      }
      i--;
      elements.push(
        <div key={key++} className="overflow-x-auto mb-4">
          <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
            {rows.map((row, ri) => (
              <tr key={ri} style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                {row.map((cell, ci) => ri === 0
                  ? <th key={ci} className="text-left py-2 pr-4 font-semibold text-white text-xs">{cell}</th>
                  : <td key={ci} className="py-2 pr-4 text-xs" style={{ color: '#94a3b8' }}>{cell}</td>
                )}
              </tr>
            ))}
          </table>
        </div>
      );
    } else if (line.startsWith('1. ')) {
      const items: string[] = [line.slice(3)];
      let n = 2;
      while (i + 1 < lines.length && lines[i + 1].startsWith(`${n}. `)) {
        i++;
        items.push(lines[i].slice(String(n).length + 2));
        n++;
      }
      elements.push(
        <ol key={key++} className="list-decimal list-inside space-y-1 mb-3">
          {items.map((item, idx) => (
            <li key={idx} className="text-sm" style={{ color: '#94a3b8' }}>{item}</li>
          ))}
        </ol>
      );
    } else if (line.trim()) {
      const parts = line.split(/\*\*(.*?)\*\*/g);
      elements.push(
        <p key={key++} className="text-sm leading-relaxed mb-3" style={{ color: '#94a3b8' }}>
          {parts.map((p, pi) => pi % 2 === 1 ? <strong key={pi} className="text-white font-semibold">{p}</strong> : p)}
        </p>
      );
    }
  }
  return elements;
}

interface BlogListProps {
  isRu: boolean;
}

export function BlogList({ isRu }: BlogListProps) {
  useEffect(() => {
    const title = isRu
      ? 'Блог | Советы по маркетингу и контенту — Yalla Influencers'
      : 'Blog | Marketing & Content Tips — Yalla Influencers';
    const desc = isRu
      ? 'Советы по инфлюенсер-маркетингу, UGC, видеографии и продвижению бизнеса в Казахстане и ОАЭ.'
      : 'Tips on influencer marketing, UGC, videography, and growing your brand in Kazakhstan and the UAE.';
    document.title = title;
    document.querySelector<HTMLMetaElement>('meta[name="description"]')?.setAttribute('content', desc);
    document.querySelector<HTMLMetaElement>('meta[name="robots"]')?.setAttribute('content', 'index, follow');
  }, [isRu]);

  return (
    <div className="min-h-screen" style={{ background: '#080d16' }}>
      <div className="sticky top-0 z-20 px-4 py-3 flex items-center gap-3"
        style={{ background: 'rgba(8,13,22,0.95)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <button onClick={() => window.location.replace('/')}
          className="p-2 rounded-xl transition-all hover:brightness-125"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#94a3b8' }}>
          <ArrowLeft size={16} />
        </button>
        <span className="text-sm font-bold text-white">{isRu ? 'Блог' : 'Blog'}</span>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-black text-white mb-2">{isRu ? 'Блог Yalla Influencers' : 'Yalla Influencers Blog'}</h1>
          <p className="text-sm" style={{ color: '#64748b' }}>
            {isRu
              ? 'Практические советы по маркетингу, UGC и работе с контент-мейкерами'
              : 'Practical guides on marketing, UGC, and working with creators'}
          </p>
        </div>

        <div className="space-y-4">
          {BLOG_POSTS.map(post => (
            <a
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="group flex gap-4 rounded-2xl overflow-hidden transition-all hover:scale-[1.01]"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', textDecoration: 'none' }}
            >
              <div className="w-32 sm:w-44 flex-shrink-0 overflow-hidden" style={{ height: 120 }}>
                <img src={post.image} alt={isRu ? post.titleRu : post.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />
              </div>
              <div className="flex-1 p-4 flex flex-col justify-between min-w-0">
                <div>
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className="flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full"
                      style={{ background: 'rgba(0,196,140,0.1)', color: '#00C48C', border: '1px solid rgba(0,196,140,0.2)' }}>
                      <Tag size={10} /> {isRu ? post.tagRu : post.tag}
                    </span>
                    <span className="text-xs" style={{ color: '#334155' }}>{formatDate(post.date, isRu)}</span>
                  </div>
                  <h2 className="text-sm font-bold text-white mb-1 line-clamp-2 group-hover:text-sky-300 transition-colors">
                    {isRu ? post.titleRu : post.title}
                  </h2>
                  <p className="text-xs line-clamp-2 hidden sm:block" style={{ color: '#475569' }}>
                    {isRu ? post.excerptRu : post.excerpt}
                  </p>
                </div>
                <div className="flex items-center gap-1 mt-2">
                  <Clock size={11} style={{ color: '#334155' }} />
                  <span className="text-xs" style={{ color: '#334155' }}>{post.readMin} {isRu ? 'мин' : 'min'}</span>
                  <ChevronRight size={12} className="ml-auto" style={{ color: '#334155' }} />
                </div>
              </div>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

interface BlogPostPageProps {
  slug: string;
  isRu: boolean;
}

export function BlogPostPage({ slug, isRu }: BlogPostPageProps) {
  const post = BLOG_POSTS.find(p => p.slug === slug);

  useEffect(() => {
    if (!post) return;
    const title = `${isRu ? post.titleRu : post.title} | Yalla Influencers Blog`;
    const desc = isRu ? post.excerptRu : post.excerpt;
    document.title = title;
    document.querySelector<HTMLMetaElement>('meta[name="description"]')?.setAttribute('content', desc);
    document.querySelector<HTMLMetaElement>('meta[name="robots"]')?.setAttribute('content', 'index, follow');
    // OG image for social sharing
    document.querySelector<HTMLMetaElement>('meta[property="og:image"]')?.setAttribute('content', post.image);
    let canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) { canonical = document.createElement('link'); canonical.rel = 'canonical'; document.head.appendChild(canonical); }
    canonical.href = `https://yallainfluencers.com/blog/${post.slug}`;
  }, [post, isRu]);

  if (!post) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#080d16' }}>
        <div className="text-center">
          <p className="text-white font-bold mb-2">404 — Article not found</p>
          <a href="/blog" style={{ color: '#38bdf8', fontSize: 14 }}>Back to blog</a>
        </div>
      </div>
    );
  }

  const body = isRu ? post.bodyRu : post.body;

  return (
    <div className="min-h-screen" style={{ background: '#080d16' }}>
      <div className="sticky top-0 z-20 px-4 py-3 flex items-center gap-3"
        style={{ background: 'rgba(8,13,22,0.95)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <button onClick={() => window.location.replace('/blog')}
          className="p-2 rounded-xl transition-all hover:brightness-125"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#94a3b8' }}>
          <ArrowLeft size={16} />
        </button>
        <span className="text-sm text-white font-medium truncate">{isRu ? post.tagRu : post.tag}</span>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Hero image */}
        <div className="rounded-2xl overflow-hidden mb-8" style={{ height: 240 }}>
          <img src={post.image} alt={isRu ? post.titleRu : post.title} className="w-full h-full object-cover" />
        </div>

        {/* Meta */}
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <span className="flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full"
            style={{ background: 'rgba(0,196,140,0.1)', color: '#00C48C', border: '1px solid rgba(0,196,140,0.2)' }}>
            <Tag size={10} /> {isRu ? post.tagRu : post.tag}
          </span>
          <span className="text-xs" style={{ color: '#334155' }}>{formatDate(post.date, isRu)}</span>
          <span className="flex items-center gap-1 text-xs" style={{ color: '#334155' }}>
            <Clock size={10} /> {post.readMin} {isRu ? 'мин чтения' : 'min read'}
          </span>
        </div>

        <h1 className="text-xl font-black text-white mb-6">{isRu ? post.titleRu : post.title}</h1>

        {/* Body */}
        <article>{renderMarkdown(body)}</article>

        {/* CTA */}
        <div className="mt-10 rounded-2xl p-6 text-center" style={{ background: 'rgba(0,196,140,0.05)', border: '1px solid rgba(0,196,140,0.18)' }}>
          <p className="text-sm font-bold text-white mb-2">{isRu ? 'Готовы запустить кампанию?' : 'Ready to launch a campaign?'}</p>
          <p className="text-xs mb-4" style={{ color: '#64748b' }}>
            {isRu
              ? 'Найдите проверенных специалистов на Yalla Influencers — безопасная оплата через эскроу.'
              : 'Find verified creators on Yalla Influencers — secure escrow payments.'}
          </p>
          <a href="/" className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-bold"
            style={{ background: 'rgba(0,196,140,0.12)', color: '#00C48C', border: '1px solid rgba(0,196,140,0.3)' }}>
            {isRu ? 'Перейти на маркетплейс' : 'Browse marketplace'} <ChevronRight size={14} />
          </a>
        </div>

        {/* Other posts */}
        <div className="mt-10">
          <h3 className="text-sm font-bold text-white mb-4">{isRu ? 'Другие статьи' : 'More articles'}</h3>
          <div className="space-y-3">
            {BLOG_POSTS.filter(p => p.slug !== slug).slice(0, 3).map(other => (
              <a key={other.slug} href={`/blog/${other.slug}`}
                className="flex items-center gap-3 rounded-xl p-3 transition-all hover:brightness-125"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', textDecoration: 'none' }}>
                <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
                  <img src={other.image} alt="" className="w-full h-full object-cover" loading="lazy" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{isRu ? other.titleRu : other.title}</p>
                  <p className="text-xs" style={{ color: '#334155' }}>{other.readMin} {isRu ? 'мин' : 'min'}</p>
                </div>
                <ChevronRight size={14} style={{ color: '#334155', flexShrink: 0 }} />
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
