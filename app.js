const REFRESH_INTERVAL_MS = 15_000;
const HISTORY_API = 'https://api.frankfurter.app';
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

    const input = document.getElementById('city-search');
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
        toCurrency.value = 'NOK';
    }
}

function setBadgeState(state, text) {
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
    lastUpdated.textContent = text;
    if (lastRateUpdate) {
        statsUpdated.textContent = lastRateUpdate.toLocaleTimeString(getLocale());
    }
}

function flashLiveUpdate() {
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

function updateGreetingBanner() {
    if (!greetingBanner || !greetingText) return;

    const city = typeof CityContext !== 'undefined' ? CityContext.get() : null;
    const destCode = toCurrency?.value;
    const cc = city?.country_code || CURRENCY_TO_COUNTRY[destCode] || '';
    const flag = typeof countryFlagEmoji === 'function' ? countryFlagEmoji(cc) : '';
    const greeting = getCountryGreeting(cc);

    greetingText.textContent = `${greeting.text}${flag ? ` ${flag}` : ''}`;
    if (greetingSub) {
        if (city?.name) {
            greetingSub.textContent = typeof t === 'function'
                ? t('greetingCity')(city.name, city.country || '')
                : `${city.name}, ${city.country || ''}`;
        } else if (greeting.subKey) {
            greetingSub.textContent = typeof t === 'function' ? t(greeting.subKey) : '';
        } else {
            greetingSub.textContent = typeof t === 'function' ? t('greetingDefaultSub') : '';
        }
    }

    greetingBanner.hidden = false;
    greetingBanner.classList.remove('fade-in-up');
    void greetingBanner.offsetWidth;
    greetingBanner.classList.add('fade-in-up');
}

function initTravelStyleSwitcher() {
    document.querySelectorAll('.travel-style-pill[data-tier]').forEach((pill) => {
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
    if (!paymentOptimizer) return;

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
    if (payLocalAmount) payLocalAmount.textContent = formatAmount(result.payLocal, to);
    if (payDccAmount) payDccAmount.textContent = formatAmount(result.dccHomeCharge, from);
    if (paySavingsAmount) {
        paySavingsAmount.textContent = `${formatAmount(result.savingsHome, from)} (~${result.savingsPct.toFixed(1)}%)`;
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
    if (!nomadRunwayCard || !runwayDaysEl) return;

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
    if (financeOsGrid) financeOsGrid.hidden = false;

    if (funds <= 0) {
        runwayDaysEl.textContent = '—';
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
        runwayDaysEl.textContent = '—';
        if (runwayDetailEl) {
            runwayDetailEl.textContent = typeof t === 'function' ? t('runwayUnavailable') : 'Unavailable.';
        }
        return;
    }

    runwayDaysEl.textContent = String(runway.days);
    if (runwayDetailEl) {
        const dailyStr = formatAmount(runway.dailyDest, dest);
        const tierLabel = tier.charAt(0).toUpperCase() + tier.slice(1);
        runwayDetailEl.textContent = typeof t === 'function'
            ? t('runwayDetail')(runway.days, dailyStr, dest, tierLabel)
            : `${runway.days} days at ~${dailyStr}/day (${tier} mode)`;
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
        runwayProgressFill.style.width = `${pct}%`;
        if (runwayProgressLabel) {
            runwayProgressLabel.textContent = typeof t === 'function'
                ? t('runwayProgressLabel')(runway.days, maxDays)
                : `${runway.days} / ${maxDays} days (1 year scale)`;
        }
        runwayProgressWrap.querySelector('[role="progressbar"]')?.setAttribute('aria-valuenow', String(Math.round(pct)));
    }
}

function initNomadRunway() {
    if (!runwayBudgetCurrency) return;
    const options = buildSelectOptions();
    runwayBudgetCurrency.innerHTML = options;
    runwayBudgetCurrency.value = fromCurrency.value || 'NOK';

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
    weatherIconWrap.className = 'destination-weather-card__icon-wrap';
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
    if (weatherTemp) weatherTemp.textContent = formatTemp(snapshot.temp);
    if (weatherHigh) weatherHigh.textContent = formatTemp(snapshot.high);
    if (weatherLow) weatherLow.textContent = formatTemp(snapshot.low);
    if (weatherRain) weatherRain.textContent = `${Math.round(snapshot.rainProb)}%`;

    setWeatherIcon(snapshot.icon, snapshot.iconClass);
    startWeatherClock(snapshot.timezone);
    renderWeatherAdvice(snapshot);
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
    if (!weatherCard) return;

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
    const input = document.getElementById('city-search');
    const list = document.getElementById('citySearchResults');
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

    toCurrency.addEventListener('change', () => {
        const ctx = CityContext.get();
        if (ctx?.currency && ctx.currency !== toCurrency.value) {
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
    if (!city) return;
    try {
        if (city.currency) {
            applyCityToCurrencySelect(city, toCurrency);
        }
        updateSmartConverter();
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
    pppNominal.textContent = '—';
    pppRealValue.textContent = '—';
    pppRealHint.textContent = t('pppRealHintDefault');
    pppGap.textContent = '—';
    pppGap.className = 'ppp-hero-stat__value ppp-hero-stat__value--gap';
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
    if (!pppPanel || !pppFallback) return;

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

    pppDestLabel.textContent = to;
    const city = typeof CityContext !== 'undefined' ? CityContext.get() : null;
    pppDestCountry.textContent = city
        ? `${city.name}, ${city.country}`
        : getCountryDisplayName(to);
    renderExamplePrices(to);

    if (amount <= 0) {
        resetPppPanel(to);
        pppDestCountry.textContent = getCountryDisplayName(to);
        pppInsight.textContent = t('pppEnterAmount');
        return;
    }

    const metrics = calcPppMetrics(amount, from, to);
    if (!metrics) return;

    const { nominal, realLifestyle, pppLocal, powerPct, units, toProfile, hasMarket } = metrics;
    const gap = formatPowerGap(powerPct);
    const rating = getNomadRating(metrics.powerRatio);

    pppNominal.textContent = hasMarket ? formatAmount(nominal, to) : t('pppLoading');
    pppRealValue.textContent = formatAmount(realLifestyle, from);
    pppRealHint.textContent = t('pppRealHint')(formatAmount(realLifestyle, from), from);
    pppGap.textContent = gap.text;
    pppGap.className = `ppp-hero-stat__value ppp-hero-stat__value--gap ppp-hero-stat__value--${gap.className}`;
    pppGapHint.textContent = powerPct > 0 ? t('pppGapStretch') : powerPct < 0 ? t('pppGapLower') : t('pppGapNear');

    if (hasMarket && pppLocal != null) {
        const maxBar = Math.max(nominal, pppLocal, 1);
        pppBarNominal.style.width = `${(nominal / maxBar) * 100}%`;
        pppBarPpp.style.width = `${(pppLocal / maxBar) * 100}%`;
    } else {
        pppBarNominal.style.width = '0%';
        pppBarPpp.style.width = '0%';
    }

    pppInsight.textContent = buildInsightText(amount, from, to, metrics);

    pppRatingBadge.hidden = false;
    pppRatingBadge.textContent = `${rating.emoji} ${rating.label}`;
    pppRatingBadge.className = `ppp-rating-badge ppp-rating-badge--${rating.tier}`;

    if (pppUnitGrid) {
        pppUnitGrid.querySelectorAll('.ppp-unit').forEach((card) => {
            const unitKey = card.dataset.unit;
            const countEl = card.querySelector('[data-ppp-count]');
            if (!countEl) return;
            if (hasMarket && units[unitKey] != null) {
                countEl.textContent = formatUnitCount(units[unitKey], unitKey);
            } else {
                countEl.textContent = t('pppLoadingRates');
            }
        });
    }
}

function updateConversion() {
    const amount = parseFloat(fromAmount.value) || 0;
    const from = fromCurrency.value;
    const to = toCurrency.value;

    if (!from || !to) {
        toAmount.value = '—';
        rateDisplay.textContent = t('selectCurrency');
        updatePurchasingPower();
        return;
    }

    try {
        const result = converter.convert(amount, from, to);
        toAmount.value = formatAmount(result, to);

        const rate = converter.getRate(from, to);
        const rateDecimals = Math.max(currencyMap[from]?.decimals ?? 2, 4);
        rateDisplay.textContent = `1 ${from} = ${rate.toFixed(rateDecimals)} ${to}`;
    } catch {
        toAmount.value = '—';
        rateDisplay.textContent = t('invalidPair');
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
    const codes = STATS_CURRENCIES.join(',');

    try {
        const response = await fetch(`${HISTORY_API}/${dateStr}?from=USD&to=${codes}`);
        if (!response.ok) throw new Error('History unavailable');
        const data = await response.json();
        weeklyRates = data.rates ?? {};
    } catch {
        weeklyRates = {};
    }
}

function renderStats() {
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
        statStrongest.textContent = sorted[0].code;
        statWeakest.textContent = sorted[sorted.length - 1].code;
    } else {
        statStrongest.textContent = '—';
        statWeakest.textContent = '—';
    }

    statCount.textContent = Object.keys(converter.rates).length;

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
            fromCurrency.value = 'USD';
            toCurrency.value = row.dataset.code;
            currencySearch.value = '';
            populateSelects();
            updateConversion();
            document.querySelector('.converter-card').scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
    });
}

async function fetchLiveRates() {
    setBadgeState('loading', t('badgeUpdating'));
    if (statsList) statsList.classList.add('stats-list--loading');

    try {
        const liveResponse = typeof safeFetch === 'function'
            ? await safeFetch(RATES_API, {}, { context: 'fx' })
            : await fetch(RATES_API);
        await fetchWeeklyRates();

        if (!liveResponse.ok) throw new Error('Network error');

        const data = await liveResponse.json();
        if (data.result !== 'success') throw new Error('API error');

        const liveRates = {};
        for (const code of CURRENCY_CODES) {
            if (code !== 'USD' && data.rates[code] != null) {
                liveRates[code] = data.rates[code];
            }
        }

        converter.updateRates(liveRates);
        updateConversion();
        renderStats();
        flashLiveUpdate();

        lastRateUpdate = new Date(data.time_last_update_utc);
        updateTimestamps();
        setBadgeState('live', t('badgeLive'));
    } catch (err) {
        if (err?.message !== 'offline' && !err?.message?.startsWith('HTTP')) {
            /* safeFetch already toasted for HTTP/offline */
        }
        setBadgeState('error', t('badgeOffline'));
        lastUpdated.textContent = t('fallbackRates');
        statsUpdated.textContent = t('badgeOffline');
        renderStats();
    } finally {
        statsList?.classList.remove('stats-list--loading');
    }
}

function swapCurrencies() {
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
    if (rateBadge.classList.contains('rate-badge--live')) {
        setBadgeState('live', t('badgeLive'));
    } else if (rateBadge.classList.contains('rate-badge--error')) {
        setBadgeState('error', t('badgeOffline'));
    }
    renderStats();

    const authBtn = document.getElementById('auth-open-btn');
    if (authBtn && !authBtn.classList.contains('auth-btn--logged-in')) {
        authBtn.textContent = t('authSignIn');
    }
    const guestHint = document.getElementById('auth-guest-hint');
    if (guestHint && !guestHint.hidden) guestHint.textContent = t('vaultGuestHint');
    if (typeof updateThemeToggleUI === 'function') updateThemeToggleUI();
}

initLanguagePicker();
applyStaticTranslations();
initThemeToggle();
populateSelects();
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
if (typeof initFxWatchdog === 'function') initFxWatchdog();
if (typeof initVatRefundCalculator === 'function') initVatRefundCalculator();
refreshCityContextForLanguage();
updateGreetingBanner();

if (typeof CityContext !== 'undefined') {
    CityContext.onChange((city) => {
        if (!city) return;
        const input = document.getElementById('city-search');
        if (input && document.activeElement !== input) {
            input.value = city.label || city.name;
        }
    });
}

document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
        fetchLiveRates();
        updateDestinationWeather();
    }
});

currencySearch.addEventListener('input', () => {
    populateSelects(currencySearch.value);
});

fromAmount.addEventListener('input', updateConversion);
fromCurrency.addEventListener('change', updateConversion);
toCurrency.addEventListener('change', updateConversion);
swapBtn.addEventListener('click', swapCurrencies);

document.querySelectorAll('.quick-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
        fromAmount.value = btn.dataset.amount;
        updateConversion();
    });
});

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
    fetchCitySuggestions
};
