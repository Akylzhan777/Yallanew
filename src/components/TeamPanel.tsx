import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

type TeamMember = {
  id: string;
  name: string;
  surname: string;
  role: 'user' | 'manager' | 'admin';
  is_admin: boolean;
  created_at: string;
};

type InviteForm = {
  email: string;
  name: string;
  surname: string;
  role: 'user' | 'manager' | 'admin';
};

const ROLE_LABELS: Record<string, string> = {
  user: 'Пользователь',
  manager: 'Менеджер',
  admin: 'Администратор',
};

const ROLE_COLORS: Record<string, string> = {
  user: '#8F90A6',
  manager: '#00C48C',
  admin: '#F59E0B',
};

function AdminLoader() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
      <div className="admin-spinner" />
    </div>
  );
}

export default function TeamPanel() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<InviteForm>({ email: '', name: '', surname: '', role: 'user' });
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [inviteSuccess, setInviteSuccess] = useState('');
  const [toast, setToast] = useState('');
  const [updatingRole, setUpdatingRole] = useState<string | null>(null);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3500); };

  const fetchMembers = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id, name, surname, role, is_admin, created_at')
      .order('created_at', { ascending: false });
    setMembers((data ?? []) as TeamMember[]);
    setLoading(false);
  };

  useEffect(() => { fetchMembers(); }, []);

  const openModal = () => {
    setForm({ email: '', name: '', surname: '', role: 'user' });
    setInviteError('');
    setInviteSuccess('');
    setShowModal(true);
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email.trim()) return;
    setInviting(true);
    setInviteError('');
    setInviteSuccess('');

    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;

    const supabaseUrl = (supabase as any).supabaseUrl as string;

    const res = await fetch(`${supabaseUrl}/functions/v1/invite-user`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        email: form.email.trim().toLowerCase(),
        name: form.name.trim(),
        surname: form.surname.trim(),
        role: form.role,
      }),
    });

    const json = await res.json();

    if (!res.ok || json.error) {
      setInviteError(json.error ?? 'Не удалось создать сотрудника.');
    } else {
      setInviteSuccess(
        `Сотрудник создан! Временный пароль: ${json.tempPassword}`
      );
      await fetchMembers();
    }

    setInviting(false);
  };

  const handleRoleChange = async (memberId: string, newRole: 'user' | 'manager' | 'admin') => {
    setUpdatingRole(memberId);
    await supabase
      .from('profiles')
      .update({ role: newRole, is_admin: newRole === 'admin' })
      .eq('id', memberId);
    showToast('Роль обновлена');
    await fetchMembers();
    setUpdatingRole(null);
  };

  if (loading) return <AdminLoader />;

  return (
    <div>
      {toast && <div className="admin-toast">{toast}</div>}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <p style={{ color: '#8F90A6', margin: 0, fontSize: '0.9rem' }}>
            {members.length} сотрудник{members.length === 1 ? '' : members.length < 5 ? 'а' : 'ов'} в системе
          </p>
        </div>
        <button className="admin-btn-primary" onClick={openModal}>
          + Добавить сотрудника
        </button>
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Сотрудник</th>
              <th>Роль</th>
              <th>Дата добавления</th>
              <th>Изменить роль</th>
            </tr>
          </thead>
          <tbody>
            {members.map(m => (
              <tr key={m.id}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                      width: 36, height: 36,
                      borderRadius: '50%',
                      background: '#1a2a22',
                      border: '1px solid #2a4a38',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 700, fontSize: '0.9rem', color: '#00C48C', flexShrink: 0,
                    }}>
                      {(m.name || '?').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, color: '#fff', fontSize: '0.95rem' }}>
                        {m.name} {m.surname}
                      </div>
                    </div>
                  </div>
                </td>
                <td>
                  <span style={{
                    display: 'inline-block',
                    padding: '3px 10px',
                    borderRadius: 20,
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    background: `${ROLE_COLORS[m.role] ?? '#8F90A6'}22`,
                    color: ROLE_COLORS[m.role] ?? '#8F90A6',
                    border: `1px solid ${ROLE_COLORS[m.role] ?? '#8F90A6'}44`,
                  }}>
                    {ROLE_LABELS[m.role] ?? m.role}
                  </span>
                </td>
                <td style={{ color: '#8F90A6', fontSize: '0.85rem' }}>
                  {new Date(m.created_at).toLocaleDateString('ru-RU')}
                </td>
                <td>
                  <select
                    className="admin-input"
                    style={{ padding: '6px 10px', fontSize: '0.82rem', width: 'auto', minWidth: 130 }}
                    value={m.role}
                    disabled={updatingRole === m.id}
                    onChange={e => handleRoleChange(m.id, e.target.value as 'user' | 'manager' | 'admin')}
                  >
                    <option value="user">Пользователь</option>
                    <option value="manager">Менеджер</option>
                    <option value="admin">Администратор</option>
                  </select>
                </td>
              </tr>
            ))}
            {members.length === 0 && (
              <tr>
                <td colSpan={4} style={{ textAlign: 'center', color: '#555', padding: '40px 0' }}>
                  Нет сотрудников
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="admin-modal-overlay" onClick={() => !inviting && setShowModal(false)}>
          <div className="admin-modal" style={{ maxWidth: 440 }} onClick={e => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3>Добавить сотрудника</h3>
              <button className="admin-modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="admin-modal-body">
              {inviteSuccess ? (
                <div style={{ textAlign: 'center', padding: '12px 0' }}>
                  <div style={{
                    width: 56, height: 56,
                    borderRadius: '50%',
                    background: '#00C48C22',
                    border: '1px solid #00C48C44',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    margin: '0 auto 16px',
                    fontSize: '1.5rem',
                  }}>
                    ✓
                  </div>
                  <div style={{ fontWeight: 700, color: '#fff', marginBottom: 10, fontSize: '1.05rem' }}>
                    Сотрудник добавлен!
                  </div>
                  <div style={{
                    background: '#1a2a1a',
                    border: '1px solid #2a4a38',
                    borderRadius: 12,
                    padding: '14px 16px',
                    marginBottom: 20,
                    textAlign: 'left',
                  }}>
                    <div style={{ color: '#8F90A6', fontSize: '0.8rem', marginBottom: 4 }}>Временный пароль:</div>
                    <div style={{ fontFamily: 'monospace', fontSize: '1.05rem', color: '#00C48C', letterSpacing: 1 }}>
                      {inviteSuccess.split('Временный пароль: ')[1]}
                    </div>
                  </div>
                  <p style={{ color: '#8F90A6', fontSize: '0.85rem', marginBottom: 20 }}>
                    Передайте сотруднику его email и этот временный пароль. Он сможет войти и сменить пароль через форму восстановления.
                  </p>
                  <button
                    className="admin-btn-primary"
                    style={{ width: '100%' }}
                    onClick={() => { setShowModal(false); setInviteSuccess(''); }}
                  >
                    Готово
                  </button>
                </div>
              ) : (
                <form onSubmit={handleInvite}>
                  <div className="admin-field">
                    <label className="admin-label">Email *</label>
                    <input
                      className="admin-input"
                      type="email"
                      placeholder="employee@email.com"
                      value={form.email}
                      onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                      required
                      autoFocus
                    />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
                    <div className="admin-field">
                      <label className="admin-label">Имя</label>
                      <input
                        className="admin-input"
                        type="text"
                        placeholder="Имя"
                        value={form.name}
                        onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                      />
                    </div>
                    <div className="admin-field">
                      <label className="admin-label">Фамилия</label>
                      <input
                        className="admin-input"
                        type="text"
                        placeholder="Фамилия"
                        value={form.surname}
                        onChange={e => setForm(f => ({ ...f, surname: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div className="admin-field" style={{ marginTop: 12 }}>
                    <label className="admin-label">Роль *</label>
                    <select
                      className="admin-input"
                      value={form.role}
                      onChange={e => setForm(f => ({ ...f, role: e.target.value as 'user' | 'manager' | 'admin' }))}
                    >
                      <option value="user">Пользователь</option>
                      <option value="manager">Менеджер</option>
                      <option value="admin">Администратор</option>
                    </select>
                  </div>
                  {inviteError && (
                    <p style={{ color: '#FF5C5C', fontSize: '0.85rem', marginTop: 10, marginBottom: 0 }}>
                      {inviteError}
                    </p>
                  )}
                  <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                    <button
                      type="button"
                      className="admin-btn-secondary"
                      style={{ flex: 1 }}
                      onClick={() => setShowModal(false)}
                      disabled={inviting}
                    >
                      Отмена
                    </button>
                    <button
                      type="submit"
                      className="admin-btn-primary"
                      style={{ flex: 2 }}
                      disabled={inviting || !form.email.trim()}
                    >
                      {inviting ? 'Создаём...' : 'Добавить'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
