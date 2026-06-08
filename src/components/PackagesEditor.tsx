import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export interface CreditPackage {
  id: string;
  title: string;
  subtitle: string;
  price: number;
  currency: string;
  credits_value: number;
  sort_order: number;
  validity_days: number;
}

const EMPTY_PKG: Omit<CreditPackage, 'id'> = {
  title: '',
  subtitle: '',
  price: 0,
  currency: '₽',
  credits_value: 0,
  sort_order: 0,
  validity_days: 30,
};

export default function PackagesEditor() {
  const [packages, setPackages] = useState<CreditPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<(Partial<CreditPackage> & { _isNew?: boolean }) | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');

  useEffect(() => { loadPackages(); }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const loadPackages = async () => {
    setLoading(true);
    const { data } = await supabase.from('credit_packages').select('*').order('sort_order');
    if (data) setPackages(data);
    setLoading(false);
  };

  const savePackage = async (pkg: Partial<CreditPackage> & { _isNew?: boolean }) => {
    setSaving(true);
    const { _isNew, ...payload } = pkg;
    if (_isNew) {
      const { error } = await supabase.from('credit_packages').insert({ ...payload, id: undefined });
      if (error) { showToast(`Ошибка: ${error.message}`); setSaving(false); return; }
    } else {
      const { error } = await supabase.from('credit_packages').update(payload).eq('id', payload.id);
      if (error) { showToast(`Ошибка: ${error.message}`); setSaving(false); return; }
    }
    await loadPackages();
    setEditing(null);
    setSaving(false);
    showToast('Пакет сохранён');
  };

  const deletePackage = async (id: string) => {
    await supabase.from('credit_packages').delete().eq('id', id);
    await loadPackages();
    showToast('Пакет удалён');
  };

  if (loading) {
    return (
      <div className="led-loading">
        <div className="admin-spinner" />
        <span>Загрузка пакетов...</span>
      </div>
    );
  }

  return (
    <div className="led-root">
      {toast && <div className="led-toast">{toast}</div>}

      <div className="led-section">
        <div className="led-section-head">
          <h3 className="led-section-title">Пакеты пополнения баланса</h3>
          <p className="led-section-sub">Управляйте пакетами видео, которые пользователи видят в окне пополнения баланса. Изменения применяются мгновенно.</p>
        </div>

        <div className="led-tariff-list">
          {packages.map(pkg => (
            <div key={pkg.id} className="led-tariff-row">
              <div className="pkg-preview-dot" />
              <div className="led-tariff-info">
                <div className="led-tariff-name-row">
                  <span className="led-tariff-name">{pkg.title}</span>
                  {pkg.subtitle && <span className="led-tariff-badge-pill">{pkg.subtitle}</span>}
                </div>
                <div className="led-tariff-price">
                  {pkg.price.toLocaleString('ru-RU')} {pkg.currency}
                  <span className="led-tariff-price-sub" style={{ marginLeft: 8 }}>· {pkg.credits_value} кредитов · {pkg.validity_days ?? 30} дн.</span>
                </div>
              </div>
              <div className="led-tariff-actions">
                <button className="led-edit-btn" onClick={() => setEditing({ ...pkg })}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  Редактировать
                </button>
                <button className="led-danger-btn" onClick={() => deletePackage(pkg.id)}>
                  Удалить
                </button>
              </div>
            </div>
          ))}
        </div>

        <button
          className="led-add-banner-btn"
          onClick={() => setEditing({ ...EMPTY_PKG, sort_order: packages.length + 1, _isNew: true })}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Добавить пакет
        </button>

        {editing && (
          <div className="led-tariff-edit-panel">
            <div className="led-section-head">
              <h4 className="led-section-title">{editing._isNew ? 'Новый пакет' : `Редактировать: ${editing.title}`}</h4>
            </div>
            <div className="led-fields">
              <div className="led-banner-row">
                <div className="led-field" style={{ flex: 2 }}>
                  <label className="led-label">Название (напр. "15 видео")</label>
                  <input
                    className="led-input led-input-sm"
                    value={editing.title ?? ''}
                    placeholder="15 видео"
                    onChange={e => setEditing(p => p ? { ...p, title: e.target.value } : p)}
                  />
                </div>
                <div className="led-field" style={{ flex: 2 }}>
                  <label className="led-label">Подпись (напр. "Start Pack")</label>
                  <input
                    className="led-input led-input-sm"
                    value={editing.subtitle ?? ''}
                    placeholder="Популярный выбор"
                    onChange={e => setEditing(p => p ? { ...p, subtitle: e.target.value } : p)}
                  />
                </div>
              </div>
              <div className="led-banner-row">
                <div className="led-field" style={{ flex: 2 }}>
                  <label className="led-label">Цена (число)</label>
                  <input
                    className="led-input led-input-sm"
                    type="number"
                    value={editing.price ?? 0}
                    placeholder="40000"
                    onChange={e => setEditing(p => p ? { ...p, price: Number(e.target.value) } : p)}
                  />
                </div>
                <div className="led-field" style={{ flex: 1 }}>
                  <label className="led-label">Валюта</label>
                  <input
                    className="led-input led-input-sm"
                    value={editing.currency ?? '₽'}
                    placeholder="₽"
                    onChange={e => setEditing(p => p ? { ...p, currency: e.target.value } : p)}
                  />
                </div>
                <div className="led-field" style={{ flex: 2 }}>
                  <label className="led-label">Кредитов (видео)</label>
                  <input
                    className="led-input led-input-sm"
                    type="number"
                    value={editing.credits_value ?? 0}
                    placeholder="15"
                    onChange={e => setEditing(p => p ? { ...p, credits_value: Number(e.target.value) } : p)}
                  />
                </div>
                <div className="led-field" style={{ flex: 1 }}>
                  <label className="led-label">Порядок</label>
                  <input
                    className="led-input led-input-sm"
                    type="number"
                    value={editing.sort_order ?? 0}
                    onChange={e => setEditing(p => p ? { ...p, sort_order: Number(e.target.value) } : p)}
                  />
                </div>
              </div>
              <div className="led-banner-row">
                <div className="led-field" style={{ flex: 2 }}>
                  <label className="led-label">Срок действия (дней)</label>
                  <input
                    className="led-input led-input-sm"
                    type="number"
                    min={1}
                    value={editing.validity_days ?? 30}
                    placeholder="30"
                    onChange={e => setEditing(p => p ? { ...p, validity_days: Number(e.target.value) } : p)}
                  />
                </div>
              </div>

              <div className="pkg-price-preview">
                <span className="pkg-preview-label">Предпросмотр:</span>
                <span className="pkg-preview-title">{editing.title || '—'}</span>
                <span className="pkg-preview-sub">{editing.subtitle || ''}</span>
                <span className="pkg-preview-price">
                  {(editing.price ?? 0).toLocaleString('ru-RU')} {editing.currency ?? '₽'}
                </span>
              </div>
            </div>
            <div className="led-tariff-edit-actions">
              <button className="led-publish-btn" onClick={() => savePackage(editing)} disabled={saving}>
                {saving ? 'Сохранение...' : 'Сохранить пакет'}
              </button>
              <button className="led-danger-btn" onClick={() => setEditing(null)}>
                Отмена
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
