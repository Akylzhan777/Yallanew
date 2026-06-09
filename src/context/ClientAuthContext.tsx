import { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { safeGetItem } from '../utils/safeStorage';

export interface ClientProfile {
  id: string;
  user_id: string;
  display_name: string;
  company_name: string;
  email: string;
  phone: string;
  role: string;
  created_at: string;
}

interface ClientAuthContextType {
  session: Session | null;
  user: User | null;
  clientProfile: ClientProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, displayName?: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshClientProfile: () => Promise<void>;
}

const ClientAuthContext = createContext<ClientAuthContextType | null>(null);

export function useClientAuth() {
  const ctx = useContext(ClientAuthContext);
  if (!ctx) throw new Error('useClientAuth must be used within ClientAuthProvider');
  return ctx;
}

export function ClientAuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [clientProfile, setClientProfile] = useState<ClientProfile | null>(null);
  const [loading, setLoading] = useState(true);

  async function fetchClientProfile(userId: string) {
    try {
      const { data } = await supabase
        .from('client_profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
      if (data) {
        setClientProfile(data);
      } else {
        // Retry once after a short delay (handles replication lag after signup)
        await new Promise(r => setTimeout(r, 500));
        const { data: retry } = await supabase
          .from('client_profiles')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle();
        setClientProfile(retry ?? null);
      }
    } catch {
      setClientProfile(null);
    }
  }

  async function refreshClientProfile() {
    if (user) await fetchClientProfile(user.id);
  }

  useEffect(() => {
    let active = true;
    let initialDone = false;
    // Safety net so the loading spinner can never hang forever if the session
    // check stalls or the Supabase auth lock is contended.
    const loadingTimer = setTimeout(() => { if (active) setLoading(false); }, 5000);
    const stopLoading = () => {
      clearTimeout(loadingTimer);
      if (active) setLoading(false);
    };

    supabase.auth.getSession()
      .then(({ data: { session: s } }) => {
        if (!active) return;
        setSession(s);
        setUser(s?.user ?? null);
        if (s?.user) {
          fetchClientProfile(s.user.id).finally(() => { initialDone = true; stopLoading(); });
        } else {
          initialDone = true;
          stopLoading();
        }
      })
      .catch(() => { initialDone = true; stopLoading(); });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, s) => {
      if (!active) return;
      setSession(s);
      setUser(s?.user ?? null);
      // Defer Supabase calls out of the auth callback to avoid deadlocking the
      // internal auth lock (per supabase-js guidance), which would hang getSession().
      if (s?.user) {
        setTimeout(() => {
          if (!active) return;
          fetchClientProfile(s.user.id).finally(() => { if (initialDone) stopLoading(); });
        }, 0);
      } else {
        setClientProfile(null);
        if (initialDone) stopLoading();
      }
    });

    return () => {
      active = false;
      clearTimeout(loadingTimer);
      subscription.unsubscribe();
    };
  }, []);

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    return { error: null };
  }

  async function signUp(email: string, password: string, displayName?: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { portal: 'client', display_name: displayName ?? '' },
      },
    });
    if (error) return { error: error.message };

    // Manually create profile in case trigger didn't fire (e.g. email not yet confirmed)
    if (data.user) {
      const region = safeGetItem('selectedRegion') || 'UAE';
      await supabase.from('client_profiles').insert({
        user_id: data.user.id,
        email,
        display_name: displayName ?? email.split('@')[0],
        region,
      }).select().maybeSingle();

      // Immediately set session and profile so downstream components see it
      if (data.session) {
        setSession(data.session);
        setUser(data.user);
        await fetchClientProfile(data.user.id);
      }
    }
    return { error: null };
  }

  async function signOut() {
    await supabase.auth.signOut();
    setClientProfile(null);
  }

  return (
    <ClientAuthContext.Provider value={{ session, user, clientProfile, loading, signIn, signUp, signOut, refreshClientProfile }}>
      {children}
    </ClientAuthContext.Provider>
  );
}
