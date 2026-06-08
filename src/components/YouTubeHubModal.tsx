import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Youtube, ChevronLeft, ChevronRight, CheckCircle, Sparkles, Video, TrendingUp, Clock, Scissors } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

type Path = 'select' | 'setup' | 'shoot' | 'growth';
type ShootMode = 'raw' | 'edited';

const WA_BASE = 'https://wa.me/971585973177?text=';

const WA_SVG = (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink: 0 }}>
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/>
  </svg>
);

interface Props {
  onClose: () => void;
}

export default function YouTubeHubModal({ onClose }: Props) {
  const { profile } = useAuth();
  const { i18n } = useTranslation();

  const isEn =
    i18n.language?.startsWith('en') ||
    localStorage.getItem('yalla_lang') === 'en' ||
    window.location.search.includes('lang=en');
  const [path, setPath] = useState<Path>('select');
  const [shootMode, setShootMode] = useState<ShootMode>('raw');
  const [toast, setToast] = useState(false);

  async function notify(details: string) {
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
            event_type: 'youtube_hub_request',
            details,
            client_name: profile?.name || 'Гость',
          }),
        }
      );
    } catch (_) {}
    setToast(true);
    setTimeout(() => setToast(false), 4000);
  }

  function waLink(msg: string) {
    return `${WA_BASE}${encodeURIComponent(msg)}`;
  }

  return (
    <div className="ai-modal-overlay" onClick={onClose}>
      <div className="ai-modal-sheet ythub-sheet" onClick={e => e.stopPropagation()}>
        <div className="ai-modal-drag-handle" />

        <div className="ythub-header">
          <div className="ythub-header-icon">
            <Youtube size={20} />
          </div>
          <div className="ythub-header-text">
            <h2 className="ythub-title">YouTube</h2>
            <p className="ythub-subtitle">{isEn ? 'Professional Promotion' : 'Профессиональное продвижение'}</p>
          </div>
          {path !== 'select' && (
            <button className="ythub-back-btn" onClick={() => setPath('select')}>
              <ChevronLeft size={16} />
            </button>
          )}
          <button className="ai-modal-close" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="ai-modal-body ythub-body">

          {/* ── STEP 1: PATH SELECTOR ── */}
          {path === 'select' && (
            <div className="ythub-select">
              <p className="ythub-select-heading">{isEn ? 'Choose a format' : 'Выберите формат'}</p>
              <p className="ythub-select-sub">{isEn ? 'We will find the exact solution for your goal' : 'Мы подберём точное решение под вашу задачу'}</p>

              <button className="ythub-path-card" onClick={() => setPath('setup')}>
                <div className="ythub-path-icon ythub-path-icon--setup">
                  <Sparkles size={20} />
                </div>
                <div className="ythub-path-text">
                  <span className="ythub-path-title">{isEn ? 'Channel Setup' : 'Открытие канала'}</span>
                  <span className="ythub-path-desc">{isEn ? 'Turnkey channel creation with SEO and branding.' : 'Создание канала под ключ с SEO и фирменным оформлением.'}</span>
                  <span className="ythub-path-price">{isEn ? '1,200 AED · one-time' : '1 200 AED · разово'}</span>
                </div>
                <ChevronRight size={16} className="ythub-path-arrow" />
              </button>

              <button className="ythub-path-card" onClick={() => setPath('shoot')}>
                <div className="ythub-path-icon ythub-path-icon--shoot">
                  <Video size={20} />
                </div>
                <div className="ythub-path-text">
                  <span className="ythub-path-title">{isEn ? 'One-time Shoot' : 'Разовая съёмка'}</span>
                  <span className="ythub-path-desc">{isEn ? 'Studio or on-location shoot with optional editing.' : 'Студийная или выездная съёмка с опцией монтажа.'}</span>
                  <span className="ythub-path-price">{isEn ? 'from 800 AED / hour' : 'от 800 AED / час'}</span>
                </div>
                <ChevronRight size={16} className="ythub-path-arrow" />
              </button>

              <button className="ythub-path-card ythub-path-card--hero" onClick={() => setPath('growth')}>
                <div className="ythub-path-badge">{isEn ? 'TOP' : 'ТОПОВЫЙ'}</div>
                <div className="ythub-path-icon ythub-path-icon--growth">
                  <TrendingUp size={20} />
                </div>
                <div className="ythub-path-text">
                  <span className="ythub-path-title">{isEn ? 'Personal Promotion' : 'Персональное продвижение'}</span>
                  <span className="ythub-path-desc">{isEn ? '4 episodes per month, full editing, strategy and SEO.' : '4 выпуска в месяц, полный монтаж, стратегия и SEO.'}</span>
                  <span className="ythub-path-price">{isEn ? '14,500 AED / mo' : '14 500 AED / мес'}</span>
                </div>
                <ChevronRight size={16} className="ythub-path-arrow" />
              </button>
            </div>
          )}

          {/* ── PATH: ОТКРЫТИЕ КАНАЛА ── */}
          {path === 'setup' && (
            <div className="ythub-detail">
              <div className="ythub-detail-hero ythub-detail-hero--setup">
                <div className="ythub-detail-hero-icon"><Sparkles size={22} /></div>
                <div>
                  <p className="ythub-detail-hero-title">{isEn ? 'Channel Setup' : 'Открытие канала'}</p>
                  <p className="ythub-detail-hero-tag">{isEn ? 'One-time service' : 'Разовая услуга'}</p>
                </div>
                <div className="ythub-detail-price-pill">
                  <span className="ythub-detail-price-num">1 200</span>
                  <span className="ythub-detail-price-unit">AED</span>
                </div>
              </div>

              <div className="ythub-feature-list">
                {[
                  isEn ? 'Full YouTube channel creation and setup' : 'Создание и полная настройка YouTube-канала',
                  isEn ? 'Custom avatar and banner design' : 'Разработка уникальной аватарки и баннера',
                  isEn ? 'SEO channel description for algorithms' : 'SEO-описание канала под алгоритмы',
                  isEn ? 'Technical setup: sections, keywords, localization' : 'Техническая настройка: разделы, ключевые слова, локализация',
                  isEn ? 'Initial content plan for launch' : 'Первичный контент-план для старта',
                ].map((f, i) => (
                  <div key={i} className="ythub-feature-row">
                    <CheckCircle size={14} className="ythub-feature-check" />
                    <span>{f}</span>
                  </div>
                ))}
              </div>

              <a
                className="ythub-cta-btn"
                href={waLink('Хочу заказать открытие YouTube-канала под ключ (1 200 AED)')}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => notify('Открытие канала — 1 200 AED')}
              >
                {WA_SVG} {isEn ? 'Message on WhatsApp' : 'Написать в WhatsApp'}
              </a>
            </div>
          )}

          {/* ── PATH: РАЗОВАЯ СЪЁМКА ── */}
          {path === 'shoot' && (
            <div className="ythub-detail">
              <div className="ythub-detail-hero ythub-detail-hero--shoot">
                <div className="ythub-detail-hero-icon"><Video size={22} /></div>
                <div>
                  <p className="ythub-detail-hero-title">{isEn ? 'One-time Shoot' : 'Разовая съёмка'}</p>
                  <p className="ythub-detail-hero-tag">{isEn ? 'Flexible format' : 'Гибкий формат'}</p>
                </div>
              </div>

              <div className="ythub-shoot-toggle">
                <button
                  className={`ythub-toggle-btn${shootMode === 'raw' ? ' ythub-toggle-btn--active' : ''}`}
                  onClick={() => setShootMode('raw')}
                >
                  <Clock size={14} /> {isEn ? 'Shoot only' : 'Только съёмка'}
                </button>
                <button
                  className={`ythub-toggle-btn${shootMode === 'edited' ? ' ythub-toggle-btn--active' : ''}`}
                  onClick={() => setShootMode('edited')}
                >
                  <Scissors size={14} /> {isEn ? 'Shoot + Editing' : 'Съёмка + Монтаж'}
                </button>
              </div>

              {shootMode === 'raw' && (
                <div className="ythub-shoot-card ythub-shoot-card--raw">
                  <div className="ythub-shoot-price-row">
                    <span className="ythub-shoot-price-num">800</span>
                    <div className="ythub-shoot-price-meta">
                      <span className="ythub-shoot-price-currency">AED</span>
                      <span className="ythub-shoot-price-duration">/ час</span>
                    </div>
                  </div>
                  <div className="ythub-feature-list" style={{ marginTop: 14 }}>
                    {[
                      isEn ? 'Studio or on-location shoot' : 'Студийная или выездная съёмка',
                      isEn ? 'Professional lighting and sound' : 'Профессиональный свет и звук',
                      isEn ? 'You receive all raw footage without editing' : 'Вы получаете все исходники без монтажа',
                      isEn ? 'Minimum 2-hour session' : 'Минимум 2 часа сессии',
                    ].map((f, i) => (
                      <div key={i} className="ythub-feature-row">
                        <CheckCircle size={14} className="ythub-feature-check" />
                        <span>{f}</span>
                      </div>
                    ))}
                  </div>
                  <a
                    className="ythub-cta-btn"
                    href={waLink('Хочу заказать разовую съёмку YouTube (только исходники, 800 AED/час)')}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => notify('Разовая съёмка — только исходники')}
                  >
                    {WA_SVG} Написать в WhatsApp
                  </a>
                </div>
              )}

              {shootMode === 'edited' && (
                <div className="ythub-shoot-card ythub-shoot-card--edited">
                  <div className="ythub-shoot-price-row">
                    <div className="ythub-shoot-price-stack">
                      <div className="ythub-shoot-price-line">
                        <span className="ythub-shoot-price-num">800</span>
                        <span className="ythub-shoot-price-label">{isEn ? 'AED / hour of shooting' : 'AED / час съёмки'}</span>
                      </div>
                      <div className="ythub-shoot-price-plus">+</div>
                      <div className="ythub-shoot-price-line">
                        <span className="ythub-shoot-price-num">100</span>
                        <span className="ythub-shoot-price-label">{isEn ? 'AED / min of finished editing' : 'AED / мин готового монтажа'}</span>
                      </div>
                    </div>
                  </div>
                  <p className="ythub-shoot-offer-text">
                    {isEn ? 'Professional editing with dynamic cuts, graphics and sound design.' : 'Профессиональный монтаж с динамичной нарезкой, графикой и звуковым оформлением.'}
                  </p>
                  <div className="ythub-feature-list" style={{ marginTop: 10 }}>
                    {[
                      'Студийная или выездная съёмка',
                      isEn ? 'Turnkey editing with transitions and graphics' : 'Монтаж «под ключ» с переходами и графикой',
                      isEn ? 'Color grading and sound design' : 'Цветокоррекция и звуковое оформление',
                      isEn ? 'Final file in 4K or 1080p' : 'Финальный файл в 4K или 1080p',
                    ].map((f, i) => (
                      <div key={i} className="ythub-feature-row">
                        <CheckCircle size={14} className="ythub-feature-check" />
                        <span>{f}</span>
                      </div>
                    ))}
                  </div>
                  <a
                    className="ythub-cta-btn"
                    href={waLink('Хочу заказать съёмку + монтаж YouTube (800 AED/час + 100 AED/мин монтажа)')}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => notify('Разовая съёмка — съёмка + монтаж')}
                  >
                    {WA_SVG} Написать в WhatsApp
                  </a>
                </div>
              )}
            </div>
          )}

          {/* ── PATH: ПЕРСОНАЛЬНОЕ ПРОДВИЖЕНИЕ ── */}
          {path === 'growth' && (
            <div className="ythub-detail">
              <div className="ythub-detail-hero ythub-detail-hero--growth">
                <div className="ythub-detail-hero-icon"><TrendingUp size={22} /></div>
                <div>
                  <p className="ythub-detail-hero-title">{isEn ? 'Personal Promotion' : 'Персональное продвижение'}</p>
                  <p className="ythub-detail-hero-tag">{isEn ? 'Systematic channel growth' : 'Системный рост канала'}</p>
                </div>
                <div className="ythub-detail-price-pill ythub-detail-price-pill--gold">
                  <span className="ythub-detail-price-num">14 500</span>
                  <span className="ythub-detail-price-unit">AED / мес</span>
                </div>
              </div>

              <div className="ythub-growth-note">
                {isEn ? '4 full episodes per month — from idea to publication.' : '4 полноценных выпуска в месяц — от идеи до публикации.'}
              </div>

              <div className="ythub-feature-list">
                {[
                  isEn ? 'Strategy and scripts for 4 episodes' : 'Разработка стратегии и сценариев для 4-х выпусков',
                  isEn ? 'Full day of shooting in studio or on location' : 'Полный день съёмок в студии или на локации',
                  isEn ? 'Turnkey editing with a unique authorial style' : 'Монтаж «под ключ» с уникальным авторским стилем',
                  isEn ? 'Thumbnail design (Preview) optimized for algorithm' : 'Оформление обложек (Preview) под алгоритм',
                  isEn ? 'SEO optimization: titles, tags, descriptions' : 'SEO-оптимизация: заголовки, теги, описания',
                  isEn ? 'Personal manager and growth analytics' : 'Персональный менеджер и аналитика роста',
                ].map((f, i) => (
                  <div key={i} className="ythub-feature-row">
                    <CheckCircle size={14} className="ythub-feature-check ythub-feature-check--gold" />
                    <span>{f}</span>
                  </div>
                ))}
              </div>

              <a
                className="ythub-cta-btn ythub-cta-btn--gold"
                href={waLink('Хочу подключить Персональное продвижение YouTube (14 500 AED/мес)')}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => notify('Персональное продвижение YouTube — 14 500 AED/мес')}
              >
                {WA_SVG} Написать в WhatsApp
              </a>
            </div>
          )}

        </div>
      </div>

      {toast && (
        <div className="hub-audio-toast">
          <CheckCircle size={16} />
          <span>{isEn ? 'Request sent! A manager will contact you.' : 'Заявка отправлена! Менеджер свяжется с вами.'}</span>
        </div>
      )}
    </div>
  );
}
