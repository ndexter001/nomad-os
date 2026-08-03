import type { TripActivity, WeatherBundle } from '../types/trip';

const DEFAULT_ACTIVITIES: Omit<TripActivity, 'id' | 'slot'>[] = [
  {
    title: 'Morning walking tour & photo spots',
    type: 'outdoor',
    durationMin: 120,
    costEstimate: 0,
    currency: 'USD',
    weatherSensitive: true,
    indoorAlt: {
      id: 'ind-museum',
      title: 'City history museum',
      type: 'indoor',
      durationMin: 120,
      costEstimate: 18,
      currency: 'USD'
    }
  },
  {
    title: 'Local lunch & market browse',
    type: 'food',
    durationMin: 75,
    costEstimate: 22,
    currency: 'USD',
    weatherSensitive: false,
    indoorAlt: {
      id: 'ind-food-hall',
      title: 'Indoor food hall',
      type: 'indoor',
      durationMin: 75,
      costEstimate: 24,
      currency: 'USD'
    }
  },
  {
    title: 'Neighborhood explore / viewpoints',
    type: 'outdoor',
    durationMin: 90,
    costEstimate: 8,
    currency: 'USD',
    weatherSensitive: true,
    indoorAlt: {
      id: 'ind-cowork',
      title: 'Cowork café + shelter break',
      type: 'indoor',
      durationMin: 90,
      costEstimate: 15,
      currency: 'USD'
    }
  },
  {
    title: 'Evening transit to dinner district',
    type: 'transit',
    durationMin: 30,
    costEstimate: 5,
    currency: 'USD',
    weatherSensitive: false
  }
];

function formatSlot(time: string): string {
  return time?.slice(11, 16) || '—';
}

export function calcBestOutdoorWindow(wx: WeatherBundle): { start: string; end: string; startIdx: number } | null {
  const time = wx.hourly?.time;
  if (!time?.length) return null;

  const { temp = [], rainProb = [], uv = [], wind = [] } = wx.hourly!;
  let bestStart = 0;
  let bestScore = -Infinity;

  for (let i = 0; i < time.length - 1; i++) {
    const hourScore = (idx: number) => {
      const tVal = temp[idx] ?? 20;
      const rVal = rainProb[idx] ?? 0;
      const uVal = uv[idx] ?? 0;
      const wVal = wind[idx] ?? 0;
      const tS = tVal >= 18 && tVal <= 28 ? 100 : 60;
      return tS - rVal - uVal * 5 - wVal * 0.5;
    };
    const combined = hourScore(i) + hourScore(i + 1);
    if (combined > bestScore) {
      bestScore = combined;
      bestStart = i;
    }
  }

  return {
    start: formatSlot(time[bestStart]),
    end: formatSlot(time[bestStart + 1]),
    startIdx: bestStart
  };
}

export function isBadWeatherDay(wx: WeatherBundle): boolean {
  const rain = wx.daily?.rainProb ?? wx.current?.rain ?? 0;
  const temp = wx.current?.temp ?? wx.daily?.high ?? 20;
  const wind = wx.current?.wind ?? 0;
  return rain > 50 || temp <= 2 || wind >= 45;
}

export function buildDefaultItinerary(currency: string): TripActivity[] {
  return DEFAULT_ACTIVITIES.map((a, i) => ({
    ...a,
    id: `act-${i}`,
    currency,
    costEstimate: a.costEstimate,
    indoorAlt: a.indoorAlt ? { ...a.indoorAlt, currency } : undefined
  }));
}

/** Reorder outdoor activities into the sunniest 2-hour window */
export function optimizeItineraryForWeather(
  activities: TripActivity[],
  wx: WeatherBundle
): TripActivity[] {
  const window = calcBestOutdoorWindow(wx);
  if (!window) return activities.map((a) => ({ ...a, slot: undefined, pivoted: false }));

  const outdoor = activities.filter((a) => a.type === 'outdoor' && a.weatherSensitive);
  const rest = activities.filter((a) => !(a.type === 'outdoor' && a.weatherSensitive));

  const slottedOutdoor = outdoor.map((a, i) => ({
    ...a,
    slot: i === 0 ? `${window.start} – ${window.end}` : undefined,
    pivoted: false
  }));

  return [...slottedOutdoor, ...rest.map((a) => ({ ...a, pivoted: false }))];
}

/** Swap outdoor stops with indoor alternatives when weather is poor */
export function pivotItineraryForRain(activities: TripActivity[]): TripActivity[] {
  return activities.map((a) => {
    if (a.type === 'outdoor' && a.weatherSensitive && a.indoorAlt) {
      return {
        ...a.indoorAlt,
        id: a.id,
        slot: a.slot,
        pivoted: true,
        outdoorAlt: a
      };
    }
    return { ...a, pivoted: false };
  });
}

export function estimateShelterCostDelta(activities: TripActivity[]): number {
  return activities.reduce((sum, a) => {
    if (!a.pivoted || !a.outdoorAlt) return sum;
    return sum + Math.max(0, a.costEstimate - (a.outdoorAlt.costEstimate || 0));
  }, 0);
}
