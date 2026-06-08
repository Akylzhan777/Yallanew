import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

export interface CreatorProfile {
  id: string;
  user_id: string;
  display_name: string;
  handle: string | null;
  bio: string;
  creator_type: 'blogger' | 'model' | 'ugc' | 'videographer' | 'photographer' | 'editor';
  category: string;
  location: string;
  languages: string[];
  avatar_url: string | null;
  cover_url: string | null;
  instagram_url: string | null;
  youtube_url: string | null;
  tiktok_url: string | null;
  followers_count: number;
  avg_views: number;
  engagement_rate: number;
  onboarding_step: number;
  onboarding_done: boolean;
  profile_completion: number;
  is_published: boolean;
  is_verified: boolean;
  is_hidden: boolean;
  status: string; // 'active' | 'hidden' | 'banned'
  rating: number;
  review_count: number;
  balance_pending: number;
  balance_available: number;
  balance_total_earned: number;
  orders_completed: number;
  packages: CreatorPackage[];
  username: string | null;
  whatsapp_number: string | null;
  preferred_language: string;
  created_at: string;
  updated_at: string;
}

export interface CreatorPackage {
  id: string;
  name: string;
  description: string;
  price: number;
  clientPrice?: number;
  deliveryDays: number;
  includes: string[];
}

interface CreatorAuthContextType {
  session: Session | null;
  user: User | null;
  creatorProfile: CreatorProfile | null;
  loading: boolean;
  signUp: (email: string, password: string) => Promise<{ error: string | null }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshCreatorProfile: () => Promise<void>;
}

const CreatorAuthContext = createContext<CreatorAuthContextType>({
  session: null,
  user: null,
  creatorProfile: null,
  loading: true,
  signUp: async () => ({ error: null }),
  signIn: async () => ({ error: null }),
  signOut: async () => {},
  refreshCreatorProfile: async () => {},
});

export function CreatorAuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [creatorProfile, setCreatorProfile] = useState<CreatorProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchCreatorProfile = async (userId: string) => {
    const { data } = await supabase
      .from('creator_profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    setCreatorProfile(data ?? null);
    return data;
  };

  const refreshCreatorProfile = async () => {
    if (user) await fetchCreatorProfile(user.id);
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchCreatorProfile(session.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        (async () => { await fetchCreatorProfile(session.user.id); })();
      } else {
        setCreatorProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) return { error: error.message };
    return { error: null };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    return { error: null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setCreatorProfile(null);
  };

  return (
    <CreatorAuthContext.Provider value={{ session, user, creatorProfile, loading, signUp, signIn, signOut, refreshCreatorProfile }}>
      {children}
    </CreatorAuthContext.Provider>
  );
}

export const useCreatorAuth = () => useContext(CreatorAuthContext);
