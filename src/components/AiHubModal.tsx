import { useState, useEffect } from 'react';
import { X, Sparkles, Languages, User, Scissors, Mic, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import AiTranslationModal from './AiTranslationModal';
import AiAvatarModal from './AiAvatarModal';
import AiAudioModal from './AiAudioModal';

interface Props {
  onClose: () => void;
}

type SubModal = 'translation' | 'avatar' | 'audio' | null;

export default function AiHubModal({ onClose }: Props) {
  const { i18n } = useTranslation();
  const [currentLang, setCurrentLang] = useState<string>(
    i18n.language || localStorage.getItem('yalla_lang') || 'en'
  );

  useEffect(() => {
    setCurrentLang(i18n.language || localStorage.getItem('yalla_lang') || 'en');
    const handler = (lng: string) => setCurrentLang(lng);
    i18n.on('languageChanged', handler);
    return () => { i18n.off('languageChanged', handler); };
  }, [i18n]);

  const isEn =
    currentLang?.startsWith('en') ||
    localStorage.getItem('yalla_lang') === 'en' ||
    window.location.search.includes('lang=en');

  const [subModal, setSubModal] = useState<SubModal>(null);

  const AI_PRODUCTS = [
    {
      id: 'translation' as SubModal,
      icon: Languages,
      gradient: 'linear-gradient(135deg, #be185d, #e11d48)',
      glow: '#e11d4840',
      title: isEn ? 'Video Translation' : 'Перевод видео',
      desc: isEn
        ? 'Translation into any language while preserving voice and lip sync.'
        : 'Перевод на любой язык с сохранением голоса и артикуляции.',
      tag: null,
      tagStyle: '',
      enabled: true,
    },
    {
      id: 'avatar' as SubModal,
      icon: User,
      gradient: 'linear-gradient(135deg, #0369a1, #0ea5e9)',
      glow: '#0ea5e940',
      title: isEn ? 'Digital Avatar' : 'Цифровой Аватар',
      desc: isEn
        ? 'Shoot once, generate text-to-video endlessly.'
        : 'Снимитесь 1 раз, генерируйте видео из текста бесконечно.',
      tag: 'VIP',
      tagStyle: 'hub-tag-vip',
      enabled: true,
    },
    {
      id: 'audio' as SubModal,
      icon: Mic,
      gradient: 'linear-gradient(135deg, #047857, #10b981)',
      glow: '#10b98140',
      title: isEn ? 'AI Audio Enhancement' : 'ИИ-Улучшение звука',
      desc: isEn
        ? 'Wind noise, echo, or background sounds? Your voice will sound velvety, like from a pro studio. 75 AED / min.'
        : 'Шум ветра, эхо или посторонние звуки? Голос станет бархатным, как из профессиональной студии. 75 AED / мин.',
      tag: isEn ? 'FAST RESULT' : 'БЫСТРЫЙ РЕЗУЛЬТАТ',
      tagStyle: 'hub-tag-fast',
      enabled: true,
    },
    {
      id: null,
      icon: Scissors,
      gradient: 'linear-gradient(135deg, #374151, #6b7280)',
      glow: '#6b728020',
      title: isEn ? 'AI Podcast Clipping' : 'ИИ-Нарезка Подкастов',
      desc: isEn
        ? 'Automated clipping of long videos into viral Shorts and Reels.'
        : 'Автоматическая нарезка длинных видео на вирусные Shorts и Reels.',
      tag: isEn ? 'SOON' : 'СКОРО',
      tagStyle: 'hub-tag-soon',
      enabled: false,
    },
  ];

  if (subModal === 'translation') {
    return <AiTranslationModal onClose={onClose} onBack={() => setSubModal(null)} />;
  }
  if (subModal === 'avatar') {
    return <AiAvatarModal onClose={onClose} onBack={() => setSubModal(null)} />;
  }
  if (subModal === 'audio') {
    return <AiAudioModal onClose={onClose} onBack={() => setSubModal(null)} />;
  }

  return (
    <div className="ai-modal-overlay" onClick={onClose}>
      <div className="ai-modal-sheet" onClick={e => e.stopPropagation()}>
        <div className="ai-modal-drag-handle" />

        <div className="ai-modal-header">
          <div className="ai-modal-header-icon">
            <Sparkles size={20} />
          </div>
          <div>
            <h2 className="ai-modal-title">
              {isEn ? 'Neural Networks & AI' : 'Нейросети и ИИ'}
            </h2>
            <p className="ai-modal-subtitle">
              {isEn ? 'All AI tools in one place' : 'Все AI-инструменты в одном месте'}
            </p>
          </div>
          <button className="ai-modal-close" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="ai-modal-body">
          <div className="hub-intro">
            <p className="hub-intro-text">
              {isEn
                ? 'Use the power of neural networks to accelerate your content growth. Choose a tool:'
                : 'Используйте силу нейросетей для ускоренного роста вашего контента. Выберите инструмент:'}
            </p>
          </div>

          <div className="hub-products-list">
            {AI_PRODUCTS.map((product, i) => {
              const Icon = product.icon;
              return (
                <button
                  key={i}
                  type="button"
                  className={`hub-product-card${!product.enabled ? ' hub-product-card--disabled' : ''}`}
                  onClick={() => {
                    if (!product.enabled) return;
                    if (product.id) setSubModal(product.id);
                  }}
                  disabled={!product.enabled}
                >
                  <div
                    className="hub-product-icon"
                    style={{ background: product.gradient, boxShadow: `0 4px 14px ${product.glow}` }}
                  >
                    <Icon size={22} color="#fff" />
                  </div>

                  <div className="hub-product-info">
                    <div className="hub-product-header">
                      <span className="hub-product-title">{product.title}</span>
                      {product.tag && (
                        <span className={`hub-tag ${product.tagStyle}`}>{product.tag}</span>
                      )}
                    </div>
                    <p className="hub-product-desc">{product.desc}</p>
                  </div>

                  <div className="hub-product-arrow">
                    {product.enabled ? (
                      <ChevronRight size={18} />
                    ) : (
                      <span className="hub-lock">🔒</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

    </div>
  );
}
