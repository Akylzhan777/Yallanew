import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '../lib/supabase';

export interface AppSettings {
  app_name: string;
  admin_panel_title: string;
  logo_url: string;
  favicon_url: string;
  green_api_base_url: string;
  green_api_id_instance: string;
  green_api_token_instance: string;
}

const DEFAULTS: AppSettings = {
  app_name: 'Yalla Influence',
  admin_panel_title: 'Admin Panel',
  logo_url: '',
  favicon_url: '',
  green_api_base_url: '',
  green_api_id_instance: '',
  green_api_token_instance: '',
};

interface AppSettingsContextType {
  settings: AppSettings;
  loading: boolean;
  refresh: () => Promise<void>;
}

const AppSettingsContext = createContext<AppSettingsContextType>({
  settings: DEFAULTS,
  loading: true,
  refresh: async () => {},
});

export function AppSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(DEFAULTS);
  const [loading, setLoading] = useState(true);

  const fetch = async () => {
    const { data } = await supabase
      .from('app_settings')
      .select('app_name, admin_panel_title, logo_url, favicon_url, green_api_base_url, green_api_id_instance, green_api_token_instance')
      .eq('id', 1)
      .maybeSingle();
    if (data) setSettings({ ...DEFAULTS, ...data });
    setLoading(false);
  };

  useEffect(() => {
    fetch();
  }, []);

  useEffect(() => {
    if (!loading && settings.favicon_url) {
      let link = document.querySelector<HTMLLinkElement>("link[rel~='icon']");
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.head.appendChild(link);
      }
      link.href = settings.favicon_url;
    }
    if (!loading && settings.app_name) {
      document.title = settings.app_name;
    }
  }, [settings, loading]);

  return (
    <AppSettingsContext.Provider value={{ settings, loading, refresh: fetch }}>
      {children}
    </AppSettingsContext.Provider>
  );
}

export function useAppSettings() {
  return useContext(AppSettingsContext);
}
