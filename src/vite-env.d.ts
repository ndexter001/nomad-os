/// <reference types="vite/client" />

declare module '*.html?raw' {
  const content: string;
  export default content;
}

declare global {
  interface Window {
    __nomadInitDashboard?: () => void;
    CityContext?: {
      get: () => Record<string, unknown> | null;
      set: (city: Record<string, unknown>) => void;
      onChange: (fn: (city: Record<string, unknown> | null) => void) => () => void;
    };
    currentLang?: string;
    initLanguagePicker?: () => void;
    applyStaticTranslations?: () => void;
    RetentionEngine?: Record<string, unknown>;
    fetchWeatherExtended?: (lat: number, lon: number, opts?: { silent?: boolean }) => Promise<Record<string, unknown>>;
    initCitySearch?: (opts: Record<string, unknown>) => void;
    fetchMapLocationSuggestions?: (...args: unknown[]) => Promise<{ results: unknown[] }>;
    fetchCitySuggestions?: (...args: unknown[]) => Promise<{ results: unknown[] }>;
    t?: (key: string) => string | ((...args: unknown[]) => string);
  }
}

export {};
