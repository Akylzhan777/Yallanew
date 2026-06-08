import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Bot, Zap, ShoppingCart, ChevronRight, Check } from 'lucide-react';
import { openWhatsApp } from '../lib/whatsapp';

interface ChatBotModalProps {
  onClose: () => void;
}

export default function ChatBotModal({ onClose }: ChatBotModalProps) {
  const { i18n } = useTranslation();
  const [selected, setSelected] = useState<string | null>(null);

  const isEn =
    i18n.language?.startsWith('en') ||
    localStorage.getItem('yalla_lang') === 'en' ||
    window.location.search.includes('lang=en');

  const PACKAGES = [
    {
      id: 'lead',
      icon: <Bot size={28} color="#60a5fa" />,
      iconBg: 'linear-gradient(135deg, #1e3a5f, #1d4ed8)',
      iconShadow: '0 4px 20px rgba(29,78,216,0.45)',
      title: 'Lead Gen Bot',
      price: '1 500 AED',
      badge: isEn ? 'START' : 'СТАРТ',
      badgeColor: '#3b82f6',
      desc: isEn ? '24/7 auto lead collection. Lead qualification, Telegram notifications.' : 'Автосбор заявок 24/7. Квалификация лидов, уведомления в Telegram.',
      features: isEn ? [
        'Lead reception and qualification',
        'Manager notifications',
        'Auto-replies to FAQ',
        'Telegram/WhatsApp integration',
        'Analytics dashboard',
      ] : [
        'Приём и квалификация заявок',
        'Уведомления менеджеру',
        'Авто-ответы на FAQ',
        'Интеграция с Telegram/WhatsApp',
        'Панель аналитики',
      ],
      wa: isEn ? 'Hi! I want to set up Lead Gen Bot for 1 500 AED. Tell me more.' : 'Привет! Хочу подключить Lead Gen Бот за 1 500 AED. Расскажите подробнее.',
    },
    {
      id: 'ai',
      icon: <Zap size={28} color="#a78bfa" />,
      iconBg: 'linear-gradient(135deg, #2d1060, #6d28d9)',
      iconShadow: '0 4px 20px rgba(109,40,217,0.55)',
      title: 'AI Assistant',
      price: '3 500 AED',
      badge: 'TOP',
      badgeColor: '#8b5cf6',
      desc: isEn ? 'GPT-4 guarding your business. Responds like a real manager, handles objections.' : 'GPT-4 на страже вашего бизнеса. Отвечает как живой менеджер, обрабатывает возражения.',
      features: isEn ? [
        'GPT-4 client dialogue',
        'Objection handling',
        'Personalized responses',
        'Meeting / shoot scheduling',
        'Training on business knowledge base',
        'Conversation analytics',
      ] : [
        'GPT-4 диалог с клиентами',
        'Обработка возражений',
        'Персонализированные ответы',
        'Запись на встречи / съёмки',
        'Обучение на базе знаний бизнеса',
        'Аналитика разговоров',
      ],
      featured: true,
      wa: isEn ? 'Hi! Interested in AI Assistant for 3 500 AED. Want to know the details.' : 'Привет! Интересует AI Ассистент за 3 500 AED. Хочу узнать детали.',
    },
    {
      id: 'sales',
      icon: <ShoppingCart size={28} color="#34d399" />,
      iconBg: 'linear-gradient(135deg, #064e3b, #059669)',
      iconShadow: '0 4px 20px rgba(5,150,105,0.45)',
      title: isEn ? 'Sales Automation' : 'Sales Автоматизация',
      price: isEn ? 'from 5 000 AED' : 'от 5 000 AED',
      badge: 'ENTERPRISE',
      badgeColor: '#10b981',
      desc: isEn ? 'Full sales funnel on autopilot. CRM, bots, broadcasts, analytics.' : 'Полная воронка продаж на автопилоте. CRM, боты, рассылки, аналитика.',
      features: isEn ? [
        'CRM integration (Bitrix / AmoCRM)',
        'Sales funnel turnkey',
        'Segmented auto-broadcasts',
        'Upsell / cross-sell bots',
        'Conversion dashboard',
        'Personal account manager',
      ] : [
        'CRM-интеграция (Bitrix / AmoCRM)',
        'Воронка продаж под ключ',
        'Авторассылки по сегментам',
        'Upsell / cross-sell боты',
        'Дашборд конверсий',
        'Персональный аккаунт-менеджер',
      ],
      wa: isEn ? 'Hi! I want Sales Automation from 5 000 AED. Tell me about implementation.' : 'Привет! Хочу Sales Автоматизацию от 5 000 AED. Расскажите про внедрение.',
    },
  ];

  const handleRequest = (wa: string) => {
    openWhatsApp(wa);
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ animation: 'overlayFadeIn 0.2s ease' }}>
      <div
        className="modal-sheet"
        onClick={e => e.stopPropagation()}
        style={{
          background: '#0A0A0A',
          border: '1px solid rgba(255,255,255,0.07)',
          animation: 'var(--modal-in)',
          maxWidth: 480,
          width: '100%',
          margin: '0 auto',
          borderRadius: 24,
          padding: 0,
          overflow: 'hidden',
        }}
      >
        <div style={{
          background: 'linear-gradient(140deg, #050510 0%, #0f0a2e 55%, #1a0f4e 100%)',
          padding: '22px 22px 18px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          position: 'relative',
        }}>
          <button
            onClick={onClose}
            style={{ position: 'absolute', top: 18, right: 18, background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: 10, width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff' }}
          >
            <X size={16} />
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 46, height: 46, borderRadius: 14,
              background: 'linear-gradient(135deg, #1e1060, #4c1d95)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 18px rgba(109,40,217,0.5)',
            }}>
              <Bot size={24} color="#a78bfa" />
            </div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#fff', letterSpacing: '-0.3px' }}>{isEn ? 'Chatbots & Automation' : 'Чат-боты & Автоматизация'}</div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', marginTop: 2 }}>{isEn ? 'Sales on autopilot — 24/7' : 'Продажи на автопилоте — 24/7'}</div>
            </div>
          </div>
        </div>

        <div style={{ padding: '18px 18px 24px', overflowY: 'auto', maxHeight: '72vh' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {PACKAGES.map(pkg => (
              <div
                key={pkg.id}
                onClick={() => setSelected(selected === pkg.id ? null : pkg.id)}
                style={{
                  background: selected === pkg.id
                    ? 'rgba(255,255,255,0.06)'
                    : 'rgba(255,255,255,0.03)',
                  border: selected === pkg.id
                    ? `1.5px solid ${pkg.badgeColor}55`
                    : '1.5px solid rgba(255,255,255,0.07)',
                  borderRadius: 18,
                  padding: '16px 16px 14px',
                  cursor: 'pointer',
                  transition: 'all 0.18s ease',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                {(pkg as any).featured && (
                  <div style={{
                    position: 'absolute', top: 0, right: 0,
                    background: 'linear-gradient(135deg, #6d28d9, #4c1d95)',
                    color: '#e9d5ff', fontSize: 10, fontWeight: 700,
                    padding: '4px 12px', borderRadius: '0 18px 0 14px', letterSpacing: 1,
                  }}>BEST VALUE</div>
                )}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                  <div style={{
                    width: 52, height: 52, borderRadius: 14, flexShrink: 0,
                    background: pkg.iconBg, boxShadow: pkg.iconShadow,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {pkg.icon}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>{pkg.title}</span>
                      <span style={{
                        background: `${pkg.badgeColor}22`,
                        color: pkg.badgeColor, fontSize: 10, fontWeight: 700,
                        padding: '2px 8px', borderRadius: 6, letterSpacing: 0.5,
                      }}>{pkg.badge}</span>
                    </div>
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', marginTop: 4, lineHeight: 1.4 }}>{pkg.desc}</div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: '#fff', marginTop: 8 }}>{pkg.price}</div>
                  </div>
                  <ChevronRight
                    size={18}
                    color="rgba(255,255,255,0.3)"
                    style={{ transform: selected === pkg.id ? 'rotate(90deg)' : 'none', transition: '0.2s', flexShrink: 0, marginTop: 4 }}
                  />
                </div>

                {selected === pkg.id && (
                  <div style={{ marginTop: 16, borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: 14 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                      {pkg.features.map((f, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{
                            width: 20, height: 20, borderRadius: 6, flexShrink: 0,
                            background: `${pkg.badgeColor}22`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>
                            <Check size={11} color={pkg.badgeColor} />
                          </div>
                          <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)' }}>{f}</span>
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={e => { e.stopPropagation(); handleRequest(pkg.wa); }}
                      style={{
                        width: '100%', padding: '13px 0', borderRadius: 12, border: 'none',
                        background: `linear-gradient(135deg, ${pkg.badgeColor}, ${pkg.badgeColor}cc)`,
                        color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer',
                        boxShadow: `0 4px 16px ${pkg.badgeColor}44`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                      }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="#fff">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/>
                      </svg>
                      {isEn ? 'Learn more on WhatsApp' : 'Узнать подробности в WhatsApp'}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div style={{
            marginTop: 18, padding: '14px 16px', borderRadius: 14,
            background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', lineHeight: 1.5 }}>
              {isEn ? 'Need custom automation?' : 'Нужна кастомная автоматизация?'}{' '}
              <span
                style={{ color: '#60a5fa', cursor: 'pointer', fontWeight: 600 }}
                onClick={() => openWhatsApp(isEn ? 'Hi! I need custom business automation. Want to discuss details.' : 'Привет! Нужна кастомная автоматизация бизнеса. Хочу обсудить детали.')}
              >
                {isEn ? 'Contact us' : 'Напишите нам'}
              </span>
              {isEn ? " \u2014 we'll build it for your business" : ' — сделаем под ваш бизнес'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
