import { X, ChevronLeft, Mic, Zap, Radio, UserCheck, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface Props {
  onClose: () => void;
  onBack: () => void;
}

const WA_URL = 'https://wa.me/971585973177';

export default function AiAudioModal({ onClose, onBack }: Props) {
  const { i18n } = useTranslation();

  const isEn =
    i18n.language?.startsWith('en') ||
    localStorage.getItem('yalla_lang') === 'en' ||
    window.location.search.includes('lang=en');

  const WHAT_WE_DO = [
    { icon: Zap,       text: isEn ? '100% background noise and echo removal.' : 'Удаление 100% фонового шума и эха.' },
    { icon: Radio,     text: isEn ? 'Voice frequency restoration (expensive microphone effect).' : 'Восстановление частот голоса (эффект дорогого микрофона).' },
    { icon: UserCheck, text: isEn ? 'Manual review and correction by an engineer.' : 'Ручная проверка и коррекция инженером.' },
  ];

  return (
    <div className="ai-modal-overlay" onClick={onClose}>
      <div className="ai-modal-sheet" onClick={e => e.stopPropagation()}>
        <div className="ai-modal-drag-handle" />

        <div className="ai-modal-header">
          <button className="ai-modal-back" onClick={onBack}><ChevronLeft size={18} /></button>
          <div className="ai-modal-header-icon aiaudio-header-icon">
            <Mic size={20} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h2 className="ai-modal-title">{isEn ? 'AI Audio Enhancement' : 'ИИ-Улучшение звука'}</h2>
              <span className="aiaudio-fast-badge">{isEn ? 'FAST RESULT' : 'БЫСТРЫЙ РЕЗУЛЬТАТ'}</span>
            </div>
            <p className="ai-modal-subtitle">Studio Quality</p>
          </div>
          <button className="ai-modal-close" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="ai-modal-body">

          <div className="aiaudio-hero-block">
            <div className="aiaudio-hero-visual">
              <div className="aiaudio-wave aiaudio-wave--1" />
              <div className="aiaudio-wave aiaudio-wave--2" />
              <div className="aiaudio-wave aiaudio-wave--3" />
              <div className="aiaudio-hero-icon"><Mic size={26} /></div>
            </div>
            <p className="aiaudio-lead">
              {isEn ? (
                <>
                  Recorded an important video or podcast on your phone, but wind noise, echo or background sounds are ruining it?
                  Our AI combined with an engineer will make your voice{' '}
                  <strong>velvety and clean</strong>, as if you recorded it{' '}
                  <strong>in a professional studio</strong>.
                </>
              ) : (
                <>
                  Записали важное видео или подкаст на телефон, но мешает шум ветра, эхо или посторонние звуки?
                  Наш ИИ в связке с инженером сделает ваш голос{' '}
                  <strong>бархатным и чистым</strong>, как будто вы записывались{' '}
                  <strong>в профессиональной студии</strong>.
                </>
              )}
            </p>
          </div>

          <div className="aiaudio-section-label">{isEn ? "What we do" : 'Что мы делаем'}</div>
          <div className="aiaudio-steps-wrap">
            {WHAT_WE_DO.map(({ icon: Icon, text }, i) => (
              <div key={i} className="aiaudio-step-row">
                <div className="aiaudio-step-icon"><Icon size={14} /></div>
                <p className="aiaudio-step-text"><Check size={11} className="aiaudio-check" />{text}</p>
              </div>
            ))}
          </div>

          <div className="aiaudio-section-label">{isEn ? 'Pricing' : 'Стоимость'}</div>
          <div className="aiaudio-price-block">
            <div className="aiaudio-price-main">
              <div className="aiaudio-price-num">
                <strong>75</strong>
                <span>AED</span>
              </div>
              <div className="aiaudio-price-unit">{isEn ? '/ 1 minute of audio' : '/ 1 минута аудио'}</div>
            </div>
            <div className="aiaudio-min-order">
              {isEn ? 'Minimum order — 2 minutes' : 'Минимальный заказ — 2 минуты'}
            </div>
          </div>

          <a
            href={WA_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="aiaudio-wa-btn"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink: 0 }}>
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/>
            </svg>
            {isEn ? 'Fix my audio on WhatsApp' : 'Исправить мой звук в WhatsApp'}
          </a>

        </div>
      </div>
    </div>
  );
}
