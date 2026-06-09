import { useState } from 'react';
import { Sparkles, X, Globe, CheckCircle, Loader, ChevronLeft, Mic, Smile, Star } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { safeGetItem } from '../utils/safeStorage';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

interface Props {
  onClose: () => void;
  onBack?: () => void;
}

const WA_NUMBER = '971585973177';

export default function AiTranslationModal({ onClose, onBack }: Props) {
  const { user, profile } = useAuth();
  const { i18n } = useTranslation();
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const isEn =
    i18n.language?.startsWith('en') ||
    safeGetItem('yalla_lang') === 'en' ||
    window.location.search.includes('lang=en');

  const displayName = profile?.name
    ? `${profile.name}${profile.surname ? ' ' + profile.surname : ''}`
    : user?.email?.split('@')[0] ?? 'Client';

  const WA_TEXT = encodeURIComponent(
    isEn ? 'Hello! I want to order AI video translation.' : 'Здравствуйте! Хочу заказать AI-перевод видео.'
  );

  const BENEFITS = [
    {
      icon: Mic,
      label: isEn ? 'Voice Clone' : 'Голосовой клон',
      sub: isEn ? 'Your timbre and intonations are preserved' : 'Ваш тембр и интонации сохраняются',
    },
    {
      icon: Smile,
      label: isEn ? 'Lip Sync' : 'Синхронизация губ',
      sub: isEn ? 'Perfect lip-sync in any language' : 'Идеальный lip-sync на любом языке',
    },
    {
      icon: Star,
      label: isEn ? 'Manual Correction' : 'Ручная коррекция',
      sub: isEn ? 'Editor checks every translation' : 'Монтажер проверяет каждый перевод',
    },
  ];

  const handleWhatsApp = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      await supabase.functions.invoke('telegram-notify', {
        body: {
          event_type: 'AI_Request',
          client_name: displayName,
          amount: null,
          details: 'AI Перевод видео — переход в WhatsApp',
        },
      });
    } catch {
      // silent
    }
    setSubmitting(false);
    setSubmitted(true);
    window.open(`https://wa.me/${WA_NUMBER}?text=${WA_TEXT}`, '_blank');
  };

  return (
    <div className="ai-modal-overlay" onClick={onClose}>
      <div className="ai-modal-sheet" onClick={e => e.stopPropagation()}>
        <div className="ai-modal-drag-handle" />

        <div className="ai-modal-header">
          {onBack && (
            <button className="ai-modal-back" onClick={onBack}><ChevronLeft size={18} /></button>
          )}
          <div className="ai-modal-header-icon">
            <Globe size={20} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h2 className="ai-modal-title">{isEn ? 'AI Video Translation' : 'AI Перевод видео'}</h2>
              <span className="aitrans-popular-badge">POPULAR</span>
            </div>
            <p className="ai-modal-subtitle">{isEn ? 'Voice cloning & lip-sync' : 'Клонирование голоса и lip-sync'}</p>
          </div>
          <button className="ai-modal-close" onClick={onClose}><X size={18} /></button>
        </div>

        {submitted ? (
          <div className="ai-modal-success">
            <div className="ai-modal-success-icon"><CheckCircle size={48} /></div>
            <h3 className="ai-modal-success-title">{isEn ? 'Great!' : 'Отлично!'}</h3>
            <p className="ai-modal-success-desc">
              {isEn
                ? 'WhatsApp is open. A manager will respond shortly.'
                : 'WhatsApp открыт. Менеджер ответит вам в ближайшее время.'}
            </p>
            <button className="ai-modal-done-btn" onClick={onClose}>{isEn ? 'Close' : 'Закрыть'}</button>
          </div>
        ) : (
          <div className="ai-modal-body">

            <div className="aitrans-desc-block">
              <p className="aitrans-desc">
                {isEn ? (
                  <>
                    We will translate your content into <strong>30+ languages</strong> (including Arabic) while fully preserving your{' '}
                    <strong>voice timbre</strong>, <strong>intonations</strong> and perfect{' '}
                    <strong>lip-sync</strong>.
                  </>
                ) : (
                  <>
                    Переведем ваш контент на <strong>30+ языков</strong> (включая Английский и Арабский) с полным сохранением вашего
                    {' '}<strong>тембра голоса</strong>, <strong>интонаций</strong> и идеальным{' '}
                    <strong>липсинком</strong> (движением губ).
                  </>
                )}
              </p>
            </div>

            <div className="aitrans-benefits">
              {BENEFITS.map(({ icon: Icon, label, sub }) => (
                <div key={label} className="aitrans-benefit-row">
                  <div className="aitrans-benefit-icon"><Icon size={15} /></div>
                  <div>
                    <div className="aitrans-benefit-label">{label}</div>
                    <div className="aitrans-benefit-sub">{sub}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="aitrans-langs-row">
              {['🇬🇧 EN', '🇦🇪 AR', '🇪🇸 ES', '🇫🇷 FR', '🇩🇪 DE', '🇨🇳 ZH', '+24'].map(l => (
                <span key={l} className="aitrans-lang-chip">{l}</span>
              ))}
            </div>

            <div className="aitrans-pricing-block">
              <div className="aitrans-price-row">
                <span className="aitrans-price-main"><strong>150 AED</strong></span>
                <span className="aitrans-price-per">{isEn ? '/ 1 video' : '/ 1 ролик'}</span>
              </div>
              <div className="aitrans-promo-row">
                <Sparkles size={12} />
                <span>
                  {isEn
                    ? <>Pack of 10 videos — <strong>1,200 AED</strong></>
                    : <>Пакет из 10 роликов — <strong>1 200 AED</strong></>
                  }
                </span>
                <span className="aitrans-economy-badge">{isEn ? 'Save 300 AED' : 'Экономия 300 AED'}</span>
              </div>
            </div>

            <button
              className="aitrans-wa-btn"
              onClick={handleWhatsApp}
              disabled={submitting}
            >
              {submitting ? (
                <><Loader size={16} className="ai-spin" /> {isEn ? 'Opening WhatsApp...' : 'Открываем WhatsApp...'}</>
              ) : (
                <>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink: 0 }}>
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/>
                  </svg>
                  {isEn ? 'Order translation via WhatsApp' : 'Заказать перевод в WhatsApp'}
                </>
              )}
            </button>

          </div>
        )}
      </div>
    </div>
  );
}
