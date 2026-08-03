/** FX Volatility Watchdog — rate trends & localStorage alerts */
const FX_ALERTS_KEY = 'nomad-os-rate-alerts';
const FX_TREND_CACHE_MS = 30 * 60 * 1000;

let fxTrendCache = { key: '', data: null, fetchedAt: 0 };
let selectedTrendDays = 7;

function getRateAlerts() {
    try {
        const raw = localStorage.getItem(FX_ALERTS_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

function saveRateAlerts(alerts) {
    try {
        localStorage.setItem(FX_ALERTS_KEY, JSON.stringify(alerts));
    } catch { /* quota */ }
}

function addRateAlert(alert) {
    const alerts = getRateAlerts().filter(
        (a) => !(a.from === alert.from && a.to === alert.to && a.direction === alert.direction)
    );
    alerts.push({ ...alert, createdAt: Date.now() });
    saveRateAlerts(alerts.slice(-20));
}

function removeRateAlert(from, to, direction) {
    saveRateAlerts(getRateAlerts().filter(
        (a) => !(a.from === from && a.to === to && a.direction === direction)
    ));
}

async function fetchPairRateTrend(from, to, days = 7) {
    if (!from || !to || from === to) return null;
    if (!canMarketConvert(from, to)) return null;

    const cacheKey = `${from}-${to}-${days}`;
    const now = Date.now();
    if (fxTrendCache.key === cacheKey && fxTrendCache.data && now - fxTrendCache.fetchedAt < FX_TREND_CACHE_MS) {
        return fxTrendCache.data;
    }

    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);
    const startStr = start.toISOString().slice(0, 10);
    const endStr = end.toISOString().slice(0, 10);

    try {
        const rangeResult = typeof fetchFxRateRange === 'function'
            ? await fetchFxRateRange(from, to, startStr, endStr, { silent: true })
            : null;

        if (!rangeResult?.ok || !rangeResult.rates) throw new Error('History unavailable');

        const rates = rangeResult.rates;
        const dates = Object.keys(rates).sort();
        if (dates.length < 2) throw new Error('Insufficient history');

        const firstRate = rates[dates[0]]?.[to];
        const lastRate = rates[dates[dates.length - 1]]?.[to];
        const currentRate = typeof converter !== 'undefined' ? converter.getRate(from, to) : lastRate;

        if (!firstRate || !lastRate) throw new Error('Missing rate data');

        const changePct = ((lastRate - firstRate) / firstRate) * 100;
        const result = {
            from,
            to,
            days,
            firstRate,
            lastRate,
            currentRate,
            changePct,
            dates,
            rates
        };
        fxTrendCache = { key: cacheKey, data: result, fetchedAt: now };
        return result;
    } catch {
        return null;
    }
}

function getTrendSentiment(changePct, from, to) {
    if (changePct == null) return { emoji: '⚪', key: 'fxTrendNeutral' };
    if (Math.abs(changePct) < 0.3) return { emoji: '⚪', key: 'fxTrendStable' };
    if (changePct > 0) return { emoji: '🟢', key: 'fxTrendFavorable' };
    return { emoji: '🔴', key: 'fxTrendUnfavorable' };
}

function checkRateAlerts(from, to, currentRate) {
    const alerts = getRateAlerts().filter((a) => a.from === from && a.to === to);
    const triggered = [];
    for (const alert of alerts) {
        if (alert.direction === 'below' && currentRate <= alert.targetRate) triggered.push(alert);
        if (alert.direction === 'above' && currentRate >= alert.targetRate) triggered.push(alert);
    }
    return triggered;
}

function renderFxAlertsList(from, to) {
    const listEl = document.getElementById('fx-alerts-list');
    if (!listEl) return;

    const alerts = getRateAlerts().filter((a) => a.from === from && a.to === to);
    if (!alerts.length) {
        listEl.innerHTML = '';
        listEl.hidden = true;
        return;
    }

    listEl.hidden = false;
    listEl.innerHTML = alerts.map((a) => {
        const dirLabel = a.direction === 'below'
            ? (typeof t === 'function' ? t('fxAlertBelow') : 'below')
            : (typeof t === 'function' ? t('fxAlertAbove') : 'above');
        return `
            <div class="fx-alert-item">
                <span>${a.to} ${dirLabel} ${a.targetRate.toFixed(4)}</span>
                <button type="button" class="fx-alert-item__remove" data-from="${a.from}" data-to="${a.to}" data-dir="${a.direction}" aria-label="Remove">×</button>
            </div>
        `;
    }).join('');

    listEl.querySelectorAll('.fx-alert-item__remove').forEach((btn) => {
        btn.addEventListener('click', () => {
            removeRateAlert(btn.dataset.from, btn.dataset.to, btn.dataset.dir);
            renderFxAlertsList(from, to);
        });
    });
}

async function updateFxWatchdog() {
    const card = document.getElementById('fx-watchdog-card');
    if (!card) return;

    const fromEl = document.getElementById('from-currency');
    const toEl = document.getElementById('to-currency');
    const from = fromEl?.value;
    const to = toEl?.value;

    if (!from || !to || from === to || !canMarketConvert(from, to)) {
        card.hidden = true;
        return;
    }

    card.hidden = false;

    const trendEl = document.getElementById('fx-trend-text');
    const rateEl = document.getElementById('fx-current-rate');
    const sentimentEl = document.getElementById('fx-trend-sentiment');
    const alertStatusEl = document.getElementById('fx-alert-status');

    const currentRate = converter.getRate(from, to);
    if (rateEl) {
        if (typeof NomadOSApp !== 'undefined' && NomadOSApp.animateRateEl) {
            NomadOSApp.animateRateEl(rateEl, from, to, currentRate, 600);
        } else {
            const map = typeof getCurrencyMap === 'function' ? getCurrencyMap() : {};
            const decimals = Math.max(map[to]?.decimals ?? 2, 4);
            rateEl.textContent = `1 ${from} = ${currentRate.toFixed(decimals)} ${to}`;
        }
    }

    if (trendEl) trendEl.textContent = typeof t === 'function' ? t('fxTrendLoading') : 'Loading trend…';

    const trend = await fetchPairRateTrend(from, to, selectedTrendDays);

    if (trend && trendEl) {
        const abs = Math.abs(trend.changePct).toFixed(1);
        const arrow = trend.changePct >= 0 ? '▲' : '▼';
        trendEl.textContent = typeof t === 'function'
            ? t('fxTrendSummary')(to, arrow, abs, selectedTrendDays, from)
            : `${to} ${arrow} ${abs}% vs ${from} (${selectedTrendDays}d)`;
    } else if (trendEl) {
        trendEl.textContent = typeof t === 'function' ? t('fxTrendUnavailable') : 'Trend data unavailable for this pair.';
    }

    if (sentimentEl && trend) {
        const { emoji, key } = getTrendSentiment(trend.changePct, from, to);
        sentimentEl.textContent = `${emoji} ${typeof t === 'function' ? t(key) : key}`;
    }

    const triggered = checkRateAlerts(from, to, currentRate);
    if (alertStatusEl) {
        if (triggered.length) {
            alertStatusEl.hidden = false;
            alertStatusEl.textContent = typeof t === 'function'
                ? t('fxAlertTriggered')(triggered.length)
                : `${triggered.length} alert(s) triggered!`;
        } else {
            alertStatusEl.hidden = true;
        }
    }

    renderFxAlertsList(from, to);
}

function initFxWatchdog() {
    const card = document.getElementById('fx-watchdog-card');
    if (!card) return;

    document.querySelectorAll('[data-fx-period]').forEach((btn) => {
        btn.addEventListener('click', () => {
            selectedTrendDays = parseInt(btn.dataset.fxPeriod, 10) || 7;
            document.querySelectorAll('[data-fx-period]').forEach((b) => {
                b.classList.toggle('fx-period-btn--active', b === btn);
            });
            fxTrendCache = { key: '', data: null, fetchedAt: 0 };
            updateFxWatchdog();
        });
    });

    const setAlertBtn = document.getElementById('fx-set-alert-btn');
    const targetInput = document.getElementById('fx-alert-target');

    setAlertBtn?.addEventListener('click', () => {
        const from = document.getElementById('from-currency')?.value;
        const to = document.getElementById('to-currency')?.value;
        const target = parseFloat(targetInput?.value);
        if (!from || !to || !target || from === to) return;

        const currentRate = converter.getRate(from, to);
        const direction = target < currentRate ? 'below' : 'above';

        addRateAlert({ from, to, targetRate: target, direction });
        renderFxAlertsList(from, to);

        if (typeof Toast !== 'undefined' && Toast.success) {
            const msg = typeof t === 'function' ? t('fxAlertSaved') : 'Rate alert saved.';
            Toast.success(msg);
        }
        if (targetInput) targetInput.value = currentRate.toFixed(4);
    });

    const targetRateEl = document.getElementById('fx-alert-target');
    if (targetRateEl && !targetRateEl.dataset.init) {
        targetRateEl.dataset.init = '1';
        targetRateEl.placeholder = '0.0000';
    }
}

if (typeof window !== 'undefined') {
    window.updateFxWatchdog = updateFxWatchdog;
    window.initFxWatchdog = initFxWatchdog;
}
