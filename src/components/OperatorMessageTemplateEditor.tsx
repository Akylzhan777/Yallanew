import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';

const TEMPLATE_KEY = 'operator_shoot_template';

const TAGS: { tag: string; description: string }[] = [
  { tag: '{{operator_name}}',   description: 'Имя оператора' },
  { tag: '{{client_name}}',     description: 'Имя клиента' },
  { tag: '{{client_phone}}',    description: 'Телефон клиента' },
  { tag: '{{shoot_date}}',      description: 'Дата съёмки' },
  { tag: '{{shoot_time}}',      description: 'Время съёмки (начало – конец)' },
  { tag: '{{shoot_location}}',  description: 'Локация съёмки' },
  { tag: '{{service_type}}',    description: 'Тип услуги / описание задачи' },
  { tag: '{{pickup_location}}', description: 'Точка сбора оператора' },
];

const DEFAULT_TEMPLATE = `🎥 Привет, {{operator_name}}!

Тебе назначена новая съёмка:
📅 Дата: {{shoot_date}}
⏰ Время: {{shoot_time}}
👤 Клиент: {{client_name}}
📱 Телефон: {{client_phone}}
📍 Локация: {{shoot_location}}
💼 Услуга: {{service_type}}
🗺 Точка сбора: {{pickup_location}}

Проверь расписание и будь готов!`;

export default function OperatorMessageTemplateEditor() {
  const [template, setTemplate] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('message_templates')
        .select('value')
        .eq('key', TEMPLATE_KEY)
        .maybeSingle();
      setTemplate(data?.value ?? DEFAULT_TEMPLATE);
      setLoading(false);
    };
    load();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase
      .from('message_templates')
      .upsert({ key: TEMPLATE_KEY, value: template, updated_at: new Date().toISOString() }, { onConflict: 'key' });
    setSaving(false);
    if (!error) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    }
  };

  const handleReset = () => {
    if (window.confirm('Сбросить шаблон к стандартному? Все изменения будут утеряны.')) {
      setTemplate(DEFAULT_TEMPLATE);
    }
  };

  const insertTag = (tag: string) => {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const next = template.slice(0, start) + tag + template.slice(end);
    setTemplate(next);
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + tag.length, start + tag.length);
    }, 0);
  };

  return (
    <div style={{
      background: '#0f1929',
      border: '1px solid rgba(0,196,140,0.15)',
      borderRadius: 16,
      padding: '24px',
      marginTop: 24,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 5 }}>
            <div style={{
              width: 34, height: 34, borderRadius: 9,
              background: 'rgba(0,196,140,0.12)', border: '1px solid rgba(0,196,140,0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00C48C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
            </div>
            <div>
              <div style={{ fontWeight: 800, color: '#f1f5f9', fontSize: '1rem', lineHeight: 1.2 }}>
                Сообщения Операторам
              </div>
              <div style={{ fontSize: '0.72rem', color: '#374151', marginTop: 2 }}>
                Отправляется при назначении новой съёмки
              </div>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          <button
            onClick={handleReset}
            style={{
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 8, padding: '7px 14px', color: '#4b5563',
              fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = '#9ca3af')}
            onMouseLeave={e => (e.currentTarget.style.color = '#4b5563')}
          >
            Сбросить
          </button>
          <button
            onClick={handleSave}
            disabled={saving || loading}
            style={{
              background: saved ? 'rgba(0,196,140,0.15)' : 'linear-gradient(135deg, #065f46, #047857)',
              border: saved ? '1px solid rgba(0,196,140,0.4)' : '1px solid rgba(0,196,140,0.3)',
              borderRadius: 8, padding: '7px 18px',
              color: saved ? '#00C48C' : '#fff',
              fontSize: '0.85rem', fontWeight: 700,
              cursor: saving || loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
              opacity: saving || loading ? 0.6 : 1,
            }}
          >
            {saving ? 'Сохранение...' : saved ? 'Сохранено!' : 'Сохранить шаблон'}
          </button>
        </div>
      </div>

      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: '0.68rem', color: '#374151', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 7 }}>
          Доступные теги — нажмите для вставки
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {TAGS.map(t => (
            <button
              key={t.tag}
              onClick={() => insertTag(t.tag)}
              title={t.description}
              style={{
                background: 'rgba(0,196,140,0.08)', border: '1px solid rgba(0,196,140,0.2)',
                borderRadius: 6, padding: '4px 10px',
                color: '#6ee7b7', fontSize: '0.74rem', fontWeight: 700,
                cursor: 'pointer', fontFamily: 'monospace',
                transition: 'background 0.12s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,196,140,0.18)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'rgba(0,196,140,0.08)')}
            >
              {t.tag}
            </button>
          ))}
        </div>
      </div>

      <div style={{ fontSize: '0.68rem', color: '#374151', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>
        Шаблон сообщения
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#374151', fontSize: '0.875rem' }}>Загрузка...</div>
      ) : (
        <textarea
          ref={textareaRef}
          value={template}
          onChange={e => setTemplate(e.target.value)}
          rows={14}
          style={{
            width: '100%', boxSizing: 'border-box',
            background: '#090f1a',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 10, padding: '12px 14px',
            color: '#d1fae5', fontSize: '0.85rem',
            fontFamily: 'monospace', lineHeight: 1.65,
            resize: 'vertical', outline: 'none',
          }}
          spellCheck={false}
        />
      )}

      <div style={{
        marginTop: 12, padding: '11px 14px',
        background: 'rgba(0,196,140,0.05)', border: '1px solid rgba(0,196,140,0.12)',
        borderRadius: 10,
      }}>
        <div style={{ fontSize: '0.7rem', color: '#6ee7b7', fontWeight: 700, marginBottom: 5 }}>
          Справка по тегам
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '4px 20px' }}>
          {TAGS.map(t => (
            <div key={t.tag} style={{ fontSize: '0.71rem', color: '#374151', display: 'flex', gap: 6 }}>
              <span style={{ color: '#6ee7b7', fontFamily: 'monospace', flexShrink: 0 }}>{t.tag}</span>
              <span>— {t.description}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
