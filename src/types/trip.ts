export type ActivityType = 'outdoor' | 'indoor' | 'food' | 'transit';

export interface TripActivity {
  id: string;
  title: string;
  type: ActivityType;
  durationMin: number;
  costEstimate: number;
  currency: string;
  indoorAlt?: TripActivity;
  outdoorAlt?: TripActivity;
  weatherSensitive?: boolean;
  slot?: string;
  pivoted?: boolean;
}

export interface WeatherHour {
  time: string;
  temp: number;
  rainProb: number;
  wind: number;
  uv: number;
}

export interface WeatherBundle {
  ok: boolean;
  current?: { temp: number; rain: number; wind: number; humidity: number; uv: number };
  hourly?: { time: string[]; temp: number[]; rainProb: number[]; wind: number[]; uv: number[] };
  daily?: { high: number; low: number; rainProb: number; uvMax: number };
  timezone?: string;
}

export interface DailyBurnBreakdown {
  accommodation: number;
  food: number;
  transit: number;
  hiddenFees: number;
  total: number;
  currency: string;
  totalHome?: number;
  homeCurrency: string;
  tippingNote?: string;
  cityTaxNote?: string;
}

export interface TripDestination {
  name: string;
  country: string;
  countryCode: string;
  lat?: number;
  lon?: number;
  currency: string;
  label: string;
}

export interface TripState {
  destination: TripDestination | null;
  homeCurrency: string;
  travelStyle: 'backpacker' | 'nomad' | 'luxury';
  durationDays: number;
  activities: TripActivity[];
  pivoted: boolean;
  packingChecked: Record<string, boolean>;
}

export interface OfflineTripBundle {
  destination: TripDestination;
  itinerary: TripActivity[];
  budget: DailyBurnBreakdown;
  packing: { clothing: string[]; gear: string[]; essentials: string[] };
  language: string;
  cheatsheets: { phrase: string; local: string }[];
  emergency: { police: string; ambulance: string; fire: string };
  updatedAt: string;
}
