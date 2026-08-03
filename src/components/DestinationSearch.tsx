import { useEffect, useRef } from 'react';
import type { TripDestination } from '../types/trip';
import { translate } from '../lib/globalBridge';

interface DestinationSearchProps {
  onSelect: (dest: TripDestination) => void;
}

export function DestinationSearch({ onSelect }: DestinationSearchProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const input = inputRef.current;
    const list = listRef.current;
    if (!input || !list || typeof window.initCitySearch !== 'function') return;

    const fetchFn =
      typeof window.fetchMapLocationSuggestions === 'function'
        ? window.fetchMapLocationSuggestions
        : window.fetchCitySuggestions;

    window.initCitySearch({
      inputEl: input,
      listEl: list,
      debounceMs: 280,
      minChars: 2,
      fetchSuggestions: fetchFn,
      onSelect(city: TripDestination & { country_code?: string }) {
        onSelect({
          name: city.name,
          country: city.country || '',
          countryCode: city.country_code || '',
          lat: city.lat,
          lon: city.lon,
          currency: city.currency || 'USD',
          label: city.label || city.name
        });
      }
    });
  }, [onSelect]);

  return (
    <section className="tp-card">
      <label htmlFor="trip-city-search" className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-400">
        {translate('tripSearchLabel', 'Destination')}
      </label>
      <div className="relative">
        <input
          ref={inputRef}
          id="trip-city-search"
          type="search"
          autoComplete="off"
          placeholder={translate('tripSearchPlaceholder', 'Search city or country…')}
          className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-3 text-sm text-white placeholder:text-slate-500 focus:border-accent focus:outline-none"
        />
        <div
          ref={listRef}
          id="trip-city-suggestions"
          className="absolute left-0 right-0 top-[calc(100%+4px)] z-50 max-h-56 overflow-y-auto rounded-xl border border-white/10 bg-surface-raised shadow-2xl empty:hidden"
          hidden
          role="listbox"
        />
      </div>
    </section>
  );
}

declare global {
  interface Window {
    initCitySearch?: (opts: Record<string, unknown>) => void;
    fetchMapLocationSuggestions?: (...args: unknown[]) => Promise<{ results: unknown[] }>;
    fetchCitySuggestions?: (...args: unknown[]) => Promise<{ results: unknown[] }>;
  }
}
