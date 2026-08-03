/**
 * Retention Engine — Fair Price Radar, Microclimate Shield, Packing Matrix
 */
const FAIR_PRICE_UNITS = [
    { key: 'coffee', icon: '☕', taxiKm: false },
    { key: 'local_transport', icon: '🚕', taxiKm: true, perKm: 0.5 },
    { key: 'sitdown_meal', icon: '🍽️', taxiKm: false },
    { key: 'day_pass_coworking', icon: '💻', taxiKm: false }
];

const SCAM_ALERTS = {
    default: ['Avoid unmetered taxis — agree fare or use ride-hail apps.', 'Decline DCC when paying by card in your home currency.'],
    TH: ['Tuk-tuk "closed temple" redirect scams are common near tourist zones.', 'Always use metered taxis or Grab in Bangkok.'],
    JP: ['Taxi doors open automatically — no tip expected or required.', 'Rush-hour taxi flag-drop fees can spike fares 20%+.'],
    TR: ['Verify restaurant bill math — occasional tourist markup on menus.', 'Taxi meter should start at base fare; refuse "flat tourist rate".'],
    EG: ['Confirm taxi meter is running before departure.', 'Baksheesh is expected for small services — not for basic taxi rides.'],
    MX: ['Use official airport taxi booths, not curbside solicitors.', 'Check Uber/DiDi price vs cash taxi before long rides.'],
    FR: ['Café terrace prices differ from bar counter — check menu location.', 'Restaurant service compris — extra tip optional.'],
    US: ['Surge pricing on ride-hail during events — compare upfront fares.', 'Sales tax added at checkout, not on menu.'],
    NO: ['Norway taxi km rates are among Europe\'s highest — consider public transit.', 'No tipping required; rounding up is polite.']
};

const EMERGENCY_NUMBERS = {
    default: { police: '112', ambulance: '112', fire: '112' },
    US: { police: '911', ambulance: '911', fire: '911' },
    JP: { police: '110', ambulance: '119', fire: '119' },
    TH: { police: '191', ambulance: '1669', fire: '199' },
    GB: { police: '999', ambulance: '999', fire: '999' },
    DE: { police: '110', ambulance: '112', fire: '112' },
    FR: { police: '17', ambulance: '15', fire: '18' },
    AU: { police: '000', ambulance: '000', fire: '000' },
    NO: { police: '112', ambulance: '113', fire: '110' },
    IN: { police: '100', ambulance: '102', fire: '101' },
    BR: { police: '190', ambulance: '192', fire: '193' },
    MX: { police: '911', ambulance: '911', fire: '911' }
};

const TRANSLATION_CHEATS = {
    default: [
        { phrase: 'How much?', local: 'How much does this cost?' },
        { phrase: 'Too expensive', local: 'That is too expensive for me.' },
        { phrase: 'Help', local: 'I need help, please.' }
    ],
    JP: [
        { phrase: 'How much?', local: 'いくらですか (Ikura desu ka?)' },
        { phrase: 'Thank you', local: 'ありがとう (Arigatō)' },
        { phrase: 'Check please', local: 'お会計お願いします (Okaikei onegaishimasu)' }
    ],
    TH: [
        { phrase: 'How much?', local: 'เท่าไหร่ (Tao rai?)' },
        { phrase: 'Too expensive', local: 'แพงไป (Phaeng pai)' },
        { phrase: 'Thank you', local: 'ขอบคุณ (Khob khun)' }
    ],
    ES: [
        { phrase: 'How much?', local: '¿Cuánto cuesta?' },
        { phrase: 'Check please', local: 'La cuenta, por favor.' }
    ],
    FR: [
        { phrase: 'How much?', local: 'C\'est combien ?' },
        { phrase: 'Check please', local: 'L\'addition, s\'il vous plaît.' }
    ]
};

const RetentionEngine = {
    _weatherExt: null,
    _weatherKey: null,

    calcFairPriceIndex(homeCode, destCode) {
        const homeProfile = typeof getAdjustedPppProfile === 'function'
            ? getAdjustedPppProfile(homeCode)
            : getPppProfile(homeCode);
        const destProfile = typeof getAdjustedPppProfile === 'function'
            ? getAdjustedPppProfile(destCode)
            : getPppProfile(destCode);
        if (!homeProfile?.costs || !destProfile?.costs) return null;

        const items = FAIR_PRICE_UNITS.map((unit) => {
            const homeBase = homeProfile.costs[unit.key] || 0;
            let destLocal = destProfile.costs[unit.key] || 0;
            if (unit.taxiKm && unit.perKm) destLocal *= unit.perKm;

            let destInHome = destLocal;
            if (typeof converter !== 'undefined' && canMarketConvert(destCode, homeCode)) {
                destInHome = converter.convert(destLocal, destCode, homeCode);
            }

            const fairDeltaPct = homeBase > 0 ? ((destInHome - homeBase) / homeBase) * 100 : 0;
            let verdict = 'fair';
            if (fairDeltaPct <= -12) verdict = 'bargain';
            else if (fairDeltaPct >= 18) verdict = 'ripoff';
            else if (fairDeltaPct >= 8) verdict = 'premium';

            return {
                key: unit.key,
                icon: unit.icon,
                homeBase,
                destLocal,
                destInHome,
                fairDeltaPct,
                verdict
            };
        });

        const avgDelta = items.reduce((s, i) => s + i.fairDeltaPct, 0) / items.length;
        const ripoffCount = items.filter((i) => i.verdict === 'ripoff' || i.verdict === 'premium').length;
        const fairIndex = Math.max(0, Math.min(100, Math.round(100 - avgDelta)));

        return { items, fairIndex, avgDelta, ripoffCount, homeCode, destCode };
    },

    getTippingScamAlerts(destCode, countryCode) {
        const meta = typeof getSurvivalMeta === 'function' ? getSurvivalMeta(destCode) : null;
        const cc = (countryCode || '').toUpperCase();
        const scams = [...(SCAM_ALERTS[cc] || SCAM_ALERTS.default)];
        const tippingKey = meta?.tipping || 'optional';
        return { tipping: tippingKey, scams, meta };
    },

    calcActivityFeasibilityScore(wx) {
        if (!wx?.current) return { score: 0, breakdown: {} };

        const temp = wx.current.temp ?? 20;
        const rain = wx.current.rain ?? wx.daily?.rainProb ?? 0;
        const humidity = wx.current.humidity ?? 50;
        const uv = wx.current.uv ?? wx.daily?.uvMax ?? 0;
        const wind = wx.current.wind ?? 0;

        const tempScore = temp >= 18 && temp <= 28 ? 100 : temp >= 12 && temp <= 32 ? 70 : temp >= 5 && temp <= 35 ? 40 : 15;
        const rainScore = Math.max(0, 100 - rain * 1.2);
        const humidityScore = humidity >= 35 && humidity <= 65 ? 100 : humidity <= 80 ? 70 : 45;
        const uvScore = uv <= 6 ? 100 : uv <= 8 ? 65 : 30;
        const windScore = wind <= 25 ? 100 : wind <= 40 ? 60 : 25;

        const score = Math.round(
            tempScore * 0.3 + rainScore * 0.25 + humidityScore * 0.15 + uvScore * 0.15 + windScore * 0.15
        );

        return { score, breakdown: { tempScore, rainScore, humidityScore, uvScore, windScore }, temp, rain, humidity, uv, wind };
    },

    detectMicroclimateAlerts(wx) {
        const alerts = [];
        if (!wx?.hourly?.time?.length) return alerts;

        const { time, temp, wind, rainProb } = wx.hourly;
        for (let i = 1; i < Math.min(time.length, 24); i++) {
            const drop = (temp[i - 1] ?? 0) - (temp[i] ?? 0);
            const windJump = (wind[i] ?? 0) - (wind[i - 1] ?? 0);
            if (drop >= 3) {
                alerts.push({
                    type: 'temp-drop',
                    hour: time[i],
                    message: typeof t === 'function'
                        ? t('retentionMicroTempDrop')(drop.toFixed(1), time[i]?.slice(11, 16) || '')
                        : `Sudden ${drop.toFixed(1)}°C drop around ${time[i]?.slice(11, 16)} — layer up if heading to higher elevation or coast.`
                });
            }
            if (windJump >= 12) {
                alerts.push({
                    type: 'wind-shift',
                    hour: time[i],
                    message: typeof t === 'function'
                        ? t('retentionMicroWindShift')(wind[i]?.toFixed(0), time[i]?.slice(11, 16) || '')
                        : `Coastal wind shift to ${wind[i]?.toFixed(0)} km/h near ${time[i]?.slice(11, 16)} — hold loose items & umbrellas.`
                });
            }
            if ((rainProb[i] ?? 0) >= 70 && (rainProb[i - 1] ?? 0) < 40) {
                alerts.push({
                    type: 'rain-burst',
                    hour: time[i],
                    message: typeof t === 'function'
                        ? t('retentionMicroRainBurst')(time[i]?.slice(11, 16) || '')
                        : `Rain shield: downpour likely around ${time[i]?.slice(11, 16)}.`
                });
            }
        }
        return alerts.slice(0, 3);
    },

    calcBestOutdoorWindow(wx) {
        if (!wx?.hourly?.time?.length) return null;

        const { time, temp, rainProb, uv, wind } = wx.hourly;
        let bestStart = 0;
        let bestScore = -1;

        for (let i = 0; i < time.length - 1; i++) {
            const hourScore = (idx) => {
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

        const startLabel = time[bestStart]?.slice(11, 16) || '—';
        const endLabel = time[bestStart + 1]?.slice(11, 16) || '—';
        return { start: startLabel, end: endLabel, startIdx: bestStart, score: Math.round(bestScore / 2) };
    },

    generatePackingList(destCode, durationDays, weatherForecast, options = {}) {
        const tier = options.travelStyle || (typeof getTravelStyleTier === 'function' ? getTravelStyleTier() : 'nomad');
        const wx = weatherForecast || this._weatherExt;
        const temp = wx?.current?.temp ?? wx?.daily?.high ?? 22;
        const rain = wx?.daily?.rainProb ?? wx?.current?.rain ?? 0;
        const uv = wx?.daily?.uvMax ?? wx?.current?.uv ?? 0;
        const wind = wx?.current?.wind ?? 0;
        const days = Math.max(1, Math.min(90, durationDays || 7));

        const essentials = ['Passport + digital copy', 'Universal power adapter', 'Portable charger'];
        const clothing = [];
        const gear = [];

        if (temp >= 26) {
            clothing.push('Light breathable shirts', 'Shorts / linen pants', 'Sandals + walking shoes');
            gear.push('SPF 50 sunscreen', 'Sunglasses', 'Refillable water bottle');
        } else if (temp >= 15) {
            clothing.push('Layered tops', 'Light jacket', 'Comfortable walking shoes');
            gear.push('Compact umbrella');
        } else {
            clothing.push('Thermal base layer', 'Insulated jacket', 'Waterproof boots');
            gear.push('Gloves', 'Beanie');
        }

        if (rain >= 40) {
            clothing.push('Packable rain shell');
            gear.push('Waterproof phone pouch', 'Quick-dry towel');
        }
        if (uv >= 6) gear.push('Wide-brim hat', 'UV-blocking sleeves');
        if (wind >= 25) gear.push('Windbreaker', 'Hair tie / cap strap');

        if (tier === 'backpacker') {
            gear.push('Pack lock', 'Microfiber towel', 'Earplugs');
        } else if (tier === 'luxury') {
            clothing.push('Smart casual outfit', 'Dress shoes');
            gear.push('Noise-cancelling headphones', 'Portable steamer');
        } else {
            gear.push('Laptop + sleeve', 'Day backpack', 'Noise-cancelling earbuds');
        }

        if (days >= 14) clothing.push(`Extra underwear × ${Math.ceil(days / 7)}`, 'Laundry soap sheets');
        if (days >= 7) gear.push('Mini first-aid kit');

        return {
            destination: destCode,
            durationDays: days,
            clothing: [...new Set(clothing)],
            gear: [...new Set(gear)],
            essentials: [...new Set(essentials)],
            updatedAt: new Date().toISOString()
        };
    },

    async fetchExtendedWeather(lat, lon) {
        const key = `${lat},${lon}`;
        if (this._weatherKey === key && this._weatherExt?.ok) return this._weatherExt;
        const data = typeof fetchWeatherExtended === 'function'
            ? await fetchWeatherExtended(lat, lon, { silent: true })
            : { ok: false };
        if (data.ok) {
            this._weatherKey = key;
            this._weatherExt = data;
        }
        return data;
    },

    renderRipOffRadar(from, to, countryCode) {
        const card = document.getElementById('ripoff-radar-card');
        if (!card) return null;

        const fair = this.calcFairPriceIndex(from, to);
        if (!fair) {
            card.hidden = true;
            return null;
        }
        card.hidden = false;

        const indexEl = document.getElementById('fair-price-index');
        const listEl = document.getElementById('fair-price-list');
        const alertEl = document.getElementById('tipping-scam-alert');
        const units = typeof getUnitLabels === 'function' ? getUnitLabels() : {};

        if (indexEl) {
            indexEl.textContent = `${fair.fairIndex}`;
            indexEl.className = `fair-price-index fair-price-index--${fair.fairIndex >= 75 ? 'good' : fair.fairIndex >= 50 ? 'fair' : 'warn'}`;
        }

        if (listEl) {
            listEl.innerHTML = fair.items.map((item) => {
                const label = units[item.key] || item.key;
                const destStr = formatAmount(item.destLocal, to);
                const delta = item.fairDeltaPct;
                const sign = delta >= 0 ? '+' : '';
                return `
                    <div class="fair-price-row fair-price-row--${item.verdict}">
                        <span>${item.icon} ${label}</span>
                        <span>${destStr}</span>
                        <span class="fair-price-row__delta">${sign}${delta.toFixed(0)}%</span>
                    </div>`;
            }).join('');
        }

        const tipData = this.getTippingScamAlerts(to, countryCode);
        if (alertEl) {
            const tipLabel = typeof t === 'function' ? (t(`tipping_${tipData.tipping}`) || tipData.tipping) : tipData.tipping;
            alertEl.innerHTML = `
                <p class="tipping-scam-alert__tip"><strong>${typeof t === 'function' ? t('retentionTippingLabel') : 'Tipping'}:</strong> ${tipLabel}</p>
                <ul class="tipping-scam-alert__list">${tipData.scams.map((s) => `<li>${s}</li>`).join('')}</ul>`;
        }

        return fair;
    },

    renderMicroclimateShield(wx, timezone) {
        const card = document.getElementById('microclimate-card');
        if (!card) return;
        if (!wx?.ok) {
            card.hidden = true;
            return;
        }
        card.hidden = false;

        const activity = this.calcActivityFeasibilityScore(wx);
        const best = this.calcBestOutdoorWindow(wx);
        const micro = this.detectMicroclimateAlerts(wx);

        const scoreEl = document.getElementById('activity-feasibility-score');
        const scoreFill = document.getElementById('activity-score-fill');
        if (scoreEl) scoreEl.textContent = `${activity.score}`;
        if (scoreFill) scoreFill.style.width = `${activity.score}%`;

        const metricsEl = document.getElementById('microclimate-metrics');
        if (metricsEl) {
            metricsEl.innerHTML = `
                <span>🌡 ${Math.round(activity.temp)}°C</span>
                <span>💧 ${Math.round(activity.humidity)}%</span>
                <span>🌧 ${Math.round(activity.rain)}%</span>
                <span>☀️ UV ${activity.uv.toFixed(1)}</span>
                <span>💨 ${Math.round(activity.wind)} km/h</span>`;
        }

        const windowEl = document.getElementById('best-window-slot');
        if (windowEl && best) {
            windowEl.textContent = typeof t === 'function'
                ? t('retentionBestWindow')(best.start, best.end)
                : `Best outdoor window: ${best.start} – ${best.end}`;
        }

        const alertsEl = document.getElementById('microclimate-alerts');
        if (alertsEl) {
            alertsEl.innerHTML = micro.length
                ? micro.map((a) => `<p class="microclimate-alert microclimate-alert--${a.type}">${a.message}</p>`).join('')
                : `<p class="microclimate-alert microclimate-alert--clear">${typeof t === 'function' ? t('retentionMicroClear') : 'No sudden microclimate shifts detected in the next 24h.'}</p>`;
        }
    },

    renderPackingMatrix(destCode, durationDays, wx) {
        const card = document.getElementById('packing-matrix-card');
        if (!card) return null;
        if (!destCode) {
            card.hidden = true;
            return null;
        }
        card.hidden = false;

        const list = this.generatePackingList(destCode, durationDays, wx);
        const clothingEl = document.getElementById('packing-clothing-list');
        const gearEl = document.getElementById('packing-gear-list');
        const metaEl = document.getElementById('packing-meta');

        if (clothingEl) {
            clothingEl.innerHTML = list.clothing.map((i) => `<li>${i}</li>`).join('');
        }
        if (gearEl) {
            gearEl.innerHTML = [...list.essentials, ...list.gear].map((i) => `<li>${i}</li>`).join('');
        }
        if (metaEl) {
            metaEl.textContent = typeof t === 'function'
                ? t('retentionPackingMeta')(list.durationDays, destCode)
                : `${list.durationDays}-day pack list for ${destCode} · updates with forecast`;
        }
        return list;
    },

    getOfflineBundleData(destCode, countryCode, fair, wx, packing) {
        const cc = (countryCode || '').toUpperCase();
        return {
            emergency: EMERGENCY_NUMBERS[cc] || EMERGENCY_NUMBERS.default,
            phrases: TRANSLATION_CHEATS[cc] || TRANSLATION_CHEATS.default,
            fairPrice: fair,
            weatherSummary: wx?.ok ? {
                temp: wx.current?.temp,
                rain: wx.daily?.rainProb,
                uv: wx.daily?.uvMax,
                activityScore: this.calcActivityFeasibilityScore(wx).score
            } : null,
            packing,
            cachedAt: new Date().toISOString()
        };
    },

    async refresh(ctx) {
        const { from, to, cityMeta, countryCode, durationDays } = ctx || {};
        if (!from || !to || !cityMeta?.lat) return;

        const fair = this.renderRipOffRadar(from, to, countryCode);
        let wx = { ok: false };
        try {
            wx = await this.fetchExtendedWeather(cityMeta.lat, cityMeta.lon);
        } catch { /* offline fallback below */ }

        if (!wx.ok && typeof TravelPassport !== 'undefined') {
            const cached = await TravelPassport.getOfflineBundle(cityMeta.city || to);
            if (cached?.weatherSummary) wx = { ok: true, current: cached.weatherSummary, daily: cached.weatherSummary };
        }

        this.renderMicroclimateShield(wx, cityMeta.timezone);
        const packing = this.renderPackingMatrix(to, durationDays || 7, wx);

        if (typeof TravelPassport !== 'undefined') {
            const bundle = this.getOfflineBundleData(to, countryCode, fair, wx, packing);
            await TravelPassport.cacheDestinationBundle(cityMeta.city || to, countryCode, bundle);
        }

        return { fair, wx, packing };
    }
};

function initRetentionEngine() {
    document.getElementById('archive-trip-btn')?.addEventListener('click', async () => {
        if (typeof TravelPassport === 'undefined') return;
        const city = typeof CityContext !== 'undefined' ? CityContext.get() : null;
        const from = document.getElementById('from-currency')?.value;
        const to = document.getElementById('to-currency')?.value;
        if (!city || !to) return;
        const snapshot = await RetentionEngine.refresh({
            from,
            to,
            cityMeta: typeof CityContext !== 'undefined' ? CityContext.toMeta() : { city: city.name, lat: city.lat, lon: city.lon },
            countryCode: city.country_code,
            durationDays: parseInt(document.getElementById('packing-duration')?.value, 10) || 7
        });
        await TravelPassport.archiveCurrentTrip({
            city: city.name,
            country: city.country,
            countryCode: city.country_code,
            from,
            to,
            snapshot
        });
        TravelPassport.renderPassportUI();
        if (typeof Toast !== 'undefined') {
            Toast.info(typeof t === 'function' ? t('retentionTripArchived') : 'Trip archived to your Travel Passport.');
        }
    });

    document.getElementById('packing-duration')?.addEventListener('change', () => {
        if (typeof updateRetentionWidgets === 'function') updateRetentionWidgets();
    });
}

function updateRetentionWidgets() {
    const from = document.getElementById('from-currency')?.value;
    const to = document.getElementById('to-currency')?.value;
    const city = typeof CityContext !== 'undefined' ? CityContext.get() : null;
    const cityMeta = typeof CityContext !== 'undefined' ? CityContext.toMeta() : null;
    const grid = document.getElementById('retention-grid');

    if (!from || !to || !cityMeta || !hasPppSupport(from, to)) {
        if (grid) grid.hidden = true;
        return;
    }
    if (grid) grid.hidden = false;

    RetentionEngine.refresh({
        from,
        to,
        cityMeta,
        countryCode: city?.country_code,
        durationDays: parseInt(document.getElementById('packing-duration')?.value, 10) || 7
    });
    if (typeof TravelPassport !== 'undefined') TravelPassport.renderPassportUI();
}
