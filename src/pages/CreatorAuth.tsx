import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Mail, Lock, Eye, EyeOff, Zap, Star, Users, TrendingUp, ArrowRight, ChevronLeft } from 'lucide-react';
import { useCreatorAuth } from '../context/CreatorAuthContext';
import { supabase } from '../lib/supabase';

interface Props {
  onBack?: () => void;
}

function getInitialMode(): 'login' | 'register' {
  if (typeof window === 'undefined') return 'login';
  const m = new URLSearchParams(window.location.search).get('mode');
  return m === 'register' ? 'register' : 'login';
}

export default function CreatorAuth({ onBack }: Props) {
  const { t } = useTranslation();
  const { signIn, signUp } = useCreatorAuth();
  const [mode, setMode] = useState<'login' | 'register'>(getInitialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const inputCls = 'w-full rounded-xl px-4 py-3.5 text-sm text-white placeholder-slate-600 outline-none transition-all bg-[#0f1520] border border-[rgba(255,255,255,0.08)]';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!email.trim() || !password.trim()) { setError(t('creatorAuth.errors.fillAll')); return; }
    if (password.length < 6) { setError(t('creatorAuth.errors.shortPassword')); return; }
    setLoading(true);
    if (mode === 'login') {
      const { error: err } = await signIn(email, password);
      if (err) { setError(err); setLoading(false); return; }
      // Cross-role check: verify user is not a brand-only account
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: creatorRow } = await supabase.from('creator_profiles').select('id').eq('user_id', user.id).maybeSingle();
        if (!creatorRow) {
          const { data: clientRow } = await supabase.from('client_profiles').select('id').eq('user_id', user.id).maybeSingle();
          if (clientRow) {
            await supabase.auth.signOut();
            setError(t('creatorAuth.errors.wrongPortalBrand'));
            setLoading(false);
            return;
          }
        }
      }
    } else {
      const { error: err } = await signUp(email, password);
      if (err) setError(err);
      else setSuccess(t('creatorAuth.successCreated'));
    }
    setLoading(false);
  };

  const features = [
    { icon: <Users size={18} />, title: t('creatorAuth.features.discover.title'), desc: t('creatorAuth.features.discover.desc') },
    { icon: <TrendingUp size={18} />, title: t('creatorAuth.features.earnings.title'), desc: t('creatorAuth.features.earnings.desc') },
    { icon: <Star size={18} />, title: t('creatorAuth.features.portfolio.title'), desc: t('creatorAuth.features.portfolio.desc') },
  ];

  return (
    <div className="min-h-screen flex" style={{ background: '#080d16' }}>
      {/* Left panel – branding */}
      <div className="hidden lg:flex flex-col justify-between w-[46%] p-12 relative overflow-hidden"
        style={{ background: 'linear-gradient(160deg, #0d1a2e 0%, #071220 100%)' }}>
        <div className="absolute inset-0 pointer-events-none" style={{
          background: 'radial-gradient(ellipse 80% 60% at 10% 80%, rgba(0,196,140,0.1) 0%, transparent 60%)',
        }} />
        {onBack && (
          <button onClick={onBack} className="flex items-center gap-2 text-sm font-medium transition-colors relative z-10"
            style={{ color: '#475569' }}
            onMouseEnter={e => e.currentTarget.style.color = '#94a3b8'}
            onMouseLeave={e => e.currentTarget.style.color = '#475569'}>
            <ChevronLeft size={16} /> {t('creatorAuth.backToMarketplace')}
          </button>
        )}
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold mb-6"
            style={{ background: 'rgba(0,196,140,0.1)', color: '#00C48C', border: '1px solid rgba(0,196,140,0.25)' }}>
            <Zap size={11} fill="currentColor" /> {t('creatorAuth.creatorPortal')}
          </div>
          <h1 className="text-4xl font-bold leading-tight mb-4" style={{ color: '#f1f5f9', letterSpacing: '-0.02em' }}>
            {t('creatorAuth.heroLine1')}<br />
            <span style={{ background: 'linear-gradient(135deg, #00C48C, #38bdf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              {t('creatorAuth.heroAccent')}
            </span>
          </h1>
          <p className="text-sm leading-relaxed mb-10" style={{ color: '#64748b' }}>
            {t('creatorAuth.heroSubtitle')}
          </p>
          <div className="space-y-4">
            {features.map(f => (
              <div key={f.title} className="flex gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(0,196,140,0.1)', color: '#00C48C', border: '1px solid rgba(0,196,140,0.2)' }}>
                  {f.icon}
                </div>
                <div>
                  <div className="text-sm font-semibold text-white">{f.title}</div>
                  <div className="text-xs mt-0.5" style={{ color: '#475569' }}>{f.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="text-xs relative z-10" style={{ color: '#1e293b' }}>
          {t('creatorAuth.copyright')}
        </div>
      </div>

      {/* Right panel – form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          {onBack && (
            <button onClick={onBack} className="lg:hidden flex items-center gap-1.5 text-sm mb-6 transition-colors"
              style={{ color: '#475569' }}>
              <ChevronLeft size={15} /> {t('creatorAuth.back')}
            </button>
          )}

          <div className="mb-8">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(0,196,140,0.15)', border: '1px solid rgba(0,196,140,0.3)' }}>
                <Zap size={16} style={{ color: '#00C48C' }} />
              </div>
              <span className="font-bold text-white text-sm">{t('creatorAuth.brand')}</span>
            </div>
            <h2 className="text-2xl font-bold text-white mt-4">
              {mode === 'login' ? t('creatorAuth.welcomeBack') : t('creatorAuth.createAccount')}
            </h2>
            <p className="text-sm mt-1" style={{ color: '#475569' }}>
              {mode === 'login' ? t('creatorAuth.signInDesc') : t('creatorAuth.registerDesc')}
            </p>
          </div>

          {/* Mode toggle */}
          <div className="flex rounded-xl p-1 mb-6" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
            {(['login', 'register'] as const).map(m => (
              <button key={m} onClick={() => { setMode(m); setError(''); setSuccess(''); }}
                className="flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all"
                style={{
                  background: mode === m ? 'rgba(0,196,140,0.12)' : 'transparent',
                  color: mode === m ? '#00C48C' : '#475569',
                  border: mode === m ? '1px solid rgba(0,196,140,0.3)' : '1px solid transparent',
                }}>
                {m === 'login' ? t('creatorAuth.signIn') : t('creatorAuth.register')}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: '#64748b' }}>{t('creatorAuth.emailLabel')}</label>
              <div className="relative">
                <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: '#374151' }} />
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder={t('creatorAuth.emailPlaceholder')}
                  className={inputCls} style={{ paddingLeft: 38 }}
                  onFocus={e => e.currentTarget.style.borderColor = 'rgba(0,196,140,0.4)'}
                  onBlur={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'}
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: '#64748b' }}>{t('creatorAuth.passwordLabel')}</label>
              <div className="relative">
                <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: '#374151' }} />
                <input type={showPwd ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder={t('creatorAuth.passwordPlaceholder')}
                  className={inputCls} style={{ paddingLeft: 38, paddingRight: 44 }}
                  onFocus={e => e.currentTarget.style.borderColor = 'rgba(0,196,140,0.4)'}
                  onBlur={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'}
                />
                <button type="button" onClick={() => setShowPwd(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1" style={{ color: '#374151' }}>
                  {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="rounded-lg px-4 py-3 text-sm" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', color: '#f87171' }}>
                {error}
              </div>
            )}
            {success && (
              <div className="rounded-lg px-4 py-3 text-sm" style={{ background: 'rgba(0,196,140,0.08)', border: '1px solid rgba(0,196,140,0.25)', color: '#00C48C' }}>
                {success}
              </div>
            )}

            <button type="submit" disabled={loading}
              className="w-full py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #0e7c4a, #0a5c38)', color: '#fff', border: '1px solid rgba(0,196,140,0.3)', boxShadow: '0 8px 24px rgba(0,196,140,0.2)' }}>
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>{mode === 'login' ? t('creatorAuth.signIn') : t('creatorAuth.createAccountCta')} <ArrowRight size={15} /></>
              )}
            </button>
          </form>

          {mode === 'register' && (
            <p className="text-xs text-center mt-4" style={{ color: '#374151' }}>
              {t('creatorAuth.termsNotice')}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
