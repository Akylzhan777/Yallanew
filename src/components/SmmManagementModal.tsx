import { useState } from 'react';
import { X, Smartphone, Clock, PenLine, Hash, MessageSquare, CheckCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { openWhatsApp, WA_MESSAGES } from '../lib/whatsapp';

interface Props {
  onClose: () => void;
}

export default function SmmManagementModal({ onClose }: Props) {
  const { profile } = useAuth();
  const { i18n } = useTranslation();
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState(false);

  const isEn =
    i18n.language?.startsWith('en') ||
    localStorage.getItem('yalla_lang') === 'en' ||
    window.location.search.includes('lang=en');

  const SERVICES = [
    {
      icon: Clock,
      color: '#34d399',
      title: isEn ? 'Content Publishing' : 'Публикация контента',
      desc: isEn ? 'We post Reels and content at peak activity times for your reach.' : 'Выкладываем Reels и посты в самое активное время для ваших охватов.',
    },
    {
      icon: PenLine,
      color: '#60a5fa',
      title: isEn ? 'Copywriting' : 'Копирайтинг',
      desc: isEn ? 'We write engaging captions and descriptions for every video.' : 'Пишем вовлекающие заголовки и описания к каждому ролику.',
    },
    {
      icon: Hash,
      color: '#f472b6',
      title: isEn ? 'Hashtags & SEO' : 'Хештеги и SEO',
      desc: isEn ? 'We select trending tags to get you into recommendations.' : 'Подбираем актуальные теги для выхода в рекомендации.',
    },
    {
      icon: MessageSquare,
      color: '#fb923c',
      title: isEn ? 'Audience Management' : 'Работа с аудиторией',
      desc: isEn ? 'We reply to comments and forward important requests to Direct.' : 'Отвечаем на комментарии и пересылаем важные запросы в Direct.',
    },
  ];

  async function handleRequest() {
    if (sending) return;
    setSending(true);
    const clientName = profile?.name || 'Guest';
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
            event_type: 'smm_request',
            details: 'SMM Management Request',
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

  return (
    <div className="ai-modal-overlay" onClick={onClose}>
      <div className="ai-modal-sheet" onClick={e => e.stopPropagation()}>
        <div className="ai-modal-drag-handle" />

        <div className="ai-modal-header">
          <div
            className="ai-modal-header-icon"
            style={{
              background: 'linear-gradient(135deg, #0f766e, #14b8a6)',
              boxShadow: '0 4px 16px #14b8a640',
              color: '#fff',
            }}
          >
            <Smartphone size={20} />
          </div>
          <div>
            <h2 className="ai-modal-title">{isEn ? 'SMM Management' : 'Ведение и SMM'}</h2>
            <p className="ai-modal-subtitle">{isEn ? 'Free your hands — we handle the routine' : 'Свободные руки — мы берём рутину на себя'}</p>
          </div>
          <button className="ai-modal-close" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="ai-modal-body">
          <div className="hub-intro">
            <p className="hub-intro-text">
              {isEn
                ? 'Shooting and editing is half the work. We take on all the account management routine.'
                : 'Снять и смонтировать — это полдела. Мы возьмем на себя всю рутину по управлению вашим аккаунтом.'}
            </p>
          </div>

          <div className="smm-services-list">
            {SERVICES.map((s, i) => {
              const Icon = s.icon;
              return (
                <div key={i} className="smm-service-row">
                  <div className="smm-service-dot" style={{ background: s.color, boxShadow: `0 0 10px ${s.color}60` }}>
                    <Icon size={15} color="#fff" />
                  </div>
                  <div className="smm-service-content">
                    <span className="smm-service-title">{s.title}</span>
                    <p className="smm-service-desc">{s.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="smm-price-block">
            <div className="smm-price-label">{isEn ? 'Price' : 'Стоимость'}</div>
            <div className="smm-price-value">
              {isEn ? 'from' : 'от'} <span className="smm-price-amount">3 000 AED</span>
              <span className="smm-price-period"> {isEn ? '/ month' : '/ месяц'}</span>
            </div>
          </div>

          <button
            className="smm-cta-btn wa-cta-btn"
            onClick={() => { handleRequest(); openWhatsApp(WA_MESSAGES.smm); }}
            disabled={sending}
            style={{ cursor: sending ? 'not-allowed' : 'pointer' }}
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
          <span>{isEn ? 'Request sent! A manager will contact you shortly.' : 'Заявка отправлена! Менеджер свяжется с вами в ближайшее время.'}</span>
        </div>
      )}
    </div>
  );
}
