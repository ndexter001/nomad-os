import type { DailyBurnBreakdown, TripDestination } from '../types/trip';

declare global {
  interface Window {
    calcTrueDailyBurn?: (nightly: number, dest: string, home: string) => { totalDest: number; totalHome?: number };
    calcEstimatedNightly?: (dest: string) => number;
    calcDailyLivingOverhead?: (dest: string) => number;
    getSurvivalMeta?: (dest: string) => { tipping?: string; vat?: string } | null;
    getPppProfile?: (code: string) => { costs?: Record<string, number> } | null;
    formatAmount?: (value: number, code: string) => string;
    converter?: { convert: (amount: number, from: string, to: string) => number };
    canMarketConvert?: (from: string, to: string) => boolean;
  }
}

const CITY_TAX_HINTS: Record<string, string> = {
  default: 'Check if accommodation city tax is collected at check-in.',
  ES: 'Spain: tourist tax €0.5–4/night in many cities.',
  IT: 'Italy: city tax €1–7/night, usually cash at hotel.',
  PT: 'Portugal: municipal tourist tax in Lisbon/Porto.',
  TH: 'Thailand: no VAT refund on services; 7% VAT on goods.',
  JP: 'Japan: 8–10% consumption tax included in most prices.',
  NO: 'Norway: 12% VAT on food; prices usually include MVA.'
};

export function calcDailyBurn(
  dest: TripDestination,
  homeCurrency: string,
  travelStyle: 'backpacker' | 'nomad' | 'luxury' = 'nomad'
): DailyBurnBreakdown {
  const destCode = dest.currency;
  const styleMult = travelStyle === 'backpacker' ? 0.65 : travelStyle === 'luxury' ? 1.85 : 1;

  let accommodation = 0;
  let food = 0;
  let transit = 0;
  let hiddenFees = 0;

  if (typeof window.calcEstimatedNightly === 'function') {
    accommodation = window.calcEstimatedNightly(destCode) * styleMult;
  } else if (typeof window.getPppProfile === 'function') {
    const p = window.getPppProfile(destCode);
    accommodation = (p?.costs?.sitdown_meal ?? 40) * 2.2 * styleMult;
  }

  if (typeof window.calcDailyLivingOverhead === 'function') {
    const overhead = window.calcDailyLivingOverhead(destCode);
    food = overhead * 0.55 * styleMult;
    transit = overhead * 0.35 * styleMult;
  } else {
    food = 28 * styleMult;
    transit = 12 * styleMult;
  }

  hiddenFees = accommodation * 0.06 + food * 0.03;

  const total = accommodation + food + transit + hiddenFees;
  let totalHome: number | undefined;
  if (
    typeof window.converter !== 'undefined' &&
    typeof window.canMarketConvert === 'function' &&
    window.canMarketConvert(destCode, homeCurrency)
  ) {
    totalHome = window.converter!.convert(total, destCode, homeCurrency);
  }

  const meta = typeof window.getSurvivalMeta === 'function' ? window.getSurvivalMeta(destCode) : null;
  const cc = dest.countryCode?.toUpperCase() || 'default';

  return {
    accommodation: Math.round(accommodation),
    food: Math.round(food),
    transit: Math.round(transit),
    hiddenFees: Math.round(hiddenFees),
    total: Math.round(total),
    currency: destCode,
    totalHome: totalHome != null ? Math.round(totalHome) : undefined,
    homeCurrency,
    tippingNote: meta?.tipping ? `Tipping: ${meta.tipping}` : 'Tipping: check local norms',
    cityTaxNote: CITY_TAX_HINTS[cc] || CITY_TAX_HINTS.default
  };
}

export function formatMoney(value: number, code: string): string {
  if (typeof window.formatAmount === 'function') return window.formatAmount(value, code);
  return `${code} ${value.toLocaleString()}`;
}
