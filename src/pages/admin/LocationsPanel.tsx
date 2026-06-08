import { useState } from 'react';
import { MapPin, Copy, Check, Plus, Pencil, Trash2, X, RefreshCw, ExternalLink } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useData, LocationRow } from '../../context/DataContext';

const emptyForm = () => ({
  name: '',
  description: '',
  image_url: '',
  maps_url: '',
});

export default function LocationsPanel() {
  const { locations, locationsLoading, refetchLocations, setLocations } = useData();

  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const openAdd = () => {
    setEditingId(null);
    setForm(emptyForm());
    setModalOpen(true);
  };

  const openEdit = (loc: LocationRow) => {
    setEditingId(loc.id);
    setForm({ name: loc.name, description: loc.description, image_url: loc.image_url, maps_url: loc.maps_url });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingId(null);
    setForm(emptyForm());
    setError(null);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    setError(null);

    if (editingId) {
      const { error: err } = await supabase
        .from('locations')
        .update({ name: form.name, description: form.description, image_url: form.image_url, maps_url: form.maps_url })
        .eq('id', editingId);
      if (err) { setError(err.message); setSaving(false); return; }
    } else {
      const { error: err } = await supabase
        .from('locations')
        .insert({ name: form.name, description: form.description, image_url: form.image_url, maps_url: form.maps_url });
      if (err) { setError(err.message); setSaving(false); return; }
    }

    setSaving(false);
    closeModal();
    await refetchLocations();
  };

  const handleDelete = async (id: string) => {
    const { error: err } = await supabase.from('locations').delete().eq('id', id);
    if (err) { setError(err.message); return; }
    setDeleteConfirm(null);
    setLocations(prev => prev.filter(l => l.id !== id));
  };

  const handleCopy = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // fallback for older browsers
      const el = document.createElement('textarea');
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200 p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Локации</h1>
          <p className="text-slate-400 text-sm mt-1">Места для съёмок с адресами и описаниями</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => refetchLocations()}
            className="p-2.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
            title="Обновить"
          >
            <RefreshCw size={16} className={locationsLoading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={openAdd}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors"
          >
            <Plus size={16} />
            Добавить локацию
          </button>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="mb-6 bg-red-900/40 border border-red-700 text-red-300 rounded-lg px-4 py-3 text-sm flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-200 ml-4"><X size={14} /></button>
        </div>
      )}

      {/* Content */}
      {locationsLoading ? (
        <div className="flex items-center justify-center py-24 text-slate-500">
          <RefreshCw size={22} className="animate-spin mr-3" />
          <span>Загрузка...</span>
        </div>
      ) : locations.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-slate-500">
          <div className="w-16 h-16 rounded-2xl bg-slate-800 flex items-center justify-center mb-4">
            <MapPin size={28} className="text-slate-600" />
          </div>
          <p className="text-base font-medium text-slate-400">Нет локаций</p>
          <p className="text-sm mt-1">Нажмите «Добавить локацию», чтобы начать</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {locations.map(loc => (
            <div
              key={loc.id}
              className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden hover:border-slate-600 transition-colors group"
            >
              {/* Image */}
              <div className="relative h-44 bg-slate-700 overflow-hidden">
                {loc.image_url ? (
                  <img
                    src={loc.image_url}
                    alt={loc.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <MapPin size={36} className="text-slate-600" />
                  </div>
                )}
                {/* Action buttons overlay */}
                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => openEdit(loc)}
                    className="p-1.5 rounded-lg bg-slate-900/80 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors backdrop-blur-sm"
                    title="Редактировать"
                  >
                    <Pencil size={13} />
                  </button>
                  {deleteConfirm === loc.id ? (
                    <>
                      <button
                        onClick={() => handleDelete(loc.id)}
                        className="px-2 py-1 text-xs rounded-lg bg-red-700/90 hover:bg-red-600 text-white transition-colors backdrop-blur-sm"
                      >
                        Удалить
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(null)}
                        className="p-1.5 rounded-lg bg-slate-900/80 text-slate-300 hover:text-white transition-colors backdrop-blur-sm"
                      >
                        <X size={13} />
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setDeleteConfirm(loc.id)}
                      className="p-1.5 rounded-lg bg-slate-900/80 text-slate-300 hover:text-red-400 transition-colors backdrop-blur-sm"
                      title="Удалить"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </div>

              {/* Card body */}
              <div className="p-4 space-y-3">
                <h3 className="font-semibold text-white text-sm leading-tight">{loc.name}</h3>

                {loc.description && (
                  <p className="text-slate-400 text-xs leading-relaxed line-clamp-3">{loc.description}</p>
                )}

                {loc.maps_url && (
                  <div className="flex items-center gap-2 pt-1">
                    <a
                      href={loc.maps_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors min-w-0 flex-1 truncate"
                    >
                      <MapPin size={12} className="flex-shrink-0" />
                      <span className="truncate">Google Maps</span>
                      <ExternalLink size={11} className="flex-shrink-0" />
                    </a>
                    <button
                      onClick={() => handleCopy(loc.maps_url, loc.id)}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all flex-shrink-0 ${
                        copiedId === loc.id
                          ? 'bg-emerald-900/50 text-emerald-400 border border-emerald-700/50'
                          : 'bg-slate-700 hover:bg-slate-600 text-slate-300 border border-slate-600'
                      }`}
                      title="Копировать ссылку"
                    >
                      {copiedId === loc.id ? (
                        <>
                          <Check size={11} />
                          Скопировано
                        </>
                      ) : (
                        <>
                          <Copy size={11} />
                          Копировать
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-700">
              <h2 className="text-lg font-semibold text-white">
                {editingId ? 'Редактировать локацию' : 'Добавить локацию'}
              </h2>
              <button onClick={closeModal} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              {error && (
                <div className="bg-red-900/40 border border-red-700 text-red-300 rounded-lg px-3 py-2 text-sm">{error}</div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1.5">
                  Название локации <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Например: Студия на Марьина Роща"
                  className="w-full bg-slate-900 border border-slate-600 text-white placeholder-slate-500 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1.5">URL фотографии</label>
                <input
                  type="url"
                  value={form.image_url}
                  onChange={e => setForm(f => ({ ...f, image_url: e.target.value }))}
                  placeholder="https://images.pexels.com/..."
                  className="w-full bg-slate-900 border border-slate-600 text-white placeholder-slate-500 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 transition-colors"
                />
                {form.image_url && (
                  <div className="mt-2 rounded-lg overflow-hidden h-28 bg-slate-700">
                    <img
                      src={form.image_url}
                      alt="preview"
                      className="w-full h-full object-cover"
                      onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1.5">Описание</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Опишите особенности локации, оборудование, условия..."
                  rows={3}
                  className="w-full bg-slate-900 border border-slate-600 text-white placeholder-slate-500 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 transition-colors resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1.5">Ссылка на Google Maps</label>
                <input
                  type="url"
                  value={form.maps_url}
                  onChange={e => setForm(f => ({ ...f, maps_url: e.target.value }))}
                  placeholder="https://maps.google.com/..."
                  className="w-full bg-slate-900 border border-slate-600 text-white placeholder-slate-500 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-700 flex gap-3 justify-end">
              <button
                onClick={closeModal}
                className="px-4 py-2 text-sm rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors"
              >
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
