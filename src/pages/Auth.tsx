import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

type AuthMode = 'signin' | 'signup' | 'reset';

interface Props {
  onBack?: () => void;
  onPortal?: () => void;
}

export default function Auth({ onBack, onPortal }: Props) {
  const { session } = useAuth();
  const [mode, setMode] = useState<AuthMode>('signin');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const switchMode = (m: AuthMode) => {
    setMode(m);
    setError('');
    setPassword('');
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { error: err } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    if (err) {
      const msg = err.message.toLowerCase();
      if (msg.includes('wrong') || msg.includes('password') || msg.includes('invalid') || msg.includes('credentials')) {
        setError('Неверный email или пароль. Попробуйте ещё раз.');
      } else {
        setError('Доступ запрещён. Обратитесь к администратору.');
      }
      setLoading(false);
    } else {
      if (onPortal) onPortal();
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!firstName.trim() || !lastName.trim()) {
      setError('Пожалуйста, введите имя и фамилию.');
      return;
    }
    setLoading(true);
    const { data, error: err } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
    });
    if (err) {
      if (err.message.toLowerCase().includes('already')) {
        setError('Этот email уже зарегистрирован. Войдите через вкладку «Войти».');
      } else {
        setError(err.message);
      }
      setLoading(false);
      return;
    }
    if (data.user) {
      const { error: profileErr } = await supabase.from('profiles').upsert({
        id: data.user.id,
        name: firstName.trim(),
        surname: lastName.trim(),
      });
      if (profileErr) {
        setError('Аккаунт создан, но не удалось сохранить имя. Обратитесь к администратору.');
        setLoading(false);
        return;
      }
    }
    if (onPortal) onPortal();
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/`,
    });
    if (err) setError('Не удалось отправить письмо. Проверьте email.');
    else setResetSent(true);
    setLoading(false);
  };

  if (session) {
    return (
      <div className="auth-page">
        <div className="auth-wrapper">
          {onBack && (
            <button className="auth-back-link" onClick={onBack}>
              ← На главную
            </button>
          )}
          <div className="auth-card auth-already-in">
            <div className="auth-logo-block">
              <div className="auth-yalla-logo">
                <span className="auth-yalla-y">Y</span>alla
              </div>
              <div className="auth-portal-check">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#00C48C" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                  <path d="M22 4 12 14.01l-3-3"/>
                </svg>
              </div>
              <h1 className="auth-heading">Вы уже вошли</h1>
              <p className="auth-subheading">Добро пожаловать обратно в Yalla Portal</p>
            </div>
            <button className="auth-portal-btn" onClick={onPortal ?? onBack}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="3"/>
                <path d="M9 3v18M15 9l3 3-3 3"/>
              </svg>
              Перейти в мой кабинет
            </button>
            {onBack && (
              <button className="auth-text-link" onClick={onBack}>
                Вернуться на главную
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-wrapper">
        {onBack && (
          <button className="auth-back-link" onClick={onBack}>
            ← Назад
          </button>
        )}

        <div className="auth-card">
          <div className="auth-logo-block">
            <div className="auth-yalla-logo">
              <span className="auth-yalla-y">Y</span>alla
            </div>
            {mode === 'reset' ? (
              <>
                <h1 className="auth-heading">Сброс пароля</h1>
                <p className="auth-subheading">Введите email и мы пришлём ссылку</p>
              </>
            ) : mode === 'signup' ? (
              <>
                <h1 className="auth-heading">Создать аккаунт</h1>
                <p className="auth-subheading">Портал для сотрудников Yalla</p>
              </>
            ) : (
              <>
                <h1 className="auth-heading">Добро пожаловать!</h1>
                <p className="auth-subheading">Портал для сотрудников Yalla</p>
              </>
            )}
          </div>

          {mode === 'signin' && (
            <form onSubmit={handleSignIn} className="auth-form">
              <div>
                <label className="auth-label">Email</label>
                <input
                  className="auth-input"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  autoFocus
                />
              </div>
              <div>
                <label className="auth-label">Пароль</label>
                <input
                  className="auth-input"
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
              </div>
              {error && <p className="auth-error">{error}</p>}
              <button className="auth-submit" type="submit" disabled={loading}>
                {loading ? 'Подождите...' : 'Войти'}
              </button>
              <button type="button" className="auth-text-link" onClick={() => switchMode('reset')}>
                Забыли пароль?
              </button>
              <p className="auth-switch-hint">
                Нет аккаунта?{' '}
                <button type="button" className="auth-switch-link" onClick={() => switchMode('signup')}>
                  Зарегистрироваться
                </button>
              </p>
              {onBack && (
                <button type="button" className="auth-home-link" onClick={onBack}>
                  Вернуться на главную
                </button>
              )}
            </form>
          )}

          {mode === 'signup' && (
            <form onSubmit={handleSignUp} className="auth-form">
              <div className="auth-name-row">
                <div>
                  <label className="auth-label">Имя</label>
                  <input
                    className="auth-input"
                    type="text"
                    value={firstName}
                    onChange={e => setFirstName(e.target.value)}
                    placeholder="Иван"
                    required
                    autoFocus
                  />
                </div>
                <div>
                  <label className="auth-label">Фамилия</label>
                  <input
                    className="auth-input"
                    type="text"
                    value={lastName}
                    onChange={e => setLastName(e.target.value)}
                    placeholder="Иванов"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="auth-label">Email</label>
                <input
                  className="auth-input"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                />
              </div>
              <div>
                <label className="auth-label">Пароль</label>
                <input
                  className="auth-input"
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Минимум 6 символов"
                  required
                  minLength={6}
                />
              </div>
              {error && <p className="auth-error">{error}</p>}
              <button className="auth-submit" type="submit" disabled={loading}>
                {loading ? 'Создаём аккаунт...' : 'Зарегистрироваться'}
              </button>
              <p className="auth-switch-hint">
                Уже есть аккаунт?{' '}
                <button type="button" className="auth-switch-link" onClick={() => switchMode('signin')}>
                  Войти
                </button>
              </p>
              {onBack && (
                <button type="button" className="auth-home-link" onClick={onBack}>
                  Вернуться на главную
                </button>
              )}
            </form>
          )}

          {mode === 'reset' && (
            resetSent ? (
              <div className="auth-sent-block">
                <div className="auth-sent-title">Письмо отправлено!</div>
                <p className="auth-sent-sub">
                  Проверьте почту <strong>{email}</strong> и следуйте инструкции.
                </p>
                <button className="auth-text-link" onClick={() => { switchMode('signin'); setResetSent(false); }}>
                  Вернуться ко входу
                </button>
              </div>
            ) : (
              <form onSubmit={handleReset} className="auth-form">
                <div>
                  <label className="auth-label">Email</label>
                  <input
                    className="auth-input"
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    required
                    autoFocus
                  />
                </div>
                {error && <p className="auth-error">{error}</p>}
                <button className="auth-submit" type="submit" disabled={loading}>
                  {loading ? 'Отправляем...' : 'Отправить ссылку'}
                </button>
                <button type="button" className="auth-text-link" onClick={() => switchMode('signin')}>
                  Вернуться ко входу
                </button>
              </form>
            )
          )}
        </div>
      </div>
    </div>
  );
}
