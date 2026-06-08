/**
 * Global data store for shared Supabase data.
 *
 * Single source of truth for:
 *   - editor_balances  → editors
 *   - video_units      → activeVideos (pending/in_progress/review)
 *                        completedVideos (completed, current month)
 *                        allCompletedVideos (completed, current month, with client join)
 *   - clients          → totalDebt
 *   - shootings_accounting → shootingClients
 *   - locations        → locations
 *
 * Both /admin and /manager mount this provider once (via App.tsx route wrappers).
 * Realtime subscriptions live here, so all consumers see updates instantly.
 */

import { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { checkAndApplyDeadlinePenalties } from '../lib/deadlineUtils';

/* ─── Shared types (re-exported for consumers) ───────────────────────────── */

export interface EditorRow {
  editor_name: string;
  balance: number;
  password: string;
  created_at: string;
  updated_at: string;
  whatsapp_number?: string;
  manual_adjustment?: number;
  id?: string;
}

export interface VideoUnitRow {
  id: string;
  client_name: string;
  editor_name: string | null;
  editing_status: string;
  raw_video_link: string;
  final_video_link: string | null;
  claimed_at: string | null;
  deadline: string | null;
  updated_at?: string;
  task_type: string;
  reward_amount: number;
  penalty_amount?: number;
  client_price?: number | null;
  is_priority: boolean;
  client_id?: string | null;
  clients?: { is_barter: boolean } | null;
  video_format?: string | null;
  script?: string | null;
  final_cover_link?: string | null;
  video_link?: string | null;
  deadline_penalty_applied?: boolean;
}

export interface CompletedVideoRow {
  id: string;
  editor_name: string | null;
  editing_status: string;
  claimed_at: string | null;
  updated_at?: string;
  reward_amount: number;
  penalty_amount?: number;
  client_price?: number | null;
  client_id?: string | null;
  clients?: { is_barter: boolean } | null;
}

export interface ShootingClientRow {
  id: string;
  name: string;
  purchased: number;
  filmed: number;
  sources_link: string;
  created_at: string;
  tariff_type: 'package' | 'monthly';
  subscription_end_date: string | null;
  subscription_price: number | null;
}

export interface LocationRow {
  id: string;
  name: string;
  description: string;
  image_url: string;
  maps_url: string;
  created_at: string;
}

/* ─── Context value shape ────────────────────────────────────────────────── */

interface DataContextValue {
  // Data
  editors: EditorRow[];
  activeVideos: VideoUnitRow[];
  completedVideos: CompletedVideoRow[];
  allCompletedVideos: CompletedVideoRow[];
  totalDebt: number;
  shootingClients: ShootingClientRow[];
  locations: LocationRow[];

  // Loading
  editorsLoading: boolean;
  videosLoading: boolean;
  shootingClientsLoading: boolean;
  locationsLoading: boolean;

  // Refetch triggers (mutations call these after writes)
  refetchEditors: () => Promise<void>;
  refetchVideos: () => Promise<void>;
  refetchShootingClients: () => Promise<void>;
  refetchLocations: () => Promise<void>;

  // Optimistic helpers for immediate UI updates
  setActiveVideos: React.Dispatch<React.SetStateAction<VideoUnitRow[]>>;
  setShootingClients: React.Dispatch<React.SetStateAction<ShootingClientRow[]>>;
  setLocations: React.Dispatch<React.SetStateAction<LocationRow[]>>;
}

const DataContext = createContext<DataContextValue | null>(null);

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used inside DataProvider');
  return ctx;
}

/* ─── Provider ───────────────────────────────────────────────────────────── */

export function DataProvider({ children }: { children: ReactNode }) {
  const [editors, setEditors] = useState<EditorRow[]>([]);
  const [activeVideos, setActiveVideos] = useState<VideoUnitRow[]>([]);
  const [completedVideos, setCompletedVideos] = useState<CompletedVideoRow[]>([]);
  const [allCompletedVideos, setAllCompletedVideos] = useState<CompletedVideoRow[]>([]);
  const [totalDebt, setTotalDebt] = useState(0);
  const [shootingClients, setShootingClients] = useState<ShootingClientRow[]>([]);
  const [locations, setLocations] = useState<LocationRow[]>([]);

  const [editorsLoading, setEditorsLoading] = useState(true);
  const [videosLoading, setVideosLoading] = useState(true);
  const [shootingClientsLoading, setShootingClientsLoading] = useState(true);
  const [locationsLoading, setLocationsLoading] = useState(true);

  const editorSubRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const videoSubRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const shootingSubRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const locationsSubRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  /* ── Fetch functions ── */

  const refetchEditors = async () => {
    try {
      const { data, error } = await supabase.rpc('get_editor_balances');
      if (error) console.error('refetchEditors error:', error);
      setEditors(data ?? []);
    } catch (e) { console.error('refetchEditors:', e); }
    finally { setEditorsLoading(false); }
  };

  const fetchCompletedVideos = async () => {
    try {
      const { data, error } = await supabase.rpc('get_completed_videos_this_month');
      if (error) console.error('fetchCompletedVideos error:', error);
      setCompletedVideos(data ?? []);
    } catch (e) { console.error('fetchCompletedVideos:', e); }
  };

  const fetchAllCompletedVideos = async () => {
    try {
      // Try the join first (works for authenticated admin); fall back to plain RPC for anon.
      const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
      const { data, error } = await supabase
        .from('video_units')
        .select('id, editor_name, editing_status, claimed_at, updated_at, reward_amount, penalty_amount, client_price, client_id, clients(is_barter)')
        .eq('editing_status', 'completed')
        .gte('updated_at', firstOfMonth);
      if (error) {
        console.error('fetchAllCompletedVideos join error, falling back to RPC:', error);
        const { data: rpcData } = await supabase.rpc('get_completed_videos_this_month');
        setAllCompletedVideos(rpcData ?? []);
      } else {
        setAllCompletedVideos(data ?? []);
      }
    } catch (e) { console.error('fetchAllCompletedVideos:', e); }
  };

  const fetchTotalDebt = async () => {
    try {
      const { data, error } = await supabase.from('clients').select('amount_paid, total_contract_amount, is_barter');
      if (error) console.error('fetchTotalDebt error:', error);
      if (data) {
        const debt = data.reduce((sum, c) => {
          if (c.is_barter) return sum;
          return sum + Math.max(0, (c.total_contract_amount ?? 0) - (c.amount_paid ?? 0));
        }, 0);
        setTotalDebt(debt);
      }
    } catch (e) { console.error('fetchTotalDebt:', e); }
  };

  const refetchVideos = async () => {
    try {
      // Only run penalty check when there is an authenticated session;
      // anon users cannot UPDATE video_units or editor_balances.
      const { data: { session } } = await supabase.auth.getSession();
      if (session) await checkAndApplyDeadlinePenalties();

      const { data, error } = await supabase.rpc('get_active_video_units');
      if (error) console.error('refetchVideos select error:', error);
      setActiveVideos(data ?? []);
      await fetchCompletedVideos();
      await fetchAllCompletedVideos();
    } catch (e) { console.error('refetchVideos:', e); }
    finally { setVideosLoading(false); }
  };

  const refetchShootingClients = async () => {
    try {
      const { data } = await supabase
        .from('shootings_accounting')
        .select('*')
        .order('created_at', { ascending: true });
      setShootingClients(data ?? []);
    } catch (e) { console.error('refetchShootingClients:', e); }
    finally { setShootingClientsLoading(false); }
  };

  const refetchLocations = async () => {
    try {
      const { data } = await supabase
        .from('locations')
        .select('*')
        .order('created_at', { ascending: true });
      setLocations(data ?? []);
    } catch (e) { console.error('refetchLocations:', e); }
    finally { setLocationsLoading(false); }
  };

  /* ── Initial load + realtime subscriptions ── */

  useEffect(() => {
    // Initial fetch
    Promise.all([refetchEditors(), refetchVideos(), refetchShootingClients(), fetchTotalDebt(), refetchLocations()]);

    // Realtime: editor_balances
    if (!editorSubRef.current) {
      editorSubRef.current = supabase
        .channel('global_editor_balances')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'editor_balances' }, () => {
          refetchEditors();
        })
        .subscribe();
    }

    // Realtime: video_units
    if (!videoSubRef.current) {
      videoSubRef.current = supabase
        .channel('global_video_units')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'video_units' }, () => {
          refetchVideos();
          fetchTotalDebt();
        })
        .subscribe();
    }

    // Realtime: shootings_accounting
    if (!shootingSubRef.current) {
      shootingSubRef.current = supabase
        .channel('global_shootings_accounting')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'shootings_accounting' }, () => {
          refetchShootingClients();
        })
        .subscribe();
    }

    // Realtime: locations
    if (!locationsSubRef.current) {
      locationsSubRef.current = supabase
        .channel('global_locations')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'locations' }, () => {
          refetchLocations();
        })
        .subscribe();
    }

    return () => {
      [editorSubRef, videoSubRef, shootingSubRef, locationsSubRef].forEach(ref => {
        if (ref.current) { supabase.removeChannel(ref.current); ref.current = null; }
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <DataContext.Provider value={{
      editors,
      activeVideos,
      completedVideos,
      allCompletedVideos,
      totalDebt,
      shootingClients,
      locations,
      editorsLoading,
      videosLoading,
      shootingClientsLoading,
      locationsLoading,
      refetchEditors,
      refetchVideos,
      refetchShootingClients,
      refetchLocations,
      setActiveVideos,
      setShootingClients,
      setLocations,
    }}>
      {children}
    </DataContext.Provider>
  );
}
