/** Global city geocoding — Open-Meteo search + reverse + country→currency */
const GEOCODING_SEARCH_API = 'https://geocoding-api.open-meteo.com/v1/search';
const GEOCODING_REVERSE_API = 'https://geocoding-api.open-meteo.com/v1/reverse';
const CITY_STORAGE_KEY = 'nomad-os-selected-city';
const APP_STATE_CITY_KEY = 'nomados_last_city';

function cityToAppStatePayload(city) {
    if (!city) return null;
    const name = city.name || String(city.label || '').split(',')[0].trim();
    if (!name) return null;
    const countryCode = city.country_code || city.countryCode || '';
    return {
        name,
        country: city.country || '',
        countryCode,
        country_code: countryCode,
        currency: city.currency || null,
        label: city.label || (city.country ? `${name}, ${city.country}` : name),
        lat: city.lat,
        lon: city.lon,
        id: city.id || `${city.lat ?? name}-${countryCode}`,
        burnZone: city.burnZone,
        seed: city.seed || city.heroImageSeed
    };
}

function syncAppStateCityStorage(city) {
    try {
        if (!city) {
            localStorage.removeItem(APP_STATE_CITY_KEY);
            return;
        }
        const payload = cityToAppStatePayload(city);
        if (payload) localStorage.setItem(APP_STATE_CITY_KEY, JSON.stringify(payload));
    } catch { /* quota */ }
}

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

/** Country-level map search — centroid, zoom, capital for fly-to */
const COUNTRY_SEARCH_INDEX = [
    { code: 'NO', names: ['Norway', 'Norge', 'Norwegen', 'Norvège'], lat: 64.5, lon: 11.5, zoom: 5, currency: 'NOK', capital: 'Oslo', capitalLat: 59.9139, capitalLon: 10.7522 },
    { code: 'SE', names: ['Sweden', 'Sverige', 'Schweden', 'Suède'], lat: 62.5, lon: 16.0, zoom: 5, currency: 'SEK', capital: 'Stockholm', capitalLat: 59.3293, capitalLon: 18.0686 },
    { code: 'DK', names: ['Denmark', 'Danmark', 'Danemark'], lat: 56.2, lon: 9.5, zoom: 6, currency: 'DKK', capital: 'Copenhagen', capitalLat: 55.6761, capitalLon: 12.5683 },
    { code: 'FI', names: ['Finland', 'Suomi'], lat: 64.0, lon: 26.0, zoom: 5, currency: 'EUR', capital: 'Helsinki', capitalLat: 60.1699, capitalLon: 24.9384 },
    { code: 'DE', names: ['Germany', 'Deutschland', 'Allemagne', 'Alemania'], lat: 51.2, lon: 10.5, zoom: 6, currency: 'EUR', capital: 'Berlin', capitalLat: 52.52, capitalLon: 13.405 },
    { code: 'FR', names: ['France', 'Frankreich', 'Francia'], lat: 46.6, lon: 2.5, zoom: 6, currency: 'EUR', capital: 'Paris', capitalLat: 48.8566, capitalLon: 2.3522 },
    { code: 'ES', names: ['Spain', 'España', 'Spanien', 'Espagne'], lat: 40.0, lon: -3.7, zoom: 6, currency: 'EUR', capital: 'Madrid', capitalLat: 40.4168, capitalLon: -3.7038 },
    { code: 'PT', names: ['Portugal'], lat: 39.5, lon: -8.0, zoom: 6, currency: 'EUR', capital: 'Lisbon', capitalLat: 38.7223, capitalLon: -9.1393 },
    { code: 'IT', names: ['Italy', 'Italia', 'Italien', 'Italie'], lat: 42.5, lon: 12.5, zoom: 6, currency: 'EUR', capital: 'Rome', capitalLat: 41.9028, capitalLon: 12.4964 },
    { code: 'GB', names: ['United Kingdom', 'UK', 'Britain', 'England', 'Storbritannia'], lat: 54.5, lon: -2.5, zoom: 6, currency: 'GBP', capital: 'London', capitalLat: 51.5074, capitalLon: -0.1278 },
    { code: 'CH', names: ['Switzerland', 'Schweiz', 'Suisse', 'Svizzera'], lat: 46.8, lon: 8.2, zoom: 7, currency: 'CHF', capital: 'Bern', capitalLat: 46.948, capitalLon: 7.4474 },
    { code: 'PL', names: ['Poland', 'Polen', 'Pologne', 'Polska'], lat: 52.0, lon: 19.5, zoom: 6, currency: 'PLN', capital: 'Warsaw', capitalLat: 52.2297, capitalLon: 21.0122 },
    { code: 'CZ', names: ['Czechia', 'Czech Republic', 'Tschechien'], lat: 49.8, lon: 15.5, zoom: 7, currency: 'CZK', capital: 'Prague', capitalLat: 50.0755, capitalLon: 14.4378 },
    { code: 'HU', names: ['Hungary', 'Ungarn', 'Hongrie'], lat: 47.2, lon: 19.5, zoom: 7, currency: 'HUF', capital: 'Budapest', capitalLat: 47.4979, capitalLon: 19.0402 },
    { code: 'HR', names: ['Croatia', 'Kroatien', 'Croatie'], lat: 45.1, lon: 15.2, zoom: 7, currency: 'EUR', capital: 'Zagreb', capitalLat: 45.815, capitalLon: 15.9819 },
    { code: 'GE', names: ['Georgia', 'Georgien', 'Géorgie'], lat: 42.0, lon: 43.5, zoom: 7, currency: 'GEL', capital: 'Tbilisi', capitalLat: 41.7151, capitalLon: 44.8271 },
    { code: 'TR', names: ['Turkey', 'Türkiye', 'Turkei', 'Turquie'], lat: 39.0, lon: 35.0, zoom: 6, currency: 'TRY', capital: 'Istanbul', capitalLat: 41.0082, capitalLon: 28.9784 },
    { code: 'JP', names: ['Japan', 'Japon', 'Japón'], lat: 36.2, lon: 138.3, zoom: 5, currency: 'JPY', capital: 'Tokyo', capitalLat: 35.6762, capitalLon: 139.6503 },
    { code: 'KR', names: ['South Korea', 'Korea', 'Südkorea', 'Corée'], lat: 36.5, lon: 127.5, zoom: 6, currency: 'KRW', capital: 'Seoul', capitalLat: 37.5665, capitalLon: 126.978 },
    { code: 'CN', names: ['China', 'Chine'], lat: 35.0, lon: 103.0, zoom: 4, currency: 'CNY', capital: 'Beijing', capitalLat: 39.9042, capitalLon: 116.4074 },
    { code: 'TH', names: ['Thailand', 'Thailandia', 'Thaïlande'], lat: 15.8, lon: 100.9, zoom: 6, currency: 'THB', capital: 'Bangkok', capitalLat: 13.7563, capitalLon: 100.5018 },
    { code: 'VN', names: ['Vietnam', 'Việt Nam', 'Viet Nam'], lat: 16.0, lon: 108.0, zoom: 6, currency: 'VND', capital: 'Ho Chi Minh City', capitalLat: 10.8231, capitalLon: 106.6297 },
    { code: 'ID', names: ['Indonesia'], lat: -2.5, lon: 118.0, zoom: 5, currency: 'IDR', capital: 'Jakarta', capitalLat: -6.2088, capitalLon: 106.8456 },
    { code: 'MY', names: ['Malaysia'], lat: 4.2, lon: 101.9, zoom: 6, currency: 'MYR', capital: 'Kuala Lumpur', capitalLat: 3.139, capitalLon: 101.6869 },
    { code: 'SG', names: ['Singapore', 'Singapur', 'Singapour'], lat: 1.35, lon: 103.8, zoom: 11, currency: 'SGD', capital: 'Singapore', capitalLat: 1.3521, capitalLon: 103.8198 },
    { code: 'PH', names: ['Philippines', 'Philippinen'], lat: 12.8, lon: 122.0, zoom: 6, currency: 'PHP', capital: 'Manila', capitalLat: 14.5995, capitalLon: 120.9842 },
    { code: 'IN', names: ['India', 'Indien', 'Inde'], lat: 22.0, lon: 79.0, zoom: 5, currency: 'INR', capital: 'New Delhi', capitalLat: 28.6139, capitalLon: 77.209 },
    { code: 'AE', names: ['UAE', 'United Arab Emirates', 'Dubai', 'Emirates'], lat: 24.0, lon: 54.0, zoom: 7, currency: 'AED', capital: 'Dubai', capitalLat: 25.2048, capitalLon: 55.2708 },
    { code: 'US', names: ['United States', 'USA', 'America', 'US'], lat: 39.8, lon: -98.5, zoom: 4, currency: 'USD', capital: 'New York', capitalLat: 40.7128, capitalLon: -74.006 },
    { code: 'CA', names: ['Canada', 'Kanada'], lat: 56.0, lon: -96.0, zoom: 4, currency: 'CAD', capital: 'Toronto', capitalLat: 43.6532, capitalLon: -79.3832 },
    { code: 'MX', names: ['Mexico', 'Mexiko', 'Mexique'], lat: 23.6, lon: -102.5, zoom: 5, currency: 'MXN', capital: 'Mexico City', capitalLat: 19.4326, capitalLon: -99.1332 },
    { code: 'BR', names: ['Brazil', 'Brasil', 'Brésil'], lat: -14.2, lon: -51.9, zoom: 4, currency: 'BRL', capital: 'São Paulo', capitalLat: -23.5505, capitalLon: -46.6333 },
    { code: 'AR', names: ['Argentina', 'Argentinien', 'Argentine'], lat: -38.4, lon: -63.6, zoom: 4, currency: 'ARS', capital: 'Buenos Aires', capitalLat: -34.6037, capitalLon: -58.3816 },
    { code: 'CO', names: ['Colombia', 'Kolumbien', 'Colombie'], lat: 4.5, lon: -74.0, zoom: 6, currency: 'COP', capital: 'Bogotá', capitalLat: 4.711, capitalLon: -74.0721 },
    { code: 'AU', names: ['Australia', 'Australien', 'Australie'], lat: -25.0, lon: 133.0, zoom: 4, currency: 'AUD', capital: 'Sydney', capitalLat: -33.8688, capitalLon: 151.2093 },
    { code: 'NZ', names: ['New Zealand', 'Neuseeland', 'Nouvelle-Zélande'], lat: -41.0, lon: 174.0, zoom: 5, currency: 'NZD', capital: 'Auckland', capitalLat: -36.8485, capitalLon: 174.7633 },
    { code: 'ZA', names: ['South Africa', 'Südafrika', 'Afrique du Sud'], lat: -30.5, lon: 24.0, zoom: 5, currency: 'ZAR', capital: 'Cape Town', capitalLat: -33.9249, capitalLon: 18.4241 },
    { code: 'EG', names: ['Egypt', 'Ägypten', 'Égypte', 'Egypte'], lat: 26.8, lon: 30.8, zoom: 6, currency: 'EGP', capital: 'Cairo', capitalLat: 30.0444, capitalLon: 31.2357 },
    { code: 'MA', names: ['Morocco', 'Marokko', 'Maroc'], lat: 31.8, lon: -7.1, zoom: 6, currency: 'MAD', capital: 'Marrakech', capitalLat: 31.6295, capitalLon: -7.9811 }
];

function searchCountriesLocal(query) {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];

    return COUNTRY_SEARCH_INDEX.filter((c) =>
        c.code.toLowerCase() === q
        || c.names.some((n) => n.toLowerCase().includes(q) || q.includes(n.toLowerCase()))
    ).slice(0, 4).map((c) => ({
        type: 'country',
        isCountry: true,
        id: `country-${c.code}`,
        name: c.names[0],
        country: c.names[0],
        country_code: c.code,
        lat: c.capitalLat ?? c.lat,
        lon: c.capitalLon ?? c.lon,
        mapLat: c.lat,
        mapLon: c.lon,
        mapZoom: c.zoom,
        currency: c.currency,
        capital: c.capital,
        label: c.names[0]
    }));
}

/** Combined city + country suggestions for map & global search */
async function fetchMapLocationSuggestions(query, lang = 'en', signal = null) {
    const countries = searchCountriesLocal(query);
    const { results: cities, empty, error } = await fetchCitySuggestions(query, lang, signal, 7);
    const cityItems = cities.map((c) => ({ ...c, isCountry: false, type: 'city' }));
    const merged = [...countries, ...cityItems].slice(0, 10);
    return {
        results: merged,
        empty: merged.length === 0 && empty,
        error
    };
}

const CityContext = {
    selected: null,
    _listeners: [],

    init() {
        try {
            const appSaved = localStorage.getItem(APP_STATE_CITY_KEY);
            if (appSaved) {
                const parsed = JSON.parse(appSaved);
                if (parsed && (parsed.name || parsed.label)) {
                    this.selected = {
                        id: parsed.id || `${parsed.lat ?? parsed.name}-${parsed.country_code || parsed.countryCode || ''}`,
                        name: parsed.name || String(parsed.label).split(',')[0].trim(),
                        country: parsed.country || '',
                        country_code: parsed.country_code || parsed.countryCode || '',
                        lat: parsed.lat,
                        lon: parsed.lon,
                        currency: parsed.currency || null,
                        label: parsed.label || parsed.name
                    };
                    return;
                }
            }
            const saved = localStorage.getItem(CITY_STORAGE_KEY);
            if (saved) this.selected = JSON.parse(saved);
        } catch { /* ignore */ }
    },

    get() {
        return this.selected;
    },

    set(city) {
        this.selected = city;
        if (city) {
            localStorage.setItem(CITY_STORAGE_KEY, JSON.stringify(city));
            syncAppStateCityStorage(city);
        } else {
            localStorage.removeItem(CITY_STORAGE_KEY);
            syncAppStateCityStorage(null);
        }
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
async function fetchCitySuggestions(query, lang = 'en', signal = null, count = 5) {
    const q = query?.trim();
    if (!q || q.length < 2) {
        return { results: [], empty: false, error: null };
    }

    const url = `${GEOCODING_SEARCH_API}?name=${encodeURIComponent(q)}&count=${count}&language=${lang}&format=json`;

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
        debounceMs = 300,
        minChars = 2,
        fetchSuggestions = fetchCitySuggestions,
        showCountries = false
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
        listEl.innerHTML = items.map((c, i) => {
            const isCountry = c.isCountry || c.type === 'country';
            const metaRaw = isCountry
                ? `${typeof t === 'function' ? t('mapCountryLabel') : 'Country'}${c.currency ? ` · ${c.currency}` : ''}${c.capital ? ` · ${c.capital}` : ''}`
                : `${c.admin1 ? `${c.admin1}, ${c.country}` : c.country}${c.currency ? ` · ${c.currency}` : ''}`;
            return `
            <button type="button" class="city-suggest__item${i === activeIndex ? ' city-suggest__item--active' : ''}${isCountry ? ' city-suggest__item--country' : ''}"
                data-index="${i}" role="option">
                <span class="city-suggest__name">${isCountry ? '🌍 ' : ''}${escapeHtml(c.name)}</span>
                <span class="city-suggest__meta">${escapeHtml(metaRaw)}</span>
            </button>`;
        }).join('');
        listEl.querySelectorAll('.city-suggest__item').forEach((btn) => {
            btn.addEventListener('mousedown', (e) => {
                e.preventDefault();
                pick(items[parseInt(btn.dataset.index, 10)]);
            });
        });
    }

    function pick(city) {
        if (!city) return;
        inputEl.value = city.label || city.name;
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
            const { results: items, empty, error } = await fetchSuggestions(val, lang, abortController.signal);
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

        if (val.length < minChars) {
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
