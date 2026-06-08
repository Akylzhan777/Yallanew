import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Tariff } from './TariffsSection';
import { MarqueeStar } from './MarqueeStrip';

interface HeroStat { label: string; value: string; }

interface LandingData {
  hero_title: string;
  hero_subtitle: string;
  hero_stats: HeroStat[];
}

const DEFAULTS: LandingData = {
  hero_title: "Explore Dubai's best creators.",
  hero_subtitle: "Dubai's #1 Creator Platform",
  hero_stats: [
    { label: 'Videographers', value: '120+' },
    { label: 'Studios', value: '35' },
    { label: 'Drone Crews', value: '8' },
    { label: 'Projects Done', value: '500+' },
  ],
};

type Section = 'hero' | 'tariffs' | 'marquee';

const EMPTY_TARIFF: Omit<Tariff, 'id' | 'created_at'> = {
  name: '', price: '', price_sub: 'за съёмку', badge: '',
  is_featured: false, features: [], sort_order: 0,
};

async function upsertSetting(key: string, value: unknown) {
  return supabase.from('landing_settings').upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' });
}

export default function LandingEditor() {
  const [data, setData] = useState<LandingData>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const [section, setSection] = useState<Section>('hero');
  const [tariffs, setTariffs] = useState<Tariff[]>([]);
  const [tariffSaving, setTariffSaving] = useState(false);
  const [editingTariff, setEditingTariff] = useState<Partial<Tariff> & { _isNew?: boolean } | null>(null);
  const [marqueeStars, setMarqueeStars] = useState<MarqueeStar[]>([]);
  const [starSaving, setStarSaving] = useState(false);
  const [editingStar, setEditingStar] = useState<Partial<MarqueeStar> & { _isNew?: boolean } | null>(null);
  const starPhotoRef = useRef<HTMLInputElement>(null);

  useEffect(() => { loadSettings(); loadTariffs(); loadMarqueeStars(); }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3200);
  };

  const loadTariffs = async () => {
    const { data: rows } = await supabase.from('tariffs').select('*').order('sort_order');
    if (rows) setTariffs(rows.map((r: Tariff) => ({ ...r, features: Array.isArray(r.features) ? r.features : [] })));
  };

  const saveTariff = async (t: Partial<Tariff> & { _isNew?: boolean }) => {
    setTariffSaving(true);
    const { _isNew, ...payload } = t;
    if (_isNew) {
      const { error } = await supabase.from('tariffs').insert({ ...payload, id: undefined });
      if (error) showToast(`Ошибка: ${error.message}`);
    } else {
      const { error } = await supabase.from('tariffs').update(payload).eq('id', payload.id);
      if (error) showToast(`Ошибка: ${error.message}`);
    }
    await loadTariffs();
    setEditingTariff(null);
    setTariffSaving(false);
    showToast('Тариф сохранён');
  };

  const deleteTariff = async (id: string) => {
    await supabase.from('tariffs').delete().eq('id', id);
    await loadTariffs();
    showToast('Тариф удалён');
  };

  const loadMarqueeStars = async () => {
    const { data: rows } = await supabase.from('marquee_stars').select('*').order('sort_order');
    if (rows) setMarqueeStars(rows);
  };

  const saveStar = async (s: Partial<MarqueeStar> & { _isNew?: boolean }) => {
    setStarSaving(true);
    const { _isNew, ...payload } = s;
    if (_isNew) {
      const { error } = await supabase.from('marquee_stars').insert({ ...payload, id: undefined });
      if (error) showToast(`Ошибка: ${error.message}`);
    } else {
      const { error } = await supabase.from('marquee_stars').update(payload).eq('id', payload.id);
      if (error) showToast(`Ошибка: ${error.message}`);
    }
    await loadMarqueeStars();
    setEditingStar(null);
    setStarSaving(false);
    showToast('Звезда сохранена');
  };

  const deleteStar = async (id: string) => {
    await supabase.from('marquee_stars').delete().eq('id', id);
    await loadMarqueeStars();
    showToast('Звезда удалена');
  };

  const toggleStarActive = async (star: MarqueeStar) => {
    await supabase.from('marquee_stars').update({ is_active: !star.is_active }).eq('id', star.id);
    await loadMarqueeStars();
  };

  const handleStarPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const ext = file.name.split('.').pop();
    const path = `stars/star_${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from('operator-photos').upload(path, file, { upsert: true });
    if (upErr) { showToast(`Ошибка загрузки: ${upErr.message}`); return; }
    const { data: pub } = supabase.storage.from('operator-photos').getPublicUrl(path);
    setEditingStar(s => s ? { ...s, photo_url: pub.publicUrl } : s);
    showToast('Фото загружено');
  };

  const loadSettings = async () => {
    setLoading(true);
    const { data: rows } = await supabase.from('landing_settings').select('key, value');
    if (rows && rows.length > 0) {
      const map: Record<string, unknown> = {};
      rows.forEach(r => { map[r.key] = r.value; });
      setData({
        hero_title: (map.hero_title as string) ?? DEFAULTS.hero_title,
        hero_subtitle: (map.hero_subtitle as string) ?? DEFAULTS.hero_subtitle,
        hero_stats: (map.hero_stats as HeroStat[]) ?? DEFAULTS.hero_stats,
      });
    }
    setLoading(false);
  };

  const saveHero = async () => {
    setSaving(true);
    const ops = [
      upsertSetting('hero_title', data.hero_title),
      upsertSetting('hero_subtitle', data.hero_subtitle),
      upsertSetting('hero_stats', data.hero_stats),
    ];
    const results = await Promise.all(ops);
    const err = results.find(r => r.error);
    if (err?.error) showToast(`Ошибка: ${err.error.message}`);
    else showToast('Лендинг обновлён!');
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="led-loading">
        <div className="admin-spinner" />
        <span>Загрузка настроек...</span>
      </div>
    );
  }

  return (
    <div className="led-root">
      {toast && <div className="led-toast">{toast}</div>}
      <input ref={starPhotoRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleStarPhotoUpload} />

      <div className="led-toolbar">
        <div className="led-tabs">
          {(['hero', 'tariffs', 'marquee'] as Section[]).map(s => (
            <button key={s} className={`led-tab ${section === s ? 'active' : ''}`} onClick={() => setSection(s)}>
              {s === 'hero' && (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
              )}
              {s === 'tariffs' && (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/><line x1="12" y1="12" x2="12" y2="16"/><line x1="10" y1="14" x2="14" y2="14"/></svg>
              )}
              {s === 'marquee' && (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="4"/><path d="M6 20v-2a6 6 0 0 1 12 0v2"/></svg>
              )}
              {s === 'hero' ? 'Hero' : s === 'tariffs' ? 'Тарифы' : 'Лента звёзд'}
            </button>
          ))}
        </div>
        {section === 'hero' && (
          <button className="led-publish-btn" onClick={saveHero} disabled={saving}>
            {saving ? (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="led-spin"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                Сохранение...
              </>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12l5 5L20 7"/></svg>
                Опубликовать
              </>
            )}
          </button>
        )}
      </div>

      {section === 'hero' && (
        <div className="led-section">
          <div className="led-section-head">
            <h3 className="led-section-title">Hero-секция</h3>
            <p className="led-section-sub">Заголовок, бейдж и статистика на главной странице лендинга</p>
          </div>

          <div className="led-preview-hero">
            <div className="led-preview-badge">{data.hero_subtitle}</div>
            <div className="led-preview-h1">{data.hero_title}</div>
            <div className="led-preview-stats-row">
              {data.hero_stats.map((s, i) => (
                <span key={i} className="led-preview-stat">
                  <strong>{s.value}</strong> {s.label}
                </span>
              ))}
            </div>
          </div>

          <div className="led-fields">
            <div className="led-field">
              <label className="led-label">Бейдж (подпись над заголовком)</label>
              <input
                className="led-input"
                value={data.hero_subtitle}
                onChange={e => setData(d => ({ ...d, hero_subtitle: e.target.value }))}
                placeholder="Dubai's #1 Creator Platform"
              />
            </div>
            <div className="led-field">
              <label className="led-label">Главный заголовок</label>
              <textarea
                className="led-textarea"
                rows={2}
                value={data.hero_title}
                onChange={e => setData(d => ({ ...d, hero_title: e.target.value }))}
                placeholder="Explore Dubai's best creators."
              />
            </div>
          </div>

          <div className="led-sub-section">
            <div className="led-sub-section-head">
              <span className="led-sub-title">Статистика</span>
              <button
                className="led-add-btn"
                onClick={() => setData(d => ({ ...d, hero_stats: [...d.hero_stats, { label: 'New Stat', value: '0' }] }))}
              >
                + Добавить
              </button>
            </div>
            <div className="led-stats-grid">
              {data.hero_stats.map((s, i) => (
                <div key={i} className="led-stat-card">
                  <div className="led-stat-fields">
                    <input
                      className="led-input led-input-sm"
                      value={s.value}
                      placeholder="120+"
                      onChange={e => setData(d => ({
                        ...d,
                        hero_stats: d.hero_stats.map((x, j) => j === i ? { ...x, value: e.target.value } : x),
                      }))}
                    />
                    <input
                      className="led-input led-input-sm"
                      value={s.label}
                      placeholder="Videographers"
                      onChange={e => setData(d => ({
                        ...d,
                        hero_stats: d.hero_stats.map((x, j) => j === i ? { ...x, label: e.target.value } : x),
                      }))}
                    />
                  </div>
                  <button
                    className="led-remove-btn"
                    onClick={() => setData(d => ({ ...d, hero_stats: d.hero_stats.filter((_, j) => j !== i) }))}
                    title="Удалить"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {section === 'tariffs' && (
        <div className="led-section">
          <div className="led-section-head">
            <h3 className="led-section-title">Управление тарифами</h3>
            <p className="led-section-sub">Карточки тарифов на лендинге. Изменения сохраняются сразу в базу данных.</p>
          </div>

          <div className="led-tariff-list">
            {tariffs.map(t => (
              <div key={t.id} className={`led-tariff-row${t.is_featured ? ' led-tariff-featured' : ''}`}>
                <div className="led-tariff-info">
                  <div className="led-tariff-name-row">
                    <span className="led-tariff-name">{t.name}</span>
                    {t.is_featured && <span className="led-tariff-badge-pill">Most Popular</span>}
                    {t.badge && t.badge !== 'Most Popular' && <span className="led-tariff-badge-pill">{t.badge}</span>}
                  </div>
                  <div className="led-tariff-price">{t.price} <span className="led-tariff-price-sub">{t.price_sub}</span></div>
                  <div className="led-tariff-features-preview">
                    {t.features.slice(0, 3).map((f, i) => <span key={i} className="led-tf-chip">{f}</span>)}
                    {t.features.length > 3 && <span className="led-tf-chip led-tf-more">+{t.features.length - 3}</span>}
                  </div>
                </div>
                <div className="led-tariff-actions">
                  <button className="led-edit-btn" onClick={() => setEditingTariff({ ...t })}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    Редактировать
                  </button>
                  <button className="led-danger-btn" onClick={() => deleteTariff(t.id)}>
                    Удалить
                  </button>
                </div>
              </div>
            ))}
          </div>

          <button
            className="led-add-banner-btn"
            onClick={() => setEditingTariff({ ...EMPTY_TARIFF, _isNew: true })}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Добавить тариф
          </button>

          {editingTariff && (
            <div className="led-tariff-edit-panel">
              <div className="led-section-head">
                <h4 className="led-section-title">{editingTariff._isNew ? 'Новый тариф' : `Редактировать: ${editingTariff.name}`}</h4>
              </div>
              <div className="led-fields">
                <div className="led-banner-row">
                  <div className="led-field" style={{ flex: 1 }}>
                    <label className="led-label">Название тарифа</label>
                    <input className="led-input led-input-sm" value={editingTariff.name ?? ''} placeholder="Pro"
                      onChange={e => setEditingTariff(t => t ? { ...t, name: e.target.value } : t)} />
                  </div>
                  <div className="led-field" style={{ flex: 1 }}>
                    <label className="led-label">Цена</label>
                    <input className="led-input led-input-sm" value={editingTariff.price ?? ''} placeholder="от 1 200 AED"
                      onChange={e => setEditingTariff(t => t ? { ...t, price: e.target.value } : t)} />
                  </div>
                  <div className="led-field" style={{ flex: 1 }}>
                    <label className="led-label">Подпись цены</label>
                    <input className="led-input led-input-sm" value={editingTariff.price_sub ?? ''} placeholder="за съёмку"
                      onChange={e => setEditingTariff(t => t ? { ...t, price_sub: e.target.value } : t)} />
                  </div>
                </div>
                <div className="led-banner-row">
                  <div className="led-field" style={{ flex: 1 }}>
                    <label className="led-label">Бейдж (необязательно)</label>
                    <input className="led-input led-input-sm" value={editingTariff.badge ?? ''} placeholder="Most Popular"
                      onChange={e => setEditingTariff(t => t ? { ...t, badge: e.target.value } : t)} />
                  </div>
                  <div className="led-field" style={{ flex: 1 }}>
                    <label className="led-label">Порядок</label>
                    <input className="led-input led-input-sm" type="number" value={editingTariff.sort_order ?? 0}
                      onChange={e => setEditingTariff(t => t ? { ...t, sort_order: Number(e.target.value) } : t)} />
                  </div>
                  <div className="led-field" style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                    <label className="led-label">Выделить как популярный</label>
                    <label className="led-toggle-row">
                      <input type="checkbox" checked={editingTariff.is_featured ?? false}
                        onChange={e => setEditingTariff(t => t ? { ...t, is_featured: e.target.checked } : t)} />
                      <span>Most Popular</span>
                    </label>
                  </div>
                </div>
                <div className="led-field">
                  <div className="led-sub-section-head">
                    <span className="led-sub-title">Список услуг (features)</span>
                    <button className="led-add-btn" onClick={() => setEditingTariff(t => t ? { ...t, features: [...(t.features ?? []), ''] } : t)}>
                      + Добавить пункт
                    </button>
                  </div>
                  <div className="led-features-list">
                    {(editingTariff.features ?? []).map((f, i) => (
                      <div key={i} className="led-feature-row">
                        <input className="led-input led-input-sm" value={f} placeholder="Монтаж 5 Reels"
                          onChange={e => setEditingTariff(t => t ? { ...t, features: (t.features ?? []).map((x, j) => j === i ? e.target.value : x) } : t)} />
                        <button className="led-remove-btn" onClick={() => setEditingTariff(t => t ? { ...t, features: (t.features ?? []).filter((_, j) => j !== i) } : t)}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="led-tariff-edit-actions">
                <button className="led-publish-btn" onClick={() => saveTariff(editingTariff)} disabled={tariffSaving}>
                  {tariffSaving ? 'Сохраняем...' : 'Сохранить тариф'}
                </button>
                <button className="led-danger-btn" onClick={() => setEditingTariff(null)}>
                  Отмена
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {section === 'marquee' && (
        <div className="led-section">
          <div className="led-section-head">
            <h3 className="led-section-title">Лента звёзд</h3>
            <p className="led-section-sub">Карусель клиентов на главной странице. Управляйте фото, именами и видимостью.</p>
          </div>

          <div className="led-tariff-list">
            {marqueeStars.map(star => (
              <div key={star.id} className={`led-tariff-row${!star.is_active ? ' led-star-inactive' : ''}`}>
                <div className="led-star-row-photo">
                  {star.photo_url
                    ? <img src={star.photo_url} alt={star.name} className="led-star-thumb" />
                    : <div className="led-star-thumb-placeholder" />
                  }
                </div>
                <div className="led-tariff-info">
                  <div className="led-tariff-name-row">
                    <span className="led-tariff-name">{star.name || '(без имени)'}</span>
                    {!star.is_active && <span className="led-star-hidden-pill">Скрыт</span>}
                  </div>
                  <div className="led-tariff-price">{star.status_text}</div>
                  {star.social_url && <div className="led-tariff-price-sub">{star.social_url}</div>}
                </div>
                <div className="led-tariff-actions">
                  <button className="led-edit-btn" onClick={() => setEditingStar({ ...star })}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    Редактировать
                  </button>
                  <button className="led-edit-btn" onClick={() => toggleStarActive(star)}>
                    {star.is_active ? 'Скрыть' : 'Показать'}
                  </button>
                  <button className="led-danger-btn" onClick={() => deleteStar(star.id)}>Удалить</button>
                </div>
              </div>
            ))}
          </div>

          <button
            className="led-add-banner-btn"
            onClick={() => setEditingStar({ name: '', status_text: '', photo_url: '', social_url: '', is_active: true, sort_order: marqueeStars.length + 1, _isNew: true })}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Добавить звезду
          </button>

          {editingStar && (
            <div className="led-tariff-edit-panel">
              <div className="led-section-head">
                <h4 className="led-section-title">{editingStar._isNew ? 'Новая звезда' : `Редактировать: ${editingStar.name}`}</h4>
              </div>
              <div className="led-fields">
                <div className="led-field">
                  <label className="led-label">Фото профиля</label>
                  <div className="led-star-photo-upload">
                    {editingStar.photo_url
                      ? <img src={editingStar.photo_url} alt="" className="led-star-preview" />
                      : <div className="led-star-preview-placeholder">Нет фото</div>
                    }
                    <div className="led-star-photo-actions">
                      <button type="button" className="led-edit-btn" onClick={() => starPhotoRef.current?.click()}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                        Загрузить фото
                      </button>
                      <input
                        className="led-input led-input-sm"
                        value={editingStar.photo_url ?? ''}
                        placeholder="https://... или загрузите файл"
                        onChange={e => setEditingStar(s => s ? { ...s, photo_url: e.target.value } : s)}
                      />
                    </div>
                  </div>
                </div>
                <div className="led-banner-row">
                  <div className="led-field" style={{ flex: 1 }}>
                    <label className="led-label">Имя</label>
                    <input className="led-input led-input-sm" value={editingStar.name ?? ''} placeholder="Ahmed Al Rashidi"
                      onChange={e => setEditingStar(s => s ? { ...s, name: e.target.value } : s)} />
                  </div>
                  <div className="led-field" style={{ flex: 1 }}>
                    <label className="led-label">Статус (подпись)</label>
                    <input className="led-input led-input-sm" value={editingStar.status_text ?? ''} placeholder="1M+ followers"
                      onChange={e => setEditingStar(s => s ? { ...s, status_text: e.target.value } : s)} />
                  </div>
                </div>
                <div className="led-banner-row">
                  <div className="led-field" style={{ flex: 2 }}>
                    <label className="led-label">Ссылка на соцсеть (необязательно)</label>
                    <input className="led-input led-input-sm" value={editingStar.social_url ?? ''} placeholder="https://instagram.com/username"
                      onChange={e => setEditingStar(s => s ? { ...s, social_url: e.target.value } : s)} />
                  </div>
                  <div className="led-field" style={{ flex: 1 }}>
                    <label className="led-label">Порядок</label>
                    <input className="led-input led-input-sm" type="number" value={editingStar.sort_order ?? 0}
                      onChange={e => setEditingStar(s => s ? { ...s, sort_order: Number(e.target.value) } : s)} />
                  </div>
                </div>
                <div className="led-field">
                  <label className="led-toggle-row">
                    <input type="checkbox" checked={editingStar.is_active ?? true}
                      onChange={e => setEditingStar(s => s ? { ...s, is_active: e.target.checked } : s)} />
                    <span>Показывать в карусели</span>
                  </label>
                </div>
              </div>
              <div className="led-tariff-edit-actions">
                <button className="led-publish-btn" onClick={() => saveStar(editingStar)} disabled={starSaving}>
                  {starSaving ? 'Сохраняем...' : 'Сохранить'}
                </button>
                <button className="led-danger-btn" onClick={() => setEditingStar(null)}>Отмена</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
