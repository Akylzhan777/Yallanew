import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Instagram, ChevronLeft, ChevronRight, Crown, Clapperboard, Target, Scissors, Camera, TrendingUp, Zap, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { openWhatsApp, WA_MESSAGES } from '../lib/whatsapp';

interface Props {
  onClose: () => void;
}

type View = 'hub' | 'reels';

const WA_BASE = 'https://wa.me/971585973177?text=';

const WA_SVG = (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink: 0 }}>
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/>
  </svg>
);

export default function InstagramHubModal({ onClose }: Props) {
  const { profile } = useAuth();
  const { i18n } = useTranslation();
  const [view, setView] = useState<View>('hub');
  const [reelsStep, setReelsStep] = useState<'segment' | 'growth' | 'testdrive'>('segment');
  const [noEdit, setNoEdit] = useState(false);
  const [selectedPkg, setSelectedPkg] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState(false);

  const isEn =
    i18n.language?.startsWith('en') ||
    localStorage.getItem('yalla_lang') === 'en' ||
    window.location.search.includes('lang=en');

  const REELS_PACKAGES = [
    {
      name: 'Start',
      reels: isEn ? '15 Reels / mo' : '15 Reels / мес',
      price: '6 300',
      duration: isEn ? '/ month' : '/ в месяц',
      color: '#60a5fa',
      colorRgb: '96,165,250',
      hero: false,
      perks: isEn
        ? ['Editing ALL videos', 'Scripts & ideas', 'Personal strategy', 'Sales funnels']
        : ['Монтаж ВСЕХ видео', 'Сценарии и идеи', 'Личная стратегия', 'Воронки продаж'],
    },
    {
      name: 'Scale',
      reels: isEn ? 'Unlimited / mo' : 'Unlimited / мес',
      price: '12 800',
      duration: isEn ? '/ month' : '/ в месяц',
      color: '#ec4899',
      colorRgb: '236,72,153',
      hero: true,
      perks: isEn
        ? ['Unlimited content', 'Scripts & funnels', 'Personal manager', 'A/B format testing']
        : ['Безлимитный контент', 'Сценарии и воронки', 'Персональный менеджер', 'A/B тест форматов'],
    },
    {
      name: 'Empire',
      reels: isEn ? '90 Reels / 3 mo' : '90 Reels / 3 мес',
      price: '30 800',
      duration: isEn ? '/ 3 months' : '/ 3 месяца',
      color: '#fbbf24',
      colorRgb: '251,191,36',
      hero: false,
      perks: isEn
        ? ['Editing ALL videos', 'Full media strategy', 'VIP support 24/7', 'Reach guarantee']
        : ['Монтаж ВСЕХ видео', 'Полная медиа-стратегия', 'VIP-поддержка 24/7', 'Гарантия охватов'],
    },
  ];

  async function sendTelegram(details: string) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/telegram-notify`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token ?? import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            event_type: 'instagram_hub_request',
            details,
            client_name: profile?.name || 'Guest',
          }),
        }
      );
    } catch (_) {}
  }

  async function handleReelsRequest() {
    if (sending) return;
    setSending(true);
    const detail = reelsStep === 'growth'
      ? selectedPkg ? `Reels package: ${selectedPkg}` : 'Reels: no package selected'
      : noEdit ? 'Content Day — no editing (2 500 AED)' : 'Content Day — editing 5 reels (3 500 AED)';
    await sendTelegram(detail);
    setSending(false);
    setToast(true);
    setTimeout(() => setToast(false), 4000);
    openWhatsApp(WA_MESSAGES.reels);
  }

  if (view === 'reels') {
    return (
      <div className="ai-modal-overlay" onClick={onClose}>
        <div className="ai-modal-sheet reels-modal-sheet" onClick={e => e.stopPropagation()}>
          <div className="ai-modal-drag-handle" />

          <div className="reels-modal-hero ighub-reels-hero">
            <button className="rf-back-btn ighub-back-inline" onClick={() => { setView('hub'); setReelsStep('segment'); }}>
              <ChevronLeft size={16} />
            </button>
            <div className="reels-modal-hero-icon ighub-reels-icon">
              <Clapperboard size={22} />
            </div>
            <div className="reels-modal-hero-text">
              <h2 className="reels-modal-hero-title">Reels Production</h2>
              <p className="reels-modal-hero-sub">{isEn ? 'Content that sells' : 'Контент, который продаёт'}</p>
            </div>
            <button className="reels-modal-close" onClick={onClose}><X size={18} /></button>
          </div>

          <div className="reels-scrollable-body">
            <div className="ai-modal-body">
              {reelsStep === 'segment' && (
                <div className="rf-segment">
                  <p className="rf-segment-heading">{isEn ? 'Choose your workflow' : 'Выберите формат работы'}</p>
                  <p className="rf-segment-sub">{isEn ? 'This helps us find the right package for your goal' : 'Это поможет подобрать точный пакет под вашу цель'}</p>
                  <button className="rf-seg-card" onClick={() => setReelsStep('growth')}>
                    <div className="rf-seg-icon rf-seg-icon--blue"><TrendingUp size={22} /></div>
                    <div className="rf-seg-text">
                      <span className="rf-seg-title">Systemic Growth</span>
                      <span className="rf-seg-desc">{isEn ? 'Packages for brand & sales growth.' : 'Пакеты для роста бренда и продаж.'}</span>
                      <span className="rf-seg-target">{isEn ? 'Personal brand · Business · Expert' : 'Личный бренд · Бизнес · Эксперт'}</span>
                    </div>
                    <ChevronRight size={18} className="rf-seg-arrow" />
                  </button>
                  <button className="rf-seg-card" onClick={() => setReelsStep('testdrive')}>
                    <div className="rf-seg-icon rf-seg-icon--teal"><Zap size={22} /></div>
                    <div className="rf-seg-text">
                      <span className="rf-seg-title">Test Drive</span>
                      <span className="rf-seg-desc">{isEn ? 'Single session / Trial shoot for those who want to try the format.' : 'Разовая съёмка для тех, кто хочет попробовать формат.'}</span>
                      <span className="rf-seg-target">{isEn ? 'Content Day · One-time launch' : 'Content Day · Разовый запуск'}</span>
                    </div>
                    <ChevronRight size={18} className="rf-seg-arrow" />
                  </button>
                </div>
              )}

              {reelsStep === 'growth' && (
                <div className="rf-growth">
                  <button className="rf-back-btn" onClick={() => setReelsStep('segment')}>
                    <ChevronLeft size={14} /> {isEn ? 'Back' : 'Назад'}
                  </button>
                  <div className="rf-growth-intro">
                    <p>{isEn
                      ? <span>Each package includes <strong>editing ALL videos</strong>, personal strategy, scripts, and ready-made sales funnels.</span>
                      : <span>Каждый пакет включает <strong>монтаж ВСЕХ видео</strong>, личную стратегию, сценарии и готовые воронки продаж.</span>
                    }</p>
                  </div>
                  <div className="reels-packages-scroll">
                    <div className="reels-packages-track">
                      {REELS_PACKAGES.map(pkg => (
                        <div
                          key={pkg.name}
                          className={`reels-pkg-card${pkg.hero ? ' reels-pkg-card--hero' : ''}${selectedPkg === pkg.name ? ' reels-pkg-card--selected' : ''}`}
                          style={{ '--pkg-color': pkg.color, '--pkg-rgb': pkg.colorRgb } as React.CSSProperties}
                          onClick={() => setSelectedPkg(pkg.name)}
                        >
                          {pkg.hero && (
                            <div className="reels-pkg-hero-badge"><Crown size={11} /> BEST VALUE · UNLIMITED</div>
                          )}
                          <div className="reels-pkg-name">{pkg.name}</div>
                          <div className="reels-pkg-price-block">
                            <span className="reels-pkg-amount">{pkg.price}</span>
                            <div className="reels-pkg-price-meta">
                              <span className="reels-pkg-currency">AED</span>
                              <span className="reels-pkg-duration">{pkg.duration}</span>
                            </div>
                          </div>
                          <div className="reels-pkg-reels-tag">
                            {pkg.hero ? (
                              <span><strong style={{ color: '#ec4899', letterSpacing: '-0.01em' }}>Unlimited</strong> {isEn ? '/ mo' : '/ мес'}</span>
                            ) : pkg.reels}
                          </div>
                          <ul className="rf-pkg-perks">
                            {pkg.perks.map((p, i) => (
                              <li key={i}><span className="rf-perk-dot" style={{ background: pkg.color }} />{p}</li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {reelsStep === 'testdrive' && (
                <div className="rf-testdrive">
                  <button className="rf-back-btn" onClick={() => setReelsStep('segment')}>
                    <ChevronLeft size={14} /> {isEn ? 'Back' : 'Назад'}
                  </button>
                  <div className="rf-td-card" style={{ '--pkg-rgb': '45,212,191' } as React.CSSProperties}>
                    <div className="rf-td-badge">Content Day</div>
                    <div className="rf-td-price-row">
                      <span className="rf-td-amount">{noEdit ? '2 500' : '3 500'}</span>
                      <div className="rf-td-price-meta">
                        <span className="rf-td-currency">AED</span>
                        <span className="rf-td-duration">{isEn ? '/ one-time' : '/ разово'}</span>
                      </div>
                    </div>
                    <ul className="rf-td-perks">
                      <li><span className="rf-perk-dot rf-perk-dot--teal" />{isEn ? 'Up to 4 hours of shooting' : 'До 4 часов съёмки'}</li>
                      <li><span className="rf-perk-dot rf-perk-dot--teal" />{isEn ? 'Source files of all videos' : 'Исходники всех видео'}</li>
                      {!noEdit && <li><span className="rf-perk-dot rf-perk-dot--teal" />{isEn ? 'Editing 5 best reels turnkey' : 'Монтаж 5 лучших рилсов под ключ'}</li>}
                      {noEdit && <li className="rf-td-perk--muted"><span className="rf-perk-dot rf-perk-dot--muted" />{isEn ? 'No editing (source files only)' : 'Без монтажа (только исходники)'}</li>}
                    </ul>
                    <button
                      className={`rf-td-toggle${noEdit ? ' rf-td-toggle--active' : ''}`}
                      onClick={() => setNoEdit(v => !v)}
                    >
                      {noEdit
                        ? (isEn ? '+ Add editing for 5 reels (+1 000 AED)' : '+ Добавить монтаж 5 рилсов (+1 000 AED)')
                        : (isEn ? 'Without editing (source files only)' : 'Хочу без монтажа (только исходники)')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {reelsStep !== 'segment' && (
            <div className="reels-sticky-cta">
              <button className="reels-cta-btn-sticky wa-cta-btn" onClick={handleReelsRequest} disabled={sending}>
                {WA_SVG}
                {sending ? (isEn ? 'Sending...' : 'Отправка...') : (isEn ? 'Message on WhatsApp' : 'Написать в WhatsApp')}
              </button>
            </div>
          )}
        </div>

        {toast && (
          <div className="hub-audio-toast">
            <CheckCircle size={16} />
            <span>{isEn ? 'Request received! A manager will contact you.' : 'Заявка принята! Менеджер свяжется с вами.'}</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="ai-modal-overlay" onClick={onClose}>
      <div className="ai-modal-sheet ighub-sheet" onClick={e => e.stopPropagation()}>
        <div className="ai-modal-drag-handle" />

        <div className="ighub-header">
          <div className="ighub-header-icon">
            <Instagram size={20} />
          </div>
          <div className="ighub-header-text">
            <h2 className="ighub-title">Instagram</h2>
            <p className="ighub-subtitle">{isEn ? 'Full-service hub' : 'Комплексный сервис-хаб'}</p>
          </div>
          <span className="ighub-popular-badge">{isEn ? 'POPULAR' : 'ПОПУЛЯРНО'}</span>
          <button className="ai-modal-close" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="ai-modal-body ighub-body">

          <div className="ighub-section-label">{isEn ? 'Comprehensive promotion' : 'Комплексное продвижение'}</div>

          <button
            className="ighub-service-card ighub-service-card--reels"
            onClick={() => setView('reels')}
          >
            <div className="ighub-card-left">
              <div className="ighub-card-icon ighub-card-icon--reels">
                <Clapperboard size={20} />
              </div>
              <div className="ighub-card-info">
                <div className="ighub-card-header">
                  <span className="ighub-card-title">Reels Production</span>
                  <span className="ighub-card-badge ighub-card-badge--hit">{isEn ? 'HIT' : 'ХИТ'}</span>
                </div>
                <p className="ighub-card-desc">{isEn ? 'Professional editing and strategy. Plans from 6 300 AED.' : 'Профессиональный монтаж и стратегия. Тарифы от 6 300 AED.'}</p>
                <div className="ighub-card-tiers">
                  <span className="ighub-tier">Start · 6 300</span>
                  <span className="ighub-tier ighub-tier--hot">Scale · 12 800</span>
                  <span className="ighub-tier">Empire · 30 800</span>
                </div>
              </div>
            </div>
            <ChevronRight size={16} className="ighub-card-arrow" />
          </button>

          <a
            className="ighub-service-card ighub-service-card--ads"
            href={`${WA_BASE}${encodeURIComponent(isEn ? 'I want to launch Instagram ads (Reels & Stories targeting)' : 'Хочу запустить Instagram рекламу (таргет Reels & Stories)')}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => sendTelegram('Instagram Ads — request')}
          >
            <div className="ighub-card-left">
              <div className="ighub-card-icon ighub-card-icon--ads">
                <Target size={20} />
              </div>
              <div className="ighub-card-info">
                <div className="ighub-card-header">
                  <span className="ighub-card-title">Instagram Ads</span>
                  <span className="ighub-card-badge ighub-card-badge--popular">{isEn ? 'POPULAR' : 'ПОПУЛЯРНО'}</span>
                </div>
                <p className="ighub-card-desc">{isEn ? 'Targeted Reels & Stories ads. Attract followers and clients.' : 'Таргетированная реклама Reels & Stories. Привлечение подписчиков и клиентов.'}</p>
                <div className="ighub-price-row">
                  <span className="ighub-price-num">2 500</span>
                  <span className="ighub-price-unit">{isEn ? 'AED / mo' : 'AED / мес'}</span>
                </div>
              </div>
            </div>
            <div className="ighub-card-arrow ighub-wa-hint">{WA_SVG}</div>
          </a>

          <div className="ighub-section-label" style={{ marginTop: 4 }}>{isEn ? 'One-time services' : 'Разовые услуги'}</div>

          <a
            className="ighub-service-card ighub-service-card--edit"
            href={`${WA_BASE}${encodeURIComponent(isEn ? 'I want to order a single video edit (200 AED / reel)' : 'Хочу заказать разовый монтаж видео (200 AED / ролик)')}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => sendTelegram('Single edit — request')}
          >
            <div className="ighub-card-left">
              <div className="ighub-card-icon ighub-card-icon--edit">
                <Scissors size={20} />
              </div>
              <div className="ighub-card-info">
                <div className="ighub-card-header">
                  <span className="ighub-card-title">{isEn ? 'Single Edit' : 'Разовый монтаж'}</span>
                </div>
                <p className="ighub-card-desc">{isEn ? 'Edit your video up to 1 minute. Send the footage — we deliver a dynamic reel turnkey.' : 'Монтаж вашего видео до 1 минуты. Вы присылаете исходники — мы делаем динамичный ролик под ключ.'}</p>
                <div className="ighub-price-row">
                  <span className="ighub-price-num">200</span>
                  <span className="ighub-price-unit">{isEn ? 'AED / reel' : 'AED / ролик'}</span>
                </div>
              </div>
            </div>
            <div className="ighub-card-arrow ighub-wa-hint">{WA_SVG}</div>
          </a>

          <a
            className="ighub-service-card ighub-service-card--photo"
            href={`${WA_BASE}${encodeURIComponent(isEn ? 'I want to book a Content Day photo shoot (800 AED / hour)' : 'Хочу заказать фотосессию Content Day (800 AED / час)')}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => sendTelegram('Content Day photo shoot — request')}
          >
            <div className="ighub-card-left">
              <div className="ighub-card-icon ighub-card-icon--photo">
                <Camera size={20} />
              </div>
              <div className="ighub-card-info">
                <div className="ighub-card-header">
                  <span className="ighub-card-title">{isEn ? 'Photo Shoot' : 'Фотосессия'}</span>
                  <span className="ighub-card-badge ighub-card-badge--content">Content Day</span>
                </div>
                <p className="ighub-card-desc">{isEn ? 'Professional content shoot for your feed and stories. Perfect lighting and color correction included.' : 'Профессиональная съемка вашего контента для ленты и сторис. Идеальный свет и цветокоррекция включены.'}</p>
                <div className="ighub-price-row">
                  <span className="ighub-price-num">800</span>
                  <span className="ighub-price-unit">{isEn ? 'AED / hr' : 'AED / час'}</span>
                </div>
              </div>
            </div>
            <div className="ighub-card-arrow ighub-wa-hint">{WA_SVG}</div>
          </a>

        </div>
      </div>
    </div>
  );
}
