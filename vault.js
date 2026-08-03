/**
 * Personal Budget Vault — runway, saved trips, FX subscription tracker
 */
const VaultManager = {
    data: {
        monthlyBudget: 0,
        homeCurrency: 'NOK',
        trips: [],
        subscriptions: []
    },

    _storageKey(uid) {
        return `konverter-vault-${uid || 'guest'}`;
    },

    load(uid) {
        const raw = localStorage.getItem(this._storageKey(uid));
        if (raw) {
            try {
                this.data = { ...this.data, ...JSON.parse(raw) };
            } catch { /* keep defaults */ }
        }
        return this.data;
    },

    save(uid) {
        if (!uid) return;
        localStorage.setItem(this._storageKey(uid), JSON.stringify(this.data));
    },

    onAuthChange(user) {
        if (user) {
            this.load(user.uid);
            this.render();
        }
    },

    setBudget(amount, currency) {
        this.data.monthlyBudget = parseFloat(amount) || 0;
        this.data.homeCurrency = currency;
        this.save(AuthClient.getUid());
        this.renderRunway();
    },

    addTrip(name, destCurrency, budget) {
        this.data.trips.push({
            id: `trip_${Date.now()}`,
            name,
            destCurrency,
            budget: parseFloat(budget) || 0,
            createdAt: new Date().toISOString()
        });
        this.save(AuthClient.getUid());
        this.renderTrips();
    },

    removeTrip(id) {
        this.data.trips = this.data.trips.filter((t) => t.id !== id);
        this.save(AuthClient.getUid());
        this.renderTrips();
    },

    addSubscription(name, amount, currency) {
        const rateKey = `${currency}_USD`;
        const baseline = converter.rates[currency] ?? DEFAULT_FX_RATES[currency];
        this.data.subscriptions.push({
            id: `sub_${Date.now()}`,
            name,
            amount: parseFloat(amount) || 0,
            currency,
            baselineRate: baseline,
            createdAt: new Date().toISOString()
        });
        this.save(AuthClient.getUid());
        this.renderSubscriptions();
    },

    removeSubscription(id) {
        this.data.subscriptions = this.data.subscriptions.filter((s) => s.id !== id);
        this.save(AuthClient.getUid());
        this.renderSubscriptions();
    },

    checkSubscriptionAlerts() {
        const alerts = [];
        for (const sub of this.data.subscriptions) {
            const current = converter.rates[sub.currency] ?? DEFAULT_FX_RATES[sub.currency];
            if (!current || !sub.baselineRate) continue;
            const pctChange = ((current - sub.baselineRate) / sub.baselineRate) * 100;
            if (Math.abs(pctChange) >= 3) {
                const home = this.data.homeCurrency;
                let billNow = sub.amount;
                let billBase = sub.amount;
                if (canMarketConvert(sub.currency, home)) {
                    billNow = converter.convert(sub.amount, sub.currency, home);
                    billBase = converter.convert(sub.amount * (sub.baselineRate / current), sub.currency, home);
                }
                alerts.push({
                    sub,
                    pctChange,
                    billNow,
                    billBase,
                    increased: pctChange > 0
                });
            }
        }
        return alerts;
    },

    renderRunway() {
        const el = document.getElementById('vault-runway');
        if (!el) return;

        const dest = document.getElementById('to-currency')?.value;
        const home = this.data.homeCurrency;
        const budget = this.data.monthlyBudget;

        if (!budget || !dest || !AuthClient.isLoggedIn()) {
            el.innerHTML = `<p class="vault-empty">${typeof t === 'function' ? t('vaultSetBudget') : 'Set your monthly budget to see runway.'}</p>`;
            return;
        }

        const runway = calcNomadRunway(budget, home, dest);
        if (!runway) {
            el.innerHTML = `<p class="vault-empty">${typeof t === 'function' ? t('vaultRunwayUnavailable') : 'Runway unavailable for this pair.'}</p>`;
            return;
        }

        const months = runway.months.toFixed(1);
        const monthlyStr = formatAmount(runway.monthlyDest, dest);
        el.innerHTML = `
            <div class="vault-runway__hero">
                <span class="vault-runway__big">${months}</span>
                <span class="vault-runway__unit">${typeof t === 'function' ? t('vaultMonths') : 'months'}</span>
            </div>
            <p class="vault-runway__sub">${runway.days} ${typeof t === 'function' ? t('vaultDays') : 'days'} · ${typeof t === 'function' ? t('vaultMonthlyDest') : 'Est. monthly burn'} ${monthlyStr}</p>
            <p class="vault-runway__hint">${typeof t === 'function' ? t('vaultRunwayHint') : 'Based on FX + PPP living costs in destination.'}</p>
        `;
    },

    renderTrips() {
        const list = document.getElementById('vault-trips-list');
        if (!list) return;
        if (!this.data.trips.length) {
            list.innerHTML = `<p class="vault-empty">${typeof t === 'function' ? t('vaultNoTrips') : 'No saved trips yet.'}</p>`;
            return;
        }
        list.innerHTML = this.data.trips.map((trip) => {
            const runway = calcNomadRunway(trip.budget, this.data.homeCurrency, trip.destCurrency);
            const dur = runway ? `${runway.months.toFixed(1)} mo` : '—';
            return `
                <div class="vault-item">
                    <div>
                        <strong>${trip.name}</strong>
                        <span class="vault-item__meta">${formatAmount(trip.budget, trip.destCurrency)} · ${trip.destCurrency} · ~${dur}</span>
                    </div>
                    <button type="button" class="vault-item__remove" data-trip-id="${trip.id}" aria-label="Remove">×</button>
                </div>
            `;
        }).join('');
        list.querySelectorAll('[data-trip-id]').forEach((btn) => {
            btn.addEventListener('click', () => this.removeTrip(btn.dataset.tripId));
        });
    },

    renderSubscriptions() {
        const list = document.getElementById('vault-subs-list');
        const alertsEl = document.getElementById('vault-subs-alerts');
        if (!list) return;

        const alerts = this.checkSubscriptionAlerts();
        if (alertsEl) {
            if (alerts.length) {
                alertsEl.hidden = false;
                alertsEl.innerHTML = alerts.map((a) => {
                    const msg = typeof t === 'function'
                        ? t('vaultSubAlert')(a.sub.name, Math.abs(a.pctChange).toFixed(1), formatAmount(a.billNow, this.data.homeCurrency))
                        : `${a.sub.name}: FX moved ${Math.abs(a.pctChange).toFixed(1)}% — now ~${formatAmount(a.billNow, this.data.homeCurrency)}/mo`;
                    return `<div class="vault-alert ${a.increased ? 'vault-alert--warn' : 'vault-alert--ok'}">${msg}</div>`;
                }).join('');
            } else {
                alertsEl.hidden = true;
                alertsEl.innerHTML = '';
            }
        }

        if (!this.data.subscriptions.length) {
            list.innerHTML = `<p class="vault-empty">${typeof t === 'function' ? t('vaultNoSubs') : 'No foreign subscriptions tracked.'}</p>`;
            return;
        }

        const home = this.data.homeCurrency;
        list.innerHTML = this.data.subscriptions.map((sub) => {
            let homeAmt = sub.amount;
            if (canMarketConvert(sub.currency, home)) {
                homeAmt = converter.convert(sub.amount, sub.currency, home);
            }
            return `
                <div class="vault-item">
                    <div>
                        <strong>${sub.name}</strong>
                        <span class="vault-item__meta">${formatAmount(sub.amount, sub.currency)}/mo · ≈ ${formatAmount(homeAmt, home)}/mo</span>
                    </div>
                    <button type="button" class="vault-item__remove" data-sub-id="${sub.id}" aria-label="Remove">×</button>
                </div>
            `;
        }).join('');
        list.querySelectorAll('[data-sub-id]').forEach((btn) => {
            btn.addEventListener('click', () => this.removeSubscription(btn.dataset.subId));
        });
    },

    render() {
        this.renderRunway();
        this.renderTrips();
        this.renderSubscriptions();
    }
};

function initVaultUI() {
    const budgetInput = document.getElementById('vault-budget');
    const budgetCurrency = document.getElementById('vault-budget-currency');
    const saveBudgetBtn = document.getElementById('vault-save-budget');
    const tripForm = document.getElementById('vault-trip-form');
    const subForm = document.getElementById('vault-sub-form');

    if (budgetCurrency && typeof CURRENCIES !== 'undefined') {
        budgetCurrency.innerHTML = CURRENCIES.map((c) => `<option value="${c.code}">${c.code}</option>`).join('');
        budgetCurrency.value = VaultManager.data.homeCurrency;
    }

    saveBudgetBtn?.addEventListener('click', () => {
        if (!AuthClient.isLoggedIn()) return;
        VaultManager.setBudget(budgetInput.value, budgetCurrency.value);
    });

    tripForm?.addEventListener('submit', (e) => {
        e.preventDefault();
        if (!AuthClient.isLoggedIn()) return;
        VaultManager.addTrip(
            document.getElementById('vault-trip-name').value.trim(),
            document.getElementById('vault-trip-currency').value,
            document.getElementById('vault-trip-budget').value
        );
        tripForm.reset();
    });

    subForm?.addEventListener('submit', (e) => {
        e.preventDefault();
        if (!AuthClient.isLoggedIn()) return;
        VaultManager.addSubscription(
            document.getElementById('vault-sub-name').value.trim(),
            document.getElementById('vault-sub-amount').value,
            document.getElementById('vault-sub-currency').value
        );
        subForm.reset();
    });

    if (typeof CURRENCIES !== 'undefined') {
        const tripCur = document.getElementById('vault-trip-currency');
        const subCur = document.getElementById('vault-sub-currency');
        const opts = CURRENCIES.slice(0, 40).map((c) => `<option value="${c.code}">${c.code}</option>`).join('');
        if (tripCur) tripCur.innerHTML = opts;
        if (subCur) subCur.innerHTML = opts;
    }
}

function refreshVaultRunway() {
    if (AuthClient.isLoggedIn()) VaultManager.renderRunway();
    if (AuthClient.isLoggedIn()) VaultManager.renderSubscriptions();
}
