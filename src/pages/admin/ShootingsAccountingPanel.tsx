import { useState } from 'react';
import { ExternalLink, Pencil, Trash2, X, Plus, RefreshCw, Calendar } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useData, ShootingClientRow } from '../../context/DataContext';

type TariffType = 'package' | 'monthly';

const emptyForm = (): {
  name: string;
  purchased: number;
  filmed: number;
  sources_link: string;
  tariff_type: TariffType;
  subscription_end_date: string;
  subscription_price: string;
} => ({
  name: '',
  purchased: 0,
  filmed: 0,
  sources_link: '',
  tariff_type: 'package',
  subscription_end_date: '',
  subscription_price: '',
});

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const end = new Date(dateStr);
  end.setHours(23, 59, 59, 999);
  const diff = Math.ceil((end.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  return diff;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' });
}

function SubscriptionBadge({ endDate }: { endDate: string | null }) {
  const days = daysUntil(endDate);
  if (days === null) return <span className="text-slate-500 text-xs">—</span>;
  const urgent = days <= 3;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
      urgent
        ? 'bg-red-500/20 text-red-400 border border-red-500/30'
        : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
    }`}>
      {urgent ? 'Оплата!' : 'Активна'}
    </span>
  );
}

function ShootingsAccountingPanel() {
  const { shootingClients: clients, shootingClientsLoading: loading, refetchShootingClients, setShootingClients } = useData();
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const openAdd = () => {
    setEditingId(null);
    setForm(emptyForm());
    setModalOpen(true);
  };

  const openEdit = (c: ShootingClientRow) => {
    setEditingId(c.id);
    setForm({
      name: c.name,
      purchased: c.purchased,
      filmed: c.filmed,
      sources_link: c.sources_link ?? '',
      tariff_type: c.tariff_type ?? 'package',
      subscription_end_date: c.subscription_end_date ?? '',
      subscription_price: c.subscription_price != null ? String(c.subscription_price) : '',
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingId(null);
    setForm(emptyForm());
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    setError(null);

    const isMonthly = form.tariff_type === 'monthly';
    const payload = {
      name: form.name.trim(),
      tariff_type: form.tariff_type,
      purchased: isMonthly ? 0 : form.purchased,
      filmed: isMonthly ? 0 : form.filmed,
      sources_link: form.sources_link.trim(),
      subscription_end_date: isMonthly && form.subscription_end_date ? form.subscription_end_date : null,
      subscription_price: isMonthly && form.subscription_price ? Number(form.subscription_price) : null,
    };

    if (editingId) {
      const { error: err } = await supabase.from('shootings_accounting').update(payload).eq('id', editingId);
      if (err) { setError(err.message); setSaving(false); return; }
    } else {
      const { error: err } = await supabase.from('shootings_accounting').insert(payload);
      if (err) { setError(err.message); setSaving(false); return; }
    }

    setSaving(false);
    closeModal();
    await refetchShootingClients();
  };

  const handleDelete = async (id: string) => {
    const { error: err } = await supabase.from('shootings_accounting').delete().eq('id', id);
    if (err) { setError(err.message); return; }
    setDeleteConfirm(null);
    setShootingClients(prev => prev.filter(c => c.id !== id));
  };

  const packageClients = clients.filter(c => (c.tariff_type ?? 'package') === 'package');
  const monthlyClients = clients.filter(c => c.tariff_type === 'monthly');

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200 p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Учет съемок</h1>
          <p className="text-slate-400 text-sm mt-1">Баланс видео по клиентам</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => refetchShootingClients()}
            className="p-2.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
            title="Обновить"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={openAdd}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors"
          >
            <Plus size={16} />
            <span className="hidden sm:inline">Добавить клиента</span>
            <span className="sm:hidden">Добавить</span>
          </button>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="mb-5 bg-red-900/40 border border-red-700 text-red-300 rounded-lg px-4 py-3 text-sm flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-200 ml-4"><X size={14} /></button>
        </div>
      )}

      {/* Summary strip */}
      {clients.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Всего клиентов', value: clients.length, color: 'text-white' },
            { label: 'Пакетных', value: packageClients.length, color: 'text-blue-400' },
            { label: 'Подписок', value: monthlyClients.length, color: 'text-emerald-400' },
            { label: 'Остаток видео', value: packageClients.reduce((s, c) => s + (c.purchased - c.filmed), 0), color: 'text-amber-400' },
          ].map(stat => (
            <div key={stat.label} className="bg-slate-800 rounded-xl px-4 py-3 border border-slate-700">
              <p className="text-slate-400 text-xs uppercase tracking-wider mb-1">{stat.label}</p>
              <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-24 text-slate-500">
          <RefreshCw size={22} className="animate-spin mr-3" />
          <span>Загрузка...</span>
        </div>
      ) : clients.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-slate-500">
          <div className="w-16 h-16 rounded-2xl bg-slate-800 flex items-center justify-center mb-4">
            <Plus size={28} className="text-slate-600" />
          </div>
          <p className="text-base font-medium text-slate-400">Нет клиентов</p>
          <p className="text-sm mt-1">Нажмите «Добавить клиента», чтобы начать</p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {/* ── Package clients ── */}
          {packageClients.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-400">Пакет видео</span>
                <span className="text-xs text-slate-500 bg-slate-800 rounded-full px-2 py-0.5">{packageClients.length}</span>
              </div>
              {/* Desktop table */}
              <div className="hidden md:block bg-slate-800 rounded-xl border border-slate-700 overflow-x-auto">
                <table className="w-full text-sm" style={{ minWidth: 520 }}>
                  <thead>
                    <tr className="border-b border-slate-700">
                      <th className="text-left text-slate-400 font-medium px-5 py-3 uppercase text-xs tracking-wider">Клиент</th>
                      <th className="text-center text-slate-400 font-medium px-4 py-3 uppercase text-xs tracking-wider">Пакет</th>
                      <th className="text-center text-slate-400 font-medium px-4 py-3 uppercase text-xs tracking-wider">Отснято</th>
                      <th className="text-center text-slate-400 font-medium px-4 py-3 uppercase text-xs tracking-wider">Остаток</th>
                      <th className="text-center text-slate-400 font-medium px-4 py-3 uppercase text-xs tracking-wider">Исходники</th>
                      <th className="text-right text-slate-400 font-medium px-5 py-3 uppercase text-xs tracking-wider">Действия</th>
                    </tr>
                  </thead>
                  <tbody>
                    {packageClients.map((c, idx) => {
                      const remaining = c.purchased - c.filmed;
                      const pct = c.purchased > 0 ? Math.min((c.filmed / c.purchased) * 100, 100) : 0;
                      return (
                        <tr key={c.id} className={`border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors ${idx === packageClients.length - 1 ? 'border-b-0' : ''}`}>
                          <td className="px-5 py-4"><span className="font-semibold text-white">{c.name}</span></td>
                          <td className="px-4 py-4 text-center"><span className="text-slate-200 font-medium">{c.purchased}</span></td>
                          <td className="px-4 py-4 text-center">
                            <div className="flex flex-col items-center gap-1">
                              <span className="text-slate-200 font-medium">{c.filmed}</span>
                              <div className="w-16 h-1 bg-slate-700 rounded-full overflow-hidden">
                                <div className="h-full bg-blue-500 rounded-full" style={{ width: `${pct}%` }} />
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4 text-center">
                            <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                              remaining <= 0 ? 'bg-red-900/50 text-red-300' : remaining <= 10 ? 'bg-amber-900/50 text-amber-300' : 'bg-emerald-900/50 text-emerald-300'
                            }`}>{remaining}</span>
                          </td>
                          <td className="px-4 py-4 text-center">
                            {c.sources_link ? (
                              <a href={c.sources_link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300 transition-colors">
                                <ExternalLink size={15} />
                              </a>
                            ) : <span className="text-slate-600">—</span>}
                          </td>
                          <td className="px-5 py-4">
                            <ClientActions c={c} openEdit={openEdit} deleteConfirm={deleteConfirm} setDeleteConfirm={setDeleteConfirm} handleDelete={handleDelete} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {/* Mobile cards */}
              <div className="flex flex-col gap-3 md:hidden">
                {packageClients.map(c => {
                  const remaining = c.purchased - c.filmed;
                  const pct = c.purchased > 0 ? Math.min((c.filmed / c.purchased) * 100, 100) : 0;
                  return (
                    <div key={c.id} className="bg-slate-800 rounded-xl border border-slate-700 p-4">
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <span className="font-bold text-white text-base">{c.name}</span>
                        <ClientActions c={c} openEdit={openEdit} deleteConfirm={deleteConfirm} setDeleteConfirm={setDeleteConfirm} handleDelete={handleDelete} compact />
                      </div>
                      <div className="grid grid-cols-3 gap-2 mb-3">
                        {[
                          { label: 'Пакет', value: c.purchased, cls: 'text-blue-400' },
                          { label: 'Отснято', value: c.filmed, cls: 'text-slate-200' },
                          { label: 'Остаток', value: remaining, cls: remaining <= 0 ? 'text-red-400' : remaining <= 10 ? 'text-amber-400' : 'text-emerald-400' },
                        ].map(s => (
                          <div key={s.label} className="bg-slate-900 rounded-lg px-3 py-2 text-center">
                            <div className={`text-lg font-bold ${s.cls}`}>{s.value}</div>
                            <div className="text-xs text-slate-500 mt-0.5">{s.label}</div>
                          </div>
                        ))}
                      </div>
                      <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden mb-1">
                        <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-xs text-slate-500">{Math.round(pct)}% выполнено</span>
                        {c.sources_link && (
                          <a href={c.sources_link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300">
                            <ExternalLink size={12} /> Исходники
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* ── Monthly subscription clients ── */}
          {monthlyClients.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Ежемесячная подписка</span>
                <span className="text-xs text-slate-500 bg-slate-800 rounded-full px-2 py-0.5">{monthlyClients.length}</span>
              </div>
              {/* Desktop table */}
              <div className="hidden md:block bg-slate-800 rounded-xl border border-slate-700 overflow-x-auto">
                <table className="w-full text-sm" style={{ minWidth: 480 }}>
                  <thead>
                    <tr className="border-b border-slate-700">
                      <th className="text-left text-slate-400 font-medium px-5 py-3 uppercase text-xs tracking-wider">Клиент</th>
                      <th className="text-center text-slate-400 font-medium px-4 py-3 uppercase text-xs tracking-wider">Подписка</th>
                      <th className="text-center text-slate-400 font-medium px-4 py-3 uppercase text-xs tracking-wider">Окончание</th>
                      <th className="text-center text-slate-400 font-medium px-4 py-3 uppercase text-xs tracking-wider">Статус</th>
                      <th className="text-center text-slate-400 font-medium px-4 py-3 uppercase text-xs tracking-wider">Исходники</th>
                      <th className="text-right text-slate-400 font-medium px-5 py-3 uppercase text-xs tracking-wider">Действия</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthlyClients.map((c, idx) => {
                      const days = daysUntil(c.subscription_end_date);
                      const urgent = days !== null && days <= 3;
                      return (
                        <tr key={c.id} className={`border-b border-slate-700/50 transition-colors ${urgent ? 'bg-red-900/10 hover:bg-red-900/15' : 'hover:bg-slate-700/30'} ${idx === monthlyClients.length - 1 ? 'border-b-0' : ''}`}>
                          <td className="px-5 py-4"><span className="font-semibold text-white">{c.name}</span></td>
                          <td className="px-4 py-4 text-center">
                            {c.subscription_price != null ? (
                              <span className="text-emerald-400 font-bold">{c.subscription_price.toLocaleString('ru-RU')} AED<span className="text-slate-500 font-normal text-xs"> / мес</span></span>
                            ) : <span className="text-slate-500">—</span>}
                          </td>
                          <td className="px-4 py-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <Calendar size={12} className="text-slate-500 flex-shrink-0" />
                              <span className={`text-sm font-medium ${urgent ? 'text-red-400' : 'text-slate-200'}`}>{formatDate(c.subscription_end_date)}</span>
                            </div>
                          </td>
                          <td className="px-4 py-4 text-center">
                            <SubscriptionBadge endDate={c.subscription_end_date} />
                          </td>
                          <td className="px-4 py-4 text-center">
                            {c.sources_link ? (
                              <a href={c.sources_link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300 transition-colors">
                                <ExternalLink size={15} />
                              </a>
                            ) : <span className="text-slate-600">—</span>}
                          </td>
                          <td className="px-5 py-4">
                            <ClientActions c={c} openEdit={openEdit} deleteConfirm={deleteConfirm} setDeleteConfirm={setDeleteConfirm} handleDelete={handleDelete} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {/* Mobile cards */}
              <div className="flex flex-col gap-3 md:hidden">
                {monthlyClients.map(c => {
                  const days = daysUntil(c.subscription_end_date);
                  const urgent = days !== null && days <= 3;
                  return (
                    <div key={c.id} className={`rounded-xl border p-4 ${urgent ? 'bg-red-900/10 border-red-500/30' : 'bg-slate-800 border-slate-700'}`}>
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div>
                          <span className="font-bold text-white text-base">{c.name}</span>
                          {c.subscription_price != null && (
                            <div className="text-emerald-400 font-semibold text-sm mt-0.5">
                              {c.subscription_price.toLocaleString('ru-RU')} AED <span className="text-slate-500 font-normal">/ мес</span>
                            </div>
                          )}
                        </div>
                        <ClientActions c={c} openEdit={openEdit} deleteConfirm={deleteConfirm} setDeleteConfirm={setDeleteConfirm} handleDelete={handleDelete} compact />
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <Calendar size={13} className="text-slate-500" />
                          <span className={`text-sm font-medium ${urgent ? 'text-red-400' : 'text-slate-300'}`}>{formatDate(c.subscription_end_date)}</span>
                        </div>
                        <SubscriptionBadge endDate={c.subscription_end_date} />
                      </div>
                      {c.sources_link && (
                        <a href={c.sources_link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 mt-2">
                          <ExternalLink size={12} /> Исходники
                        </a>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-700">
              <h2 className="text-lg font-semibold text-white">
                {editingId ? 'Редактировать клиента' : 'Добавить клиента'}
              </h2>
              <button onClick={closeModal} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="px-6 py-5 space-y-5">
              {/* Tariff type switcher */}
              <div>
                <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">Тариф</label>
                <div className="flex gap-2">
                  {([['package', 'Пакет видео'], ['monthly', 'Ежемесячная подписка']] as [TariffType, string][]).map(([val, label]) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, tariff_type: val }))}
                      className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                        form.tariff_type === val
                          ? val === 'monthly'
                            ? 'bg-emerald-500/20 border border-emerald-500/50 text-emerald-400'
                            : 'bg-blue-500/20 border border-blue-500/50 text-blue-400'
                          : 'bg-slate-900 border border-slate-700 text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Client name */}
              <div>
                <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1.5">Имя клиента</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Например: Ксения"
                  className="w-full bg-slate-900 border border-slate-600 text-white placeholder-slate-500 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 transition-colors"
                  autoFocus
                />
              </div>

              {/* Package fields */}
              {form.tariff_type === 'package' && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1.5">Куплено видео</label>
                      <input
                        type="number"
                        min={0}
                        value={form.purchased}
                        onChange={e => setForm(f => ({ ...f, purchased: Number(e.target.value) }))}
                        className="w-full bg-slate-900 border border-slate-600 text-white rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1.5">Отснято</label>
                      <input
                        type="number"
                        min={0}
                        value={form.filmed}
                        onChange={e => setForm(f => ({ ...f, filmed: Number(e.target.value) }))}
                        className="w-full bg-slate-900 border border-slate-600 text-white rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 transition-colors"
                      />
                    </div>
                  </div>
                  <div className="bg-slate-900 rounded-lg px-4 py-3 flex items-center justify-between">
                    <span className="text-slate-400 text-sm">Остаток (авто)</span>
                    <span className={`text-lg font-bold ${form.purchased - form.filmed < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                      {form.purchased - form.filmed}
                    </span>
                  </div>
                </>
              )}

              {/* Monthly subscription fields */}
              {form.tariff_type === 'monthly' && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1.5">Дата окончания подписки</label>
                    <input
                      type="date"
                      value={form.subscription_end_date}
                      onChange={e => setForm(f => ({ ...f, subscription_end_date: e.target.value }))}
                      className="w-full bg-slate-900 border border-slate-600 text-white rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                      style={{ colorScheme: 'dark' }}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1.5">Стоимость в месяц (AED)</label>
                    <input
                      type="number"
                      min={0}
                      inputMode="numeric"
                      value={form.subscription_price}
                      onChange={e => setForm(f => ({ ...f, subscription_price: e.target.value }))}
                      placeholder="10800"
                      className="w-full bg-slate-900 border border-slate-600 text-white placeholder-slate-500 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                    />
                  </div>
                  {form.subscription_end_date && (
                    <div className={`rounded-lg px-4 py-3 flex items-center justify-between ${
                      (daysUntil(form.subscription_end_date) ?? 99) <= 3
                        ? 'bg-red-500/10 border border-red-500/30'
                        : 'bg-emerald-500/10 border border-emerald-500/30'
                    }`}>
                      <span className="text-slate-400 text-sm">Статус подписки</span>
                      <SubscriptionBadge endDate={form.subscription_end_date} />
                    </div>
                  )}
                </>
              )}

              {/* Sources link (both tariff types) */}
              <div>
                <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1.5">Ссылка на исходники</label>
                <input
                  type="url"
                  value={form.sources_link}
                  onChange={e => setForm(f => ({ ...f, sources_link: e.target.value }))}
                  placeholder="https://drive.google.com/..."
                  className="w-full bg-slate-900 border border-slate-600 text-white placeholder-slate-500 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-700 flex gap-3 justify-end">
              <button onClick={closeModal} className="px-4 py-2 text-sm rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors">
                Отмена
              </button>
              <button
                onClick={handleSave}
                disabled={!form.name.trim() || saving}
                className="px-5 py-2 text-sm rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium transition-colors flex items-center gap-2"
              >
                {saving && <RefreshCw size={13} className="animate-spin" />}
                {editingId ? 'Сохранить' : 'Добавить'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ClientActions({
  c, openEdit, deleteConfirm, setDeleteConfirm, handleDelete, compact = false,
}: {
  c: ShootingClientRow;
  openEdit: (c: ShootingClientRow) => void;
  deleteConfirm: string | null;
  setDeleteConfirm: (id: string | null) => void;
  handleDelete: (id: string) => void;
  compact?: boolean;
}) {
  if (deleteConfirm === c.id) {
    return (
      <div className="flex items-center gap-1">
        <button onClick={() => handleDelete(c.id)} className="px-2 py-1 text-xs rounded bg-red-700 hover:bg-red-600 text-white transition-colors">
          Удалить
        </button>
        <button onClick={() => setDeleteConfirm(null)} className="px-2 py-1 text-xs rounded bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors">
          Отмена
        </button>
      </div>
    );
  }
  return (
    <div className={`flex items-center ${compact ? 'gap-1' : 'justify-end gap-2'}`}>
      <button onClick={() => openEdit(c)} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors" title="Редактировать">
        <Pencil size={14} />
      </button>
      <button onClick={() => setDeleteConfirm(c.id)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-700 transition-colors" title="Удалить">
        <Trash2 size={14} />
      </button>
    </div>
  );
}

export default ShootingsAccountingPanel;
