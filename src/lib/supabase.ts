import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

const safeStorage = {
  getItem: (key: string): string | null => {
    try { return window.localStorage.getItem(key); } catch { return null; }
  },
  setItem: (key: string, value: string): void => {
    try { window.localStorage.setItem(key, value); } catch { /* blocked */ }
  },
  removeItem: (key: string): void => {
    try { window.localStorage.removeItem(key); } catch { /* blocked */ }
  },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { storage: safeStorage },
});

export type Profile = {
  id: string;
  name: string;
  surname: string;
  dob: string;
  avatar_url: string;
  balance: number;
  credits_expire_at: string | null;
  referral_code: string;
  invited_count: number;
  earned_count: number;
  current_subs: string;
  start_subs: string;
  growth: string;
  total_views: string;
  videos_filmed: number;
  is_admin: boolean;
  role: 'user' | 'manager' | 'admin';
  created_at: string;
};

export type Product = {
  id: number;
  name: string;
  price: string;
  description: string;
  img_url: string;
  created_at: string;
};

export type GalleryItem = {
  id: number;
  title: string;
  date_label: string;
  size_label: string;
  img_url: string;
  created_at: string;
};

export type Script = {
  id: number;
  user_id: string;
  title: string;
  status: string;
  created_at: string;
};

export type ScheduleSlot = {
  id: number;
  day: number;
  time_slot: string;
  is_free: boolean;
};

export type Booking = {
  id: number;
  user_id: string;
  slot_id: number;
  booked_at: string;
};

export type BookingEvent = {
  id: string;
  date: string;
  start_time: string | null;
  end_time: string | null;
  client_name: string | null;
  notes: string | null;
  whatsapp: string | null;
  location: string | null;
  task_description: string | null;
  status: string | null;
  operator_id: string | null;
  user_id: string | null;
  needs_script: boolean | null;
  scripts_notes: string | null;
  ai_translation: boolean | null;
  ai_translation_lang: string | null;
  editing_status: string | null;
  final_video_link: string | null;
  pickup_location: string | null;
  created_at: string;
};

export type Lead = {
  id: string;
  name: string;
  instagram: string;
  goals: string;
  status: string;
  created_at: string;
};

export type OperatorRow = {
  id: string;
  name: string;
  role: string;
  photo: string;
  telegram_id: string;
  phone_number: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
};
