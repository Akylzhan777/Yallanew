import { useState } from 'react';
import { supabase } from '../lib/supabase';

type SheetMode = 'signin' | 'signup';

interface Props {
  onClose: () => void;
  onContinueAsGuest: () => void;
  onSuccess: () => void;
}

export default function AuthSheet({ onClose, onContinueAsGuest, onSuccess }: Props) {
  const [mode, setMode] = useState<SheetMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const switchMode = (m: SheetMode) => {
    setMode(m);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError('Пожалуйста, заполните все поля');
      return;
    }
    setLoading(true);
    setError('');
    const { error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (!signInError) {
      onSuccess();
      setLoading(false);
      return;
    }
    const msg = signInError.message.toLowerCase();
    if (msg.includes('invalid') || msg.includes('credentials') || msg.includes('wrong')) {
      setError('Неверный email или пароль');
    } else {
      setError(signInError.message);
    }
    setLoading(false);
  };

  return (
    <div className="auth-sheet-overlay" onClick={onClose}>
      <div className="auth-sheet" onClick={e => e.stopPropagation()}>
        <div className="auth-sheet-drag-handle" />

        <div className="auth-sheet-body">
          <div className="auth-sheet-logo">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#00C48C" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
          </div>

          <h2 className="auth-sheet-title">Добро пожаловать!</h2>

          <div className="auth-toggle" style={{ marginBottom: 20 }}>
            <button
              className={`auth-toggle-btn${mode === 'signin' ? ' active' : ''}`}
              onClick={() => switchMode('signin')}
              type="button"
            >
              Войти
            </button>
            <button
              className={`auth-toggle-btn${mode === 'signup' ? ' active' : ''}`}
              onClick={() => switchMode('signup')}
              type="button"
            >
              Регистрация
            </button>
          </div>

          {mode === 'signin' && (
            <>
              <p className="auth-sheet-sub">
                Войдите по почте, чтобы мы сохранили историю ваших съёмок и данные профиля.
              </p>
              <form onSubmit={handleSubmit} className="auth-sheet-form">
                <div className="auth-sheet-field">
                  <div className="auth-sheet-field-icon">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="2" y="4" width="20" height="16" rx="2"/>
                      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
                    </svg>
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={e => { setEmail(e.target.value); setError(''); }}
                    placeholder="Email"
                    className="auth-sheet-input"
                    autoComplete="email"
                    autoFocus
                  />
                </div>
                <div className="auth-sheet-field">
                  <div className="auth-sheet-field-icon">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="11" width="18" height="11" rx="2"/>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                    </svg>
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => { setPassword(e.target.value); setError(''); }}
                    placeholder="Пароль"
                    className="auth-sheet-input"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className="auth-sheet-eye"
                    onClick={() => setShowPassword(v => !v)}
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                        <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                        <line x1="1" y1="1" x2="23" y2="23"/>
                      </svg>
                    ) : (
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                        <circle cx="12" cy="12" r="3"/>
                      </svg>
                    )}
                  </button>
                </div>
                {error && <div className="auth-sheet-error">{error}</div>}
                <button type="submit" className="auth-sheet-btn" disabled={loading}>
                  {loading ? <span className="auth-sheet-spinner" /> : 'Войти'}
                </button>
              </form>
            </>
          )}

          {mode === 'signup' && (
            <div className="auth-invite-block">
              <div className="auth-invite-icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#00C48C" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
              </div>
              <div className="auth-invite-title">Доступ только по приглашениям</div>
              <p className="auth-invite-text">
                Пожалуйста, введите Email, который одобрил администратор.
              </p>
              <form onSubmit={handleSubmit} className="auth-sheet-form" style={{ marginTop: 4 }}>
                <div className="auth-sheet-field">
                  <div className="auth-sheet-field-icon">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="2" y="4" width="20" height="16" rx="2"/>
                      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
                    </svg>
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={e => { setEmail(e.target.value); setError(''); }}
                    placeholder="Email (одобренный администратором)"
                    className="auth-sheet-input"
                    autoComplete="email"
                    autoFocus
                  />
                </div>
                <div className="auth-sheet-field">
                  <div className="auth-sheet-field-icon">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="11" width="18" height="11" rx="2"/>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                    </svg>
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => { setPassword(e.target.value); setError(''); }}
                    placeholder="Пароль"
                    className="auth-sheet-input"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className="auth-sheet-eye"
                    onClick={() => setShowPassword(v => !v)}
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                        <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                        <line x1="1" y1="1" x2="23" y2="23"/>
                      </svg>
                    ) : (
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                        <circle cx="12" cy="12" r="3"/>
                      </svg>
                    )}
                  </button>
                </div>
                {error && <div className="auth-sheet-error">{error}</div>}
                <button type="submit" className="auth-sheet-btn" disabled={loading}>
                  {loading ? <span className="auth-sheet-spinner" /> : 'Продолжить'}
                </button>
              </form>
            </div>
          )}

          <button className="auth-sheet-skip" onClick={onContinueAsGuest}>
            Продолжить без регистрации
          </button>
        </div>
      </div>
    </div>
  );
}
