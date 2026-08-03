/** Nomad OS shared engine — FX, PPP, travel utilities (used by all modules) */
const RATES_API = 'https://open.er-api.com/v6/latest/USD';
const WEATHER_API = 'https://api.open-meteo.com/v1/forecast';

const USD_LIVING_COSTS = {
    coffee: 5.50, fast_meal: 12, sitdown_meal: 45, local_transport: 2.75, day_pass_coworking: 35
};

const REGION_PPP = {
    americas: 0.58, europe: 0.85, asia: 0.50, 'middle-east': 0.68,
    africa: 0.40, oceania: 1.00, other: 1.00
};

const PPP_UNSUPPORTED = new Set(['XDR']);
const PPP_UNIT_KEYS = ['coffee', 'fast_meal', 'sitdown_meal', 'local_transport', 'day_pass_coworking'];
const REGION_ORDER = ['americas', 'europe', 'asia', 'middle-east', 'africa', 'oceania', 'other'];

const PPP_OVERRIDES = {
    USD: { country: 'USA', multiplier: 1.00, costs: { coffee: 5.50, fast_meal: 12, sitdown_meal: 45, local_transport: 2.75, day_pass_coworking: 35 } },
    EUR: { country: 'Eurozone', multiplier: 0.92, costs: { coffee: 3.80, fast_meal: 10, sitdown_meal: 38, local_transport: 2.50, day_pass_coworking: 28 } },
    GBP: { country: 'United Kingdom', multiplier: 0.88, costs: { coffee: 3.90, fast_meal: 11, sitdown_meal: 40, local_transport: 2.80, day_pass_coworking: 30 } },
    NOK: { country: 'Norway', multiplier: 1.35, costs: { coffee: 55, fast_meal: 120, sitdown_meal: 450, local_transport: 40, day_pass_coworking: 350 } },
    CHF: { country: 'Switzerland', multiplier: 1.42, costs: { coffee: 5.50, fast_meal: 18, sitdown_meal: 65, local_transport: 3.50, day_pass_coworking: 45 } },
    SEK: { country: 'Sweden', multiplier: 1.12, costs: { coffee: 45, fast_meal: 110, sitdown_meal: 400, local_transport: 38, day_pass_coworking: 280 } },
    DKK: { country: 'Denmark', multiplier: 1.28, costs: { coffee: 42, fast_meal: 100, sitdown_meal: 380, local_transport: 36, day_pass_coworking: 320 } },
    JPY: { country: 'Japan', multiplier: 0.78, costs: { coffee: 450, fast_meal: 800, sitdown_meal: 3000, local_transport: 180, day_pass_coworking: 2500 } },
    CNY: { country: 'China', multiplier: 0.62, costs: { coffee: 28, fast_meal: 25, sitdown_meal: 120, local_transport: 4, day_pass_coworking: 80 } },
    THB: { country: 'Thailand', multiplier: 0.42, costs: { coffee: 85, fast_meal: 60, sitdown_meal: 350, local_transport: 35, day_pass_coworking: 250 } },
    VND: { country: 'Vietnam', multiplier: 0.38, costs: { coffee: 55000, fast_meal: 45000, sitdown_meal: 180000, local_transport: 8000, day_pass_coworking: 120000 } },
    IDR: { country: 'Indonesia', multiplier: 0.35, costs: { coffee: 35000, fast_meal: 25000, sitdown_meal: 120000, local_transport: 5000, day_pass_coworking: 85000 } },
    PHP: { country: 'Philippines', multiplier: 0.40, costs: { coffee: 150, fast_meal: 120, sitdown_meal: 450, local_transport: 25, day_pass_coworking: 350 } },
    MYR: { country: 'Malaysia', multiplier: 0.52, costs: { coffee: 12, fast_meal: 15, sitdown_meal: 55, local_transport: 3, day_pass_coworking: 45 } },
    SGD: { country: 'Singapore', multiplier: 1.18, costs: { coffee: 6.50, fast_meal: 8, sitdown_meal: 45, local_transport: 2, day_pass_coworking: 35 } },
    KRW: { country: 'South Korea', multiplier: 0.72, costs: { coffee: 4500, fast_meal: 8000, sitdown_meal: 35000, local_transport: 1400, day_pass_coworking: 20000 } },
    TWD: { country: 'Taiwan', multiplier: 0.58, costs: { coffee: 120, fast_meal: 100, sitdown_meal: 450, local_transport: 25, day_pass_coworking: 350 } },
    INR: { country: 'India', multiplier: 0.28, costs: { coffee: 180, fast_meal: 150, sitdown_meal: 600, local_transport: 30, day_pass_coworking: 400 } },
    PKR: { country: 'Pakistan', multiplier: 0.22, costs: { coffee: 450, fast_meal: 350, sitdown_meal: 1200, local_transport: 50, day_pass_coworking: 800 } },
    TRY: { country: 'Turkey', multiplier: 0.38, costs: { coffee: 90, fast_meal: 120, sitdown_meal: 400, local_transport: 25, day_pass_coworking: 200 } },
    AED: { country: 'UAE', multiplier: 0.95, costs: { coffee: 18, fast_meal: 35, sitdown_meal: 150, local_transport: 5, day_pass_coworking: 80 } },
    MXN: { country: 'Mexico', multiplier: 0.55, costs: { coffee: 65, fast_meal: 90, sitdown_meal: 350, local_transport: 15, day_pass_coworking: 180 } },
    BRL: { country: 'Brazil', multiplier: 0.48, costs: { coffee: 12, fast_meal: 25, sitdown_meal: 90, local_transport: 5, day_pass_coworking: 60 } },
    ARS: { country: 'Argentina', multiplier: 0.32, costs: { coffee: 2500, fast_meal: 3500, sitdown_meal: 12000, local_transport: 500, day_pass_coworking: 4000 } },
    COP: { country: 'Colombia', multiplier: 0.38, costs: { coffee: 8000, fast_meal: 12000, sitdown_meal: 45000, local_transport: 2800, day_pass_coworking: 25000 } },
    CLP: { country: 'Chile', multiplier: 0.58, costs: { coffee: 3500, fast_meal: 5500, sitdown_meal: 18000, local_transport: 800, day_pass_coworking: 12000 } },
    PEN: { country: 'Peru', multiplier: 0.42, costs: { coffee: 12, fast_meal: 18, sitdown_meal: 65, local_transport: 2.5, day_pass_coworking: 35 } },
    ZAR: { country: 'South Africa', multiplier: 0.45, costs: { coffee: 45, fast_meal: 80, sitdown_meal: 280, local_transport: 18, day_pass_coworking: 150 } },
    AUD: { country: 'Australia', multiplier: 1.05, costs: { coffee: 5.50, fast_meal: 16, sitdown_meal: 55, local_transport: 4, day_pass_coworking: 38 } },
    NZD: { country: 'New Zealand', multiplier: 1.08, costs: { coffee: 5.80, fast_meal: 17, sitdown_meal: 55, local_transport: 4, day_pass_coworking: 40 } },
    CAD: { country: 'Canada', multiplier: 1.02, costs: { coffee: 5.20, fast_meal: 15, sitdown_meal: 50, local_transport: 3.25, day_pass_coworking: 35 } },
    PLN: { country: 'Poland', multiplier: 0.58, costs: { coffee: 14, fast_meal: 28, sitdown_meal: 100, local_transport: 4.50, day_pass_coworking: 55 } },
    CZK: { country: 'Czechia', multiplier: 0.55, costs: { coffee: 65, fast_meal: 120, sitdown_meal: 400, local_transport: 30, day_pass_coworking: 250 } },
    HUF: { country: 'Hungary', multiplier: 0.48, costs: { coffee: 650, fast_meal: 1200, sitdown_meal: 4500, local_transport: 350, day_pass_coworking: 2500 } },
    RON: { country: 'Romania', multiplier: 0.52, costs: { coffee: 12, fast_meal: 25, sitdown_meal: 90, local_transport: 3, day_pass_coworking: 45 } },
    HKD: { country: 'Hong Kong', multiplier: 1.08, costs: { coffee: 38, fast_meal: 55, sitdown_meal: 280, local_transport: 12, day_pass_coworking: 200 } },
    EGP: { country: 'Egypt', multiplier: 0.25, costs: { coffee: 65, fast_meal: 80, sitdown_meal: 350, local_transport: 10, day_pass_coworking: 150 } },
    BDT: { country: 'Bangladesh', multiplier: 0.24, costs: { coffee: 180, fast_meal: 150, sitdown_meal: 550, local_transport: 25, day_pass_coworking: 350 } },
    NGN: { country: 'Nigeria', multiplier: 0.30, costs: { coffee: 1200, fast_meal: 1500, sitdown_meal: 6000, local_transport: 300, day_pass_coworking: 2500 } }
};

const DEFAULT_FX_RATES = {
    EUR: 0.92, GBP: 0.79, NOK: 10.85, CHF: 0.88, SEK: 10.55, DKK: 6.90,
    JPY: 149, CNY: 7.24, THB: 34.5, VND: 25400, IDR: 15800, PHP: 56,
    MYR: 4.47, SGD: 1.34, KRW: 1320, TWD: 31.5, INR: 83, PKR: 278,
    TRY: 32, AED: 3.67, MXN: 17.2, BRL: 4.95, ARS: 875, COP: 3950,
    CLP: 925, PEN: 3.75, ZAR: 18.5, AUD: 1.53, NZD: 1.66, CAD: 1.36,
    PLN: 3.95, CZK: 22.8, HUF: 355, RON: 4.55, HKD: 7.82, EGP: 48,
    BDT: 110, NGN: 1550
};

/** Offline baseline market rates (USD base) — last-resort when all FX APIs fail */
const FALLBACK_RATES = {
    USD: 1.0,
    EUR: 0.92,
    GBP: 0.78,
    NOK: 10.85,
    CHF: 0.88,
    JPY: 155.20,
    CNY: 7.23,
    AUD: 1.52,
    CAD: 1.37,
    INR: 83.50,
    BRL: 5.45,
    ZAR: 18.20,
    SGD: 1.35
};

const FX_PRIMARY_API = 'https://open.er-api.com/v6/latest';
const FX_BACKUP_API = 'https://api.exchangerate-api.com/v4/latest';

function getMergedFallbackRates() {
    return { USD: 1, ...DEFAULT_FX_RATES, ...FALLBACK_RATES };
}

async function fxApiFetch(url, meta = {}) {
    const { silent = true, context = 'fx' } = meta;
    try {
        const res = typeof safeFetch === 'function'
            ? await safeFetch(url, {}, { silent, context })
            : await fetch(url);
        return res;
    } catch {
        return null;
    }
}

async function fetchLiveFxRatesWithFallback(baseCurrency = 'USD', options = {}) {
    const silent = options.silent ?? true;
    const meta = { silent, context: 'fx' };

    try {
        const res = await fxApiFetch(`${FX_PRIMARY_API}/${baseCurrency}`, meta);
        if (!res?.ok) throw new Error('Primary API failed');
        const data = await res.json();
        if (data.result !== 'success' || !data.rates) throw new Error('Primary API invalid');
        return {
            ok: true,
            rates: data.rates,
            source: 'primary',
            time: data.time_last_update_utc ?? null
        };
    } catch (err) {
        console.warn('Primary FX API failed or CORS blocked. Switching to backup rates:', err);
        try {
            const res = await fxApiFetch(`${FX_BACKUP_API}/${baseCurrency}`, meta);
            if (!res?.ok) throw new Error('Backup API failed');
            const data = await res.json();
            if (!data.rates) throw new Error('Backup API invalid');
            return {
                ok: true,
                rates: data.rates,
                source: 'backup',
                time: data.date ?? null
            };
        } catch (fallbackErr) {
            console.warn('Using offline fallback FX rates.');
            return {
                ok: true,
                rates: getMergedFallbackRates(),
                source: 'fallback',
                time: null
            };
        }
    }
}

async function fetchHistoricalFxRates(dateStr, codes, options = {}) {
    const silent = options.silent ?? true;
    const meta = { silent, context: 'fx-history' };
    const list = Array.isArray(codes) ? codes : String(codes).split(',');
    const symbols = list.map((c) => c.trim()).filter(Boolean).join(',');

    const urls = [
        `https://api.frankfurter.dev/v1/${dateStr}?base=USD&symbols=${symbols}`,
        `https://api.frankfurter.app/${dateStr}?from=USD&to=${symbols}`
    ];

    for (const url of urls) {
        try {
            const res = await fxApiFetch(url, meta);
            if (!res?.ok) continue;
            const data = await res.json();
            const rates = data.rates;
            if (rates && Object.keys(rates).length) {
                return { ok: true, rates, source: url };
            }
        } catch { /* try next endpoint */ }
    }

    const fallback = {};
    const merged = getMergedFallbackRates();
    for (const code of list) {
        const key = code.trim();
        if (merged[key] != null) fallback[key] = merged[key];
    }
    return { ok: false, rates: fallback, source: 'fallback' };
}

async function fetchFxRateRange(from, to, startDate, endDate, options = {}) {
    const silent = options.silent ?? true;
    const meta = { silent, context: 'fx-history' };
    const range = `${startDate}..${endDate}`;

    const urls = [
        `https://api.frankfurter.dev/v1/${range}?base=${from}&symbols=${to}`,
        `https://api.frankfurter.app/${range}?from=${from}&to=${to}`
    ];

    for (const url of urls) {
        try {
            const res = await fxApiFetch(url, meta);
            if (!res?.ok) continue;
            const data = await res.json();
            const rates = data.rates;
            if (rates && Object.keys(rates).length >= 2) {
                return { ok: true, rates, source: url };
            }
        } catch { /* try next endpoint */ }
    }

    return { ok: false, rates: null, source: 'fallback' };
}

/** Nomad survival metadata per currency */
const SURVIVAL_DATA = {
    USD: { sim10: 35, sim30: 55, tipping: 'customary', vat: 8.5, cashIntensity: 'low' },
    EUR: { sim10: 25, sim30: 40, tipping: 'optional', vat: 20, cashIntensity: 'low' },
    GBP: { sim10: 22, sim30: 35, tipping: 'optional', vat: 20, cashIntensity: 'low' },
    NOK: { sim10: 299, sim30: 449, tipping: 'optional', vat: 25, cashIntensity: 'low' },
    JPY: { sim10: 4500, sim30: 6500, tipping: 'offensive', vat: 10, cashIntensity: 'high' },
    THB: { sim10: 299, sim30: 599, tipping: 'optional', vat: 7, cashIntensity: 'high' },
    TRY: { sim10: 450, sim30: 750, tipping: 'optional', vat: 20, cashIntensity: 'medium' },
    CHF: { sim10: 35, sim30: 55, tipping: 'optional', vat: 8.1, cashIntensity: 'low' },
    SEK: { sim10: 299, sim30: 449, tipping: 'optional', vat: 25, cashIntensity: 'low' },
    DKK: { sim10: 199, sim30: 349, tipping: 'optional', vat: 25, cashIntensity: 'low' },
    CNY: { sim10: 80, sim30: 150, tipping: 'offensive', vat: 13, cashIntensity: 'medium' },
    VND: { sim10: 180000, sim30: 350000, tipping: 'optional', vat: 10, cashIntensity: 'high' },
    IDR: { sim10: 150000, sim30: 280000, tipping: 'optional', vat: 11, cashIntensity: 'high' },
    PHP: { sim10: 599, sim30: 999, tipping: 'optional', vat: 12, cashIntensity: 'high' },
    MYR: { sim10: 35, sim30: 65, tipping: 'optional', vat: 8, cashIntensity: 'medium' },
    SGD: { sim10: 25, sim30: 45, tipping: 'optional', vat: 9, cashIntensity: 'low' },
    KRW: { sim10: 35000, sim30: 55000, tipping: 'offensive', vat: 10, cashIntensity: 'medium' },
    TWD: { sim10: 599, sim30: 899, tipping: 'optional', vat: 5, cashIntensity: 'medium' },
    INR: { sim10: 599, sim30: 999, tipping: 'optional', vat: 18, cashIntensity: 'high' },
    PKR: { sim10: 2500, sim30: 4500, tipping: 'optional', vat: 17, cashIntensity: 'high' },
    AED: { sim10: 99, sim30: 179, tipping: 'optional', vat: 5, cashIntensity: 'low' },
    MXN: { sim10: 399, sim30: 699, tipping: 'customary', vat: 16, cashIntensity: 'medium' },
    BRL: { sim10: 45, sim30: 85, tipping: 'optional', vat: 17, cashIntensity: 'medium' },
    ARS: { sim10: 8500, sim30: 15000, tipping: 'optional', vat: 21, cashIntensity: 'high' },
    COP: { sim10: 35000, sim30: 65000, tipping: 'optional', vat: 19, cashIntensity: 'medium' },
    CLP: { sim10: 8990, sim30: 14990, tipping: 'optional', vat: 19, cashIntensity: 'medium' },
    PEN: { sim10: 35, sim30: 65, tipping: 'optional', vat: 18, cashIntensity: 'medium' },
    ZAR: { sim10: 299, sim30: 499, tipping: 'customary', vat: 15, cashIntensity: 'medium' },
    AUD: { sim10: 35, sim30: 55, tipping: 'optional', vat: 10, cashIntensity: 'low' },
    NZD: { sim10: 35, sim30: 55, tipping: 'optional', vat: 15, cashIntensity: 'low' },
    CAD: { sim10: 35, sim30: 55, tipping: 'customary', vat: 13, cashIntensity: 'low' },
    PLN: { sim10: 45, sim30: 75, tipping: 'optional', vat: 23, cashIntensity: 'low' },
    CZK: { sim10: 399, sim30: 699, tipping: 'optional', vat: 21, cashIntensity: 'low' },
    HUF: { sim10: 4990, sim30: 7990, tipping: 'optional', vat: 27, cashIntensity: 'medium' },
    RON: { sim10: 45, sim30: 75, tipping: 'optional', vat: 19, cashIntensity: 'medium' },
    HKD: { sim10: 88, sim30: 158, tipping: 'optional', vat: 0, cashIntensity: 'medium' },
    EGP: { sim10: 350, sim30: 650, tipping: 'customary', vat: 14, cashIntensity: 'high' },
    BDT: { sim10: 999, sim30: 1799, tipping: 'optional', vat: 15, cashIntensity: 'high' },
    NGN: { sim10: 4500, sim30: 8500, tipping: 'optional', vat: 7.5, cashIntensity: 'high' }
};

const DEFAULT_SURVIVAL = { sim10: 25, sim30: 45, tipping: 'optional', vat: 15, cashIntensity: 'medium' };

/** Travel tier multipliers — uniform PPP burn scale per style */
const TRAVEL_STYLE_TIERS = {
    backpacker: { id: 'backpacker', globalMult: 0.5 },
    nomad: { id: 'nomad', globalMult: 1.0 },
    luxury: { id: 'luxury', globalMult: 2.5 }
};

const DCC_FX_MARKUP = 0.045;

/** Card FX fee profiles for payment optimizer */
const CARD_FEE_PROFILES = {
    standard: { id: 'standard', bankFxFee: 0.025, dccMarkup: 0.05 },
    travel: { id: 'travel', bankFxFee: 0, dccMarkup: 0.035 }
};

let travelStyleTier = 'nomad';

function getTravelStyleTier() {
    return travelStyleTier;
}

function setTravelStyleTier(tier) {
    if (TRAVEL_STYLE_TIERS[tier]) travelStyleTier = tier;
}

function getAdjustedPppProfile(code, tier = getTravelStyleTier()) {
    const base = getPppProfile(code);
    if (!base?.costs) return null;
    const style = TRAVEL_STYLE_TIERS[tier] || TRAVEL_STYLE_TIERS.nomad;
    const mult = style.globalMult ?? 1;
    const costs = {};
    for (const key of PPP_UNIT_KEYS) {
        costs[key] = scaleCost((base.costs[key] || 0) * mult);
    }
    return { ...base, costs, tier: style.id };
}

function calcStyledNightly(destCode, tier = getTravelStyleTier()) {
    const profile = getAdjustedPppProfile(destCode, tier);
    if (!profile?.costs) return 0;
    return scaleCost(profile.costs.sitdown_meal * 2.2);
}

function calcDailyBurnForStyle(destCode, homeCode, tier = getTravelStyleTier()) {
    const profile = getAdjustedPppProfile(destCode, tier);
    if (!profile?.costs) return null;
    const c = profile.costs;
    const nightly = calcStyledNightly(destCode, tier);
    const overhead = scaleCost(c.coffee * 0.5 + c.fast_meal * 2 + c.local_transport * 2);
    const totalDest = nightly + overhead;
    let totalHome = totalDest;
    if (homeCode && canMarketConvert(destCode, homeCode)) {
        totalHome = converter.convert(totalDest, destCode, homeCode);
    }
    return { nightly, overhead, totalDest, totalHome };
}

function calcBudgetRunwayDays(funds, fundCurrency, destCode, homeCode, tier = getTravelStyleTier()) {
    const burn = calcDailyBurnForStyle(destCode, homeCode || fundCurrency, tier);
    if (!burn || funds <= 0) return null;
    let fundsInDest = funds;
    if (fundCurrency !== destCode && canMarketConvert(fundCurrency, destCode)) {
        fundsInDest = converter.convert(funds, fundCurrency, destCode);
    } else if (fundCurrency === destCode) {
        fundsInDest = funds;
    }
    const days = burn.totalDest > 0 ? Math.floor(fundsInDest / burn.totalDest) : 0;
    return { days, dailyDest: burn.totalDest, dailyHome: burn.totalHome, fundsInDest, burn };
}

function calcPaymentOptimizer(amount, homeCode, destCode, options = {}) {
    if (!canMarketConvert(homeCode, destCode) || amount <= 0) return null;
    const cardType = options.cardType || 'travel';
    const profile = CARD_FEE_PROFILES[cardType] || CARD_FEE_PROFILES.travel;
    const bankFee = profile.bankFxFee;
    const dccMarkup = options.dccMarkup ?? profile.dccMarkup;

    const payLocalIdeal = converter.convert(amount, homeCode, destCode);
    const payLocal = payLocalIdeal * (1 - bankFee);
    const dccHomeCharge = amount * (1 + dccMarkup);
    const dccAsLocal = converter.convert(dccHomeCharge, homeCode, destCode);
    const savingsLocal = Math.max(0, dccAsLocal - payLocal);
    const savingsHome = converter.convert(savingsLocal, destCode, homeCode);
    const savingsPct = payLocal > 0 ? (savingsLocal / payLocal) * 100 : dccMarkup * 100;

    return {
        payLocal,
        payLocalIdeal,
        dccHomeCharge,
        dccAsLocal,
        savingsLocal,
        savingsHome,
        savingsPct,
        bankFeePct: bankFee * 100,
        dccMarkupPct: dccMarkup * 100,
        cardType,
        homeCode,
        destCode
    };
}

function calcRunwayComparison(funds, fundCurrency, destCode, homeCode, tier = getTravelStyleTier()) {
    const dest = calcBudgetRunwayDays(funds, fundCurrency, destCode, homeCode, tier);
    const home = calcBudgetRunwayDays(funds, fundCurrency, homeCode, homeCode, tier);
    if (!dest) return null;
    return { dest, home, funds, fundCurrency, destCode, homeCode, tier };
}

function calcVatRefund(spend, destCode) {
    if (!spend || spend <= 0) return null;
    const meta = SURVIVAL_DATA[destCode] || DEFAULT_SURVIVAL;
    const vatPct = meta.vat ?? DEFAULT_SURVIVAL.vat;
    const rate = vatPct / 100;
    const refund = spend * (rate / (1 + rate));
    return {
        spend,
        vatPct,
        refund,
        netSpend: spend - refund,
        destCode
    };
}

function countryFlagEmoji(countryCode) {
    if (!countryCode || countryCode.length !== 2) return '';
    const upper = countryCode.toUpperCase();
    return String.fromCodePoint(
        ...[...upper].map((c) => 0x1f1e6 - 65 + c.charCodeAt(0))
    );
}

class CurrencyConverter {
    constructor() {
        this.rates = { USD: 1, ...DEFAULT_FX_RATES };
        this.rateHistory = {};
    }

    updateRates(liveRates) {
        this.rates = { USD: 1, ...liveRates };
    }

    convert(amount, from, to) {
        if (!(from in this.rates) || !(to in this.rates)) {
            throw new Error('Invalid currency code');
        }
        const amountInBase = amount / this.rates[from];
        return amountInBase * this.rates[to];
    }

    getRate(from, to) {
        return this.convert(1, from, to);
    }

    snapshotRates() {
        return { ...this.rates };
    }
}

const converter = new CurrencyConverter();

function getCurrencyMap() {
    return typeof currencyMap !== 'undefined'
        ? currencyMap
        : Object.fromEntries((typeof CURRENCIES !== 'undefined' ? CURRENCIES : []).map((c) => [c.code, c]));
}

function scaleCost(value) {
    if (value >= 10000) return Math.round(value / 500) * 500;
    if (value >= 1000) return Math.round(value / 50) * 50;
    if (value >= 100) return Math.round(value / 5) * 5;
    if (value >= 10) return Math.round(value * 10) / 10;
    return Math.round(value * 100) / 100;
}

function getFxRate(code) {
    if (code === 'USD') return 1;
    return converter.rates[code] ?? DEFAULT_FX_RATES[code] ?? null;
}

function hasMarketRate(code) {
    return code in converter.rates && converter.rates[code] != null;
}

function canMarketConvert(from, to) {
    return hasMarketRate(from) && hasMarketRate(to);
}

function buildPppProfile(code) {
    const map = getCurrencyMap();
    const currency = map[code];
    if (!currency) return null;
    const multiplier = REGION_PPP[currency.region] ?? 0.60;
    const fx = getFxRate(code) ?? 1;
    const costs = {};
    for (const key of PPP_UNIT_KEYS) {
        costs[key] = scaleCost(USD_LIVING_COSTS[key] * multiplier * fx);
    }
    return { country: currency.name, multiplier, costs };
}

function getPppProfile(code) {
    if (PPP_UNSUPPORTED.has(code)) return null;
    return PPP_OVERRIDES[code] ?? buildPppProfile(code);
}

function calcPowerRatio(from, to) {
    const fromP = getPppProfile(from);
    const toP = getPppProfile(to);
    if (!fromP || !toP) return null;
    return fromP.multiplier / toP.multiplier;
}

function formatAmount(value, code, locale) {
    const map = getCurrencyMap();
    const currency = map[code];
    const loc = locale || (typeof getLocale === 'function' ? getLocale() : 'en-US');
    const decimals = currency?.decimals ?? 2;
    const formatted = value.toLocaleString(loc, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
    });
    return currency ? `${currency.symbol}${formatted}` : formatted;
}

/** Estimated monthly living cost in destination currency */
function calcMonthlyLivingCost(destCode, tier = getTravelStyleTier()) {
    const profile = getAdjustedPppProfile(destCode, tier);
    if (!profile?.costs) return null;
    const c = profile.costs;
    const nightly = calcStyledNightly(destCode, tier);
    const daily = c.fast_meal * 2 + c.local_transport * 2 + c.coffee + (c.day_pass_coworking / 22) + nightly;
    return scaleCost(daily * 30);
}

/** Nomad runway from home budget */
function calcNomadRunway(monthlyBudget, homeCode, destCode) {
    const monthlyDest = calcMonthlyLivingCost(destCode);
    if (!monthlyDest || monthlyBudget <= 0) return null;
    const power = calcPowerRatio(homeCode, destCode);
    if (!power) return null;
    let budgetInDest = monthlyBudget;
    if (canMarketConvert(homeCode, destCode)) {
        budgetInDest = converter.convert(monthlyBudget, homeCode, destCode);
    }
    const effectiveBudget = budgetInDest * power;
    const months = effectiveBudget / monthlyDest;
    return {
        months,
        days: Math.floor(months * 30),
        monthlyDest,
        effectiveBudget,
        powerRatio: power
    };
}

/** Daily living overhead (meals + transport) */
function calcDailyLivingOverhead(destCode) {
    const profile = getPppProfile(destCode);
    if (!profile?.costs) return 0;
    const c = profile.costs;
    return scaleCost(c.fast_meal * 2 + c.local_transport * 2 + c.coffee * 0.5);
}

function calcTrueDailyBurn(nightlyRate, destCode, homeCode) {
    const overhead = calcDailyLivingOverhead(destCode);
    const totalDest = nightlyRate + overhead;
    let totalHome = totalDest;
    if (homeCode && canMarketConvert(destCode, homeCode)) {
        totalHome = converter.convert(totalDest, destCode, homeCode);
    }
    return { nightlyRate, overhead, totalDest, totalHome };
}

function getSurvivalMeta(code) {
    return SURVIVAL_DATA[code] ?? DEFAULT_SURVIVAL;
}

function calcEmergencyCash(destCode, homeCode, days = 3) {
    const profile = getPppProfile(destCode);
    const meta = getSurvivalMeta(destCode);
    if (!profile?.costs) return null;
    const daily = profile.costs.fast_meal * 2 + profile.costs.local_transport * 3;
    const intensityMult = { low: 0.3, medium: 0.6, high: 1.0 }[meta.cashIntensity] ?? 0.5;
    const cashDest = scaleCost(daily * days * intensityMult);
    let cashHome = cashDest;
    if (canMarketConvert(destCode, homeCode)) {
        cashHome = converter.convert(cashDest, destCode, homeCode);
    }
    return { cashDest, cashHome, intensity: meta.cashIntensity };
}

function getPpiScore(homeCode, destCode) {
    const ratio = calcPowerRatio(homeCode, destCode);
    if (!ratio) return 0;
    return Math.min(100, Math.max(0, Math.round((ratio - 0.5) / 1.5 * 100)));
}

function getPpiColor(score) {
    if (score >= 70) return '#818cf8';
    if (score >= 45) return '#a5b4fc';
    if (score >= 25) return '#fbbf24';
    return '#f87171';
}

/** Human-readable PPP lifestyle label vs home currency */
function formatPppLifestyleLabel(homeCode, destCode) {
    const ratio = calcPowerRatio(homeCode, destCode);
    if (!ratio) return { text: '—', tier: 'unknown' };
    if (ratio >= 1.25) {
        return { text: `${Math.round((ratio - 1) * 100)}% Cheaper than Home`, tier: 'cheap' };
    }
    if (ratio >= 1.05) return { text: 'Budget Friendly', tier: 'good' };
    if (ratio >= 0.95) return { text: 'Near Parity', tier: 'fair' };
    if (ratio >= 0.75) return { text: 'Premium Zone', tier: 'premium' };
    return { text: 'High Overhead Zone', tier: 'expensive' };
}

/** Estimated mid-range nightly accommodation from PPP profile */
function calcEstimatedNightly(destCode) {
    const profile = getPppProfile(destCode);
    if (!profile?.costs) return 0;
    return scaleCost(profile.costs.sitdown_meal * 2.2);
}

function tempOverlayColor(celsius) {
    if (celsius == null || Number.isNaN(celsius)) return '#64748b';
    if (celsius >= 28) return '#f97316';
    if (celsius >= 20) return '#93c5fd';
    if (celsius >= 10) return '#38bdf8';
    return '#818cf8';
}

async function fetchLiveFxRates(options = {}) {
    const silent = options.silent ?? false;
    const result = await fetchLiveFxRatesWithFallback('USD', { silent });
    const live = {};
    const codes = typeof CURRENCY_CODES !== 'undefined' ? CURRENCY_CODES : Object.keys(result.rates);
    for (const code of codes) {
        if (code !== 'USD' && result.rates[code] != null) live[code] = result.rates[code];
    }
    converter.updateRates(live);
    return {
        ok: result.ok,
        time: result.time,
        source: result.source,
        offline: result.source === 'fallback'
    };
}

async function fetchWeather(lat, lon, options = {}) {
    const silent = options.silent ?? true;
    const params = new URLSearchParams({
        latitude: lat,
        longitude: lon,
        current_weather: 'true',
        daily: 'temperature_2m_max,temperature_2m_min,precipitation_probability_max',
        timezone: 'auto'
    });
    try {
        const res = typeof safeFetch === 'function'
            ? await safeFetch(`${WEATHER_API}?${params}`, {}, { silent, context: 'weather' })
            : await fetch(`${WEATHER_API}?${params}`);
        if (!res.ok) throw new Error('Weather unavailable');
        const data = await res.json();
        const cw = data.current_weather;
        return {
            ok: true,
            temp: cw.temperature,
            code: cw.weathercode,
            rain: data.daily?.precipitation_probability_max?.[0] ?? 0,
            high: data.daily?.temperature_2m_max?.[0] ?? cw.temperature,
            low: data.daily?.temperature_2m_min?.[0] ?? cw.temperature,
            timezone: data.timezone
        };
    } catch {
        return { ok: false };
    }
}

/* ── Toast notifications + safe fetch + image engine ── */

const HOTEL_IMG_PLACEHOLDER = 'https://placehold.co/600x400/1a1e29/e2e8f0?text=Hotel+Preview+Unavailable';

const ImageEngine = {
    primaryUrl(seed, w = 600, h = 400) {
        const s = encodeURIComponent(String(seed ?? Math.random()));
        return `https://picsum.photos/seed/${s}/${w}/${h}`;
    },
    fallbackUrl(w = 600, h = 400) {
        return `https://loremflickr.com/${w}/${h}/hotel,resort/all`;
    },
    galleryUrls(hotelId, count = 3) {
        return Array.from({ length: count }, (_, i) => this.primaryUrl(`${hotelId}-${i}`, 600, 400));
    }
};

function handleHotelImgError(img) {
    if (!img) return;
    const stage = img.dataset.imgStage || 'primary';
    if (stage === 'primary') {
        img.dataset.imgStage = 'fallback';
        img.src = ImageEngine.fallbackUrl(600, 400);
        return;
    }
    img.onerror = null;
    img.src = HOTEL_IMG_PLACEHOLDER;
}

const Toast = {
    _root: null,

    init() {
        if (this._root) return;
        this._root = document.createElement('div');
        this._root.id = 'nomad-os-toast-root';
        this._root.className = 'toast-root';
        this._root.setAttribute('aria-live', 'polite');
        document.body.appendChild(this._root);
    },

    show(message, type = 'error', duration = 4500) {
        if (!message) return;
        this.init();
        const el = document.createElement('div');
        el.className = `toast toast--${type}`;
        el.setAttribute('role', 'alert');
        el.textContent = message;
        this._root.appendChild(el);
        requestAnimationFrame(() => el.classList.add('toast--visible'));
        setTimeout(() => {
            el.classList.remove('toast--visible');
            setTimeout(() => el.remove(), 320);
        }, duration);
    },

    error(msg) { this.show(msg, 'error'); },
    warn(msg) { this.show(msg, 'warn'); },
    info(msg) { this.show(msg, 'info'); }
};

async function safeFetch(url, options = {}, meta = {}) {
    const { silent = false, context = 'network' } = meta;

    const toastOffline = () => {
        if (silent) return;
        Toast.warn(typeof t === 'function' ? t('toastOffline') : 'You appear to be offline.');
    };

    const toastError = (msg) => {
        if (silent) return;
        Toast.error(msg);
    };

    try {
        if (typeof navigator !== 'undefined' && !navigator.onLine) {
            toastOffline();
            throw new Error('offline');
        }

        const res = await fetch(url, options);

        if (!res.ok) {
            const msg = res.status === 429
                ? (typeof t === 'function' ? t('toastRateLimit') : 'API rate limit reached. Try again shortly.')
                : (typeof t === 'function' ? t('toastApiError') : 'Service temporarily unavailable.');
            toastError(msg);
            throw new Error(`HTTP ${res.status}`);
        }

        return res;
    } catch (err) {
        if (err.name === 'AbortError') throw err;
        if (err.message === 'offline') throw err;
        if (err.message?.startsWith('HTTP')) throw err;

        if (typeof navigator !== 'undefined' && !navigator.onLine) {
            toastOffline();
        } else if (!silent) {
            toastError(typeof t === 'function' ? t('toastNetworkError') : 'Network error. Please try again.');
        }
        throw err;
    }
}

function showSkeletonCards(container, count = 3, className = 'skeleton-card') {
    if (!container) return;
    container.innerHTML = Array.from({ length: count }, () =>
        `<div class="${className}" aria-hidden="true"><div class="skeleton-card__shimmer"></div></div>`
    ).join('');
}

const NomadOSShared = {
    converter,
    RATES_API,
    WEATHER_API,
    PPP_OVERRIDES,
    REGION_PPP,
    SURVIVAL_DATA,
    PPP_UNIT_KEYS,
    REGION_ORDER,
    getPppProfile,
    getAdjustedPppProfile,
    getTravelStyleTier,
    setTravelStyleTier,
    TRAVEL_STYLE_TIERS,
    calcDailyBurnForStyle,
    calcBudgetRunwayDays,
    calcPaymentOptimizer,
    calcRunwayComparison,
    calcVatRefund,
    countryFlagEmoji,
    CARD_FEE_PROFILES,
    calcStyledNightly,
    DCC_FX_MARKUP,
    calcPowerRatio,
    calcNomadRunway,
    calcDailyLivingOverhead,
    calcTrueDailyBurn,
    calcMonthlyLivingCost,
    getSurvivalMeta,
    calcEmergencyCash,
    getPpiScore,
    getPpiColor,
    formatPppLifestyleLabel,
    calcEstimatedNightly,
    tempOverlayColor,
    formatAmount,
    canMarketConvert,
    fetchLiveFxRates,
    fetchLiveFxRatesWithFallback,
    fetchHistoricalFxRates,
    fetchFxRateRange,
    FALLBACK_RATES,
    getMergedFallbackRates,
    fetchWeather,
    Toast,
    safeFetch,
    ImageEngine,
    handleHotelImgError,
    showSkeletonCards,
    HOTEL_IMG_PLACEHOLDER
};

if (typeof window !== 'undefined') {
    window.handleHotelImgError = handleHotelImgError;
    window.Toast = Toast;
    window.safeFetch = safeFetch;
}
