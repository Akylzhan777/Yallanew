import { useState } from 'react';
import { X, Send, Bot, Palette, BarChart2, Navigation, CheckCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { openWhatsApp, WA_MESSAGES } from '../lib/whatsapp';

interface Props {
  onClose: () => void;
}

const SERVICES_RU = [
  {
    icon: Bot,
    color: '#38bdf8',
    colorRgb: '56,189,248',
    title: 'Создание с нуля',
    desc: 'Регистрация, настройка ботов и безопасности.',
  },
  {
    icon: Palette,
    color: '#a78bfa',
    colorRgb: '167,139,250',
    title: 'Брендинг и Оформление',
    desc: 'Уникальный стиль, аватар и описание канала.',
  },
  {
    icon: BarChart2,
    color: '#34d399',
    colorRgb: '52,211,153',
    title: 'Контент-стратегия',
    desc: 'План публикаций, который вовлекает подписчиков.',
  },
  {
    icon: Navigation,
    color: '#fb923c',
    colorRgb: '251,146,60',
    title: 'Настройка навигации',
    desc: 'Удобное меню и закрепленные сообщения для новых клиентов.',
  },
];

const SERVICES_EN = [
  {
    icon: Bot,
    color: '#38bdf8',
    colorRgb: '56,189,248',
    title: 'Creation from Scratch',
    desc: 'Registration, bots, and security setup.',
  },
  {
    icon: Palette,
    color: '#a78bfa',
    colorRgb: '167,139,250',
    title: 'Branding & Design',
    desc: 'Unique style, avatar, and channel description.',
  },
  {
    icon: BarChart2,
    color: '#34d399',
    colorRgb: '52,211,153',
    title: 'Content Strategy',
    desc: 'Publication plan that engages subscribers.',
  },
  {
    icon: Navigation,
    color: '#fb923c',
    colorRgb: '251,146,60',
    title: 'Navigation Setup',
    desc: 'User-friendly menu and pinned messages for new clients.',
  },
];

export default function TelegramServiceModal({ onClose }: Props) {
  const { profile } = useAuth();
  const { i18n } = useTranslation();
  const lang = i18n.language || localStorage.getItem('yalla_lang') || 'en';
  const isEn = lang.startsWith('en');
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState(false);

  async function handleRequest() {
    if (sending) return;
    setSending(true);
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
            event_type: 'tg_channel_request',
            details: '🎬 Заявка на создание Telegram канала',
            client_name: clientName,
          }),
        }
      );
    } catch (_) {
    } finally {
      setSending(false);
      setToast(true);
      setTimeout(() => setToast(false), 4000);
    }
  }

  const SERVICES = isEn ? SERVICES_EN : SERVICES_RU;

  return (
    <div className="ai-modal-overlay" onClick={onClose}>
      <div className="ai-modal-sheet tg-modal-sheet" onClick={e => e.stopPropagation()}>
        <div className="ai-modal-drag-handle tg-drag-handle" />

        <div className="tg-modal-hero">
          <div className="tg-modal-hero-icon">
            <Send size={22} />
          </div>
          <div className="tg-modal-hero-text">
            <h2 className="tg-modal-hero-title">{isEn ? 'Turnkey Telegram' : 'Telegram под ключ'}</h2>
            <p className="tg-modal-hero-sub">{isEn ? 'A channel that sells and retains' : 'Канал, который продаёт и удерживает'}</p>
          </div>
          <button className="tg-modal-close" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="ai-modal-body">
          <div className="tg-modal-intro">
            <p>
              {isEn
                ? 'We will create and package your channel for sales and audience loyalty. Turnkey — from registration to the first posts.'
                : 'Создадим и упакуем ваш канал для продаж и лояльности аудитории. Под ключ — от регистрации до первых публикаций.'}
            </p>
          </div>

          <div className="tg-section-label">{isEn ? "WHAT'S INCLUDED" : 'Что входит'}</div>
          <div className="tg-services-list">
            {SERVICES.map((s, i) => {
              const Icon = s.icon;
              return (
                <div key={i} className="tg-service-row">
                  <div
                    className="tg-service-dot"
                    style={{
                      background: `rgba(${s.colorRgb}, 0.15)`,
                      border: `1px solid rgba(${s.colorRgb}, 0.25)`,
                      color: s.color,
                    }}
                  >
                    <Icon size={16} />
                  </div>
                  <div className="tg-service-content">
                    <span className="tg-service-title">{s.title}</span>
                    <p className="tg-service-desc">{s.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="tg-pricing-block">
            <div className="tg-pricing-label">{isEn ? 'PRICE' : 'Стоимость'}</div>
            <div className="tg-pricing-value">
              {isEn ? (
                <>
                  <span className="tg-pricing-from">from</span>
                  <span className="tg-pricing-amount">3,500</span>
                  <span className="tg-pricing-currency">AED</span>
                </>
              ) : (
                <>
                  <span className="tg-pricing-from">от</span>
                  <span className="tg-pricing-amount">3 500</span>
                  <span className="tg-pricing-currency">AED</span>
                </>
              )}
            </div>
            <p className="tg-pricing-note">{isEn ? 'Final price depends on the scope of work and niche' : 'Финальная цена зависит от объёма работ и ниши'}</p>
          </div>

          <button
            className="tg-cta-btn wa-cta-btn"
            onClick={() => { handleRequest(); openWhatsApp(WA_MESSAGES.telegram); }}
            disabled={sending}
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink: 0 }}>
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/>
            </svg>
            {sending ? (isEn ? 'Sending...' : 'Отправка...') : (isEn ? 'Message on WhatsApp' : 'Написать в WhatsApp')}
          </button>
        </div>
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
