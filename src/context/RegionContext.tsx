// RegionContext is now a thin re-export shim.
// All logic lives in AppPreferencesContext.
export type { Region } from './AppPreferencesContext';
export {
  REGION_CONFIG,
  REGION_MAP,
  REGION_OPTIONS,
  formatPriceForRegion,
  useRegion,
  AppPreferencesProvider as RegionProvider,
} from './AppPreferencesContext';
