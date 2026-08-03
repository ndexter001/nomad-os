import { useCurrencyConverter } from '../hooks/useCurrencyConverter';

/** Standalone React converter — mirrors vanilla dashboard converter UX */
export function CurrencyConverterPanel() {
  const {
    fromCurrency,
    toCurrency,
    fromAmount,
    toAmount,
    exchangeRate,
    status,
    lastUpdated,
    setFromCurrency,
    setToCurrency,
    setFromAmount,
    swapCurrencies
  } = useCurrencyConverter();

  const statusLabel =
    status === 'loading' ? 'Loading…' : status === 'live' ? 'Live' : 'Offline';

  return (
    <section className="converter-card glass-card--glow fade-in-up" aria-label="Currency converter">
      <div className="currency-row">
        <div className="currency-field">
          <select
            className="currency-select"
            value={fromCurrency}
            onChange={(e) => setFromCurrency(e.target.value)}
            aria-label="From currency"
          >
            {Object.keys(FALLBACK_DISPLAY).map((code) => (
              <option key={code} value={code}>
                {code}
              </option>
            ))}
          </select>
          <input
            type="number"
            className="amount-input"
            value={fromAmount}
            min={0}
            step="any"
            onChange={(e) => setFromAmount(parseFloat(e.target.value) || 0)}
            aria-label="Amount"
          />
        </div>
      </div>

      <button type="button" className="swap-btn" onClick={swapCurrencies} aria-label="Swap currencies">
        ⇅
      </button>

      <div className="currency-row">
        <div className="currency-field">
          <select
            className="currency-select"
            value={toCurrency}
            onChange={(e) => setToCurrency(e.target.value)}
            aria-label="To currency"
          >
            {Object.keys(FALLBACK_DISPLAY).map((code) => (
              <option key={code} value={code}>
                {code}
              </option>
            ))}
          </select>
          <output className="amount-input amount-output">
            {toAmount != null ? toAmount.toFixed(2) : '—'}
          </output>
        </div>
      </div>

      <div className="rate-bar">
        <span className="rate-text">
          {exchangeRate != null
            ? `1 ${fromCurrency} = ${exchangeRate.toFixed(4)} ${toCurrency}`
            : '—'}
        </span>
        <span className={`rate-badge rate-badge--${status === 'live' ? 'live' : status === 'offline' ? 'error' : 'loading'}`}>
          {statusLabel}
        </span>
      </div>
      {lastUpdated && (
        <p className="last-updated">
          Updated {lastUpdated.toLocaleTimeString()}
        </p>
      )}
    </section>
  );
}

const FALLBACK_DISPLAY: Record<string, true> = {
  USD: true,
  EUR: true,
  GBP: true,
  NOK: true,
  JPY: true,
  CHF: true,
  AUD: true,
  CAD: true,
  THB: true,
  SGD: true
};
