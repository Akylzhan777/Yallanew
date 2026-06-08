import { useState, useRef, useEffect } from 'react';
import { LayoutDashboard, LogOut, ChevronDown, Zap, Globe } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { useAppPreferences, REGION_OPTIONS, type Region } from '../context/AppPreferencesContext';
import LanguageSwitcher from './LanguageSwitcher';

type PageType = 'home' | 'ideas' | 'academy' | 'gallery' | 'calendar' | 'scripts' | 'referral' | 'collabs' | 'shop';

interface Props {
  setPage: (p: PageType) => void;
  onOpenDashboard: () => void;
}

export default function GlobalHeader({ setPage, onOpenDashboard }: Props) {
  const { user, profile, signOut } = useAuth();
  const { selectedRegion, setSelectedRegion, regionOption } = useAppPreferences();
  const { t } = useTranslation();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [regionMenuOpen, setRegionMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const regionMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) setUserMenuOpen(false);
      if (regionMenuRef.current && !regionMenuRef.current.contains(e.target as Node)) setRegionMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSignOut = async () => {
    setUserMenuOpen(false);
    await signOut();
    window.location.replace('/');
  };

  const handleDashboard = () => {
    setUserMenuOpen(false);
    if (profile?.role === 'admin') { window.location.href = '/admin'; return; }
    if (profile?.role === 'manager') { window.location.href = '/manager-panel'; return; }
    if (profile?.role === 'client' || user?.user_metadata?.portal === 'client') {
      window.location.href = '/brand/dashboard';
      return;
    }
    onOpenDashboard();
  };

  const handleRegionSelect = (r: Region) => {
    setSelectedRegion(r);
    setRegionMenuOpen(false);
  };

  return (
    <header style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 200,
      height: 56,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 20px',
      background: 'rgba(8,13,22,0.92)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      borderBottom: '1px solid rgba(255,255,255,0.06)',
    }}>
      {/* Logo */}
      <button
        onClick={() => setPage('home')}
        style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
      >
        <div style={{
          width: 32, height: 32, borderRadius: 10,
          background: 'rgba(0,196,140,0.12)', border: '1px solid rgba(0,196,140,0.25)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <Zap size={13} style={{ color: '#00C48C' }} fill="currentColor" />
        </div>
        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#94a3b8', letterSpacing: '-0.01em' }}
          className="hidden sm:block">
          YallaInfluencers
        </span>
      </button>

      {/* Right cluster */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>

        {/* Region dropdown */}
        <div ref={regionMenuRef} style={{ position: 'relative' }}>
          <button
            onClick={() => setRegionMenuOpen(o => !o)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all hover:brightness-125"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#94a3b8', cursor: 'pointer' }}
            title="Select region"
          >
            {selectedRegion === 'ALL'
              ? <Globe size={12} style={{ color: '#64748b' }} />
              : <span style={{ fontSize: '0.9em' }}>{regionOption.flag}</span>
            }
            <span>{selectedRegion === 'ALL' ? 'All' : selectedRegion}</span>
            <ChevronDown
              size={10}
              color="#64748b"
              style={{ transition: 'transform 0.2s', transform: regionMenuOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
            />
          </button>

          {regionMenuOpen && (
            <div style={{
              position: 'absolute', top: 'calc(100% + 6px)', right: 0,
              background: '#0f1520', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 12, padding: 4, minWidth: 180,
              boxShadow: '0 16px 48px rgba(0,0,0,0.55)',
              zIndex: 300,
            }}>
              {REGION_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => handleRegionSelect(opt.value)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 9, width: '100%',
                    padding: '8px 12px', borderRadius: 8, background: 'none', border: 'none',
                    cursor: 'pointer', textAlign: 'left', transition: 'background 0.15s',
                    color: selectedRegion === opt.value ? '#00C48C' : '#e2e8f0',
                    fontSize: '0.8rem', fontWeight: selectedRegion === opt.value ? 700 : 500,
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                >
                  <span style={{ fontSize: '1em', width: 18, textAlign: 'center', flexShrink: 0 }}>
                    {opt.value === 'ALL' ? '🌍' : opt.flag}
                  </span>
                  <div>
                    <div style={{ lineHeight: 1.2 }}>{opt.label}</div>
                    {opt.currency && (
                      <div style={{ fontSize: '0.7rem', color: '#64748b', lineHeight: 1 }}>{opt.currency}</div>
                    )}
                  </div>
                  {selectedRegion === opt.value && (
                    <div style={{ marginLeft: 'auto', width: 6, height: 6, borderRadius: '50%', background: '#00C48C', flexShrink: 0 }} />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        <LanguageSwitcher variant="dark" />

        {user ? (
          <div ref={userMenuRef} style={{ position: 'relative' }}>
            <button
              onClick={() => setUserMenuOpen(o => !o)}
              style={{
                display: 'flex', alignItems: 'center', gap: 7,
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 12, padding: '4px 10px 4px 4px',
                cursor: 'pointer', transition: 'all 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.14)'; e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
            >
              <div style={{
                width: 28, height: 28, borderRadius: 8, overflow: 'hidden', flexShrink: 0,
                background: 'rgba(0,196,140,0.12)', border: '1px solid rgba(0,196,140,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {profile?.avatar_url
                  ? <img src={profile.avatar_url} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#00C48C' }}>{user.email?.[0]?.toUpperCase() ?? '?'}</span>
                }
              </div>
              <ChevronDown
                size={12}
                color="#64748b"
                style={{ transition: 'transform 0.2s', transform: userMenuOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
              />
            </button>

            {userMenuOpen && (
              <div style={{
                position: 'absolute', top: 'calc(100% + 6px)', right: 0,
                background: '#0f1520', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 14, padding: 5, minWidth: 168,
                boxShadow: '0 16px 48px rgba(0,0,0,0.55)',
                zIndex: 300,
              }}>
                <button
                  onClick={handleDashboard}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 9, width: '100%',
                    padding: '9px 12px', borderRadius: 9, background: 'none', border: 'none',
                    cursor: 'pointer', color: '#e2e8f0', fontSize: '0.8rem', fontWeight: 600,
                    textAlign: 'left', transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                >
                  <LayoutDashboard size={13} color="#64748b" />
                  {t('nav.dashboard', 'Dashboard')}
                </button>
                <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '3px 0' }} />
                <button
                  onClick={handleSignOut}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 9, width: '100%',
                    padding: '9px 12px', borderRadius: 9, background: 'none', border: 'none',
                    cursor: 'pointer', color: '#94a3b8', fontSize: '0.8rem', fontWeight: 600,
                    textAlign: 'left', transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.06)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                >
                  <LogOut size={13} color="#f87171" />
                  {t('nav.logout', 'Logout')}
                </button>
              </div>
            )}
          </div>
        ) : (
          <a
            href="/login"
            style={{
              padding: '7px 16px', borderRadius: 10, textDecoration: 'none',
              background: 'rgba(0,196,140,0.08)', color: '#00C48C',
              border: '1px solid rgba(0,196,140,0.2)', fontSize: '0.8rem', fontWeight: 600,
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,196,140,0.14)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(0,196,140,0.08)')}
          >
            {t('nav.login', 'Login')}
          </a>
        )}
      </div>
    </header>
  );
}
