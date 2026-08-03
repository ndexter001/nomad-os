const REFRESH_INTERVAL_MS = 15_000;
const STATS_CURRENCIES = [
    'EUR', 'GBP', 'NOK', 'CHF', 'JPY', 'CNY', 'AUD', 'CAD', 'INR', 'BRL', 'ZAR', 'SGD'
];

/* PPP, FX, converter — loaded from shared.js */

const UNIT_ICONS = {
    coffee: '☕', fast_meal: '🍜', sitdown_meal: '🍽️',
    local_transport: '🚌', day_pass_coworking: '💻'
};

/* ═══════════════════════════════════════════════════════════════════════════
   Smart Weather & Activity Value Index — destination city + Open-Meteo
   ═══════════════════════════════════════════════════════════════════════════ */
const WEATHER_CACHE_MS = 30 * 60 * 1000;
const WEATHER_REFRESH_MS = 30 * 60 * 1000;

const WEATHER_ICONS = {
    sun: `<svg class="weather-icon weather-icon--sun" viewBox="0 0 48 48" fill="none" aria-hidden="true">
        <circle cx="24" cy="24" r="10" stroke="currentColor" stroke-width="2"/>
        <path d="M24 4v6M24 38v6M4 24h6M38 24h6M9.9 9.9l4.2 4.2M33.9 33.9l4.2 4.2M9.9 38.1l4.2-4.2M33.9 14.1l4.2-4.2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
    </svg>`,
    rain: `<svg class="weather-icon weather-icon--rain" viewBox="0 0 48 48" fill="none" aria-hidden="true">
        <path d="M14 22a10 10 0 0118-2 8 8 0 011.2 15.9H16a6 6 0 01-2-13.9z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
        <path d="M18 32l-2 6M26 32l-2 6M34 32l-2 6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
    </svg>`,
    cloud: `<svg class="weather-icon weather-icon--cloud" viewBox="0 0 48 48" fill="none" aria-hidden="true">
        <path d="M14 30a10 10 0 0116.5-3.5A8 8 0 0138 30H14z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
        <circle cx="30" cy="18" r="5" stroke="currentColor" stroke-width="2"/>
    </svg>`,
    cold: `<svg class="weather-icon weather-icon--cold" viewBox="0 0 48 48" fill="none" aria-hidden="true">
        <path d="M24 6v36M24 6l-4 4M24 6l4 4M24 42l-4-4M24 42l4-4M12 16l8 4M36 16l-8 4M12 32l8-4M36 32l-8-4M8 24h8M32 24h8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
    </svg>`
};

let weatherCache = { key: null, data: null, fetchedAt: 0 };
let weatherAbort = null;
let weatherTimezone = null;
let weatherClockTimer = null;
let weatherRefreshTimer = null;
let lastWeatherSnapshot = null;

let weeklyRates = {};
let lastRateUpdate = null;
let refreshTimer = null;
let clockTimer = null;

/** Safe DOM access — returns null when element is missing */
function $(id) {
    return document.getElementById(id);
}

function bind(el, type, handler, options) {
    if (el) el.addEventListener(type, handler, options);
}

/* ── Smooth number tickers ── */
const _animState = new WeakMap();

function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
}

function prefersReducedMotion() {
    return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function cancelElementAnimation(element) {
    const state = _animState.get(element);
    if (state?.frameId) cancelAnimationFrame(state.frameId);
}

function setElementDisplay(element, text) {
    if (!element) return;
    if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
        element.value = text;
    } else {
        element.textContent = text;
    }
}

function storeAnimatedValue(element, value) {
    _animState.set(element, { frameId: null, value });
}

function getLastAnimatedValue(element, fallback = 0) {
    const state = _animState.get(element);
    if (state?.value != null && Number.isFinite(state.value)) return state.value;
    if (!element) return fallback;
    const raw = element.tagName === 'INPUT' || element.tagName === 'TEXTAREA'
        ? element.value
        : element.textContent;
    if (!raw || raw === '—') return fallback;
    const cleaned = String(raw).replace(/[^\d.,-]/g, '').replace(/,/g, '');
    const num = parseFloat(cleaned);
    return Number.isFinite(num) ? num : fallback;
}

/**
 * Smooth count-up for financial readouts.
 * @param {HTMLElement} element
 * @param {number} start
 * @param {number} end
 * @param {number} duration ms
 * @param {{ formatter?: (n:number)=>string, onComplete?: ()=>void, ease?: (t:number)=>number }} options
 */
function animateValue(element, start, end, duration = 600, options = {}) {
    if (!element) return;

    const {
        formatter = (v) => String(Math.round(v)),
        onComplete,
        ease = easeOutCubic
    } = options;

    cancelElementAnimation(element);

    if (!Number.isFinite(end)) {
        setElementDisplay(element, '—');
        element.classList?.remove('is-animating');
        return;
    }

    const safeStart = Number.isFinite(start) ? start : end;

    if (prefersReducedMotion() || duration <= 0 || Math.abs(end - safeStart) < 1e-9) {
        setElementDisplay(element, formatter(end));
        storeAnimatedValue(element, end);
        element.classList?.remove('is-animating');
        onComplete?.();
        return;
    }

    element.classList?.add('is-animating');
    const startTime = performance.now();

    function tick(now) {
        const progress = Math.min(1, (now - startTime) / duration);
        const current = safeStart + (end - safeStart) * ease(progress);
        setElementDisplay(element, formatter(current));

        if (progress < 1) {
            const frameId = requestAnimationFrame(tick);
            _animState.set(element, { frameId, value: current });
        } else {
            setElementDisplay(element, formatter(end));
            storeAnimatedValue(element, end);
            element.classList?.remove('is-animating');
            onComplete?.();
        }
    }

    const frameId = requestAnimationFrame(tick);
    _animState.set(element, { frameId, value: safeStart });
}

function animateAmountEl(element, amount, currencyCode, duration = 650) {
    if (!element) return;
    animateValue(
        element,
        getLastAnimatedValue(element, amount),
        amount,
        duration,
        { formatter: (v) => formatAmount(v, currencyCode) }
    );
}

function animateIntegerEl(element, value, duration = 550) {
    if (!element || !Number.isFinite(value)) {
        if (element) setElementDisplay(element, '—');
        return;
    }
    animateValue(
        element,
        getLastAnimatedValue(element, value),
        value,
        duration,
        { formatter: (v) => String(Math.round(v)) }
    );
}

function animateRateEl(element, from, to, rate, duration = 600) {
    if (!element || !Number.isFinite(rate)) return;
    const decimals = Math.max(currencyMap[to]?.decimals ?? 2, 4);
    animateValue(
        element,
        getLastAnimatedValue(element, rate),
        rate,
        duration,
        { formatter: (v) => `1 ${from} = ${v.toFixed(decimals)} ${to}` }
    );
}

function animateBarWidth(element, endPct, duration = 700) {
    if (!element || !Number.isFinite(endPct)) return;
    const start = parseFloat(element.dataset.animPct) || parseFloat(element.style.width) || 0;
    if (prefersReducedMotion() || duration <= 0) {
        element.style.width = `${endPct}%`;
        element.dataset.animPct = String(endPct);
        return;
    }
    const startTime = performance.now();
    function tick(now) {
        const progress = Math.min(1, (now - startTime) / duration);
        const current = start + (endPct - start) * easeOutCubic(progress);
        element.style.width = `${current}%`;
        element.dataset.animPct = String(current);
        if (progress < 1) requestAnimationFrame(tick);
        else {
            element.style.width = `${endPct}%`;
            element.dataset.animPct = String(endPct);
        }
    }
    requestAnimationFrame(tick);
}

const fromAmount = document.getElementById('from-amount');
const toAmount = document.getElementById('to-amount');
const fromCurrency = document.getElementById('from-currency');
const toCurrency = document.getElementById('to-currency');
const swapBtn = document.getElementById('swap-btn');
const rateDisplay = document.getElementById('rate-display');
const rateBadge = document.getElementById('rate-badge');
const lastUpdated = document.getElementById('last-updated');
const statsList = document.getElementById('stats-list');
const statsUpdated = document.getElementById('stats-updated');
const statCount = document.getElementById('stat-count');
const statStrongest = document.getElementById('stat-strongest');
const statWeakest = document.getElementById('stat-weakest');
const currencySearch = document.getElementById('currency-search');
const pppFallback = document.getElementById('ppp-fallback');
const pppPanel = document.getElementById('ppp-panel');
const pppNominal = document.getElementById('ppp-nominal');
const pppRealValue = document.getElementById('ppp-real-value');
const pppRealHint = document.getElementById('ppp-real-hint');
const pppGap = document.getElementById('ppp-gap');
const pppGapHint = document.getElementById('ppp-gap-hint');
const pppBarNominal = document.getElementById('ppp-bar-nominal');
const pppBarPpp = document.getElementById('ppp-bar-ppp');
const pppInsight = document.getElementById('ppp-insight');
const pppDestLabel = document.getElementById('ppp-dest-label');
const pppDestCountry = document.getElementById('ppp-dest-country');
const pppRatingBadge = document.getElementById('ppp-rating-badge');
const pppUnitGrid = document.getElementById('ppp-unit-grid');
const pppPriceList = document.getElementById('ppp-price-list');
const pppPriceHeading = document.getElementById('ppp-price-heading');
const weatherCard = document.getElementById('destination-weather-card');
const weatherIconWrap = document.getElementById('weather-icon-wrap');
const weatherCity = document.getElementById('weather-city');
const weatherLocalTime = document.getElementById('weather-local-time');
const weatherTemp = document.getElementById('weather-temp');
const weatherHigh = document.getElementById('weather-high');
const weatherLow = document.getElementById('weather-low');
const weatherRain = document.getElementById('weather-rain');
const weatherMetrics = document.getElementById('weather-metrics');
const weatherModeBadge = document.getElementById('weather-mode-badge');
const weatherAdvice = document.getElementById('weather-advice');
const weatherAlert = document.getElementById('weather-alert');
const weatherFallback = document.getElementById('weather-fallback');

const greetingBanner = document.getElementById('greeting-banner');
const greetingText = document.getElementById('greeting-text');
const greetingSub = document.getElementById('greeting-sub');
const heroDestinationCard = document.getElementById('heroDestinationCard');
const heroDestinationBg = document.getElementById('hero-destination-bg');
const heroGreeting = document.getElementById('hero-greeting');
const heroCityName = document.getElementById('hero-city-name');
const heroWeatherBadge = document.getElementById('hero-weather-badge');
const heroVibeBadges = document.getElementById('hero-vibe-badges');
const welcomeEmptyState = document.getElementById('welcome-empty-state');
const ambientGlowA = document.getElementById('ambient-glow-a');
const ambientGlowB = document.getElementById('ambient-glow-b');
const paymentOptimizer = document.getElementById('payment-optimizer');
const payLocalAmount = document.getElementById('pay-local-amount');
const payDccAmount = document.getElementById('pay-dcc-amount');
const paySavingsAmount = document.getElementById('pay-savings-amount');
const paymentOptimizerTip = document.getElementById('payment-optimizer-tip');
const paymentOptimizerAdvice = document.getElementById('payment-optimizer-advice');
let paymentCardType = 'travel';
const nomadRunwayCard = document.getElementById('nomad-runway-card');
const runwayBudgetInput = document.getElementById('runway-budget');
const runwayBudgetCurrency = document.getElementById('runway-budget-currency');
const runwayDaysEl = document.getElementById('runway-days');
const runwayDetailEl = document.getElementById('runway-detail');
const runwayComparisonEl = document.getElementById('runway-comparison');
const runwayProgressWrap = document.getElementById('runway-progress-wrap');
const runwayProgressFill = document.getElementById('runway-progress-fill');
const runwayProgressLabel = document.getElementById('runway-progress-label');
const financeOsGrid = document.getElementById('finance-os-grid');

/** Shared UI state — synced with CityContext, converter, and runway controls */
const APP_STATE_DEFAULTS = {
    activeCity: 'Bangkok',
    countryName: 'Thailand',
    countryCode: 'TH',
    burnZone: 'cheap',
    heroImageSeed: 'nomad-world',
    homeCurrency: 'USD',
    targetCurrency: 'THB',
    exchangeRate: 36.5,
    pppMultiplier: 0.65,
    travelStyle: 'nomad',
    totalBudget: 5000,
    dailyOverheadUSD: 35
};

const _appStateData = { ...APP_STATE_DEFAULTS };

const AppState = {
    getCalculatedBurn(roomRateUSD) {
        const styleMult = this.travelStyle === 'backpacker' ? 0.5 : (this.travelStyle === 'luxury' ? 2.5 : 1.0);
        const overhead = (this.dailyOverheadUSD || APP_STATE_DEFAULTS.dailyOverheadUSD)
            * (this.pppMultiplier || APP_STATE_DEFAULTS.pppMultiplier)
            * styleMult;
        return (Number(roomRateUSD) || 0) + overhead;
    }
};

function _appStateStr(val, fallback) {
    return val != null && val !== '' ? val : fallback;
}

function _appStateNum(val, fallback) {
    const n = Number(val);
    return Number.isFinite(n) ? n : fallback;
}

Object.defineProperties(AppState, {
    activeCity: {
        get: () => _appStateStr(_appStateData.activeCity, APP_STATE_DEFAULTS.activeCity),
        set: (v) => { _appStateData.activeCity = _appStateStr(v, APP_STATE_DEFAULTS.activeCity); },
        enumerable: true
    },
    countryName: {
        get: () => _appStateStr(_appStateData.countryName, APP_STATE_DEFAULTS.countryName),
        set: (v) => { _appStateData.countryName = _appStateStr(v, APP_STATE_DEFAULTS.countryName); },
        enumerable: true
    },
    countryCode: {
        get: () => _appStateStr(_appStateData.countryCode, APP_STATE_DEFAULTS.countryCode),
        set: (v) => { _appStateData.countryCode = _appStateStr(v, APP_STATE_DEFAULTS.countryCode); },
        enumerable: true
    },
    burnZone: {
        get: () => _appStateStr(_appStateData.burnZone, APP_STATE_DEFAULTS.burnZone),
        set: (v) => {
            _appStateData.burnZone = _appStateStr(v, APP_STATE_DEFAULTS.burnZone);
            applyAmbientGlowClass(_appStateData.burnZone);
        },
        enumerable: true
    },
    heroImageSeed: {
        get: () => _appStateStr(_appStateData.heroImageSeed, APP_STATE_DEFAULTS.heroImageSeed),
        set: (v) => { _appStateData.heroImageSeed = _appStateStr(v, APP_STATE_DEFAULTS.heroImageSeed); },
        enumerable: true
    },
    homeCurrency: {
        get: () => fromCurrency?.value || _appStateStr(_appStateData.homeCurrency, APP_STATE_DEFAULTS.homeCurrency),
        set: (v) => {
            const code = _appStateStr(v, APP_STATE_DEFAULTS.homeCurrency);
            _appStateData.homeCurrency = code;
            if (fromCurrency && [...fromCurrency.options].some((o) => o.value === code)) {
                fromCurrency.value = code;
                if (typeof updateConversion === 'function') updateConversion();
            }
        },
        enumerable: true
    },
    targetCurrency: {
        get: () => toCurrency?.value || _appStateStr(_appStateData.targetCurrency, APP_STATE_DEFAULTS.targetCurrency),
        set: (v) => {
            const code = _appStateStr(v, APP_STATE_DEFAULTS.targetCurrency);
            _appStateData.targetCurrency = code;
            if (toCurrency && [...toCurrency.options].some((o) => o.value === code)) {
                toCurrency.value = code;
                if (typeof updateConversion === 'function') updateConversion();
            }
        },
        enumerable: true
    },
    exchangeRate: {
        get: () => {
            const home = AppState.homeCurrency;
            const dest = AppState.targetCurrency;
            try {
                if (typeof converter !== 'undefined' && home && dest) {
                    const rate = converter.getRate(home, dest);
                    if (Number.isFinite(rate) && rate > 0) return rate;
                }
            } catch { /* use stored fallback */ }
            return _appStateNum(_appStateData.exchangeRate, APP_STATE_DEFAULTS.exchangeRate);
        },
        set: (v) => { _appStateData.exchangeRate = _appStateNum(v, APP_STATE_DEFAULTS.exchangeRate); },
        enumerable: true
    },
    pppMultiplier: {
        get: () => {
            const dest = AppState.targetCurrency;
            const profile = typeof getPppProfile === 'function' ? getPppProfile(dest) : null;
            return profile?.multiplier ?? _appStateNum(_appStateData.pppMultiplier, APP_STATE_DEFAULTS.pppMultiplier);
        },
        set: (v) => { _appStateData.pppMultiplier = _appStateNum(v, APP_STATE_DEFAULTS.pppMultiplier); },
        enumerable: true
    },
    travelStyle: {
        get: () => {
            const tier = typeof getTravelStyleTier === 'function' ? getTravelStyleTier() : _appStateData.travelStyle;
            return _appStateStr(tier, APP_STATE_DEFAULTS.travelStyle);
        },
        set: (v) => {
            const tier = _appStateStr(v, APP_STATE_DEFAULTS.travelStyle);
            _appStateData.travelStyle = tier;
            if (typeof setTravelStyleTier === 'function') setTravelStyleTier(tier);
            document.querySelectorAll('.travel-style-pill[data-tier]').forEach((p) => {
                p.classList.toggle('travel-style-pill--active', p.dataset.tier === tier);
            });
            if (typeof updateConversion === 'function') updateConversion();
        },
        enumerable: true
    },
    totalBudget: {
        get: () => {
            const parsed = parseFloat(runwayBudgetInput?.value);
            if (Number.isFinite(parsed) && parsed > 0) return parsed;
            return _appStateNum(_appStateData.totalBudget, APP_STATE_DEFAULTS.totalBudget);
        },
        set: (v) => {
            const budget = _appStateNum(v, APP_STATE_DEFAULTS.totalBudget);
            _appStateData.totalBudget = budget;
            if (runwayBudgetInput) runwayBudgetInput.value = String(budget);
            if (typeof updateNomadRunway === 'function') updateNomadRunway();
        },
        enumerable: true
    },
    dailyOverheadUSD: {
        get: () => _appStateNum(_appStateData.dailyOverheadUSD, APP_STATE_DEFAULTS.dailyOverheadUSD),
        set: (v) => { _appStateData.dailyOverheadUSD = _appStateNum(v, APP_STATE_DEFAULTS.dailyOverheadUSD); },
        enumerable: true
    }
});

const HERO_HOTSPOTS = {
    tokyo: {
        id: 'tokyo-jp',
        name: 'Tokyo',
        country: 'Japan',
        country_code: 'JP',
        lat: 35.6762,
        lon: 139.6503,
        currency: 'JPY',
        label: 'Tokyo, Japan'
    },
    oslo: {
        id: 'oslo-no',
        name: 'Oslo',
        country: 'Norway',
        country_code: 'NO',
        lat: 59.9139,
        lon: 10.7522,
        currency: 'NOK',
        label: 'Oslo, Norway'
    },
    bangkok: {
        id: 'bangkok-th',
        name: 'Bangkok',
        country: 'Thailand',
        country_code: 'TH',
        lat: 13.7563,
        lon: 100.5018,
        currency: 'THB',
        label: 'Bangkok, Thailand'
    },
    barcelona: {
        id: 'barcelona-es',
        name: 'Barcelona',
        country: 'Spain',
        country_code: 'ES',
        lat: 41.3851,
        lon: 2.1734,
        currency: 'EUR',
        label: 'Barcelona, Spain'
    }
};

const WEATHER_HERO_ICONS = {
    sun: '☀️',
    rain: '🌧️',
    cloud: '☁️',
    cold: '❄️'
};

const COUNTRY_GREETINGS = {
    NO: { text: 'Velkommen!', subKey: 'greetingNorway' },
    JP: { text: 'Kon\'nichiwa!', subKey: 'greetingJapan' },
    TH: { text: 'Sawasdee!', subKey: 'greetingThailand' },
    FR: { text: 'Bonjour!', subKey: 'greetingFrance' },
    ES: { text: '¡Hola!', subKey: 'greetingSpain' },
    DE: { text: 'Willkommen!', subKey: 'greetingGermany' },
    IT: { text: 'Ciao!', subKey: 'greetingItaly' },
    US: { text: 'Howdy!', subKey: 'greetingUSA' },
    GB: { text: 'Hello!', subKey: 'greetingUK' },
    BR: { text: 'Olá!', subKey: 'greetingBrazil' },
    MX: { text: '¡Hola!', subKey: 'greetingMexico' },
    IN: { text: 'Namaste!', subKey: 'greetingIndia' },
    KR: { text: 'Annyeonghaseyo!', subKey: 'greetingKorea' },
    CN: { text: 'Nǐ hǎo!', subKey: 'greetingChina' },
    AU: { text: 'G\'day!', subKey: 'greetingAustralia' },
    SE: { text: 'Välkommen!', subKey: 'greetingDefaultSub' },
    DK: { text: 'Velkommen!', subKey: 'greetingDefaultSub' },
    NL: { text: 'Hallo!', subKey: 'greetingDefaultSub' },
    PT: { text: 'Olá!', subKey: 'greetingDefaultSub' },
    AR: { text: '¡Hola!', subKey: 'greetingDefaultSub' },
    CO: { text: '¡Hola!', subKey: 'greetingDefaultSub' },
    VN: { text: 'Xin chào!', subKey: 'greetingDefaultSub' },
    ID: { text: 'Selamat datang!', subKey: 'greetingDefaultSub' },
    TR: { text: 'Merhaba!', subKey: 'greetingDefaultSub' },
    AE: { text: 'Marhaba!', subKey: 'greetingDefaultSub' },
    PL: { text: 'Witaj!', subKey: 'greetingDefaultSub' }
};

function getCountryGreeting(cc) {
    const entry = COUNTRY_GREETINGS[cc];
    const uiBase = (typeof currentLang !== 'undefined' ? currentLang : 'en').split('-')[0];

    if (uiBase === 'en') {
        if (entry?.subKey && entry.subKey !== 'greetingDefaultSub') {
            return { text: typeof t === 'function' ? t(entry.subKey) : entry.text, subKey: null };
        }
        return {
            text: typeof t === 'function' ? t('greetingDefault') : 'Welcome!',
            subKey: 'greetingDefaultSub'
        };
    }

    if (entry) return entry;
    return {
        text: typeof t === 'function' ? t('greetingDefault') : 'Welcome!',
        subKey: 'greetingDefaultSub'
    };
}

function refreshCityContextForLanguage() {
    const city = typeof CityContext !== 'undefined' ? CityContext.get() : null;
    if (!city?.name) return;

    const cc = city.country_code;
    if (cc && typeof getCountryName === 'function') {
        const cur = typeof COUNTRY_TO_CURRENCY !== 'undefined' ? COUNTRY_TO_CURRENCY[cc] : null;
        if (cur) city.country = getCountryName(cur);
    }

    city.label = city.country ? `${city.name}, ${city.country}` : city.name;

    const input = $('city-search');
    if (input && document.activeElement !== input) {
        input.value = city.label;
    }

    try {
        localStorage.setItem('nomad-os-selected-city', JSON.stringify(city));
    } catch { /* quota */ }
}

const CURRENCY_TO_COUNTRY = {
    NOK: 'NO', JPY: 'JP', THB: 'TH', EUR: 'DE', GBP: 'GB', USD: 'US',
    BRL: 'BR', MXN: 'MX', INR: 'IN', KRW: 'KR', CNY: 'CN', AUD: 'AU',
    SEK: 'SE', DKK: 'DK', CHF: 'CH', PLN: 'PL', TRY: 'TR', AED: 'AE'
};

const currencyMap = Object.fromEntries(CURRENCIES.map((c) => [c.code, c]));

function buildSelectOptions(filter = '') {
    const query = filter.trim().toLowerCase();
    const filtered = query
        ? CURRENCIES.filter(
            (c) =>
                c.code.toLowerCase().includes(query) ||
                c.name.toLowerCase().includes(query)
        )
        : CURRENCIES;

    const option = ({ code, name }) =>
        `<option value="${code}">${code} — ${name}</option>`;

    const parts = [];
    for (const region of REGION_ORDER) {
        const group = filtered.filter((c) => c.region === region);
        if (!group.length) continue;
        parts.push(`<optgroup label="${getRegionLabel(region)}">`);
        parts.push(...group.map(option));
        parts.push('</optgroup>');
    }
    return parts.join('');
}

function populateSelects(filter = '') {
    if (!fromCurrency || !toCurrency) return;

    const options = buildSelectOptions(filter);
    const fromVal = fromCurrency.value;
    const toVal = toCurrency.value;

    for (const select of [fromCurrency, toCurrency]) {
        select.innerHTML = options || `<option value="">${t('noResults')}</option>`;
    }

    if (fromVal && [...fromCurrency.options].some((o) => o.value === fromVal)) {
        fromCurrency.value = fromVal;
    } else if (!fromCurrency.value) {
        fromCurrency.value = 'USD';
    }

    if (toVal && [...toCurrency.options].some((o) => o.value === toVal)) {
        toCurrency.value = toVal;
    } else if (!toCurrency.value) {
        toCurrency.value = 'THB';
    }
}

function setBadgeState(state, text) {
    if (!rateBadge) return;
    rateBadge.className = `rate-badge rate-badge--${state}`;
    rateBadge.textContent = text;
}

function formatTimeAgo(date) {
    if (!date) return t('fetchingRates');
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 5) return t('updatedNow');
    if (seconds < 60) return t('updatedSecs')(seconds);
    const minutes = Math.floor(seconds / 60);
    return t('updatedMins')(minutes);
}

function updateTimestamps() {
    const text = formatTimeAgo(lastRateUpdate);
    if (lastUpdated) lastUpdated.textContent = text;
    if (statsUpdated && lastRateUpdate) {
        statsUpdated.textContent = lastRateUpdate.toLocaleTimeString(getLocale());
    }
}

function flashLiveUpdate() {
    if (!toAmount) return;
    toAmount.classList.remove('live-flash');
    void toAmount.offsetWidth;
    toAmount.classList.add('live-flash');
}

function startLiveClock() {
    if (clockTimer) clearInterval(clockTimer);
    clockTimer = setInterval(updateTimestamps, 1000);
}

function startLiveRefresh() {
    if (refreshTimer) clearInterval(refreshTimer);
    refreshTimer = setInterval(fetchLiveRates, REFRESH_INTERVAL_MS);
}

function getCountryDisplayName(code) {
    const profile = getPppProfile(code);
    return getCountryName(code) || profile?.country || currencyMap[code]?.name || code;
}

function renderExamplePrices(code) {
    if (!pppPriceList) return;
    const profile = getAdjustedPppProfile(code) || getPppProfile(code);
    if (pppPriceHeading) pppPriceHeading.textContent = code;
    if (!profile?.costs) {
        pppPriceList.innerHTML = `<p class="ppp-price-empty">${t('pppLoadingRates')}</p>`;
        return;
    }
    pppPriceList.innerHTML = PPP_UNIT_KEYS.map((key) => {
        const labels = getUnitLabels(key);
        return `
            <div class="ppp-price-row">
                <span class="ppp-price-row__icon" aria-hidden="true">${UNIT_ICONS[key]}</span>
                <div class="ppp-price-row__info">
                    <span class="ppp-price-row__name">${labels.name}</span>
                    <span class="ppp-price-row__desc">${labels.desc}</span>
                </div>
                <span class="ppp-price-row__price">${formatAmount(profile.costs[key], code)}</span>
            </div>
        `;
    }).join('');
}

function hasPppSupport(from, to) {
    return Boolean(getPppProfile(from) && getPppProfile(to));
}

/**
 * Core PPP metrics for a conversion.
 * - nominal: market-exchange amount in destination currency
 * - realLifestyle: PPP-adjusted value expressed in source currency
 * - pppLocal: PPP-adjusted spending power in destination currency
 */
function calcPppMetrics(amount, from, to) {
    const fromProfile = getPppProfile(from);
    const toProfile = getAdjustedPppProfile(to) || getPppProfile(to);
    if (!fromProfile || !toProfile || amount <= 0) return null;

    const powerRatio = fromProfile.multiplier / toProfile.multiplier;
    const realLifestyle = amount * powerRatio;
    const powerPct = (powerRatio - 1) * 100;

    let nominal = null;
    let pppLocal = null;
    const units = {};

    if (canMarketConvert(from, to)) {
        nominal = converter.convert(amount, from, to);
        pppLocal = nominal * powerRatio;
        for (const key of PPP_UNIT_KEYS) {
            const price = toProfile.costs?.[key];
            units[key] = price > 0 ? nominal / price : 0;
        }
    }

    return { nominal, realLifestyle, pppLocal, powerRatio, powerPct, units, fromProfile, toProfile, hasMarket: nominal != null };
}

function formatUnitCount(count, unitKey) {
    const labels = getUnitLabels(unitKey);
    if (count <= 0) return `${labels.prefix}0 ${labels.plural}`;
    const rounded = count >= 100 ? Math.round(count) : count >= 10 ? Math.round(count) : Math.round(count * 10) / 10;
    const word = rounded === 1 ? labels.singular : labels.plural;
    return `${labels.prefix}${rounded.toLocaleString(getLocale())} ${word}`;
}

function getNomadRating(powerRatio) {
    if (powerRatio >= 1.35) return { emoji: '🔥', label: t('nomad.hot'), tier: 'hot' };
    if (powerRatio >= 1.12) return { emoji: '✨', label: t('nomad.great'), tier: 'great' };
    if (powerRatio >= 0.92) return { emoji: '⚖️', label: t('nomad.fair'), tier: 'fair' };
    if (powerRatio >= 0.75) return { emoji: '📈', label: t('nomad.premium'), tier: 'premium' };
    return { emoji: '⚠️', label: t('nomad.warning'), tier: 'warning' };
}

function buildInsightText(amount, from, to, metrics) {
    const { powerPct } = metrics;
    const absPct = Math.abs(powerPct).toFixed(0);
    const fromName = getCountryDisplayName(from);
    const toName = getCountryDisplayName(to);
    const amt = formatAmount(amount, from);
    const real = formatAmount(metrics.realLifestyle, from);

    if (Math.abs(powerPct) < 3) {
        return t('insightParity')(fromName, toName);
    }
    if (powerPct > 0) {
        return t('insightBetter')(absPct, toName, fromName, amt, real);
    }
    return t('insightWorse')(absPct, toName, fromName, amt, real);
}

function burnZoneCssClass(zone) {
    const map = { cheap: 'low', low: 'low', moderate: 'moderate', expensive: 'high', high: 'high' };
    return map[zone] || 'moderate';
}

function mapBurnZoneFromRatio(zone) {
    const map = { low: 'cheap', moderate: 'moderate', high: 'expensive' };
    return map[zone] || zone || APP_STATE_DEFAULTS.burnZone;
}

function applyAmbientGlowClass(zone) {
    const cls = `ambient-glow--${burnZoneCssClass(zone)}`;
    for (const el of [ambientGlowA, ambientGlowB]) {
        if (!el) continue;
        el.classList.remove('ambient-glow--low', 'ambient-glow--moderate', 'ambient-glow--high');
        el.classList.add(cls);
    }
}

function syncAppStateFromUI(cityOverride) {
    const city = cityOverride ?? (typeof CityContext !== 'undefined' ? CityContext.get() : null);
    const home = fromCurrency?.value || APP_STATE_DEFAULTS.homeCurrency;
    const dest = toCurrency?.value || APP_STATE_DEFAULTS.targetCurrency;

    _appStateData.activeCity = city?.name || city?.label || _appStateData.activeCity || APP_STATE_DEFAULTS.activeCity;
    _appStateData.countryName = city?.country || _appStateData.countryName || APP_STATE_DEFAULTS.countryName;
    _appStateData.countryCode = city?.country_code || _appStateData.countryCode || APP_STATE_DEFAULTS.countryCode;
    _appStateData.homeCurrency = home;
    _appStateData.targetCurrency = dest;
    _appStateData.heroImageSeed = heroImageSeed(city) || APP_STATE_DEFAULTS.heroImageSeed;
    _appStateData.travelStyle = typeof getTravelStyleTier === 'function'
        ? getTravelStyleTier()
        : (_appStateData.travelStyle || APP_STATE_DEFAULTS.travelStyle);

    const funds = parseFloat(runwayBudgetInput?.value);
    if (Number.isFinite(funds) && funds > 0) _appStateData.totalBudget = funds;

    try {
        if (typeof converter !== 'undefined' && home && dest) {
            const rate = converter.getRate(home, dest);
            if (Number.isFinite(rate) && rate > 0) _appStateData.exchangeRate = rate;
        }
    } catch { /* keep last known rate */ }

    const profile = typeof getPppProfile === 'function' ? getPppProfile(dest) : null;
    if (profile?.multiplier != null) _appStateData.pppMultiplier = profile.multiplier;

    _appStateData.burnZone = mapBurnZoneFromRatio(getBurnZone(home, dest));
}

function ensureAppStateDefaults() {
    if (fromCurrency && !fromCurrency.value) fromCurrency.value = APP_STATE_DEFAULTS.homeCurrency;
    if (toCurrency && !toCurrency.value) toCurrency.value = APP_STATE_DEFAULTS.targetCurrency;

    if (typeof CityContext !== 'undefined' && !CityContext.get()) {
        const bangkok = HERO_HOTSPOTS.bangkok;
        CityContext.set(bangkok);
        if (toCurrency) toCurrency.value = bangkok.currency;
        const input = $('city-search');
        if (input) input.value = bangkok.label || bangkok.name;
        _appStateData.activeCity = bangkok.name;
        _appStateData.countryName = bangkok.country;
        _appStateData.countryCode = bangkok.country_code;
    }

    if (runwayBudgetInput && (!runwayBudgetInput.value || parseFloat(runwayBudgetInput.value) <= 0)) {
        runwayBudgetInput.value = String(APP_STATE_DEFAULTS.totalBudget);
    }

    if (typeof setTravelStyleTier === 'function') {
        setTravelStyleTier(_appStateData.travelStyle || APP_STATE_DEFAULTS.travelStyle);
    }

    syncAppStateFromUI();
    applyAmbientGlowClass(_appStateData.burnZone);
}

AppState.reset = function resetAppState() {
    Object.assign(_appStateData, APP_STATE_DEFAULTS);
    ensureAppStateDefaults();
};

function getBurnZone(homeCode, destCode) {
    const home = getPppProfile(homeCode);
    const dest = getPppProfile(destCode);
    if (!home || !dest) return 'moderate';
    const ratio = home.multiplier / dest.multiplier;
    if (ratio >= 1.12) return 'low';
    if (ratio >= 0.92) return 'moderate';
    return 'high';
}

function updateAmbientGlow(zone) {
    _appStateData.burnZone = mapBurnZoneFromRatio(zone || _appStateData.burnZone);
    applyAmbientGlowClass(_appStateData.burnZone);
}

function heroImageSeed(city) {
    const raw = city?.name || city?.label || AppState.activeCity || 'nomad-world';
    return String(raw).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'nomad-world';
}

function setHeroBackground(seed) {
    if (!heroDestinationBg) return;
    const safeSeed = encodeURIComponent(seed || 'nomad-world');
    const primary = `https://picsum.photos/seed/${safeSeed}/1200/400`;
    const fallback = 'https://picsum.photos/seed/nomad-world/1200/400';

    const apply = (url) => {
        heroDestinationBg.style.backgroundImage = `url('${url}')`;
        heroDestinationCard?.classList.add('hero-destination--loaded');
        heroDestinationCard?.classList.remove('hero-destination--default');
    };

    const img = new Image();
    img.onload = () => apply(primary);
    img.onerror = () => apply(fallback);
    img.src = primary;
}

function buildVibeBadges(destCode) {
    const profile = getPppProfile(destCode);
    if (!profile?.costs) return [];

    const badges = [
        { icon: '☕', label: typeof t === 'function' ? t('vibeCoffee') : 'Specialty Coffee' },
        { icon: '⚡', label: typeof t === 'function' ? t('vibeWifi') : 'Fast Wi-Fi' }
    ];

    const streetRatio = profile.costs.fast_meal / (profile.costs.sitdown_meal || 1);
    if (streetRatio < 0.4) {
        badges.push({ icon: '🍜', label: typeof t === 'function' ? t('vibeStreetFood') : 'Great Street Food' });
    } else if (profile.costs.day_pass_coworking) {
        badges.push({ icon: '💻', label: typeof t === 'function' ? t('vibeCowork') : 'Nomad Hub' });
    } else {
        badges.push({ icon: '🏙️', label: typeof t === 'function' ? t('vibeUrban') : 'Urban Explorer' });
    }

    return badges;
}

function renderHeroVibeBadges(destCode) {
    if (!heroVibeBadges) return;
    const badges = buildVibeBadges(destCode);
    if (!badges.length) {
        heroVibeBadges.innerHTML = '';
        return;
    }
    heroVibeBadges.innerHTML = badges.map((b, i) => {
        const floatClass = i % 2 === 0 ? 'float-slow' : 'float-medium';
        const delay = `float-delay-${(i % 4) + 1}`;
        return `<span class="hero-vibe-badge ${floatClass} ${delay}">${b.icon} ${b.label}</span>`;
    }).join('');
}

function formatHeroWeatherBadge(cityName) {
    const snap = lastWeatherSnapshot;
    const timeStr = weatherLocalTime?.textContent && weatherLocalTime.textContent !== '—'
        ? weatherLocalTime.textContent.slice(0, 5)
        : null;
    const icon = snap?.icon ? (WEATHER_HERO_ICONS[snap.icon] || '🌤️') : '🌤️';
    const temp = snap?.temp != null ? `${Math.round(snap.temp)}°C` : null;
    const place = cityName || snap?.city || '—';

    if (timeStr && temp) {
        return `${timeStr} • ${icon} ${temp} in ${place}`;
    }
    if (temp) {
        return `${icon} ${temp} in ${place}`;
    }
    if (timeStr) {
        return `${timeStr} in ${place}`;
    }
    return typeof t === 'function' ? t('heroWeatherPending')(place) : `Loading weather in ${place}…`;
}

function updateWelcomeEmptyState(city) {
    if (!welcomeEmptyState) return;
    welcomeEmptyState.hidden = Boolean(city?.name);
}

function refreshDashboardCardAnimations() {
    document.querySelectorAll('.finance-os-grid .glass-card, #nomad-runway-card:not([hidden])').forEach((card, i) => {
        card.classList.remove('fade-in-up');
        card.style.animationDelay = `${i * 80}ms`;
        void card.offsetWidth;
        card.classList.add('fade-in-up');
    });
}

function updateHeroDestinationCard() {
    if (!heroDestinationCard || !toCurrency || !fromCurrency) return;

    const city = typeof CityContext !== 'undefined' ? CityContext.get() : null;
    const destCode = toCurrency.value;
    const homeCode = fromCurrency.value;
    const cc = city?.country_code || CURRENCY_TO_COUNTRY[destCode] || '';
    const flag = typeof countryFlagEmoji === 'function' ? countryFlagEmoji(cc) : '';
    const greeting = getCountryGreeting(cc);

    syncAppStateFromUI(city);
    updateWelcomeEmptyState(city);

    const zone = getBurnZone(homeCode, destCode);
    updateAmbientGlow(zone);

    if (city?.name) {
        heroDestinationCard.classList.remove('hero-destination--default');
        if (heroGreeting) {
            heroGreeting.innerHTML = flag
                ? `${greeting.text} <span class="hero-flag float-slow float-delay-1" aria-hidden="true">${flag}</span>`
                : greeting.text;
        }
        if (heroCityName) {
            heroCityName.textContent = city.country
                ? `${city.name}, ${city.country}`
                : city.name;
        }
        setHeroBackground(heroImageSeed(city));
        renderHeroVibeBadges(destCode);
    } else {
        heroDestinationCard.classList.add('hero-destination--default');
        if (heroGreeting) {
            heroGreeting.textContent = typeof t === 'function' ? t('greetingDefault') : 'Welcome!';
        }
        if (heroCityName) {
            heroCityName.textContent = typeof t === 'function'
                ? t('welcomeEmptyTitle')
                : 'Ready for your next adventure?';
        }
        if (heroVibeBadges) heroVibeBadges.innerHTML = '';
        setHeroBackground('nomad-world');
    }

    if (heroWeatherBadge) {
        heroWeatherBadge.textContent = city?.name
            ? formatHeroWeatherBadge(city.name)
            : (typeof t === 'function' ? t('heroPickDestination') : 'Pick a destination to see local time & weather');
    }

    heroDestinationCard.classList.remove('fade-in-up');
    void heroDestinationCard.offsetWidth;
    heroDestinationCard.classList.add('fade-in-up');
}

function updateGreetingBanner() {
    updateHeroDestinationCard();
}

function initWelcomeHotspots() {
    document.querySelectorAll('.welcome-pill[data-hotspot]').forEach((btn) => {
        btn.addEventListener('click', () => {
            const spot = HERO_HOTSPOTS[btn.dataset.hotspot];
            if (!spot) return;
            const input = $('city-search');
            if (input) input.value = spot.label || spot.name;
            selectDestinationCity(spot);
        });
    });
}

function initTravelStyleSwitcher() {
    const activeTier = AppState.travelStyle;
    document.querySelectorAll('.travel-style-pill[data-tier]').forEach((pill) => {
        pill.classList.toggle('travel-style-pill--active', pill.dataset.tier === activeTier);
        pill.addEventListener('click', () => {
            const tier = pill.dataset.tier;
            if (!tier || typeof setTravelStyleTier !== 'function') return;
            setTravelStyleTier(tier);
            document.querySelectorAll('.travel-style-pill[data-tier]').forEach((p) => {
                p.classList.toggle('travel-style-pill--active', p.dataset.tier === tier);
            });
            updateConversion();
            if (typeof refreshVaultRunway === 'function') refreshVaultRunway();
        });
    });
}

function initPaymentCardToggle() {
    document.querySelectorAll('.payment-card-btn[data-card]').forEach((btn) => {
        btn.addEventListener('click', () => {
            paymentCardType = btn.dataset.card || 'travel';
            document.querySelectorAll('.payment-card-btn[data-card]').forEach((b) => {
                b.classList.toggle('payment-card-btn--active', b === btn);
            });
            updatePaymentOptimizer();
        });
    });
}

function updatePaymentOptimizer() {
    if (!paymentOptimizer || !fromAmount || !fromCurrency || !toCurrency) return;

    const amount = parseFloat(fromAmount.value) || 0;
    const from = fromCurrency.value;
    const to = toCurrency.value;

    if (amount <= 0 || !from || !to || from === to || typeof calcPaymentOptimizer !== 'function') {
        paymentOptimizer.hidden = true;
        return;
    }

    const result = calcPaymentOptimizer(amount, from, to, { cardType: paymentCardType });
    if (!result) {
        paymentOptimizer.hidden = true;
        return;
    }

    paymentOptimizer.hidden = false;
    animateAmountEl(payLocalAmount, result.payLocal, to);
    animateAmountEl(payDccAmount, result.dccHomeCharge, from);
    if (paySavingsAmount) {
        animateValue(
            paySavingsAmount,
            getLastAnimatedValue(paySavingsAmount, result.savingsHome),
            result.savingsHome,
            650,
            { formatter: (v) => `${formatAmount(v, from)} (~${result.savingsPct.toFixed(1)}%)` }
        );
    }

    const city = typeof CityContext !== 'undefined' ? CityContext.get() : null;
    const cityName = city?.name || getCountryDisplayName(to);
    if (paymentOptimizerAdvice && typeof t === 'function') {
        paymentOptimizerAdvice.textContent = t('paymentOptimizerAdvice')(cityName, to, paymentCardType);
    } else if (paymentOptimizerAdvice) {
        paymentOptimizerAdvice.textContent = `When paying in ${cityName}, choose ${to} on the terminal with a low-fee card.`;
    }

    if (paymentOptimizerTip && typeof t === 'function') {
        paymentOptimizerTip.textContent = paymentCardType === 'travel'
            ? t('paymentOptimizerTip')
            : t('paymentOptimizerTipStandard');
    }
}

function updateNomadRunway() {
    if (!nomadRunwayCard || !runwayDaysEl || !fromCurrency || !toCurrency) return;

    const funds = parseFloat(runwayBudgetInput?.value) || 0;
    const fundCur = runwayBudgetCurrency?.value || fromCurrency.value;
    const dest = toCurrency.value;
    const home = fromCurrency.value;
    const tier = typeof getTravelStyleTier === 'function' ? getTravelStyleTier() : 'nomad';

    if (!dest || !hasPppSupport(home, dest)) {
        nomadRunwayCard.hidden = true;
        if (financeOsGrid) financeOsGrid.hidden = true;
        return;
    }

    nomadRunwayCard.hidden = false;
    if (financeOsGrid) {
        financeOsGrid.hidden = false;
        refreshDashboardCardAnimations();
    }

    if (funds <= 0) {
        cancelElementAnimation(runwayDaysEl);
        setElementDisplay(runwayDaysEl, '—');
        if (runwayDetailEl) {
            runwayDetailEl.textContent = typeof t === 'function' ? t('runwayEnterBudget') : 'Enter a budget.';
        }
        if (runwayComparisonEl) runwayComparisonEl.textContent = '';
        if (runwayProgressWrap) runwayProgressWrap.hidden = true;
        return;
    }

    if (typeof calcBudgetRunwayDays !== 'function') return;

    const runway = calcBudgetRunwayDays(funds, fundCur, dest, home, tier);
    if (!runway) {
        cancelElementAnimation(runwayDaysEl);
        setElementDisplay(runwayDaysEl, '—');
        if (runwayDetailEl) {
            runwayDetailEl.textContent = typeof t === 'function' ? t('runwayUnavailable') : 'Unavailable.';
        }
        return;
    }

    animateIntegerEl(runwayDaysEl, runway.days, 600);
    if (runwayDetailEl) {
        const tierLabel = tier.charAt(0).toUpperCase() + tier.slice(1);
        animateValue(
            runwayDetailEl,
            getLastAnimatedValue(runwayDetailEl, runway.dailyDest),
            runway.dailyDest,
            650,
            {
                formatter: (v) => (typeof t === 'function'
                    ? t('runwayDetail')(runway.days, formatAmount(v, dest), dest, tierLabel)
                    : `${runway.days} days at ~${formatAmount(v, dest)}/day (${tier} mode)`)
            }
        );
    }

    if (typeof calcRunwayComparison === 'function' && runwayComparisonEl) {
        const cmp = calcRunwayComparison(funds, fundCur, dest, home, tier);
        if (cmp?.dest && cmp?.home) {
            const destCity = typeof CityContext !== 'undefined' && CityContext.get()?.name
                ? CityContext.get().name
                : getCountryDisplayName(dest);
            const homeName = getCountryDisplayName(home);
            runwayComparisonEl.textContent = typeof t === 'function'
                ? t('runwayComparison')(cmp.dest.days, destCity, cmp.home.days, homeName)
                : `Your budget lasts ${cmp.dest.days} days in ${destCity} vs ${cmp.home.days} days in ${homeName}.`;
        }
    }

    if (runwayProgressWrap && runwayProgressFill) {
        const maxDays = 365;
        const pct = Math.min(100, (runway.days / maxDays) * 100);
        runwayProgressWrap.hidden = false;
        animateBarWidth(runwayProgressFill, pct, 700);
        if (runwayProgressLabel) {
            animateValue(
                runwayProgressLabel,
                getLastAnimatedValue(runwayProgressLabel, runway.days),
                runway.days,
                600,
                {
                    formatter: (v) => (typeof t === 'function'
                        ? t('runwayProgressLabel')(Math.round(v), maxDays)
                        : `${Math.round(v)} / ${maxDays} days (1 year scale)`)
                }
            );
        }
        runwayProgressWrap.querySelector('[role="progressbar"]')?.setAttribute('aria-valuenow', String(Math.round(pct)));
    }
}

function initNomadRunway() {
    if (!runwayBudgetCurrency || !fromCurrency) return;
    const options = buildSelectOptions();
    runwayBudgetCurrency.innerHTML = options;
    runwayBudgetCurrency.value = fromCurrency.value || APP_STATE_DEFAULTS.homeCurrency;

    runwayBudgetInput?.addEventListener('input', updateNomadRunway);
    runwayBudgetCurrency?.addEventListener('change', updateNomadRunway);
}

function formatPowerGap(powerPct) {
    const abs = Math.abs(powerPct).toFixed(1);
    if (Math.abs(powerPct) < 1) return { text: t('pppGapParity'), className: 'flat' };
    if (powerPct > 0) return { text: `+${abs}%`, className: 'up' };
    return { text: `−${abs}%`, className: 'down' };
}

function isRainWeatherCode(code) {
    return (code >= 51 && code <= 67) || (code >= 80 && code <= 82) || code >= 95;
}

function isSnowWeatherCode(code) {
    return code >= 71 && code <= 77;
}

function classifyWeatherMode(temp, rainProb, weathercode) {
    const rainy = rainProb >= 50 || isRainWeatherCode(weathercode);
    const snowy = isSnowWeatherCode(weathercode);

    if (temp <= 0 || (snowy && temp < 5)) {
        return { mode: 'extreme-cold', icon: 'cold', iconClass: 'cold', alertType: 'cold' };
    }
    if (temp >= 35) {
        return { mode: 'extreme-heat', icon: 'sun', iconClass: 'sun', alertType: 'heat' };
    }
    if (rainy || temp < 10) {
        return { mode: 'shelter', icon: 'rain', iconClass: 'rain', alertType: null };
    }
    if (temp >= 18 && rainProb < 40) {
        return { mode: 'outdoor', icon: 'sun', iconClass: 'sun', alertType: null };
    }
    return { mode: 'cloud', icon: 'cloud', iconClass: 'cloud', alertType: null };
}

function setWeatherIcon(iconKey, iconClass) {
    if (!weatherIconWrap) return;
    weatherIconWrap.innerHTML = WEATHER_ICONS[iconKey] || WEATHER_ICONS.cloud;
    weatherIconWrap.className = 'destination-weather-card__icon-wrap float-slow';
    if (iconClass) weatherIconWrap.classList.add(`destination-weather-card__icon-wrap--${iconClass}`);
}

function formatTemp(celsius) {
    return `${Math.round(celsius)}°C`;
}

function calcPppEquivalentInFrom(localCost, from, to) {
    const fromP = getPppProfile(from);
    const toP = getPppProfile(to);
    if (!fromP || !toP || !canMarketConvert(from, to)) return null;
    const marketInFrom = converter.convert(localCost, to, from);
    return marketInFrom * (fromP.multiplier / toP.multiplier);
}

function calcOutdoorCost(profile) {
    const c = profile.costs;
    if (!c) return 0;
    return scaleCost(c.coffee * 0.55 + c.fast_meal * 0.35);
}

function calcShelterCost(profile) {
    const c = profile.costs;
    if (!c) return 0;
    return scaleCost(c.coffee + c.day_pass_coworking * 0.12 + c.sitdown_meal * 0.08);
}

function calcExtremeExtra(profile, type) {
    const c = profile.costs;
    if (!c) return 0;
    if (type === 'cold') return scaleCost(c.local_transport * 2.5);
    return scaleCost(c.local_transport * 1.5 + c.coffee);
}

function getWeatherModeLabel(mode) {
    const labels = {
        outdoor: t('weatherModeOutdoor'),
        shelter: t('weatherModeShelter'),
        cloud: t('weatherModeCloud'),
        'extreme-cold': t('weatherModeExtremeCold'),
        'extreme-heat': t('weatherModeExtremeHeat')
    };
    return labels[mode] || t('weatherModeCloud');
}

function buildWeatherSnapshot(apiData, cityMeta, from, to) {
    const current = apiData.current_weather;
    const daily = apiData.daily;
    const temp = current.temperature;
    const rainProb = daily?.precipitation_probability_max?.[0] ?? 0;
    const high = daily?.temperature_2m_max?.[0] ?? temp;
    const low = daily?.temperature_2m_min?.[0] ?? temp;
    const modeInfo = classifyWeatherMode(temp, rainProb, current.weathercode);
    const profile = getPppProfile(to);

    return {
        city: cityMeta.city,
        to,
        from,
        timezone: apiData.timezone,
        temp,
        high,
        low,
        rainProb,
        weathercode: current.weathercode,
        ...modeInfo,
        profile
    };
}

function renderWeatherAdvice(snapshot) {
    if (!weatherAdvice || !weatherModeBadge || !snapshot?.profile?.costs) return;

    const { mode, rainProb, alertType, from, to, profile } = snapshot;
    const outdoor = calcOutdoorCost(profile);
    const shelter = calcShelterCost(profile);
    const pppOutdoor = calcPppEquivalentInFrom(outdoor, from, to);
    const pppShelter = calcPppEquivalentInFrom(shelter, from, to);
    const localOutdoor = formatAmount(outdoor, to);
    const localShelter = formatAmount(shelter, to);
    const pppOutStr = pppOutdoor != null ? formatAmount(pppOutdoor, from) : '—';
    const pppShelStr = pppShelter != null ? formatAmount(pppShelter, from) : '—';

    weatherModeBadge.className = `weather-mode-badge weather-mode-badge--${mode === 'extreme-cold' || mode === 'extreme-heat' ? 'extreme' : mode}`;
    weatherModeBadge.textContent = getWeatherModeLabel(mode);

    if (mode === 'outdoor' || mode === 'extreme-heat') {
        weatherAdvice.textContent = t('weatherAdviceOutdoor')(localOutdoor, pppOutStr, from);
    } else if (mode === 'shelter' || mode === 'extreme-cold') {
        weatherAdvice.textContent = t('weatherAdviceShelter')(Math.round(rainProb), localShelter, pppShelStr, from);
    } else {
        weatherAdvice.textContent = t('weatherAdviceCloud')(localOutdoor, pppOutStr, from);
    }

    if (weatherAlert) {
        if (alertType === 'cold') {
            const extra = calcExtremeExtra(profile, 'cold');
            const extraPpp = calcPppEquivalentInFrom(extra, from, to);
            const extraStr = extraPpp != null ? formatAmount(extraPpp, from) : formatAmount(extra, to);
            weatherAlert.textContent = t('weatherAlertCold')(extraStr, to);
            weatherAlert.hidden = false;
        } else if (alertType === 'heat') {
            const extra = calcExtremeExtra(profile, 'heat');
            const extraPpp = calcPppEquivalentInFrom(extra, from, to);
            const extraStr = extraPpp != null ? formatAmount(extraPpp, from) : formatAmount(extra, to);
            weatherAlert.textContent = t('weatherAlertHeat')(extraStr, to);
            weatherAlert.hidden = false;
        } else {
            weatherAlert.hidden = true;
        }
    }
}

function renderWeatherCard(snapshot) {
    if (!weatherCard || !snapshot) return;

    lastWeatherSnapshot = snapshot;
    weatherCard.hidden = false;
    weatherCard.classList.remove('destination-weather-card--error', 'destination-weather-card--loading');
    if (weatherFallback) weatherFallback.hidden = true;
    if (weatherMetrics) {
        weatherMetrics.hidden = false;
        weatherMetrics.classList.remove('skeleton-card', 'skeleton-card--inline');
    }

    if (weatherCity) weatherCity.textContent = `${snapshot.city} · ${snapshot.to}`;
    if (weatherTemp) {
        animateValue(
            weatherTemp,
            getLastAnimatedValue(weatherTemp, snapshot.temp),
            snapshot.temp,
            500,
            { formatter: (v) => formatTemp(v) }
        );
    }
    if (weatherHigh) weatherHigh.textContent = formatTemp(snapshot.high);
    if (weatherLow) weatherLow.textContent = formatTemp(snapshot.low);
    if (weatherRain) weatherRain.textContent = `${Math.round(snapshot.rainProb)}%`;

    setWeatherIcon(snapshot.icon, snapshot.iconClass);
    startWeatherClock(snapshot.timezone);
    renderWeatherAdvice(snapshot);
    updateHeroDestinationCard();
}

function renderWeatherLoading(cityMeta, to) {
    if (!weatherCard) return;
    weatherCard.hidden = false;
    weatherCard.classList.remove('destination-weather-card--error');
    weatherCard.classList.add('destination-weather-card--loading');
    if (weatherFallback) weatherFallback.hidden = true;
    if (weatherMetrics) {
        weatherMetrics.hidden = false;
        weatherMetrics.classList.add('skeleton-card', 'skeleton-card--inline');
    }
    if (weatherCity) weatherCity.textContent = `${cityMeta.city} · ${to}`;
    if (weatherTemp) weatherTemp.innerHTML = '<span class="skeleton-line skeleton-line--short"></span>';
    if (weatherHigh) weatherHigh.textContent = '—';
    if (weatherLow) weatherLow.textContent = '—';
    if (weatherRain) weatherRain.textContent = '—';
    if (weatherModeBadge) {
        weatherModeBadge.className = 'weather-mode-badge weather-mode-badge--loading';
        weatherModeBadge.textContent = t('weatherLoading');
    }
    if (weatherAdvice) weatherAdvice.textContent = '';
    if (weatherAlert) weatherAlert.hidden = true;
    setWeatherIcon('cloud', 'cloud');
}

function renderWeatherOffline(cityMeta, to) {
    if (!weatherCard) return;
    weatherCard.hidden = false;
    weatherCard.classList.add('destination-weather-card--error');
    weatherCard.classList.remove('destination-weather-card--loading');
    if (weatherMetrics) {
        weatherMetrics.hidden = true;
        weatherMetrics.classList.remove('skeleton-card', 'skeleton-card--inline');
    }
    if (weatherCity) weatherCity.textContent = `${cityMeta.city} · ${to}`;
    if (weatherModeBadge) {
        weatherModeBadge.className = 'weather-mode-badge weather-mode-badge--offline';
        weatherModeBadge.textContent = t('weatherOffline');
    }
    if (weatherAdvice) weatherAdvice.textContent = '';
    if (weatherAlert) weatherAlert.hidden = true;
    stopWeatherClock();
    if (weatherLocalTime) weatherLocalTime.textContent = '—';
}

function updateWeatherLocalClock() {
    if (!weatherLocalTime || !weatherTimezone) return;
    try {
        weatherLocalTime.textContent = new Date().toLocaleTimeString(getLocale(), {
            timeZone: weatherTimezone,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    } catch {
        weatherLocalTime.textContent = '—';
    }
    if (heroWeatherBadge && lastWeatherSnapshot) {
        const city = typeof CityContext !== 'undefined' ? CityContext.get()?.name : null;
        if (city) heroWeatherBadge.textContent = formatHeroWeatherBadge(city);
    }
}

function startWeatherClock(timezone) {
    weatherTimezone = timezone;
    updateWeatherLocalClock();
    if (weatherClockTimer) clearInterval(weatherClockTimer);
    weatherClockTimer = setInterval(updateWeatherLocalClock, 1000);
}

function stopWeatherClock() {
    weatherTimezone = null;
    if (weatherClockTimer) {
        clearInterval(weatherClockTimer);
        weatherClockTimer = null;
    }
}

async function fetchDestinationWeather(cityMeta, from, to) {
    const cacheKey = `${cityMeta.lat},${cityMeta.lon}`;
    const now = Date.now();

    if (weatherCache.key === cacheKey && weatherCache.data && now - weatherCache.fetchedAt < WEATHER_CACHE_MS) {
        renderWeatherCard(buildWeatherSnapshot(weatherCache.data, cityMeta, from, to));
        return;
    }

    if (weatherAbort) weatherAbort.abort();
    weatherAbort = new AbortController();
    renderWeatherLoading(cityMeta, to);

    const params = new URLSearchParams({
        latitude: cityMeta.lat,
        longitude: cityMeta.lon,
        current_weather: 'true',
        daily: 'temperature_2m_max,temperature_2m_min,precipitation_probability_max',
        timezone: 'auto'
    });

    try {
        const response = typeof safeFetch === 'function'
            ? await safeFetch(`${WEATHER_API}?${params}`, { signal: weatherAbort.signal }, { context: 'weather' })
            : await fetch(`${WEATHER_API}?${params}`, { signal: weatherAbort.signal });
        if (!response.ok) throw new Error('Weather unavailable');
        const data = await response.json();
        if (!data.current_weather) throw new Error('Invalid weather payload');

        weatherCache = { key: cacheKey, data, fetchedAt: now };
        renderWeatherCard(buildWeatherSnapshot(data, cityMeta, from, to));
    } catch (err) {
        if (err.name === 'AbortError') return;
        renderWeatherOffline(cityMeta, to);
    }
}

function updateDestinationWeather() {
    if (!weatherCard || !fromCurrency || !toCurrency) return;

    const from = fromCurrency.value;
    const to = toCurrency.value;
    const cityMeta = typeof CityContext !== 'undefined' ? CityContext.toMeta() : null;

    if (!to || !cityMeta || !hasPppSupport(from, to)) {
        weatherCard.hidden = true;
        stopWeatherClock();
        return;
    }

    fetchDestinationWeather(cityMeta, from, to);
}

function initDestinationCitySearch() {
    const input = $('city-search');
    const list = $('citySearchResults');
    if (!input || !list || typeof initCitySearch !== 'function') return;

    initCitySearch({
        inputEl: input,
        listEl: list,
        debounceMs: 300,
        onSelect(city) {
            selectDestinationCity(city);
        },
        onClear() {
            updateDestinationWeather();
        }
    });

    bind(toCurrency, 'change', () => {
        const ctx = CityContext.get();
        if (ctx?.currency && toCurrency && ctx.currency !== toCurrency.value) {
            CityContext.clear();
            input.value = '';
        }
    });

    const saved = CityContext.get();
    if (saved) {
        input.value = saved.label || saved.name;
        if (saved.currency) {
            applyCityToCurrencySelect(saved, toCurrency);
        }
        updateSmartConverter();
    }
}

/** Apply city selection: currency, weather, PPP, survival, vault */
function selectDestinationCity(city) {
    if (!city || !toCurrency) return;
    try {
        if (typeof CityContext !== 'undefined') {
            CityContext.set(city);
        }
        if (city.currency) {
            applyCityToCurrencySelect(city, toCurrency);
        }
        updateSmartConverter();
        syncAppStateFromUI(city);
        if (typeof Toast !== 'undefined' && Toast.info) {
            const msg = typeof t === 'function'
                ? t('toastCitySynced')(city.name, city.currency || toCurrency.value)
                : `Synced: ${city.name} · ${city.currency || toCurrency.value}`;
            Toast.info(msg);
        }
    } catch {
        /* never crash on city pick */
    }
}

function updateSmartConverter() {
    updateConversion();
}

function startWeatherRefresh() {
    if (weatherRefreshTimer) clearInterval(weatherRefreshTimer);
    weatherRefreshTimer = setInterval(updateDestinationWeather, WEATHER_REFRESH_MS);
}

function resetPppPanel(to = '') {
    if (!pppNominal) return;
    [pppNominal, pppRealValue, pppGap].forEach((el) => el && cancelElementAnimation(el));
    pppNominal.textContent = '—';
    if (pppRealValue) pppRealValue.textContent = '—';
    if (pppRealHint) pppRealHint.textContent = t('pppRealHintDefault');
    if (pppGap) {
        pppGap.textContent = '—';
        pppGap.className = 'ppp-hero-stat__value ppp-hero-stat__value--gap';
    }
    if (pppGapHint) pppGapHint.textContent = t('pppPowerHint');
    if (pppBarNominal) pppBarNominal.style.width = '0%';
    if (pppBarPpp) pppBarPpp.style.width = '0%';
    if (pppInsight) pppInsight.textContent = '';
    if (pppDestLabel) pppDestLabel.textContent = to || '—';
    if (pppDestCountry) pppDestCountry.textContent = '';
    if (pppRatingBadge) pppRatingBadge.hidden = true;
    if (pppUnitGrid) {
        pppUnitGrid.querySelectorAll('[data-ppp-count]').forEach((el) => { el.textContent = '—'; });
    }
}

function updatePurchasingPower() {
    if (!pppPanel || !pppFallback || !fromAmount || !fromCurrency || !toCurrency) return;

    const amount = parseFloat(fromAmount.value) || 0;
    const from = fromCurrency.value;
    const to = toCurrency.value;
    const supported = hasPppSupport(from, to);

    pppFallback.hidden = supported;
    pppPanel.hidden = !supported;

    if (!supported || !from || !to) {
        resetPppPanel();
        return;
    }

    if (pppDestLabel) pppDestLabel.textContent = to;
    const city = typeof CityContext !== 'undefined' ? CityContext.get() : null;
    if (pppDestCountry) pppDestCountry.textContent = city
        ? `${city.name}, ${city.country}`
        : getCountryDisplayName(to);
    renderExamplePrices(to);

    if (amount <= 0) {
        resetPppPanel(to);
        if (pppDestCountry) pppDestCountry.textContent = getCountryDisplayName(to);
        if (pppInsight) pppInsight.textContent = t('pppEnterAmount');
        return;
    }

    const metrics = calcPppMetrics(amount, from, to);
    if (!metrics) return;

    const { nominal, realLifestyle, pppLocal, powerPct, units, toProfile, hasMarket } = metrics;
    const gap = formatPowerGap(powerPct);
    const rating = getNomadRating(metrics.powerRatio);

    if (pppNominal) {
        if (hasMarket) animateAmountEl(pppNominal, nominal, to);
        else pppNominal.textContent = t('pppLoading');
    }
    if (pppRealValue) animateAmountEl(pppRealValue, realLifestyle, from);
    if (pppRealHint) pppRealHint.textContent = t('pppRealHint')(formatAmount(realLifestyle, from), from);
    if (pppGap) {
        animateValue(
            pppGap,
            getLastAnimatedValue(pppGap, powerPct),
            powerPct,
            500,
            {
                formatter: (v) => {
                    if (Math.abs(v) < 1) return t('pppGapParity');
                    const abs = Math.abs(v).toFixed(1);
                    return v > 0 ? `+${abs}%` : `−${abs}%`;
                }
            }
        );
        pppGap.className = `ppp-hero-stat__value ppp-hero-stat__value--gap ppp-hero-stat__value--${gap.className}`;
    }
    if (pppGapHint) pppGapHint.textContent = powerPct > 0 ? t('pppGapStretch') : powerPct < 0 ? t('pppGapLower') : t('pppGapNear');

    if (hasMarket && pppLocal != null) {
        const maxBar = Math.max(nominal, pppLocal, 1);
        if (pppBarNominal) pppBarNominal.style.width = `${(nominal / maxBar) * 100}%`;
        if (pppBarPpp) pppBarPpp.style.width = `${(pppLocal / maxBar) * 100}%`;
    } else {
        if (pppBarNominal) pppBarNominal.style.width = '0%';
        if (pppBarPpp) pppBarPpp.style.width = '0%';
    }

    if (pppInsight) pppInsight.textContent = buildInsightText(amount, from, to, metrics);

    if (pppRatingBadge) {
        pppRatingBadge.hidden = false;
        pppRatingBadge.textContent = `${rating.emoji} ${rating.label}`;
        pppRatingBadge.className = `ppp-rating-badge ppp-rating-badge--${rating.tier}`;
    }

    if (pppUnitGrid) {
        pppUnitGrid.querySelectorAll('.ppp-unit').forEach((card) => {
            const unitKey = card.dataset.unit;
            const countEl = card.querySelector('[data-ppp-count]');
            if (!countEl) return;
            if (hasMarket && units[unitKey] != null) {
                animateValue(
                    countEl,
                    getLastAnimatedValue(countEl, units[unitKey]),
                    units[unitKey],
                    550,
                    { formatter: (v) => formatUnitCount(v, unitKey) }
                );
            } else {
                countEl.textContent = t('pppLoadingRates');
            }
        });
    }
}

function updateConversion() {
    if (!fromAmount || !toAmount || !fromCurrency || !toCurrency) return;

    const amount = parseFloat(fromAmount.value) || 0;
    const from = fromCurrency.value;
    const to = toCurrency.value;

    if (!from || !to) {
        if (toAmount) setElementDisplay(toAmount, '—');
        if (rateDisplay) rateDisplay.textContent = t('selectCurrency');
        updatePurchasingPower();
        return;
    }

    try {
        const result = converter.convert(amount, from, to);
        animateAmountEl(toAmount, result, to, 550);

        const rate = converter.getRate(from, to);
        animateRateEl(rateDisplay, from, to, rate, 600);
    } catch {
        if (toAmount) setElementDisplay(toAmount, '—');
        if (rateDisplay) rateDisplay.textContent = t('invalidPair');
    }

    updatePurchasingPower();
    updateDestinationWeather();
    updatePaymentOptimizer();
    updateNomadRunway();
    updateGreetingBanner();
    if (typeof updateFxWatchdog === 'function') updateFxWatchdog();
    if (typeof updateVatRefundCalculator === 'function') updateVatRefundCalculator();
    if (typeof updateSurvival === 'function') updateSurvival();
    if (typeof refreshVaultRunway === 'function') refreshVaultRunway();
    syncAppStateFromUI();
}

function formatRate(value, code) {
    const decimals = ZERO_DECIMAL_CURRENCIES.has(code) ? 2 : 4;
    return value.toLocaleString(undefined, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
    });
}

function calcWeeklyChange(current, previous) {
    if (!previous || !current) return null;
    return ((current - previous) / previous) * 100;
}

function formatChange(pct) {
    if (pct == null) return { text: '—', className: 'flat' };
    const abs = Math.abs(pct).toFixed(2);
    if (Math.abs(pct) < 0.005) return { text: '0.00%', className: 'flat' };
    const arrow = pct > 0 ? '▲' : '▼';
    return { text: `${arrow} ${abs}%`, className: pct > 0 ? 'up' : 'down' };
}

async function fetchWeeklyRates() {
    const date = new Date();
    date.setDate(date.getDate() - 7);
    const dateStr = date.toISOString().slice(0, 10);

    const result = typeof fetchHistoricalFxRates === 'function'
        ? await fetchHistoricalFxRates(dateStr, STATS_CURRENCIES, { silent: true })
        : { rates: getMergedFallbackRates?.() ?? FALLBACK_RATES ?? {} };

    weeklyRates = result.rates ?? {};
}

function renderStats() {
    if (!statsList) return;

    const rows = STATS_CURRENCIES.map((code) => {
        const currency = currencyMap[code];
        const rate = converter.rates[code];
        if (!currency || rate == null) return null;

        const change = calcWeeklyChange(rate, weeklyRates[code]);
        return { code, currency, rate, change };
    }).filter(Boolean);

    const withChange = rows.filter((r) => r.change != null);
    if (withChange.length) {
        const sorted = [...withChange].sort((a, b) => b.change - a.change);
        if (statStrongest) statStrongest.textContent = sorted[0].code;
        if (statWeakest) statWeakest.textContent = sorted[sorted.length - 1].code;
    } else {
        if (statStrongest) statStrongest.textContent = '—';
        if (statWeakest) statWeakest.textContent = '—';
    }

    if (statCount) statCount.textContent = Object.keys(converter.rates).length;

    statsList.innerHTML = rows.map(({ code, currency, rate, change }) => {
        const { text, className } = formatChange(change);
        return `
            <button type="button" class="stat-row" data-code="${code}">
                <div class="stat-row__info">
                    <span class="stat-row__badge">${code}</span>
                    <div>
                        <div class="stat-row__name">${currency.name}</div>
                        <div class="stat-row__code">1 USD</div>
                    </div>
                </div>
                <span class="stat-row__rate">${formatRate(rate, code)}</span>
                <span class="stat-row__change stat-row__change--${className}">${text}</span>
            </button>
        `;
    }).join('');

    statsList.querySelectorAll('.stat-row').forEach((row) => {
        row.addEventListener('click', () => {
            if (fromCurrency) fromCurrency.value = 'USD';
            if (toCurrency) toCurrency.value = row.dataset.code;
            if (currencySearch) currencySearch.value = '';
            populateSelects();
            updateConversion();
            document.querySelector('.converter-card')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
    });
}

async function fetchLiveRates() {
    setBadgeState('loading', t('badgeUpdating'));
    if (statsList) statsList.classList.add('stats-list--loading');

    try {
        const [fxResult] = await Promise.all([
            fetchLiveFxRatesWithFallback('USD', { silent: true }),
            fetchWeeklyRates()
        ]);

        const liveRates = {};
        for (const code of CURRENCY_CODES) {
            if (code !== 'USD' && fxResult.rates[code] != null) {
                liveRates[code] = fxResult.rates[code];
            }
        }

        converter.updateRates(liveRates);
        updateConversion();
        renderStats();
        flashLiveUpdate();

        if (fxResult.source === 'fallback') {
            setBadgeState('error', t('badgeOffline'));
            if (lastUpdated) lastUpdated.textContent = t('fallbackRates');
            if (statsUpdated) statsUpdated.textContent = t('badgeOffline');
        } else {
            if (fxResult.time) lastRateUpdate = new Date(fxResult.time);
            else lastRateUpdate = new Date();
            updateTimestamps();
            setBadgeState('live', t('badgeLive'));
        }
    } catch (err) {
        console.warn('FX fetch failed; applying offline fallback rates:', err);
        const merged = typeof getMergedFallbackRates === 'function'
            ? getMergedFallbackRates()
            : { USD: 1, ...FALLBACK_RATES };
        const liveRates = {};
        for (const code of CURRENCY_CODES) {
            if (code !== 'USD' && merged[code] != null) liveRates[code] = merged[code];
        }
        converter.updateRates(liveRates);
        updateConversion();
        renderStats();
        setBadgeState('error', t('badgeOffline'));
        if (lastUpdated) lastUpdated.textContent = t('fallbackRates');
        if (statsUpdated) statsUpdated.textContent = t('badgeOffline');
    } finally {
        statsList?.classList.remove('stats-list--loading');
    }
}

function swapCurrencies() {
    if (!fromCurrency || !toCurrency) return;
    const tempCurrency = fromCurrency.value;
    fromCurrency.value = toCurrency.value;
    toCurrency.value = tempCurrency;
    updateConversion();
}

function onLanguageChange() {
    refreshCityContextForLanguage();
    populateSelects(currencySearch.value);
    if (runwayBudgetCurrency) {
        const val = runwayBudgetCurrency.value;
        runwayBudgetCurrency.innerHTML = buildSelectOptions();
        if (val) runwayBudgetCurrency.value = val;
    }
    if (typeof refreshVaultRunway === 'function') refreshVaultRunway();
    updateConversion();
    updateTimestamps();
    if (lastWeatherSnapshot) {
        lastWeatherSnapshot.from = fromCurrency.value;
        renderWeatherAdvice(lastWeatherSnapshot);
        if (weatherModeBadge && lastWeatherSnapshot.mode) {
            weatherModeBadge.textContent = getWeatherModeLabel(lastWeatherSnapshot.mode);
        }
    }
    if (rateBadge) {
        if (rateBadge.classList.contains('rate-badge--live')) {
            setBadgeState('live', t('badgeLive'));
        } else if (rateBadge.classList.contains('rate-badge--error')) {
            setBadgeState('error', t('badgeOffline'));
        }
    }
    renderStats();

    const authBtn = $('auth-open-btn');
    if (authBtn && !authBtn.classList.contains('auth-btn--logged-in')) {
        authBtn.textContent = t('authSignIn');
    }
    const guestHint = $('auth-guest-hint');
    if (guestHint && !guestHint.hidden) guestHint.textContent = t('vaultGuestHint');
}

function initDashboardPage() {
    if (!fromAmount || !fromCurrency || !toCurrency) return;

    initLanguagePicker();
    applyStaticTranslations();
    populateSelects();
    ensureAppStateDefaults();
    updateTimestamps();
    updateConversion();
    fetchLiveRates();
    startLiveRefresh();
    startLiveClock();
    startWeatherRefresh();
    if (typeof initAuthModal === 'function') initAuthModal();
    if (typeof initVaultUI === 'function') initVaultUI();
    initDestinationCitySearch();
    initTravelStyleSwitcher();
    initPaymentCardToggle();
    initNomadRunway();
    initWelcomeHotspots();
    updateHeroDestinationCard();
    if (typeof initFxWatchdog === 'function') initFxWatchdog();
    if (typeof initVatRefundCalculator === 'function') initVatRefundCalculator();
    refreshCityContextForLanguage();
    updateGreetingBanner();

    if (typeof CityContext !== 'undefined') {
        CityContext.onChange((city) => {
            if (!city) {
                updateWelcomeEmptyState(null);
                updateHeroDestinationCard();
                return;
            }
            const input = $('city-search');
            if (input && document.activeElement !== input) {
                input.value = city.label || city.name;
            }
            updateHeroDestinationCard();
        });
    }

    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            fetchLiveRates();
            updateDestinationWeather();
        }
    });

    bind(currencySearch, 'input', () => {
        populateSelects(currencySearch?.value || '');
    });
    bind(fromAmount, 'input', updateConversion);
    bind(fromCurrency, 'change', updateConversion);
    bind(toCurrency, 'change', updateConversion);
    bind(swapBtn, 'click', swapCurrencies);

    document.querySelectorAll('.quick-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
            if (fromAmount) fromAmount.value = btn.dataset.amount || '';
            updateConversion();
        });
    });
}

initDashboardPage();

window.NomadOSApp = {
    converter,
    getPppProfile,
    calcNomadRunway,
    formatAmount,
    canMarketConvert,
    fetchLiveRates,
    fromCurrency,
    toCurrency,
    updateConversion,
    updateSmartConverter,
    selectDestinationCity,
    fetchCitySuggestions,
    AppState,
    APP_STATE_DEFAULTS,
    syncAppStateFromUI,
    ensureAppStateDefaults,
    updateHeroDestinationCard,
    animateValue,
    animateAmountEl,
    animateIntegerEl,
    animateRateEl,
    animateBarWidth,
    getLastAnimatedValue
};

// Expose for browser console diagnostics & testing:
if (typeof window !== 'undefined') {
    window.AppState = AppState;
}
