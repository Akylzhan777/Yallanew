import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

interface Client {
  id: string;
  name: string;
}

interface TelegramGroup {
  id: string;
  name: string;
  chat_id: string;
  client_id: string | null;
}

interface Props {
  client: Client & { drive_link?: string | null };
  onClose: () => void;
}

export default function SendRawVideoModal({ client, onClose }: Props) {
  const [linkedGroup, setLinkedGroup] = useState<TelegramGroup | null>(null);
  const [loading, setLoading] = useState(true);
  const [videoLink, setVideoLink] = useState(client.drive_link ?? '');
  const [customMessage, setCustomMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('telegram_groups')
        .select('id, name, chat_id, client_id')
        .eq('client_id', client.id)
        .maybeSingle();
      setLinkedGroup(data ?? null);
      setLoading(false);
    };
    load();
  }, [client.id]);

  const defaultMessage = `🎬 Ваши исходники готовы!\n\nПапка клиента: ${videoLink || '[ссылка]'}\n\nПожалуйста, скачайте материалы. Спасибо!`;

  const handleSend = async () => {
    if (!videoLink.trim()) { setError('Укажите ссылку на исходники'); return; }
    if (!linkedGroup) { setError('Нет привязанной Telegram-группы'); return; }
    setSending(true);
    setError('');
    try {
      const botToken = import.meta.env.VITE_TELEGRAM_BOT_TOKEN as string;
      if (!botToken) { setError('Telegram bot token не настроен (VITE_TELEGRAM_BOT_TOKEN)'); setSending(false); return; }
      const text = customMessage.trim() || `🎬 Ваши исходники готовы!\n\nПапка клиента: ${videoLink.trim()}\n\nПожалуйста, скачайте материалы. Спасибо!`;
      const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: linkedGroup.chat_id,
          text,
          parse_mode: 'HTML',
        }),
      });
      const json = await res.json();
      if (json.ok) {
        setSent(true);
      } else {
        setError(json.description ?? 'Ошибка Telegram API');
      }
    } catch (e) {
      setError(String(e));
    }
    setSending(false);
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.7)',
        zIndex: 2000,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#131929',
          border: '1px solid rgba(13,71,161,0.4)',
          borderRadius: 16,
          padding: '28px 28px 24px',
          width: '100%',
          maxWidth: 460,
          boxShadow: '0 24px 64px rgba(0,0,0,0.7)',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 9,
              background: 'linear-gradient(135deg, #0D47A1, #0277BD)',
              border: '1px solid #1565C0',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="white">
                <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
              </svg>
            </div>
            <div>
              <div style={{ color: '#f1f5f9', fontSize: '0.95rem', fontWeight: 700 }}>
                Отправить исходники
              </div>
              <div style={{ color: '#6b7280', fontSize: '0.75rem', marginTop: 1 }}>
                {client.name}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: 4 }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '32px 0', color: '#6b7280', fontSize: '0.9rem' }}>
            Загрузка...
          </div>
        ) : sent ? (
          <div style={{
            textAlign: 'center', padding: '32px 16px',
            background: 'rgba(34,197,94,0.06)',
            border: '1px solid rgba(34,197,94,0.2)',
            borderRadius: 12,
          }}>
            <div style={{ fontSize: '2rem', marginBottom: 8 }}>✓</div>
            <div style={{ color: '#4ADE80', fontWeight: 700, fontSize: '1rem', marginBottom: 4 }}>
              Сообщение отправлено!
            </div>
            <div style={{ color: '#6b7280', fontSize: '0.82rem' }}>
              Группа: {linkedGroup?.name}
            </div>
            <button
              onClick={onClose}
              style={{
                marginTop: 20, background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.25)',
                borderRadius: 8, padding: '8px 24px', color: '#4ADE80',
                fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer',
              }}
            >
              Закрыть
            </button>
          </div>
        ) : !linkedGroup ? (
          <div style={{
            textAlign: 'center', padding: '28px 16px',
            background: 'rgba(239,68,68,0.05)',
            border: '1px solid rgba(239,68,68,0.18)',
            borderRadius: 12,
          }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 10 }}>
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <div style={{ color: '#f87171', fontWeight: 700, fontSize: '0.9rem', marginBottom: 6 }}>
              Группа не привязана
            </div>
            <div style={{ color: '#6b7280', fontSize: '0.8rem', lineHeight: 1.5 }}>
              Для клиента <strong style={{ color: '#e0e0e0' }}>{client.name}</strong> не назначена Telegram-группа.<br/>
              Перейдите в Telegram Рассылку и привяжите группу к этому клиенту.
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: 'rgba(13,71,161,0.1)',
              border: '1px solid rgba(21,101,192,0.25)',
              borderRadius: 8, padding: '10px 14px',
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="#64B5F6">
                <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
              </svg>
              <div>
                <div style={{ color: '#64B5F6', fontWeight: 600, fontSize: '0.82rem' }}>{linkedGroup.name}</div>
                <div style={{ color: '#4b5563', fontSize: '0.7rem', fontFamily: 'monospace' }}>{linkedGroup.chat_id}</div>
              </div>
              <span style={{
                marginLeft: 'auto',
                fontSize: '0.65rem', fontWeight: 700, color: '#4ADE80',
                background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.2)',
                padding: '2px 7px', borderRadius: 4,
              }}>
                Привязана
              </span>
            </div>

            <div>
              <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
                Ссылка на исходники (Google Drive / Dropbox) <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                value={videoLink}
                onChange={e => { setVideoLink(e.target.value); setError(''); }}
                placeholder="https://drive.google.com/..."
                style={{
                  width: '100%',
                  background: '#0f1420',
                  border: `1px solid ${error && !videoLink ? '#ef4444' : 'rgba(255,255,255,0.1)'}`,
                  borderRadius: 10,
                  padding: '11px 14px',
                  color: '#e5e7eb',
                  fontSize: '0.875rem',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
                Сообщение (необязательно)
              </label>
              <textarea
                value={customMessage}
                onChange={e => setCustomMessage(e.target.value)}
                placeholder={defaultMessage}
                rows={5}
                style={{
                  width: '100%',
                  background: '#0f1420',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 10,
                  padding: '11px 14px',
                  color: '#e5e7eb',
                  fontSize: '0.82rem',
                  outline: 'none',
                  resize: 'vertical',
                  fontFamily: 'inherit',
                  lineHeight: '1.55',
                  boxSizing: 'border-box',
                }}
              />
              <div style={{ fontSize: '0.7rem', color: '#4b5563', marginTop: 4 }}>
                Если пусто — отправится стандартное сообщение с именем клиента и ссылкой
              </div>
            </div>

            {error && (
              <div style={{
                background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)',
                borderRadius: 8, padding: '10px 14px',
                color: '#f87171', fontSize: '0.82rem',
              }}>
                {error}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
              <button
                onClick={handleSend}
                disabled={sending}
                style={{
                  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  background: sending ? '#1e2937' : 'linear-gradient(135deg, #0D47A1, #0277BD)',
                  border: '1px solid #1565C0',
                  borderRadius: 10, padding: '11px 0',
                  color: sending ? '#6B7280' : '#fff',
                  fontWeight: 700, fontSize: '0.875rem',
                  cursor: sending ? 'not-allowed' : 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                {sending ? (
                  <>
                    <div className="admin-spinner" style={{ width: 14, height: 14 }} />
                    Отправка...
                  </>
                ) : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                    </svg>
                    Отправить в Telegram
                  </>
                )}
              </button>
              <button
                onClick={onClose}
                style={{
                  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 10, padding: '11px 20px',
                  color: '#94a3b8', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer',
                }}
              >
                Отмена
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
