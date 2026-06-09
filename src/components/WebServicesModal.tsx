import { useState } from 'react';
import { X, LayoutTemplate, ShoppingCart, Link, CheckCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { safeGetItem } from '../utils/safeStorage';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { openWhatsApp, WA_MESSAGES } from '../lib/whatsapp';

interface Props {
  onClose: () => void;
}

export default function WebServicesModal({ onClose }: Props) {
  const { profile } = useAuth();
  const { i18n } = useTranslation();
  const [sending, setSending] = useState<number | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const isEn =
    i18n.language?.startsWith('en') ||
    safeGetItem('yalla_lang') === 'en' ||
    window.location.search.includes('lang=en');

  const WEB_SERVICES = [
    {
      icon: LayoutTemplate,
      gradient: 'linear-gradient(135deg, #1e3a8a, #2563eb)',
      glowRgb: '37,99,235',
      title: isEn ? 'Sales Website (Landing Page)' : 'Сайт для продаж (Landing Page)',
      desc: isEn
        ? 'High-conversion one-page website. Perfect for experts, coaches, and realtors. We handle design, copywriting, and technical setup.'
        : 'Одностраничный сайт с высокой конверсией. Идеально для экспертов, коучей и риелторов. Мы берём на себя дизайн, копирайтинг и техническую настройку.',
      price: '2 500 AED',
      tag: isEn ? 'POPULAR' : 'ПОПУЛЯРНО',
      tagStyle: 'hub-tag-fast',
      bestBadge: null,
    },
    {
      icon: ShoppingCart,
      gradient: 'linear-gradient(135deg, #065f46, #10b981)',
      glowRgb: '16,185,129',
      title: isEn ? 'Online Store' : 'Онлайн-Магазин',
      desc: isEn
        ? 'Full storefront with product catalog, cart, and online payment integration. Ready to sell from day one.'
        : 'Полноценная витрина с каталогом товаров, корзиной и интеграцией онлайн-оплаты. Готово к продажам с первого дня.',
      price: '4 900 AED',
      tag: null,
      tagStyle: '',
      bestBadge: isEn ? 'BEST CHOICE FOR BUSINESS' : 'ЛУЧШИЙ ВЫБОР ДЛЯ БИЗНЕСА',
    },
    {
      icon: Link,
      gradient: 'linear-gradient(135deg, #7c2d12, #ea580c)',
      glowRgb: '234,88,12',
      title: isEn ? 'Link-in-Bio Page (Taplink)' : 'Сайт-визитка (Taplink)',
      desc: isEn
        ? 'Stylish mini-page for Instagram with all your links, contacts, and a lead form.'
        : 'Стильная мини-страница для Instagram со всеми вашими ссылками, контактами и формой заявки.',
      price: '1 500 AED',
      tag: isEn ? 'FAST LAUNCH' : 'БЫСТРЫЙ ЗАПУСК',
      tagStyle: 'hub-tag-vip',
      bestBadge: null,
    },
  ];

  async function handleRequest(title: string, idx: number) {
    if (sending !== null) return;
    setSending(idx);
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
            event_type: 'web_request',
            details: `🌐 Заявка на сайт: ${title}`,
            client_name: clientName,
          }),
        }
      );
    } catch (_) {
    } finally {
      setSending(null);
      setToast(title);
      setTimeout(() => setToast(null), 4000);
    }
  }

  return (
    <div className="ai-modal-overlay" onClick={onClose}>
      <div className="ai-modal-sheet" onClick={e => e.stopPropagation()}>
        <div className="ai-modal-drag-handle" />

        <div className="ai-modal-header">
          <div className="ai-modal-header-icon" style={{
            background: 'linear-gradient(135deg, #1e3a8a, #2563eb)',
            boxShadow: '0 4px 16px rgba(37,99,235,0.4)',
          }}>
            <LayoutTemplate size={20} />
          </div>
          <div>
            <h2 className="ai-modal-title">{isEn ? 'Website Development' : 'Создание сайтов'}</h2>
            <p className="ai-modal-subtitle">{isEn ? 'Turnkey: design, development, launch' : 'Под ключ: дизайн, разработка, запуск'}</p>
          </div>
          <button className="ai-modal-close" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="ai-modal-body">
          <div className="hub-intro">
            <p className="hub-intro-text">
              {isEn ? 'We do everything for you: from design to launch. Choose the type of website:' : 'Делаем всё за вас: от дизайна до запуска. Выберите нужный тип сайта:'}
            </p>
          </div>

          <div className="web-services-list">
            {WEB_SERVICES.map((service, i) => {
              const Icon = service.icon;
              const isLoading = sending === i;
              return (
                <div
                  key={i}
                  className={`web-service-card${service.bestBadge ? ' web-service-card--best' : ''}`}
                  style={service.bestBadge ? { borderColor: 'rgba(16,185,129,0.35)', background: 'rgba(6,78,59,0.12)' } : undefined}
                >
                  {service.bestBadge && (
                    <div className="web-service-best-badge">{service.bestBadge}</div>
                  )}
                  <div className="web-service-top">
                    <div
                      className="web-service-icon"
                      style={{
                        background: service.gradient,
                        boxShadow: `0 4px 16px rgba(${service.glowRgb}, 0.35)`,
                      }}
                    >
                      <Icon size={22} color="#fff" />
                    </div>
                    <div className="web-service-info">
                      <div className="web-service-header">
                        <span className="web-service-title">{service.title}</span>
                        {service.tag && (
                          <span className={`hub-tag ${service.tagStyle}`}>{service.tag}</span>
                        )}
                      </div>
                      <p className="web-service-desc">{service.desc}</p>
                    </div>
                  </div>
                  <div className="web-service-price">{service.price}</div>
                  <a
                    className="web-service-btn wa-cta-btn"
                    href="https://wa.me/971585973177"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => handleRequest(service.title, i)}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                      textDecoration: 'none',
                      opacity: sending !== null && !isLoading ? 0.45 : 1,
                      pointerEvents: isLoading ? 'none' : 'auto',
                    }}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink: 0 }}>
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/>
                    </svg>
                    {isLoading ? (isEn ? 'Sending...' : 'Отправка...') : (isEn ? 'Message on WhatsApp' : 'Написать в WhatsApp')}
                  </a>
                </div>
              );
            })}
          </div>

          <div className="web-services-gift">
            {isEn
              ? '🎁 With any website order — basic SEO optimization and Google Analytics setup as a GIFT!'
              : '🎁 При заказе любого сайта — базовая SEO-оптимизация и настройка Google Analytics в ПОДАРОК!'}
          </div>
        </div>
      </div>

      {toast && (
        <div className="hub-audio-toast">
          <CheckCircle size={16} />
          <span>{isEn ? 'Request sent! A manager will contact you shortly.' : 'Заявка отправлена! Менеджер свяжется с вами в ближайшее время.'}</span>
        </div>
      )}
    </div>
  );
}
