import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { checkAndApplyDeadlinePenalties, getOverdueHours, calculateProgressivePenalty } from '../lib/deadlineUtils';
import DeadlineTimer from '../components/DeadlineTimer';

const AUTH_KEY = 'editor_portal_username';

const EN_MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const EN_DAYS_SHORT = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return `${EN_MONTHS_SHORT[d.getMonth()]} ${d.getDate()}, ${EN_DAYS_SHORT[d.getDay()]}`;
}

type EditingStatus = 'pending' | 'in_progress' | 'review' | 'completed';

const EDITING_STATUS_CONFIG: Record<EditingStatus, { label: string; color: string; bg: string; border: string; dot: string }> = {
  pending:     { label: 'Свободные заказы', color: '#94A3B8', bg: '#94A3B810', border: '#94A3B830', dot: '#94A3B8' },
  in_progress: { label: 'В работе', color: '#F59E0B', bg: '#F59E0B10', border: '#F59E0B35', dot: '#F59E0B' },
  review:      { label: 'На проверке', color: '#3B82F6', bg: '#3B82F610', border: '#3B82F635', dot: '#3B82F6' },
  completed:   { label: 'Готово', color: '#00C48C', bg: '#00C48C10', border: '#00C48C35', dot: '#00C48C' },
};

const COLUMNS: EditingStatus[] = ['pending', 'in_progress', 'review', 'completed'];

function getDeadlineBadge(deadline: string | null): { label: string; color: string; bg: string; border: string } | null {
  if (!deadline) return null;
  const now = Date.now();
  const dl = new Date(deadline).getTime();
  const diffMs = dl - now;
  const diffH = diffMs / (1000 * 60 * 60);
  if (diffMs < 0) return { label: 'Просрочено', color: '#FF4D4D', bg: '#FF4D4D18', border: '#FF4D4D44' };
  if (diffH <= 12) return { label: 'Скоро дедлайн', color: '#F59E0B', bg: '#F59E0B18', border: '#F59E0B44' };
  const d = new Date(deadline);
  const formatted = d.toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  return { label: formatted, color: '#00C48C', bg: '#00C48C12', border: '#00C48C40' };
}

interface VideoUnit {
  id: string;
  booking_id: string | null;
  client_name: string;
  script: string;
  raw_video_link: string;
  cover_photo_link: string;
  editing_status: string;
  final_video_link: string | null;
  final_cover_link: string | null;
  editor_name: string | null;
  created_at: string;
  claimed_at: string | null;
  deadline: string | null;
  deadline_penalty_applied: boolean;
  task_type: string;
  reward_amount: number;
  penalty_amount: number;
  is_priority: boolean;
  video_format: string | null;
  video_count: number | null;
}

interface BookingMeta {
  id: string;
  date: string;
  start_time: string;
  client_name: string;
}

interface EditorStats {
  completed: number;
  inReview: number;
  inProgress: number;
}

const BANNERS = [
  {
    background: 'linear-gradient(135deg, #0f2460 0%, #1e3a8a 40%, #1d4ed8 100%)',
    boxShadow: '0 4px 24px rgba(29, 78, 216, 0.25)',
    shadowHover: '0 8px 32px rgba(29, 78, 216, 0.4)',
    border: '1px solid rgba(59, 130, 246, 0.3)',
    icon: '🔥',
    title: 'Больше задач — больше кэша!',
    text: 'Не жди, пока заказы заберут другие. Заглядывай в «Свободные заказы» и забирай ролики в работу прямо сейчас.',
    textColor: '#93c5fd',
    tab: 'video' as const,
  },
  {
    background: 'linear-gradient(135deg, #3b0764 0%, #6b21a8 40%, #a21caf 100%)',
    boxShadow: '0 4px 24px rgba(162, 28, 175, 0.25)',
    shadowHover: '0 8px 32px rgba(162, 28, 175, 0.4)',
    border: '1px solid rgba(192, 38, 211, 0.3)',
    icon: '🎨',
    title: 'Зарабатывай на обложках',
    text: 'Простые и быстрые деньги. Обязательно проверяй вкладку «Дизайн обложек» — там тоже появляются новые заказы!',
    textColor: '#e879f9',
    tab: 'cover' as const,
  },
  {
    background: 'linear-gradient(135deg, #78350f 0%, #b45309 40%, #d97706 100%)',
    boxShadow: '0 4px 24px rgba(217, 119, 6, 0.3)',
    shadowHover: '0 8px 32px rgba(217, 119, 6, 0.5)',
    border: '1px solid rgba(251, 191, 36, 0.35)',
    icon: '🏆',
    title: 'Монтажер Месяца: Бонус $1000!',
    text: 'Сделай 100 качественных видео за март и забери главный приз. Покажи лучшую скорость и забери кэш!',
    textColor: '#fde68a',
    tab: 'video' as const,
  },
];

function BannerCarousel({ setActiveTab }: { setActiveTab: (tab: 'video' | 'cover') => void }) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [visible, setVisible] = useState(true);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const goTo = (index: number) => {
    setVisible(false);
    setTimeout(() => {
      setCurrentSlide(index);
      setVisible(true);
    }, 200);
  };

  const resetTimer = (index: number) => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setCurrentSlide(prev => {
          const next = (prev + 1) % BANNERS.length;
          return next;
        });
        setVisible(true);
      }, 200);
    }, 5000);
    goTo(index);
  };

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setCurrentSlide(prev => (prev + 1) % BANNERS.length);
        setVisible(true);
      }, 200);
    }, 5000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const banner = BANNERS[currentSlide];

  return (
    <div style={{ marginBottom: '24px' }}>
      <div
        style={{
          background: banner.background,
          borderRadius: '16px',
          padding: '24px 28px 28px',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: banner.boxShadow,
          border: banner.border,
          cursor: 'pointer',
          transition: 'opacity 0.25s ease, transform 0.2s ease, box-shadow 0.2s ease',
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0)' : 'translateY(6px)',
          minHeight: '130px',
        }}
        onClick={() => setActiveTab(banner.tab)}
        onMouseDown={e => { (e.currentTarget as HTMLDivElement).style.transform = 'scale(0.98)'; }}
        onMouseUp={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)'; }}
      >
        <div style={{
          position: 'absolute', top: -20, right: -20,
          width: 120, height: 120,
          background: 'rgba(255,255,255,0.04)',
          borderRadius: '50%',
        }} />
        <div style={{
          position: 'absolute', bottom: -30, right: 50,
          width: 90, height: 90,
          background: 'rgba(255,255,255,0.03)',
          borderRadius: '50%',
        }} />
        <div style={{ fontSize: '1.5rem', marginBottom: '8px' }}>{banner.icon}</div>
        <div style={{ fontSize: '1rem', fontWeight: 700, color: '#fff', marginBottom: '6px', lineHeight: 1.3 }}>
          {banner.title}
        </div>
        <div style={{ fontSize: '0.8rem', color: banner.textColor, lineHeight: 1.6, maxWidth: '560px' }}>
          {banner.text}
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '12px' }}>
        {BANNERS.map((_, i) => (
          <button
            key={i}
            onClick={() => resetTimer(i)}
            style={{
              width: i === currentSlide ? '24px' : '8px',
              height: '8px',
              borderRadius: '4px',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
              background: i === currentSlide ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.3)',
              transition: 'width 0.3s ease, background 0.3s ease',
            }}
          />
        ))}
      </div>
    </div>
  );
}

export default function EditorPortal() {
  const [currentEditorName, setCurrentEditorName] = useState<string | null>(() => {
    return localStorage.getItem(AUTH_KEY);
  });
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [units, setUnits] = useState<VideoUnit[]>([]);
  const [bookingMeta, setBookingMeta] = useState<Record<string, BookingMeta>>({});
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');
  const [linkDraft, setLinkDraft] = useState<Record<string, string>>({});
  const [coverLinkDraft, setCoverLinkDraft] = useState<Record<string, string>>({});
  const [linkSaving, setLinkSaving] = useState<Record<string, boolean>>({});
  const [expandedScripts, setExpandedScripts] = useState<Record<string, boolean>>({});
  const [submittingCards, setSubmittingCards] = useState<Record<string, boolean>>({});
  const [balance, setBalance] = useState<number>(0);
  const [manualAdjustment, setManualAdjustment] = useState<number>(0);
  const [stats, setStats] = useState<EditorStats>({ completed: 0, inReview: 0, inProgress: 0 });
  const [activeTab, setActiveTab] = useState<'video' | 'cover'>('video');
  const [leaderboardOpen, setLeaderboardOpen] = useState(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3200);
  };

  const fetchData = async () => {
    await checkAndApplyDeadlinePenalties();

    const { data: unitsData } = await supabase
      .from('video_units')
      .select('*')
      .order('created_at', { ascending: true });

    const allUnits = unitsData ?? [];
    setUnits(allUnits);

    if (currentEditorName) {
      const { data: editorData } = await supabase
        .from('editor_balances')
        .select('manual_adjustment')
        .eq('editor_name', currentEditorName)
        .maybeSingle();
      setManualAdjustment(editorData?.manual_adjustment ?? 0);
    }

    const bookingIds = [...new Set(allUnits.map(u => u.booking_id).filter(Boolean))];
    if (bookingIds.length > 0) {
      const { data: bookings } = await supabase
        .from('booking_events')
        .select('id, date, start_time, client_name')
        .in('id', bookingIds);
      const meta: Record<string, BookingMeta> = {};
      for (const b of bookings ?? []) {
        meta[b.id] = b;
      }
      setBookingMeta(meta);
    }

    setLoading(false);
  };

  const updateStats = (editorName: string | null) => {
    if (!editorName) {
      setStats({ completed: 0, inReview: 0, inProgress: 0 });
      return;
    }
    const editorUnits = units.filter(u => u.editor_name === editorName);
    setStats({
      completed: editorUnits.filter(u => (u.editing_status || 'pending') === 'completed').length,
      inReview: editorUnits.filter(u => (u.editing_status || 'pending') === 'review').length,
      inProgress: editorUnits.filter(u => (u.editing_status || 'pending') === 'in_progress').length,
    });
  };

  const calcMonthlyBalance = (editorName: string, allUnits: typeof units, adjustment: number): number => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();

    const earned = allUnits
      .filter(u => {
        if (u.editor_name !== editorName) return false;
        if ((u.editing_status || 'pending') !== 'completed') return false;
        if (!u.updated_at) return false;
        const d = new Date(u.updated_at);
        return d.getFullYear() === year && d.getMonth() === month;
      })
      .reduce((sum, u) => sum + (u.reward_amount ?? 0), 0);

    const penalties = allUnits
      .filter(u => {
        if (u.editor_name !== editorName) return false;
        if (!u.claimed_at) return false;
        const d = new Date(u.claimed_at);
        return d.getFullYear() === year && d.getMonth() === month;
      })
      .reduce((sum, u) => sum + (u.penalty_amount ?? 0), 0);

    return earned - penalties + adjustment;
  };

  useEffect(() => {
    if (!currentEditorName) return;
    fetchData();

    channelRef.current = supabase
      .channel('editor-portal-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'video_units' }, () => {
        fetchData();
      })
      .subscribe();

    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, [currentEditorName]);

  useEffect(() => {
    updateStats(currentEditorName);
  }, [units, currentEditorName]);

  useEffect(() => {
    if (!currentEditorName) { setBalance(0); return; }
    setBalance(calcMonthlyBalance(currentEditorName, units, manualAdjustment));
  }, [units, currentEditorName, manualAdjustment]);

  useEffect(() => {
    if (!currentEditorName || units.length === 0) return;

    const checkDeadlines = async () => {
      const now = new Date();
      for (const unit of units) {
        if (unit.editing_status === 'in_progress' && unit.editor_name === currentEditorName && unit.claimed_at && !unit.deadline_penalty_applied) {
          const claimedTime = new Date(unit.claimed_at);
          const hoursElapsed = (now.getTime() - claimedTime.getTime()) / (1000 * 60 * 60);

          if (hoursElapsed > 48) {
            await supabase
              .from('video_units')
              .update({ deadline_penalty_applied: true })
              .eq('id', unit.id);

            showToast('Дедлайн просрочен! Задача помечена.');
          }
        }
      }
    };

    checkDeadlines();
    const interval = setInterval(checkDeadlines, 60000);
    return () => clearInterval(interval);
  }, [units, currentEditorName]);

  const handleLogin = async () => {
    setLoginError('');
    const u = username.trim();
    const p = password.trim();

    if (!u || !p) {
      setLoginError('Заполните логин и пароль');
      return;
    }

    if (p.length < 6) {
      setLoginError('Пароль должен быть не менее 6 символов');
      return;
    }

    try {
      const supabaseUrl = (supabase as any).supabaseUrl as string;
      const res = await fetch(`${supabaseUrl}/functions/v1/editor-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: u, password: p }),
      });

      const json = await res.json();

      if (!res.ok || json.error) {
        const msg = json.error ?? 'Ошибка входа';
        setLoginError(msg);
        showToast(msg);
        return;
      }

      localStorage.setItem(AUTH_KEY, u);
      localStorage.setItem('auth_user', u);
      setCurrentEditorName(u);
      setUsername('');
      setPassword('');
    } catch (err: any) {
      const msg = 'Ошибка: ' + (err?.message ?? String(err));
      setLoginError(msg);
      showToast(msg);
    }
  };

  const claimTask = async (id: string) => {
    if (!currentEditorName) return;
    const unit = units.find(u => u.id === id);
    const reward = unit?.reward_amount ?? 10000;

    const { error } = await supabase
      .from('video_units')
      .update({
        editor_name: currentEditorName,
        editing_status: 'in_progress',
        claimed_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      showToast('Ошибка при взятии заказа: ' + error.message);
    } else {
      showToast('Заказ взят! Баланс обновится после завершения.');
      await fetchData();
    }
  };

  const releaseTask = async (id: string) => {
    if (!currentEditorName) return;
    const { error } = await supabase
      .from('video_units')
      .update({
        editor_name: null,
        editing_status: 'pending',
        claimed_at: null,
      })
      .eq('id', id);

    if (error) {
      showToast('Ошибка при отказе: ' + error.message);
    } else {
      showToast('Задача возвращена в очередь.');
      await fetchData();
    }
  };

  const updateStatus = async (id: string, status: EditingStatus) => {
    const { error } = await supabase
      .from('video_units')
      .update({ editing_status: status })
      .eq('id', id);
    if (error) {
      showToast('Ошибка: ' + error.message);
    } else {
      showToast('Статус обновлён');
      await fetchData();
    }
  };

  const saveLink = async (id: string) => {
    const videoLink = (linkDraft[id] ?? '').trim();
    const coverLink = (coverLinkDraft[id] ?? '').trim();

    if (!videoLink) {
      showToast('Вставьте ссылку на видео перед отправкой');
      return;
    }
    if (!coverLink) {
      showToast('Вставьте ссылку на обложку перед отправкой');
      return;
    }

    setLinkSaving(s => ({ ...s, [id]: true }));
    const { error } = await supabase
      .from('video_units')
      .update({ final_video_link: videoLink, final_cover_link: coverLink, editing_status: 'review' })
      .eq('id', id);
    if (error) {
      showToast('Error: ' + error.message);
    } else {
      showToast('Отправлено на проверку');
      setLinkDraft(d => { const n = { ...d }; delete n[id]; return n; });
      setCoverLinkDraft(d => { const n = { ...d }; delete n[id]; return n; });
      await fetchData();
    }
    setLinkSaving(s => ({ ...s, [id]: false }));
  };

  if (!currentEditorName) {
    return (
      <div className="editor-login-wrap">
        <div className="editor-login-card">
          <div className="editor-login-logo">
            <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
              <rect width="36" height="36" rx="10" fill="#00C48C" fillOpacity="0.12"/>
              <path d="M10 18L16 24L26 12" stroke="#00C48C" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h1 className="editor-login-title">Портал монтажера</h1>
          <p className="editor-login-sub">Введите учетные данные для доступа</p>
          <input
            className={`editor-login-input${loginError ? ' editor-login-input--err' : ''}`}
            type="text"
            placeholder="Логин"
            value={username}
            onChange={e => { setUsername(e.target.value); setLoginError(''); }}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            autoFocus
          />
          <input
            className={`editor-login-input${loginError ? ' editor-login-input--err' : ''}`}
            type="password"
            placeholder="Пароль"
            minLength={6}
            value={password}
            onChange={e => { setPassword(e.target.value); setLoginError(''); }}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
          />
          {password.length > 0 && password.length < 6 && (
            <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: '#F87171', textAlign: 'left', width: '100%' }}>
              Пароль должен быть не менее 6 символов
            </p>
          )}
          {loginError && <p className="editor-login-err">{loginError}</p>}
          <button className="editor-login-btn" onClick={handleLogin}>Войти</button>
        </div>
      </div>
    );
  }

  const leaderboard = (() => {
    const map: Record<string, number> = {};
    for (const u of units) {
      if ((u.editing_status || 'pending') === 'completed' && u.editor_name) {
        map[u.editor_name] = (map[u.editor_name] || 0) + 1;
      }
    }
    return Object.entries(map)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  })();

  const filteredUnits = units.filter(u =>
    activeTab === 'video' ? u.task_type !== 'cover' : u.task_type === 'cover'
  );

  const columns = COLUMNS.map(status => {
    let items: VideoUnit[] = [];

    if (status === 'pending') {
      items = filteredUnits.filter(u => (u.editing_status || 'pending') === 'pending' && !u.editor_name);
    } else if (status === 'in_progress') {
      items = filteredUnits.filter(u => (u.editing_status || 'pending') === 'in_progress' && u.editor_name === currentEditorName);
    } else if (status === 'review') {
      items = filteredUnits.filter(u => (u.editing_status || 'pending') === 'review' && u.editor_name === currentEditorName);
    } else if (status === 'completed') {
      items = filteredUnits.filter(u => (u.editing_status || 'pending') === 'completed' && u.editor_name === currentEditorName);
    }

    if (status === 'in_progress') {
      items.sort((a, b) => {
        if (a.is_priority !== b.is_priority) return a.is_priority ? -1 : 1;
        const aD = a.deadline ? new Date(a.deadline).getTime() : Infinity;
        const bD = b.deadline ? new Date(b.deadline).getTime() : Infinity;
        return aD - bD;
      });
    } else {
      items.sort((a, b) => {
        if (a.is_priority === b.is_priority) return 0;
        return a.is_priority ? -1 : 1;
      });
    }

    return {
      status,
      config: EDITING_STATUS_CONFIG[status as EditingStatus],
      items,
    };
  });

  return (
    <div className="editor-root">
      {toast && <div className="editor-toast">{toast}</div>}

      <div style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        width: '288px',
        zIndex: 50,
        fontFamily: 'inherit',
      }}>
        <button
          onClick={() => setLeaderboardOpen(o => !o)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            width: '100%',
            background: leaderboardOpen
              ? 'linear-gradient(135deg, #0d1f3c 0%, #1a2f52 100%)'
              : 'linear-gradient(135deg, #0d1f3c 0%, #1a2f52 100%)',
            border: '1px solid rgba(251,191,36,0.3)',
            borderRadius: leaderboardOpen ? '16px 16px 0 0' : '16px',
            padding: '12px 16px',
            cursor: 'pointer',
            color: '#fff',
            fontSize: '0.95rem',
            fontWeight: 700,
            boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
            transition: 'border-radius 0.2s',
          }}
        >
          <span style={{ fontSize: '1.1rem' }}>🏆</span>
          <span style={{ flex: 1, textAlign: 'left' }}>Топ монтажеров</span>
          <span style={{
            fontSize: '0.7rem',
            color: '#fbbf24',
            background: 'rgba(251,191,36,0.12)',
            border: '1px solid rgba(251,191,36,0.25)',
            borderRadius: '20px',
            padding: '2px 8px',
          }}>
            {leaderboardOpen ? 'Скрыть ▲' : 'Показать ▼'}
          </span>
        </button>

        {leaderboardOpen && (
          <div style={{
            background: 'rgba(13,20,45,0.97)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(251,191,36,0.2)',
            borderTop: 'none',
            borderRadius: '0 0 16px 16px',
            boxShadow: '0 12px 40px rgba(0,0,0,0.6)',
            padding: '12px 0 8px',
            maxHeight: '340px',
            overflowY: 'auto',
          }}>
            {leaderboard.length === 0 ? (
              <div style={{ padding: '16px', textAlign: 'center', color: '#64748b', fontSize: '0.82rem' }}>
                Пока нет завершённых задач
              </div>
            ) : (
              leaderboard.map((entry, i) => {
                const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : null;
                const isMe = entry.name === currentEditorName;
                return (
                  <div
                    key={entry.name}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '8px 16px',
                      borderRadius: '8px',
                      margin: '2px 8px',
                      background: isMe ? 'rgba(251,191,36,0.08)' : 'transparent',
                      border: isMe ? '1px solid rgba(251,191,36,0.2)' : '1px solid transparent',
                      transition: 'background 0.15s',
                    }}
                  >
                    {medal ? (
                      <span style={{ fontSize: '1.1rem', width: '22px', textAlign: 'center' }}>{medal}</span>
                    ) : (
                      <span style={{
                        width: '22px',
                        textAlign: 'center',
                        fontSize: '0.75rem',
                        color: '#475569',
                        fontWeight: 600,
                      }}>
                        #{i + 1}
                      </span>
                    )}
                    <span style={{
                      flex: 1,
                      fontSize: '0.88rem',
                      fontWeight: isMe ? 700 : 500,
                      color: isMe ? '#fbbf24' : '#e2e8f0',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {entry.name}
                    </span>
                    <span style={{
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      color: '#00C48C',
                      background: 'rgba(0,196,140,0.1)',
                      border: '1px solid rgba(0,196,140,0.2)',
                      borderRadius: '20px',
                      padding: '2px 10px',
                      whiteSpace: 'nowrap',
                    }}>
                      {entry.count} роликов
                    </span>
                  </div>
                );
              })
            )}

            <div style={{
              margin: '8px 16px 4px',
              paddingTop: '8px',
              borderTop: '1px solid rgba(255,255,255,0.06)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <span style={{ fontSize: '0.72rem', color: '#475569' }}>Цель: 100 роликов за март</span>
              <span style={{ fontSize: '0.72rem', color: '#fbbf24', fontWeight: 600 }}>$1000 бонус</span>
            </div>
          </div>
        )}
      </div>

      <header className="editor-header">
        <div className="editor-header-left">
          <div className="editor-header-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#00C48C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
            </svg>
          </div>
          <span className="editor-header-title">Editor Portal</span>
          <span className="editor-header-user">{currentEditorName}</span>
          <span className="editor-header-badge">{units.length} задач</span>
          <span className="editor-header-balance">₸ Баланс: {balance.toLocaleString('ru-RU')} ₸</span>
        </div>
        <button
          className="editor-logout-btn"
          onClick={() => {
            localStorage.removeItem(AUTH_KEY);
            localStorage.removeItem('auth_user');
            setCurrentEditorName(null);
          }}
        >
          Выйти
        </button>
      </header>

      <div className="editor-stat-bar">
        <div className="editor-stat-item">
          <span className="editor-stat-icon">💰</span>
          <span className="editor-stat-value">{balance.toLocaleString('ru-RU')} ₸</span>
        </div>
        <div className="editor-stat-divider" />
        <div className="editor-stat-item">
          <span className="editor-stat-icon">✅</span>
          <span className="editor-stat-label">Готово</span>
          <span className="editor-stat-value">{stats.completed}</span>
        </div>
        <div className="editor-stat-divider" />
        <div className="editor-stat-item">
          <span className="editor-stat-icon">🧐</span>
          <span className="editor-stat-label">На проверке</span>
          <span className="editor-stat-value">{stats.inReview}</span>
        </div>
        <div className="editor-stat-divider" />
        <div className="editor-stat-item">
          <span className="editor-stat-icon">⏳</span>
          <span className="editor-stat-label">В работе</span>
          <span className="editor-stat-value">{stats.inProgress}</span>
        </div>
      </div>

      <BannerCarousel setActiveTab={setActiveTab} />

      <div className="editor-tab-switcher">
        <button
          className={`editor-tab-btn ${activeTab === 'video' ? 'editor-tab-btn--active' : ''}`}
          onClick={() => setActiveTab('video')}
        >
          🎬 Монтаж видео
        </button>
        <button
          className={`editor-tab-btn ${activeTab === 'cover' ? 'editor-tab-btn--active' : ''}`}
          onClick={() => setActiveTab('cover')}
        >
          🎨 Дизайн обложек
        </button>
      </div>

      {loading ? (
        <div className="editor-loading">
          <div className="editor-spinner" />
          <span>Загрузка задач...</span>
        </div>
      ) : (
        <div className="editor-board">
          {columns.map(col => (
            <div key={col.status} className="editor-col">
              <div className="editor-col-header">
                <span className="editor-col-dot" style={{ background: col.config.dot }} />
                <span className="editor-col-label">{col.config.label}</span>
                <span className="editor-col-count">{col.items.length}</span>
              </div>

              <div className="editor-col-body">
                {col.items.length === 0 && (
                  <div className="editor-col-empty">Нет задач</div>
                )}
                {col.items.map(unit => {
                  const meta = unit.booking_id ? bookingMeta[unit.booking_id] : null;
                  const currentLink = linkDraft[unit.id] !== undefined ? linkDraft[unit.id] : (unit.final_video_link || '');
                  const currentCoverLink = coverLinkDraft[unit.id] !== undefined ? coverLinkDraft[unit.id] : (unit.final_cover_link || '');
                  const videoLinkDirty = linkDraft[unit.id] !== undefined && linkDraft[unit.id] !== (unit.final_video_link || '');
                  const coverLinkDirty = coverLinkDraft[unit.id] !== undefined && coverLinkDraft[unit.id] !== (unit.final_cover_link || '');
                  const isDirty = videoLinkDirty || coverLinkDirty;
                  const canSubmit = currentLink.trim() && currentCoverLink.trim();
                  const isMyClaim = unit.editor_name === currentEditorName;
                  const isAvailable = col.status === 'pending' && !unit.editor_name;

                  return (
                    <div key={unit.id} className={`editor-card editor-card--reel${unit.is_priority ? ' editor-card--priority' : ''}`}>

                      <div className="ec-toprow">
                        <div className="ec-toprow-left">
                          <span className="ec-client">{unit.client_name}</span>
                          {meta && <span className="ec-date">{formatDate(meta.date)} · {meta.start_time.slice(0,5)}</span>}
                        </div>
                        <div className="ec-toprow-right">
                          {(unit.editing_status || 'pending') === 'in_progress' && unit.claimed_at && (
                            <DeadlineTimer claimedAt={unit.claimed_at} deadlinePenaltyApplied={unit.deadline_penalty_applied} />
                          )}
                        </div>
                      </div>

                      <div className="ec-badges">
                        <span className={`ec-badge ${unit.task_type === 'cover' ? 'ec-badge--cover' : 'ec-badge--video'}`}>
                          {unit.task_type === 'cover' ? '🎨 Обложка' : '🎬 Монтаж'}
                        </span>
                        {unit.is_priority && (
                          <span className="ec-badge ec-badge--priority">🔥 СРОЧНО</span>
                        )}
                        {unit.video_format === 'horizontal' ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '2px 8px', borderRadius: 6, fontSize: '0.7rem', fontWeight: 700, background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(96,165,250,0.35)', color: '#93C5FD' }}>
                            🖥️ 16:9
                          </span>
                        ) : (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '2px 8px', borderRadius: 6, fontSize: '0.7rem', fontWeight: 700, background: 'rgba(168,85,247,0.15)', border: '1px solid rgba(192,132,252,0.35)', color: '#D8B4FE' }}>
                            📱 9:16
                          </span>
                        )}
                        {(unit.video_count ?? 1) > 1 && (
                          <span
                            style={{
                              display: 'inline-flex', alignItems: 'center', gap: 4,
                              padding: '2px 8px', borderRadius: 6,
                              fontSize: '0.7rem', fontWeight: 800,
                              background: 'rgba(251,191,36,0.15)',
                              border: '1px solid rgba(251,191,36,0.4)',
                              color: '#FBBF24',
                            }}
                            title="Количество видео в этой задаче"
                          >
                            🎞️ {unit.video_count} видео
                          </span>
                        )}
                        <span className="ec-badge ec-badge--reward">
                          💰 {(unit.reward_amount ?? ((unit.video_count ?? 1) * 10000)).toLocaleString('ru-RU')} ₸
                        </span>
                        {(() => {
                          const db = getDeadlineBadge(unit.deadline ?? null);
                          if (!db) return null;
                          const isOverdue = db.color === '#FF4D4D';
                          const isWarning = db.color === '#F59E0B';
                          if (isOverdue) {
                            const hoursOverdue = getOverdueHours(unit.claimed_at ?? null);
                            const penalty = calculateProgressivePenalty(hoursOverdue);
                            return (
                              <span className="inline-flex items-center gap-1 bg-red-900/30 text-red-400 border border-red-800/50 rounded text-xs px-2 py-1">
                                🔥 Просрочено (Штраф: -{penalty.toLocaleString('ru-RU')} ₸)
                              </span>
                            );
                          }
                          return (
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              padding: '2px 8px',
                              borderRadius: 6,
                              fontSize: '0.7rem',
                              fontWeight: 700,
                              color: db.color,
                              background: db.bg,
                              border: `1px solid ${db.border}`,
                              animation: isWarning ? 'pulse-orange 2s infinite' : 'none',
                            }}>
                              {isWarning ? '⚠️ ' + db.label : '⏰ До ' + db.label}
                            </span>
                          );
                        })()}
                      </div>

                      {unit.script && (
                        <div className="ec-script-wrap">
                          <div className={`ec-script ${expandedScripts[unit.id] ? 'ec-script--expanded' : 'ec-script--collapsed'}`}>
                            {unit.script}
                          </div>
                          {unit.script.split('\n').length > 2 && (
                            <button
                              className="ec-script-toggle"
                              onClick={() => setExpandedScripts(s => ({ ...s, [unit.id]: !s[unit.id] }))}
                            >
                              {expandedScripts[unit.id] ? 'Свернуть ↑' : 'Развернуть ↓'}
                            </button>
                          )}
                        </div>
                      )}

                      <div className="ec-source-links">
                        {unit.raw_video_link && (
                          <a href={unit.raw_video_link} target="_blank" rel="noopener noreferrer" className="ec-source-btn ec-source-btn--video">
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
                            </svg>
                            Исходники видео
                          </a>
                        )}
                        {unit.cover_photo_link && (
                          <a href={unit.cover_photo_link} target="_blank" rel="noopener noreferrer" className="ec-source-btn ec-source-btn--photo">
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                              <circle cx="8.5" cy="8.5" r="1.5"/>
                              <polyline points="21 15 16 10 5 21"/>
                            </svg>
                            Фото/Обложка
                          </a>
                        )}
                      </div>

                      {isAvailable && (
                        <button className="editor-claim-btn" onClick={() => claimTask(unit.id)}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 5v14M5 12l7 7 7-7"/>
                          </svg>
                          Взять задачу
                        </button>
                      )}

                      {(unit.editing_status || 'pending') === 'in_progress' && (
                        <div className="ec-submit-section">
                          {!submittingCards[unit.id] ? (
                            <div className="ec-submit-trigger-row">
                              <button
                                className="ec-submit-trigger-btn"
                                onClick={() => setSubmittingCards(s => ({ ...s, [unit.id]: true }))}
                              >
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points="20 6 9 17 4 12"/>
                                </svg>
                                Сдать работу
                              </button>
                              {isMyClaim && (
                                <button className="ec-release-link" onClick={() => releaseTask(unit.id)}>
                                  Отказаться
                                </button>
                              )}
                            </div>
                          ) : (
                            <>
                              <input
                                className="ec-link-input"
                                type="url"
                                placeholder="Ссылка на готовое видео..."
                                value={currentLink}
                                onChange={e => setLinkDraft(d => ({ ...d, [unit.id]: e.target.value }))}
                                autoFocus
                              />
                              <input
                                className="ec-link-input"
                                type="url"
                                placeholder="Ссылка на готовую обложку..."
                                value={currentCoverLink}
                                onChange={e => setCoverLinkDraft(d => ({ ...d, [unit.id]: e.target.value }))}
                              />
                              <div className="ec-submit-actions-row">
                                <button
                                  className="editor-link-save-btn"
                                  disabled={!canSubmit || linkSaving[unit.id]}
                                  onClick={() => saveLink(unit.id)}
                                >
                                  {linkSaving[unit.id] ? '...' : 'Отправить на проверку'}
                                </button>
                                <button
                                  className="ec-cancel-link"
                                  onClick={() => setSubmittingCards(s => ({ ...s, [unit.id]: false }))}
                                >
                                  Отмена
                                </button>
                              </div>
                              {isMyClaim && (
                                <button className="ec-release-link" onClick={() => releaseTask(unit.id)}>
                                  Отказаться от задачи
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      )}

                      {(unit.editing_status || 'pending') === 'review' && (
                        <div className="ec-review-notice">
                          На проверке у администратора
                        </div>
                      )}

                      {(unit.editing_status || 'pending') === 'completed' && unit.final_video_link && (
                        <a
                          href={unit.final_video_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="editor-link-open-btn"
                          style={{ display: 'block', textAlign: 'center' }}
                        >
                          Открыть видео
                        </a>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
