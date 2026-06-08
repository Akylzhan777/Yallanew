import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import i18n from '../lib/i18n';

export type Region = 'UAE' | 'KZ';

interface RegionConfig {
  currency: string;
  currencySymbol: string;
  defaultLanguage: string;
  label: string;
  urlPrefix: string;
}

export const REGION_CONFIG: Record<Region, RegionConfig> = {
  UAE: { currency: 'AED', currencySymbol: 'AED', defaultLanguage: 'en', label: 'United Arab Emirates', urlPrefix: '' },
  KZ: { currency: 'KZT', currencySymbol: 'KZT', defaultLanguage: 'ru', label: 'Kazakhstan', urlPrefix: '/kz' },
};

interface RegionContextValue {
  region: Region;
  setRegion: (r: Region) => void;
  config: RegionConfig;
  showSelector: boolean;
  formatPrice: (amount: number) => string;
}

const RegionContext = createContext<RegionContextValue | null>(null);

function detectRegionFromUrl(): Region | null {
  const path = window.location.pathname.toLowerCase();
  if (path === '/kz' || path.startsWith('/kz/')) return 'KZ';
  return null;
}

export function RegionProvider({ children }: { children: ReactNode }) {
  const urlRegion = detectRegionFromUrl();
  const stored = localStorage.getItem('selectedRegion') as Region | null;
  const initial = urlRegion ?? stored ?? null;
  const [region, setRegionState] = useState<Region>(initial ?? 'UAE');
  const [showSelector, setShowSelector] = useState(!initial);

  const setRegion = (r: Region) => {
    setRegionState(r);
    localStorage.setItem('selectedRegion', r);
    setShowSelector(false);
    const lang = REGION_CONFIG[r].defaultLanguage;
    i18n.changeLanguage(lang);
  };

  useEffect(() => {
    if (urlRegion) {
      localStorage.setItem('selectedRegion', urlRegion);
      const lang = REGION_CONFIG[urlRegion].defaultLanguage;
      if (i18n.language !== lang) i18n.changeLanguage(lang);
    } else if (stored) {
      const lang = REGION_CONFIG[stored].defaultLanguage;
      if (i18n.language !== lang) i18n.changeLanguage(lang);
    }
  }, []);

  const config = REGION_CONFIG[region];

  const formatPrice = (amount: number) => `${amount.toLocaleString()} ${config.currency}`;

  return (
    <RegionContext.Provider value={{ region, setRegion, config, showSelector, formatPrice }}>
      {children}
    </RegionContext.Provider>
  );
}

export function useRegion() {
  const ctx = useContext(RegionContext);
  if (!ctx) throw new Error('useRegion must be used within RegionProvider');
  return ctx;
}