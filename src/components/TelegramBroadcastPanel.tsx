import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

interface TelegramGroup {
  id: string;
  name: string;
  chat_id: string;
  created_at: string;
  client_id: string | null;
}

interface CrmClient {
  id: string;
  name: string;
}

interface BroadcastResult {
  name: string;
  chat_id: string;
  ok: boolean;
  error?: string;
}

export default function TelegramBroadcastPanel() {
  const [botToken, setBotToken] = useState('');
  const [messageTemplate, setMessageTemplate] = useState('');
  const [dailyTemplate, setDailyTemplate] = useState('');
  const [hrGroupChatId, setHrGroupChatId] = useState('');
  const [hrWelcomeTemplate, setHrWelcomeTemplate] = useState('');
  const [hrBroadcastTemplate, setHrBroadcastTemplate] = useState('');
  const [weeklyBroadcastText, setWeeklyBroadcastText] = useState('');
  const [dailyAvailabilityText, setDailyAvailabilityText] = useState('');
  const [mythGroupName, setMythGroupName] = useState('REELS PD/MH/ DNA');
  const [mythGroupChatId, setMythGroupChatId] = useState('-1003799481157_1');
  const [mythBroadcastTemplate, setMythBroadcastTemplate] = useState('');
  const [mythSourcesReply, setMythSourcesReply] = useState('');
  const [mythTasksReply, setMythTasksReply] = useState('');
  const [mythMusicReply, setMythMusicReply] = useState('');
  const [savingMyth, setSavingMyth] = useState(false);
  const [testingMyth, setTestingMyth] = useState(false);
  const [mythTestResult, setMythTestResult] = useState<{ ok: boolean; error?: string } | null>(null);
  const [settingWebhook, setSettingWebhook] = useState(false);
  const [webhookResult, setWebhookResult] = useState<{ ok: boolean; url?: string; error?: string } | null>(null);
  const [savingTemplates, setSavingTemplates] = useState(false);
  const [savingHr, setSavingHr] = useState(false);
  const [savingHrBroadcast, setSavingHrBroadcast] = useState(false);
  const [testingHrBroadcast, setTestingHrBroadcast] = useState(false);
  const [hrBroadcastTestResult, setHrBroadcastTestResult] = useState<{ ok: boolean; error?: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [savingDaily, setSavingDaily] = useState(false);
  const [testingDaily, setTestingDaily] = useState(false);
  const [testResultsDaily, setTestResultsDaily] = useState<BroadcastResult[] | null>(null);
  const [testErrorDaily, setTestErrorDaily] = useState('');

  const [groups, setGroups] = useState<TelegramGroup[]>([]);
  const [clients, setClients] = useState<CrmClient[]>([]);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupChatId, setNewGroupChatId] = useState('');
  const [addingGroup, setAddingGroup] = useState(false);
  const [updatingClientId, setUpdatingClientId] = useState<string | null>(null);

  const [testing, setTesting] = useState(false);
  const [testResults, setTestResults] = useState<BroadcastResult[] | null>(null);
  const [testError, setTestError] = useState('');

  const [toast, setToast] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('info');
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [columnMissing, setColumnMissing] = useState(false);

  const showToast = (msg: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast(msg);
    setToastType(type);
    setTimeout(() => setToast(''), 3500);
  };

  const loadSettings = async () => {
    setLoadingSettings(true);
    const [{ data: settings }, grpsResult, { data: cls }] = await Promise.all([
      supabase.from('telegram_settings').select('*').eq('id', '11111111-1111-1111-1111-111111111111').maybeSingle(),
      supabase.from('telegram_groups').select('id, name, chat_id, created_at, last_weekly_message_id, last_daily_message_id, client_id').order('created_at'),
      supabase.from('clients').select('id, name').order('name'),
    ]);
    if (settings) {
      setBotToken(settings.bot_token ?? '');
      setMessageTemplate(settings.message_template ?? '');
      setDailyTemplate(settings.daily_template ?? '');
      setHrGroupChatId(settings.hr_group_chat_id ?? '');
      setHrWelcomeTemplate(settings.hr_welcome_template ?? '');
      setHrBroadcastTemplate(settings.hr_broadcast_template ?? '');
      setWeeklyBroadcastText(settings.weekly_broadcast_text ?? '');
      setDailyAvailabilityText(settings.daily_availability_text ?? '');
      setMythGroupName(settings.myth_group_name ?? 'REELS PD/MH/ DNA');
      setMythGroupChatId(settings.myth_group_chat_id ?? '-1003799481157_1');
      setMythBroadcastTemplate(settings.myth_broadcast_template ?? '');
      setMythSourcesReply(settings.myth_sources_reply ?? '');
      setMythTasksReply(settings.myth_tasks_reply ?? '');
      setMythMusicReply(settings.myth_music_reply ?? '');
    }
    if (grpsResult.error?.message?.includes('client_id')) {
      setColumnMissing(true);
      const { data: grpsBasic } = await supabase.from('telegram_groups').select('id, name, chat_id, created_at').order('created_at');
      setGroups((grpsBasic ?? []).map(g => ({ ...g, client_id: null })));
    } else {
      setColumnMissing(false);
      setGroups(grpsResult.data ?? []);
    }
    setClients(cls ?? []);
    setLoadingSettings(false);
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const saveSettings = async () => {
    setSaving(true);
    const { error } = await supabase
      .from('telegram_settings')
      .update({ bot_token: botToken, message_template: messageTemplate })
      .eq('id', '11111111-1111-1111-1111-111111111111');
    if (error) {
      showToast('Ошибка: ' + error.message, 'error');
    } else {
      showToast('Настройки сохранены', 'success');
      await loadSettings();
    }
    setSaving(false);
  };

  const saveDailyTemplate = async () => {
    setSavingDaily(true);
    const { error } = await supabase
      .from('telegram_settings')
      .update({ daily_template: dailyTemplate })
      .eq('id', '11111111-1111-1111-1111-111111111111');
    if (error) {
      showToast('Ошибка: ' + error.message, 'error');
    } else {
      showToast('Ежедневный шаблон сохранён', 'success');
      await loadSettings();
    }
    setSavingDaily(false);
  };

  const saveHrBroadcastTemplate = async () => {
    setSavingHrBroadcast(true);
    const { error } = await supabase
      .from('telegram_settings')
      .update({ hr_broadcast_template: hrBroadcastTemplate.trim() || null })
      .eq('id', '11111111-1111-1111-1111-111111111111');
    if (error) {
      showToast('Ошибка: ' + error.message, 'error');
    } else {
      showToast('Шаблон рассылки HR сохранён', 'success');
      await loadSettings();
    }
    setSavingHrBroadcast(false);
  };

  const saveBotTemplates = async () => {
    setSavingTemplates(true);
    const { error } = await supabase
      .from('telegram_settings')
      .update({
        weekly_broadcast_text: weeklyBroadcastText.trim() || null,
        daily_availability_text: dailyAvailabilityText.trim() || null,
      })
      .eq('id', '11111111-1111-1111-1111-111111111111');
    if (error) {
      showToast('Ошибка: ' + error.message, 'error');
    } else {
      showToast('Шаблоны сохранены', 'success');
      await loadSettings();
    }
    setSavingTemplates(false);
  };

  const testHrBroadcast = async () => {
    setTestingHrBroadcast(true);
    setHrBroadcastTestResult(null);
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
      const res = await fetch(`${supabaseUrl}/functions/v1/telegram-broadcast?type=hr_broadcast`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseAnonKey}`,
        },
      });
      const json = await res.json();
      if (json.ok) {
        setHrBroadcastTestResult({ ok: true });
        showToast('HR рассылка отправлена успешно', 'success');
      } else {
        setHrBroadcastTestResult({ ok: false, error: json.error ?? 'Неизвестная ошибка' });
        showToast('Ошибка: ' + (json.error ?? 'Неизвестная ошибка'), 'error');
      }
    } catch (e) {
      setHrBroadcastTestResult({ ok: false, error: String(e) });
      showToast('Ошибка сети: ' + String(e), 'error');
    }
    setTestingHrBroadcast(false);
  };

  const saveHrSettings = async () => {
    setSavingHr(true);
    const { error } = await supabase
      .from('telegram_settings')
      .update({ hr_group_chat_id: hrGroupChatId.trim() || null, hr_welcome_template: hrWelcomeTemplate.trim() || null })
      .eq('id', '11111111-1111-1111-1111-111111111111');
    if (error) {
      showToast('Ошибка: ' + error.message, 'error');
    } else {
      showToast('HR настройки сохранены', 'success');
      await loadSettings();
    }
    setSavingHr(false);
  };

  const sendDailyTest = async () => {
    setTestingDaily(true);
    setTestResultsDaily(null);
    setTestErrorDaily('');
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
      const res = await fetch(`${supabaseUrl}/functions/v1/telegram-broadcast`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseAnonKey}`,
        },
        body: JSON.stringify({ type: 'daily' }),
      });
      const json = await res.json();
      if (json.ok) {
        setTestResultsDaily(json.results ?? []);
        showToast(`Ежедневная: отправлено ${json.sent}, ошибок ${json.failed}`, json.failed > 0 ? 'error' : 'success');
      } else {
        setTestErrorDaily(json.error ?? 'Неизвестная ошибка');
        showToast('Ошибка: ' + (json.error ?? 'Неизвестная ошибка'), 'error');
      }
    } catch (e) {
      setTestErrorDaily(String(e));
      showToast('Ошибка сети: ' + String(e), 'error');
    }
    setTestingDaily(false);
  };

  const saveMythSettings = async () => {
    setSavingMyth(true);
    const { error } = await supabase
      .from('telegram_settings')
      .update({
        myth_group_name: mythGroupName.trim() || 'REELS PD/MH/ DNA',
        myth_group_chat_id: mythGroupChatId.trim(),
        myth_broadcast_template: mythBroadcastTemplate,
        myth_sources_reply: mythSourcesReply,
        myth_tasks_reply: mythTasksReply,
        myth_music_reply: mythMusicReply,
      })
      .eq('id', '11111111-1111-1111-1111-111111111111');
    if (error) {
      showToast('Ошибка: ' + error.message, 'error');
    } else {
      showToast('Настройки Myth сохранены', 'success');
      await loadSettings();
    }
    setSavingMyth(false);
  };

  const setMythWebhook = async () => {
    setSettingWebhook(true);
    setWebhookResult(null);
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
      const res = await fetch(`${supabaseUrl}/functions/v1/telegram-broadcast?type=set_webhook`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseAnonKey}`,
        },
      });
      const json = await res.json();
      if (json.ok) {
        setWebhookResult({ ok: true, url: json.webhook_url });
        showToast('Webhook успешно установлен', 'success');
      } else {
        setWebhookResult({ ok: false, error: json.error ?? 'Неизвестная ошибка' });
        showToast('Ошибка: ' + (json.error ?? 'Неизвестная ошибка'), 'error');
      }
    } catch (e) {
      setWebhookResult({ ok: false, error: String(e) });
      showToast('Ошибка сети: ' + String(e), 'error');
    }
    setSettingWebhook(false);
  };

  const testMythBroadcast = async () => {
    setTestingMyth(true);
    setMythTestResult(null);
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
      const res = await fetch(`${supabaseUrl}/functions/v1/telegram-broadcast?type=myth_broadcast`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseAnonKey}`,
        },
      });
      const json = await res.json();
      if (json.ok) {
        setMythTestResult({ ok: true });
        showToast('Сообщение отправлено в Myth', 'success');
      } else {
        setMythTestResult({ ok: false, error: json.error ?? 'Неизвестная ошибка' });
        showToast('Ошибка: ' + (json.error ?? 'Неизвестная ошибка'), 'error');
      }
    } catch (e) {
      setMythTestResult({ ok: false, error: String(e) });
      showToast('Ошибка сети: ' + String(e), 'error');
    }
    setTestingMyth(false);
  };

  const addGroup = async () => {
    if (!newGroupName.trim() || !newGroupChatId.trim()) {
      showToast('Заполните название и Chat ID');
      return;
    }
    setAddingGroup(true);
    const { data, error } = await supabase
      .from('telegram_groups')
      .insert({ name: newGroupName.trim(), chat_id: newGroupChatId.trim() })
      .select()
      .maybeSingle();
    if (error) {
      showToast('Ошибка: ' + error.message, 'error');
    } else {
      if (data) setGroups(prev => [...prev, data]);
      setNewGroupName('');
      setNewGroupChatId('');
      showToast('Группа добавлена', 'success');
    }
    setAddingGroup(false);
  };

  const deleteGroup = async (id: string) => {
    const { error } = await supabase.from('telegram_groups').delete().eq('id', id);
    if (!error) {
      setGroups(prev => prev.filter(g => g.id !== id));
      showToast('Группа удалена', 'success');
    } else {
      showToast('Ошибка удаления: ' + error.message, 'error');
    }
  };

  const assignClient = async (groupId: string, clientId: string | null) => {
    if (columnMissing) {
      showToast('Run the migration SQL first (see yellow banner above)', 'error');
      return;
    }
    setUpdatingClientId(groupId);
    const { error } = await supabase
      .from('telegram_groups')
      .update({ client_id: clientId })
      .eq('id', groupId);
    if (error) {
      showToast('Ошибка: ' + error.message, 'error');
    } else {
      setGroups(prev => prev.map(g => g.id === groupId ? { ...g, client_id: clientId } : g));
      const clientName = clients.find(c => c.id === clientId)?.name;
      showToast(clientId ? `Привязан клиент: ${clientName}` : 'Клиент отвязан', 'success');
    }
    setUpdatingClientId(null);
  };

  const sendTest = async () => {
    setTesting(true);
    setTestResults(null);
    setTestError('');
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
      const res = await fetch(`${supabaseUrl}/functions/v1/telegram-broadcast`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseAnonKey}`,
        },
        body: JSON.stringify({}),
      });
      const json = await res.json();
      if (json.ok) {
        setTestResults(json.results ?? []);
        showToast(`Отправлено: ${json.sent}, ошибок: ${json.failed}`, json.failed > 0 ? 'error' : 'success');
      } else {
        setTestError(json.error ?? 'Неизвестная ошибка');
        showToast('Ошибка: ' + (json.error ?? 'Неизвестная ошибка'), 'error');
      }
    } catch (e) {
      setTestError(String(e));
      showToast('Ошибка сети: ' + String(e), 'error');
    }
    setTesting(false);
  };

  return (
    <div style={{ position: 'relative' }}>
      {toast && (
        <div style={{
          position: 'fixed',
          bottom: 24,
          left: '50%',
          transform: 'translateX(-50%)',
          background: toastType === 'error' ? '#2D1515' : toastType === 'success' ? '#0F2518' : '#1C1E26',
          border: `1px solid ${toastType === 'error' ? '#EF444450' : toastType === 'success' ? '#22C55E50' : '#3C3F4A'}`,
          borderRadius: 10,
          padding: '12px 24px',
          color: toastType === 'error' ? '#F87171' : toastType === 'success' ? '#4ADE80' : '#fff',
          fontSize: '0.875rem',
          fontWeight: 600,
          zIndex: 9999,
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          whiteSpace: 'nowrap',
        }}>
          {toast}
        </div>
      )}

      {columnMissing && (
        <div style={{
          background: 'rgba(234,179,8,0.06)',
          border: '1px solid rgba(234,179,8,0.3)',
          borderRadius: 12,
          padding: '14px 18px',
          marginBottom: 16,
          display: 'flex',
          alignItems: 'flex-start',
          gap: 12,
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#EAB308" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          <div>
            <div style={{ color: '#EAB308', fontWeight: 700, fontSize: '0.875rem', marginBottom: 6 }}>
              Database migration required
            </div>
            <div style={{ color: '#9ca3af', fontSize: '0.8rem', lineHeight: 1.55, marginBottom: 10 }}>
              The <code style={{ background: 'rgba(255,255,255,0.08)', padding: '1px 5px', borderRadius: 4, fontFamily: 'monospace' }}>client_id</code> column is missing from the <code style={{ background: 'rgba(255,255,255,0.08)', padding: '1px 5px', borderRadius: 4, fontFamily: 'monospace' }}>telegram_groups</code> table.
              Run this SQL in the <strong style={{ color: '#e0e0e0' }}>Supabase Dashboard → SQL Editor</strong>:
            </div>
            <pre style={{
              background: '#0d1117',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 8,
              padding: '10px 14px',
              fontSize: '0.78rem',
              color: '#4ADE80',
              fontFamily: 'ui-monospace, monospace',
              margin: 0,
              overflowX: 'auto',
              whiteSpace: 'pre-wrap',
            }}>ALTER TABLE telegram_groups{'\n'}ADD COLUMN IF NOT EXISTS client_id UUID{'\n'}REFERENCES clients(id) ON DELETE SET NULL;</pre>
            <div style={{ color: '#6b7280', fontSize: '0.72rem', marginTop: 8 }}>
              After running the SQL, refresh this page to activate the client linking feature.
            </div>
          </div>
        </div>
      )}

      <div style={{
        background: '#0D1117',
        border: '1px solid #1e3a5f',
        borderRadius: 16,
        overflow: 'hidden',
        marginTop: 28,
      }}>
        <div style={{
          padding: '18px 24px',
          borderBottom: '1px solid #1e3a5f',
          display: 'flex',
          alignItems: 'center',
          gap: 14,
        }}>
          <div style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            background: 'linear-gradient(135deg, #0D47A1 0%, #0277BD 100%)',
            border: '1px solid #1565C0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
              <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
            </svg>
          </div>
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#fff', margin: 0 }}>
              Telegram Рассылка
            </h3>
            <p style={{ fontSize: '0.78rem', color: '#6B7280', margin: '2px 0 0 0' }}>
              Еженедельная рассылка по группам · Каждую пятницу в 10:00 (Dubai Time)
            </p>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{
              width: 7, height: 7, borderRadius: '50%',
              background: '#22C55E',
              boxShadow: '0 0 0 3px #22C55E30',
            }} />
            <span style={{ fontSize: '0.75rem', color: '#22C55E', fontWeight: 600 }}>
              cron: 0 6 * * 5
            </span>
          </div>
        </div>

        {loadingSettings ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
            <div className="admin-spinner" />
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>

            <div style={{ padding: '24px', borderRight: '1px solid #1e2937' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#6B7280', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 16 }}>
                Настройки бота
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: '0.78rem', color: '#9CA3AF', fontWeight: 600, marginBottom: 6 }}>
                  Bot Token
                </label>
                <input
                  type="password"
                  value={botToken}
                  onChange={e => setBotToken(e.target.value)}
                  placeholder="1234567890:ABCdef..."
                  style={{
                    width: '100%',
                    background: '#141620',
                    border: '1px solid #2C2F3A',
                    borderRadius: 8,
                    padding: '9px 12px',
                    color: '#e0e0e0',
                    fontSize: '0.85rem',
                    outline: 'none',
                    boxSizing: 'border-box',
                    fontFamily: 'ui-monospace, monospace',
                  }}
                />
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: '0.78rem', color: '#9CA3AF', fontWeight: 600, marginBottom: 6 }}>
                  Шаблон сообщения
                </label>
                <textarea
                  value={messageTemplate}
                  onChange={e => setMessageTemplate(e.target.value)}
                  placeholder="Привет! Напоминаем о предстоящих съёмках на этой неделе..."
                  rows={6}
                  style={{
                    width: '100%',
                    background: '#141620',
                    border: '1px solid #2C2F3A',
                    borderRadius: 8,
                    padding: '9px 12px',
                    color: '#e0e0e0',
                    fontSize: '0.85rem',
                    outline: 'none',
                    resize: 'vertical',
                    fontFamily: 'inherit',
                    lineHeight: '1.55',
                    boxSizing: 'border-box',
                  }}
                />
                <div style={{ fontSize: '0.7rem', color: '#4B5563', marginTop: 4 }}>
                  Поддерживается HTML-форматирование Telegram: &lt;b&gt;, &lt;i&gt;, &lt;code&gt;
                </div>
              </div>

              <button
                onClick={saveSettings}
                disabled={saving}
                style={{
                  background: saving ? '#1e2937' : '#0D47A1',
                  border: '1px solid #1565C0',
                  borderRadius: 9,
                  color: saving ? '#6B7280' : '#fff',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  padding: '9px 20px',
                  cursor: saving ? 'default' : 'pointer',
                  transition: 'all 0.15s',
                  width: '100%',
                }}
                onMouseEnter={e => { if (!saving) e.currentTarget.style.background = '#1565C0'; }}
                onMouseLeave={e => { if (!saving) e.currentTarget.style.background = '#0D47A1'; }}
              >
                {saving ? 'Сохранение...' : 'Сохранить настройки'}
              </button>
            </div>

            <div style={{ padding: '24px' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#6B7280', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 16 }}>
                Группы получателей
              </div>

              <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                <input
                  value={newGroupName}
                  onChange={e => setNewGroupName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') addGroup(); }}
                  placeholder="Название группы"
                  style={{
                    flex: 1,
                    background: '#141620',
                    border: '1px solid #2C2F3A',
                    borderRadius: 8,
                    padding: '8px 11px',
                    color: '#e0e0e0',
                    fontSize: '0.82rem',
                    outline: 'none',
                  }}
                />
                <input
                  value={newGroupChatId}
                  onChange={e => setNewGroupChatId(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') addGroup(); }}
                  placeholder="Chat ID"
                  style={{
                    width: 130,
                    background: '#141620',
                    border: '1px solid #2C2F3A',
                    borderRadius: 8,
                    padding: '8px 11px',
                    color: '#e0e0e0',
                    fontSize: '0.82rem',
                    outline: 'none',
                    fontFamily: 'ui-monospace, monospace',
                  }}
                />
                <button
                  onClick={addGroup}
                  disabled={addingGroup}
                  style={{
                    background: '#0D47A1',
                    border: '1px solid #1565C0',
                    borderRadius: 8,
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    padding: '8px 14px',
                    cursor: addingGroup ? 'default' : 'pointer',
                    whiteSpace: 'nowrap',
                    transition: 'background 0.15s',
                    opacity: addingGroup ? 0.6 : 1,
                  }}
                  onMouseEnter={e => { if (!addingGroup) e.currentTarget.style.background = '#1565C0'; }}
                  onMouseLeave={e => { if (!addingGroup) e.currentTarget.style.background = '#0D47A1'; }}
                >
                  + Добавить
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minHeight: 80 }}>
                {groups.length === 0 ? (
                  <div style={{
                    border: '1px dashed #2C2F3A',
                    borderRadius: 8,
                    padding: '20px 16px',
                    textAlign: 'center',
                    color: '#4B5563',
                    fontSize: '0.82rem',
                  }}>
                    Нет групп. Добавьте первую группу выше.
                  </div>
                ) : (
                  groups.map(g => {
                    const linkedClient = clients.find(c => c.id === g.client_id);
                    const isUpdating = updatingClientId === g.id;
                    return (
                      <div
                        key={g.id}
                        style={{
                          background: g.client_id ? '#0d1a10' : '#141620',
                          border: g.client_id ? '1px solid #1a3d22' : '1px solid #2C2F3A',
                          borderRadius: 8,
                          padding: '10px 12px',
                          transition: 'border-color 0.12s',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.borderColor = g.client_id ? '#2a5c32' : '#3E414B')}
                        onMouseLeave={e => (e.currentTarget.style.borderColor = g.client_id ? '#1a3d22' : '#2C2F3A')}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                          <div style={{
                            width: 28,
                            height: 28,
                            borderRadius: '50%',
                            background: '#0D47A120',
                            border: '1px solid #1565C040',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}>
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="#1565C0">
                              <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                            </svg>
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#e0e0e0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {g.name}
                            </div>
                            <div style={{ fontSize: '0.72rem', color: '#6B7280', fontFamily: 'ui-monospace, monospace' }}>
                              {g.chat_id}
                            </div>
                          </div>
                          <button
                            onClick={() => deleteGroup(g.id)}
                            style={{
                              background: 'transparent',
                              border: '1px solid #3E414B',
                              borderRadius: 6,
                              color: '#6B7280',
                              fontSize: '0.75rem',
                              padding: '4px 9px',
                              cursor: 'pointer',
                              transition: 'all 0.12s',
                              flexShrink: 0,
                            }}
                            onMouseEnter={e => { e.currentTarget.style.borderColor = '#EF4444'; e.currentTarget.style.color = '#EF4444'; }}
                            onMouseLeave={e => { e.currentTarget.style.borderColor = '#3E414B'; e.currentTarget.style.color = '#6B7280'; }}
                          >
                            Удалить
                          </button>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#4B5563" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                            <circle cx="12" cy="7" r="4"/>
                          </svg>
                          <select
                            value={g.client_id ?? ''}
                            onChange={e => assignClient(g.id, e.target.value || null)}
                            disabled={isUpdating}
                            style={{
                              flex: 1,
                              background: '#0d1117',
                              border: `1px solid ${linkedClient ? '#1a3d22' : '#2C2F3A'}`,
                              borderRadius: 6,
                              padding: '5px 8px',
                              color: linkedClient ? '#4ADE80' : '#6B7280',
                              fontSize: '0.75rem',
                              outline: 'none',
                              cursor: isUpdating ? 'default' : 'pointer',
                              opacity: isUpdating ? 0.6 : 1,
                            }}
                          >
                            <option value="">— Не привязан к клиенту —</option>
                            {clients.map(c => (
                              <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                          </select>
                          {linkedClient && (
                            <span style={{
                              fontSize: '0.65rem',
                              fontWeight: 700,
                              color: '#4ADE80',
                              background: 'rgba(74,222,128,0.08)',
                              border: '1px solid rgba(74,222,128,0.2)',
                              padding: '2px 7px',
                              borderRadius: 4,
                              whiteSpace: 'nowrap',
                              flexShrink: 0,
                            }}>
                              Привязан
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}

        <div style={{
          padding: '20px 24px',
          borderTop: '1px solid #1e2937',
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          flexWrap: 'wrap',
        }}>
          <button
            onClick={sendTest}
            disabled={testing}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: testing ? '#1e2937' : 'linear-gradient(135deg, #0D47A1 0%, #0277BD 100%)',
              border: '1px solid #1565C0',
              borderRadius: 10,
              color: testing ? '#6B7280' : '#fff',
              fontWeight: 700,
              fontSize: '0.9rem',
              padding: '11px 24px',
              cursor: testing ? 'default' : 'pointer',
              transition: 'all 0.15s',
              opacity: testing ? 0.7 : 1,
              boxShadow: testing ? 'none' : '0 4px 16px #0D47A140',
            }}
            onMouseEnter={e => { if (!testing) { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 22px #0D47A160'; } }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = testing ? 'none' : '0 4px 16px #0D47A140'; }}
          >
            {testing ? (
              <>
                <div className="admin-spinner" style={{ width: 15, height: 15 }} />
                Отправка...
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                </svg>
                Отправить тестовое сообщение
              </>
            )}
          </button>

          <div style={{ fontSize: '0.78rem', color: '#4B5563', flex: 1 }}>
            Рассылка отправится во все {groups.length} {groups.length === 1 ? 'группу' : 'групп'} · Следующая автоматическая: пятница 10:00 Dubai (06:00 UTC)
          </div>
        </div>

        {(testResults !== null || testError) && (
          <div style={{
            margin: '0 24px 20px',
            background: '#0D0F14',
            border: `1px solid ${testError ? '#EF444430' : '#22C55E30'}`,
            borderRadius: 10,
            overflow: 'hidden',
          }}>
            <div style={{
              padding: '10px 14px',
              borderBottom: `1px solid ${testError ? '#EF444420' : '#22C55E20'}`,
              fontSize: '0.72rem',
              fontWeight: 700,
              color: testError ? '#EF4444' : '#22C55E',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
            }}>
              {testError ? 'Ошибка отправки' : 'Результаты рассылки'}
            </div>
            {testError ? (
              <div style={{ padding: '12px 14px', fontSize: '0.82rem', color: '#F87171' }}>{testError}</div>
            ) : (
              testResults?.map((r, i) => (
                <div key={i} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '9px 14px',
                  borderBottom: i < (testResults.length - 1) ? '1px solid #1F292740' : 'none',
                }}>
                  <div style={{
                    width: 18, height: 18, borderRadius: '50%',
                    background: r.ok ? '#22C55E20' : '#EF444420',
                    border: `1px solid ${r.ok ? '#22C55E40' : '#EF444440'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: r.ok ? '#22C55E' : '#EF4444' }} />
                  </div>
                  <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#e0e0e0', flex: 1 }}>{r.name}</span>
                  <span style={{ fontSize: '0.72rem', color: '#4B5563', fontFamily: 'ui-monospace, monospace' }}>{r.chat_id}</span>
                  {r.error && (
                    <span style={{ fontSize: '0.72rem', color: '#F87171' }}>{r.error}</span>
                  )}
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: r.ok ? '#22C55E' : '#EF4444' }}>
                    {r.ok ? 'OK' : 'FAIL'}
                  </span>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Daily Broadcast Section */}
      <div style={{
        background: '#0D1117',
        border: '1px solid #1e3a2f',
        borderRadius: 16,
        overflow: 'hidden',
        marginTop: 20,
      }}>
        <div style={{
          padding: '18px 24px',
          borderBottom: '1px solid #1e3a2f',
          display: 'flex',
          alignItems: 'center',
          gap: 14,
        }}>
          <div style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            background: 'linear-gradient(135deg, #064E3B 0%, #065F46 100%)',
            border: '1px solid #047857',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
              <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
            </svg>
          </div>
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#fff', margin: 0 }}>
              Ежедневная рассылка (10:00 AM Dubai/GST)
            </h3>
            <p style={{ fontSize: '0.78rem', color: '#6B7280', margin: '2px 0 0 0' }}>
              Автоматическая рассылка по всем группам · Каждый день в 10:00 AM (Dubai/GST)
            </p>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{
              width: 7, height: 7, borderRadius: '50%',
              background: '#22C55E',
              boxShadow: '0 0 0 3px #22C55E30',
            }} />
            <span style={{ fontSize: '0.75rem', color: '#22C55E', fontWeight: 600 }}>
              cron: 0 6 * * *
            </span>
          </div>
        </div>

        <div style={{ padding: '24px' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#6B7280', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 16 }}>
            Шаблон ежедневного сообщения
          </div>
          <textarea
            value={dailyTemplate}
            onChange={e => setDailyTemplate(e.target.value)}
            placeholder="Доброе утро! Сегодняшние съёмки..."
            rows={6}
            style={{
              width: '100%',
              background: '#141620',
              border: '1px solid #2C2F3A',
              borderRadius: 8,
              padding: '9px 12px',
              color: '#e0e0e0',
              fontSize: '0.85rem',
              outline: 'none',
              resize: 'vertical',
              fontFamily: 'inherit',
              lineHeight: '1.55',
              boxSizing: 'border-box',
              marginBottom: 8,
            }}
          />
          <div style={{ fontSize: '0.7rem', color: '#4B5563', marginBottom: 16 }}>
            Поддерживается HTML-форматирование Telegram: &lt;b&gt;, &lt;i&gt;, &lt;code&gt;
          </div>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <button
              onClick={saveDailyTemplate}
              disabled={savingDaily}
              style={{
                background: savingDaily ? '#1e2937' : '#064E3B',
                border: '1px solid #047857',
                borderRadius: 9,
                color: savingDaily ? '#6B7280' : '#fff',
                fontWeight: 700,
                fontSize: '0.85rem',
                padding: '9px 20px',
                cursor: savingDaily ? 'default' : 'pointer',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => { if (!savingDaily) e.currentTarget.style.background = '#065F46'; }}
              onMouseLeave={e => { if (!savingDaily) e.currentTarget.style.background = '#064E3B'; }}
            >
              {savingDaily ? 'Сохранение...' : 'Сохранить ежедневный шаблон'}
            </button>

            <button
              onClick={sendDailyTest}
              disabled={testingDaily}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                background: testingDaily ? '#1e2937' : 'linear-gradient(135deg, #064E3B 0%, #065F46 100%)',
                border: '1px solid #047857',
                borderRadius: 9,
                color: testingDaily ? '#6B7280' : '#fff',
                fontWeight: 700,
                fontSize: '0.85rem',
                padding: '9px 20px',
                cursor: testingDaily ? 'default' : 'pointer',
                transition: 'all 0.15s',
                opacity: testingDaily ? 0.7 : 1,
                boxShadow: testingDaily ? 'none' : '0 4px 16px #064E3B60',
              }}
              onMouseEnter={e => { if (!testingDaily) { e.currentTarget.style.transform = 'translateY(-1px)'; } }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              {testingDaily ? (
                <>
                  <div className="admin-spinner" style={{ width: 15, height: 15 }} />
                  Отправка...
                </>
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                  </svg>
                  Тест ежедневной рассылки
                </>
              )}
            </button>
          </div>
        </div>

        {(testResultsDaily !== null || testErrorDaily) && (
          <div style={{
            margin: '0 24px 20px',
            background: '#0D0F14',
            border: `1px solid ${testErrorDaily ? '#EF444430' : '#22C55E30'}`,
            borderRadius: 10,
            overflow: 'hidden',
          }}>
            <div style={{
              padding: '10px 14px',
              borderBottom: `1px solid ${testErrorDaily ? '#EF444420' : '#22C55E20'}`,
              fontSize: '0.72rem',
              fontWeight: 700,
              color: testErrorDaily ? '#EF4444' : '#22C55E',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
            }}>
              {testErrorDaily ? 'Ошибка ежедневной рассылки' : 'Результаты ежедневной рассылки'}
            </div>
            {testErrorDaily ? (
              <div style={{ padding: '12px 14px', fontSize: '0.82rem', color: '#F87171' }}>{testErrorDaily}</div>
            ) : (
              testResultsDaily?.map((r, i) => (
                <div key={i} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '9px 14px',
                  borderBottom: i < (testResultsDaily.length - 1) ? '1px solid #1F292740' : 'none',
                }}>
                  <div style={{
                    width: 18, height: 18, borderRadius: '50%',
                    background: r.ok ? '#22C55E20' : '#EF444420',
                    border: `1px solid ${r.ok ? '#22C55E40' : '#EF444440'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: r.ok ? '#22C55E' : '#EF4444' }} />
                  </div>
                  <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#e0e0e0', flex: 1 }}>{r.name}</span>
                  <span style={{ fontSize: '0.72rem', color: '#4B5563', fontFamily: 'ui-monospace, monospace' }}>{r.chat_id}</span>
                  {r.error && <span style={{ fontSize: '0.72rem', color: '#F87171' }}>{r.error}</span>}
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: r.ok ? '#22C55E' : '#EF4444' }}>
                    {r.ok ? 'OK' : 'FAIL'}
                  </span>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      <div style={{
        background: '#0D1117',
        border: '1px solid #1a3a2a',
        borderRadius: 16,
        overflow: 'hidden',
        marginTop: 28,
      }}>
        <div style={{
          padding: '18px 24px',
          background: 'linear-gradient(135deg, #0a1f12 0%, #0d1a10 100%)',
          borderBottom: '1px solid #1a3a2a',
          display: 'flex',
          alignItems: 'center',
          gap: 14,
        }}>
          <div style={{
            width: 38, height: 38, borderRadius: 10,
            background: 'linear-gradient(135deg, #065F46, #047857)',
            border: '1px solid #10B981',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          </div>
          <div>
            <div style={{ color: '#10B981', fontWeight: 700, fontSize: '0.95rem' }}>
              HR Бот (Приветствие новых монтажеров)
            </div>
            <div style={{ color: '#4b7a60', fontSize: '0.75rem', marginTop: 2 }}>
              Автоматическое приветствие новых участников группы YallaJob
            </div>
          </div>
        </div>

        <div style={{ padding: '24px' }}>
          <div style={{
            background: 'rgba(16,185,129,0.04)',
            border: '1px solid rgba(16,185,129,0.15)',
            borderRadius: 10,
            padding: '12px 16px',
            marginBottom: 20,
            display: 'flex',
            alignItems: 'flex-start',
            gap: 10,
          }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <div style={{ color: '#6b9e80', fontSize: '0.78rem', lineHeight: 1.6 }}>
              Когда новый пользователь присоединяется к указанной группе, бот автоматически удаляет предыдущее приветствие и отправляет новое. Используйте <code style={{ background: 'rgba(16,185,129,0.1)', padding: '1px 5px', borderRadius: 4, color: '#10B981' }}>{'{name}'}</code> для вставки имени пользователя.
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div>
              <label style={hrLabelStyle}>Chat ID группы YallaJob</label>
              <input
                value={hrGroupChatId}
                onChange={e => setHrGroupChatId(e.target.value)}
                placeholder="-1001234567890"
                style={hrInputStyle}
              />
              <span style={{ color: '#4b5563', fontSize: '0.72rem', marginTop: 4, display: 'block' }}>
                Отрицательный числовой ID группы (начинается с -100...)
              </span>
            </div>

            <div>
              <label style={hrLabelStyle}>Шаблон приветствия</label>
              <textarea
                value={hrWelcomeTemplate}
                onChange={e => setHrWelcomeTemplate(e.target.value)}
                placeholder={`Добро пожаловать, {name}! 🎬\n\nРады видеть тебя в команде YallaJob.\nЗдесь ты найдёшь задания для монтажёров.\n\nУдачи!`}
                rows={6}
                style={{
                  ...hrInputStyle,
                  resize: 'vertical',
                  fontFamily: 'inherit',
                  lineHeight: '1.55',
                  minHeight: 110,
                }}
              />
              <span style={{ color: '#4b5563', fontSize: '0.72rem', marginTop: 4, display: 'block' }}>
                Используйте <code style={{ background: 'rgba(255,255,255,0.05)', padding: '1px 4px', borderRadius: 3, color: '#10B981' }}>{'{name}'}</code> — будет заменено на имя нового участника
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={saveHrSettings}
                disabled={savingHr}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  background: savingHr ? 'rgba(16,185,129,0.06)' : 'linear-gradient(135deg, #065F46, #047857)',
                  border: '1px solid rgba(16,185,129,0.4)',
                  borderRadius: 10, padding: '10px 22px',
                  color: savingHr ? '#4b7a60' : '#fff',
                  fontWeight: 700, fontSize: '0.875rem',
                  cursor: savingHr ? 'default' : 'pointer',
                  transition: 'all 0.15s',
                  opacity: savingHr ? 0.7 : 1,
                }}
              >
                {savingHr ? (
                  <>
                    <div className="admin-spinner" style={{ width: 14, height: 14 }} />
                    Сохранение...
                  </>
                ) : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                      <polyline points="17 21 17 13 7 13 7 21"/>
                      <polyline points="7 3 7 8 15 8"/>
                    </svg>
                    Сохранить HR настройки
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Divider */}
          <div style={{
            margin: '28px 0 24px',
            borderTop: '1px solid rgba(16,185,129,0.12)',
            position: 'relative',
          }}>
            <span style={{
              position: 'absolute',
              top: -10,
              left: '50%',
              transform: 'translateX(-50%)',
              background: '#0D1117',
              padding: '0 12px',
              fontSize: '0.68rem',
              fontWeight: 700,
              color: '#4b7a60',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              whiteSpace: 'nowrap',
            }}>
              Регулярная рассылка в YallaJob (5 раз в день)
            </span>
          </div>

          <div style={{
            background: 'rgba(16,185,129,0.03)',
            border: '1px solid rgba(16,185,129,0.1)',
            borderRadius: 12,
            padding: '16px',
            marginBottom: 4,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <div style={{
                width: 28, height: 28, borderRadius: 8,
                background: 'rgba(16,185,129,0.1)',
                border: '1px solid rgba(16,185,129,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="12 6 12 12 16 14"/>
                </svg>
              </div>
              <div>
                <div style={{ color: '#10B981', fontWeight: 700, fontSize: '0.82rem' }}>
                  Авто-рассылка 5 раз в день
                </div>
                <div style={{ color: '#4b7a60', fontSize: '0.7rem', marginTop: 1 }}>
                  10:00 · 13:00 · 16:00 · 19:00 · 22:00 (Dubai UTC+4) · cron: 0 6,9,12,15,18 * * *
                </div>
              </div>
              <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#22C55E', boxShadow: '0 0 0 3px #22C55E30' }} />
                <span style={{ fontSize: '0.68rem', color: '#22C55E', fontWeight: 600 }}>активна</span>
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ ...hrLabelStyle, color: '#6b9e80' }}>Текст рассылки</label>
              <textarea
                value={hrBroadcastTemplate}
                onChange={e => setHrBroadcastTemplate(e.target.value)}
                placeholder={`Привет! Новые задания для монтажёров уже доступны.\n\nЗаходите в бот и берите задания! 🎬`}
                rows={5}
                style={{
                  ...hrInputStyle,
                  resize: 'vertical',
                  fontFamily: 'inherit',
                  lineHeight: '1.55',
                  minHeight: 100,
                  marginBottom: 6,
                }}
              />
              <span style={{ color: '#4b5563', fontSize: '0.7rem' }}>
                Поддерживается HTML: &lt;b&gt;, &lt;i&gt;, &lt;code&gt; · Предыдущее сообщение будет удалено автоматически
              </span>
            </div>

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button
                onClick={saveHrBroadcastTemplate}
                disabled={savingHrBroadcast}
                style={{
                  display: 'flex', alignItems: 'center', gap: 7,
                  background: savingHrBroadcast ? 'rgba(16,185,129,0.04)' : 'rgba(16,185,129,0.12)',
                  border: '1px solid rgba(16,185,129,0.3)',
                  borderRadius: 9, padding: '9px 18px',
                  color: savingHrBroadcast ? '#4b7a60' : '#10B981',
                  fontWeight: 700, fontSize: '0.82rem',
                  cursor: savingHrBroadcast ? 'default' : 'pointer',
                  transition: 'all 0.15s',
                  opacity: savingHrBroadcast ? 0.7 : 1,
                }}
                onMouseEnter={e => { if (!savingHrBroadcast) { e.currentTarget.style.background = 'rgba(16,185,129,0.2)'; } }}
                onMouseLeave={e => { if (!savingHrBroadcast) { e.currentTarget.style.background = 'rgba(16,185,129,0.12)'; } }}
              >
                {savingHrBroadcast ? (
                  <>
                    <div className="admin-spinner" style={{ width: 13, height: 13 }} />
                    Сохранение...
                  </>
                ) : (
                  <>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                      <polyline points="17 21 17 13 7 13 7 21"/>
                      <polyline points="7 3 7 8 15 8"/>
                    </svg>
                    Сохранить шаблон рассылки
                  </>
                )}
              </button>

              <button
                onClick={testHrBroadcast}
                disabled={testingHrBroadcast}
                style={{
                  display: 'flex', alignItems: 'center', gap: 7,
                  background: testingHrBroadcast ? 'rgba(16,185,129,0.04)' : 'linear-gradient(135deg, #065F46, #047857)',
                  border: '1px solid rgba(16,185,129,0.4)',
                  borderRadius: 9, padding: '9px 18px',
                  color: testingHrBroadcast ? '#4b7a60' : '#fff',
                  fontWeight: 700, fontSize: '0.82rem',
                  cursor: testingHrBroadcast ? 'default' : 'pointer',
                  transition: 'all 0.15s',
                  opacity: testingHrBroadcast ? 0.7 : 1,
                  boxShadow: testingHrBroadcast ? 'none' : '0 3px 12px #065F4650',
                }}
                onMouseEnter={e => { if (!testingHrBroadcast) { e.currentTarget.style.transform = 'translateY(-1px)'; } }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; }}
              >
                {testingHrBroadcast ? (
                  <>
                    <div className="admin-spinner" style={{ width: 13, height: 13 }} />
                    Отправка...
                  </>
                ) : (
                  <>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                    </svg>
                    Тест HR-рассылки
                  </>
                )}
              </button>
            </div>

            {hrBroadcastTestResult !== null && (
              <div style={{
                marginTop: 12,
                padding: '10px 14px',
                background: hrBroadcastTestResult.ok ? 'rgba(34,197,94,0.06)' : 'rgba(239,68,68,0.06)',
                border: `1px solid ${hrBroadcastTestResult.ok ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)'}`,
                borderRadius: 8,
                fontSize: '0.8rem',
                color: hrBroadcastTestResult.ok ? '#4ADE80' : '#F87171',
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                {hrBroadcastTestResult.ok ? (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4ADE80" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                    Рассылка успешно отправлена в YallaJob
                  </>
                ) : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#F87171" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                    {hrBroadcastTestResult.error}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      {/* Myth Night Club Broadcast */}
      <div style={{
        background: '#0D1117',
        border: '1px solid #3a1424',
        borderRadius: 16,
        overflow: 'hidden',
        marginTop: 28,
      }}>
        <div style={{
          padding: '18px 24px',
          borderBottom: '1px solid #3a1424',
          background: 'linear-gradient(135deg, #1a0812 0%, #0f040a 100%)',
          display: 'flex',
          alignItems: 'center',
          gap: 14,
        }}>
          <div style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            background: 'linear-gradient(135deg, #9F1239 0%, #500724 100%)',
            border: '1px solid #F43F5E',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            fontSize: '1.1rem',
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FECDD3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 18V5l12-2v13"/>
              <circle cx="6" cy="18" r="3"/>
              <circle cx="18" cy="16" r="3"/>
            </svg>
          </div>
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#fff', margin: 0 }}>
              Ночной клуб Myth
            </h3>
            <p style={{ fontSize: '0.78rem', color: '#B87A8A', margin: '2px 0 0 0' }}>
              5 раз в день · 10:00 · 13:00 · 16:00 · 19:00 · 22:00 Dubai · cron: 0 6,9,12,15,18 * * *
            </p>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{
              width: 7, height: 7, borderRadius: '50%',
              background: '#22C55E',
              boxShadow: '0 0 0 3px #22C55E30',
            }} />
            <span style={{ fontSize: '0.75rem', color: '#22C55E', fontWeight: 600 }}>
              активна
            </span>
          </div>
        </div>

        <div style={{ padding: '24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div>
            <label style={mythLabelStyle}>Название группы</label>
            <input
              value={mythGroupName}
              onChange={e => setMythGroupName(e.target.value)}
              placeholder="REELS PD/MH/ DNA"
              style={mythInputStyle}
            />
          </div>
          <div>
            <label style={mythLabelStyle}>Chat ID (группа или группа_тред)</label>
            <input
              value={mythGroupChatId}
              onChange={e => setMythGroupChatId(e.target.value)}
              placeholder="-1003799481157_1"
              style={{ ...mythInputStyle, fontFamily: 'ui-monospace, monospace' }}
            />
            <div style={{ fontSize: '0.7rem', color: '#7A5B63', marginTop: 4 }}>
              Формат: <code style={{ background: 'rgba(244,63,94,0.1)', padding: '1px 5px', borderRadius: 4, color: '#FB7185', fontFamily: 'monospace' }}>-1001234567890</code> или с тредом <code style={{ background: 'rgba(244,63,94,0.1)', padding: '1px 5px', borderRadius: 4, color: '#FB7185', fontFamily: 'monospace' }}>-1001234567890_1</code>
            </div>
          </div>
        </div>

        <div style={{ padding: '0 24px 24px' }}>
          <label style={mythLabelStyle}>Текст рассылки</label>
          <textarea
            value={mythBroadcastTemplate}
            onChange={e => setMythBroadcastTemplate(e.target.value)}
            placeholder={'Задачи на день:\n\n1. Reels на утро\n2. Референсы смотрим в папке\n3. Готовим контент к вечернему запуску'}
            rows={6}
            style={{
              ...mythInputStyle,
              resize: 'vertical',
              fontFamily: 'inherit',
              lineHeight: '1.55',
              minHeight: 120,
            }}
          />
          <div style={{ fontSize: '0.7rem', color: '#7A5B63', marginTop: 6, marginBottom: 16 }}>
            Поддерживается HTML Telegram: &lt;b&gt;, &lt;i&gt;, &lt;code&gt; · Этот текст будет отправлен в указанную группу 5 раз в день по Дубайскому времени
          </div>

          <label style={mythLabelStyle}>
            Ссылки на исходники (автоответ на слово "исходники")
          </label>
          <textarea
            value={mythSourcesReply}
            onChange={e => setMythSourcesReply(e.target.value)}
            placeholder={'https://drive.google.com/...\nhttps://we.tl/...\n\nИсходники за сегодня и раскадровка.'}
            rows={5}
            style={{
              ...mythInputStyle,
              resize: 'vertical',
              fontFamily: 'inherit',
              lineHeight: '1.55',
              minHeight: 100,
            }}
          />
          <div style={{
            marginTop: 8,
            padding: '10px 14px',
            background: 'rgba(244,63,94,0.05)',
            border: '1px solid rgba(244,63,94,0.2)',
            borderRadius: 8,
            display: 'flex',
            alignItems: 'flex-start',
            gap: 8,
            marginBottom: 16,
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FB7185" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <div style={{ fontSize: '0.75rem', color: '#B87A8A', lineHeight: 1.6 }}>
              Когда кто-то в группе напишет сообщение со словом <code style={{ background: 'rgba(244,63,94,0.15)', padding: '1px 6px', borderRadius: 4, color: '#FB7185', fontFamily: 'monospace' }}>исходники</code> (в любом регистре) или выберет команду <code style={{ background: 'rgba(244,63,94,0.15)', padding: '1px 6px', borderRadius: 4, color: '#FB7185', fontFamily: 'monospace' }}>/sources</code> в меню бота, бот отправит этот текст. Для работы требуется настроенный Telegram webhook на эндпоинт <code style={{ background: 'rgba(244,63,94,0.1)', padding: '1px 5px', borderRadius: 4, color: '#FB7185', fontFamily: 'monospace' }}>/functions/v1/telegram-broadcast/webhook</code>.
            </div>
          </div>

          <label style={mythLabelStyle}>
            Задачи на сегодня (автоответ)
          </label>
          <textarea
            value={mythTasksReply}
            onChange={e => setMythTasksReply(e.target.value)}
            placeholder={'Задачи на сегодня:\n\n1. Снять 3 reels\n2. Смонтировать вечерний ролик\n3. Отправить на согласование'}
            rows={5}
            style={{
              ...mythInputStyle,
              resize: 'vertical',
              fontFamily: 'inherit',
              lineHeight: '1.55',
              minHeight: 100,
            }}
          />
          <div style={{ fontSize: '0.7rem', color: '#7A5B63', marginTop: 6, marginBottom: 16 }}>
            Команда меню: <code style={{ background: 'rgba(244,63,94,0.12)', padding: '1px 6px', borderRadius: 4, color: '#FB7185', fontFamily: 'monospace' }}>/tasks</code>
          </div>

          <label style={mythLabelStyle}>
            Музыка и Референсы (автоответ)
          </label>
          <textarea
            value={mythMusicReply}
            onChange={e => setMythMusicReply(e.target.value)}
            placeholder={'Музыка и референсы:\n\nhttps://...\nhttps://...\n\nВайб недели — динамично, цветокор тёплый'}
            rows={5}
            style={{
              ...mythInputStyle,
              resize: 'vertical',
              fontFamily: 'inherit',
              lineHeight: '1.55',
              minHeight: 100,
            }}
          />
          <div style={{ fontSize: '0.7rem', color: '#7A5B63', marginTop: 6, marginBottom: 16 }}>
            Команда меню: <code style={{ background: 'rgba(244,63,94,0.12)', padding: '1px 6px', borderRadius: 4, color: '#FB7185', fontFamily: 'monospace' }}>/music</code>
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button
              onClick={saveMythSettings}
              disabled={savingMyth}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: savingMyth ? 'rgba(244,63,94,0.08)' : 'linear-gradient(135deg, #9F1239 0%, #BE123C 100%)',
                border: '1px solid rgba(244,63,94,0.4)',
                borderRadius: 10, padding: '10px 22px',
                color: savingMyth ? '#7A5B63' : '#fff',
                fontWeight: 700, fontSize: '0.88rem',
                cursor: savingMyth ? 'default' : 'pointer',
                transition: 'all 0.15s',
                opacity: savingMyth ? 0.7 : 1,
                boxShadow: savingMyth ? 'none' : '0 4px 16px rgba(159,18,57,0.4)',
              }}
              onMouseEnter={e => { if (!savingMyth) e.currentTarget.style.transform = 'translateY(-1px)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              {savingMyth ? (
                <>
                  <div className="admin-spinner" style={{ width: 14, height: 14 }} />
                  Сохранение...
                </>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                    <polyline points="17 21 17 13 7 13 7 21"/>
                    <polyline points="7 3 7 8 15 8"/>
                  </svg>
                  Сохранить настройки Myth
                </>
              )}
            </button>

            <button
              onClick={testMythBroadcast}
              disabled={testingMyth}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: 'transparent',
                border: '1px solid rgba(244,63,94,0.5)',
                borderRadius: 10, padding: '10px 22px',
                color: testingMyth ? '#7A5B63' : '#FB7185',
                fontWeight: 700, fontSize: '0.88rem',
                cursor: testingMyth ? 'default' : 'pointer',
                transition: 'all 0.15s',
                opacity: testingMyth ? 0.7 : 1,
              }}
              onMouseEnter={e => { if (!testingMyth) e.currentTarget.style.background = 'rgba(244,63,94,0.08)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
            >
              {testingMyth ? (
                <>
                  <div className="admin-spinner" style={{ width: 14, height: 14 }} />
                  Отправка...
                </>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                  </svg>
                  Тестовая отправка
                </>
              )}
            </button>

            <button
              onClick={setMythWebhook}
              disabled={settingWebhook}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: settingWebhook ? 'rgba(13,71,161,0.08)' : 'linear-gradient(135deg, #0D47A1 0%, #0277BD 100%)',
                border: '1px solid #1565C0',
                borderRadius: 10, padding: '10px 22px',
                color: settingWebhook ? '#7A5B63' : '#fff',
                fontWeight: 700, fontSize: '0.88rem',
                cursor: settingWebhook ? 'default' : 'pointer',
                transition: 'all 0.15s',
                opacity: settingWebhook ? 0.7 : 1,
                boxShadow: settingWebhook ? 'none' : '0 4px 16px rgba(13,71,161,0.35)',
              }}
              onMouseEnter={e => { if (!settingWebhook) e.currentTarget.style.transform = 'translateY(-1px)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              {settingWebhook ? (
                <>
                  <div className="admin-spinner" style={{ width: 14, height: 14 }} />
                  Установка...
                </>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                  </svg>
                  Настроить Webhook Telegram
                </>
              )}
            </button>
          </div>

          {webhookResult !== null && (
            <div style={{
              marginTop: 12,
              padding: '10px 14px',
              background: webhookResult.ok ? 'rgba(34,197,94,0.06)' : 'rgba(239,68,68,0.06)',
              border: `1px solid ${webhookResult.ok ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)'}`,
              borderRadius: 8,
              fontSize: '0.82rem',
              color: webhookResult.ok ? '#4ADE80' : '#F87171',
              display: 'flex', alignItems: 'flex-start', gap: 8,
            }}>
              {webhookResult.ok ? (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4ADE80" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 2 }}>
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, marginBottom: 2 }}>Webhook успешно установлен</div>
                    <div style={{ fontFamily: 'ui-monospace, monospace', fontSize: '0.74rem', color: '#86EFAC', wordBreak: 'break-all' }}>
                      {webhookResult.url}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#F87171" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 2 }}>
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                  {webhookResult.error}
                </>
              )}
            </div>
          )}

          {mythTestResult !== null && (
            <div style={{
              marginTop: 12,
              padding: '10px 14px',
              background: mythTestResult.ok ? 'rgba(34,197,94,0.06)' : 'rgba(239,68,68,0.06)',
              border: `1px solid ${mythTestResult.ok ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)'}`,
              borderRadius: 8,
              fontSize: '0.82rem',
              color: mythTestResult.ok ? '#4ADE80' : '#F87171',
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              {mythTestResult.ok ? (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4ADE80" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                  Сообщение успешно отправлено в {mythGroupName}
                </>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#F87171" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                  {mythTestResult.error}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Message Templates Section */}
      <div style={{
        background: '#0D1117',
        border: '1px solid #1e3050',
        borderRadius: 16,
        overflow: 'hidden',
        marginTop: 28,
      }}>
        <div style={{
          padding: '18px 24px',
          borderBottom: '1px solid #1e3050',
          display: 'flex',
          alignItems: 'center',
          gap: 14,
        }}>
          <div style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            background: 'linear-gradient(135deg, #0c2340 0%, #0e2d55 100%)',
            border: '1px solid #1a4a7a',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            fontSize: '1.1rem',
          }}>
            ✍️
          </div>
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#fff', margin: 0 }}>
              Шаблоны сообщений (Message Templates)
            </h3>
            <p style={{ fontSize: '0.78rem', color: '#6B7280', margin: '2px 0 0 0' }}>
              Управление текстами автоматических рассылок — Еженедельная и Smart Availability
            </p>
          </div>
        </div>

        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div>
            <label style={{
              display: 'block',
              fontSize: '0.72rem',
              fontWeight: 700,
              color: '#0EA5E9',
              letterSpacing: '0.07em',
              textTransform: 'uppercase' as const,
              marginBottom: 8,
            }}>
              Еженедельная рассылка (Weekly Broadcast)
            </label>
            <textarea
              value={weeklyBroadcastText}
              onChange={e => setWeeklyBroadcastText(e.target.value)}
              placeholder={'🌟 Привет! Это ваша еженедельная рассылка от Yalla Influencers.\n\nНовые даты съёмок открыты — бронируйте до конца недели!\n\nhttps://yallainfluencers.com/booking'}
              rows={6}
              style={{
                width: '100%',
                background: '#0c1624',
                border: '1px solid #1a3a5c',
                borderRadius: 10,
                padding: '11px 14px',
                color: '#e5e7eb',
                fontSize: '0.875rem',
                outline: 'none',
                resize: 'vertical',
                fontFamily: 'inherit',
                lineHeight: '1.55',
                boxSizing: 'border-box',
                transition: 'border-color 0.15s',
              }}
              onFocus={e => (e.currentTarget.style.borderColor = '#0EA5E9')}
              onBlur={e => (e.currentTarget.style.borderColor = '#1a3a5c')}
            />
            <div style={{ fontSize: '0.7rem', color: '#4B5563', marginTop: 5 }}>
              Отправляется каждую пятницу в 10:00 Dubai · Поддерживается HTML: &lt;b&gt;, &lt;i&gt;, &lt;code&gt;
            </div>
          </div>

          <div>
            <label style={{
              display: 'block',
              fontSize: '0.72rem',
              fontWeight: 700,
              color: '#0EA5E9',
              letterSpacing: '0.07em',
              textTransform: 'uppercase' as const,
              marginBottom: 8,
            }}>
              Свободные окна на завтра (Daily Availability)
            </label>
            <textarea
              value={dailyAvailabilityText}
              onChange={e => setDailyAvailabilityText(e.target.value)}
              placeholder={'🌙 Добрый вечер! На завтра есть свободные окна для съемки: {slots}. Успейте забронировать, пока время свободно: https://yallainfluencers.com/booking'}
              rows={5}
              style={{
                width: '100%',
                background: '#0c1624',
                border: '1px solid #1a3a5c',
                borderRadius: 10,
                padding: '11px 14px',
                color: '#e5e7eb',
                fontSize: '0.875rem',
                outline: 'none',
                resize: 'vertical',
                fontFamily: 'inherit',
                lineHeight: '1.55',
                boxSizing: 'border-box',
                transition: 'border-color 0.15s',
              }}
              onFocus={e => (e.currentTarget.style.borderColor = '#0EA5E9')}
              onBlur={e => (e.currentTarget.style.borderColor = '#1a3a5c')}
            />
            <div style={{
              marginTop: 8,
              padding: '10px 14px',
              background: 'rgba(14,165,233,0.05)',
              border: '1px solid rgba(14,165,233,0.2)',
              borderRadius: 8,
              display: 'flex',
              alignItems: 'flex-start',
              gap: 8,
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0EA5E9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <div style={{ fontSize: '0.75rem', color: '#6B9AB5', lineHeight: 1.6 }}>
                Обязательно используйте переменную{' '}
                <code style={{ background: 'rgba(14,165,233,0.12)', padding: '1px 6px', borderRadius: 4, color: '#0EA5E9', fontFamily: 'monospace' }}>{'{slots}'}</code>
                {' '}— система автоматически заменит её на список свободных временных слотов (например:{' '}
                <code style={{ background: 'rgba(14,165,233,0.08)', padding: '1px 5px', borderRadius: 4, color: '#7BC8E8', fontFamily: 'monospace' }}>10:00, 15:00, 17:00</code>
                ). Если шаблон пустой, используется стандартный текст.
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={saveBotTemplates}
              disabled={savingTemplates}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 9,
                background: savingTemplates
                  ? 'rgba(14,165,233,0.06)'
                  : 'linear-gradient(135deg, #0369A1 0%, #0284C7 100%)',
                border: '1px solid rgba(14,165,233,0.4)',
                borderRadius: 10,
                padding: '11px 28px',
                color: savingTemplates ? '#4B5563' : '#fff',
                fontWeight: 700,
                fontSize: '0.9rem',
                cursor: savingTemplates ? 'default' : 'pointer',
                transition: 'all 0.15s',
                opacity: savingTemplates ? 0.7 : 1,
                boxShadow: savingTemplates ? 'none' : '0 4px 16px rgba(14,165,233,0.3)',
              }}
              onMouseEnter={e => { if (!savingTemplates) { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 22px rgba(14,165,233,0.45)'; } }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = savingTemplates ? 'none' : '0 4px 16px rgba(14,165,233,0.3)'; }}
            >
              {savingTemplates ? (
                <>
                  <div className="admin-spinner" style={{ width: 15, height: 15 }} />
                  Сохранение...
                </>
              ) : (
                <>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                    <polyline points="17 21 17 13 7 13 7 21"/>
                    <polyline points="7 3 7 8 15 8"/>
                  </svg>
                  Сохранить шаблоны
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const hrLabelStyle: React.CSSProperties = {
  display: 'block',
  color: '#6b9e80',
  fontSize: '0.75rem',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  marginBottom: 6,
};

const hrInputStyle: React.CSSProperties = {
  width: '100%',
  background: '#0a1510',
  border: '1px solid rgba(16,185,129,0.15)',
  borderRadius: 10,
  padding: '11px 14px',
  color: '#e5e7eb',
  fontSize: '0.875rem',
  outline: 'none',
  boxSizing: 'border-box',
  transition: 'border-color 0.15s',
};

const mythLabelStyle: React.CSSProperties = {
  display: 'block',
  color: '#FB7185',
  fontSize: '0.72rem',
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.07em',
  marginBottom: 6,
};

const mythInputStyle: React.CSSProperties = {
  width: '100%',
  background: '#200810',
  border: '1px solid rgba(244,63,94,0.2)',
  borderRadius: 10,
  padding: '11px 14px',
  color: '#e5e7eb',
  fontSize: '0.875rem',
  outline: 'none',
  boxSizing: 'border-box',
  transition: 'border-color 0.15s',
};
