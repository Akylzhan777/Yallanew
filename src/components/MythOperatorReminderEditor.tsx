import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

interface MythSettings {
  id: string;
  operator_phone: string;
  day_template: string;
  evening_template: string;
  enabled: boolean;
  last_day_sent_date: string | null;
  last_evening_sent_date: string | null;
}

const ACCENT = '#F59E0B';
const BORDER = '#F59E0B30';

export default function MythOperatorReminderEditor() {
  const [settings, setSettings] = useState<MythSettings | null>(null);
  const [phone, setPhone] = useState('');
  const [dayTemplate, setDayTemplate] = useState('');
  const [eveningTemplate, setEveningTemplate] = useState('');
  const [enabled, setEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState<'day' | 'evening' | null>(null);
  const [toast, setToast] = useState<{ msg: string; tone: 'ok' | 'err' } | null>(null);

  const showToast = (msg: string, tone: 'ok' | 'err' = 'ok') => {
    setToast({ msg, tone });
    setTimeout(() => setToast(null), 3200);
  };

  useEffect(() => {
    void load();
  }, []);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('myth_operator_reminders')
      .select('*')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();
    if (error) {
      console.error(error);
      showToast('Ошибка загрузки настроек', 'err');
    } else if (data) {
      setSettings(data);
      setPhone(data.operator_phone ?? '');
      setDayTemplate(data.day_template ?? '');
      setEveningTemplate(data.evening_template ?? '');
      setEnabled(data.enabled ?? true);
    }
    setLoading(false);
  };

  const save = async () => {
    if (!settings) return;
    const cleanedPhone = phone.replace(/[^\d]/g, '');
    if (cleanedPhone && cleanedPhone.length < 8) {
      showToast('Номер слишком короткий', 'err');
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from('myth_operator_reminders')
      .update({
        operator_phone: cleanedPhone,
        day_template: dayTemplate,
        evening_template: eveningTemplate,
        enabled,
        updated_at: new Date().toISOString(),
      })
      .eq('id', settings.id);
    setSaving(false);
    if (error) {
      console.error(error);
      showToast('Не удалось сохранить: ' + error.message, 'err');
    } else {
      showToast('Настройки сохранены');
      void load();
    }
  };

  const sendTest = async (slot: 'day' | 'evening') => {
    const cleanedPhone = phone.replace(/[^\d]/g, '');
    const message = slot === 'day' ? dayTemplate : eveningTemplate;
    if (!cleanedPhone) return showToast('Укажите номер оператора', 'err');
    if (!message.trim()) return showToast('Текст сообщения пустой', 'err');

    setTesting(slot);
    try {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/myth-reminders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ force: true, slot, phone: cleanedPhone, message }),
      });
      const json = await res.json();
      if (json.ok) showToast('Тестовое сообщение отправлено');
      else showToast('Ошибка Green API: ' + (json.error ?? json.reason ?? 'unknown'), 'err');
    } catch (e) {
      showToast('Ошибка сети: ' + String(e), 'err');
    } finally {
      setTesting(null);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: 24, color: '#9CA3AF', fontSize: '0.85rem' }}>
        Загрузка настроек...
      </div>
    );
  }

  return (
    <div
      style={{
        marginTop: 24,
        background: '#F59E0B08',
        border: `1px solid ${BORDER}`,
        borderRadius: 16,
        padding: 24,
      }}
    >
      {toast && (
        <div
          style={{
            position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
            background: toast.tone === 'ok' ? '#0D2818' : '#2A0E0E',
            border: `1px solid ${toast.tone === 'ok' ? '#22C55E50' : '#EF444450'}`,
            color: toast.tone === 'ok' ? '#86EFAC' : '#FCA5A5',
            padding: '10px 18px', borderRadius: 10, fontSize: '0.85rem', fontWeight: 600,
            zIndex: 9999, boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          }}
        >
          {toast.msg}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 44, height: 44, borderRadius: 12,
              background: `${ACCENT}18`, border: `1px solid ${ACCENT}35`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.4rem', flexShrink: 0,
            }}
          >
            🎬
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#fff' }}>
              Напоминания оператору (Myth)
            </h3>
            <div style={{ fontSize: '0.78rem', color: '#9CA3AF', marginTop: 3 }}>
              Четверг и Суббота · 12:00 и 23:00 по Дубаю (Asia/Dubai)
            </div>
          </div>
        </div>

        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={enabled}
            onChange={e => setEnabled(e.target.checked)}
            style={{ width: 16, height: 16, accentColor: ACCENT }}
          />
          <span style={{ fontSize: '0.8rem', color: enabled ? '#86EFAC' : '#6B7280', fontWeight: 600 }}>
            {enabled ? 'Автоотправка включена' : 'Отключено'}
          </span>
        </label>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <label style={fieldLabelStyle}>Номер телефона оператора</label>
          <input
            type="text"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            placeholder="971501234567 (в международном формате, только цифры)"
            style={inputStyle}
          />
          <div style={hintStyle}>
            Формат: код страны + номер, без + и без пробелов. Напр., 971501234567
          </div>
        </div>

        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <label style={{ ...fieldLabelStyle, marginBottom: 0 }}>
              Текст дневного напоминания <span style={{ color: '#6B7280', fontWeight: 500 }}>(12:00 Dubai)</span>
            </label>
            <button onClick={() => sendTest('day')} disabled={testing !== null} style={testBtnStyle(testing === 'day')}>
              {testing === 'day' ? 'Отправка...' : 'Тестовая отправка'}
            </button>
          </div>
          <textarea
            rows={3}
            value={dayTemplate}
            onChange={e => setDayTemplate(e.target.value)}
            placeholder="Короткое сообщение о том, что сегодня съёмка"
            style={textareaStyle}
          />
          {settings?.last_day_sent_date && (
            <div style={hintStyle}>Последняя отправка: {settings.last_day_sent_date}</div>
          )}
        </div>

        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <label style={{ ...fieldLabelStyle, marginBottom: 0 }}>
              Текст вечернего плана <span style={{ color: '#6B7280', fontWeight: 500 }}>(23:00 Dubai)</span>
            </label>
            <button onClick={() => sendTest('evening')} disabled={testing !== null} style={testBtnStyle(testing === 'evening')}>
              {testing === 'evening' ? 'Отправка...' : 'Тестовая отправка'}
            </button>
          </div>
          <textarea
            rows={7}
            value={eveningTemplate}
            onChange={e => setEveningTemplate(e.target.value)}
            placeholder="Подробный план на съёмочный день, референсы, задачи на ночь"
            style={textareaStyle}
          />
          {settings?.last_evening_sent_date && (
            <div style={hintStyle}>Последняя отправка: {settings.last_evening_sent_date}</div>
          )}
        </div>

        <div
          style={{
            marginTop: 4, padding: '12px 14px',
            background: '#0D1117', border: '1px solid #1F2937', borderRadius: 10,
            fontSize: '0.78rem', color: '#9CA3AF', lineHeight: 1.55,
          }}
        >
          <div style={{ fontWeight: 700, color: '#E5E7EB', marginBottom: 4 }}>Как это работает</div>
          Крон запускается каждый час. Edge Function <code style={codeStyle}>myth-reminders</code> проверяет
          день недели (Четверг/Суббота) и час (12 или 23) по Дубаю, затем отправляет сохранённый текст
          на указанный номер через Green API <code style={codeStyle}>sendMessage</code>. Повторных отправок
          за день не бывает (защита по <code style={codeStyle}>last_*_sent_date</code>).
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button
            onClick={save}
            disabled={saving}
            style={{
              padding: '10px 22px',
              background: saving ? '#9A6A07' : ACCENT,
              border: 'none', borderRadius: 10,
              color: '#0A0A0A', fontSize: '0.88rem', fontWeight: 800,
              cursor: saving ? 'not-allowed' : 'pointer',
              letterSpacing: '0.01em',
              boxShadow: saving ? 'none' : '0 4px 18px rgba(245,158,11,0.28)',
              transition: 'all 0.15s',
            }}
          >
            {saving ? 'Сохранение...' : 'Сохранить настройки'}
          </button>
        </div>
      </div>
    </div>
  );
}

const fieldLabelStyle: React.CSSProperties = {
  display: 'block', marginBottom: 6,
  fontSize: '0.72rem', fontWeight: 700,
  color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.07em',
};

const inputStyle: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box',
  padding: '11px 14px',
  background: '#0D1117', border: '1px solid #1F2937',
  borderRadius: 10, color: '#E5E7EB',
  fontSize: '0.9rem', outline: 'none',
  fontFamily: 'ui-monospace, SFMono-Regular, monospace',
};

const textareaStyle: React.CSSProperties = {
  ...inputStyle,
  resize: 'vertical',
  lineHeight: 1.55,
  fontFamily: 'inherit',
};

const hintStyle: React.CSSProperties = {
  marginTop: 6, fontSize: '0.72rem', color: '#6B7280',
};

const codeStyle: React.CSSProperties = {
  background: '#1F2937', padding: '1px 6px', borderRadius: 4,
  fontSize: '0.72rem', color: '#FBBF24',
};

function testBtnStyle(active: boolean): React.CSSProperties {
  return {
    padding: '5px 10px',
    background: active ? '#1F2937' : 'transparent',
    border: `1px solid ${BORDER}`,
    borderRadius: 6, color: ACCENT,
    fontSize: '0.72rem', fontWeight: 600,
    cursor: active ? 'not-allowed' : 'pointer',
    transition: 'all 0.15s',
  };
}
