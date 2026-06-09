import { useState } from 'react';
import { X, Clapperboard, CheckCircle, Crown, ChevronLeft, ChevronRight, TrendingUp, Zap } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { safeGetItem } from '../utils/safeStorage';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { openWhatsApp, WA_MESSAGES } from '../lib/whatsapp';

interface Props {
  onClose: () => void;
}

type Step = 'segment' | 'growth' | 'testdrive';

const GROWTH_PACKAGES = [
  {
    name: 'Start',
    reels: '15 Reels / мес',
    price: '6 300',
    duration: '/ в месяц',
    color: '#60a5fa',
    colorRgb: '96,165,250',
    hero: false,
    perks: ['Монтаж ВСЕХ видео', 'Сценарии и идеи', 'Личная стратегия', 'Воронки продаж'],
  },
  {
    name: 'Scale',
    reels: 'Unlimited / мес',
    price: '12 800',
    duration: '/ в месяц',
    color: '#3b82f6',
    colorRgb: '59,130,246',
    hero: true,
    perks: ['Безлимитный контент', 'Сценарии и воронки', 'Персональный менеджер', 'A/B тест форматов'],
  },
  {
    name: 'Empire',
    reels: '90 Reels / 3 мес',
    price: '30 800',
    duration: '/ 3 месяца',
    color: '#fbbf24',
    colorRgb: '251,191,36',
    hero: false,
    perks: ['Монтаж ВСЕХ видео', 'Полная медиа-стратегия', 'VIP-поддержка 24/7', 'Гарантия охватов'],
  },
];

export default function ReelsProductionModal({ onClose }: Props) {
  const { profile } = useAuth();
  const { i18n } = useTranslation();
  const [step, setStep] = useState<Step>('segment');

  const isEn =
    i18n.language?.startsWith('en') ||
    safeGetItem('yalla_lang') === 'en' ||
    window.location.search.includes('lang=en');
  const [noEdit, setNoEdit] = useState(false);
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState(false);
  const [selectedPkg, setSelectedPkg] = useState<string | null>(null);

  async function sendTelegram(details: string) {
    const clientName = profile?.name || 'Гость';
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
            event_type: 'reels_production',
            details,
            client_name: clientName,
          }),
        }
      );
    } catch (_) {}
  }

  async function handleRequest(detail: string) {
    if (sending) return;
    setSending(true);
    await sendTelegram(detail);
    setSending(false);
    setToast(true);
    setTimeout(() => setToast(false), 4000);
  }

  return (
    <div className="ai-modal-overlay" onClick={onClose}>
      <div className="ai-modal-sheet reels-modal-sheet" onClick={e => e.stopPropagation()}>
        <div className="ai-modal-drag-handle" />

        <div className="reels-modal-hero">
          <div className="reels-modal-hero-icon">
            <Clapperboard size={24} />
          </div>
          <div className="reels-modal-hero-text">
            <h2 className="reels-modal-hero-title">Reels Production</h2>
            <p className="reels-modal-hero-sub">{isEn ? 'Content that sells' : 'Контент, который продаёт'}</p>
          </div>
          <button className="reels-modal-close" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="reels-scrollable-body">
          <div className="ai-modal-body">

            {/* ── STEP 1: SEGMENT SELECTOR ── */}
            {step === 'segment' && (
              <div className="rf-segment">
                <p className="rf-segment-heading">Choose your workflow</p>
                <p className="rf-segment-sub">{isEn ? 'This will help us find the exact package for your goal' : 'Это поможет подобрать точный пакет под вашу цель'}</p>

                <button
                  className="rf-seg-card"
                  onClick={() => setStep('growth')}
                >
                  <div className="rf-seg-icon rf-seg-icon--blue">
                    <TrendingUp size={22} />
                  </div>
                  <div className="rf-seg-text">
                    <span className="rf-seg-title">Systemic Growth</span>
                    <span className="rf-seg-desc">Packages for brand & sales growth.</span>
                    <span className="rf-seg-target">{isEn ? 'Personal brand · Business · Expert' : 'Личный бренд · Бизнес · Эксперт'}</span>
                  </div>
                  <ChevronRight size={18} className="rf-seg-arrow" />
                </button>

                <button
                  className="rf-seg-card"
                  onClick={() => setStep('testdrive')}
                >
                  <div className="rf-seg-icon rf-seg-icon--teal">
                    <Zap size={22} />
                  </div>
                  <div className="rf-seg-text">
                    <span className="rf-seg-title">Test Drive</span>
                    <span className="rf-seg-desc">{isEn ? 'Single session / Trial shoot for those who want to try the format.' : 'Разовая сессия / Пробная съёмка для тех, кто хочет попробовать формат.'}</span>
                    <span className="rf-seg-target">{isEn ? 'Content Day · One-time launch' : 'Content Day · Разовый запуск'}</span>
                  </div>
                  <ChevronRight size={18} className="rf-seg-arrow" />
                </button>
              </div>
            )}

            {/* ── STEP 2A: GROWTH PACKAGES ── */}
            {step === 'growth' && (
              <div className="rf-growth">
                <button className="rf-back-btn" onClick={() => setStep('segment')}>
                  <ChevronLeft size={14} /> {isEn ? 'Back' : 'Назад'}
                </button>

                <div className="rf-growth-intro">
                  <p>{isEn
                    ? <>Every package includes <strong>editing of ALL videos</strong>, a personal strategy, scripts, and ready-made sales funnels.</>
                    : <>Каждый пакет включает <strong>монтаж ВСЕХ видео</strong>, личную стратегию, сценарии и готовые воронки продаж.</>
                  }</p>
                </div>

                <div className="reels-packages-scroll">
                  <div className="reels-packages-track">
                    {GROWTH_PACKAGES.map(pkg => (
                      <div
                        key={pkg.name}
                        className={`reels-pkg-card${pkg.hero ? ' reels-pkg-card--hero' : ''}${selectedPkg === pkg.name ? ' reels-pkg-card--selected' : ''}`}
                        style={{ '--pkg-color': pkg.color, '--pkg-rgb': pkg.colorRgb } as React.CSSProperties}
                        onClick={() => setSelectedPkg(pkg.name)}
                      >
                        {pkg.hero && (
                          <div className="reels-pkg-hero-badge">
                            <Crown size={11} /> BEST VALUE · UNLIMITED
                          </div>
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
                            <><strong style={{ color: '#60a5fa', letterSpacing: '-0.01em' }}>Unlimited</strong> / мес</>
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

            {/* ── STEP 2B: TEST-DRIVE ── */}
            {step === 'testdrive' && (
              <div className="rf-testdrive">
                <button className="rf-back-btn" onClick={() => setStep('segment')}>
                  <ChevronLeft size={14} /> {isEn ? 'Back' : 'Назад'}
                </button>

                <div
                  className="rf-td-card"
                  style={{ '--pkg-rgb': '45,212,191' } as React.CSSProperties}
                >
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
                    <li><span className="rf-perk-dot rf-perk-dot--teal" />{isEn ? 'Raw footage of all videos' : 'Исходники всех видео'}</li>
                    {!noEdit && (
                      <li><span className="rf-perk-dot rf-perk-dot--teal" />{isEn ? 'Editing of 5 best reels turnkey' : 'Монтаж 5 лучших рилсов под ключ'}</li>
                    )}
                    {noEdit && (
                      <li className="rf-td-perk--muted"><span className="rf-perk-dot rf-perk-dot--muted" />{isEn ? 'No editing (raw footage only)' : 'Без монтажа (только исходники)'}</li>
                    )}
                  </ul>

                  <button
                    className={`rf-td-toggle${noEdit ? ' rf-td-toggle--active' : ''}`}
                    onClick={() => setNoEdit(v => !v)}
                  >
                    {noEdit
                      ? (isEn ? '+ Add editing of 5 reels (+1,000 AED)' : '+ Добавить монтаж 5 рилсов (+1 000 AED)')
                      : (isEn ? 'I want no editing (raw footage only)' : 'Хочу без монтажа (только исходники)')}
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>

        {step !== 'segment' && (
          <div className="reels-sticky-cta">
            <button
              className="reels-cta-btn-sticky wa-cta-btn"
              onClick={() => {
                let detail = '';
                if (step === 'growth') {
                  detail = selectedPkg
                    ? `Request: Системный рост — пакет ${selectedPkg}`
                    : 'Request: Системный рост (пакет не выбран)';
                } else {
                  detail = noEdit
                    ? 'Request: Content Day — без монтажа (2 500 AED)'
                    : 'Request: Content Day — монтаж 5 рилсов (3 500 AED)';
                }
                handleRequest(detail);
                openWhatsApp(WA_MESSAGES.reels);
              }}
              disabled={sending}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink: 0 }}>
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/>
              </svg>
              {sending ? (isEn ? 'Sending...' : 'Отправка...') : (isEn ? 'Message on WhatsApp' : 'Написать в WhatsApp')}
            </button>
          </div>
        )}
      </div>

      {toast && (
        <div className="hub-audio-toast">
          <CheckCircle size={16} />
          <span>{isEn ? 'Request received! A manager will contact you shortly.' : 'Заявка принята! Менеджер свяжется с вами в ближайшее время.'}</span>
        </div>
      )}
    </div>
  );
}
