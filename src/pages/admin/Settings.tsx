import { useEffect, useRef, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAppSettings } from '../../context/AppSettingsContext';

export default function AdminSettings() {
  const { settings, refresh } = useAppSettings();

  const [appName, setAppName] = useState('');
  const [adminPanelTitle, setAdminPanelTitle] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [faviconUrl, setFaviconUrl] = useState('');

  const [markupPct, setMarkupPct] = useState('20');
  const [markupSaving, setMarkupSaving] = useState(false);
  const [markupMsg, setMarkupMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [faviconUploading, setFaviconUploading] = useState(false);

  const logoInputRef = useRef<HTMLInputElement>(null);
  const faviconInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setAppName(settings.app_name);
    setAdminPanelTitle(settings.admin_panel_title);
    setLogoUrl(settings.logo_url);
    setFaviconUrl(settings.favicon_url);
  }, [settings]);

  useEffect(() => {
    supabase.from('platform_settings').select('markup_percentage').eq('id', 1).maybeSingle().then(({ data }) => {
      if (data) setMarkupPct(String(data.markup_percentage));
    });
  }, []);

  const uploadFile = async (
    file: File,
    folder: 'logos' | 'favicons',
    onUrl: (url: string) => void,
    setUploading: (v: boolean) => void,
  ) => {
    setUploading(true);
    const ext = file.name.split('.').pop();
    const path = `${folder}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('brand_assets').upload(path, file, { upsert: true });
    if (error) {
      setMsg({ type: 'err', text: `Upload error: ${error.message}` });
      setUploading(false);
      return;
    }
    const { data } = supabase.storage.from('brand_assets').getPublicUrl(path);
    onUrl(data.publicUrl);
    setUploading(false);
  };

  const handleSaveMarkup = async () => {
    const val = parseFloat(markupPct);
    if (isNaN(val) || val < 0 || val > 100) {
      setMarkupMsg({ type: 'err', text: 'Введите число от 0 до 100' });
      return;
    }
    setMarkupSaving(true);
    setMarkupMsg(null);
    const { error } = await supabase
      .from('platform_settings')
      .update({ markup_percentage: val, updated_at: new Date().toISOString() })
      .eq('id', 1);
    if (error) {
      setMarkupMsg({ type: 'err', text: error.message });
    } else {
      setMarkupMsg({ type: 'ok', text: 'Сохранено!' });
      setTimeout(() => setMarkupMsg(null), 3000);
    }
    setMarkupSaving(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setMsg(null);
    const { error } = await supabase
      .from('app_settings')
      .update({
        app_name: appName.trim() || 'Yalla Influence',
        admin_panel_title: adminPanelTitle.trim() || 'Admin Panel',
        logo_url: logoUrl.trim(),
        favicon_url: faviconUrl.trim(),
      })
      .eq('id', 1);
    if (error) {
      setMsg({ type: 'err', text: error.message });
    } else {
      await refresh();
      setMsg({ type: 'ok', text: 'Настройки сохранены!' });
      setTimeout(() => setMsg(null), 3000);
    }
    setSaving(false);
  };

  return (
    <div style={{ maxWidth: 640, padding: '2rem' }}>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '2rem', color: '#fff' }}>
        ⚙️ Настройки платформы
      </h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

        <Field label="Название приложения (App Name)">
          <input
            className="admin-input"
            value={appName}
            onChange={e => setAppName(e.target.value)}
            placeholder="Yalla Influence"
          />
        </Field>

        <Field label="Заголовок Админ-панели">
          <input
            className="admin-input"
            value={adminPanelTitle}
            onChange={e => setAdminPanelTitle(e.target.value)}
            placeholder="Admin Panel"
          />
        </Field>

        <Field label="Логотип (Logo URL)">
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <input
              className="admin-input"
              value={logoUrl}
              onChange={e => setLogoUrl(e.target.value)}
              placeholder="https://..."
              style={{ flex: 1 }}
            />
            <button
              className="admin-btn-secondary"
              onClick={() => logoInputRef.current?.click()}
              disabled={logoUploading}
            >
              {logoUploading ? '...' : '📁 Загрузить'}
            </button>
            <input
              ref={logoInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={e => {
                const f = e.target.files?.[0];
                if (f) uploadFile(f, 'logos', setLogoUrl, setLogoUploading);
                e.target.value = '';
              }}
            />
          </div>
          {logoUrl && (
            <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <img
                src={logoUrl}
                alt="Logo preview"
                style={{ height: 48, width: 48, objectFit: 'contain', borderRadius: 8, background: '#1a1a2e', border: '1px solid #2d2d44' }}
              />
              <span style={{ fontSize: '0.75rem', color: '#aaa' }}>Предпросмотр</span>
            </div>
          )}
        </Field>

        <Field label="Фавикон (Favicon URL)">
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <input
              className="admin-input"
              value={faviconUrl}
              onChange={e => setFaviconUrl(e.target.value)}
              placeholder="https://..."
              style={{ flex: 1 }}
            />
            <button
              className="admin-btn-secondary"
              onClick={() => faviconInputRef.current?.click()}
              disabled={faviconUploading}
            >
              {faviconUploading ? '...' : '📁 Загрузить'}
            </button>
            <input
              ref={faviconInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={e => {
                const f = e.target.files?.[0];
                if (f) uploadFile(f, 'favicons', setFaviconUrl, setFaviconUploading);
                e.target.value = '';
              }}
            />
          </div>
          {faviconUrl && (
            <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <img
                src={faviconUrl}
                alt="Favicon preview"
                style={{ height: 32, width: 32, objectFit: 'contain', borderRadius: 4, background: '#1a1a2e', border: '1px solid #2d2d44' }}
              />
              <span style={{ fontSize: '0.75rem', color: '#aaa' }}>Предпросмотр</span>
            </div>
          )}
        </Field>

        <div style={{ borderTop: '1px solid #2d2d44', paddingTop: '1.5rem', marginTop: '0.5rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#fff', marginBottom: '1rem' }}>
            Global Settings — Platform Markup
          </h3>
          <Field label="Platform Markup % (комиссия платформы)">
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <input
                className="admin-input"
                type="number"
                min={0}
                max={100}
                step={1}
                value={markupPct}
                onChange={e => setMarkupPct(e.target.value)}
                placeholder="20"
                style={{ maxWidth: 120 }}
              />
              <button
                className="admin-btn-primary"
                onClick={handleSaveMarkup}
                disabled={markupSaving}
              >
                {markupSaving ? 'Сохранение...' : '💾 Сохранить'}
              </button>
              {markupMsg && (
                <span style={{ fontSize: '0.875rem', color: markupMsg.type === 'ok' ? '#00C48C' : '#ef4444' }}>
                  {markupMsg.text}
                </span>
              )}
            </div>
            <p style={{ fontSize: '0.75rem', color: '#666', marginTop: '0.4rem' }}>
              Процент, который платформа добавляет поверх цены создателя. Например, при 20% создатель получает 1000 AED, клиент платит 1200 AED.
            </p>
          </Field>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', paddingTop: '0.5rem' }}>
          <button
            className="admin-btn-primary"
            onClick={handleSave}
            disabled={saving}
            style={{ minWidth: 160 }}
          >
            {saving ? 'Сохранение...' : '💾 Сохранить'}
          </button>
          {msg && (
            <span style={{ fontSize: '0.875rem', color: msg.type === 'ok' ? '#00C48C' : '#ef4444' }}>
              {msg.text}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      <label style={{ fontSize: '0.875rem', fontWeight: 600, color: '#ccc' }}>{label}</label>
      {children}
    </div>
  );
}
