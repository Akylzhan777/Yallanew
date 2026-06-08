import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import {
  Search, RefreshCw, Wallet, Plus, Minus, X, ChevronDown, Building2,
  Mail, Phone, Globe, MapPin,
} from 'lucide-react';

interface BrandRow {
  id: string;
  user_id: string;
  display_name: string;
  company_name: string;
  email: string;
  phone: string | null;
  role: string;
  region: string | null;
  balance: number;
  website: string | null;
  created_at: string;
  total_orders: number;
  total_spent: number;
}

interface BalanceModal {
  brand: BrandRow;
  mode: 'add' | 'deduct';
}

export default function BrandsPanel() {
  const [brands, setBrands] = useState<BrandRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [regionFilter, setRegionFilter] = useState<'all' | 'UAE' | 'KZ'>('all');
  const [balanceModal, setBalanceModal] = useState<BalanceModal | null>(null);
  const [balanceAmount, setBalanceAmount] = useState('');
  const [balanceNote, setBalanceNote] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: profiles } = await supabase
      .from('client_profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (!profiles || profiles.length === 0) {
      setBrands([]);
      setLoading(false);
      return;
    }

    const userIds = profiles.map(p => p.user_id);
    const { data: orders } = await supabase
      .from('marketplace_orders')
      .select('client_user_id, package_price, status')
      .in('client_user_id', userIds);

    const ordersMap = new Map<string, { count: number; spent: number }>();
    for (const o of orders ?? []) {
      if (!o.client_user_id) continue;
      const prev = ordersMap.get(o.client_user_id) ?? { count: 0, spent: 0 };
      ordersMap.set(o.client_user_id, {
        count: prev.count + 1,
        spent: prev.spent + (Number(o.package_price) || 0),
      });
    }

    setBrands(
      profiles.map(p => ({
        ...p,
        balance: Number(p.balance ?? 0),
        total_orders: ordersMap.get(p.user_id)?.count ?? 0,
        total_spent: ordersMap.get(p.user_id)?.spent ?? 0,
      }))
    );
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = brands.filter(b => {
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      (b.company_name ?? '').toLowerCase().includes(q) ||
      (b.display_name ?? '').toLowerCase().includes(q) ||
      (b.email ?? '').toLowerCase().includes(q) ||
      (b.phone ?? '').includes(q);
    const matchRegion =
      regionFilter === 'all' || (b.region ?? 'UAE') === regionFilter;
    return matchSearch && matchRegion;
  });

  async function applyBalance() {
    if (!balanceModal) return;
    const amt = parseFloat(balanceAmount);
    if (!amt || amt <= 0) return;
    setSaving(true);
    const delta = balanceModal.mode === 'add' ? amt : -amt;
    const newBalance = Math.max(0, balanceModal.brand.balance + delta);
    await supabase
      .from('client_profiles')
      .update({ balance: newBalance })
      .eq('id', balanceModal.brand.id);
    setSaving(false);
    setBalanceModal(null);
    setBalanceAmount('');
    setBalanceNote('');
    load();
  }

  const regionBadge = (r: string | null) => {
    const region = r ?? 'UAE';
    return (
      <span
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold"
        style={{
          background: region === 'KZ' ? 'rgba(59,130,246,0.15)' : 'rgba(234,179,8,0.15)',
          color: region === 'KZ' ? '#60a5fa' : '#eab308',
        }}
      >
        <MapPin size={10} />
        {region}
      </span>
    );
  };

  return (
    <div style={{ padding: '24px', maxWidth: 1400, margin: '0 auto' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Бренды / Клиенты</h1>
          <p className="text-sm mt-0.5" style={{ color: '#64748b' }}>
            {brands.length} зарегистрированных брендов
          </p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-white/10"
          style={{ background: 'rgba(255,255,255,0.06)', color: '#94a3b8' }}
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Обновить
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Всего брендов', value: brands.length, icon: Building2, color: '#3b82f6' },
          { label: 'Заказов всего', value: brands.reduce((s, b) => s + b.total_orders, 0), icon: ChevronDown, color: '#10b981' },
          { label: 'Сумма заказов', value: brands.reduce((s, b) => s + b.total_spent, 0).toLocaleString(), icon: Wallet, color: '#f59e0b', suffix: '' },
          { label: 'Регион UAE', value: brands.filter(b => (b.region ?? 'UAE') === 'UAE').length, icon: Globe, color: '#eab308' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div
            key={label}
            className="rounded-xl p-4"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <div className="flex items-center gap-2 mb-2">
              <Icon size={14} style={{ color }} />
              <span className="text-xs" style={{ color: '#64748b' }}>{label}</span>
            </div>
            <div className="text-xl font-bold text-white">{value}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#64748b' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Поиск по компании, email, телефону..."
            className="w-full pl-9 pr-3 py-2 rounded-lg text-sm text-white placeholder-slate-600 outline-none"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
          />
        </div>
        <div className="flex gap-1 rounded-lg p-1" style={{ background: 'rgba(255,255,255,0.04)' }}>
          {(['all', 'UAE', 'KZ'] as const).map(r => (
            <button
              key={r}
              onClick={() => setRegionFilter(r)}
              className="px-3 py-1.5 rounded-md text-xs font-medium transition-all"
              style={{
                background: regionFilter === r ? 'rgba(255,255,255,0.12)' : 'transparent',
                color: regionFilter === r ? '#fff' : '#64748b',
              }}
            >
              {r === 'all' ? 'Все регионы' : r}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                {['Компания', 'Контакты', 'Регион', 'Заказов', 'Сумма заказов', 'Баланс', 'Действия'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: '#475569' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-12" style={{ color: '#475569' }}>
                    <RefreshCw size={20} className="animate-spin mx-auto mb-2" />
                    Загрузка...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12" style={{ color: '#475569' }}>
                    Бренды не найдены
                  </td>
                </tr>
              ) : (
                filtered.map(brand => (
                  <tr
                    key={brand.id}
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                    className="transition-colors hover:bg-white/[0.02]"
                  >
                    {/* Company */}
                    <td className="px-4 py-3">
                      <div className="font-semibold text-white">{brand.company_name || brand.display_name || '—'}</div>
                      {brand.company_name && brand.display_name && (
                        <div className="text-xs mt-0.5" style={{ color: '#64748b' }}>{brand.display_name}</div>
                      )}
                      <div className="text-xs mt-0.5" style={{ color: '#334155' }}>
                        {new Date(brand.created_at).toLocaleDateString('ru-RU')}
                      </div>
                    </td>

                    {/* Contacts */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 text-xs" style={{ color: '#94a3b8' }}>
                        <Mail size={11} style={{ color: '#64748b', flexShrink: 0 }} />
                        <span className="truncate max-w-40">{brand.email || '—'}</span>
                      </div>
                      {brand.phone && (
                        <div className="flex items-center gap-1.5 text-xs mt-1" style={{ color: '#94a3b8' }}>
                          <Phone size={11} style={{ color: '#64748b', flexShrink: 0 }} />
                          {brand.phone}
                        </div>
                      )}
                      {brand.website && (
                        <div className="flex items-center gap-1.5 text-xs mt-1" style={{ color: '#64748b' }}>
                          <Globe size={11} style={{ flexShrink: 0 }} />
                          <span className="truncate max-w-36">{brand.website}</span>
                        </div>
                      )}
                    </td>

                    {/* Region */}
                    <td className="px-4 py-3">{regionBadge(brand.region)}</td>

                    {/* Orders */}
                    <td className="px-4 py-3">
                      <span className="font-semibold text-white">{brand.total_orders}</span>
                    </td>

                    {/* Total spent */}
                    <td className="px-4 py-3">
                      <span className="font-semibold" style={{ color: '#10b981' }}>
                        {brand.total_spent > 0 ? brand.total_spent.toLocaleString() : '—'}
                      </span>
                    </td>

                    {/* Balance */}
                    <td className="px-4 py-3">
                      <span
                        className="font-bold"
                        style={{ color: brand.balance > 0 ? '#f59e0b' : '#475569' }}
                      >
                        {brand.balance.toLocaleString()}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => { setBalanceModal({ brand, mode: 'add' }); setBalanceAmount(''); setBalanceNote(''); }}
                          title="Начислить баланс"
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-90"
                          style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981', border: '1px solid rgba(16,185,129,0.2)' }}
                        >
                          <Plus size={11} /> Начислить
                        </button>
                        <button
                          onClick={() => { setBalanceModal({ brand, mode: 'deduct' }); setBalanceAmount(''); setBalanceNote(''); }}
                          title="Списать с баланса"
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-90"
                          style={{ background: 'rgba(239,68,68,0.12)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' }}
                        >
                          <Minus size={11} /> Списать
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Balance modal */}
      {balanceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setBalanceModal(null)}>
          <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }} />
          <div
            className="relative w-full max-w-sm rounded-2xl p-6"
            style={{ background: '#131929', border: '1px solid rgba(255,255,255,0.1)' }}
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => setBalanceModal(null)}
              className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-white/10 transition-colors"
              style={{ color: '#64748b' }}
            >
              <X size={16} />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{
                  background: balanceModal.mode === 'add' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.12)',
                  border: `1px solid ${balanceModal.mode === 'add' ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.25)'}`,
                }}
              >
                <Wallet size={18} style={{ color: balanceModal.mode === 'add' ? '#10b981' : '#f87171' }} />
              </div>
              <div>
                <h3 className="font-bold text-white text-base">
                  {balanceModal.mode === 'add' ? 'Начислить баланс' : 'Списать с баланса'}
                </h3>
                <p className="text-xs" style={{ color: '#64748b' }}>
                  {balanceModal.brand.company_name || balanceModal.brand.display_name}
                </p>
              </div>
            </div>

            <div className="rounded-xl p-3 mb-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <span className="text-xs" style={{ color: '#64748b' }}>Текущий баланс: </span>
              <span className="font-bold" style={{ color: '#f59e0b' }}>{balanceModal.brand.balance.toLocaleString()}</span>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: '#94a3b8' }}>
                  Сумма *
                </label>
                <input
                  type="number"
                  min="0"
                  value={balanceAmount}
                  onChange={e => setBalanceAmount(e.target.value)}
                  placeholder="Введите сумму..."
                  className="w-full px-3 py-2.5 rounded-lg text-sm text-white placeholder-slate-600 outline-none"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: '#94a3b8' }}>
                  Комментарий (необязательно)
                </label>
                <input
                  type="text"
                  value={balanceNote}
                  onChange={e => setBalanceNote(e.target.value)}
                  placeholder="Причина корректировки..."
                  className="w-full px-3 py-2.5 rounded-lg text-sm text-white placeholder-slate-600 outline-none"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
                />
              </div>
            </div>

            {balanceModal.mode === 'deduct' && parseFloat(balanceAmount) > balanceModal.brand.balance && (
              <p className="text-xs mt-3" style={{ color: '#f87171' }}>
                Сумма списания превышает текущий баланс. Баланс не может быть отрицательным.
              </p>
            )}

            <div className="flex gap-2 mt-5">
              <button
                onClick={() => setBalanceModal(null)}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors hover:bg-white/5"
                style={{ color: '#64748b', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                Отмена
              </button>
              <button
                onClick={applyBalance}
                disabled={saving || !balanceAmount || parseFloat(balanceAmount) <= 0}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
                style={{
                  background: balanceModal.mode === 'add'
                    ? 'linear-gradient(135deg, #10b981, #059669)'
                    : 'linear-gradient(135deg, #ef4444, #dc2626)',
                  color: '#fff',
                }}
              >
                {saving ? 'Сохранение...' : balanceModal.mode === 'add' ? 'Начислить' : 'Списать'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
