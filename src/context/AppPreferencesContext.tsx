import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import i18n from '../lib/i18n';

export type Region = 'UAE' | 'KZ' | 'ALL';

export interface RegionOption {
  value: Region;
  label: string;
  flag: string;
  currency: string;
  currencySymbol: string;
  timezone: string;
  defaultLanguage: string;
}

export const REGION_OPTIONS: RegionOption[] = [
  { value: 'ALL', label: 'All Regions',         flag: '🌍', currency: '',    currencySymbol: '',    timezone: 'UTC',           defaultLanguage: 'en' },
  { value: 'UAE', label: 'United Arab Emirates', flag: '🇦🇪', currency: 'AED', currencySymbol: 'AED', timezone: 'Asia/Dubai',    defaultLanguage: 'en' },
  { value: 'KZ',  label: 'Kazakhstan',           flag: '🇰🇿', currency: 'KZT', currencySymbol: '₸',   timezone: 'Asia/Almaty',   defaultLanguage: 'ru' },
];

export const REGION_MAP = Object.fromEntries(
  REGION_OPTIONS.map(o => [o.value, o])
) as Record<Region, RegionOption>;

// Backwards-compat alias used throughout the codebase
export const REGION_CONFIG = {
  UAE: { currency: 'AED', currencySymbol: 'AED', defaultLanguage: 'en', label: 'United Arab Emirates', urlPrefix: '' },
  KZ:  { currency: 'KZT', currencySymbol: '₸',   defaultLanguage: 'ru', label: 'Kazakhstan',           urlPrefix: '' },
};

interface AppPreferencesContextValue {
  selectedRegion: Region;
  setSelectedRegion: (r: Region) => void;
  regionOption: RegionOption;
  formatPrice: (amount: number, overrideRegion?: 'UAE' | 'KZ') => string;
  // Legacy alias consumed by many existing components
  region: 'UAE' | 'KZ';
  setRegion: (r: 'UAE' | 'KZ') => void;
  config: typeof REGION_CONFIG['UAE'];
  showSelector: boolean;
  setShowSelector: (v: boolean) => void;
}

const AppPreferencesContext = createContext<AppPreferencesContextValue | null>(null);

function loadRegion(): Region {
  const v = localStorage.getItem('selectedRegion');
  if (v === 'UAE' || v === 'KZ' || v === 'ALL') return v;
  return 'ALL';
}

export function AppPreferencesProvider({ children }: { children: ReactNode }) {
  const [selectedRegion, setSelectedRegionState] = useState<Region>(loadRegion);
  const [showSelector, setShowSelector] = useState(false);

  const setSelectedRegion = (r: Region) => {
    setSelectedRegionState(r);
    localStorage.setItem('selectedRegion', r);
    const lang = r === 'KZ' ? 'ru' : 'en';
    i18n.changeLanguage(lang);
  };

  useEffect(() => {
    const lang = selectedRegion === 'KZ' ? 'ru' : 'en';
    if (i18n.language !== lang) i18n.changeLanguage(lang);
  }, [selectedRegion]);

  const regionOption = REGION_MAP[selectedRegion];

  const formatPrice = (amount: number, overrideRegion?: 'UAE' | 'KZ'): string => {
    const r = overrideRegion ?? (selectedRegion === 'ALL' ? 'UAE' : selectedRegion);
    const sym = REGION_CONFIG[r].currencySymbol;
    return `${amount.toLocaleString()} ${sym}`;
  };

  // Legacy compatibility: when region is 'ALL', treat as 'UAE' for components that don't support ALL
  const legacyRegion: 'UAE' | 'KZ' = selectedRegion === 'KZ' ? 'KZ' : 'UAE';
  const setRegion = (r: 'UAE' | 'KZ') => setSelectedRegion(r);
  const config = REGION_CONFIG[legacyRegion];

  return (
    <AppPreferencesContext.Provider value={{
      selectedRegion, setSelectedRegion,
      regionOption,
      formatPrice,
      region: legacyRegion,
      setRegion,
      config,
      showSelector,
      setShowSelector,
    }}>
      {children}
    </AppPreferencesContext.Provider>
  );
}

export function useAppPreferences() {
  const ctx = useContext(AppPreferencesContext);
  if (!ctx) throw new Error('useAppPreferences must be used within AppPreferencesProvider');
  return ctx;
}

// Legacy hook alias — keeps every existing `useRegion()` call working unchanged
export function useRegion() {
  return useAppPreferences();
}

export function formatPriceForRegion(amount: number, region: 'UAE' | 'KZ'): string {
  return `${amount.toLocaleString()} ${REGION_CONFIG[region].currency}`;
}
