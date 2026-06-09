import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Mail, Lock, Eye, EyeOff, Building2, ArrowRight, ChevronLeft, ShoppingBag, BarChart3, Shield } from 'lucide-react';
import { useClientAuth } from '../context/ClientAuthContext';
import { supabase } from '../lib/supabase';
import { safeGetItem, safeRemoveItem } from '../utils/safeStorage';

interface Props {
  onBack?: () => void;
}

export default function ClientAuth({ onBack }: Props) {
  const { t } = useTranslation();
  const { signIn, signUp } = useClientAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const inputCls = 'w-full rounded-xl px-4 py-3.5 text-sm text-white placeholder-slate-600 outline-none transition-all bg-[#0f1520] border border-[rgba(255,255,255,0.08)]';
  const focusBorder = (e: React.FocusEvent<HTMLInputElement>) => { e.currentTarget.style.borderColor = 'rgba(56,189,248,0.45)'; };
  const blurBorder  = (e: React.FocusEvent<HTMLInputElement>) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!email.trim() || !password.trim()) { setError(t('clientAuth.errors.fillAll')); return; }
    if (password.length < 6) { setError(t('clientAuth.errors.shortPassword')); return; }
    if (mode === 'register' && !displayName.trim()) { setError(t('clientAuth.errors.needName')); return; }
    setLoading(true);
    if (mode === 'login') {
      const { error: err } = await signIn(email, password);
      if (err) { setError(err); setLoading(false); return; }
      // Cross-role check: verify user is not a creator-only account
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: clientRow } = await supabase.from('client_profiles').select('id').eq('user_id', user.id).maybeSingle();
        if (!clientRow) {
          const { data: creatorRow } = await supabase.from('creator_profiles').select('id').eq('user_id', user.id).maybeSingle();
          if (creatorRow) {
            await supabase.auth.signOut();
            setError(t('clientAuth.errors.wrongPortalCreator'));
            setLoading(false);
            return;
          }
        }
      }
      const intent = safeGetItem('brand_checkout_intent');
      if (intent) {
        try {
          const { username } = JSON.parse(intent);
          safeRemoveItem('brand_checkout_intent');
          window.location.replace(`/${username}`);
        } catch { window.location.replace('/brand/dashboard'); }
      } else {
        window.location.replace('/brand/dashboard');
      }
    } else {
      const { error: err } = await signUp(email, password, displayName);
      if (err) { setError(err); setLoading(false); return; }
      // Auto-login after signup
      const { error: loginErr } = await signIn(email, password);
      if (loginErr) {
        setSuccess(t('clientAuth.successCreated'));
        setMode('login');
      } else {
        const intent = safeGetItem('brand_checkout_intent');
        if (intent) {
          try {
            const { username } = JSON.parse(intent);
            safeRemoveItem('brand_checkout_intent');
            window.location.replace(`/${username}`);
          } catch { window.location.replace('/brand/dashboard'); }
        } else {
          window.location.replace('/brand/dashboard');
        }
      }
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex" style={{ background: '#080d16' }}>

      {/* Left panel – branding */}
      <div className="hidden lg:flex flex-col justify-between w-[46%] p-12 relative overflow-hidden"
        style={{ background: 'linear-gradient(160deg, #0d1826 0%, #071018 100%)' }}>
        <div className="absolute inset-0 pointer-events-none" style={{
          background: 'radial-gradient(ellipse 80% 60% at 10% 80%, rgba(56,189,248,0.08) 0%, transparent 60%)',
        }} />

        {onBack && (
          <button onClick={onBack} className="flex items-center gap-2 text-sm font-medium transition-colors relative z-10"
            style={{ color: '#475569' }}
            onMouseEnter={e => e.currentTarget.style.color = '#94a3b8'}
            onMouseLeave={e => e.currentTarget.style.color = '#475569'}>
            <ChevronLeft size={16} /> Back to marketplace
          </button>
        )}

        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold mb-6"
            style={{ background: 'rgba(56,189,248,0.1)', color: '#38bdf8', border: '1px solid rgba(56,189,248,0.25)' }}>
            <Building2 size={11} /> Client Portal
          </div>
          <h1 className="text-4xl font-bold leading-tight mb-4" style={{ color: '#f1f5f9', letterSpacing: '-0.02em' }}>
            Find & book<br />
            <span style={{ background: 'linear-gradient(135deg, #38bdf8, #818cf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              top creators
            </span>
          </h1>
          <p className="text-sm leading-relaxed mb-10" style={{ color: '#64748b' }}>
            Connect with 200+ verified influencers and UGC creators in the UAE. Track every campaign from one dashboard.
          </p>
          <div className="space-y-4">
            {[
              { icon: <ShoppingBag size={18} />, title: 'Manage all your orders', desc: 'See every active campaign, delivery status, and payment in one place.' },
              { icon: <Shield size={18} />, title: 'Escrow-protected payments', desc: 'Funds are held safely until you approve the delivered content.' },
              { icon: <BarChart3 size={18} />, title: 'Billing & invoices', desc: 'Full transaction history for your accounting and reporting.' },
            ].map(f => (
              <div key={f.title} className="flex gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(56,189,248,0.1)', color: '#38bdf8', border: '1px solid rgba(56,189,248,0.2)' }}>
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
          © 2025 Yalla Influencers. All rights reserved.
        </div>
      </div>

      {/* Right panel – form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          {onBack && (
            <button onClick={onBack} className="lg:hidden flex items-center gap-1.5 text-sm mb-6 transition-colors"
              style={{ color: '#475569' }}>
              <ChevronLeft size={15} /> Back
            </button>
          )}

          <div className="mb-8">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: 'rgba(56,189,248,0.15)', border: '1px solid rgba(56,189,248,0.3)' }}>
                <Building2 size={15} style={{ color: '#38bdf8' }} />
              </div>
              <span className="font-bold text-white text-sm">Yalla Clients</span>
            </div>
            <h2 className="text-2xl font-bold text-white mt-4">
              {mode === 'login' ? 'Welcome back' : 'Create your account'}
            </h2>
            <p className="text-sm mt-1" style={{ color: '#475569' }}>
              {mode === 'login' ? 'Sign in to your client dashboard' : 'Start booking creators for your brand today'}
            </p>
          </div>

          {/* Mode toggle */}
          <div className="flex rounded-xl p-1 mb-6" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
            {(['login', 'register'] as const).map(m => (
              <button key={m} onClick={() => { setMode(m); setError(''); setSuccess(''); }}
                className="flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all"
                style={{
                  background: mode === m ? 'rgba(56,189,248,0.12)' : 'transparent',
                  color: mode === m ? '#38bdf8' : '#475569',
                  border: mode === m ? '1px solid rgba(56,189,248,0.3)' : '1px solid transparent',
                }}>
                {m === 'login' ? 'Sign In' : 'Register'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: '#64748b' }}>Name / Company *</label>
                <div className="relative">
                  <Building2 size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: '#374151' }} />
                  <input type="text" value={displayName} onChange={e => setDisplayName(e.target.value)}
                    placeholder="Brand or your full name"
                    className={inputCls} style={{ paddingLeft: 38 }}
                    onFocus={focusBorder} onBlur={blurBorder}
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: '#64748b' }}>Email address</label>
              <div className="relative">
                <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: '#374151' }} />
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  className={inputCls} style={{ paddingLeft: 38 }}
                  onFocus={focusBorder} onBlur={blurBorder}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: '#64748b' }}>Password</label>
              <div className="relative">
                <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: '#374151' }} />
                <input type={showPwd ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="Min. 6 characters"
                  className={inputCls} style={{ paddingLeft: 38, paddingRight: 44 }}
                  onFocus={focusBorder} onBlur={blurBorder}
                />
                <button type="button" onClick={() => setShowPwd(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1" style={{ color: '#374151' }}>
                  {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="rounded-lg px-4 py-3 text-sm"
                style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', color: '#f87171' }}>
                {error}
              </div>
            )}
            {success && (
              <div className="rounded-lg px-4 py-3 text-sm"
                style={{ background: 'rgba(56,189,248,0.08)', border: '1px solid rgba(56,189,248,0.25)', color: '#38bdf8' }}>
                {success}
              </div>
            )}

            <button type="submit" disabled={loading}
              className="w-full py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #0c4a6e, #0369a1)', color: '#fff', border: '1px solid rgba(56,189,248,0.3)', boxShadow: '0 8px 24px rgba(56,189,248,0.15)' }}>
              {loading
                ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : <>{mode === 'login' ? 'Sign In' : 'Create Account'} <ArrowRight size={15} /></>}
            </button>
          </form>

          {mode === 'register' && (
            <p className="text-xs text-center mt-4" style={{ color: '#374151' }}>
              By registering, you agree to our Terms of Service and Privacy Policy.
            </p>
          )}

          <div className="mt-6 pt-5 text-center" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            <p className="text-xs" style={{ color: '#374151' }}>
              Are you a creator?{' '}
              <a href="/creator-login" className="font-semibold transition-colors" style={{ color: '#00C48C' }}
                onMouseEnter={e => e.currentTarget.style.color = '#34d399'}
                onMouseLeave={e => e.currentTarget.style.color = '#00C48C'}>
                Creator portal →
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
