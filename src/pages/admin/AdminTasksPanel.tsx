import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Trash2, Plus, CheckCircle2, Circle, Clock, Repeat, Phone } from 'lucide-react';

interface AdminTask {
  id: string;
  title: string;
  due_datetime: string;
  is_completed: boolean;
  is_reminded: boolean;
  whatsapp_number: string | null;
  repeat_interval: string;
  last_reminded_at: string | null;
  created_at: string;
}

const REPEAT_OPTIONS: { value: string; label: string; short: string }[] = [
  { value: 'none', label: 'Не повторять', short: '—' },
  { value: '15m', label: 'Каждые 15 минут', short: '15м' },
  { value: '30m', label: 'Каждые 30 минут', short: '30м' },
  { value: '1h', label: 'Каждый час', short: '1ч' },
  { value: '1d', label: 'Каждый день', short: '1д' },
];

function formatDubaiDatetime(iso: string): string {
  return new Date(iso).toLocaleString('ru-RU', {
    timeZone: 'Asia/Dubai',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function isOverdue(iso: string): boolean {
  return new Date(iso) < new Date();
}

function isDueSoon(iso: string): boolean {
  const diff = new Date(iso).getTime() - Date.now();
  return diff > 0 && diff < 60 * 60 * 1000;
}

function repeatLabel(val: string): string {
  return REPEAT_OPTIONS.find(o => o.value === val)?.short ?? val;
}

export default function AdminTasksPanel() {
  const [tasks, setTasks] = useState<AdminTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [defaultPhone, setDefaultPhone] = useState('');

  const [title, setTitle] = useState('');
  const [dueDatetime, setDueDatetime] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [repeatInterval, setRepeatInterval] = useState('none');
  const [adding, setAdding] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [showCompleted, setShowCompleted] = useState(false);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const fetchTasks = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('admin_tasks')
      .select('*')
      .order('due_datetime', { ascending: true });
    if (!error && data) setTasks(data as AdminTask[]);
    setLoading(false);
  };

  const fetchDefaultPhone = async () => {
    const { data } = await supabase
      .from('app_settings')
      .select('admin_whatsapp_number')
      .eq('id', 1)
      .maybeSingle();
    const phone = (data as { admin_whatsapp_number?: string } | null)?.admin_whatsapp_number ?? '';
    setDefaultPhone(phone);
    setWhatsappNumber(phone);
  };

  useEffect(() => {
    fetchTasks();
    fetchDefaultPhone();
  }, []);

  const handleAdd = async () => {
    if (!title.trim() || !dueDatetime) return;
    setAdding(true);
    const { error } = await supabase.from('admin_tasks').insert({
      title: title.trim(),
      due_datetime: new Date(dueDatetime).toISOString(),
      whatsapp_number: whatsappNumber.trim() || null,
      repeat_interval: repeatInterval,
    });
    if (error) {
      showToast('Ошибка: ' + error.message);
    } else {
      setTitle('');
      setDueDatetime('');
      setWhatsappNumber(defaultPhone);
      setRepeatInterval('none');
      fetchTasks();
      showToast('Задача добавлена');
    }
    setAdding(false);
  };

  const handleComplete = async (task: AdminTask) => {
    const { error } = await supabase
      .from('admin_tasks')
      .update({ is_completed: !task.is_completed })
      .eq('id', task.id);
    if (!error) fetchTasks();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('admin_tasks').delete().eq('id', id);
    if (!error) fetchTasks();
    else showToast('Ошибка удаления');
  };

  const active = tasks.filter(t => !t.is_completed);
  const completed = tasks.filter(t => t.is_completed);

  const inputStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.05)',
    border: '1.5px solid rgba(255,255,255,0.1)',
    borderRadius: 10,
    padding: '10px 14px',
    color: '#f1f5f9',
    fontSize: '0.88rem',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '0.72rem',
    fontWeight: 700,
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.07em',
    marginBottom: 6,
  };

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '8px 0' }}>
      {toast && (
        <div style={{
          position: 'fixed', top: 20, right: 20, zIndex: 9999,
          background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 12, padding: '12px 20px',
          color: '#f1f5f9', fontSize: '0.9rem', fontWeight: 600,
          boxShadow: '0 8px 30px rgba(0,0,0,0.4)',
        }}>
          {toast}
        </div>
      )}

      <div style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 16,
        padding: '20px 22px',
        marginBottom: 20,
      }}>
        <h3 style={{ margin: '0 0 16px', fontSize: '0.85rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Новая задача
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <input
              type="text"
              placeholder="Название задачи... (напр. Позвонить клиенту)"
              value={title}
              onChange={e => setTitle(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleAdd(); }}
              style={{ ...inputStyle, fontSize: '0.92rem' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={labelStyle}>Дата и время напоминания</label>
              <input
                type="datetime-local"
                value={dueDatetime}
                onChange={e => setDueDatetime(e.target.value)}
                style={{ ...inputStyle, colorScheme: 'dark' }}
              />
            </div>
            <div>
              <label style={labelStyle}>Повторять (интервал)</label>
              <select
                value={repeatInterval}
                onChange={e => setRepeatInterval(e.target.value)}
                style={{ ...inputStyle, cursor: 'pointer' }}
              >
                {REPEAT_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10, alignItems: 'flex-end' }}>
            <div>
              <label style={labelStyle}>WhatsApp получателя (номер без +)</label>
              <input
                type="text"
                placeholder="971585973177"
                value={whatsappNumber}
                onChange={e => setWhatsappNumber(e.target.value)}
                style={inputStyle}
              />
            </div>
            <button
              onClick={handleAdd}
              disabled={adding || !title.trim() || !dueDatetime}
              style={{
                display: 'flex', alignItems: 'center', gap: 7,
                background: (!title.trim() || !dueDatetime) ? 'rgba(37,99,235,0.3)' : '#2563EB',
                border: 'none', borderRadius: 10,
                padding: '10px 20px',
                color: '#fff', fontSize: '0.88rem', fontWeight: 700,
                cursor: (!title.trim() || !dueDatetime) ? 'not-allowed' : 'pointer',
                whiteSpace: 'nowrap',
                transition: 'background 0.15s',
                height: 40,
              }}
            >
              <Plus size={16} />
              {adding ? 'Добавление...' : '+ Добавить'}
            </button>
          </div>
        </div>
      </div>

      <div>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 14 }}>
          <h3 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Активные задачи
            {active.length > 0 && (
              <span style={{ background: '#2563EB', color: '#fff', borderRadius: 20, padding: '1px 8px', fontSize: '0.7rem', marginLeft: 6 }}>
                {active.length}
              </span>
            )}
          </h3>
        </div>

        {loading ? (
          <div style={{ color: '#475569', fontSize: '0.88rem', padding: '20px 0' }}>Загрузка...</div>
        ) : active.length === 0 ? (
          <div style={{
            background: 'rgba(255,255,255,0.02)',
            border: '1px dashed rgba(255,255,255,0.08)',
            borderRadius: 12, padding: '28px 20px',
            textAlign: 'center', color: '#475569', fontSize: '0.88rem',
          }}>
            Нет активных задач. Добавьте первую!
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {active.map(task => {
              const overdue = isOverdue(task.due_datetime);
              const soon = isDueSoon(task.due_datetime);
              const accentColor = overdue ? '#ef4444' : soon ? '#fbbf24' : '#64748b';
              const borderColor = overdue ? 'rgba(239,68,68,0.2)' : soon ? 'rgba(251,191,36,0.2)' : 'rgba(255,255,255,0.07)';
              const bgColor = overdue ? 'rgba(239,68,68,0.07)' : soon ? 'rgba(251,191,36,0.07)' : 'rgba(255,255,255,0.03)';

              return (
                <div key={task.id} style={{
                  display: 'flex', alignItems: 'flex-start', gap: 12,
                  background: bgColor,
                  border: `1px solid ${borderColor}`,
                  borderRadius: 12,
                  padding: '14px 16px',
                  transition: 'all 0.15s',
                }}>
                  <button
                    onClick={() => handleComplete(task)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginTop: 2, color: '#64748b', flexShrink: 0 }}
                  >
                    <Circle size={20} color={accentColor} />
                  </button>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.92rem', fontWeight: 600, color: '#e2e8f0', marginBottom: 6 }}>
                      {task.title}
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10 }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.78rem', color: accentColor, fontWeight: overdue || soon ? 700 : 400 }}>
                        <Clock size={12} color={accentColor} />
                        {formatDubaiDatetime(task.due_datetime)}
                        {overdue && ' — Просрочено!'}
                        {soon && ' — Скоро!'}
                      </span>
                      {task.whatsapp_number && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.73rem', color: '#94a3b8' }}>
                          <Phone size={11} />
                          +{task.whatsapp_number}
                        </span>
                      )}
                      {task.repeat_interval !== 'none' && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.73rem', color: '#38bdf8', background: 'rgba(56,189,248,0.1)', borderRadius: 20, padding: '1px 8px' }}>
                          <Repeat size={10} />
                          {repeatLabel(task.repeat_interval)}
                        </span>
                      )}
                      {task.last_reminded_at && (
                        <span style={{ background: 'rgba(34,197,94,0.12)', color: '#22c55e', borderRadius: 20, padding: '1px 8px', fontSize: '0.68rem', fontWeight: 700 }}>
                          WA {new Date(task.last_reminded_at).toLocaleTimeString('ru-RU', { timeZone: 'Asia/Dubai', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(task.id)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#475569', flexShrink: 0 }}
                    title="Удалить задачу"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {completed.length > 0 && (
          <div style={{ marginTop: 24 }}>
            <button
              onClick={() => setShowCompleted(v => !v)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: '#64748b', fontSize: '0.78rem', fontWeight: 700,
                textTransform: 'uppercase', letterSpacing: '0.07em',
                padding: '4px 0', display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              <CheckCircle2 size={14} color="#22c55e" />
              Завершённые ({completed.length}) {showCompleted ? '▲' : '▼'}
            </button>
            {showCompleted && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 10 }}>
                {completed.map(task => (
                  <div key={task.id} style={{
                    display: 'flex', alignItems: 'flex-start', gap: 12,
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.05)',
                    borderRadius: 10, padding: '12px 14px',
                    opacity: 0.6,
                  }}>
                    <button
                      onClick={() => handleComplete(task)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginTop: 1, flexShrink: 0 }}
                    >
                      <CheckCircle2 size={20} color="#22c55e" />
                    </button>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.88rem', fontWeight: 500, color: '#64748b', textDecoration: 'line-through', marginBottom: 3 }}>
                        {task.title}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.75rem', color: '#475569' }}>
                        <span>{formatDubaiDatetime(task.due_datetime)}</span>
                        {task.whatsapp_number && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                            <Phone size={10} /> +{task.whatsapp_number}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDelete(task.id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#334155', flexShrink: 0 }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
