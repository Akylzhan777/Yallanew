import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Instagram, Youtube, Music2, Ghost, Send, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { WA_MESSAGES } from '../lib/whatsapp';

interface Props {
  platform: SocialPlatform;
  onClose: () => void;
}

export type SocialPlatform = 'instagram' | 'youtube' | 'tiktok' | 'snapchat' | 'telegram';

export default function SocialNetworksModal({ platform, onClose }: Props) {
  const { profile } = useAuth();
  const { i18n } = useTranslation();
  const [sent, setSent] = useState(false);

  const isEn =
    i18n.language?.startsWith('en') ||
    localStorage.getItem('yalla_lang') === 'en' ||
    window.location.search.includes('lang=en');

  const PLATFORM_CONFIG: Record<SocialPlatform, {
    icon: React.ElementType;
    label: string;
    gradient: string;
    glowRgb: string;
    color: string;
    badge: string | null;
    desc: string;
    features: string[];
    waMessage: string;
  }> = {
    instagram: {
      icon: Instagram,
      label: 'Instagram',
      gradient: 'linear-gradient(135deg, #833ab4, #fd1d1d, #fcb045)',
      glowRgb: '253,29,29',
      color: '#fd1d1d',
      badge: isEn ? 'POPULAR' : 'ПОПУЛЯРНО',
      desc: isEn ? 'Profile packaging, Reels strategy and visual concept.' : 'Упаковка профиля, Reels-стратегия и визуальный концепт.',
      features: isEn ? [
        'Profile audit and packaging',
        'Reels strategy development',
        'Visual concept and brand identity',
        'Monthly content plan',
        'Analytics and follower growth',
      ] : [
        'Аудит и упаковка профиля',
        'Разработка Reels-стратегии',
        'Визуальный концепт и фирменный стиль',
        'Контент-план на месяц',
        'Аналитика и рост подписчиков',
      ],
      waMessage: WA_MESSAGES.instagram,
    },
    youtube: {
      icon: Youtube,
      label: 'YouTube',
      gradient: 'linear-gradient(135deg, #b91c1c, #ef4444)',
      glowRgb: '239,68,68',
      color: '#ef4444',
      badge: null,
      desc: isEn ? 'Creating Shorts and long-form videos, channel optimization and SEO.' : 'Создание Shorts и длинных видео, оптимизация каналов и SEO.',
      features: isEn ? [
        'Channel design and SEO optimization',
        'YouTube Shorts production',
        'Scripts and long-form video editing',
        'Algorithm and tag optimization',
        'Monetization and growth strategy',
      ] : [
        'Оформление канала и SEO-оптимизация',
        'Производство YouTube Shorts',
        'Сценарии и монтаж длинных видео',
        'Работа с алгоритмами и тегами',
        'Монетизация и стратегия роста',
      ],
      waMessage: WA_MESSAGES.youtube,
    },
    tiktok: {
      icon: Music2,
      label: 'TikTok',
      gradient: 'linear-gradient(135deg, #000000, #010101)',
      glowRgb: '105,201,208',
      color: '#69c9d0',
      badge: isEn ? 'VIRAL' : 'ВИРАЛ',
      desc: isEn ? 'Viral content, trend surfing and rapid adaptation.' : 'Виральный контент, работа с трендами и быстрая адаптация.',
      features: isEn ? [
        'Trend research and adaptation',
        'Viral video production',
        'TikTok-format editing',
        'Reach and engagement analytics',
        'Rapid growth strategy',
      ] : [
        'Поиск и адаптация трендов',
        'Производство виральных видео',
        'Монтаж под TikTok-формат',
        'Аналитика охватов и реакций',
        'Стратегия быстрого роста',
      ],
      waMessage: WA_MESSAGES.tiktok,
    },
    snapchat: {
      icon: Ghost,
      label: 'Snapchat',
      gradient: 'linear-gradient(135deg, #b45309, #fbbf24)',
      glowRgb: '251,191,36',
      color: '#fbbf24',
      badge: 'UAE #1',
      desc: isEn ? 'Spotlight promotion and ad targeting for UAE audiences.' : 'Продвижение в Spotlight и настройка рекламы на аудиторию ОАЭ.',
      features: isEn ? [
        'Snapchat Ads setup for UAE',
        'Spotlight content creation',
        'Arabic audience targeting',
        'Campaign analytics and optimization',
        'AR filters and Lenses',
      ] : [
        'Настройка Snapchat Ads для ОАЭ',
        'Создание контента для Spotlight',
        'Таргетинг на арабскую аудиторию',
        'Аналитика и оптимизация кампаний',
        'AR-фильтры и Lenses',
      ],
      waMessage: WA_MESSAGES.snapchat,
    },
    telegram: {
      icon: Send,
      label: 'Telegram',
      gradient: 'linear-gradient(135deg, #0369a1, #0ea5e9)',
      glowRgb: '14,165,233',
      color: '#0ea5e9',
      badge: null,
      desc: isEn ? 'Channel creation, sales funnels and bot automation.' : 'Создание каналов, воронки продаж и автоматизация через ботов.',
      features: isEn ? [
        'Channel creation and design',
        'Sales funnel development',
        'Chatbot and automation setup',
        'Content plan and regular posts',
        'Paid subscription and monetization',
      ] : [
        'Создание и оформление канала',
        'Разработка воронки продаж',
        'Настройка чат-ботов и автоматизации',
        'Контент-план и регулярные посты',
        'Платная подписка и монетизация',
      ],
      waMessage: WA_MESSAGES.telegramSocial,
    },
  };

  const cfg = PLATFORM_CONFIG[platform];
  const Icon = cfg.icon;

  async function handleRequest() {
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
            event_type: 'social_request',
            details: `Social promotion request: ${cfg.label}`,
            client_name: profile?.name || 'Guest',
          }),
        }
      );
    } catch (_) {}
    setSent(true);
    setTimeout(() => setSent(false), 4000);
  }

  const waUrl = `https://wa.me/971585973177?text=${encodeURIComponent(cfg.waMessage)}`;

  return (
    <div className="ai-modal-overlay" onClick={onClose}>
      <div className="ai-modal-sheet" onClick={e => e.stopPropagation()}>
        <div className="ai-modal-drag-handle" />

        <div className="ai-modal-header">
          <div
            className="ai-modal-header-icon"
            style={{ background: cfg.gradient, boxShadow: `0 4px 16px rgba(${cfg.glowRgb},0.45)` }}
          >
            <Icon size={20} />
          </div>
          <div>
            <h2 className="ai-modal-title">{cfg.label}</h2>
            <p className="ai-modal-subtitle">{cfg.desc}</p>
          </div>
          <button className="ai-modal-close" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="ai-modal-body">
          {cfg.badge && (
            <div className="social-modal-badge" style={{ background: cfg.gradient, boxShadow: `0 2px 12px rgba(${cfg.glowRgb},0.35)` }}>
              {cfg.badge}
            </div>
          )}

          <div className="social-modal-features">
            {cfg.features.map((f, i) => (
              <div key={i} className="social-modal-feature">
                <div className="social-modal-feature-dot" style={{ background: cfg.color, boxShadow: `0 0 6px rgba(${cfg.glowRgb},0.6)` }} />
                <span>{f}</span>
              </div>
            ))}
          </div>

          <a
            className="web-service-btn wa-cta-btn"
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleRequest}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, textDecoration: 'none' }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink: 0 }}>
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/>
            </svg>
            {isEn ? 'Message on WhatsApp' : 'Написать в WhatsApp'}
          </a>
        </div>
      </div>

      {sent && (
        <div className="hub-audio-toast">
          <CheckCircle size={16} />
          <span>{isEn ? 'Request sent! A manager will contact you shortly.' : 'Заявка отправлена! Менеджер свяжется с вами в ближайшее время.'}</span>
        </div>
      )}
    </div>
  );
}
