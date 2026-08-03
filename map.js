/** Interactive nomad map — click inspect, layer toggles, set active destination */
const NOMAD_HOTSPOTS = [
    { name: 'Bangkok', lat: 13.7563, lon: 100.5018, country_code: 'TH', country: 'Thailand' },
    { name: 'Chiang Mai', lat: 18.7883, lon: 98.9853, country_code: 'TH', country: 'Thailand' },
    { name: 'Bali', lat: -8.6705, lon: 115.2126, country_code: 'ID', country: 'Indonesia' },
    { name: 'Lisbon', lat: 38.7223, lon: -9.1393, country_code: 'PT', country: 'Portugal' },
    { name: 'Mexico City', lat: 19.4326, lon: -99.1332, country_code: 'MX', country: 'Mexico' },
    { name: 'Medellín', lat: 6.2476, lon: -75.5658, country_code: 'CO', country: 'Colombia' },
    { name: 'Buenos Aires', lat: -34.6037, lon: -58.3816, country_code: 'AR', country: 'Argentina' },
    { name: 'Tbilisi', lat: 41.7151, lon: 44.8271, country_code: 'GE', country: 'Georgia' },
    { name: 'Dubai', lat: 25.2048, lon: 55.2708, country_code: 'AE', country: 'UAE' },
    { name: 'Tokyo', lat: 35.6762, lon: 139.6503, country_code: 'JP', country: 'Japan' },
    { name: 'Berlin', lat: 52.52, lon: 13.405, country_code: 'DE', country: 'Germany' },
    { name: 'Barcelona', lat: 41.3851, lon: 2.1734, country_code: 'ES', country: 'Spain' },
    { name: 'Cape Town', lat: -33.9249, lon: 18.4241, country_code: 'ZA', country: 'South Africa' },
    { name: 'Ho Chi Minh City', lat: 10.8231, lon: 106.6297, country_code: 'VN', country: 'Vietnam' },
    { name: 'Kuala Lumpur', lat: 3.139, lon: 101.6869, country_code: 'MY', country: 'Malaysia' },
    { name: 'Porto', lat: 41.1579, lon: -8.6291, country_code: 'PT', country: 'Portugal' },
    { name: 'Playa del Carmen', lat: 20.6296, lon: -87.0739, country_code: 'MX', country: 'Mexico' },
    { name: 'Split', lat: 43.5081, lon: 16.4402, country_code: 'HR', country: 'Croatia' },
    { name: 'Budapest', lat: 47.4979, lon: 19.0402, country_code: 'HU', country: 'Hungary' },
    { name: 'Prague', lat: 50.0755, lon: 14.4378, country_code: 'CZ', country: 'Czechia' }
];

let mapInstance = null;
let mapClickMarker = null;
let activePopup = null;

const mapLayers = {
    ppi: null,
    temp: null,
    nomad: null
};

const layerState = {
    ppi: false,
    temp: false,
    nomad: true
};

const tempCache = new Map();

function buildMapCurrencyOptions() {
    if (typeof CURRENCIES === 'undefined') return '';
    return CURRENCIES.map((c) => `<option value="${c.code}">${c.code} — ${c.name}</option>`).join('');
}

function getMapHomeCode() {
    return document.getElementById('map-home-currency')?.value || 'NOK';
}

function mapLoadingHtml() {
    const msg = typeof t === 'function' ? t('mapLoading') : 'Loading…';
    return `<div class="map-popup-loading">${msg}</div>`;
}

function buildPopupHtml(city, homeCode, weather, lifestyle, rateStr, dailyBurn, monthlyBurn) {
    const temp = weather?.ok ? `${Math.round(weather.temp)}°C` : '—';
    const rain = weather?.ok ? `${Math.round(weather.rain)}% rain` : '';
    const cur = city.currency || '—';
    const tierClass = lifestyle?.tier ? ` map-popup-ppp--${lifestyle.tier}` : '';
    const setLabel = typeof t === 'function' ? t('mapSetDestination') : 'Set as Active Destination';

    return `
        <div class="map-popup">
            <div class="map-popup__header">
                <span class="map-popup__pin">📍</span>
                <div>
                    <strong class="map-popup__title">${escapeHtml(city.name)}</strong>
                    <span class="map-popup__country">${escapeHtml(city.country || '')}</span>
                </div>
            </div>
            <div class="map-popup__grid">
                <div class="map-popup__stat">
                    <span>🌡️</span>
                    <div><strong>${temp}</strong><small>${rain}</small></div>
                </div>
                <div class="map-popup__stat">
                    <span>💰</span>
                    <div><strong>${cur}</strong><small>${rateStr}</small></div>
                </div>
                <div class="map-popup__stat map-popup__stat--wide">
                    <span>🍔</span>
                    <div><strong class="map-popup-ppp${tierClass}">${lifestyle?.text || '—'}</strong></div>
                </div>
                <div class="map-popup__stat map-popup__stat--wide">
                    <span>🏨</span>
                    <div><strong>${dailyBurn}</strong><small>${typeof t === 'function' ? t('mapDailyBurnHint') : 'Accommodation + meals'}</small></div>
                </div>
            </div>
            ${monthlyBurn ? `<p class="map-popup__monthly">${typeof t === 'function' ? t('mapMonthlyBurn') : 'Est. monthly burn'}: <strong>${monthlyBurn}</strong></p>` : ''}
            <button type="button" class="map-popup__btn" data-action="set-dest">${setLabel}</button>
        </div>
    `;
}

function escapeHtml(str) {
    return String(str ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

async function loadPopupData(city, homeCode) {
    const cur = city.currency || resolveCurrencyForCountry(city.country_code);
    if (cur && !city.currency) city.currency = cur;

    let weather = { ok: false };
    try {
        weather = await fetchWeather(city.lat, city.lon);
    } catch { /* ignore */ }

    const lifestyle = cur ? formatPppLifestyleLabel(homeCode, cur) : { text: '—', tier: 'unknown' };
    const rateStr = cur && canMarketConvert(homeCode, cur)
        ? `1 ${homeCode} = ${converter.getRate(homeCode, cur).toFixed(4)} ${cur}`
        : '—';

    let dailyBurn = '—';
    let monthlyBurn = '';
    if (cur) {
        const nightly = calcEstimatedNightly(cur);
        const burn = calcTrueDailyBurn(nightly, cur, homeCode);
        dailyBurn = formatAmount(burn.totalDest, cur);
        const monthly = calcNomadRunway(1500, homeCode, cur);
        if (monthly?.monthlyDest) {
            monthlyBurn = formatAmount(monthly.monthlyDest, cur);
        }
    }

    return buildPopupHtml(city, homeCode, weather, lifestyle, rateStr, dailyBurn, monthlyBurn);
}

function openMapPopup(city, lat, lon) {
    if (!mapInstance || !city) return;

    const homeCode = getMapHomeCode();

    if (activePopup) {
        mapInstance.closePopup();
    }

    activePopup = L.popup({
        className: 'map-glass-popup',
        maxWidth: 340,
        minWidth: 280,
        closeButton: true,
        offset: [0, -8]
    })
        .setLatLng([lat, lon])
        .setContent(mapLoadingHtml())
        .openOn(mapInstance);

    activePopup._cityData = city;

    loadPopupData(city, homeCode)
        .then((html) => {
            if (!activePopup || activePopup._cityData?.lat !== city.lat || activePopup._cityData?.lon !== city.lon) return;
            activePopup.setContent(html);
            activePopup._cityData = city;
        })
        .catch(() => {
            activePopup?.setContent(`<div class="map-popup-loading">${typeof t === 'function' ? t('mapLoadError') : 'Failed to load.'}</div>`);
        });
}

function setActiveDestination(city) {
    if (!city) return;
    try {
        CityContext.set(city);
        window.location.href = 'index.html';
    } catch { /* ignore */ }
}

async function onMapLocation(lat, lon) {
    if (!mapInstance) return;

    if (mapClickMarker) mapInstance.removeLayer(mapClickMarker);
    mapClickMarker = L.circleMarker([lat, lon], {
        radius: 12,
        fillColor: '#818cf8',
        color: '#fff',
        weight: 2,
        fillOpacity: 0.9
    }).addTo(mapInstance);

    const lang = typeof currentLang !== 'undefined' ? currentLang.split('-')[0] : 'en';
    let city = null;
    try {
        city = await reverseGeocodeCity(lat, lon, lang);
    } catch { /* ignore */ }

    if (!city) {
        city = {
            id: `${lat},${lon}`,
            name: `${lat.toFixed(2)}°, ${lon.toFixed(2)}°`,
            country: 'Unknown',
            country_code: '',
            lat,
            lon,
            currency: null,
            label: `${lat.toFixed(2)}°, ${lon.toFixed(2)}°`
        };
    }

    CityContext.set(city);
    mapInstance.setView([lat, lon], Math.max(mapInstance.getZoom(), 6));
    openMapPopup(city, lat, lon);
}

function clearLayerGroup(key) {
    if (mapLayers[key]) {
        mapInstance.removeLayer(mapLayers[key]);
        mapLayers[key] = null;
    }
}

function buildPpiLayer(homeCode) {
    clearLayerGroup('ppi');
    if (!layerState.ppi) return;

    const group = L.layerGroup();
    for (const spot of NOMAD_HOTSPOTS) {
        const cur = resolveCurrencyForCountry(spot.country_code);
        if (!cur) continue;
        const score = getPpiScore(homeCode, cur);
        const color = getPpiColor(score);
        L.circle([spot.lat, spot.lon], {
            radius: 180000,
            color: color,
            fillColor: color,
            fillOpacity: 0.22,
            weight: 1,
            opacity: 0.55
        }).addTo(group);
    }
    group.addTo(mapInstance);
    mapLayers.ppi = group;
}

async function buildTempLayer() {
    clearLayerGroup('temp');
    if (!layerState.temp) return;

    const group = L.layerGroup();
    const fetches = NOMAD_HOTSPOTS.map(async (spot) => {
        const key = `${spot.lat},${spot.lon}`;
        let weather = tempCache.get(key);
        if (!weather) {
            try {
                weather = await fetchWeather(spot.lat, spot.lon);
                tempCache.set(key, weather);
            } catch {
                weather = { ok: false };
            }
        }
        const temp = weather.ok ? weather.temp : null;
        const color = tempOverlayColor(temp);
        const radius = temp != null && temp >= 20 ? 220000 : 160000;
        L.circle([spot.lat, spot.lon], {
            radius,
            color,
            fillColor: color,
            fillOpacity: temp != null && temp >= 20 ? 0.28 : 0.15,
            weight: 1,
            opacity: 0.6
        }).addTo(group);
    });

    await Promise.allSettled(fetches);
    group.addTo(mapInstance);
    mapLayers.temp = group;
}

function buildNomadLayer(homeCode) {
    clearLayerGroup('nomad');
    if (!layerState.nomad) return;

    const group = L.layerGroup();
    for (const spot of NOMAD_HOTSPOTS) {
        const cur = resolveCurrencyForCountry(spot.country_code);
        if (!cur) continue;
        const monthly = calcNomadRunway(1500, homeCode, cur);
        const burnLabel = monthly?.monthlyDest
            ? formatAmount(monthly.monthlyDest, cur)
            : '—';

        const marker = L.circleMarker([spot.lat, spot.lon], {
            radius: 8,
            fillColor: '#a78bfa',
            color: '#fff',
            weight: 2,
            fillOpacity: 0.95
        });

        marker.bindTooltip(`☕ ${spot.name}<br><small>${burnLabel}/mo</small>`, {
            className: 'map-nomad-tooltip',
            direction: 'top',
            offset: [0, -6]
        });

        marker.on('click', (e) => {
            L.DomEvent.stopPropagation(e);
            const city = cityFromHotspot(spot);
            onMapLocation(spot.lat, spot.lon);
        });

        marker.addTo(group);
    }
    group.addTo(mapInstance);
    mapLayers.nomad = group;
}

function refreshMapLayers() {
    if (!mapInstance) return;
    const homeCode = getMapHomeCode();
    buildPpiLayer(homeCode);
    buildTempLayer().catch(() => { /* ignore */ });
    buildNomadLayer(homeCode);
}

function toggleLayer(key, btn) {
    layerState[key] = !layerState[key];
    btn?.classList.toggle('map-layer-btn--active', layerState[key]);
    refreshMapLayers();
}

function initMapPage() {
    const mapEl = document.getElementById('col-map');
    if (!mapEl || typeof L === 'undefined') {
        document.getElementById('map-error')?.removeAttribute('hidden');
        return;
    }

    mapInstance = L.map(mapEl, { zoomControl: true }).setView([20, 0], 2);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OSM &copy; CARTO',
        subdomains: 'abcd',
        maxZoom: 19
    }).addTo(mapInstance);

    mapInstance.on('click', (e) => onMapLocation(e.latlng.lat, e.latlng.lng));

    mapInstance.on('popupopen', (e) => {
        const popupEl = e.popup.getElement();
        popupEl?.querySelector('[data-action="set-dest"]')?.addEventListener('click', () => {
            setActiveDestination(e.popup._cityData);
        });
    });

    const homeSel = document.getElementById('map-home-currency');
    if (homeSel) {
        homeSel.innerHTML = buildMapCurrencyOptions();
        homeSel.value = 'NOK';
        homeSel.addEventListener('change', () => {
            refreshMapLayers();
            if (activePopup?._cityData) {
                const c = activePopup._cityData;
                loadPopupData(c, getMapHomeCode())
                    .then((html) => activePopup?.setContent(html))
                    .catch(() => { /* ignore */ });
            }
        });
    }

    document.getElementById('layer-ppi')?.addEventListener('click', (e) => toggleLayer('ppi', e.currentTarget));
    document.getElementById('layer-temp')?.addEventListener('click', (e) => toggleLayer('temp', e.currentTarget));
    document.getElementById('layer-nomad')?.addEventListener('click', (e) => toggleLayer('nomad', e.currentTarget));

    const cityInput = document.getElementById('map-city-search');
    const cityList = document.getElementById('map-city-suggestions');
    if (cityInput && cityList) {
        initCitySearch({
            inputEl: cityInput,
            listEl: cityList,
            debounceMs: 300,
            onSelect(city) {
                onMapLocation(city.lat, city.lon);
            }
        });
    }

    fetchLiveFxRates().finally(() => refreshMapLayers());
}
