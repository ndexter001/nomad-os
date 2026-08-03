import { useCallback, useEffect, useMemo, useState } from 'react';
import type { DailyBurnBreakdown, OfflineTripBundle, TripActivity, TripDestination, WeatherBundle } from './types/trip';
import { TripHeader } from './components/TripHeader';
import { DestinationSearch } from './components/DestinationSearch';
import { ItineraryTimeline } from './components/ItineraryTimeline';
import { PivotDayButton } from './components/PivotDayButton';
import { DailyBurnCard } from './components/DailyBurnCard';
import { PackingChecklist } from './components/PackingChecklist';
import { OfflineVault } from './components/OfflineVault';
import {
  buildDefaultItinerary,
  calcBestOutdoorWindow,
  estimateShelterCostDelta,
  isBadWeatherDay,
  optimizeItineraryForWeather,
  pivotItineraryForRain
} from './lib/itineraryEngine';
import { calcDailyBurn } from './lib/tripBudget';
import { buildOfflineBundle, cacheTripBundle, loadCachedTrip } from './lib/tripVault';
import { fetchTripWeather, generatePacking, getCityFromContext } from './lib/globalBridge';
import './index.css';

export default function TripApp() {
  const [destination, setDestination] = useState<TripDestination | null>(null);
  const [homeCurrency] = useState('NOK');
  const [travelStyle, setTravelStyle] = useState<'backpacker' | 'nomad' | 'luxury'>('nomad');
  const [durationDays, setDurationDays] = useState(7);
  const [activities, setActivities] = useState<TripActivity[]>([]);
  const [baseActivities, setBaseActivities] = useState<TripActivity[]>([]);
  const [pivoted, setPivoted] = useState(false);
  const [weather, setWeather] = useState<WeatherBundle | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [burn, setBurn] = useState<DailyBurnBreakdown | null>(null);
  const [packing, setPacking] = useState({ clothing: [] as string[], gear: [] as string[], essentials: [] as string[] });
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [vaultBundle, setVaultBundle] = useState<OfflineTripBundle | null>(null);
  const [syncing, setSyncing] = useState(false);

  const badWeather = weather ? isBadWeatherDay(weather) : false;
  const bestWindow = useMemo(() => {
    if (!weather?.ok) return null;
    const w = calcBestOutdoorWindow(weather);
    return w ? `${w.start} – ${w.end}` : null;
  }, [weather]);

  const shelterDelta = useMemo(() => estimateShelterCostDelta(activities), [activities]);

  const syncVault = useCallback(async () => {
    if (!destination || !burn) return;
    setSyncing(true);
    const bundle = buildOfflineBundle({
      destination,
      itinerary: activities,
      budget: burn,
      packing,
      language: window.currentLang || 'en'
    });
    await cacheTripBundle(bundle);
    setVaultBundle(bundle);
    setSyncing(false);
  }, [destination, burn, activities, packing]);

  const applyDestination = useCallback(async (dest: TripDestination) => {
    setDestination(dest);
    window.CityContext?.set({
      ...dest,
      country_code: dest.countryCode,
      id: dest.name
    });

    const defaultActs = buildDefaultItinerary(dest.currency);
    setBaseActivities(defaultActs);
    setPivoted(false);
    setBurn(calcDailyBurn(dest, homeCurrency, travelStyle));

    setWeatherLoading(true);
    const wx = await fetchTripWeather(dest);
    setWeather(wx);
    setWeatherLoading(false);

    const optimized = wx.ok ? optimizeItineraryForWeather(defaultActs, wx) : defaultActs;
    setActivities(optimized);

    const pack = generatePacking(dest.currency, durationDays, wx, travelStyle);
    setPacking({
      clothing: pack.clothing || [],
      gear: pack.gear || [],
      essentials: pack.essentials || []
    });
  }, [homeCurrency, travelStyle, durationDays]);

  useEffect(() => {
    window.initLanguagePicker?.();
    window.applyStaticTranslations?.();
    const saved = getCityFromContext();
    if (saved) applyDestination(saved);
    loadCachedTrip().then(setVaultBundle);

    const unsub = window.CityContext?.onChange((city) => {
      if (city?.name) {
        applyDestination({
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

    return () => unsub?.();
  }, [applyDestination]);

  useEffect(() => {
    if (!destination) return;
    setBurn(calcDailyBurn(destination, homeCurrency, travelStyle));
    const pack = generatePacking(destination.currency, durationDays, weather, travelStyle);
    setPacking({
      clothing: pack.clothing || [],
      gear: pack.gear || [],
      essentials: pack.essentials || []
    });
  }, [destination, homeCurrency, travelStyle, durationDays, weather]);

  useEffect(() => {
    if (destination && burn) syncVault();
  }, [destination, burn, activities, packing]); // eslint-disable-line react-hooks/exhaustive-deps

  const handlePivot = () => {
    setActivities(pivotItineraryForRain(baseActivities));
    setPivoted(true);
  };

  const handleReset = () => {
    if (weather?.ok) {
      setActivities(optimizeItineraryForWeather(baseActivities, weather));
    } else {
      setActivities(baseActivities);
    }
    setPivoted(false);
  };

  const togglePacked = (item: string) => {
    setChecked((prev) => ({ ...prev, [item]: !prev[item] }));
  };

  return (
    <div className="min-h-screen pb-10">
      <TripHeader destination={destination} onOpenMap={() => { window.location.href = '/map.html'; }} />

      <main className="mx-auto max-w-3xl space-y-4 px-4 py-4">
        <DestinationSearch onSelect={applyDestination} />

        <DailyBurnCard burn={burn} travelStyle={travelStyle} onStyleChange={setTravelStyle} />

        <ItineraryTimeline activities={activities} bestWindow={bestWindow} loading={weatherLoading} />

        <PivotDayButton
          badWeather={badWeather}
          pivoted={pivoted}
          shelterDelta={shelterDelta}
          currency={destination?.currency || 'USD'}
          onPivot={handlePivot}
          onReset={handleReset}
        />

        <PackingChecklist
          clothing={packing.clothing}
          gear={packing.gear}
          essentials={packing.essentials}
          checked={checked}
          durationDays={durationDays}
          onToggle={togglePacked}
          onDurationChange={setDurationDays}
        />

        <OfflineVault bundle={vaultBundle} onSync={syncVault} syncing={syncing} />
      </main>
    </div>
  );
}
