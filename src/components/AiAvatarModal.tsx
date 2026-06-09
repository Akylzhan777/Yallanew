import { X, CheckCircle, Loader, ChevronLeft, Sparkles, Video, Brain, FileText, Check } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { safeGetItem } from '../utils/safeStorage';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

interface Props {
  onClose: () => void;
  onBack: () => void;
}

const WA_NUMBER = '971585973177';

export default function AiAvatarModal({ onClose, onBack }: Props) {
  const { user, profile } = useAuth();
  const { i18n } = useTranslation();
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const isEn =
    i18n.language?.startsWith('en') ||
    safeGetItem('yalla_lang') === 'en' ||
    window.location.search.includes('lang=en');

  const WA_TEXT = encodeURIComponent(
    isEn ? 'Hello! I want to create my digital avatar.' : 'Здравствуйте! Хочу создать свой цифровой аватар.'
  );

  const displayName = profile?.name
    ? `${profile.name}${profile.surname ? ' ' + profile.surname : ''}`
    : user?.email?.split('@')[0] ?? 'Client';

  const HOW_IT_WORKS = [
    {
      icon: Video,
      step: '01',
      text: isEn
        ? 'We come to you anywhere in Dubai to record a 2-minute source clip.'
        : 'Мы приезжаем к вам в любую точку Дубая для записи 2-минутного исходника.',
    },
    {
      icon: Brain,
      step: '02',
      text: isEn
        ? 'We train your personal neural network.'
        : 'Обучаем вашу персональную нейросеть.',
    },
    {
      icon: FileText,
      step: '03',
      text: isEn
        ? 'You send text — we send the finished video.'
        : 'Вы присылаете текст — мы присылаем готовое видео.',
    },
  ];

  const CLONE_INCLUDES = isEn
    ? ['Dubai shoot on location', 'AI model training on your likeness', '3 ready videos as a gift']
    : ['Выезд на съёмку по Дубаю', 'Обучение AI-модели на вашем образе', '3 готовых видео в подарок'];

  const VIDEO_INCLUDES = isEn
    ? ['Script generation', 'AI rendering of your avatar', 'Professional editing']
    : ['Генерация сценария', 'AI-рендеринг вашего аватара', 'Профессиональный монтаж'];

  const handleWhatsApp = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      await supabase.functions.invoke('telegram-notify', {
        body: {
          event_type: 'AI_Request',
          client_name: displayName,
          amount: null,
          details: 'Цифровой Аватар — переход в WhatsApp',
          ai_avatar_package: 'Clone Setup',
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
          <button className="ai-modal-back" onClick={onBack}><ChevronLeft size={18} /></button>
          <div className="ai-modal-header-icon ai-modal-header-icon--avatar">
            <Sparkles size={20} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h2 className="ai-modal-title">{isEn ? 'Your Digital Clone' : 'Ваш Цифровой Клон'}</h2>
              <span className="aiavatar-vip-badge">VIP</span>
            </div>
            <p className="ai-modal-subtitle">{isEn ? 'AI Avatar — your exact AI copy' : 'AI Avatar — ваша точная ИИ-копия'}</p>
          </div>
          <button className="ai-modal-close" onClick={onClose}><X size={18} /></button>
        </div>

        {submitted ? (
          <div className="ai-modal-success">
            <div className="ai-modal-success-icon"><CheckCircle size={48} /></div>
            <h3 className="ai-modal-success-title">{isEn ? 'Great!' : 'Отлично!'}</h3>
            <p className="ai-modal-success-desc">
              {isEn
                ? 'WhatsApp is open. A manager will contact you to schedule the shoot.'
                : 'WhatsApp открыт. Менеджер свяжется с вами для организации съёмки.'}
            </p>
            <button className="ai-modal-done-btn" onClick={onClose}>{isEn ? 'Close' : 'Закрыть'}</button>
          </div>
        ) : (
          <div className="ai-modal-body">

            <div className="aiavatar-hero-block">
              <div className="aiavatar-rings-wrap">
                <div className="aiavatar-ring aiavatar-ring--1" />
                <div className="aiavatar-ring aiavatar-ring--2" />
                <div className="aiavatar-ring aiavatar-ring--3" />
                <div className="aiavatar-hero-icon"><Sparkles size={28} /></div>
              </div>
              <div className="aiavatar-hero-copy">
                <p className="aiavatar-lead">
                  {isEn ? (
                    <>
                      We film you just <strong>once</strong> — and you can generate{' '}
                      <strong>unlimited content</strong> simply by entering text.{' '}
                      Your voice, facial expressions, and gestures are preserved <strong>100%</strong>.
                    </>
                  ) : (
                    <>
                      Снимем вас всего <strong>один раз</strong> — и вы сможете генерировать{' '}
                      <strong>бесконечное количество контента</strong>, просто введя текст.{' '}
                      Ваш голос, ваша мимика и жесты сохраняются на <strong>100%</strong>.
                    </>
                  )}
                </p>
              </div>
            </div>

            <div className="aiavatar-steps-wrap">
              <div className="aiavatar-section-label">{isEn ? 'How it works' : 'Как это работает'}</div>
              {HOW_IT_WORKS.map(({ icon: Icon, step, text }) => (
                <div key={step} className="aiavatar-step-row">
                  <div className="aiavatar-step-num">{step}</div>
                  <div className="aiavatar-step-icon"><Icon size={14} /></div>
                  <p className="aiavatar-step-text">{text}</p>
                </div>
              ))}
            </div>

            <div className="aiavatar-section-label">{isEn ? 'Pricing' : 'Тарифы'}</div>
            <div className="aiavatar-cards-grid">

              <div className="aiavatar-price-card aiavatar-price-card--setup">
                <div className="aiavatar-card-badge">{isEn ? 'Clone Setup' : 'Запуск клона'}</div>
                <div className="aiavatar-card-price">
                  <strong>1 490</strong>
                  <span>AED</span>
                </div>
                <div className="aiavatar-card-desc">{isEn ? 'One-time setup' : 'Единоразовая настройка'}</div>
                <ul className="aiavatar-card-includes">
                  {CLONE_INCLUDES.map(item => (
                    <li key={item}><Check size={11} /><span>{item}</span></li>
                  ))}
                </ul>
              </div>

              <div className="aiavatar-price-card aiavatar-price-card--video">
                <div className="aiavatar-card-badge">{isEn ? 'Per video' : 'За ролик'}</div>
                <div className="aiavatar-card-price">
                  <strong>250</strong>
                  <span>AED</span>
                </div>
                <div className="aiavatar-card-desc">{isEn ? 'Each video' : 'Каждое видео'}</div>
                <ul className="aiavatar-card-includes">
                  {VIDEO_INCLUDES.map(item => (
                    <li key={item}><Check size={11} /><span>{item}</span></li>
                  ))}
                </ul>
              </div>

            </div>

            <button
              className="aiavatar-wa-btn"
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
                  {isEn ? 'Create my clone' : 'Создать своего клона'}
                </>
              )}
            </button>

          </div>
        )}
      </div>
    </div>
  );
}
