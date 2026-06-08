import { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, Pencil, X, Upload, Save, Image, ExternalLink, ChevronUp, ChevronDown, GripVertical } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface PresentationCase {
  id: string;
  name: string;
  instagram_url: string;
  image_url: string;
  created_at: string;
}

interface PresentationContent {
  id: string;
  section_key: string;
  title: string;
  subtitle: string;
  description: string;
  image_url: string;
  icon_url: string;
  sort_order: number;
}

const SECTIONS = [
  { key: 'intro', label: 'Главный экран', defaultOrder: 0 },
  { key: 'cinema_grade', label: 'Cinema Grade', defaultOrder: 1 },
  { key: 'editors', label: 'Монтажеры', defaultOrder: 2 },
  { key: 'unlimited', label: 'Unlimited', defaultOrder: 3 },
  { key: 'platform', label: 'Платформа', defaultOrder: 4 },
  { key: 'targeting', label: 'Таргетинг', defaultOrder: 5 },
  { key: 'payment', label: 'Оплата / CTA', defaultOrder: 6 },
  { key: 'speed', label: 'Машина / Скорость', defaultOrder: 7 },
  { key: 'mechanism', label: 'HR-Детокс', defaultOrder: 8 },
  { key: 'cases', label: 'Кейсы', defaultOrder: 9 },
  { key: 'pricing', label: 'Прайс', defaultOrder: 10 },
  { key: 'personal_videographer_bg', label: 'Личный бренд — Видеооператор (фон)', defaultOrder: 11 },
];

export default function AdminPresentation() {
  const [cases, setCases] = useState<PresentationCase[]>([]);
  const [content, setContent] = useState<PresentationContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'content' | 'cases' | 'order'>('content');
  const [sortedSections, setSortedSections] = useState<{ key: string; label: string; sort_order: number }[]>([]);
  const [reordering, setReordering] = useState(false);

  const [caseModal, setCaseModal] = useState(false);
  const [editingCase, setEditingCase] = useState<PresentationCase | null>(null);
  const [caseForm, setCaseForm] = useState({ name: '', instagram_url: '', image_url: '' });
  const [caseUploading, setCaseUploading] = useState(false);

  const [savingSection, setSavingSection] = useState<string | null>(null);
  const [contentForms, setContentForms] = useState<Record<string, { title: string; subtitle: string; description: string; image_url: string; icon_url: string }>>({});
  const [uploadingSection, setUploadingSection] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const sectionFileRef = useRef<HTMLInputElement>(null);
  const [uploadTarget, setUploadTarget] = useState<{ section: string; field: 'image_url' | 'icon_url' } | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    const [casesRes, contentRes] = await Promise.all([
      supabase.from('presentation_cases').select('*').order('created_at', { ascending: true }),
      supabase.from('presentation_content').select('*'),
    ]);
    if (casesRes.data) setCases(casesRes.data);
    if (contentRes.data) {
      setContent(contentRes.data);
      const forms: typeof contentForms = {};
      for (const item of contentRes.data) {
        forms[item.section_key] = {
          title: item.title,
          subtitle: item.subtitle,
          description: item.description,
          image_url: item.image_url,
          icon_url: item.icon_url,
        };
      }
      setContentForms(forms);

      const orderMap: Record<string, number> = {};
      for (const item of contentRes.data) {
        orderMap[item.section_key] = item.sort_order ?? 0;
      }
      const sorted = SECTIONS.map(s => ({
        key: s.key,
        label: s.label,
        sort_order: orderMap[s.key] ?? s.defaultOrder,
      })).sort((a, b) => a.sort_order - b.sort_order);
      setSortedSections(sorted);
    } else {
      setSortedSections(SECTIONS.map(s => ({ key: s.key, label: s.label, sort_order: s.defaultOrder })));
    }
    setLoading(false);
  }

  function getContentForm(key: string) {
    return contentForms[key] || { title: '', subtitle: '', description: '', image_url: '', icon_url: '' };
  }

  function updateContentForm(key: string, field: string, value: string) {
    setContentForms(prev => ({
      ...prev,
      [key]: { ...getContentForm(key), [field]: value },
    }));
  }

  async function saveSection(sectionKey: string) {
    setSavingSection(sectionKey);
    const form = getContentForm(sectionKey);
    const existing = content.find(c => c.section_key === sectionKey);

    if (existing) {
      await supabase
        .from('presentation_content')
        .update({ ...form, updated_at: new Date().toISOString() })
        .eq('id', existing.id);
    } else {
      await supabase
        .from('presentation_content')
        .insert({ section_key: sectionKey, ...form });
    }
    await fetchData();
    setSavingSection(null);
  }

  async function uploadFile(file: File, path: string): Promise<string | null> {
    const ext = file.name.split('.').pop();
    const fileName = `${path}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('yalla_assets').upload(fileName, file);
    if (error) return null;
    const { data } = supabase.storage.from('yalla_assets').getPublicUrl(fileName);
    return data.publicUrl;
  }

  async function handleSectionFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files?.[0] || !uploadTarget) return;
    setUploadingSection(uploadTarget.section);
    const url = await uploadFile(e.target.files[0], `presentation/${uploadTarget.section}`);
    if (url) {
      updateContentForm(uploadTarget.section, uploadTarget.field, url);
    }
    setUploadingSection(null);
    setUploadTarget(null);
    e.target.value = '';
  }

  async function handleCaseImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files?.[0]) return;
    setCaseUploading(true);
    const url = await uploadFile(e.target.files[0], 'presentation/cases');
    if (url) {
      setCaseForm(prev => ({ ...prev, image_url: url }));
    }
    setCaseUploading(false);
    e.target.value = '';
  }

  async function saveCase() {
    if (!caseForm.name.trim()) return;
    if (editingCase) {
      await supabase
        .from('presentation_cases')
        .update(caseForm)
        .eq('id', editingCase.id);
    } else {
      await supabase
        .from('presentation_cases')
        .insert(caseForm);
    }
    closeCaseModal();
    await fetchData();
  }

  async function deleteCase(id: string) {
    await supabase.from('presentation_cases').delete().eq('id', id);
    setCases(prev => prev.filter(c => c.id !== id));
  }

  function openAddCase() {
    setEditingCase(null);
    setCaseForm({ name: '', instagram_url: '', image_url: '' });
    setCaseModal(true);
  }

  function openEditCase(c: PresentationCase) {
    setEditingCase(c);
    setCaseForm({ name: c.name, instagram_url: c.instagram_url, image_url: c.image_url });
    setCaseModal(true);
  }

  function closeCaseModal() {
    setCaseModal(false);
    setEditingCase(null);
    setCaseForm({ name: '', instagram_url: '', image_url: '' });
  }

  async function moveSection(index: number, direction: 'up' | 'down') {
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= sortedSections.length) return;

    setReordering(true);
    const newList = [...sortedSections];
    const temp = newList[index];
    newList[index] = { ...newList[swapIndex], sort_order: index };
    newList[swapIndex] = { ...temp, sort_order: swapIndex };
    newList.sort((a, b) => a.sort_order - b.sort_order);
    setSortedSections(newList);

    const updates = newList.map((item, i) => ({
      section_key: item.key,
      sort_order: i,
    }));

    for (const u of updates) {
      const existing = content.find(c => c.section_key === u.section_key);
      if (existing) {
        await supabase
          .from('presentation_content')
          .update({ sort_order: u.sort_order })
          .eq('id', existing.id);
      } else {
        await supabase
          .from('presentation_content')
          .upsert({ section_key: u.section_key, sort_order: u.sort_order, title: '', subtitle: '', description: '', image_url: '', icon_url: '' }, { onConflict: 'section_key' });
      }
    }
    setReordering(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab('content')}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
            activeTab === 'content'
              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
              : 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10'
          }`}
        >
          Контент секций
        </button>
        <button
          onClick={() => setActiveTab('cases')}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
            activeTab === 'cases'
              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
              : 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10'
          }`}
        >
          Кейсы ({cases.length})
        </button>
        <button
          onClick={() => setActiveTab('order')}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
            activeTab === 'order'
              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
              : 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10'
          }`}
        >
          Порядок секций
        </button>
      </div>

      {/* Content sections tab */}
      {activeTab === 'content' && (
        <div className="space-y-4">
          {SECTIONS.map(section => {
            const form = getContentForm(section.key);
            return (
              <div key={section.key} className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">{section.label}</h3>
                  <button
                    onClick={() => saveSection(section.key)}
                    disabled={savingSection === section.key}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:bg-amber-500/30 transition-all disabled:opacity-50"
                  >
                    <Save size={12} />
                    {savingSection === section.key ? 'Сохранение...' : 'Сохранить'}
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-gray-500 uppercase tracking-wider mb-1">Заголовок</label>
                    <input
                      type="text"
                      value={form.title}
                      onChange={e => updateContentForm(section.key, 'title', e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-amber-500/50"
                      placeholder="Заголовок секции"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-gray-500 uppercase tracking-wider mb-1">Подзаголовок</label>
                    <input
                      type="text"
                      value={form.subtitle}
                      onChange={e => updateContentForm(section.key, 'subtitle', e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-amber-500/50"
                      placeholder="Подзаголовок"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-[11px] text-gray-500 uppercase tracking-wider mb-1">Описание</label>
                    <textarea
                      value={form.description}
                      onChange={e => updateContentForm(section.key, 'description', e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-amber-500/50 resize-none"
                      rows={2}
                      placeholder="Описание / текст секции"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-gray-500 uppercase tracking-wider mb-1">Изображение</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={form.image_url}
                        onChange={e => updateContentForm(section.key, 'image_url', e.target.value)}
                        className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-amber-500/50"
                        placeholder="URL или загрузите"
                      />
                      <button
                        onClick={() => { setUploadTarget({ section: section.key, field: 'image_url' }); sectionFileRef.current?.click(); }}
                        disabled={uploadingSection === section.key}
                        className="p-2 rounded-lg bg-white/5 border border-white/10 text-gray-400 hover:text-amber-400 hover:border-amber-500/30 transition-all"
                      >
                        {uploadingSection === section.key ? <div className="w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" /> : <Upload size={14} />}
                      </button>
                    </div>
                    {form.image_url && (
                      <img src={form.image_url} alt="" className="mt-2 w-16 h-16 rounded-lg object-cover border border-white/10" />
                    )}
                  </div>
                  <div>
                    <label className="block text-[11px] text-gray-500 uppercase tracking-wider mb-1">Иконка</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={form.icon_url}
                        onChange={e => updateContentForm(section.key, 'icon_url', e.target.value)}
                        className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-amber-500/50"
                        placeholder="URL иконки"
                      />
                      <button
                        onClick={() => { setUploadTarget({ section: section.key, field: 'icon_url' }); sectionFileRef.current?.click(); }}
                        disabled={uploadingSection === section.key}
                        className="p-2 rounded-lg bg-white/5 border border-white/10 text-gray-400 hover:text-amber-400 hover:border-amber-500/30 transition-all"
                      >
                        <Image size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Cases tab */}
      {activeTab === 'cases' && (
        <div className="space-y-4">
          <button
            onClick={openAddCase}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:bg-amber-500/30 transition-all text-sm font-semibold"
          >
            <Plus size={14} /> Добавить кейс
          </button>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {cases.map(c => (
              <div key={c.id} className="rounded-xl border border-white/10 bg-white/[0.02] p-4 flex items-center gap-3">
                {c.image_url ? (
                  <img src={c.image_url} alt={c.name} className="w-12 h-12 rounded-full object-cover border border-white/10 flex-shrink-0" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 font-bold text-sm flex-shrink-0">
                    {c.name.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{c.name}</p>
                  {c.instagram_url && (
                    <a href={c.instagram_url} target="_blank" rel="noopener noreferrer" className="text-[11px] text-amber-400/70 hover:text-amber-400 flex items-center gap-1">
                      <ExternalLink size={10} /> Instagram
                    </a>
                  )}
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <button onClick={() => openEditCase(c)} className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-all">
                    <Pencil size={13} />
                  </button>
                  <button onClick={() => deleteCase(c.id)} className="p-1.5 rounded-lg hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition-all">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {cases.length === 0 && (
            <p className="text-center text-gray-500 text-sm py-8">Кейсы еще не добавлены</p>
          )}
        </div>
      )}

      {/* Order tab */}
      {activeTab === 'order' && (
        <div className="space-y-2">
          <p className="text-xs text-gray-500 mb-4">Перемещайте секции стрелками для изменения порядка на странице презентации</p>
          {sortedSections.map((section, index) => (
            <div
              key={section.key}
              className="flex items-center gap-3 px-4 py-3 rounded-xl border border-white/10 bg-white/[0.02] transition-all"
              style={{ opacity: reordering ? 0.7 : 1 }}
            >
              <GripVertical size={14} className="text-gray-600 flex-shrink-0" />
              <span className="text-xs font-bold text-gray-500 w-6">{index + 1}</span>
              <span className="flex-1 text-sm font-semibold text-white">{section.label}</span>
              <div className="flex gap-1 flex-shrink-0">
                <button
                  onClick={() => moveSection(index, 'up')}
                  disabled={index === 0 || reordering}
                  className="p-1.5 rounded-lg border border-white/10 text-gray-400 hover:text-amber-400 hover:border-amber-500/30 hover:bg-amber-500/10 transition-all disabled:opacity-20 disabled:cursor-not-allowed"
                >
                  <ChevronUp size={14} />
                </button>
                <button
                  onClick={() => moveSection(index, 'down')}
                  disabled={index === sortedSections.length - 1 || reordering}
                  className="p-1.5 rounded-lg border border-white/10 text-gray-400 hover:text-amber-400 hover:border-amber-500/30 hover:bg-amber-500/10 transition-all disabled:opacity-20 disabled:cursor-not-allowed"
                >
                  <ChevronDown size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Hidden file inputs */}
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleCaseImageUpload} />
      <input ref={sectionFileRef} type="file" accept="image/*" className="hidden" onChange={handleSectionFileUpload} />

      {/* Case modal */}
      {caseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0d1117] p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">{editingCase ? 'Редактировать кейс' : 'Новый кейс'}</h3>
              <button onClick={closeCaseModal} className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400">
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] text-gray-500 uppercase tracking-wider mb-1">Название компании</label>
                <input
                  type="text"
                  value={caseForm.name}
                  onChange={e => setCaseForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-amber-500/50"
                  placeholder="Название"
                />
              </div>
              <div>
                <label className="block text-[11px] text-gray-500 uppercase tracking-wider mb-1">Instagram URL</label>
                <input
                  type="text"
                  value={caseForm.instagram_url}
                  onChange={e => setCaseForm(prev => ({ ...prev, instagram_url: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-amber-500/50"
                  placeholder="https://instagram.com/..."
                />
              </div>
              <div>
                <label className="block text-[11px] text-gray-500 uppercase tracking-wider mb-1">Фото / Аватар</label>
                <div className="flex items-center gap-3">
                  {caseForm.image_url ? (
                    <img src={caseForm.image_url} alt="" className="w-14 h-14 rounded-full object-cover border border-white/10" />
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-500">
                      <Image size={18} />
                    </div>
                  )}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={caseUploading}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-gray-400 hover:text-amber-400 hover:border-amber-500/30 transition-all text-xs font-semibold"
                  >
                    {caseUploading ? <div className="w-3 h-3 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" /> : <Upload size={12} />}
                    {caseUploading ? 'Загрузка...' : 'Загрузить'}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button onClick={closeCaseModal} className="flex-1 py-2.5 rounded-lg border border-white/10 text-gray-400 text-sm font-semibold hover:bg-white/5 transition-all">
                Отмена
              </button>
              <button
                onClick={saveCase}
                disabled={!caseForm.name.trim()}
                className="flex-1 py-2.5 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30 text-sm font-semibold hover:bg-amber-500/30 transition-all disabled:opacity-40"
              >
                {editingCase ? 'Сохранить' : 'Добавить'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
