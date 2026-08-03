/** Global city geocoding — Open-Meteo search + reverse + country→currency */
const GEOCODING_SEARCH_API = 'https://geocoding-api.open-meteo.com/v1/search';
const GEOCODING_REVERSE_API = 'https://geocoding-api.open-meteo.com/v1/reverse';
const CITY_STORAGE_KEY = 'konverter-selected-city';

const EURO_ZONE = new Set([
    'AT', 'BE', 'HR', 'CY', 'EE', 'FI', 'FR', 'DE', 'GR', 'IE', 'IT', 'LV', 'LT', 'LU',
    'MT', 'NL', 'PT', 'SK', 'SI', 'ES', 'AD', 'MC', 'SM', 'VA', 'XK', 'ME'
]);

/** ISO 3166-1 alpha-2 → primary currency code */
const COUNTRY_TO_CURRENCY = {
    US: 'USD', EC: 'USD', SV: 'USD', PA: 'USD', TL: 'USD', ZW: 'USD',
    GB: 'GBP', GG: 'GBP', IM: 'GBP', JE: 'GBP',
    NO: 'NOK', SJ: 'NOK',
    SE: 'SEK', DK: 'DKK', IS: 'ISK', CH: 'CHF', LI: 'CHF',
    PL: 'PLN', CZ: 'CZK', HU: 'HUF', RO: 'RON', BG: 'BGN', RS: 'RSD',
    BA: 'BAM', MK: 'MKD', AL: 'ALL', UA: 'UAH', BY: 'BYN', MD: 'MDL',
    RU: 'RUB', TR: 'TRY', GE: 'GEL', AM: 'AMD', AZ: 'AZN', KZ: 'KZT',
    UZ: 'UZS', KG: 'KGS', TJ: 'TJS', TM: 'TMT',
    JP: 'JPY', CN: 'CNY', HK: 'HKD', MO: 'MOP', TW: 'TWD', KR: 'KRW',
    KP: 'KPW', MN: 'MNT', TH: 'THB', VN: 'VND', LA: 'LAK', KH: 'KHR',
    MM: 'MMK', MY: 'MYR', SG: 'SGD', ID: 'IDR', PH: 'PHP', BN: 'BND',
    IN: 'INR', PK: 'PKR', BD: 'BDT', LK: 'LKR', NP: 'NPR', BT: 'BTN',
    MV: 'MVR', AF: 'AFN',
    AE: 'AED', SA: 'SAR', QA: 'QAR', KW: 'KWD', BH: 'BHD', OM: 'OMR',
    YE: 'YER', IQ: 'IQD', IR: 'IRR', IL: 'ILS', JO: 'JOD', LB: 'LBP',
    PS: 'ILS', SY: 'SYP',
    AU: 'AUD', NZ: 'NZD', FJ: 'FJD', PG: 'PGK', SB: 'SBD', VU: 'VUV',
    NC: 'XPF', PF: 'XPF', WF: 'XPF',
    CA: 'CAD', MX: 'MXN', GT: 'GTQ', HN: 'HNL', NI: 'NIO', CR: 'CRC',
    CU: 'CUP', DO: 'DOP', HT: 'HTG', JM: 'JMD', TT: 'TTD',
    BB: 'BBD', BS: 'BSD', BZ: 'BZD', AR: 'ARS', BO: 'BOB', BR: 'BRL',
    CL: 'CLP', CO: 'COP', PE: 'PEN', PY: 'PYG', UY: 'UYU', VE: 'VES',
    GY: 'GYD', SR: 'SRD',
    EG: 'EGP', MA: 'MAD', DZ: 'DZD', TN: 'TND', LY: 'LYD', SD: 'SDG',
    SS: 'SSP', ET: 'ETB', ER: 'ERN', DJ: 'DJF', SO: 'SOS', KE: 'KES',
    UG: 'UGX', TZ: 'TZS', RW: 'RWF', BI: 'BIF', MZ: 'MZN', MW: 'MWK',
    ZM: 'ZMW', AO: 'AOA', NA: 'NAD', BW: 'BWP', ZA: 'ZAR', LS: 'LSL',
    SZ: 'SZL', MG: 'MGA', MU: 'MUR', SC: 'SCR', KM: 'KMF', NG: 'NGN',
    GH: 'GHS', CI: 'XOF', SN: 'XOF', ML: 'XOF', BF: 'XOF', NE: 'XOF',
    TG: 'XOF', BJ: 'XOF', GW: 'XOF', CM: 'XAF', GA: 'XAF', CG: 'XAF',
    CD: 'CDF', CF: 'XAF', TD: 'XAF', GQ: 'XAF',
    LR: 'LRD', SL: 'SLE', GM: 'GMD', GN: 'GNF', CV: 'CVE', ST: 'STN',
    MR: 'MRU', EH: 'MAD'
};

const CityContext = {
    selected: null,
    _listeners: [],

    init() {
        try {
            const saved = localStorage.getItem(CITY_STORAGE_KEY);
            if (saved) this.selected = JSON.parse(saved);
        } catch { /* ignore */ }
    },

    get() {
        return this.selected;
    },

    set(city) {
        this.selected = city;
        if (city) localStorage.setItem(CITY_STORAGE_KEY, JSON.stringify(city));
        else localStorage.removeItem(CITY_STORAGE_KEY);
        this._listeners.forEach((fn) => {
            try { fn(city); } catch { /* ignore listener errors */ }
        });
    },

    clear() {
        this.set(null);
    },

    onChange(fn) {
        this._listeners.push(fn);
        return () => { this._listeners = this._listeners.filter((f) => f !== fn); };
    },

    toMeta() {
        if (!this.selected) return null;
        return {
            city: this.selected.name,
            country: this.selected.country,
            lat: this.selected.lat,
            lon: this.selected.lon,
            timezone: this.selected.timezone || null
        };
    }
};

CityContext.init();

function resolveCurrencyForCountry(countryCode) {
    if (!countryCode) return null;
    const cc = countryCode.toUpperCase();
    if (EURO_ZONE.has(cc)) return 'EUR';
    const cur = COUNTRY_TO_CURRENCY[cc];
    if (!cur) return null;
    if (typeof CURRENCY_CODES !== 'undefined' && !CURRENCY_CODES.includes(cur)) return null;
    return cur;
}

function formatCityLabel(r) {
    const parts = [r.name];
    if (r.admin1 && r.admin1 !== r.name) parts.push(r.admin1);
    const country = r.country || r.country_code || '';
    if (country && !parts.includes(country)) parts.push(country);
    return parts.join(', ');
}

function normalizeGeocodeResult(r) {
    const currency = resolveCurrencyForCountry(r.country_code);
    return {
        id: `${r.latitude},${r.longitude}`,
        name: r.name,
        country: r.country || r.country_code,
        country_code: r.country_code,
        admin1: r.admin1 || '',
        admin2: r.admin2 || '',
        lat: r.latitude,
        lon: r.longitude,
        timezone: r.timezone || null,
        population: r.population || 0,
        currency,
        label: formatCityLabel(r)
    };
}

function sortCityResults(items) {
    return [...items].sort((a, b) => (b.population || 0) - (a.population || 0));
}

/** Debounced-friendly city search — returns structured result with error handling */
async function fetchCitySuggestions(query, lang = 'en', signal = null) {
    const q = query?.trim();
    if (!q || q.length < 2) {
        return { results: [], empty: false, error: null };
    }

    const url = `${GEOCODING_SEARCH_API}?name=${encodeURIComponent(q)}&count=5&language=${lang}&format=json`;

    try {
        const fetchFn = typeof safeFetch === 'function'
            ? (url, opts) => safeFetch(url, opts, { silent: true, context: 'geocode' })
            : (url, opts) => fetch(url, opts);
        const res = await fetchFn(url, signal ? { signal } : undefined);
        if (!res.ok) {
            return { results: [], empty: true, error: 'fetch_failed' };
        }
        const data = await res.json();
        const results = sortCityResults((data.results || []).map(normalizeGeocodeResult));
        return { results, empty: results.length === 0, error: null };
    } catch (err) {
        if (err?.name === 'AbortError') {
            return { results: [], empty: false, error: 'aborted' };
        }
        return { results: [], empty: true, error: err?.message || 'network' };
    }
}

async function searchCities(query, lang = 'en') {
    const { results } = await fetchCitySuggestions(query, lang);
    return results;
}

async function reverseGeocodeCity(lat, lon, lang = 'en') {
    const params = new URLSearchParams({
        latitude: lat,
        longitude: lon,
        language: lang,
        format: 'json'
    });
    try {
        const res = await fetch(`${GEOCODING_REVERSE_API}?${params}`);
        if (!res.ok) return null;
        const data = await res.json();
        const r = data.results?.[0];
        if (!r) return null;
        return normalizeGeocodeResult(r);
    } catch {
        return null;
    }
}

function getBookingLinks(cityName, country = '') {
    const q = encodeURIComponent(country ? `${cityName}, ${country}` : cityName);
    return {
        booking: `https://www.booking.com/searchresults.html?ss=${q}`,
        agoda: `https://www.agoda.com/search?city=${q}`,
        airbnb: `https://www.airbnb.com/s/${q}/homes`
    };
}

function cityNoResultsMessage() {
    return typeof t === 'function'
        ? t('cityNoResults')
        : 'No cities found. Try typing a major city name.';
}

function citySearchLoadingMessage() {
    return typeof t === 'function' ? t('citySearchLoading') : 'Searching…';
}

/** Reusable city search autocomplete with debounce + empty states */
function initCitySearch(options = {}) {
    const {
        inputEl,
        listEl,
        onSelect,
        onClear,
        debounceMs = 300
    } = options;
    if (!inputEl || !listEl) return;

    let debounceTimer = null;
    let activeIndex = -1;
    let results = [];
    let abortController = null;
    let requestId = 0;

    function closeList() {
        listEl.hidden = true;
        listEl.innerHTML = '';
        activeIndex = -1;
        results = [];
    }

    function showMessage(html) {
        listEl.hidden = false;
        listEl.innerHTML = html;
        activeIndex = -1;
        results = [];
    }

    function renderList(items) {
        results = items;
        if (!items.length) {
            showMessage(`<div class="city-suggest__empty" role="status">${cityNoResultsMessage()}</div>`);
            return;
        }
        listEl.hidden = false;
        listEl.innerHTML = items.map((c, i) => `
            <button type="button" class="city-suggest__item${i === activeIndex ? ' city-suggest__item--active' : ''}"
                data-index="${i}" role="option">
                <span class="city-suggest__name">${escapeHtml(c.name)}</span>
                <span class="city-suggest__meta">${escapeHtml(c.admin1 ? `${c.admin1}, ${c.country}` : c.country)}${c.currency ? ` · ${c.currency}` : ''}</span>
            </button>
        `).join('');
        listEl.querySelectorAll('.city-suggest__item').forEach((btn) => {
            btn.addEventListener('mousedown', (e) => {
                e.preventDefault();
                pick(items[parseInt(btn.dataset.index, 10)]);
            });
        });
    }

    function pick(city) {
        if (!city) return;
        inputEl.value = city.label;
        closeList();
        CityContext.set(city);
        if (onSelect) {
            try { onSelect(city); } catch { /* ignore */ }
        }
    }

    async function runSearch(val) {
        const id = ++requestId;
        if (abortController) abortController.abort();
        abortController = new AbortController();

        showMessage(`<div class="city-suggest__empty city-suggest__empty--loading" role="status">${citySearchLoadingMessage()}</div>`);

        const lang = typeof currentLang !== 'undefined' ? currentLang.split('-')[0] : 'en';

        try {
            const { results: items, empty, error } = await fetchCitySuggestions(val, lang, abortController.signal);
            if (id !== requestId) return;

            if (error === 'aborted') return;

            if (error || empty) {
                renderList([]);
                return;
            }
            renderList(items);
        } catch {
            if (id === requestId) {
                showMessage(`<div class="city-suggest__empty" role="status">${cityNoResultsMessage()}</div>`);
            }
        }
    }

    inputEl.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        const val = inputEl.value.trim();

        if (!val) {
            if (abortController) abortController.abort();
            closeList();
            CityContext.clear();
            if (onClear) {
                try { onClear(); } catch { /* ignore */ }
            }
            return;
        }

        if (val.length < 2) {
            closeList();
            return;
        }

        debounceTimer = setTimeout(() => {
            runSearch(val).catch(() => {
                showMessage(`<div class="city-suggest__empty" role="status">${cityNoResultsMessage()}</div>`);
            });
        }, debounceMs);
    });

    inputEl.addEventListener('keydown', (e) => {
        if (listEl.hidden || !results.length) return;
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            activeIndex = Math.min(activeIndex + 1, results.length - 1);
            renderList(results);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            activeIndex = Math.max(activeIndex - 1, 0);
            renderList(results);
        } else if (e.key === 'Enter' && activeIndex >= 0) {
            e.preventDefault();
            pick(results[activeIndex]);
        } else if (e.key === 'Escape') {
            closeList();
        }
    });

    document.addEventListener('click', (e) => {
        if (!inputEl.contains(e.target) && !listEl.contains(e.target)) closeList();
    });

    const existing = CityContext.get();
    if (existing) inputEl.value = existing.label;
}

function escapeHtml(str) {
    return String(str ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function applyCityToCurrencySelect(city, selectEl) {
    if (!city?.currency || !selectEl) return false;
    const opt = [...selectEl.options].find((o) => o.value === city.currency);
    if (opt) {
        selectEl.value = city.currency;
        return true;
    }
    return false;
}

function getActiveCityName(fallback = '') {
    return CityContext.get()?.name || fallback;
}

function cityFromHotspot(spot) {
    const currency = resolveCurrencyForCountry(spot.country_code);
    return {
        id: `${spot.lat},${spot.lon}`,
        name: spot.name,
        country: spot.country || spot.country_code,
        country_code: spot.country_code,
        admin1: spot.admin1 || '',
        lat: spot.lat,
        lon: spot.lon,
        timezone: spot.timezone || null,
        currency,
        label: spot.country ? `${spot.name}, ${spot.country}` : spot.name
    };
}
