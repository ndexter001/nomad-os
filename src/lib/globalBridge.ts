import type { TripDestination, WeatherBundle } from '../types/trip';

declare global {
  interface Window {
    CityContext?: {
      get: () => TripDestination | null;
      set: (city: TripDestination) => void;
      onChange: (fn: (city: TripDestination | null) => void) => () => void;
    };
    fetchWeatherExtended?: (lat: number, lon: number, opts?: { silent?: boolean }) => Promise<WeatherBundle>;
    RetentionEngine?: {
      generatePackingList: (
        dest: string,
        days: number,
        wx: WeatherBundle | null,
        opts?: { travelStyle?: string }
      ) => { clothing: string[]; gear: string[]; essentials: string[] };
      fetchExtendedWeather: (lat: number, lon: number) => Promise<WeatherBundle>;
    };
    currentLang?: string;
    t?: (key: string) => string | ((...args: unknown[]) => string);
    initLanguagePicker?: () => void;
    setLanguage?: (lang: string) => void;
    LANG_OPTIONS?: { code: string; flag: string; label: string }[];
  }
}

export function getCityFromContext(): TripDestination | null {
  const raw = window.CityContext?.get();
  if (!raw?.name && !raw?.label) return null;
  return {
    name: raw.name || String(raw.label).split(',')[0].trim(),
    country: raw.country || '',
    countryCode: raw.country_code || (raw as { countryCode?: string }).countryCode || '',
    lat: raw.lat,
    lon: raw.lon,
    currency: raw.currency || 'USD',
    label: raw.label || raw.name
  };
}

export async function fetchTripWeather(dest: TripDestination): Promise<WeatherBundle> {
  if (dest.lat == null || dest.lon == null) return { ok: false };
  if (window.RetentionEngine?.fetchExtendedWeather) {
    return window.RetentionEngine.fetchExtendedWeather(dest.lat, dest.lon);
  }
  if (window.fetchWeatherExtended) {
    return window.fetchWeatherExtended(dest.lat, dest.lon, { silent: true });
  }
  return { ok: false };
}

export function generatePacking(
  destCode: string,
  days: number,
  wx: WeatherBundle | null,
  travelStyle: string
) {
  if (window.RetentionEngine?.generatePackingList) {
    return window.RetentionEngine.generatePackingList(destCode, days, wx, { travelStyle });
  }
  return {
    clothing: ['Layered tops', 'Comfortable shoes'],
    gear: ['Power adapter', 'Portable charger'],
    essentials: ['Passport copy', 'Travel insurance']
  };
}

export function translate(key: string, fallback: string): string {
  const val = window.t?.(key);
  if (typeof val === 'string' && val !== key) return val;
  return fallback;
}
