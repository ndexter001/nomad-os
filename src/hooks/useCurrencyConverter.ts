import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const FX_API = 'https://open.er-api.com/v6/latest/USD';
const FX_BACKUP = 'https://api.exchangerate-api.com/v4/latest/USD';

const FALLBACK_RATES: Record<string, number> = {
  USD: 1,
  EUR: 0.92,
  GBP: 0.79,
  NOK: 10.85,
  JPY: 149,
  CHF: 0.88,
  AUD: 1.53,
  CAD: 1.36,
  CNY: 7.24,
  THB: 34.5,
  SGD: 1.34,
  INR: 83,
  BRL: 4.95,
  ZAR: 18.5
};

export type RateStatus = 'loading' | 'live' | 'offline';

export interface UseCurrencyConverterOptions {
  initialFrom?: string;
  initialTo?: string;
  initialAmount?: number;
  refreshMs?: number;
}

function convertAmount(
  amount: number,
  from: string,
  to: string,
  rates: Record<string, number>
): number | null {
  if (!from || !to || !Number.isFinite(amount)) return null;
  const fromRate = rates[from];
  const toRate = rates[to];
  if (fromRate == null || toRate == null || fromRate <= 0) return null;
  const inBase = amount / fromRate;
  return inBase * toRate;
}

async function fetchRatesWithTimeout(timeoutMs = 8000): Promise<{
  rates: Record<string, number>;
  live: boolean;
}> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const tryUrl = async (url: string) => {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (data.rates && typeof data.rates === 'object') return data.rates as Record<string, number>;
    throw new Error('Invalid payload');
  };

  try {
    const rates = await tryUrl(FX_API);
    clearTimeout(timer);
    return { rates: { USD: 1, ...rates }, live: true };
  } catch {
    try {
      const rates = await tryUrl(FX_BACKUP);
      clearTimeout(timer);
      return { rates: { USD: 1, ...rates }, live: true };
    } catch {
      clearTimeout(timer);
      return { rates: { ...FALLBACK_RATES }, live: false };
    }
  }
}

export function useCurrencyConverter(options: UseCurrencyConverterOptions = {}) {
  const {
    initialFrom = 'USD',
    initialTo = 'EUR',
    initialAmount = 100,
    refreshMs = 15_000
  } = options;

  const [fromCurrency, setFromCurrency] = useState(initialFrom);
  const [toCurrency, setToCurrency] = useState(initialTo);
  const [fromAmount, setFromAmount] = useState(initialAmount);
  const [rates, setRates] = useState<Record<string, number>>(FALLBACK_RATES);
  const [status, setStatus] = useState<RateStatus>('loading');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const mountedRef = useRef(true);

  const refreshRates = useCallback(async () => {
    setStatus((s) => (s === 'live' ? 'live' : 'loading'));
    try {
      const { rates: next, live } = await fetchRatesWithTimeout();
      if (!mountedRef.current) return;
      setRates(next);
      setLastUpdated(new Date());
      setStatus(live ? 'live' : 'offline');
    } catch {
      if (!mountedRef.current) return;
      setRates(FALLBACK_RATES);
      setStatus('offline');
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    refreshRates();
    const id = window.setInterval(refreshRates, refreshMs);
    return () => {
      mountedRef.current = false;
      window.clearInterval(id);
    };
  }, [refreshRates, refreshMs]);

  const toAmount = useMemo(
    () => convertAmount(fromAmount, fromCurrency, toCurrency, rates),
    [fromAmount, fromCurrency, toCurrency, rates]
  );

  const exchangeRate = useMemo(
    () => convertAmount(1, fromCurrency, toCurrency, rates),
    [fromCurrency, toCurrency, rates]
  );

  const swapCurrencies = useCallback(() => {
    setFromCurrency((prevFrom) => {
      setToCurrency(prevFrom);
      return toCurrency;
    });
  }, [toCurrency]);

  return {
    fromCurrency,
    toCurrency,
    fromAmount,
    toAmount,
    exchangeRate,
    rates,
    status,
    lastUpdated,
    setFromCurrency,
    setToCurrency,
    setFromAmount,
    swapCurrencies,
    refreshRates
  };
}
