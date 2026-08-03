/** Trivago-style True Cost Stays — multi-provider comparison + nomad intelligence */
const BOOKING_FX_MARKUP = 0.045;

function $(id) {
    return document.getElementById(id);
}

function bind(el, type, handler, options) {
    if (el) el.addEventListener(type, handler, options);
}

/** Swap these for production affiliate / partner IDs (left as placeholders = omitted from URLs) */
const AFFILIATE_IDS = {
    booking: 'YOUR_AFFILIATE_ID',
    agoda: 'YOUR_AGODA_CID',
    hotelscom: 'YOUR_EXPEDIA_AID'
};

/** Real search keywords per stay type — used instead of fictional property names */
const STAY_SEARCH_KEYWORDS = {
    luxury: 'luxury hotel',
    boutique: 'boutique hotel',
    apartment: 'apartment',
    hostel: 'hostel',
    coliving: 'serviced apartment'
};

const PROVIDERS = [
    { id: 'booking', name: 'Booking.com', mult: 1.0, fxFee: 0.045 },
    { id: 'agoda', name: 'Agoda', mult: 0.96, fxFee: 0.038 },
    { id: 'hotelscom', name: 'Hotels.com', mult: 1.03, fxFee: 0.05 }
];

const STAY_TYPES = {
    luxury: { label: 'Luxury Hotel', mult: 1.85, tag: 'luxury', icon: '✨', stars: 5 },
    boutique: { label: 'Boutique Hotel', mult: 1.35, tag: 'boutique', icon: '🎨', stars: 4 },
    apartment: { label: 'Apartment / Airbnb', mult: 0.88, tag: 'apartment', icon: '🏠', stars: 4 },
    hostel: { label: 'Hostel', mult: 0.42, tag: 'hostel', icon: '🛏️', stars: 3 },
    coliving: { label: 'Co-living', mult: 0.72, tag: 'coliving', icon: '💻', stars: 4 }
};

const STAY_TEMPLATES = [
    { suffix: 'Central', wifi: 94, cafeDist: 0.12, cowork: true, checkin24: true, distCenter: 0.4, reviewBase: 8.6 },
    { suffix: 'Nomad Hub', wifi: 91, cafeDist: 0.18, cowork: true, checkin24: false, distCenter: 1.2, reviewBase: 8.9 },
    { suffix: 'Riverside', wifi: 88, cafeDist: 0.22, cowork: true, checkin24: true, distCenter: 1.8, reviewBase: 8.4 },
    { suffix: 'Garden District', wifi: 86, cafeDist: 0.35, cowork: false, checkin24: false, distCenter: 2.5, reviewBase: 8.2 },
    { suffix: 'Budget Stay', wifi: 78, cafeDist: 0.48, cowork: false, checkin24: true, distCenter: 3.2, reviewBase: 7.8 },
    { suffix: 'Old Town', wifi: 90, cafeDist: 0.15, cowork: false, checkin24: true, distCenter: 0.6, reviewBase: 8.7 }
];

function renderImageGallery(hotel) {
    const urls = typeof ImageEngine !== 'undefined'
        ? ImageEngine.galleryUrls(hotel.id, 3)
        : [`https://picsum.photos/seed/${encodeURIComponent(hotel.id)}/600/400`];
    const alt = escapeHtml(hotel.name);

    const coverUrl = urls[0];
    const thumbUrls = urls.slice(1);

    const thumbsHtml = thumbUrls.map((url, i) => `
        <img class="hotel-gallery__thumb"
            src="${url}"
            alt="${alt} — photo ${i + 2}"
            width="600" height="400"
            loading="lazy"
            decoding="async"
            data-img-stage="primary"
            onerror="handleHotelImgError(this)">
    `).join('');

    return `
        <div class="hotel-gallery">
            <img class="hotel-gallery__cover"
                src="${coverUrl}"
                alt="${alt}"
                width="600" height="400"
                loading="lazy"
                decoding="async"
                data-img-stage="primary"
                onerror="handleHotelImgError(this)">
            ${thumbUrls.length ? `<div class="hotel-gallery__thumbs">${thumbsHtml}</div>` : ''}
        </div>
    `;
}

let hotelState = {
    city: null,
    destCode: 'JPY',
    homeCode: 'NOK',
    checkIn: '',
    checkOut: '',
    guests: 2,
    maxPrice: null,
    priceMode: 'burn',
    stayType: 'all',
    amenities: new Set(),
    sortBy: 'burn_asc',
    viewMode: 'grid',
    enrichedCache: null
};

/** Maps quick-sort pills to dropdown values. */
const SORT_TO_PILL = {
    recommendation: 'recommendation',
    burn_asc: 'burn_asc',
    rating_desc: 'rating_desc',
    discount_desc: 'discount_desc'
};

function sortNum(value, fallback = 0) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
}

/** Robust sorting pipeline — pure function, no DOM side effects. */
function sortHotels(criterion, listings) {
    if (!Array.isArray(listings) || !listings.length) return [];

    const arr = [...listings];

    switch (criterion) {
        case 'price_asc':
            return arr.sort((a, b) => sortNum(a.nightly, Infinity) - sortNum(b.nightly, Infinity));
        case 'price_desc':
            return arr.sort((a, b) => sortNum(b.nightly, 0) - sortNum(a.nightly, 0));
        case 'rating_desc':
            return arr.sort((a, b) => {
                const scoreA = sortNum(a.reviewScore) * 10 + sortNum(a.stars);
                const scoreB = sortNum(b.reviewScore) * 10 + sortNum(b.stars);
                return scoreB - scoreA;
            });
        case 'discount_desc':
            return arr.sort((a, b) => sortNum(b.discountPct) - sortNum(a.discountPct));
        case 'distance_asc':
            return arr.sort((a, b) => sortNum(a.distCenter, Infinity) - sortNum(b.distCenter, Infinity));
        case 'nomad_score':
            return arr.sort((a, b) => sortNum(b.nomadScore) - sortNum(a.nomadScore));
        case 'recommendation': {
            const maxBurn = Math.max(...arr.map((h) => sortNum(h.burn?.totalHome)), 1);
            return arr.sort((a, b) => {
                const burnA = sortNum(a.burn?.totalHome, maxBurn);
                const burnB = sortNum(b.burn?.totalHome, maxBurn);
                const scoreA = sortNum(a.nomadScore) * 0.55 + (1 - burnA / maxBurn) * 45;
                const scoreB = sortNum(b.nomadScore) * 0.55 + (1 - burnB / maxBurn) * 45;
                return scoreB - scoreA;
            });
        }
        case 'burn_asc':
        default:
            return arr.sort((a, b) => sortNum(a.burn?.totalHome, Infinity) - sortNum(b.burn?.totalHome, Infinity));
    }
}

const REAL_HOTEL_MAX_KM = 50;

const GENERIC_HOTEL_NAMES = new Set([
    'hostel', 'hotel', 'motel', 'hostal', 'hostalito', 'guesthouse', 'guest house',
    'bed and breakfast', 'inn', 'lodging', 'accommodation'
]);

/** Local country names → English for Booking.com (lang=en-gb). */
const COUNTRY_NAME_EN = {
    NO: 'Norway', Norge: 'Norway',
    SE: 'Sweden', Sverige: 'Sweden',
    DK: 'Denmark', Danmark: 'Denmark',
    DE: 'Germany', Deutschland: 'Germany',
    FR: 'France', FRance: 'France',
    ES: 'Spain', España: 'Spain',
    IT: 'Italy', Italia: 'Italy',
    NL: 'Netherlands', Nederland: 'Netherlands',
    GB: 'United Kingdom', 'United Kingdom': 'United Kingdom',
    US: 'United States', 'United States': 'United States',
    MX: 'Mexico', México: 'Mexico',
    JP: 'Japan', CN: 'China', AU: 'Australia', NZ: 'New Zealand',
    PL: 'Poland', CZ: 'Czechia', AT: 'Austria', CH: 'Switzerland',
    PT: 'Portugal', IE: 'Ireland', FI: 'Finland', IS: 'Iceland'
};

function isGenericHotelName(name) {
    const n = (name || '').trim().toLowerCase();
    if (!n || n.length < 5) return true;
    if (GENERIC_HOTEL_NAMES.has(n)) return true;
    return /^(hostel|hotel|motel|hostal|guesthouse|inn)$/i.test(n);
}

function englishCountryName(countryCode, countryLabel = '') {
    const cc = (countryCode || '').toUpperCase();
    if (cc && COUNTRY_NAME_EN[cc]) return COUNTRY_NAME_EN[cc];
    const label = (countryLabel || '').trim();
    if (label && COUNTRY_NAME_EN[label]) return COUNTRY_NAME_EN[label];
    return label || '';
}

function buildEnglishLocationLabel(ctx) {
    const parts = [ctx.name].filter(Boolean);
    if (ctx.admin1 && ctx.admin1 !== ctx.name) parts.push(ctx.admin1);
    const countryEn = englishCountryName(ctx.country_code, ctx.country);
    if (countryEn && !parts.join(', ').toLowerCase().includes(countryEn.toLowerCase())) {
        parts.push(countryEn);
    }
    return parts.join(', ');
}

const VALID_OSM_STAY_TYPES = new Set([
    'hotel', 'hostel', 'guest_house', 'motel', 'apartment', 'chalet', 'bed_and_breakfast'
]);

const realHotelsCache = { key: null, hotels: [], promise: null };

function mapOsmToStayType(osmValue, name) {
    const n = (name || '').toLowerCase();
    if (osmValue === 'hostel' || n.includes('hostel')) return 'hostel';
    if (osmValue === 'apartment' || n.includes('apartment')) return 'apartment';
    if (n.includes('coliv') || n.includes('co-liv') || n.includes('co-living')) return 'coliving';
    if (n.includes('boutique')) return 'boutique';
    if (n.includes('luxury') || n.includes('grand') || n.includes('palace') || n.includes('resort')) return 'luxury';
    if (osmValue === 'guest_house' || osmValue === 'bed_and_breakfast') return 'boutique';
    return 'boutique';
}

function haversineKm(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const toRad = (d) => d * Math.PI / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) ** 2
        + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Fetch real hotels/hostels near coordinates via Photon (OpenStreetMap). */
async function fetchRealHotelsNear(lat, lon, countryCode = '', limit = 35) {
    const latN = Number(lat);
    const lonN = Number(lon);
    if (!Number.isFinite(latN) || !Number.isFinite(lonN)) return [];

    const targetCc = (countryCode || '').toUpperCase();
    const key = `${latN.toFixed(2)},${lonN.toFixed(2)},${targetCc}`;
    if (realHotelsCache.key === key && realHotelsCache.hotels.length) {
        return realHotelsCache.hotels;
    }
    if (realHotelsCache.promise?.key === key) {
        return realHotelsCache.promise.value;
    }

    const fetchPromise = (async () => {
        const seen = new Set();
        const candidates = [];
        const terms = ['hotel', 'hostel', 'guesthouse', 'motel'];

        for (const term of terms) {
            try {
                const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(term)}&lat=${latN}&lon=${lonN}&limit=25`;
                const fetchFn = typeof safeFetch === 'function'
                    ? (u) => safeFetch(u, {}, { silent: true, context: 'photon' })
                    : (u) => fetch(u);
                const res = await fetchFn(url);
                if (!res.ok) continue;
                const data = await res.json();

                for (const f of data.features || []) {
                    const p = f.properties || {};
                    if (p.osm_key !== 'tourism') continue;
                    if (!VALID_OSM_STAY_TYPES.has(p.osm_value)) continue;

                    const name = (p.name || '').trim();
                    if (isGenericHotelName(name)) continue;

                    const dedupe = name.toLowerCase();
                    if (seen.has(dedupe)) continue;

                    const coords = f.geometry?.coordinates || [lonN, latN];
                    const plat = coords[1];
                    const plon = coords[0];
                    const distKm = haversineKm(latN, lonN, plat, plon);

                    if (distKm > REAL_HOTEL_MAX_KM) continue;

                    const cc = (p.countrycode || '').toUpperCase();
                    if (targetCc && cc && cc !== targetCc) continue;

                    seen.add(dedupe);
                    candidates.push({
                        name,
                        city: p.city || p.locality || p.district || '',
                        country: englishCountryName(cc, p.country || ''),
                        countryCode: cc,
                        lat: plat,
                        lon: plon,
                        distKm,
                        stayType: mapOsmToStayType(p.osm_value, name),
                        osmValue: p.osm_value
                    });
                }
            } catch { /* ignore photon errors */ }
        }

        candidates.sort((a, b) => a.distKm - b.distKm);
        const out = candidates.slice(0, limit);

        realHotelsCache.key = key;
        realHotelsCache.hotels = out;
        return out;
    })();

    realHotelsCache.promise = { key, value: fetchPromise };
    try {
        return await fetchPromise;
    } finally {
        if (realHotelsCache.promise?.key === key) realHotelsCache.promise = null;
    }
}

function assignRealHotelsToListings(listings, realHotels, cityCtx) {
    if (!realHotels?.length) return listings;

    const pools = { luxury: [], boutique: [], apartment: [], hostel: [], coliving: [] };
    for (const h of realHotels) {
        const bucket = pools[h.stayType] ? h.stayType : 'boutique';
        pools[bucket].push(h);
    }

    const centerLat = Number(cityCtx.lat);
    const centerLon = Number(cityCtx.lon);

    return listings.map((listing, i) => {
        const pool = pools[listing.stayType]?.length ? pools[listing.stayType] : realHotels;
        const real = pool[(hashStr(listing.id) + i) % pool.length];
        if (!real || isGenericHotelName(real.name)) return listing;

        const dist = Number.isFinite(centerLat) && Number.isFinite(real.lat)
            ? Math.round(haversineKm(centerLat, centerLon, real.lat, real.lon) * 10) / 10
            : listing.distCenter;

        return {
            ...listing,
            name: real.name,
            templateLabel: listing.name,
            realHotel: real,
            hasRealProperty: true,
            distCenter: dist
        };
    });
}

function getPropertySearchLabel(hotel, ctx) {
    const countryEn = englishCountryName(ctx.country_code, ctx.country);

    if (hotel?.realHotel?.name && !isGenericHotelName(hotel.realHotel.name)) {
        const parts = [hotel.realHotel.name];
        const city = hotel.realHotel.city || ctx.name;
        if (city && !parts[0].toLowerCase().includes(city.toLowerCase())) parts.push(city);
        const country = hotel.realHotel.country || countryEn;
        if (country && !parts.join(', ').toLowerCase().includes(country.toLowerCase())) {
            parts.push(country);
        }
        return parts.join(', ');
    }

    // City/region search only — never prepend "hostel" or stay type (Booking geocodes that badly)
    return buildEnglishLocationLabel(ctx);
}

function invalidateEnrichedCache() {
    hotelState.enrichedCache = null;
    realHotelsCache.key = null;
    realHotelsCache.hotels = [];
}

async function getEnrichedListings(cityCtx, destCode, homeCode) {
    const cityName = cityCtx.name || getActiveCityName('Destination');
    const geoKey = cityCtx.lat != null ? `${Number(cityCtx.lat).toFixed(2)},${Number(cityCtx.lon).toFixed(2)}` : 'noloc';
    const cacheKey = `${cityName}|${destCode}|${homeCode}|${hotelState.checkIn}|${hotelState.checkOut}|${geoKey}`;

    if (hotelState.enrichedCache?.key === cacheKey) {
        return hotelState.enrichedCache.listings;
    }

    let raw = generateStaysForCity(cityName, destCode);

    if (cityCtx.lat != null && cityCtx.lon != null) {
        const realHotels = await fetchRealHotelsNear(
            cityCtx.lat,
            cityCtx.lon,
            cityCtx.country_code || hotelState.city?.country_code || ''
        );
        raw = assignRealHotelsToListings(raw, realHotels, cityCtx);
    }

    const listings = raw.map((h) => enrichListing(h, cityCtx, destCode, homeCode));
    hotelState.enrichedCache = { key: cacheKey, listings };
    return listings;
}

function computeFilterCounts(allListings) {
    const counts = {
        all: allListings.length,
        luxury: 0,
        boutique: 0,
        apartment: 0,
        hostel: 0,
        coliving: 0,
        wifi: 0,
        cafe: 0,
        cowork: 0
    };

    for (const h of allListings) {
        if (counts[h.stayType] != null) counts[h.stayType]++;
        if (h.wifi >= 85) counts.wifi++;
        if (h.cafeDist <= 0.3) counts.cafe++;
        if (h.tags.includes('cowork')) counts.cowork++;
    }

    return counts;
}

function updateFilterCountBadges(counts) {
    document.querySelectorAll('.filter-count[data-count-for]').forEach((el) => {
        const key = el.dataset.countFor;
        const val = counts[key];
        el.textContent = val != null ? String(val) : '0';
    });
}

function updateResultsCount(count, cityLabel) {
    const el = $('resultsCount');
    if (!el) return;
    const city = cityLabel || 'Destination';
    if (typeof t === 'function' && t('hotelShowingStays')) {
        el.textContent = t('hotelShowingStays')(count, city);
    } else {
        el.textContent = `Showing ${count} stays in ${city}`;
    }
}

function syncSortUI() {
    const sortSelect = $('hotelSortSelect');
    if (sortSelect && sortSelect.value !== hotelState.sortBy) {
        sortSelect.value = hotelState.sortBy;
    }

    document.querySelectorAll('.hotel-sort-pill[data-sort]').forEach((pill) => {
        const mapped = SORT_TO_PILL[hotelState.sortBy];
        pill.classList.toggle('active-pill', pill.dataset.sort === mapped);
    });
}

function setSortCriterion(criterion, { fromPill = false } = {}) {
    if (!criterion) return;
    hotelState.sortBy = criterion;

    const sortSelect = $('hotelSortSelect');
    if (sortSelect) sortSelect.value = criterion;

    document.querySelectorAll('.hotel-sort-pill[data-sort]').forEach((pill) => {
        pill.classList.toggle('active-pill', fromPill && pill.dataset.sort === criterion);
        if (!fromPill) {
            const mapped = SORT_TO_PILL[criterion];
            pill.classList.toggle('active-pill', pill.dataset.sort === mapped);
        }
    });

    applyFiltersAndRender({ animate: true });
}

function setViewMode(mode) {
    hotelState.viewMode = mode === 'compact' ? 'compact' : 'grid';
    document.querySelectorAll('.hotel-view-btn[data-view]').forEach((btn) => {
        const active = btn.dataset.view === hotelState.viewMode;
        btn.classList.toggle('hotel-view-btn--active', active);
        btn.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
    const list = $('hotel-list');
    if (list) {
        list.classList.toggle('hotel-list--compact', hotelState.viewMode === 'compact');
    }
    applyFiltersAndRender({ animate: false });
}

function getPriceSliderEl() {
    return $('hotel-price-max');
}

function getPriceSliderMax() {
    const slider = getPriceSliderEl();
    return slider ? parseFloat(slider.max) : 2500;
}

function isPriceFilterActive() {
    const slider = getPriceSliderEl();
    if (!slider || hotelState.maxPrice == null) return false;
    return parseFloat(slider.value) < parseFloat(slider.max);
}

function hashStr(str) {
    let h = 0;
    for (let i = 0; i < str.length; i++) h = ((h << 5) - h) + str.charCodeAt(i) | 0;
    return Math.abs(h);
}

function escapeHtml(str) {
    return String(str ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function formatDateISO(d) {
    return d.toISOString().slice(0, 10);
}

function defaultDates() {
    const inDate = new Date();
    inDate.setDate(inDate.getDate() + 7);
    const outDate = new Date(inDate);
    outDate.setDate(outDate.getDate() + 7);
    return { checkIn: formatDateISO(inDate), checkOut: formatDateISO(outDate) };
}

function buildHotelSelectOptions() {
    if (typeof CURRENCIES === 'undefined') return '';
    const option = ({ code, name }) => `<option value="${code}">${code} — ${name}</option>`;
    const parts = [];
    for (const region of REGION_ORDER) {
        const group = CURRENCIES.filter((c) => c.region === region);
        if (!group.length) continue;
        const label = typeof getRegionLabel === 'function' ? getRegionLabel(region) : region;
        parts.push(`<optgroup label="${label}">`);
        parts.push(...group.map(option));
        parts.push('</optgroup>');
    }
    return parts.join('');
}

function getCityLabel(cityName, country) {
    const name = (cityName || '').trim();
    const c = (country || '').trim();
    if (name && c && !name.includes(c)) return `${name}, ${c}`;
    return name || c || 'Destination';
}

/** Full location context for provider search URLs (region + coordinates from geocoding). */
function getCityBookingContext(city) {
    if (!city) {
        const name = typeof getActiveCityName === 'function' ? getActiveCityName('Destination') : 'Destination';
        return {
            label: name,
            englishLabel: name,
            name,
            country: '',
            country_code: '',
            admin1: '',
            lat: null,
            lon: null
        };
    }
    const parts = [city.name];
    if (city.admin1 && city.admin1 !== city.name) parts.push(city.admin1);
    const country = (city.country || '').trim();
    if (country && !parts.join(', ').includes(country)) parts.push(country);
    const label = city.label && city.label.includes(',') ? city.label : parts.join(', ');
    return {
        label,
        englishLabel: buildEnglishLocationLabel({
            name: city.name,
            admin1: city.admin1 || '',
            country: (city.country || '').trim(),
            country_code: city.country_code || ''
        }),
        name: city.name,
        country: (city.country || '').trim(),
        country_code: city.country_code || '',
        admin1: city.admin1 || '',
        lat: city.lat ?? null,
        lon: city.lon ?? null
    };
}

function buildBookingMapParams(lat, lon, radiusDeg = 0.06) {
    const latN = Number(lat);
    const lonN = Number(lon);
    if (!Number.isFinite(latN) || !Number.isFinite(lonN)) return '';
    return [
        `latitude=${latN}`,
        `longitude=${lonN}`,
        `bounding_box_north=${(latN + radiusDeg).toFixed(5)}`,
        `bounding_box_south=${(latN - radiusDeg).toFixed(5)}`,
        `bounding_box_east=${(lonN + radiusDeg).toFixed(5)}`,
        `bounding_box_west=${(lonN - radiusDeg).toFixed(5)}`,
        'map=1',
        'order=distance_from_search'
    ].join('&');
}

function buildBookingSearchQuery(hotel, cityCtx) {
    const ctx = cityCtx?.label ? cityCtx : getCityBookingContext(cityCtx);
    return getPropertySearchLabel(hotel, ctx);
}

function affiliateQueryParam(paramName, value) {
    if (!value || String(value).startsWith('YOUR_')) return '';
    return `&${paramName}=${encodeURIComponent(value)}`;
}

function buildBookingLinks(hotel, cityCtx, targetCurrency) {
    const ctx = cityCtx?.label ? cityCtx : getCityBookingContext(cityCtx);
    const propertySearch = getPropertySearchLabel(hotel, ctx);
    const searchText = propertySearch;
    const searchQ = encodeURIComponent(searchText);
    const { checkIn, checkOut, guests } = hotelState;
    const cur = targetCurrency || hotelState.destCode || 'USD';
    const cc1 = (ctx.country_code || hotel.realHotel?.countryCode || '').toLowerCase();

    let bookingUrl = `https://www.booking.com/searchresults.en-gb.html?ss=${searchQ}&ssne=${searchQ}&ssne_untouched=${searchQ}&selected_currency=${cur}&lang=en-gb`;

    const pinLat = hotel.hasRealProperty ? hotel.realHotel?.lat : ctx.lat;
    const pinLon = hotel.hasRealProperty ? hotel.realHotel?.lon : ctx.lon;

    if (Number.isFinite(pinLat) && Number.isFinite(pinLon)) {
        bookingUrl += `&latitude=${pinLat}&longitude=${pinLon}`;
        if (!hotel.hasRealProperty) {
            const mapParams = buildBookingMapParams(pinLat, pinLon);
            if (mapParams) bookingUrl += `&${mapParams}`;
        }
    }

    if (cc1) bookingUrl += `&cc1=${cc1}`;

    if (checkIn) bookingUrl += `&checkin=${checkIn}`;
    if (checkOut) bookingUrl += `&checkout=${checkOut}`;
    bookingUrl += `&group_adults=${guests}&no_rooms=1`;
    bookingUrl += affiliateQueryParam('aid', AFFILIATE_IDS.booking);

    const citySearchQ = encodeURIComponent(ctx.englishLabel || buildEnglishLocationLabel(ctx));
    let agodaUrl = `https://www.agoda.com/search?text=${searchQ}&city=${citySearchQ}&currency=${cur}`;
    const agodaLat = hotel.realHotel?.lat ?? ctx.lat;
    const agodaLon = hotel.realHotel?.lon ?? ctx.lon;
    if (agodaLat != null && agodaLon != null) {
        agodaUrl += `&latitude=${agodaLat}&longitude=${agodaLon}`;
    }
    if (checkIn) agodaUrl += `&checkIn=${checkIn}`;
    if (checkOut) agodaUrl += `&checkOut=${checkOut}`;
    agodaUrl += `&adults=${guests}&rooms=1`;
    agodaUrl += affiliateQueryParam('cid', AFFILIATE_IDS.agoda);

    let hotelsComUrl = `https://www.hotels.com/Hotel-Search?destination=${searchQ}&q-destination=${searchQ}`;
    const hLat = hotel.realHotel?.lat ?? ctx.lat;
    const hLon = hotel.realHotel?.lon ?? ctx.lon;
    if (hLat != null && hLon != null) {
        hotelsComUrl += `&lat=${hLat}&lon=${hLon}`;
    }
    if (checkIn) hotelsComUrl += `&startDate=${checkIn}`;
    if (checkOut) hotelsComUrl += `&endDate=${checkOut}`;
    hotelsComUrl += `&rooms=1&adults=${guests}`;
    hotelsComUrl += affiliateQueryParam('MDPCID', AFFILIATE_IDS.hotelscom);

    return {
        booking: bookingUrl,
        agoda: agodaUrl,
        hotelscom: hotelsComUrl,
        searchLabel: searchText
    };
}

function buildProviderUrl(providerId, cityCtx, hotel, targetCurrency = '') {
    const links = buildBookingLinks(hotel, cityCtx, targetCurrency || hotelState.destCode);
    return links[providerId] || links.booking;
}

function generateProviderDeals(hotel, cityCtx, targetCurrency) {
    const seed = hashStr(hotel.name);
    const links = buildBookingLinks(hotel, cityCtx, targetCurrency);
    return PROVIDERS.map((p, i) => {
        const variance = 0.94 + ((seed + i * 17) % 12) / 100;
        const priceLocal = scaleCost(hotel.baseNightly * p.mult * variance);
        return {
            id: p.id,
            name: p.name,
            priceLocal,
            fxFee: p.fxFee,
            url: links[p.id],
            searchLabel: links.searchLabel
        };
    });
}

function calcDailyPppOverhead(destCode) {
    const profile = getPppProfile(destCode);
    if (!profile?.costs) return 0;
    const c = profile.costs;
    return scaleCost(c.coffee + c.fast_meal + c.sitdown_meal + c.local_transport * 2);
}

function calcArbitrageBox(deals, destCode, homeCode) {
    if (!deals.length || !canMarketConvert(destCode, homeCode)) return null;

    const best = deals.reduce((a, b) => (a.priceLocal < b.priceLocal ? a : b));
    const worst = deals.reduce((a, b) => (a.priceLocal > b.priceLocal ? a : b));
    const fxProvider = worst.fxFee > 0 ? worst : best;

    const payLocalAmount = best.priceLocal;
    const platformFeeAmount = payLocalAmount * (1 + fxProvider.fxFee);
    const savedLocal = platformFeeAmount - payLocalAmount;
    const savedHome = converter.convert(savedLocal, destCode, homeCode);

    if (savedHome < 0.5) return null;

    return {
        destCode,
        savedHome,
        savedLocal,
        bestProvider: best.name,
        tip: typeof t === 'function'
            ? t('hotelArbitrage')(formatAmount(savedHome, homeCode), destCode)
            : `Pay in ${destCode} via Wise/Revolut — save ~${formatAmount(savedHome, homeCode)} vs platform FX`
    };
}

function calcWorkabilityScore(hotel) {
    return Math.round(
        hotel.wifi * 0.42 +
        (1 - Math.min(hotel.cafeDist, 1)) * 30 +
        (hotel.tags.includes('cowork') ? 20 : 4) +
        (hotel.checkin24 ? 6 : 0)
    );
}

function calcDiscountPct(deals) {
    if (deals.length < 2) return 0;
    const prices = deals.map((d) => d.priceLocal);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    if (max <= 0) return 0;
    return Math.round(((max - min) / max) * 100);
}

function renderStars(count) {
    return '★'.repeat(count) + '☆'.repeat(Math.max(0, 5 - count));
}

function renderImageCarousel(hotel) {
    return renderImageGallery(hotel);
}

function showHotelListSkeleton() {
    const container = $('hotel-list');
    if (typeof showSkeletonCards === 'function') {
        showSkeletonCards(container, 4, 'skeleton-card skeleton-card--hotel');
    } else if (container) {
        container.innerHTML = `
            <div class="skeleton-card skeleton-card--hotel" aria-hidden="true"><div class="skeleton-card__shimmer"></div></div>
            <div class="skeleton-card skeleton-card--hotel" aria-hidden="true"><div class="skeleton-card__shimmer"></div></div>
            <div class="skeleton-card skeleton-card--hotel" aria-hidden="true"><div class="skeleton-card__shimmer"></div></div>
        `;
    }
}

function syncHotelsFromCity(city) {
    if (!city) return;
    hotelState.city = city;
    invalidateEnrichedCache();
    const cityInput = $('hotel-city-search');
    const destSelect = $('hotel-dest');
    if (cityInput) cityInput.value = city.label || city.name;
    if (city.currency && destSelect) {
        applyCityToCurrencySelect(city, destSelect);
        hotelState.destCode = destSelect.value;
    }
    renderHotelListings();
}

function generateStaysForCity(cityName, destCode) {
    const profile = getPppProfile(destCode);
    if (!profile?.costs) return [];

    const baseNightly = scaleCost(profile.costs.sitdown_meal * 2.2);
    const listings = [];

    for (const [typeKey, typeDef] of Object.entries(STAY_TYPES)) {
        for (const tmpl of STAY_TEMPLATES) {
            const budgetMult = tmpl.suffix === 'Budget Stay' ? 0.78 : 1;
            const nightly = scaleCost(baseNightly * typeDef.mult * budgetMult);
            const reviewScore = Math.min(9.9, tmpl.reviewBase + (typeDef.stars - 3) * 0.15).toFixed(1);

            listings.push({
                id: `${typeKey}-${tmpl.suffix}-${hashStr(cityName)}`,
                name: `${tmpl.suffix} ${typeDef.label}`,
                baseNightly: nightly,
                wifi: tmpl.wifi,
                cafeDist: tmpl.cafeDist,
                checkin24: tmpl.checkin24,
                distCenter: tmpl.distCenter,
                reviewScore,
                stars: typeDef.stars,
                stayType: typeKey,
                tags: [
                    typeDef.tag,
                    ...(tmpl.cowork ? ['cowork'] : []),
                    ...(tmpl.wifi >= 85 ? ['wifi'] : [])
                ],
                estimated: true
            });
        }
    }
    return listings;
}

function enrichListing(hotel, cityCtx, destCode, homeCode) {
    const deals = generateProviderDeals(hotel, cityCtx, destCode);
    const bestDeal = deals.reduce((a, b) => (a.priceLocal < b.priceLocal ? a : b));
    const nightly = bestDeal.priceLocal;
    const overhead = calcDailyPppOverhead(destCode);
    const burn = calcTrueDailyBurn(nightly, destCode, homeCode);
    const totalBurnDest = nightly + overhead;
    let totalBurnHome = totalBurnDest;
    if (canMarketConvert(destCode, homeCode)) {
        totalBurnHome = converter.convert(totalBurnDest, destCode, homeCode);
    }

    return {
        ...hotel,
        deals,
        bestDeal,
        nightly,
        overhead,
        burn: { ...burn, totalDest: totalBurnDest, totalHome: totalBurnHome },
        nomadScore: calcWorkabilityScore(hotel),
        discountPct: calcDiscountPct(deals),
        arbitrage: calcArbitrageBox(deals, destCode, homeCode)
    };
}

function filterListings(listings) {
    let out = listings;

    if (hotelState.stayType !== 'all') {
        out = out.filter((h) => h.stayType === hotelState.stayType);
    }

    if (hotelState.amenities.has('wifi')) out = out.filter((h) => h.wifi >= 85);
    if (hotelState.amenities.has('cafe')) out = out.filter((h) => h.cafeDist <= 0.3);
    if (hotelState.amenities.has('cowork')) out = out.filter((h) => h.tags.includes('cowork'));

    if (isPriceFilterActive()) {
        const cap = hotelState.maxPrice;
        out = out.filter((h) => {
            let val;
            if (hotelState.priceMode === 'burn') {
                val = h.burn?.totalHome ?? h.burn?.totalDest ?? 0;
            } else if (canMarketConvert(hotelState.destCode, hotelState.homeCode)) {
                val = converter.convert(h.nightly, hotelState.destCode, hotelState.homeCode);
            } else {
                val = h.nightly;
            }
            return val <= cap;
        });
    }

    return out;
}

function renderHotelGrid(sorted, destCode, homeCode, cityCtx, { animate = true } = {}) {
    const container = $('hotel-list');
    if (!container) return;

    const compact = hotelState.viewMode === 'compact';
    container.classList.toggle('hotel-list--compact', compact);

    if (!sorted.length) {
        container.innerHTML = `<p class="hotel-empty">${typeof t === 'function' ? t('hotelNoFilterMatch') : 'No stays match your filters.'}</p>`;
        container.classList.remove('fade-in');
        return;
    }

    container.innerHTML = sorted
        .map((h) => renderHotelCard(h, destCode, homeCode, cityCtx, compact))
        .join('');

    if (animate) {
        container.classList.remove('fade-in');
        void container.offsetWidth;
        container.classList.add('fade-in');
    }

    initBookingLinkHandlers();
}

function applyFiltersAndRender({ animate = true } = {}) {
    const container = $('hotel-list');
    if (!container) return;

    const run = async () => {
        try {
            const cityCtx = getCityBookingContext(hotelState.city);
            const destCode = hotelState.destCode;
            const homeCode = hotelState.homeCode;

            if (!destCode) {
                container.innerHTML = `<p class="hotel-empty">${typeof t === 'function' ? t('hotelNoData') : 'Select a destination currency.'}</p>`;
                updateResultsCount(0, cityCtx.label);
                updateFilterCountBadges(computeFilterCounts([]));
                renderResultsMeta(0, cityCtx.label);
                return;
            }

            if (!hotelState.enrichedCache?.listings?.length && cityCtx.lat != null) {
                showHotelListSkeleton();
            }

            const enriched = await getEnrichedListings(cityCtx, destCode, homeCode);
            if (!enriched.length) {
                container.innerHTML = `<p class="hotel-empty">${typeof t === 'function' ? t('hotelNoData') : 'Stay estimates unavailable for this currency.'}</p>`;
                updateResultsCount(0, cityCtx.label);
                updateFilterCountBadges(computeFilterCounts([]));
                renderResultsMeta(0, cityCtx.label);
                return;
            }

            updateFilterCountBadges(computeFilterCounts(enriched));

            const filtered = filterListings(enriched);
            const sorted = sortHotels(hotelState.sortBy, filtered);

            updateResultsCount(sorted.length, cityCtx.label);
            renderResultsMeta(sorted.length, cityCtx.label);
            syncSortUI();
            renderHotelGrid(sorted, destCode, homeCode, cityCtx, { animate });
        } catch (err) {
            console.error('applyFiltersAndRender:', err);
            container.innerHTML = `<p class="hotel-empty">${typeof t === 'function' ? t('hotelRenderError') : 'Could not load stays. Try refreshing the page.'}</p>`;
        }
    };

    run();
}

function renderHotelListings() {
    applyFiltersAndRender({ animate: true });
}

function renderBookingActions(deals, bestId, destCode, homeCode, cityCtx, hotel) {
    const bestLabel = typeof t === 'function' ? t('hotelBestDeal') : 'Best Deal';
    const bookBooking = typeof t === 'function' ? t('hotelBookBooking') : 'Book on Booking.com';
    const bookAgoda = typeof t === 'function' ? t('hotelBookAgoda') : 'Agoda';
    const bookHotels = typeof t === 'function' ? t('hotelBookHotels') : 'Hotels.com';
    const compareTitle = typeof t === 'function' ? t('hotelCompareDeals') : 'Compare deals';
    const ctx = cityCtx?.label ? cityCtx : getCityBookingContext(cityCtx);
    const propertyName = hotel?.realHotel?.name || getPropertySearchLabel(hotel, ctx);
    const searchHint = hotel?.hasRealProperty
        ? (typeof t === 'function' ? t('hotelBookPropertyHint')(propertyName) : `Opens ${propertyName} on Booking.com · price is a PPP estimate`)
        : (typeof t === 'function' ? t('hotelBookSearchHint')(ctx.label) : `Opens map search near ${ctx.label} · card name is a PPP estimate`);

    const bookingDeal = deals.find((d) => d.id === 'booking') || deals[0];
    const agodaDeal = deals.find((d) => d.id === 'agoda');
    const hotelsDeal = deals.find((d) => d.id === 'hotelscom');

    const priceBadge = (deal) => {
        if (!deal) return '';
        const isBest = deal.id === bestId;
        const priceHome = canMarketConvert(destCode, homeCode)
            ? formatAmount(converter.convert(deal.priceLocal, destCode, homeCode), homeCode)
            : '';
        return `
            <span class="hotel-price-badge${isBest ? ' hotel-price-badge--best' : ''}" title="${escapeHtml(deal.name)}">
                <span class="hotel-price-badge__provider">${escapeHtml(deal.name)}</span>
                ${isBest ? `<em>${bestLabel}</em>` : ''}
                <strong>${formatAmount(deal.priceLocal, destCode)}</strong>
                ${priceHome ? `<small>≈ ${priceHome}</small>` : ''}
            </span>
        `;
    };

    return `
        <div class="hotel-book-actions">
            <p class="hotel-book-actions__title">${compareTitle}</p>
            <div class="hotel-book-actions__prices">
                ${deals.map((d) => priceBadge(d)).join('')}
            </div>
            <p class="hotel-book-actions__hint">${escapeHtml(searchHint)}</p>
            <div class="hotel-book-actions__buttons">
                <a href="${bookingDeal?.url || '#'}"
                    class="hotel-book-link hotel-book-link--primary"
                    target="_blank"
                    rel="noopener noreferrer"
                    data-provider="Booking.com"
                    aria-label="${escapeHtml(bookBooking)}">
                    🔗 ${bookBooking}
                </a>
                <div class="hotel-book-actions__secondary">
                    ${agodaDeal ? `
                        <a href="${agodaDeal.url}"
                            class="hotel-book-link hotel-book-link--secondary"
                            target="_blank"
                            rel="noopener noreferrer"
                            data-provider="Agoda"
                            aria-label="${escapeHtml(bookAgoda)}">
                            ${bookAgoda}
                            <span class="hotel-book-link__price">${formatAmount(agodaDeal.priceLocal, destCode)}</span>
                        </a>
                    ` : ''}
                    ${hotelsDeal ? `
                        <a href="${hotelsDeal.url}"
                            class="hotel-book-link hotel-book-link--secondary"
                            target="_blank"
                            rel="noopener noreferrer"
                            data-provider="Hotels.com"
                            aria-label="${escapeHtml(bookHotels)}">
                            ${bookHotels}
                            <span class="hotel-book-link__price">${formatAmount(hotelsDeal.priceLocal, destCode)}</span>
                        </a>
                    ` : ''}
                </div>
            </div>
        </div>
    `;
}

function initBookingLinkHandlers() {
    const list = $('hotel-list');
    if (!list || list.dataset.bookHandlers) return;
    list.dataset.bookHandlers = '1';

    list.addEventListener('click', (e) => {
        const link = e.target.closest('.hotel-book-link');
        if (!link || !link.href || link.href.endsWith('#')) return;

        e.stopPropagation();

        link.classList.add('hotel-book-link--pressed');
        window.setTimeout(() => link.classList.remove('hotel-book-link--pressed'), 280);

        if (typeof Toast !== 'undefined' && Toast.info) {
            const msg = typeof t === 'function'
                ? t('toastBookingRedirect')
                : 'Redirecting to external booking provider…';
            Toast.info(msg);
        }
    });
}

function renderHotelCard(hotel, destCode, homeCode, cityCtx, compact = false) {
    const typeIcon = STAY_TYPES[hotel.stayType]?.icon || '🏨';
    const distLabel = typeof t === 'function' ? t('hotelFromCenter') : 'from center';
    const compactClass = compact ? ' hotel-card--compact' : '';

    const arbHtml = hotel.arbitrage && !compact
        ? `<div class="hotel-arbitrage hotel-arbitrage--box">
            <span class="hotel-arbitrage__icon">💳</span>
            <div>
                <strong>${typeof t === 'function' ? t('hotelArbitrageTitle') : 'Currency Arbitrage Tip'}</strong>
                <p>${escapeHtml(hotel.arbitrage.tip)}</p>
            </div>
           </div>`
        : '';

    const bookUrl = hotel.deals?.find((d) => d.id === 'booking')?.url || hotel.deals?.[0]?.url || '#';
    const bookingBlock = compact
        ? `<a href="${bookUrl}"
            class="hotel-book-link hotel-book-link--compact"
            target="_blank" rel="noopener noreferrer"
            data-provider="Booking.com">🔗 ${typeof t === 'function' ? t('hotelViewDeal') : 'View deal'}</a>`
        : renderBookingActions(hotel.deals, hotel.bestDeal.id, destCode, homeCode, cityCtx, hotel);

    return `
        <article class="hotel-card hotel-card--trivago${compactClass} fade-in-item">
            <div class="hotel-card__media">
                ${renderImageCarousel(hotel)}
                <span class="hotel-card__nomad-badge">${typeof t === 'function' ? t('hotelNomadBadge')(hotel.nomadScore) : `${hotel.nomadScore}/100 nomad`}</span>
            </div>
            <div class="hotel-card__body">
                <header class="hotel-card__header">
                    <div>
                        <h3 class="hotel-card__name">${typeIcon} ${escapeHtml(hotel.name)}</h3>
                        <div class="hotel-card__meta">
                            <span class="hotel-card__stars">${renderStars(hotel.stars)}</span>
                            <span class="hotel-card__review">${hotel.reviewScore}/10 ${typeof t === 'function' ? t('hotelReviews') : 'reviews'}</span>
                            <span class="hotel-card__dist">📍 ${hotel.distCenter} km ${distLabel}</span>
                        </div>
                    </div>
                    ${hotel.discountPct > 5 ? `<span class="hotel-card__discount">-${hotel.discountPct}%</span>` : ''}
                </header>

                ${compact ? '' : `
                <div class="hotel-card__tags">
                    ${hotel.hasRealProperty
                        ? `<span class="hotel-tag hotel-tag--real">${typeof t === 'function' ? t('hotelRealProperty') : 'Real property'}</span>`
                        : `<span class="hotel-tag hotel-tag--est">${typeof t === 'function' ? t('hotelEstimated') : 'PPP estimate'}</span>`}
                    ${hotel.wifi >= 85 ? `<span class="hotel-tag hotel-tag--wifi">${typeof t === 'function' ? t('hotelTagWifi') : '📶 Wi-Fi Verified'}</span>` : ''}
                    ${hotel.cafeDist <= 0.3 ? `<span class="hotel-tag">${typeof t === 'function' ? t('hotelTagCoffee')(hotel.cafeDist) : `☕ Coffee ${hotel.cafeDist} km`}</span>` : ''}
                    ${hotel.tags.includes('cowork') ? `<span class="hotel-tag">${typeof t === 'function' ? t('hotelTagCowork') : '💻 Cowork nearby'}</span>` : ''}
                </div>`}

                <div class="hotel-true-burn${compact ? ' hotel-true-burn--compact' : ''}">
                    <div class="hotel-true-burn__hero">
                        <span class="hotel-true-burn__label">🔥 ${typeof t === 'function' ? t('hotelTrueBurn') : 'Total Daily Burn'}</span>
                        <strong class="hotel-true-burn__value">
                            ${formatAmount(hotel.burn.totalDest, destCode)}
                            <span class="hotel-true-burn__home">≈ ${formatAmount(hotel.burn.totalHome, homeCode)}${typeof t === 'function' ? t('hotelPerDay') : '/day'}</span>
                        </strong>
                    </div>
                    ${compact ? '' : `
                    <div class="hotel-true-burn__breakdown">
                        <div class="hotel-burn-chip">
                            <span>🛏️ ${typeof t === 'function' ? t('hotelRoomRate') : 'Room'}</span>
                            <strong>${formatAmount(hotel.nightly, destCode)}</strong>
                        </div>
                        <span class="hotel-burn-plus">+</span>
                        <div class="hotel-burn-chip">
                            <span>🍜 ${typeof t === 'function' ? t('hotelDailyOverhead') : 'Daily living'}</span>
                            <strong>${formatAmount(hotel.overhead, destCode)}</strong>
                        </div>
                    </div>`}
                </div>

                ${bookingBlock}
                ${arbHtml}
            </div>
        </article>
    `;
}

function updatePriceSliderLabel() {
    const priceVal = $('hotel-price-val');
    if (!priceVal) return;
    const sym = hotelState.homeCode || 'NOK';
    if (!isPriceFilterActive()) {
        priceVal.textContent = typeof t === 'function' ? t('hotelPriceAll') : 'All';
        return;
    }
    priceVal.textContent = `${hotelState.maxPrice} ${sym}`;
}

function renderResultsMeta(count, cityName) {
    const meta = $('hotel-results-meta');
    if (!meta) return;
    const nights = hotelState.checkIn && hotelState.checkOut
        ? Math.max(1, Math.round((new Date(hotelState.checkOut) - new Date(hotelState.checkIn)) / 86400000))
        : 7;
    meta.innerHTML = `
        <span>${count} ${typeof t === 'function' ? t('hotelResultsCount') : 'stays'} · ${escapeHtml(cityName)}</span>
        <span>${hotelState.guests} ${typeof t === 'function' ? t('hotelGuests') : 'guests'} · ${nights} ${typeof t === 'function' ? t('hotelNights') : 'nights'} · ${escapeHtml(getSortLabel(hotelState.sortBy))}</span>
    `;
}

function getSortLabel(criterion) {
    const labels = {
        burn_asc: typeof t === 'function' ? t('hotelSortBurnAsc') : 'Lowest True Daily Burn',
        price_asc: typeof t === 'function' ? t('hotelSortPriceAsc') : 'Lowest Nightly Rate',
        price_desc: typeof t === 'function' ? t('hotelSortPriceDesc') : 'Luxury First',
        rating_desc: typeof t === 'function' ? t('hotelSortRatingDesc') : 'Top Rated',
        discount_desc: typeof t === 'function' ? t('hotelSortDiscountDesc') : 'Best Discount',
        distance_asc: typeof t === 'function' ? t('hotelSortDistanceAsc') : 'Closest to Center',
        nomad_score: typeof t === 'function' ? t('hotelSortNomadScore') : 'Nomad Score',
        recommendation: typeof t === 'function' ? t('hotelSortRecommend') : 'Our Recommendation'
    };
    return labels[criterion] || labels.burn_asc;
}

function initHotelsPage() {
    const list = $('hotel-list');
    if (!list) return;

    const destSelect = $('hotel-dest');
    const homeSelect = $('hotel-home');
    const cityInput = $('hotel-city-search');
    const cityList = $('hotel-city-suggestions');
    const priceSlider = $('hotel-price-max');
    const checkIn = $('hotel-checkin');
    const checkOut = $('hotel-checkout');
    const guestsSel = $('hotel-guests');
    const sortSelect = $('hotelSortSelect');

    const dates = defaultDates();
    hotelState.checkIn = dates.checkIn;
    hotelState.checkOut = dates.checkOut;
    if (checkIn) checkIn.value = dates.checkIn;
    if (checkOut) checkOut.value = dates.checkOut;

    const options = buildHotelSelectOptions();
    if (destSelect && homeSelect && options) {
        destSelect.innerHTML = options;
        homeSelect.innerHTML = options;
        homeSelect.value = 'NOK';
        destSelect.value = 'JPY';
        hotelState.homeCode = 'NOK';
        hotelState.destCode = 'JPY';
    }

    if (cityInput && cityList) {
        initCitySearch({
            inputEl: cityInput,
            listEl: cityList,
            debounceMs: 300,
            onSelect(city) {
                syncHotelsFromCity(city);
                if (typeof Toast !== 'undefined' && Toast.info) {
                    const msg = typeof t === 'function'
                        ? t('toastCitySynced')(city.name, city.currency || hotelState.destCode)
                        : `Synced: ${city.name}`;
                    Toast.info(msg);
                }
            },
            onClear() {
                hotelState.city = null;
                invalidateEnrichedCache();
                applyFiltersAndRender({ animate: true });
            }
        });
        const saved = CityContext.get();
        if (saved) syncHotelsFromCity(saved);
    }

    if (typeof CityContext !== 'undefined') {
        CityContext.onChange((city) => {
            if (city && $('hotel-city-search')) {
                syncHotelsFromCity(city);
            }
        });
    }

    bind(destSelect, 'change', () => {
        if (!destSelect) return;
        hotelState.destCode = destSelect.value;
        invalidateEnrichedCache();
        applyFiltersAndRender({ animate: true });
    });
    bind(homeSelect, 'change', () => {
        if (!homeSelect) return;
        hotelState.homeCode = homeSelect.value;
        invalidateEnrichedCache();
        updatePriceSliderLabel();
        applyFiltersAndRender({ animate: true });
    });

    bind(checkIn, 'change', () => {
        if (!checkIn) return;
        hotelState.checkIn = checkIn.value;
        invalidateEnrichedCache();
        applyFiltersAndRender({ animate: false });
    });
    bind(checkOut, 'change', () => {
        if (!checkOut) return;
        hotelState.checkOut = checkOut.value;
        invalidateEnrichedCache();
        applyFiltersAndRender({ animate: false });
    });
    bind(guestsSel, 'change', () => {
        if (!guestsSel) return;
        hotelState.guests = parseInt(guestsSel.value, 10) || 2;
        applyFiltersAndRender({ animate: false });
    });

    bind(sortSelect, 'change', () => {
        if (!sortSelect) return;
        setSortCriterion(sortSelect.value, { fromPill: false });
    });

    document.querySelectorAll('.hotel-sort-pill[data-sort]').forEach((pill) => {
        pill.addEventListener('click', () => {
            setSortCriterion(pill.dataset.sort, { fromPill: true });
        });
    });

    document.querySelectorAll('.hotel-view-btn[data-view]').forEach((btn) => {
        btn.addEventListener('click', () => setViewMode(btn.dataset.view));
    });

    document.querySelectorAll('[data-stay-type]').forEach((btn) => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('[data-stay-type]').forEach((b) => b.classList.remove('hotel-filter--active'));
            btn.classList.add('hotel-filter--active');
            hotelState.stayType = btn.dataset.stayType;
            applyFiltersAndRender({ animate: true });
        });
    });

    document.querySelectorAll('[data-amenity]').forEach((input) => {
        input.addEventListener('change', () => {
            const key = input.dataset.amenity;
            if (input.checked) hotelState.amenities.add(key);
            else hotelState.amenities.delete(key);
            applyFiltersAndRender({ animate: true });
        });
    });

    document.querySelectorAll('[data-price-mode]').forEach((btn) => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('[data-price-mode]').forEach((b) => b.classList.remove('hotel-slider-mode__btn--active'));
            btn.classList.add('hotel-slider-mode__btn--active');
            hotelState.priceMode = btn.dataset.priceMode;
            if (priceSlider) {
                if (hotelState.priceMode === 'burn') {
                    priceSlider.min = '50';
                    priceSlider.max = '2500';
                } else {
                    priceSlider.min = '20';
                    priceSlider.max = '800';
                }
                priceSlider.value = priceSlider.max;
                hotelState.maxPrice = parseFloat(priceSlider.max);
            }
            updatePriceSliderLabel();
            applyFiltersAndRender({ animate: true });
        });
    });

    if (priceSlider) {
        priceSlider.min = '50';
        priceSlider.max = '2500';
        priceSlider.value = priceSlider.max;
        hotelState.maxPrice = parseFloat(priceSlider.max);
    }

    bind(priceSlider, 'input', () => {
        if (!priceSlider) return;
        hotelState.maxPrice = parseFloat(priceSlider.value);
        updatePriceSliderLabel();
        applyFiltersAndRender({ animate: true });
    });

    updatePriceSliderLabel();
    initBookingLinkHandlers();
    syncSortUI();
    applyFiltersAndRender({ animate: false });

    fetchLiveFxRates({ silent: true })
        .then((result) => {
            if (!result.ok && typeof Toast !== 'undefined') {
                Toast.warn(typeof t === 'function' ? t('toastFxFallback') : 'Using cached exchange rates.');
            }
            invalidateEnrichedCache();
            applyFiltersAndRender({ animate: true });
        })
        .catch(() => {
            invalidateEnrichedCache();
            applyFiltersAndRender({ animate: false });
        });
}

function onLanguageChange() {
    updatePriceSliderLabel();
    if (hotelState.enrichedCache?.listings?.length || hotelState.destCode) {
        applyFiltersAndRender({ animate: false });
    }
}
