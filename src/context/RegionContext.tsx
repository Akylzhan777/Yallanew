import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import i18n from '../lib/i18n';
import { safeGetItem, safeSetItem } from '../utils/safeStorage';

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
  setShowSelector: (show: boolean) => void;
  formatPrice: (amount: number) => string;
}

const RegionContext = createContext<RegionContextValue | null>(null);

function getStoredRegion(): Region | null {
  const stored = safeGetItem('selectedRegion');
  if (stored === 'UAE' || stored === 'KZ') return stored;
  return null;
}

export function RegionProvider({ children }: { children: ReactNode }) {
  const storedRegion = getStoredRegion();
  const [region, setRegionState] = useState<Region>(storedRegion || 'UAE');
  const [showSelector, setShowSelector] = useState(!storedRegion);

  const setRegion = (r: Region) => {
    setRegionState(r);
    safeSetItem('selectedRegion', r);
    setShowSelector(false);
    const lang = REGION_CONFIG[r].defaultLanguage;
    i18n.changeLanguage(lang);
  };

  useEffect(() => {
    const lang = REGION_CONFIG[region].defaultLanguage;
    if (i18n.language !== lang) i18n.changeLanguage(lang);
  }, [region]);

  const config = REGION_CONFIG[region];
  const formatPrice = (amount: number) => `${amount.toLocaleString()} ${config.currency}`;

  return (
    <RegionContext.Provider value={{ region, setRegion, config, showSelector, setShowSelector, formatPrice }}>
      {children}
    </RegionContext.Provider>
  );
}

export function useRegion() {
  const ctx = useContext(RegionContext);
  if (!ctx) throw new Error('useRegion must be used within RegionProvider');
  return ctx;
}

export function formatPriceForRegion(amount: number, region: Region): string {
  return `${amount.toLocaleString()} ${REGION_CONFIG[region].currency}`;
}
