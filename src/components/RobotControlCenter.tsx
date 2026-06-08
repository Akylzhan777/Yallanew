import { useState, useEffect } from 'react';
import DriverMessageTemplateEditor from './DriverMessageTemplateEditor';
import MythOperatorReminderEditor from './MythOperatorReminderEditor';
import OperatorMessageTemplateEditor from './OperatorMessageTemplateEditor';
import TelegramBroadcastPanel from './TelegramBroadcastPanel';
import VideoAnalysisPanel from './VideoAnalysisPanel';
import { supabase } from '../lib/supabase';

interface MechanismCard {
  id: string;
  icon: string;
  name: string;
  description: string;
  trigger: string;
  template: string;
  accentColor: string;
  bgColor: string;
  borderColor: string;
  tagColor: string;
  tagBg: string;
}

interface PenaltyBracket {
  label: string;
  hours: string;
  amount: number;
  color: string;
}

const MECHANISMS: MechanismCard[] = [
  {
    id: 'siren',
    icon: '🚨',
    name: 'Сирена',
    description: 'Оповещение о новых и зависших заказах. Срабатывает каждый раз, пока есть свободные задачи, и бьёт тревогу всем монтажерам одновременно.',
    trigger: 'Заказ в статусе "Свободные" (pending)',
    template: '🚨 СВОБОДНЫЙ ЗАКАЗ ВИСИТ! Кто первый заберет, того и деньги. Заходим на портал живо!',
    accentColor: '#EF4444',
    bgColor: '#EF444408',
    borderColor: '#EF444430',
    tagColor: '#EF4444',
    tagBg: '#EF444415',
  },
  {
    id: 'woodpecker',
    icon: '🦅',
    name: 'Дятел',
    description: 'Ежедневные пуши исполнителям. Не даёт забыть про активный заказ пока идёт дедлайн. Только для задач, которые ещё в срок.',
    trigger: 'Заказ в работе (in_progress), дедлайн ещё не вышел',
    template: '⏳ Напоминание: у тебя в работе заказ. Не забудь про видео и обложку. Дедлайн тикает, делай красиво!',
    accentColor: '#3B82F6',
    bgColor: '#3B82F608',
    borderColor: '#3B82F630',
    tagColor: '#3B82F6',
    tagBg: '#3B82F615',
  },
  {
    id: 'blood',
    icon: '🩸',
    name: 'Счётчик крови',
    description: 'Прогрессивные штрафы за просрочку. Каждые 24 часа просрочки — новый уровень финансового наказания. Штраф вычитается из месячного баланса автоматически.',
    trigger: 'Дедлайн просрочен. Нарастает каждые 24 часа',
    template: '❌ ШТРАФ! Ты просрочил дедлайн. С твоего баланса только что списано [СУММА] тенге. Сдавай работу сейчас, завтра штраф будет ещё больше!',
    accentColor: '#DC2626',
    bgColor: '#DC262608',
    borderColor: '#DC262630',
    tagColor: '#F87171',
    tagBg: '#DC262618',
  },
];

const PENALTY_BRACKETS: PenaltyBracket[] = [
  { label: 'Просрочка 0–24 часа',   hours: '0–24ч',  amount: 500,   color: '#F59E0B' },
  { label: 'Просрочка 24–48 часов', hours: '24–48ч', amount: 5000,  color: '#EF4444' },
  { label: 'Просрочка 48–72 часа',  hours: '48–72ч', amount: 10000, color: '#DC2626' },
  { label: 'Просрочка >72 часов',   hours: '>72ч',   amount: 20000, color: '#991B1B' },
];

const TRIGGER_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: 'pending', color: '#94A3B8', bg: '#94A3B815' },
  in_progress: { label: 'in_progress', color: '#F59E0B', bg: '#F59E0B15' },
  overdue: { label: 'overdue', color: '#EF4444', bg: '#EF444415' },
};

const SMART_AVAILABILITY_CARD = {
  id: 'smart_availability',
  icon: '📅',
  name: 'Поиск свободных окон (Smart Availability)',
  description: 'Ежедневный анализ календаря. Авто-рассылка свободных слотов на завтра в Telegram-группы клиентов.',
  trigger: 'Каждый день в 19:00 (Dubai time)',
  accentColor: '#0EA5E9',
  bgColor: '#0EA5E908',
  borderColor: '#0EA5E930',
  tagColor: '#0EA5E9',
  tagBg: '#0EA5E915',
};

const TABS = [
  { id: 'automations', label: 'Automations' },
  { id: 'telegram', label: 'Telegram Broadcast' },
  { id: 'analyses', label: 'Video Analyses' },
  { id: 'ai_summary', label: 'AI Summary' },
];

function AiSummaryPanel({ showToast }: { showToast: (msg: string) => void }) {
  const [geminiKey, setGeminiKey] = useState('');
  const [greenIdInstance, setGreenIdInstance] = useState('');
  const [greenTokenInstance, setGreenTokenInstance] = useState('');
  const [recipient, setRecipient] = useState('971585973177@c.us');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; error?: string; messages?: number } | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase
          .from('app_settings')
          .select('*')
          .limit(1)
          .maybeSingle();
        if (data) {
          setGeminiKey(data.gemini_api_key ?? '');
          setGreenIdInstance(data.green_api_id_instance ?? '');
          setGreenTokenInstance(data.green_api_token_instance ?? '');
          setRecipient(data.ai_summary_recipient ?? '971585973177@c.us');
        }
      } catch (e) {
        console.error('Failed to load AI summary settings', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const save = async () => {
    setSaving(true);
    const { data: existing } = await supabase.from('app_settings').select('id').limit(1).maybeSingle();
    const payload = {
      gemini_api_key: geminiKey,
      green_api_id_instance: greenIdInstance,
      green_api_token_instance: greenTokenInstance,
      ai_summary_recipient: recipient,
    };
    let err;
    if (existing?.id) {
      ({ error: err } = await supabase.from('app_settings').update(payload).eq('id', existing.id));
    } else {
      ({ error: err } = await supabase.from('app_settings').insert(payload));
    }
    setSaving(false);
    if (err) showToast('Ошибка сохранения: ' + err.message);
    else showToast('Настройки AI Summary сохранены');
  };

  const runTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
      const res = await fetch(`${supabaseUrl}/functions/v1/daily-ai-summary`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token ?? import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
      });
      const json = await res.json();
      if (json.ok) {
        setTestResult({ ok: true, messages: json.messages_processed });
        showToast(json.skipped ? 'Нет новых сообщений для сводки' : `Сводка отправлена (${json.messages_processed} сообщений)`);
      } else {
        setTestResult({ ok: false, error: json.error ?? 'Неизвестная ошибка' });
        showToast('Ошибка: ' + (json.error ?? 'Неизвестная ошибка'));
      }
    } catch (e) {
      setTestResult({ ok: false, error: String(e) });
      showToast('Сетевая ошибка: ' + String(e));
    }
    setTesting(false);
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: '#0D1520',
    border: '1px solid #1E3A5F',
    borderRadius: 8,
    padding: '10px 14px',
    color: '#E5E7EB',
    fontSize: '0.875rem',
    outline: 'none',
    boxSizing: 'border-box',
    marginBottom: 16,
    fontFamily: 'ui-monospace, monospace',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '0.78rem',
    fontWeight: 600,
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: 6,
  };

  if (loading) {
    return <div style={{ color: '#6B7280', fontSize: '0.85rem', padding: 32 }}>Загрузка...</div>;
  }

  return (
    <div>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #0a1628 0%, #0d1f35 100%)',
        border: '1px solid #1E3A5F',
        borderRadius: 16,
        padding: '24px 28px',
        marginBottom: 24,
        display: 'flex',
        alignItems: 'flex-start',
        gap: 18,
      }}>
        <div style={{
          width: 48, height: 48, borderRadius: 14,
          background: 'linear-gradient(135deg, #0369A1 0%, #0284C7 100%)',
          border: '1px solid #0EA5E930',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '1.4rem', flexShrink: 0,
        }}>
          🤖
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff', marginBottom: 4 }}>
            Глобальная Нейро-сводка (Все проекты)
          </div>
          <div style={{ fontSize: '0.82rem', color: '#6B7280', lineHeight: 1.55 }}>
            Каждый день в 09:00 (Dubai) бот читает переписку Telegram-группы Myth за последние 24 часа,
            суммаризирует её через OpenAI GPT-4o Mini и отправляет сжатый отчёт в WhatsApp.
          </div>
          <div style={{
            marginTop: 12, display: 'flex', alignItems: 'center', gap: 8,
            padding: '6px 12px',
            background: '#22C55E10',
            border: '1px solid #22C55E25',
            borderRadius: 8,
            width: 'fit-content',
          }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#22C55E', flexShrink: 0 }} />
            <span style={{ fontSize: '0.76rem', color: '#22C55E', fontWeight: 600 }}>
              Cron активен · ежедневно 09:00 Dubai (05:00 UTC)
            </span>
          </div>
        </div>
      </div>

      {/* Settings form */}
      <div style={{
        background: '#0a1628',
        border: '1px solid #1E3A5F',
        borderRadius: 14,
        padding: '24px 28px',
        marginBottom: 24,
      }}>
        <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 20 }}>
          Настройки интеграций
        </div>

        <label style={labelStyle}>Gemini API Key</label>
        <input
          type="password"
          value={geminiKey}
          onChange={e => setGeminiKey(e.target.value)}
          placeholder="AIza..."
          style={inputStyle}
        />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div>
            <label style={labelStyle}>Green API — idInstance</label>
            <input
              value={greenIdInstance}
              onChange={e => setGreenIdInstance(e.target.value)}
              placeholder="1234567890"
              style={{ ...inputStyle, marginBottom: 0 }}
            />
          </div>
          <div>
            <label style={labelStyle}>Green API — apiTokenInstance</label>
            <input
              type="password"
              value={greenTokenInstance}
              onChange={e => setGreenTokenInstance(e.target.value)}
              placeholder="abc123..."
              style={{ ...inputStyle, marginBottom: 0 }}
            />
          </div>
        </div>

        <div style={{ marginTop: 16 }}>
          <label style={labelStyle}>WhatsApp получатель (chatId)</label>
          <input
            value={recipient}
            onChange={e => setRecipient(e.target.value)}
            placeholder="971585973177@c.us"
            style={inputStyle}
          />
        </div>

        <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
          <button
            onClick={save}
            disabled={saving}
            style={{
              background: saving ? 'rgba(14,165,233,0.1)' : 'linear-gradient(135deg, #0369A1 0%, #0284C7 100%)',
              border: '1px solid #0EA5E940',
              borderRadius: 10,
              padding: '10px 22px',
              color: saving ? '#6B7280' : '#fff',
              fontWeight: 700,
              fontSize: '0.875rem',
              cursor: saving ? 'default' : 'pointer',
              opacity: saving ? 0.7 : 1,
              transition: 'all 0.15s',
            }}
          >
            {saving ? 'Сохранение...' : 'Сохранить настройки'}
          </button>

          <button
            onClick={runTest}
            disabled={testing}
            style={{
              background: testing ? 'rgba(34,197,94,0.05)' : 'rgba(34,197,94,0.1)',
              border: '1px solid #22C55E30',
              borderRadius: 10,
              padding: '10px 22px',
              color: testing ? '#6B7280' : '#22C55E',
              fontWeight: 700,
              fontSize: '0.875rem',
              cursor: testing ? 'default' : 'pointer',
              opacity: testing ? 0.7 : 1,
              transition: 'all 0.15s',
            }}
          >
            {testing ? 'Запуск...' : 'Запустить вручную'}
          </button>
        </div>

        {testResult !== null && (
          <div style={{
            marginTop: 16,
            padding: '10px 14px',
            background: testResult.ok ? 'rgba(34,197,94,0.06)' : 'rgba(239,68,68,0.06)',
            border: `1px solid ${testResult.ok ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)'}`,
            borderRadius: 8,
            fontSize: '0.82rem',
            color: testResult.ok ? '#4ADE80' : '#F87171',
          }}>
            {testResult.ok
              ? `Сводка успешно отправлена · обработано ${testResult.messages ?? 0} сообщений`
              : `Ошибка: ${testResult.error}`}
          </div>
        )}
      </div>

      {/* How it works */}
      <div style={{
        background: '#0a1628',
        border: '1px solid #1E3A5F',
        borderRadius: 14,
        padding: '20px 24px',
      }}>
        <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 16 }}>
          Как это работает
        </div>
        {[
          { step: '1', color: '#0EA5E9', title: 'Логирование переписки', desc: 'Telegram webhook сохраняет каждое текстовое сообщение из группы Myth в таблицу chat_history_log.' },
          { step: '2', color: '#8B5CF6', title: 'Cron 09:00 Dubai', desc: 'Каждый день pg_cron вызывает edge function daily-ai-summary.' },
          { step: '3', color: '#F59E0B', title: 'Суммаризация OpenAI', desc: 'Все несуммаризованные сообщения за 24 часа склеиваются в transcript и отправляются в GPT-4o Mini.' },
          { step: '4', color: '#22C55E', title: 'Отправка в WhatsApp', desc: 'Готовый текст сводки отправляется через Green API на указанный номер. Сообщения помечаются как summarized.' },
        ].map(item => (
          <div key={item.step} style={{ display: 'flex', gap: 14, marginBottom: 14 }}>
            <div style={{
              width: 28, height: 28, borderRadius: '50%',
              background: `${item.color}20`, border: `1px solid ${item.color}40`,
              color: item.color, fontSize: '0.78rem', fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1,
            }}>
              {item.step}
            </div>
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#E5E7EB', marginBottom: 2 }}>{item.title}</div>
              <div style={{ fontSize: '0.8rem', color: '#6B7280', lineHeight: '1.5' }}>{item.desc}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function RobotControlCenter() {
  const [toast, setToast] = useState('');
  const [activeTab, setActiveTab] = useState('automations');

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3500);
  };

  return (
    <div style={{ position: 'relative' }}>
      {toast && (
        <div style={{
          position: 'fixed',
          bottom: 24,
          left: '50%',
          transform: 'translateX(-50%)',
          background: '#1C1E26',
          border: '1px solid #3C3F4A',
          borderRadius: 10,
          padding: '12px 24px',
          color: '#fff',
          fontSize: '0.875rem',
          fontWeight: 500,
          zIndex: 9999,
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          whiteSpace: 'nowrap',
        }}>
          {toast}
        </div>
      )}

      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 8 }}>
          <div style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            background: 'linear-gradient(135deg, #1E3A5F 0%, #0F2040 100%)',
            border: '1px solid #2D4A6A',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.4rem',
            flexShrink: 0,
          }}>
            🤖
          </div>
          <div>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 700, color: '#fff', margin: 0 }}>
              Центр управления Роботом
            </h2>
            <p style={{ fontSize: '0.82rem', color: '#6B7280', margin: '3px 0 0 0' }}>
              Активные сценарии WhatsApp-автоматизации · диктаторский режим
            </p>
          </div>
        </div>

        <div style={{
          marginTop: 16,
          padding: '12px 16px',
          background: '#0F1724',
          border: '1px solid #1E3A5F',
          borderRadius: 10,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}>
          <div style={{
            width: 8, height: 8, borderRadius: '50%',
            background: '#22C55E',
            boxShadow: '0 0 0 3px #22C55E30',
            animation: 'pulse 2s infinite',
            flexShrink: 0,
          }} />
          <span style={{ fontSize: '0.82rem', color: '#9CA3AF' }}>
            Все 3 сценария активны · Запускаются автоматически через cron · Уведомления через WhatsApp (Green API)
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 2, marginBottom: 28, borderBottom: '1px solid #1F2937' }}>
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '9px 18px',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === tab.id ? '2px solid #22C55E' : '2px solid transparent',
              color: activeTab === tab.id ? '#E5E7EB' : '#6B7280',
              fontSize: '0.85rem',
              fontWeight: activeTab === tab.id ? 600 : 400,
              cursor: 'pointer',
              transition: 'all 0.15s',
              whiteSpace: 'nowrap',
            }}
            onMouseEnter={e => { if (activeTab !== tab.id) e.currentTarget.style.color = '#9CA3AF'; }}
            onMouseLeave={e => { if (activeTab !== tab.id) e.currentTarget.style.color = '#6B7280'; }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'analyses' && <VideoAnalysisPanel />}
      {activeTab === 'ai_summary' && <AiSummaryPanel showToast={showToast} />}

      {activeTab === 'telegram' && <TelegramBroadcastPanel />}

      {activeTab === 'automations' && <><div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 20, marginBottom: 32 }}>
        {[...MECHANISMS].map(card => (
          <div
            key={card.id}
            style={{
              background: card.bgColor,
              border: `1px solid ${card.borderColor}`,
              borderRadius: 16,
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
              transition: 'transform 0.15s, box-shadow 0.15s',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)';
              (e.currentTarget as HTMLDivElement).style.boxShadow = `0 8px 32px ${card.accentColor}20`;
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
              (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 48,
                  height: 48,
                  borderRadius: 12,
                  background: `${card.accentColor}18`,
                  border: `1px solid ${card.accentColor}35`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.5rem',
                  flexShrink: 0,
                }}>
                  {card.icon}
                </div>
                <div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#fff', margin: 0 }}>
                    {card.name}
                  </h3>
                  <span style={{
                    display: 'inline-block',
                    marginTop: 4,
                    padding: '2px 8px',
                    background: '#22C55E18',
                    border: '1px solid #22C55E30',
                    borderRadius: 20,
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    color: '#22C55E',
                    letterSpacing: '0.03em',
                    textTransform: 'uppercase',
                  }}>
                    АКТИВЕН
                  </span>
                </div>
              </div>
              <button
                onClick={() => showToast('Редактирование текстов появится в следующем обновлении')}
                style={{
                  padding: '6px 12px',
                  background: 'transparent',
                  border: `1px solid ${card.borderColor}`,
                  borderRadius: 8,
                  color: '#6B7280',
                  fontSize: '0.75rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s',
                  flexShrink: 0,
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = card.accentColor;
                  e.currentTarget.style.color = card.accentColor;
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = card.borderColor;
                  e.currentTarget.style.color = '#6B7280';
                }}
              >
                ✏️ Изменить
              </button>
            </div>

            <p style={{ fontSize: '0.85rem', color: '#9CA3AF', margin: 0, lineHeight: '1.55' }}>
              {card.description}
            </p>

            <div>
              <div style={{ fontSize: '0.72rem', fontWeight: 600, color: '#6B7280', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>
                Триггер
              </div>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '5px 10px',
                background: card.tagBg,
                border: `1px solid ${card.borderColor}`,
                borderRadius: 6,
                fontSize: '0.8rem',
                color: card.tagColor,
                fontWeight: 500,
              }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: card.accentColor, display: 'inline-block', flexShrink: 0 }} />
                {card.trigger}
              </div>
            </div>

            {card.id === 'blood' && (
              <div style={{
                background: '#0D0F14',
                border: '1px solid #1F2937',
                borderRadius: 10,
                overflow: 'hidden',
              }}>
                <div style={{
                  padding: '8px 14px',
                  borderBottom: '1px solid #1F2937',
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  color: '#6B7280',
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                }}>
                  Шкала штрафов
                </div>
                {PENALTY_BRACKETS.map((b, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '9px 14px',
                      borderBottom: i < PENALTY_BRACKETS.length - 1 ? '1px solid #1F292740' : 'none',
                      transition: 'background 0.12s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#1F292780')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        background: b.color,
                        boxShadow: `0 0 6px ${b.color}80`,
                        flexShrink: 0,
                      }} />
                      <span style={{ fontSize: '0.82rem', color: '#9CA3AF' }}>{b.label}</span>
                    </div>
                    <span style={{
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      color: b.color,
                      fontVariantNumeric: 'tabular-nums',
                    }}>
                      -{b.amount.toLocaleString('ru-RU')} ₸
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div style={{
              borderTop: `1px solid ${card.borderColor}`,
              paddingTop: 14,
            }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 600, color: '#6B7280', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 8 }}>
                Шаблон сообщения
              </div>
              <div style={{
                padding: '10px 14px',
                background: '#0D0F14',
                border: '1px solid #1F2937',
                borderRadius: 8,
                fontSize: '0.8rem',
                color: '#CBD5E1',
                lineHeight: '1.6',
                fontFamily: 'ui-monospace, SFMono-Regular, monospace',
                wordBreak: 'break-word',
              }}>
                {card.template}
              </div>
            </div>
          </div>
        ))}

        {/* Smart Availability Card */}
        <div
          style={{
            background: SMART_AVAILABILITY_CARD.bgColor,
            border: `1px solid ${SMART_AVAILABILITY_CARD.borderColor}`,
            borderRadius: 16,
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
            transition: 'transform 0.15s, box-shadow 0.15s',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)';
            (e.currentTarget as HTMLDivElement).style.boxShadow = `0 8px 32px ${SMART_AVAILABILITY_CARD.accentColor}20`;
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
            (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                background: `${SMART_AVAILABILITY_CARD.accentColor}18`,
                border: `1px solid ${SMART_AVAILABILITY_CARD.accentColor}35`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.5rem',
                flexShrink: 0,
              }}>
                {SMART_AVAILABILITY_CARD.icon}
              </div>
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#fff', margin: 0 }}>
                  {SMART_AVAILABILITY_CARD.name}
                </h3>
                <span style={{
                  display: 'inline-block',
                  marginTop: 4,
                  padding: '2px 8px',
                  background: '#22C55E18',
                  border: '1px solid #22C55E30',
                  borderRadius: 20,
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  color: '#22C55E',
                  letterSpacing: '0.03em',
                  textTransform: 'uppercase' as const,
                }}>
                  АКТИВЕН
                </span>
              </div>
            </div>
          </div>

          <p style={{ fontSize: '0.85rem', color: '#9CA3AF', margin: 0, lineHeight: '1.55' }}>
            {SMART_AVAILABILITY_CARD.description}
          </p>

          <div>
            <div style={{ fontSize: '0.72rem', fontWeight: 600, color: '#6B7280', letterSpacing: '0.06em', textTransform: 'uppercase' as const, marginBottom: 6 }}>
              Триггер
            </div>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '5px 10px',
              background: SMART_AVAILABILITY_CARD.tagBg,
              border: `1px solid ${SMART_AVAILABILITY_CARD.borderColor}`,
              borderRadius: 6,
              fontSize: '0.8rem',
              color: SMART_AVAILABILITY_CARD.tagColor,
              fontWeight: 500,
            }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: SMART_AVAILABILITY_CARD.accentColor, display: 'inline-block', flexShrink: 0 }} />
              {SMART_AVAILABILITY_CARD.trigger}
            </div>
          </div>

          <div style={{ borderTop: `1px solid ${SMART_AVAILABILITY_CARD.borderColor}`, paddingTop: 14 }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 600, color: '#6B7280', letterSpacing: '0.06em', textTransform: 'uppercase' as const, marginBottom: 6 }}>
              Логика
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[
                'Воскресенье — пропуск (выходной)',
                'Анализ бронирований на завтра (09:00–18:00)',
                'Исключение обеда 13:00–14:00',
                'Буфер 1 час после каждого бронирования',
                'Если нет свободных слотов — сообщение не отправляется',
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                  <div style={{ width: 5, height: 5, borderRadius: '50%', background: SMART_AVAILABILITY_CARD.accentColor, flexShrink: 0, marginTop: 6 }} />
                  <span style={{ fontSize: '0.78rem', color: '#9CA3AF', lineHeight: '1.5' }}>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div style={{
        background: '#0D1117',
        border: '1px solid #1F2937',
        borderRadius: 16,
        padding: '24px',
      }}>
        <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#E5E7EB', margin: '0 0 20px 0' }}>
          Схема запуска
        </h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[
            { step: '1', title: 'Создание задачи', desc: 'Оператор или Администратор создаёт задачу → мгновенный broadcast всем монтажерам', color: '#3B82F6' },
            { step: '2', title: 'Диктаторский cron (dictator_cron)', desc: 'Запускается по расписанию: Сирена + Дятел + Счётчик крови — все три фазы последовательно', color: '#8B5CF6' },
            { step: '3', title: 'Эскалация штрафа', desc: 'Каждый cron-запуск проверяет просрочку и при необходимости переходит на следующую скобку штрафа', color: '#EF4444' },
            { step: '4', title: 'Списание с баланса', desc: 'penalty_amount вычитается из месячного баланса монтажера автоматически на странице портала', color: '#F59E0B' },
          ].map(item => (
            <div
              key={item.step}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 14,
              }}
            >
              <div style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                background: `${item.color}20`,
                border: `1px solid ${item.color}40`,
                color: item.color,
                fontSize: '0.78rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                marginTop: 1,
              }}>
                {item.step}
              </div>
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#E5E7EB', marginBottom: 2 }}>
                  {item.title}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#6B7280', lineHeight: '1.5' }}>
                  {item.desc}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <MythOperatorReminderEditor />
      <OperatorMessageTemplateEditor />
      <DriverMessageTemplateEditor />
      </>}

      <style>{`
        @keyframes pulse {
          0%, 100% { box-shadow: 0 0 0 3px #22C55E30; }
          50% { box-shadow: 0 0 0 6px #22C55E10; }
        }
      `}</style>
    </div>
  );
}
