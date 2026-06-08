import { useState, useRef, useEffect } from 'react';
import { LayoutDashboard, LogOut, ChevronDown, Zap, Search, X, Heart } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { useRegion } from '../context/RegionContext';
import { useWishlist } from '../context/WishlistContext';
import { supabase } from '../lib/supabase';
import LanguageSwitcher from './LanguageSwitcher';

type PageType = 'home' | 'ideas' | 'academy' | 'gallery' | 'calendar' | 'scripts' | 'referral' | 'collabs' | 'shop' | 'wishlist';

interface Props {
  setPage: (p: PageType) => void;
  onOpenDashboard: () => void;
}

export default function GlobalHeader({ setPage, onOpenDashboard }: Props) {
  const { user, profile, signOut } = useAuth();
  const { region, setRegion } = useRegion();
  const { wishlist } = useWishlist();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setSearchOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.length < 2) { setSearchResults([]); return; }
    const { data } = await supabase
      .from('creator_profiles')
      .select('id, username, display_name, avatar_url, creator_type')
      .or(`region.eq.${region},region.eq.ANY`)
      .or(`username.ilike.%${query}%,display_name.ilike.%${query}%`)
      .eq('is_published', true)
      .limit(5);
    if (data) setSearchResults(data);
  };

  const handleSignOut = async () => {
    setOpen(false);
    await signOut();
    window.location.replace('/');
  };

  const handleDashboard = () => {
    setOpen(false);
    if (profile?.role === 'admin') { window.location.href = '/admin'; return; }
    if (profile?.role === 'manager') { window.location.href = '/manager-panel'; return; }
    if (profile?.role === 'client' || user?.user_metadata?.portal === 'client') {
      window.location.href = '/brand/dashboard';
      return;
    }
    onOpenDashboard();
  };

  return (
    <header style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 200,
      height: 56,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 16px',
      background: 'rgba(8,13,22,0.92)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      borderBottom: '1px solid rgba(255,255,255,0.06)',
      gap: 12,
    }}>
      {/* Left: logo */}
      <button
        onClick={() => setPage('home')}
        style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', padding: 0, flexShrink: 0 }}
      >
        <div style={{
          width: 32, height: 32, borderRadius: 10,
          background: 'rgba(0,196,140,0.12)', border: '1px solid rgba(0,196,140,0.25)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Zap size={13} style={{ color: '#00C48C' }} fill="currentColor" />
        </div>
        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#94a3b8', letterSpacing: '-0.01em' }}
          className="hidden sm:block">
          YallaInfluencers
        </span>
      </button>

      {/* Center: Search */}
      <div
        ref={searchRef}
        className="hidden md:block"
        style={{ flex: 1, maxWidth: 360, position: 'relative' }}
      >
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '6px 12px',
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 10,
          transition: 'border-color 0.2s',
        }}>
          <Search size={14} style={{ color: '#64748b', flexShrink: 0 }} />
          <input
            type="text"
            placeholder="Search creators..."
            value={searchQuery}
            onChange={e => handleSearch(e.target.value)}
            onFocus={() => setSearchOpen(true)}
            style={{
              flex: 1, background: 'none', border: 'none',
              color: '#fff', outline: 'none', fontSize: 13,
            }}
          />
          {searchQuery && (
            <button
              onClick={() => { setSearchQuery(''); setSearchResults([]); }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', color: '#64748b' }}
            >
              <X size={13} />
            </button>
          )}
        </div>

        {searchOpen && searchResults.length > 0 && (
          <div style={{
            position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0,
            background: '#0d1525', border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 12, zIndex: 1000,
            boxShadow: '0 16px 48px rgba(0,0,0,0.4)',
            overflow: 'hidden',
          }}>
            {searchResults.map(creator => (
              <a
                key={creator.id}
                href={`/${creator.username}`}
                onClick={() => { setSearchOpen(false); setSearchQuery(''); setSearchResults([]); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                  borderBottom: '1px solid rgba(255,255,255,0.04)',
                  textDecoration: 'none', color: '#fff', transition: 'background 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'none')}
              >
                <img
                  src={creator.avatar_url || 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=80'}
                  alt={creator.display_name}
                  style={{ width: 32, height: 32, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {creator.display_name}
                  </p>
                  <p style={{ fontSize: 11, color: '#64748b', margin: 0 }}>@{creator.username}</p>
                </div>
                <span style={{ fontSize: 11, color: '#94a3b8', textTransform: 'capitalize', flexShrink: 0 }}>
                  {creator.creator_type?.replace(/_/g, ' ')}
                </span>
              </a>
            ))}
          </div>
        )}
      </div>

      {/* Right cluster */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <button
          onClick={() => setRegion(region === 'UAE' ? 'KZ' : 'UAE')}
          className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all hover:brightness-125"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#94a3b8' }}
          title="Switch region"
        >
          <span>{region === 'UAE' ? '\u{1F1E6}\u{1F1EA}' : '\u{1F1F0}\u{1F1FF}'}</span>
          <span>{region}</span>
        </button>

        {/* Wishlist button */}
        <button
          onClick={() => setPage('wishlist')}
          style={{
            position: 'relative', padding: '6px 8px',
            background: 'rgba(255,255,255,0.04)',
            border: wishlist.length > 0 ? '1px solid rgba(239,68,68,0.3)' : '1px solid rgba(255,255,255,0.08)',
            borderRadius: 8, color: wishlist.length > 0 ? '#ef4444' : '#94a3b8',
            cursor: 'pointer', display: 'flex', alignItems: 'center',
            transition: 'all 0.2s',
          }}
          title="Wishlist"
        >
          <Heart size={16} fill={wishlist.length > 0 ? 'currentColor' : 'none'} />
          {wishlist.length > 0 && (
            <span style={{
              position: 'absolute', top: -5, right: -5,
              background: '#ef4444', color: '#fff',
              borderRadius: '50%', width: 16, height: 16,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 10, fontWeight: 700, lineHeight: 1,
            }}>
              {wishlist.length > 9 ? '9+' : wishlist.length}
            </span>
          )}
        </button>

        <LanguageSwitcher variant="dark" />

        {user ? (
          <div ref={ref} style={{ position: 'relative' }}>
            <button
              onClick={() => setOpen(o => !o)}
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
                size={12} color="#64748b"
                style={{ transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
              />
            </button>

            {open && (
              <div style={{
                position: 'absolute', top: 'calc(100% + 6px)', right: 0,
                background: '#0f1520', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 14, padding: 5, minWidth: 168,
                boxShadow: '0 16px 48px rgba(0,0,0,0.55)', zIndex: 300,
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
