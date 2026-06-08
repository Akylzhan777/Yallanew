import { useEffect, useState } from 'react';
import { MessageSquare, Send, FileText, Loader2, Check, AlertCircle, Users, Settings, Bug } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAppSettings } from '../../context/AppSettingsContext';

type Tab = 'settings' | 'templates' | 'broadcast';

interface Template {
  id: string;
  key: string;
  body_en: string;
  body_ru: string;
  body_ar: string;
}

interface BroadcastRow {
  id: string;
  body: string;
  segment: string;
  sent_count: number;
  failed_count: number;
  created_at: string;
}

const SEGMENTS: Array<{ value: string; label: string }> = [
  { value: 'all', label: 'All users' },
  { value: 'blogger', label: 'Bloggers / Influencers' },
  { value: 'ugc', label: 'UGC creators' },
  { value: 'model', label: 'Models' },
  { value: 'videographer', label: 'Videographers' },
  { value: 'photographer', label: 'Photographers' },
  { value: 'editor', label: 'Video editors' },
];

export default function WhatsAppPanel() {
  const [tab, setTab] = useState<Tab>('settings');

  return (
    <div style={{ padding: '2rem', maxWidth: 880 }}>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem', color: '#fff', display: 'flex', alignItems: 'center', gap: 10 }}>
        <MessageSquare size={20} style={{ color: '#25D366' }} /> WhatsApp Marketing
      </h2>
      <p style={{ color: '#64748b', fontSize: 13, marginBottom: '1.5rem' }}>
        Manage Green API credentials, automated welcome templates, and bulk broadcasts.
      </p>

      <div style={{ display: 'flex', gap: 8, marginBottom: 24, borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <TabBtn active={tab === 'settings'} onClick={() => setTab('settings')} icon={<Settings size={14} />}>Green API</TabBtn>
        <TabBtn active={tab === 'templates'} onClick={() => setTab('templates')} icon={<FileText size={14} />}>Templates</TabBtn>
        <TabBtn active={tab === 'broadcast'} onClick={() => setTab('broadcast')} icon={<Send size={14} />}>Broadcast</TabBtn>
      </div>

      {tab === 'settings' && <GreenApiSettingsTab />}
      {tab === 'templates' && <TemplatesTab />}
      {tab === 'broadcast' && <BroadcastTab />}
    </div>
  );
}

function TabBtn({ active, onClick, icon, children }: { active: boolean; onClick: () => void; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '10px 16px',
        background: 'transparent',
        border: 'none',
        borderBottom: active ? '2px solid #25D366' : '2px solid transparent',
        color: active ? '#fff' : '#64748b',
        fontSize: 14,
        fontWeight: 600,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        marginBottom: -1,
      }}
    >
      {icon}{children}
    </button>
  );
}

function TemplatesTab() {
  const [tpl, setTpl] = useState<Template | null>(null);
  const [bodyEn, setBodyEn] = useState('');
  const [bodyRu, setBodyRu] = useState('');
  const [bodyAr, setBodyAr] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('whatsapp_templates')
        .select('*')
        .eq('key', 'welcome')
        .maybeSingle();
      if (data) {
        setTpl(data);
        setBodyEn(data.body_en || '');
        setBodyRu(data.body_ru || '');
        setBodyAr(data.body_ar || '');
      }
      setLoading(false);
    })();
  }, []);

  const save = async () => {
    setSaving(true);
    setMsg(null);
    const payload = {
      key: 'welcome',
      body_en: bodyEn,
      body_ru: bodyRu,
      body_ar: bodyAr,
      updated_at: new Date().toISOString(),
    };
    const { error } = tpl
      ? await supabase.from('whatsapp_templates').update(payload).eq('id', tpl.id)
      : await supabase.from('whatsapp_templates').insert(payload);
    if (error) {
      setMsg({ kind: 'err', text: error.message });
    } else {
      setMsg({ kind: 'ok', text: 'Template saved.' });
      setTimeout(() => setMsg(null), 3000);
    }
    setSaving(false);
  };

  if (loading) return <Loader2 size={18} className="animate-spin" style={{ color: '#64748b' }} />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <Note>
        Welcome message sent automatically when a user publishes their profile. Use <code style={{ background: 'rgba(255,255,255,0.06)', padding: '1px 6px', borderRadius: 4 }}>{'{{name}}'}</code> as a placeholder for the user&apos;s display name.
      </Note>

      <LangField label="English" value={bodyEn} onChange={setBodyEn} dir="ltr" />
      <LangField label="Русский" value={bodyRu} onChange={setBodyRu} dir="ltr" />
      <LangField label="العربية" value={bodyAr} onChange={setBodyAr} dir="rtl" />

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={save} disabled={saving} style={primaryBtn(saving)}>
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
          Save templates
        </button>
        {msg && (
          <span style={{ fontSize: 13, color: msg.kind === 'ok' ? '#22c55e' : '#ef4444', display: 'flex', alignItems: 'center', gap: 6 }}>
            {msg.kind === 'ok' ? <Check size={13} /> : <AlertCircle size={13} />}{msg.text}
          </span>
        )}
      </div>
    </div>
  );
}

function BroadcastTab() {
  const [body, setBody] = useState('');
  const [segment, setSegment] = useState('all');
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [history, setHistory] = useState<BroadcastRow[]>([]);
  const [recipientCount, setRecipientCount] = useState<number | null>(null);

  const loadHistory = async () => {
    const { data } = await supabase
      .from('whatsapp_broadcasts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(15);
    setHistory(data ?? []);
  };

  useEffect(() => { loadHistory(); }, []);

  useEffect(() => {
    (async () => {
      let q = supabase.from('creator_profiles').select('id', { count: 'exact', head: true }).not('whatsapp_number', 'is', null);
      if (segment !== 'all') q = q.eq('creator_type', segment);
      const { count } = await q;
      setRecipientCount(count ?? 0);
    })();
  }, [segment]);

  const send = async () => {
    if (!body.trim()) {
      setMsg({ kind: 'err', text: 'Message body is required.' });
      return;
    }
    setSending(true);
    setMsg(null);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/whatsapp-broadcast`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ body, segment }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Broadcast failed');
      setMsg({ kind: 'ok', text: `Broadcast queued. Sent: ${json.sent_count}. Failed: ${json.failed_count}.` });
      setBody('');
      await loadHistory();
    } catch (e) {
      setMsg({ kind: 'err', text: e instanceof Error ? e.message : 'Error' });
    }
    setSending(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <Note>Send a one-off WhatsApp message to a segment of creators. Only users with a saved WhatsApp number receive messages.</Note>

      <div>
        <label style={labelCss}>Audience segment</label>
        <select value={segment} onChange={e => setSegment(e.target.value)} style={inputCss}>
          {SEGMENTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        {recipientCount !== null && (
          <p style={{ marginTop: 6, fontSize: 12, color: '#64748b', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Users size={12} /> {recipientCount} recipient{recipientCount === 1 ? '' : 's'} with WhatsApp number
          </p>
        )}
      </div>

      <div>
        <label style={labelCss}>Message body</label>
        <textarea
          value={body}
          onChange={e => setBody(e.target.value)}
          rows={6}
          placeholder="Hi! We just launched a new tool you'll love..."
          style={{ ...inputCss, resize: 'vertical', fontFamily: 'inherit' }}
        />
        <p style={{ marginTop: 6, fontSize: 12, color: '#64748b' }}>{body.length} chars</p>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={send} disabled={sending || !body.trim()} style={primaryBtn(sending || !body.trim())}>
          {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
          Send broadcast
        </button>
        {msg && (
          <span style={{ fontSize: 13, color: msg.kind === 'ok' ? '#22c55e' : '#ef4444', display: 'flex', alignItems: 'center', gap: 6 }}>
            {msg.kind === 'ok' ? <Check size={13} /> : <AlertCircle size={13} />}{msg.text}
          </span>
        )}
      </div>

      {history.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <h3 style={{ fontSize: 13, fontWeight: 700, color: '#94a3b8', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Recent broadcasts
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {history.map(h => (
              <div key={h.id} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                  <span style={{ fontSize: 11, color: '#64748b' }}>{new Date(h.created_at).toLocaleString()}</span>
                  <span style={{ fontSize: 11, color: '#94a3b8', textTransform: 'capitalize' }}>{h.segment}</span>
                </div>
                <p style={{ fontSize: 13, color: '#cbd5e1', marginBottom: 6, whiteSpace: 'pre-wrap' }}>{h.body}</p>
                <div style={{ display: 'flex', gap: 14, fontSize: 11 }}>
                  <span style={{ color: '#22c55e' }}>Sent: {h.sent_count}</span>
                  <span style={{ color: '#ef4444' }}>Failed: {h.failed_count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function LangField({ label, value, onChange, dir }: { label: string; value: string; onChange: (v: string) => void; dir: 'ltr' | 'rtl' }) {
  return (
    <div>
      <label style={labelCss}>{label}</label>
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        rows={4}
        dir={dir}
        style={{ ...inputCss, resize: 'vertical', fontFamily: 'inherit' }}
      />
    </div>
  );
}

function Note({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: 'rgba(37,211,102,0.06)', border: '1px solid rgba(37,211,102,0.2)', borderRadius: 10, padding: '10px 14px', color: '#7dd3a3', fontSize: 13 }}>
      {children}
    </div>
  );
}

function GreenApiSettingsTab() {
  const { settings, refresh } = useAppSettings();
  const [baseUrl, setBaseUrl] = useState('');
  const [idInstance, setIdInstance] = useState('');
  const [tokenInstance, setTokenInstance] = useState('');
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  // Test message state
  const [testPhone, setTestPhone] = useState('');
  const [sendingTest, setSendingTest] = useState(false);
  const [testResult, setTestResult] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    setBaseUrl(settings.green_api_base_url || '');
    setIdInstance(settings.green_api_id_instance || '');
    setTokenInstance(settings.green_api_token_instance || '');
  }, [settings]);

  const save = async () => {
    setSaving(true);
    setMsg(null);
    const { error } = await supabase
      .from('app_settings')
      .update({
        green_api_base_url: baseUrl.trim(),
        green_api_id_instance: idInstance.trim(),
        green_api_token_instance: tokenInstance.trim(),
      })
      .eq('id', 1);
    if (error) {
      setMsg({ kind: 'err', text: error.message });
    } else {
      await refresh();
      setMsg({ kind: 'ok', text: 'Saved.' });
      setTimeout(() => setMsg(null), 3000);
    }
    setSaving(false);
  };

  const testConnection = async () => {
    setTesting(true);
    setMsg(null);
    try {
      const url = `${baseUrl.trim()}/waInstance${idInstance.trim()}/getStateInstance/${tokenInstance.trim()}`;
      const res = await fetch(url);
      const json = await res.json();
      const state = json?.stateInstance ?? JSON.stringify(json);
      setMsg({ kind: res.ok ? 'ok' : 'err', text: `Green API: ${state} (HTTP ${res.status})` });
    } catch (e) {
      setMsg({ kind: 'err', text: e instanceof Error ? e.message : 'Network error' });
    }
    setTesting(false);
  };

  const sendTestMessage = async () => {
    if (!testPhone.trim()) return;
    setSendingTest(true);
    setTestResult(null);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token ?? import.meta.env.VITE_SUPABASE_ANON_KEY;
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/whatsapp-welcome`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ phone: testPhone.trim(), name: 'Test User', language: 'en' }),
      });
      const json = await res.json();
      setTestResult({ http_status: res.status, ...json });
    } catch (e) {
      setTestResult({ error: e instanceof Error ? e.message : 'Network error' });
    }
    setSendingTest(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <Note>
        Find your credentials in the Green API dashboard. The API URL is instance-specific — copy it exactly from your account (e.g. <code style={{ background: 'rgba(255,255,255,0.06)', padding: '1px 6px', borderRadius: 4 }}>https://7103.api.greenapi.com</code>).
      </Note>

      <div>
        <label style={labelCss}>API Base URL</label>
        <input
          value={baseUrl}
          onChange={e => setBaseUrl(e.target.value)}
          placeholder="https://7103.api.greenapi.com"
          style={inputCss}
        />
      </div>
      <div className="grid grid-cols-2 gap-4" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div>
          <label style={labelCss}>ID Instance</label>
          <input value={idInstance} onChange={e => setIdInstance(e.target.value)} placeholder="7103531904" style={inputCss} />
        </div>
        <div>
          <label style={labelCss}>API Token</label>
          <input value={tokenInstance} onChange={e => setTokenInstance(e.target.value)} placeholder="ac1e23..." style={{ ...inputCss, fontFamily: 'monospace', fontSize: 12 }} />
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <button onClick={save} disabled={saving} style={primaryBtn(saving)}>
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
          Save credentials
        </button>
        <button onClick={testConnection} disabled={testing || !baseUrl || !idInstance || !tokenInstance}
          style={{ ...primaryBtn(testing || !baseUrl || !idInstance || !tokenInstance), background: testing ? 'rgba(59,130,246,0.3)' : '#3b82f6', color: '#fff' }}>
          {testing ? <Loader2 size={14} className="animate-spin" /> : <MessageSquare size={14} />}
          Test connection
        </button>
        {msg && (
          <span style={{ fontSize: 13, color: msg.kind === 'ok' ? '#22c55e' : '#ef4444', display: 'flex', alignItems: 'center', gap: 6 }}>
            {msg.kind === 'ok' ? <Check size={13} /> : <AlertCircle size={13} />}{msg.text}
          </span>
        )}
      </div>

      {/* ── Debug: Send Test Message ── */}
      <div style={{ marginTop: 8, padding: 16, background: 'rgba(251,191,36,0.04)', border: '1px solid rgba(251,191,36,0.15)', borderRadius: 12 }}>
        <h3 style={{ fontSize: 13, fontWeight: 700, color: '#fbbf24', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 7, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          <Bug size={14} /> Debug: Send Test Message
        </h3>
        <p style={{ fontSize: 12, color: '#94a3b8', marginBottom: 12 }}>
          Fires a real WhatsApp welcome message through the edge function and shows the full response below — including the URL used, chatId, Green API status and error body.
        </p>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <input
            value={testPhone}
            onChange={e => setTestPhone(e.target.value)}
            placeholder="+971501234567"
            style={{ ...inputCss, flex: 1 }}
          />
          <button
            onClick={sendTestMessage}
            disabled={sendingTest || !testPhone.trim()}
            style={{ ...primaryBtn(sendingTest || !testPhone.trim()), background: sendingTest ? 'rgba(251,191,36,0.3)' : '#d97706', color: '#000', whiteSpace: 'nowrap' }}
          >
            {sendingTest ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            Send test
          </button>
        </div>

        {testResult && (
          <div style={{ marginTop: 12 }}>
            {/* Summary line */}
            <div style={{ display: 'flex', gap: 16, marginBottom: 10, flexWrap: 'wrap' }}>
              <DebugBadge label="HTTP" value={String(testResult.http_status ?? '?')} color={Number(testResult.http_status) < 300 ? '#22c55e' : '#ef4444'} />
              {testResult.log && typeof testResult.log === 'object' && (
                <>
                  <DebugBadge label="chatId" value={String((testResult.log as Record<string,unknown>).chatId ?? '?')} color="#94a3b8" />
                  <DebugBadge label="Green API URL" value={String((testResult.log as Record<string,unknown>).green_api_url ?? '—')} color="#94a3b8" />
                  <DebugBadge label="Green status" value={String((testResult.log as Record<string,unknown>).green_api_status ?? '—')} color={Number((testResult.log as Record<string,unknown>).green_api_status) === 200 ? '#22c55e' : '#ef4444'} />
                </>
              )}
            </div>
            {/* Full JSON */}
            <pre style={{
              background: '#0a0f1a',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 8,
              padding: '10px 12px',
              fontSize: 11,
              color: '#94a3b8',
              overflowX: 'auto',
              maxHeight: 320,
              overflowY: 'auto',
              fontFamily: 'monospace',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all',
            }}>
              {JSON.stringify(testResult, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}

function DebugBadge({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <span style={{ fontSize: 10, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
      <span style={{ fontSize: 12, color, fontFamily: 'monospace', wordBreak: 'break-all' }}>{value}</span>
    </div>
  );
}

const labelCss: React.CSSProperties = { display: 'block', fontSize: 12, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 };
const inputCss: React.CSSProperties = {
  width: '100%',
  padding: '10px 14px',
  background: '#0f1520',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 10,
  color: '#fff',
  fontSize: 14,
  outline: 'none',
};
const primaryBtn = (disabled: boolean): React.CSSProperties => ({
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  padding: '10px 18px',
  background: disabled ? 'rgba(37,211,102,0.3)' : '#25D366',
  color: '#000',
  border: 'none',
  borderRadius: 10,
  fontSize: 14,
  fontWeight: 700,
  cursor: disabled ? 'not-allowed' : 'pointer',
  opacity: disabled ? 0.6 : 1,
});
