const DEFAULT_RATES = [
    { code: 'USD', rate: 1.0 },
    { code: 'EUR', rate: 0.92 },
    { code: 'JPY', rate: 157.0 },
    { code: 'GBP', rate: 0.79 },
    { code: 'CNY', rate: 7.25 }
];

class CurrencyConverter {
    constructor(customRates = []) {
        this.rates = {};
        for (const { code, rate } of DEFAULT_RATES) {
            this.rates[code] = rate;
        }
        for (const { code, rate } of customRates) {
            this.rates[code] = rate;
        }
    }

    // Convert: amount, from (currency code), to (currency code)
    convert(amount, from, to) {
        if (!(from in this.rates) || !(to in this.rates)) {
            throw new Error('Invalid currency code');
        }
        // Convert from 'from' to base (USD), then to 'to'
        const amountInBase = amount / this.rates[from];
        return amountInBase * this.rates[to];
    }
}

const currencyConverter = new CurrencyConverter();
console.log(currencyConverter.convert(100, 'USD', 'EUR')); // 92 (default rate)

const customConverter = new CurrencyConverter([{ code: 'EUR', rate: 0.95 }]);
console.log(customConverter.convert(100, 'USD', 'EUR')); // 95 (custom override)
