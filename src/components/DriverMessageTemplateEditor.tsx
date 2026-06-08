import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';

const TEMPLATE_KEY = 'driver_schedule_template';

const TAGS: { tag: string; description: string }[] = [
  { tag: '{{shoot_index}}',     description: 'Номер съёмки (1, 2, 3...)' },
  { tag: '{{client_name}}',     description: 'Имя клиента' },
  { tag: '{{client_phone}}',    description: 'Телефон клиента' },
  { tag: '{{shoot_location}}',  description: 'Локация съёмки' },
  { tag: '{{departure_time}}',  description: 'Время выезда (за 1ч до начала)' },
  { tag: '{{shoot_time}}',      description: 'Время съёмки (начало – конец)' },
  { tag: '{{task_description}}', description: 'Описание задачи / услуги' },
  { tag: '{{scripts_notes}}',   description: 'Скрипты и заметки' },
  { tag: '{{operator_name}}',   description: 'Имя оператора' },
  { tag: '{{operator_phone}}',  description: 'WhatsApp оператора' },
  { tag: '{{pickup_location}}', description: 'Точка сбора оператора' },
];

const DEFAULT_TEMPLATE = `--- СЪЕМКА {{shoot_index}} ---
👤 Клиент: {{client_name}}
📱 Телефон: {{client_phone}}
📍 Локация: {{shoot_location}}
🚗 Время выезда: {{departure_time}} (за 1 час до начала)
🎥 Время съемки: {{shoot_time}}
💼 Услуга: {{task_description}}
📋 Заметки: {{scripts_notes}}

📸 Оператор: {{operator_name}}
📲 WhatsApp оператора: {{operator_phone}}
🗺 Точка сбора оператора: {{pickup_location}}`;

export default function DriverMessageTemplateEditor() {
  const [template, setTemplate] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from('message_templates')
        .select('value')
        .eq('key', TEMPLATE_KEY)
        .maybeSingle();
      setTemplate(data?.value ?? DEFAULT_TEMPLATE);
      setLoading(false);
    };
    fetch();
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

  const handleReset = () => {
    if (window.confirm('Reset to default template? Your current template will be lost.')) {
      setTemplate(DEFAULT_TEMPLATE);
    }
  };

  return (
    <div style={{
      background: '#131929',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 16,
      padding: '24px',
      marginTop: 24,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <div style={{ fontWeight: 800, color: '#f1f5f9', fontSize: '1rem', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            Шаблон сообщения водителю
          </div>
          <div style={{ fontSize: '0.75rem', color: '#4b5563' }}>
            Используется при ежедневной рассылке расписания водителю и операторам.
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={handleReset}
            style={{
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 8, padding: '7px 14px', color: '#6b7280',
              fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer',
            }}
          >
            Сбросить
          </button>
          <button
            onClick={handleSave}
            disabled={saving || loading}
            style={{
              background: saved ? 'rgba(0,196,140,0.15)' : 'linear-gradient(135deg, #0e7c4a, #0a6038)',
              border: saved ? '1px solid rgba(0,196,140,0.4)' : '1px solid rgba(0,196,140,0.3)',
              borderRadius: 8, padding: '7px 18px',
              color: saved ? '#00C48C' : '#fff',
              fontSize: '0.85rem', fontWeight: 700,
              cursor: saving || loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
            }}
          >
            {saving ? 'Сохранение...' : saved ? 'Сохранено!' : 'Сохранить шаблон'}
          </button>
        </div>
      </div>

      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: '0.7rem', color: '#4b5563', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>
          Доступные теги — нажмите для вставки
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {TAGS.map(t => (
            <button
              key={t.tag}
              onClick={() => insertTag(t.tag)}
              title={t.description}
              style={{
                background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.25)',
                borderRadius: 6, padding: '4px 10px',
                color: '#93c5fd', fontSize: '0.75rem', fontWeight: 700,
                cursor: 'pointer', fontFamily: 'monospace',
                transition: 'background 0.12s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(59,130,246,0.22)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'rgba(59,130,246,0.1)')}
            >
              {t.tag}
            </button>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: 6, fontSize: '0.7rem', color: '#4b5563', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
        Шаблон (один блок = одна съёмка)
      </div>
      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#4b5563', fontSize: '0.875rem' }}>Загрузка...</div>
      ) : (
        <textarea
          ref={textareaRef}
          value={template}
          onChange={e => setTemplate(e.target.value)}
          rows={16}
          style={{
            width: '100%', boxSizing: 'border-box',
            background: '#0f1420',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 10, padding: '12px 14px',
            color: '#e5e7eb', fontSize: '0.85rem',
            fontFamily: 'monospace', lineHeight: 1.6,
            resize: 'vertical', outline: 'none',
          }}
          spellCheck={false}
        />
      )}

      <div style={{
        marginTop: 14, padding: '12px 14px',
        background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.15)',
        borderRadius: 10,
      }}>
        <div style={{ fontSize: '0.72rem', color: '#93c5fd', fontWeight: 700, marginBottom: 6 }}>
          Как работает шаблон
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '4px 16px' }}>
          {TAGS.map(t => (
            <div key={t.tag} style={{ fontSize: '0.72rem', color: '#4b5563', display: 'flex', gap: 6 }}>
              <span style={{ color: '#93c5fd', fontFamily: 'monospace', flexShrink: 0 }}>{t.tag}</span>
              <span>— {t.description}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
