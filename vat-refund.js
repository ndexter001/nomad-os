/** Smart VAT & Local Tax Refund Calculator */
const VAT_RECEIPT_KEYS = [
    'vatCheckReceipt',
    'vatCheckPassport',
    'vatCheckGoods',
    'vatCheckCounter',
    'vatCheckMinimum'
];

function updateVatRefundCalculator() {
    const card = document.getElementById('vat-refund-card');
    if (!card) return;

    const toEl = document.getElementById('to-currency');
    const spendInput = document.getElementById('vat-spend-input');
    const dest = toEl?.value;
    const spend = parseFloat(spendInput?.value) || 0;

    if (!dest || typeof calcVatRefund !== 'function') {
        card.hidden = true;
        return;
    }

    const meta = typeof getSurvivalMeta === 'function' ? getSurvivalMeta(dest) : null;
    if (!meta) {
        card.hidden = true;
        return;
    }

    card.hidden = false;

    const rateEl = document.getElementById('vat-rate-display');
    const resultEl = document.getElementById('vat-refund-result');
    const checklistEl = document.getElementById('vat-checklist');
    const countryEl = document.getElementById('vat-country-name');

    const countryName = typeof getCountryDisplayName === 'function'
        ? getCountryDisplayName(dest)
        : (PPP_OVERRIDES?.[dest]?.country || dest);

    if (countryEl) countryEl.textContent = countryName;
    if (rateEl) {
        rateEl.textContent = typeof t === 'function'
            ? t('vatRateLabel')(meta.vat, countryName)
            : `Standard VAT: ${meta.vat}% · ${countryName}`;
    }

    if (spend <= 0) {
        if (resultEl) {
            resultEl.textContent = typeof t === 'function' ? t('vatEnterSpend') : 'Enter shopping spend to estimate refund.';
        }
    } else {
        const calc = calcVatRefund(spend, dest);
        if (calc && resultEl) {
            resultEl.innerHTML = typeof t === 'function'
                ? t('vatRefundResult')(formatAmount(calc.spend, dest), formatAmount(calc.refund, dest), calc.vatPct)
                : `Spend ${formatAmount(calc.spend, dest)} → Reclaim ~${formatAmount(calc.refund, dest)} (${calc.vatPct}% VAT)`;
        }
    }

    if (checklistEl) {
        checklistEl.innerHTML = VAT_RECEIPT_KEYS.map((key) => {
            const label = typeof t === 'function' ? t(key) : key;
            return `<li class="vat-checklist__item"><span class="vat-checklist__check">✓</span>${label}</li>`;
        }).join('');
    }
}

function initVatRefundCalculator() {
    const spendInput = document.getElementById('vat-spend-input');
    spendInput?.addEventListener('input', updateVatRefundCalculator);
}

if (typeof window !== 'undefined') {
    window.updateVatRefundCalculator = updateVatRefundCalculator;
    window.initVatRefundCalculator = initVatRefundCalculator;
}
