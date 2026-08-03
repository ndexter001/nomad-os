/**
 * Nomad Survival & Safety Net — dynamic checklist by destination currency
 */
const SurvivalModule = {
    render(fromCode, toCode) {
        const card = document.getElementById('survival-card');
        if (!card) return;

        const profile = getPppProfile(toCode);
        const meta = getSurvivalMeta(toCode);
        if (!profile) {
            card.hidden = true;
            return;
        }

        card.hidden = false;
        const country = profile.country || toCode;
        const title = document.getElementById('survival-title');
        if (title) title.textContent = `${typeof t === 'function' ? t('survivalTitle') : 'Nomad Survival'} · ${country}`;

        const sim10Local = formatAmount(meta.sim10, toCode);
        const sim30Local = formatAmount(meta.sim30, toCode);
        let sim10Home = meta.sim10;
        let sim30Home = meta.sim30;
        if (canMarketConvert(toCode, fromCode)) {
            sim10Home = converter.convert(meta.sim10, toCode, fromCode);
            sim30Home = converter.convert(meta.sim30, toCode, fromCode);
        }
        const sim10HomeStr = formatAmount(sim10Home, fromCode);
        const sim30HomeStr = formatAmount(sim30Home, fromCode);

        const tippingKey = `tipping_${meta.tipping}`;
        const tippingLabel = typeof t === 'function' ? (t(tippingKey) || meta.tipping) : meta.tipping;
        const tippingClass = `survival-badge--${meta.tipping}`;

        const cash = calcEmergencyCash(toCode, fromCode);
        const cashIntensityKey = `cash_${meta.cashIntensity}`;
        const cashLabel = typeof t === 'function' ? (t(cashIntensityKey) || meta.cashIntensity) : meta.cashIntensity;

        const sim10Label = typeof t === 'function' ? t('survivalSim10') : '10GB eSIM';
        const sim30Label = typeof t === 'function' ? t('survivalSim30') : '30GB eSIM';

        document.getElementById('survival-sim').innerHTML = `
            <div class="survival-stat">
                <span class="survival-stat__label">${sim10Label}</span>
                <span class="survival-stat__value">${sim10Local}</span>
                <span class="survival-stat__hint">≈ ${sim10HomeStr}</span>
            </div>
            <div class="survival-stat">
                <span class="survival-stat__label">${sim30Label}</span>
                <span class="survival-stat__value">${sim30Local}</span>
                <span class="survival-stat__hint">≈ ${sim30HomeStr}</span>
            </div>
        `;

        const tipBadge = document.getElementById('survival-tipping-badge');
        if (tipBadge) {
            tipBadge.textContent = tippingLabel;
            tipBadge.className = `survival-badge ${tippingClass}`;
        }
        const vatEl = document.getElementById('survival-vat');
        if (vatEl) {
            vatEl.textContent = typeof t === 'function'
                ? t('survivalVat')(meta.vat)
                : `${meta.vat}% VAT`;
        }

        const cashEl = document.getElementById('survival-cash');
        if (cashEl && cash) {
            cashEl.innerHTML = `
                <strong>${formatAmount(cash.cashDest, toCode)}</strong>
                <span class="survival-cash__hint">≈ ${formatAmount(cash.cashHome, fromCode)} · ${cashLabel}</span>
            `;
        }
    }
};

function initSurvival() {
    /* wired from app.js on currency change */
}

function updateSurvival() {
    const from = document.getElementById('from-currency')?.value;
    const to = document.getElementById('to-currency')?.value;
    if (from && to) SurvivalModule.render(from, to);
}
