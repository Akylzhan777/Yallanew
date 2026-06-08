import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import ManualTaskModal from '../../components/ManualTaskModal';
import { getDeadlineStatus } from '../../lib/deadlineUtils';
import { Calendar, Check, Search } from 'lucide-react';
import {
  useData,
  EditorRow,
  VideoUnitRow,
} from '../../context/DataContext';

// Re-export types so existing importers still work
export type { EditorRow, VideoUnitRow };

function AdminLoader() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
      <div className="admin-spinner" />
    </div>
  );
}

interface Props {
  /** When true, hides the CEO finance block and admin-only automation buttons */
  isManager?: boolean;
}

export default function EditorsPanel({ isManager = false }: Props) {
  // ── Global data (shared between /admin and /manager) ──────────────────────
  const {
    editors,
    activeVideos,
    completedVideos,
    allCompletedVideos,
    totalDebt,
    editorsLoading,
    videosLoading,
    refetchEditors,
    refetchVideos,
    setActiveVideos,
  } = useData();

  const loading = editorsLoading || videosLoading;

  // ── Local UI state only (no data lists here) ──────────────────────────────
  const [showAddModal, setShowAddModal] = useState(false);
  const [showManualTaskModal, setShowManualTaskModal] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newWhatsapp, setNewWhatsapp] = useState('');
  const [adding, setAdding] = useState(false);
  const [toast, setToast] = useState('');
  const [sendingReminder, setSendingReminder] = useState<string | null>(null);
  const [assignSelections, setAssignSelections] = useState<Record<string, string>>({});
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [prioritizingId, setPrioritizingId] = useState<string | null>(null);
  const [editingEditor, setEditingEditor] = useState<EditorRow | null>(null);
  const [editUsername, setEditUsername] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editWhatsapp, setEditWhatsapp] = useState('');
  const [editManualAdjustment, setEditManualAdjustment] = useState<number>(0);
  const [saving, setSaving] = useState(false);
  const [automationLoading, setAutomationLoading] = useState<string | null>(null);
  const [deadlineEdits, setDeadlineEdits] = useState<Record<string, string>>({});
  const [savingDeadline, setSavingDeadline] = useState<string | null>(null);
  const [videoSearchQuery, setVideoSearchQuery] = useState('');
  const [videoEditorFilter, setVideoEditorFilter] = useState('');
  const [videoView, setVideoView] = useState<'table' | 'kanban'>('table');
  const [editingTask, setEditingTask] = useState<VideoUnitRow | null>(null);
  const [editTaskScript, setEditTaskScript] = useState('');
  const [editTaskVideoLink, setEditTaskVideoLink] = useState('');
  const [editTaskCoverLink, setEditTaskCoverLink] = useState('');
  const [savingTask, setSavingTask] = useState(false);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 4000); };

  // ── Mutations (write to Supabase, then trigger global refetch) ────────────

  const updateDeadline = async (videoId: string, rawValue: string) => {
    setSavingDeadline(videoId);
    try {
      const deadline = rawValue ? new Date(rawValue).toISOString() : null;
      const { error } = await supabase.from('video_units').update({ deadline }).eq('id', videoId);
      if (error) throw error;
      // Optimistic local update via global setter
      setActiveVideos(prev => prev.map(v => v.id === videoId ? { ...v, deadline } : v));
      setDeadlineEdits(prev => { const next = { ...prev }; delete next[videoId]; return next; });
      showToast(deadline ? 'Дедлайн обновлен' : 'Дедлайн удалён');
    } catch (err: any) {
      showToast('Ошибка: ' + (err?.message ?? 'неизвестная ошибка'));
    } finally {
      setSavingDeadline(null);
    }
  };

  const runAutomation = async (action: string) => {
    setAutomationLoading(action);
    try {
      const { data, error } = await supabase.functions.invoke('editor-automations', { body: { action } });
      const reason = data?.reason ?? data?.error ?? error?.message ?? 'неизвестная ошибка';
      if (error && !data) showToast('Ошибка: ' + reason);
      else if (data && !data.ok) showToast('Инфо: ' + reason);
      else if (action === 'check_deadlines') showToast(`Дедлайны проверены: обработано ${data.processed ?? 0} задач`);
      else if (action === 'broadcast_unassigned') {
        if (data.pendingCount === 0) showToast('Свободных задач нет — рассылка не нужна');
        else showToast(`Рассылка отправлена ${data.sent ?? 0} монтажерам (${data.pendingCount} задач)`);
      } else if (action === 'broadcast_leaderboard') {
        showToast(`Рейтинг разослан ${data.sent ?? 0} монтажерам. Лидер: ${data.leaderName} (${data.taskCount} видео)`);
      }
    } catch (e) { showToast('Ошибка: ' + String(e)); }
    finally { setAutomationLoading(null); }
  };

  const handleAddEditor = async () => {
    const u = newUsername.trim(); const p = newPassword.trim(); const w = newWhatsapp.trim();
    if (!u || !p) { showToast('Заполните название и пароль'); return; }
    if (p.length < 6) { showToast('Пароль должен быть не менее 6 символов'); return; }
    setAdding(true);
    const { error } = await supabase.from('editor_balances').insert({ editor_name: u, password: p, balance: 0, whatsapp_number: w || null });
    if (error) showToast('Ошибка: ' + error.message);
    else {
      showToast(`Монтажер "${u}" добавлен`);
      setNewUsername(''); setNewPassword(''); setNewWhatsapp(''); setShowAddModal(false);
      await refetchEditors();
    }
    setAdding(false);
  };

  const statusLabel = (status: string) => ({ pending: 'Свободный', in_progress: 'В работе', review: 'На проверке', completed: 'Готово' }[status] || status);
  const statusColor = (status: string) => ({ pending: '#94A3B8', in_progress: '#F59E0B', review: '#3B82F6', completed: '#00C48C' }[status] || '#8F90A6');

  const approveVideo = async (id: string) => {
    const { error } = await supabase.from('video_units').update({ editing_status: 'completed' }).eq('id', id);
    if (error) showToast('Ошибка: ' + error.message);
    else { showToast('Видео одобрено!'); await refetchVideos(); }
  };

  const sendForRevision = async (id: string) => {
    const { error } = await supabase.from('video_units').update({ editing_status: 'in_progress' }).eq('id', id);
    if (error) showToast('Ошибка: ' + error.message);
    else { showToast('Отправлено на доработку'); await refetchVideos(); }
  };

  const deleteTask = async (id: string) => {
    if (!window.confirm('Вы уверены, что хотите удалить эту задачу?')) return;
    setDeletingId(id);
    const { error: deleteErr } = await supabase.from('video_units').delete().eq('id', id);
    if (deleteErr) { showToast('Ошибка удаления: ' + deleteErr.message); setDeletingId(null); return; }
    setActiveVideos(prev => prev.filter(v => v.id !== id));
    showToast('Задача удалена');
    setDeletingId(null);
  };

  const openEditTask = (vid: VideoUnitRow) => {
    setEditingTask(vid); setEditTaskScript(vid.script || ''); setEditTaskVideoLink(vid.video_link || ''); setEditTaskCoverLink(vid.final_cover_link || '');
  };

  const saveEditTask = async () => {
    if (!editingTask) return;
    setSavingTask(true);
    try {
      const { error } = await supabase.from('video_units')
        .update({ script: editTaskScript, video_link: editTaskVideoLink, final_cover_link: editTaskCoverLink })
        .eq('id', editingTask.id);
      if (error) throw error;
      setActiveVideos(prev => prev.map(v => v.id === editingTask.id
        ? { ...v, script: editTaskScript, video_link: editTaskVideoLink, final_cover_link: editTaskCoverLink }
        : v));
      showToast('Задача обновлена'); setEditingTask(null);
    } catch (err: any) { showToast('Ошибка: ' + (err.message || 'Не удалось сохранить')); }
    finally { setSavingTask(false); }
  };

  const togglePriority = async (id: string, current: boolean) => {
    setPrioritizingId(id);
    const { error } = await supabase.from('video_units').update({ is_priority: !current }).eq('id', id);
    if (error) showToast('Ошибка: ' + error.message);
    else setActiveVideos(prev => prev.map(v => v.id === id ? { ...v, is_priority: !current } : v));
    setPrioritizingId(null);
  };

  const assignTask = async (videoId: string) => {
    const editorName = assignSelections[videoId];
    if (!editorName) { showToast('Выберите монтажера'); return; }
    setAssigningId(videoId);
    const taskToAssign = activeVideos.find(v => v.id === videoId);
    const { error: updateError } = await supabase.from('video_units')
      .update({ editor_name: editorName, editing_status: 'in_progress', claimed_at: new Date().toISOString() })
      .eq('id', videoId);
    if (updateError) { showToast('Ошибка назначения: ' + updateError.message); setAssigningId(null); return; }
    showToast(`Задача назначена ${editorName}`);
    const editorRow = editors.find(e => e.editor_name === editorName);
    if (editorRow?.whatsapp_number) {
      const taskName = taskToAssign?.task_type ?? taskToAssign?.id ?? 'задача';
      supabase.functions.invoke('editor-notify', { body: { phone: editorRow.whatsapp_number, type: 'NEW_TASK', taskName } }).catch(() => {});
    }
    setAssignSelections(prev => { const next = { ...prev }; delete next[videoId]; return next; });
    await refetchVideos();
    await refetchEditors();
    setAssigningId(null);
  };

  const openEditModal = (ed: EditorRow) => {
    setEditingEditor(ed); setEditUsername(ed.editor_name); setEditPassword(ed.password);
    setEditWhatsapp(ed.whatsapp_number ?? ''); setEditManualAdjustment(ed.manual_adjustment ?? 0);
  };

  const closeEditModal = () => { setEditingEditor(null); setEditUsername(''); setEditPassword(''); setEditWhatsapp(''); setEditManualAdjustment(0); };

  const handleEditEditor = async () => {
    if (!editingEditor) return;
    const newName = editUsername.trim(); const newPass = editPassword.trim(); const newWa = editWhatsapp.trim();
    if (!newName || !newPass) { showToast('Логин и пароль обязательны'); return; }
    setSaving(true);
    const oldName = editingEditor.editor_name;
    const nameChanged = newName !== oldName;
    if (nameChanged) {
      const { error: insertError } = await supabase.from('editor_balances').insert({
        editor_name: newName, balance: editingEditor.balance, password: newPass,
        whatsapp_number: newWa || null, manual_adjustment: editManualAdjustment, created_at: editingEditor.created_at,
      });
      if (insertError) { showToast('Ошибка переименования: ' + insertError.message); setSaving(false); return; }
      const { error: migrateError } = await supabase.from('video_units').update({ editor_name: newName }).eq('editor_name', oldName);
      if (migrateError) { showToast('Ошибка переноса задач: ' + migrateError.message); await supabase.from('editor_balances').delete().eq('editor_name', newName); setSaving(false); return; }
      const { error: deleteError } = await supabase.from('editor_balances').delete().eq('editor_name', oldName);
      if (deleteError) { showToast('Ошибка удаления старой записи: ' + deleteError.message); setSaving(false); return; }
      showToast(`Монтажер переименован: "${oldName}" → "${newName}"`);
    } else {
      const { error } = await supabase.from('editor_balances')
        .update({ password: newPass, whatsapp_number: newWa || null, manual_adjustment: editManualAdjustment })
        .eq('editor_name', oldName);
      if (error) { showToast('Ошибка сохранения: ' + error.message); setSaving(false); return; }
      showToast('Данные монтажера обновлены');
    }
    await refetchEditors();
    await refetchVideos();
    setSaving(false); closeEditModal();
  };

  if (loading) return <AdminLoader />;

  // ── Derived stats (computed from global store) ────────────────────────────

  const getEditorStats = (editorName: string) => {
    const active = activeVideos.filter(v => v.editor_name === editorName);
    const monthDone = completedVideos.filter(v => v.editor_name === editorName);
    return {
      inProgress: active.filter(v => v.editing_status === 'in_progress').length,
      review: active.filter(v => v.editing_status === 'review').length,
      completed: monthDone.length,
    };
  };

  const getMonthlyBalance = (editorName: string): number => {
    const now = new Date(); const year = now.getFullYear(); const month = now.getMonth();
    const rewards = completedVideos
      .filter(v => v.editor_name === editorName && v.updated_at)
      .filter(v => { const d = new Date(v.updated_at!); return d.getFullYear() === year && d.getMonth() === month; })
      .reduce((sum, v) => sum + (v.reward_amount ?? 0), 0);
    const penalties = completedVideos
      .filter(v => v.editor_name === editorName && v.claimed_at)
      .filter(v => { const d = new Date(v.claimed_at!); return d.getFullYear() === year && d.getMonth() === month; })
      .reduce((sum, v) => sum + (v.penalty_amount ?? 0), 0);
    const editor = editors.find(e => e.editor_name === editorName);
    return rewards - penalties + (editor?.manual_adjustment ?? 0);
  };

  const monthName = new Date().toLocaleString('ru-RU', { month: 'long', year: 'numeric' });
  const monthlyRevenue = allCompletedVideos.reduce((sum, v) => sum + ((v.clients?.is_barter ?? false) ? 0 : (v.client_price ?? 0)), 0);
  const monthlyPayouts = allCompletedVideos.reduce((sum, v) => sum + (v.reward_amount ?? 0) - (v.penalty_amount ?? 0), 0);
  const totalTasksThisMonth = allCompletedVideos.length;

  return (
    <div>
      {toast && <div className="admin-toast">{toast}</div>}

      {/* ── CEO Finance block (admin only) ── */}
      {!isManager && (
        <div style={{ background: 'linear-gradient(135deg, #0f1a2e 0%, #131929 100%)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: '24px 28px', marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#f1f5f9', margin: 0 }}>Финансы — {monthName}</h3>
            <span style={{ background: 'rgba(251,191,36,0.12)', border: '1px solid rgba(251,191,36,0.25)', borderRadius: 8, padding: '4px 12px', color: '#fbbf24', fontSize: '0.75rem', fontWeight: 700 }}>CEO</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
            <div style={{ background: 'rgba(0,196,140,0.06)', border: '1px solid rgba(0,196,140,0.18)', borderRadius: 12, padding: '16px 20px' }}>
              <div style={{ fontSize: '0.72rem', color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Выручка</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#00C48C', lineHeight: 1 }}>{monthlyRevenue.toLocaleString('ru-RU')}</div>
              <div style={{ fontSize: '0.8rem', color: '#00C48C', opacity: 0.7, marginTop: 4 }}>AED</div>
            </div>
            <div style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.18)', borderRadius: 12, padding: '16px 20px' }}>
              <div style={{ fontSize: '0.72rem', color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>ФОТ монтажеров</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#f87171', lineHeight: 1 }}>{monthlyPayouts.toLocaleString('ru-RU')}</div>
              <div style={{ fontSize: '0.8rem', color: '#f87171', opacity: 0.7, marginTop: 4 }}>₸ KZT</div>
            </div>
            <div style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.18)', borderRadius: 12, padding: '16px 20px' }}>
              <div style={{ fontSize: '0.72rem', color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Задач закрыто</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#60a5fa', lineHeight: 1 }}>{totalTasksThisMonth}</div>
              <div style={{ fontSize: '0.8rem', color: '#60a5fa', opacity: 0.7, marginTop: 4 }}>видео</div>
            </div>
            <div style={{ background: totalDebt > 0 ? 'rgba(239,68,68,0.06)' : 'rgba(0,196,140,0.06)', border: `1px solid ${totalDebt > 0 ? 'rgba(239,68,68,0.18)' : 'rgba(0,196,140,0.18)'}`, borderRadius: 12, padding: '16px 20px' }}>
              <div style={{ fontSize: '0.72rem', color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Дебиторка</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: totalDebt > 0 ? '#f87171' : '#00C48C', lineHeight: 1 }}>{totalDebt > 0 ? `-${totalDebt.toLocaleString('ru-RU')}` : '0'}</div>
              <div style={{ fontSize: '0.8rem', color: totalDebt > 0 ? '#f87171' : '#00C48C', opacity: 0.7, marginTop: 4 }}>AED</div>
            </div>
          </div>
          <div style={{ marginTop: 14, padding: '10px 14px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, fontSize: '0.78rem', color: '#6b7280' }}>
            Выручка отображается в AED (дирхамах). Бартер-клиенты не учитываются в выручке, но их задачи учитываются в ФОТ монтажеров. Данные за текущий месяц.
          </div>
        </div>
      )}

      {/* ── Editor list ── */}
      <div style={{ marginBottom: 40 }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff', marginBottom: 20 }}>Управление монтажерами</h3>
        <div className="flex flex-col sm:flex-row gap-3 justify-end mb-5">
          <button className="admin-btn-primary w-full sm:w-auto" onClick={() => setShowManualTaskModal(true)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <span style={{ fontSize: '1.2rem' }}>➕</span> Добавить задачу вручную
          </button>
          <button className="admin-btn-primary w-full sm:w-auto" onClick={() => setShowAddModal(true)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <span style={{ fontSize: '1.2rem' }}>➕</span> Добавить монтажера
          </button>
        </div>

        {editors.length === 0 ? (
          <div style={{ padding: '40px 20px', textAlign: 'center', color: '#8F90A6', background: '#1C1E26', borderRadius: 12, border: '1px solid #2C2F3A' }}>
            Нет монтажеров. Добавьте первого!
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
            {editors.map(ed => {
              const stats = getEditorStats(ed.editor_name);
              const monthlyBalance = getMonthlyBalance(ed.editor_name);
              return (
                <div key={ed.editor_name} style={{ background: '#1C1E26', border: '1px solid #2C2F3A', borderRadius: 12, padding: '20px', transition: 'all 0.3s ease' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = '#3B82F6'; e.currentTarget.style.boxShadow = '0 0 20px rgba(59,130,246,0.1)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = '#2C2F3A'; e.currentTarget.style.boxShadow = 'none'; }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 16 }}>
                    <div>
                      <h4 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff', margin: 0, marginBottom: 4 }}>{ed.editor_name}</h4>
                      {ed.whatsapp_number && (
                        <a href={`https://wa.me/${ed.whatsapp_number.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.85rem', color: '#25D366', textDecoration: 'none', fontWeight: 500 }}>{ed.whatsapp_number}</a>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                      <button onClick={() => openEditModal(ed)} title="Редактировать"
                        style={{ background: 'transparent', border: '1px solid #2C2F3A', borderRadius: 6, color: '#8F90A6', fontSize: '0.75rem', fontWeight: 600, padding: '4px 10px', cursor: 'pointer', transition: 'all 0.2s', whiteSpace: 'nowrap' }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = '#3B82F6'; e.currentTarget.style.color = '#3B82F6'; e.currentTarget.style.backgroundColor = '#3B82F610'; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = '#2C2F3A'; e.currentTarget.style.color = '#8F90A6'; e.currentTarget.style.backgroundColor = 'transparent'; }}
                      >✏️ Изменить</button>
                      {ed.whatsapp_number && (
                        <button disabled={sendingReminder === (ed as any).id}
                          onClick={async () => {
                            setSendingReminder((ed as any).id);
                            try {
                              const { data, error } = await supabase.functions.invoke('editor-notify', { body: { phone: ed.whatsapp_number, type: 'REMINDER' } });
                              if (error || (data && !data.ok)) setToast('Ошибка отправки: ' + (error?.message ?? data?.reason ?? 'неизвестная ошибка'));
                              else setToast('Уведомление успешно отправлено!');
                            } catch { setToast('Ошибка отправки уведомления.'); }
                            finally { setSendingReminder(null); setTimeout(() => setToast(''), 4000); }
                          }}
                          title="Отправить уведомление в WhatsApp"
                          style={{ background: sendingReminder === (ed as any).id ? '#25D36630' : '#25D36610', border: '1px solid #25D36644', borderRadius: 6, color: '#25D366', fontSize: '0.75rem', fontWeight: 600, padding: '4px 10px', cursor: 'pointer', transition: 'all 0.2s', whiteSpace: 'nowrap' }}
                          onMouseEnter={e => { e.currentTarget.style.borderColor = '#25D366'; e.currentTarget.style.backgroundColor = '#25D36622'; }}
                          onMouseLeave={e => { e.currentTarget.style.borderColor = '#25D36644'; e.currentTarget.style.backgroundColor = '#25D36610'; }}
                        >{sendingReminder === (ed as any).id ? 'Отправка...' : '📱 Напомнить'}</button>
                      )}
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.75rem', color: '#8F90A6', marginBottom: 4 }}>За месяц</div>
                        <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#00C48C' }}>{monthlyBalance.toLocaleString('ru-RU')}</div>
                        <div style={{ fontSize: '0.7rem', color: '#8F90A6' }}>₸</div>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                    <div style={{ padding: '12px', background: '#F59E0B18', border: '1px solid #F59E0B44', borderRadius: 8, textAlign: 'center' }}>
                      <div style={{ fontSize: '0.7rem', color: '#F59E0B', fontWeight: 700, marginBottom: 4 }}>⏳ В работе</div>
                      <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#F59E0B' }}>{stats.inProgress}</div>
                    </div>
                    <div style={{ padding: '12px', background: '#3B82F618', border: '1px solid #3B82F644', borderRadius: 8, textAlign: 'center' }}>
                      <div style={{ fontSize: '0.7rem', color: '#3B82F6', fontWeight: 700, marginBottom: 4 }}>🧐 На проверке</div>
                      <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#3B82F6' }}>{stats.review}</div>
                    </div>
                    <div style={{ padding: '12px', background: '#00C48C18', border: '1px solid #00C48C44', borderRadius: 8, textAlign: 'center' }}>
                      <div style={{ fontSize: '0.7rem', color: '#00C48C', fontWeight: 700, marginBottom: 4 }}>✅ Готово</div>
                      <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#00C48C' }}>{stats.completed}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Video tasks control ── */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#fff', margin: 0 }}>
            Контроль видео — Все активные задачи
            <span style={{ marginLeft: 8, fontSize: '0.75rem', fontWeight: 500, color: '#8F90A6', background: '#2C2F3A', borderRadius: 20, padding: '2px 10px' }}>
              {activeVideos.filter(v => {
                const q = videoSearchQuery.toLowerCase();
                return (!q || v.client_name.toLowerCase().includes(q) || (v.script || '').toLowerCase().includes(q))
                  && (!videoEditorFilter || v.editor_name === videoEditorFilter);
              }).length}
            </span>
          </h3>
          <div style={{ display: 'flex', background: '#161922', border: '1px solid #2C2F3A', borderRadius: 8, overflow: 'hidden' }}>
            {(['table', 'kanban'] as const).map(v => (
              <button key={v} onClick={() => setVideoView(v)}
                style={{ padding: '6px 16px', fontSize: '0.78rem', fontWeight: 600, border: 'none', cursor: 'pointer', transition: 'all 0.15s', background: videoView === v ? '#00C48C' : 'transparent', color: videoView === v ? '#000' : '#8F90A6' }}
              >{v === 'table' ? 'Таблица' : 'Доска'}</button>
            ))}
          </div>
        </div>

        {/* Search + filter */}
        <div className="flex flex-col md:flex-row gap-2.5 mb-3.5">
          <div style={{ position: 'relative' }} className="flex-1 min-w-0">
            <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#4B5063', pointerEvents: 'none' }} />
            <input type="text" placeholder="Поиск по клиенту или названию..." value={videoSearchQuery} onChange={e => setVideoSearchQuery(e.target.value)}
              className="w-full"
              style={{ background: '#1C1E26', border: '1px solid #2C2F3A', borderRadius: 8, padding: '7px 10px 7px 30px', color: '#fff', fontSize: '0.82rem', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box', transition: 'border-color 0.15s' }}
              onFocus={e => { e.currentTarget.style.borderColor = '#00C48C66'; }} onBlur={e => { e.currentTarget.style.borderColor = '#2C2F3A'; }}
            />
          </div>
          <select value={videoEditorFilter} onChange={e => setVideoEditorFilter(e.target.value)}
            className="w-full md:w-auto"
            style={{ background: '#1C1E26', border: '1px solid #2C2F3A', borderRadius: 8, padding: '7px 12px', color: videoEditorFilter ? '#fff' : '#8F90A6', fontSize: '0.82rem', fontFamily: 'inherit', cursor: 'pointer', outline: 'none', minWidth: 160 }}>
            <option value="">Все монтажеры</option>
            {editors.map(ed => <option key={ed.editor_name} value={ed.editor_name}>{ed.editor_name}</option>)}
          </select>
          {(videoSearchQuery || videoEditorFilter) && (
            <button onClick={() => { setVideoSearchQuery(''); setVideoEditorFilter(''); }}
              className="w-full md:w-auto"
              style={{ background: '#2C2F3A', border: '1px solid #3A3D4A', borderRadius: 8, padding: '7px 12px', color: '#8F90A6', fontSize: '0.78rem', cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap', transition: 'all 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.color = '#fff'; }} onMouseLeave={e => { e.currentTarget.style.color = '#8F90A6'; }}
            >Сбросить</button>
          )}
        </div>

        {/* TABLE VIEW */}
        {videoView === 'table' && (() => {
          const filtered = [...activeVideos].filter(v => {
            const q = videoSearchQuery.toLowerCase();
            return (!q || v.client_name.toLowerCase().includes(q) || (v.script || '').toLowerCase().includes(q))
              && (!videoEditorFilter || v.editor_name === videoEditorFilter);
          }).sort((a, b) => a.is_priority === b.is_priority ? 0 : a.is_priority ? -1 : 1);

          /* ── MOBILE CARDS (< md) ── */
          const mobileCards = (
            <div className="flex flex-col gap-3 md:hidden">
              {filtered.length === 0 ? (
                <div className="text-center py-10 text-sm" style={{ color: '#8F90A6', background: '#1C1E26', borderRadius: 12, border: '1px solid #2C2F3A' }}>Нет задач по фильтру</div>
              ) : filtered.map(vid => {
                const isOverdue = vid.editing_status === 'in_progress' && vid.claimed_at && !vid.deadline_penalty_applied && getDeadlineStatus(vid.claimed_at)?.isOverdue;
                const isPending = vid.editing_status === 'pending';
                const shortId = '#' + vid.id.slice(0, 5);
                const cardBorder = vid.is_priority ? '#EF444455' : isOverdue ? '#FF6B6B44' : '#2C2F3A';
                const cardBg = vid.is_priority ? '#EF44440A' : isOverdue ? '#FF6B6B06' : '#1C1E26';
                const savedVal = vid.deadline ? new Date(vid.deadline).toISOString().slice(0, 16) : '';
                const currentVal = deadlineEdits[vid.id] !== undefined ? deadlineEdits[vid.id] : savedVal;
                const isDirty = currentVal !== savedVal;
                const isSaving = savingDeadline === vid.id;
                return (
                  <div key={vid.id} className="rounded-xl p-4" style={{ background: cardBg, border: `1px solid ${cardBorder}` }}>

                    {/* Header row: priority star + ID/client + format badge */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-start gap-2 min-w-0">
                        <button onClick={() => togglePriority(vid.id, vid.is_priority)} disabled={prioritizingId === vid.id}
                          className="flex-shrink-0 mt-0.5"
                          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem', lineHeight: 1, opacity: prioritizingId === vid.id ? 0.4 : 1, filter: vid.is_priority ? 'none' : 'grayscale(1) opacity(0.3)', padding: 0 }}>⭐</button>
                        <div className="min-w-0">
                          <div className="font-mono mb-0.5" style={{ fontSize: '0.68rem', color: '#4B5063' }}>{shortId}</div>
                          <div className="font-bold leading-tight" style={{ fontSize: '0.92rem', color: isOverdue ? '#FF6B6B' : vid.is_priority ? '#FCA5A5' : '#fff', wordBreak: 'break-word' }}>{vid.client_name}</div>
                        </div>
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        {vid.task_type && <span style={{ fontSize: '0.62rem', fontWeight: 700, color: '#3B82F6', background: '#3B82F610', border: '1px solid #3B82F630', borderRadius: 4, padding: '2px 5px' }}>{vid.task_type}</span>}
                        {vid.video_format === 'horizontal'
                          ? <span style={{ fontSize: '0.62rem', fontWeight: 700, color: '#93C5FD', background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(96,165,250,0.3)', borderRadius: 4, padding: '2px 5px' }}>16:9</span>
                          : <span style={{ fontSize: '0.62rem', fontWeight: 700, color: '#a78bfa', background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.3)', borderRadius: 4, padding: '2px 5px' }}>9:16</span>}
                      </div>
                    </div>

                    {/* Script/title */}
                    {vid.script && (
                      <div className="mb-2 line-clamp-2" style={{ fontSize: '0.8rem', color: '#94A3B8', lineHeight: 1.45 }}>{vid.script}</div>
                    )}

                    {/* Editor + Status row */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-1.5">
                        <span style={{ fontSize: '0.75rem', color: '#8F90A6' }}>Монтажер:</span>
                        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#00C48C' }}>{vid.editor_name || <span style={{ color: '#4B5063' }}>Нет</span>}</span>
                      </div>
                      <span style={{ padding: '3px 8px', borderRadius: 5, fontSize: '0.7rem', fontWeight: 700, backgroundColor: isOverdue ? '#FF6B6B18' : `${statusColor(vid.editing_status)}18`, color: isOverdue ? '#FF6B6B' : statusColor(vid.editing_status), border: isOverdue ? '1px solid #FF6B6B44' : `1px solid ${statusColor(vid.editing_status)}44` }}>
                        {isOverdue ? '🔴 Просрочено' : statusLabel(vid.editing_status)}
                      </span>
                    </div>

                    {/* Deadline */}
                    <div className="mb-3">
                      <div className="mb-1" style={{ fontSize: '0.7rem', fontWeight: 600, color: '#8F90A6', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Дедлайн</div>
                      <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                          <Calendar size={11} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: currentVal ? '#F59E0B' : '#4B5063', pointerEvents: 'none', zIndex: 1 }} />
                          <input type="datetime-local" value={currentVal}
                            onChange={e => setDeadlineEdits(prev => ({ ...prev, [vid.id]: e.target.value }))}
                            onBlur={e => { if (isDirty) updateDeadline(vid.id, e.target.value); }}
                            disabled={isSaving}
                            className="w-full bg-[#161922] border border-gray-700 text-xs rounded-lg outline-none focus:border-yellow-500 transition-colors"
                            style={{ paddingLeft: 26, paddingRight: 8, paddingTop: 7, paddingBottom: 7, fontFamily: 'inherit', color: currentVal ? '#F59E0B' : '#4B5063', borderColor: isDirty ? '#F59E0B66' : undefined, opacity: isSaving ? 0.5 : 1, colorScheme: 'dark' }}
                          />
                        </div>
                        {isDirty && (
                          <button onClick={() => updateDeadline(vid.id, currentVal)} disabled={isSaving}
                            className="flex items-center justify-center rounded-lg transition-colors flex-shrink-0"
                            style={{ width: 32, height: 32, background: '#F59E0B18', border: '1px solid #F59E0B55', color: '#F59E0B', cursor: isSaving ? 'default' : 'pointer' }}>
                            {isSaving ? <span style={{ fontSize: 10 }}>...</span> : <Check size={13} />}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Links */}
                    {(vid.raw_video_link || vid.final_video_link || vid.final_cover_link) && (
                      <div className="grid grid-cols-2 gap-2 mb-3">
                        {vid.raw_video_link && (
                          <a href={vid.raw_video_link} target="_blank" rel="noopener noreferrer"
                            className="flex items-center justify-center gap-1 rounded-lg py-2 text-center font-semibold transition-colors"
                            style={{ fontSize: '0.75rem', color: '#3B82F6', background: '#3B82F610', border: '1px solid #3B82F644', textDecoration: 'none' }}>
                            Исходник
                          </a>
                        )}
                        {vid.final_video_link && (
                          <a href={vid.final_video_link} target="_blank" rel="noopener noreferrer"
                            className="flex items-center justify-center gap-1 rounded-lg py-2 text-center font-semibold transition-colors"
                            style={{ fontSize: '0.75rem', color: '#00C48C', background: '#00C48C10', border: '1px solid #00C48C44', textDecoration: 'none' }}>
                            Результат
                          </a>
                        )}
                        {vid.final_cover_link && (
                          <a href={vid.final_cover_link} target="_blank" rel="noopener noreferrer"
                            className="flex items-center justify-center gap-1 rounded-lg py-2 text-center font-semibold transition-colors"
                            style={{ fontSize: '0.75rem', color: '#F59E0B', background: '#F59E0B10', border: '1px solid #F59E0B44', textDecoration: 'none' }}>
                            Обложка
                          </a>
                        )}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex flex-col gap-2">
                      {isPending && (
                        <div className="flex gap-2">
                          <select value={assignSelections[vid.id] || ''} onChange={e => setAssignSelections(prev => ({ ...prev, [vid.id]: e.target.value }))}
                            className="flex-1"
                            style={{ background: '#161922', color: assignSelections[vid.id] ? '#fff' : '#8F90A6', border: '1px solid #2C2F3A', borderRadius: 8, padding: '8px 10px', fontSize: '0.8rem', fontFamily: 'inherit', cursor: 'pointer', outline: 'none' }}>
                            <option value="">— выбрать монтажера —</option>
                            {editors.map(ed => <option key={ed.editor_name} value={ed.editor_name}>{ed.editor_name}</option>)}
                          </select>
                          <button onClick={() => assignTask(vid.id)} disabled={!assignSelections[vid.id] || assigningId === vid.id}
                            className="flex-shrink-0 rounded-lg font-semibold transition-all"
                            style={{ fontSize: '0.8rem', color: assignSelections[vid.id] ? '#00C48C' : '#4B5063', padding: '8px 14px', border: `1px solid ${assignSelections[vid.id] ? '#00C48C44' : '#2C2F3A'}`, background: 'transparent', cursor: assignSelections[vid.id] ? 'pointer' : 'default' }}>
                            {assigningId === vid.id ? '...' : '✓'}
                          </button>
                        </div>
                      )}
                      {vid.editing_status === 'review' && (
                        <div className="grid grid-cols-2 gap-2">
                          <button onClick={() => approveVideo(vid.id)}
                            className="rounded-lg py-2 font-semibold transition-colors"
                            style={{ fontSize: '0.8rem', color: '#00C48C', border: '1px solid #00C48C44', background: '#00C48C10', cursor: 'pointer' }}>
                            ✅ Принять
                          </button>
                          <button onClick={() => sendForRevision(vid.id)}
                            className="rounded-lg py-2 font-semibold transition-colors"
                            style={{ fontSize: '0.8rem', color: '#F59E0B', border: '1px solid #F59E0B44', background: '#F59E0B10', cursor: 'pointer' }}>
                            ↩ Доработка
                          </button>
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-2">
                        <button onClick={() => openEditTask(vid)}
                          className="rounded-lg py-2 font-semibold transition-colors"
                          style={{ fontSize: '0.8rem', color: '#60A5FA', border: '1px solid #60A5FA44', background: '#60A5FA0D', cursor: 'pointer' }}>
                          ✏️ Изменить
                        </button>
                        <button onClick={() => deleteTask(vid.id)} disabled={deletingId === vid.id}
                          className="rounded-lg py-2 font-bold transition-colors"
                          style={{ fontSize: '0.8rem', color: '#FF4D4D', border: '1px solid #FF4D4D55', background: '#FF4D4D0D', cursor: 'pointer' }}>
                          {deletingId === vid.id ? '...' : '🗑 Удалить'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          );

          /* ── DESKTOP TABLE (≥ md) ── */
          const desktopTable = (
            <div className="hidden md:block" style={{ background: '#1C1E26', border: '1px solid #2C2F3A', borderRadius: 12, overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', minWidth: 780 }}>
                <colgroup><col style={{ width: '3%' }} /><col style={{ width: '13%' }} /><col style={{ width: '20%' }} /><col style={{ width: '13%' }} /><col style={{ width: '15%' }} /><col style={{ width: '12%' }} /><col style={{ width: '24%' }} /></colgroup>
                <thead>
                  <tr style={{ background: '#161922', borderBottom: '1px solid #2C2F3A' }}>
                    <th style={{ padding: '8px 10px', textAlign: 'center', fontSize: '0.78rem', fontWeight: 700, color: '#8F90A6' }}>★</th>
                    <th style={{ padding: '8px 10px', textAlign: 'left', fontSize: '0.78rem', fontWeight: 700, color: '#8F90A6' }}>ID & Клиент</th>
                    <th style={{ padding: '8px 10px', textAlign: 'left', fontSize: '0.78rem', fontWeight: 700, color: '#8F90A6' }}>Название видео</th>
                    <th style={{ padding: '8px 10px', textAlign: 'left', fontSize: '0.78rem', fontWeight: 700, color: '#8F90A6' }}>Монтажер / Статус</th>
                    <th style={{ padding: '8px 10px', textAlign: 'left', fontSize: '0.78rem', fontWeight: 700, color: '#F59E0B' }}>Дедлайн</th>
                    <th style={{ padding: '8px 10px', textAlign: 'left', fontSize: '0.78rem', fontWeight: 700, color: '#8F90A6' }}>Ссылки</th>
                    <th style={{ padding: '8px 10px', textAlign: 'left', fontSize: '0.78rem', fontWeight: 700, color: '#8F90A6' }}>Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr><td colSpan={7} style={{ padding: '24px', textAlign: 'center', color: '#8F90A6', fontSize: '0.85rem' }}>Нет задач по фильтру</td></tr>
                  ) : filtered.map(vid => {
                    const isOverdue = vid.editing_status === 'in_progress' && vid.claimed_at && !vid.deadline_penalty_applied && getDeadlineStatus(vid.claimed_at)?.isOverdue;
                    const isPending = vid.editing_status === 'pending';
                    const shortId = '#' + vid.id.slice(0, 5);
                    const rowStyle = vid.is_priority ? { borderBottom: '1px solid #EF444440', background: '#EF44440A' } : isOverdue ? { borderBottom: '1px solid #FF6B6B44', background: '#FF6B6B08' } : { borderBottom: '1px solid #2C2F3A' };
                    return (
                      <tr key={vid.id} style={rowStyle}>
                        <td style={{ padding: '6px 10px', textAlign: 'center' }}>
                          <button onClick={() => togglePriority(vid.id, vid.is_priority)} disabled={prioritizingId === vid.id} title={vid.is_priority ? 'Снять приоритет' : 'Сделать приоритетным'}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem', lineHeight: 1, opacity: prioritizingId === vid.id ? 0.4 : 1, filter: vid.is_priority ? 'none' : 'grayscale(1) opacity(0.35)', transition: 'filter 0.15s, transform 0.1s', padding: 0 }}
                            onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.2)'; }} onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}>⭐</button>
                        </td>
                        <td style={{ padding: '6px 10px' }}>
                          <div style={{ fontSize: '0.68rem', color: '#4B5063', fontFamily: 'monospace', marginBottom: 2 }}>{shortId}</div>
                          <div style={{ color: isOverdue ? '#FF6B6B' : vid.is_priority ? '#FCA5A5' : '#fff', fontWeight: 600, fontSize: '0.82rem', wordBreak: 'break-word' }}>{vid.client_name}</div>
                        </td>
                        <td style={{ padding: '6px 10px' }}>
                          <div className="line-clamp-2" style={{ color: '#CBD5E1', fontSize: '0.8rem', wordBreak: 'break-all', lineHeight: 1.45 }}>
                            {vid.script ? vid.script : <span style={{ color: '#4B5063' }}>—</span>}
                          </div>
                          <div style={{ marginTop: 4, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                            {vid.task_type && <div style={{ display: 'inline-block', fontSize: '0.65rem', fontWeight: 700, color: '#3B82F6', background: '#3B82F610', border: '1px solid #3B82F630', borderRadius: 4, padding: '1px 5px' }}>{vid.task_type}</div>}
                            {vid.video_format === 'horizontal'
                              ? <div style={{ display: 'inline-block', fontSize: '0.65rem', fontWeight: 700, color: '#93C5FD', background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(96,165,250,0.3)', borderRadius: 4, padding: '1px 5px' }}>🖥️ 16:9</div>
                              : <div style={{ display: 'inline-block', fontSize: '0.65rem', fontWeight: 700, color: '#D8B4FE', background: 'rgba(168,85,247,0.12)', border: '1px solid rgba(192,132,252,0.3)', borderRadius: 4, padding: '1px 5px' }}>📱 9:16</div>}
                          </div>
                        </td>
                        <td style={{ padding: '6px 10px' }}>
                          <div style={{ color: '#00C48C', fontWeight: 700, fontSize: '0.82rem', marginBottom: 5 }}>{vid.editor_name || <span style={{ color: '#4B5063' }}>Нет</span>}</div>
                          <span style={{ display: 'inline-block', padding: '2px 7px', borderRadius: 4, fontSize: '0.68rem', fontWeight: 700, backgroundColor: isOverdue ? '#FF6B6B18' : `${statusColor(vid.editing_status)}18`, color: isOverdue ? '#FF6B6B' : statusColor(vid.editing_status), border: isOverdue ? '1px solid #FF6B6B44' : `1px solid ${statusColor(vid.editing_status)}44`, whiteSpace: 'nowrap' }}>
                            {isOverdue ? '🔴 Просрочено' : statusLabel(vid.editing_status)}
                          </span>
                        </td>
                        <td style={{ padding: '7px 8px' }}>
                          {(() => {
                            const savedVal = vid.deadline ? new Date(vid.deadline).toISOString().slice(0, 16) : '';
                            const currentVal = deadlineEdits[vid.id] !== undefined ? deadlineEdits[vid.id] : savedVal;
                            const isDirty = currentVal !== savedVal;
                            const isSaving = savingDeadline === vid.id;
                            return (
                              <div className="flex items-center gap-1" style={{ minWidth: 0 }}>
                                <div className="relative flex items-center" style={{ flex: 1, minWidth: 0 }}>
                                  <Calendar size={11} style={{ position: 'absolute', left: 6, color: currentVal ? '#F59E0B' : '#4B5063', pointerEvents: 'none', flexShrink: 0, zIndex: 1 }} />
                                  <input type="datetime-local" value={currentVal}
                                    onChange={e => setDeadlineEdits(prev => ({ ...prev, [vid.id]: e.target.value }))}
                                    onBlur={e => { if (isDirty) updateDeadline(vid.id, e.target.value); }}
                                    disabled={isSaving}
                                    className="bg-[#1a1d24] border border-gray-700 text-gray-300 text-xs rounded-md outline-none cursor-pointer focus:border-blue-500 transition-colors"
                                    style={{ paddingLeft: 22, paddingRight: 4, paddingTop: 4, paddingBottom: 4, width: '100%', fontFamily: 'inherit', color: currentVal ? '#F59E0B' : '#4B5063', borderColor: isDirty ? '#F59E0B66' : undefined, opacity: isSaving ? 0.5 : 1, colorScheme: 'dark' }}
                                  />
                                </div>
                                {isDirty && (
                                  <button onClick={() => updateDeadline(vid.id, currentVal)} disabled={isSaving}
                                    className="flex items-center justify-center rounded-md transition-colors"
                                    style={{ width: 24, height: 24, flexShrink: 0, background: '#F59E0B18', border: '1px solid #F59E0B55', color: '#F59E0B', cursor: isSaving ? 'default' : 'pointer', opacity: isSaving ? 0.5 : 1 }}>
                                    {isSaving ? <span style={{ fontSize: 9 }}>...</span> : <Check size={11} />}
                                  </button>
                                )}
                              </div>
                            );
                          })()}
                        </td>
                        <td style={{ padding: '8px 10px' }}>
                          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                            {vid.raw_video_link && <a href={vid.raw_video_link} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.68rem', color: '#3B82F6', textDecoration: 'none', fontWeight: 600, padding: '2px 6px', border: '1px solid #3B82F644', borderRadius: 4, whiteSpace: 'nowrap', transition: 'background 0.15s' }} onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#3B82F618'; }} onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}>Исходник</a>}
                            {vid.final_video_link && <a href={vid.final_video_link} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.68rem', color: '#00C48C', textDecoration: 'none', fontWeight: 600, padding: '2px 6px', border: '1px solid #00C48C44', borderRadius: 4, whiteSpace: 'nowrap', transition: 'background 0.15s' }} onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#00C48C18'; }} onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}>Результат</a>}
                            {vid.final_cover_link && <a href={vid.final_cover_link} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.68rem', color: '#F59E0B', textDecoration: 'none', fontWeight: 600, padding: '2px 6px', border: '1px solid #F59E0B44', borderRadius: 4, whiteSpace: 'nowrap', transition: 'background 0.15s' }} onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#F59E0B18'; }} onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}>Обложка</a>}
                          </div>
                        </td>
                        <td style={{ padding: '8px 10px' }}>
                          <div style={{ display: 'flex', gap: 5, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                            {isPending && (
                              <>
                                <select value={assignSelections[vid.id] || ''} onChange={e => setAssignSelections(prev => ({ ...prev, [vid.id]: e.target.value }))}
                                  style={{ background: '#161922', color: assignSelections[vid.id] ? '#fff' : '#8F90A6', border: '1px solid #2C2F3A', borderRadius: 4, padding: '3px 6px', fontSize: '0.72rem', fontFamily: 'inherit', cursor: 'pointer', outline: 'none', maxWidth: 110 }}>
                                  <option value="">— выбрать —</option>
                                  {editors.map(ed => <option key={ed.editor_name} value={ed.editor_name}>{ed.editor_name}</option>)}
                                </select>
                                <button onClick={() => assignTask(vid.id)} disabled={!assignSelections[vid.id] || assigningId === vid.id}
                                  style={{ fontSize: '0.7rem', color: assignSelections[vid.id] ? '#00C48C' : '#4B5063', fontWeight: 600, padding: '3px 8px', border: `1px solid ${assignSelections[vid.id] ? '#00C48C44' : '#2C2F3A'}`, borderRadius: 4, background: 'transparent', cursor: assignSelections[vid.id] ? 'pointer' : 'default', whiteSpace: 'nowrap', transition: 'all 0.15s' }}>
                                  {assigningId === vid.id ? '...' : '✓ Назначить'}
                                </button>
                              </>
                            )}
                            {vid.editing_status === 'review' && (
                              <>
                                <button onClick={() => approveVideo(vid.id)} style={{ fontSize: '0.7rem', color: '#00C48C', fontWeight: 600, padding: '3px 7px', border: '1px solid #00C48C44', borderRadius: 4, background: 'transparent', cursor: 'pointer', whiteSpace: 'nowrap', transition: 'background 0.15s' }} onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#00C48C18'; }} onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}>✅ Принять</button>
                                <button onClick={() => sendForRevision(vid.id)} style={{ fontSize: '0.7rem', color: '#F59E0B', fontWeight: 600, padding: '3px 7px', border: '1px solid #F59E0B44', borderRadius: 4, background: 'transparent', cursor: 'pointer', whiteSpace: 'nowrap', transition: 'background 0.15s' }} onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#F59E0B18'; }} onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}>↩ Доработка</button>
                              </>
                            )}
                            <button onClick={() => openEditTask(vid)} style={{ fontSize: '0.7rem', color: '#60A5FA', fontWeight: 600, padding: '3px 8px', border: '1px solid #60A5FA44', borderRadius: 4, background: '#60A5FA0D', cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.15s' }} onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#60A5FA20'; e.currentTarget.style.borderColor = '#60A5FA88'; }} onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#60A5FA0D'; e.currentTarget.style.borderColor = '#60A5FA44'; }}>✏️ Изменить</button>
                            <button onClick={() => deleteTask(vid.id)} disabled={deletingId === vid.id} style={{ fontSize: '0.7rem', color: '#FF4D4D', fontWeight: 700, padding: '3px 8px', border: '1px solid #FF4D4D55', borderRadius: 4, background: '#FF4D4D0D', cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.15s', marginLeft: 'auto' }} onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#FF4D4D25'; e.currentTarget.style.borderColor = '#FF4D4D88'; }} onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#FF4D4D0D'; e.currentTarget.style.borderColor = '#FF4D4D55'; }}>
                              {deletingId === vid.id ? '...' : '🗑 Удалить'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          );

          return <>{mobileCards}{desktopTable}</>;
        })()}

        {/* KANBAN VIEW */}
        {videoView === 'kanban' && (() => {
          const filtered = activeVideos.filter(v => {
            const q = videoSearchQuery.toLowerCase();
            return (!q || v.client_name.toLowerCase().includes(q) || (v.script || '').toLowerCase().includes(q))
              && (!videoEditorFilter || v.editor_name === videoEditorFilter);
          });
          const columns: { key: string; label: string; accent: string; bg: string }[] = [
            { key: 'pending', label: 'Свободные', accent: '#8F90A6', bg: '#1C1E26' },
            { key: 'in_progress', label: 'В работе', accent: '#3B82F6', bg: '#1C1F2E' },
            { key: 'review', label: 'На проверке', accent: '#F59E0B', bg: '#1E1D18' },
            { key: 'completed', label: 'Готово', accent: '#00C48C', bg: '#121E1A' },
          ];
          return (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
              {columns.map(col => {
                const colVideos = filtered.filter(v => v.editing_status === col.key).sort((a, b) => a.is_priority === b.is_priority ? 0 : a.is_priority ? -1 : 1);
                return (
                  <div key={col.key} style={{ background: col.bg, border: `1px solid ${col.accent}33`, borderRadius: 12, overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: 200 }}>
                    <div style={{ padding: '10px 14px', background: `${col.accent}10`, borderBottom: `1px solid ${col.accent}33`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '0.82rem', fontWeight: 700, color: col.accent }}>{col.label}</span>
                      <span style={{ fontSize: '0.72rem', fontWeight: 700, background: `${col.accent}22`, color: col.accent, borderRadius: 20, padding: '1px 8px' }}>{colVideos.length}</span>
                    </div>
                    <div style={{ padding: '10px 8px', display: 'flex', flexDirection: 'column', gap: 8, flex: 1, overflowY: 'auto', maxHeight: 600 }}>
                      {colVideos.length === 0 && <div style={{ textAlign: 'center', color: '#4B5063', fontSize: '0.75rem', padding: '20px 0' }}>Нет задач</div>}
                      {colVideos.map(vid => {
                        const isOverdue = vid.editing_status === 'in_progress' && vid.claimed_at && !vid.deadline_penalty_applied && getDeadlineStatus(vid.claimed_at)?.isOverdue;
                        const isPending = vid.editing_status === 'pending';
                        const shortId = '#' + vid.id.slice(0, 5);
                        return (
                          <div key={vid.id} style={{ background: vid.is_priority ? '#EF44440D' : isOverdue ? '#FF6B6B08' : '#161922', border: `1px solid ${vid.is_priority ? '#EF444440' : isOverdue ? '#FF6B6B33' : '#2C2F3A'}`, borderRadius: 8, padding: '10px 12px', transition: 'border-color 0.15s' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <button onClick={() => togglePriority(vid.id, vid.is_priority)} disabled={prioritizingId === vid.id} title={vid.is_priority ? 'Снять приоритет' : 'Приоритет'}
                                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.85rem', lineHeight: 1, filter: vid.is_priority ? 'none' : 'grayscale(1) opacity(0.3)', padding: 0, transition: 'filter 0.15s' }}>⭐</button>
                                <span style={{ fontSize: '0.65rem', color: '#4B5063', fontFamily: 'monospace' }}>{shortId}</span>
                              </div>
                              <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                                {vid.task_type && <span style={{ fontSize: '0.6rem', fontWeight: 700, color: '#3B82F6', background: '#3B82F610', border: '1px solid #3B82F630', borderRadius: 4, padding: '1px 5px' }}>{vid.task_type}</span>}
                                {vid.video_format === 'horizontal'
                                  ? <span style={{ fontSize: '0.6rem', fontWeight: 700, color: '#93C5FD', background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(96,165,250,0.3)', borderRadius: 4, padding: '1px 5px' }}>🖥️ 16:9</span>
                                  : <span style={{ fontSize: '0.6rem', fontWeight: 700, color: '#D8B4FE', background: 'rgba(168,85,247,0.12)', border: '1px solid rgba(192,132,252,0.3)', borderRadius: 4, padding: '1px 5px' }}>📱 9:16</span>}
                              </div>
                            </div>
                            <div style={{ fontSize: '0.82rem', fontWeight: 700, color: vid.is_priority ? '#FCA5A5' : isOverdue ? '#FF6B6B' : '#fff', marginBottom: 4, wordBreak: 'break-word' }}>{vid.client_name}</div>
                            {vid.script && <div style={{ fontSize: '0.75rem', color: '#94A3B8', lineHeight: 1.45, marginBottom: 6, wordBreak: 'break-word', whiteSpace: 'normal' }}>{vid.script}</div>}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
                              {vid.editor_name && <span style={{ fontSize: '0.68rem', color: '#00C48C', fontWeight: 700, background: '#00C48C10', border: '1px solid #00C48C30', borderRadius: 4, padding: '1px 6px' }}>{vid.editor_name}</span>}
                              {vid.deadline && <span style={{ fontSize: '0.65rem', color: '#F59E0B', background: '#F59E0B10', border: '1px solid #F59E0B30', borderRadius: 4, padding: '1px 6px', display: 'flex', alignItems: 'center', gap: 3 }}><Calendar size={9} />{new Date(vid.deadline).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>}
                              {isOverdue && <span style={{ fontSize: '0.65rem', color: '#FF4D4D', fontWeight: 700 }}>Просрочено</span>}
                            </div>
                            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 8 }}>
                              {vid.raw_video_link && <a href={vid.raw_video_link} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.65rem', color: '#3B82F6', textDecoration: 'none', fontWeight: 600, padding: '2px 6px', border: '1px solid #3B82F644', borderRadius: 4 }}>Исходник</a>}
                              {vid.final_video_link && <a href={vid.final_video_link} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.65rem', color: '#00C48C', textDecoration: 'none', fontWeight: 600, padding: '2px 6px', border: '1px solid #00C48C44', borderRadius: 4 }}>Результат</a>}
                              {vid.final_cover_link && <a href={vid.final_cover_link} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.65rem', color: '#F59E0B', textDecoration: 'none', fontWeight: 600, padding: '2px 6px', border: '1px solid #F59E0B44', borderRadius: 4 }}>Обложка</a>}
                            </div>
                            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', alignItems: 'center' }}>
                              {isPending && (
                                <>
                                  <select value={assignSelections[vid.id] || ''} onChange={e => setAssignSelections(prev => ({ ...prev, [vid.id]: e.target.value }))}
                                    style={{ background: '#0D0F16', color: assignSelections[vid.id] ? '#fff' : '#8F90A6', border: '1px solid #2C2F3A', borderRadius: 4, padding: '3px 5px', fontSize: '0.68rem', fontFamily: 'inherit', cursor: 'pointer', outline: 'none', flex: 1, minWidth: 0 }}>
                                    <option value="">— выбрать —</option>
                                    {editors.map(ed => <option key={ed.editor_name} value={ed.editor_name}>{ed.editor_name}</option>)}
                                  </select>
                                  <button onClick={() => assignTask(vid.id)} disabled={!assignSelections[vid.id] || assigningId === vid.id}
                                    style={{ fontSize: '0.68rem', color: assignSelections[vid.id] ? '#00C48C' : '#4B5063', fontWeight: 600, padding: '3px 7px', border: `1px solid ${assignSelections[vid.id] ? '#00C48C44' : '#2C2F3A'}`, borderRadius: 4, background: 'transparent', cursor: assignSelections[vid.id] ? 'pointer' : 'default', whiteSpace: 'nowrap' }}>
                                    {assigningId === vid.id ? '...' : '✓'}
                                  </button>
                                </>
                              )}
                              {vid.editing_status === 'review' && (
                                <>
                                  <button onClick={() => approveVideo(vid.id)} style={{ fontSize: '0.68rem', color: '#00C48C', fontWeight: 600, padding: '3px 7px', border: '1px solid #00C48C44', borderRadius: 4, background: 'transparent', cursor: 'pointer', whiteSpace: 'nowrap' }}>✅ Принять</button>
                                  <button onClick={() => sendForRevision(vid.id)} style={{ fontSize: '0.68rem', color: '#F59E0B', fontWeight: 600, padding: '3px 7px', border: '1px solid #F59E0B44', borderRadius: 4, background: 'transparent', cursor: 'pointer', whiteSpace: 'nowrap' }}>↩ Доработка</button>
                                </>
                              )}
                              <button onClick={() => deleteTask(vid.id)} disabled={deletingId === vid.id}
                                style={{ fontSize: '0.68rem', color: '#FF4D4D', fontWeight: 700, padding: '3px 7px', border: '1px solid #FF4D4D44', borderRadius: 4, background: '#FF4D4D0A', cursor: 'pointer', whiteSpace: 'nowrap', marginLeft: 'auto' }}>
                                {deletingId === vid.id ? '...' : '🗑'}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })()}
      </div>

      {/* ── Automation bot (admin only) ── */}
      {!isManager && (
        <div style={{ marginTop: 40, padding: '28px', background: 'linear-gradient(135deg, #0F1117 0%, #1a1d28 100%)', border: '1px solid #2C2F3A', borderRadius: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <span style={{ fontSize: '1.3rem' }}>🤖</span>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#fff', margin: 0 }}>Робот рассылок</h3>
          </div>
          <p style={{ fontSize: '0.82rem', color: '#8F90A6', margin: '0 0 24px 0', lineHeight: 1.5 }}>Массовые WhatsApp-уведомления для всех монтажеров. Используй с умом.</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
            {[
              { action: 'check_deadlines', label: 'Проверить дедлайны', loadLabel: 'Проверяю...', icon: '🚨', accent: '#EF4444', desc: 'Предупреждения за 12ч, 3ч, просрочку' },
              { action: 'broadcast_unassigned', label: 'Пнуть за свободные заказы', loadLabel: 'Отправляю...', icon: '📢', accent: '#F59E0B', desc: 'Рассылка всем о незабранных задачах' },
              { action: 'broadcast_leaderboard', label: 'Разослать рейтинг', loadLabel: 'Отправляю...', icon: '🏆', accent: '#10B981', desc: 'Топ месяца по закрытым задачам' },
            ].map(btn => (
              <button key={btn.action} onClick={() => runAutomation(btn.action)} disabled={automationLoading !== null}
                style={{ padding: '14px 16px', background: automationLoading === btn.action ? `${btn.accent}18` : '#1C1E26', border: `1px solid ${automationLoading === btn.action ? btn.accent : `${btn.accent}44`}`, borderRadius: 10, color: automationLoading === btn.action ? btn.accent : `${btn.accent}CC`, fontSize: '0.88rem', fontWeight: 600, cursor: automationLoading !== null ? 'not-allowed' : 'pointer', opacity: automationLoading !== null && automationLoading !== btn.action ? 0.5 : 1, textAlign: 'left' as const, transition: 'all 0.15s' }}>
                <div style={{ fontSize: '1.2rem', marginBottom: 6 }}>{btn.icon}</div>
                {automationLoading === btn.action ? btn.loadLabel : btn.label}
                <div style={{ fontSize: '0.75rem', fontWeight: 400, color: '#8F90A6', marginTop: 4 }}>{btn.desc}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Edit editor modal ── */}
      {editingEditor && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)' }}>
          <div className="w-full max-w-sm max-h-[90vh] overflow-y-auto" style={{ background: '#1C1E26', border: '1px solid #2C2F3A', borderRadius: 16, padding: '24px' }}>
            <h3 style={{ color: '#fff', margin: '0 0 6px', fontSize: '1.1rem', fontWeight: 700 }}>Редактировать монтажера</h3>
            <p style={{ color: '#8F90A6', margin: '0 0 20px', fontSize: '0.85rem' }}>Если изменить логин — все задачи будут переназначены автоматически.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div><label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#8F90A6', marginBottom: 6 }}>Логин</label><input className="admin-input" placeholder="Логин" value={editUsername} onChange={e => setEditUsername(e.target.value)} /></div>
              <div><label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#8F90A6', marginBottom: 6 }}>Пароль</label><input className="admin-input" type="text" placeholder="Пароль" value={editPassword} onChange={e => setEditPassword(e.target.value)} /></div>
              <div><label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#8F90A6', marginBottom: 6 }}>WhatsApp (опционально)</label><input className="admin-input" placeholder="+7 999 000 0000" value={editWhatsapp} onChange={e => setEditWhatsapp(e.target.value)} /></div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#8F90A6', marginBottom: 6 }}>Старый баланс / Корректировка (₸)</label>
                <input className="admin-input" type="number" placeholder="например, 365547" value={editManualAdjustment} onChange={e => setEditManualAdjustment(Number(e.target.value))} />
                <p style={{ margin: '6px 0 0 0', fontSize: '0.75rem', color: '#6B7280', lineHeight: '1.5' }}>Впишите сюда исторический баланс монтажера. В будущем используйте для ручных премий или вычета авансов.</p>
              </div>
              {editUsername.trim() !== editingEditor.editor_name && (
                <div style={{ padding: '10px 14px', background: '#F59E0B10', border: '1px solid #F59E0B44', borderRadius: 8, fontSize: '0.8rem', color: '#F59E0B', fontWeight: 500 }}>
                  ⚠️ Логин изменён: все задачи монтажера будут переназначены на новый логин
                </div>
              )}
              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 8 }}>
                <button className="admin-btn-ghost" onClick={closeEditModal} disabled={saving} style={{ flex: 1 }}>Отмена</button>
                <button className="admin-btn-primary" onClick={handleEditEditor} disabled={saving} style={{ flex: 1 }}>{saving ? 'Сохраняю...' : 'Сохранить'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit task modal ── */}
      {editingTask && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)' }} onClick={() => setEditingTask(null)}>
          <div className="w-full max-w-md max-h-[90vh] overflow-y-auto" style={{ background: '#1C1E26', border: '1px solid #2C2F3A', borderRadius: 16, padding: '24px', boxShadow: '0 24px 60px rgba(0,0,0,0.6)' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h3 style={{ color: '#fff', margin: 0, fontSize: '1.05rem', fontWeight: 700 }}>✏️ Редактировать задачу</h3>
              <button onClick={() => setEditingTask(null)} style={{ background: 'none', border: 'none', color: '#8F90A6', fontSize: '1.2rem', cursor: 'pointer', lineHeight: 1 }}>✕</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#8F90A6', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Название / Сценарий</label>
                <textarea value={editTaskScript} onChange={e => setEditTaskScript(e.target.value)} rows={5} placeholder="Сценарий или инструкции по монтажу..."
                  style={{ width: '100%', background: '#161922', border: '1px solid #2C2F3A', borderRadius: 8, padding: '10px 12px', color: '#e0e0e0', fontSize: '0.85rem', fontFamily: 'inherit', resize: 'vertical', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.15s' }}
                  onFocus={e => { e.currentTarget.style.borderColor = '#60A5FA66'; }} onBlur={e => { e.currentTarget.style.borderColor = '#2C2F3A'; }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#8F90A6', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Ссылка на исходник</label>
                <input className="admin-input" placeholder="https://drive.google.com/..." value={editTaskVideoLink} onChange={e => setEditTaskVideoLink(e.target.value)} style={{ width: '100%', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#8F90A6', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Ссылка на обложку</label>
                <input className="admin-input" placeholder="https://..." value={editTaskCoverLink} onChange={e => setEditTaskCoverLink(e.target.value)} style={{ width: '100%', boxSizing: 'border-box' }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 22 }}>
              <button className="admin-btn-ghost" onClick={() => setEditingTask(null)}>Отмена</button>
              <button className="admin-btn-primary" onClick={saveEditTask} disabled={savingTask}>{savingTask ? 'Сохранение...' : '✓ Сохранить'}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Add editor modal ── */}
      {showAddModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
          <div className="w-full max-w-sm max-h-[90vh] overflow-y-auto" style={{ background: '#1C1E26', border: '1px solid #2C2F3A', borderRadius: 16, padding: '24px' }}>
            <h3 style={{ color: '#fff', margin: '0 0 20px', fontSize: '1.1rem', fontWeight: 700 }}>Добавить монтажера</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div><label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#8F90A6', marginBottom: 6 }}>Логин</label><input className="admin-input" placeholder="Логин" value={newUsername} onChange={e => setNewUsername(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddEditor()} autoFocus /></div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#8F90A6', marginBottom: 6 }}>Пароль</label>
                <input className="admin-input" type="password" placeholder="Пароль" minLength={6} value={newPassword} onChange={e => setNewPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddEditor()} />
                <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: newPassword.length > 0 && newPassword.length < 6 ? '#F87171' : '#555974' }}>Пароль должен быть не менее 6 символов</p>
              </div>
              <div><label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#8F90A6', marginBottom: 6 }}>WhatsApp (опционально)</label><input className="admin-input" placeholder="+7 999 000 0000" value={newWhatsapp} onChange={e => setNewWhatsapp(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddEditor()} /></div>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 8 }}>
                <button className="admin-btn-ghost" onClick={() => { setShowAddModal(false); setNewUsername(''); setNewPassword(''); setNewWhatsapp(''); }} disabled={adding} style={{ flex: 1 }}>Отмена</button>
                <button className="admin-btn-primary" onClick={handleAddEditor} disabled={adding} style={{ flex: 1 }}>{adding ? 'Добавляю...' : 'Добавить'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ManualTaskModal
        isOpen={showManualTaskModal}
        onClose={() => setShowManualTaskModal(false)}
        onTaskCreated={async (taskTitle?: string) => {
          setShowManualTaskModal(false);
          showToast('Задача успешно создана!');
          await refetchVideos();
          await refetchEditors();
          if (taskTitle) {
            try { await supabase.functions.invoke('editor-automations', { body: { action: 'broadcast_new_task', taskTitle } }); } catch {}
          }
        }}
        editors={editors}
      />
    </div>
  );
}
