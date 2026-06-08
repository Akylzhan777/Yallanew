import { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase, Profile } from '../lib/supabase';

const PROFILE_CACHE_KEY = 'yalla_profile_cache';

function loadCachedProfile(): Profile | null {
  try {
    const raw = localStorage.getItem(PROFILE_CACHE_KEY);
    return raw ? (JSON.parse(raw) as Profile) : null;
  } catch {
    return null;
  }
}

function saveCachedProfile(profile: Profile) {
  try {
    localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(profile));
  } catch {}
}

function clearCachedProfile() {
  try {
    localStorage.removeItem(PROFILE_CACHE_KEY);
  } catch {}
}

function makeFallbackProfile(userId: string): Profile {
  return {
    id: userId,
    name: '',
    surname: '',
    dob: '',
    avatar_url: '',
    balance: 0,
    credits_expire_at: null,
    referral_code: '',
    invited_count: 0,
    earned_count: 0,
    current_subs: '0',
    start_subs: '0',
    growth: '',
    total_views: '0',
    videos_filmed: 0,
    is_admin: false,
    role: 'user',
    created_at: new Date().toISOString(),
  };
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  profile: null,
  loading: true,
  signOut: async () => {},
  refreshProfile: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(() => loadCachedProfile());
  const [loading, setLoading] = useState(true);
  const loadingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stopLoading = () => {
    if (loadingTimerRef.current) {
      clearTimeout(loadingTimerRef.current);
      loadingTimerRef.current = null;
    }
    setLoading(false);
  };

  const fetchProfile = async (userId: string) => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
      if (data) {
        setProfile(data);
        saveCachedProfile(data);
      } else {
        const fallback = makeFallbackProfile(userId);
        setProfile(fallback);
      }
      return data;
    } catch {
      const fallback = makeFallbackProfile(userId);
      setProfile(fallback);
      return null;
    }
  };

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.id);
  };

  useEffect(() => {
    loadingTimerRef.current = setTimeout(() => {
      setLoading(false);
    }, 5000);

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id).finally(stopLoading);
      } else {
        clearCachedProfile();
        setProfile(null);
        stopLoading();
      }
    }).catch(() => {
      stopLoading();
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        // Defer the profile fetch out of the auth callback to avoid deadlocking
        // the internal auth lock (per supabase-js guidance), which would hang getSession().
        setTimeout(() => { fetchProfile(session.user.id); }, 0);
      } else {
        clearCachedProfile();
        setProfile(null);
      }
    });

    return () => {
      subscription.unsubscribe();
      if (loadingTimerRef.current) clearTimeout(loadingTimerRef.current);
    };
  }, []);

  const signOut = async () => {
    clearCachedProfile();
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ session, user, profile, loading, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
