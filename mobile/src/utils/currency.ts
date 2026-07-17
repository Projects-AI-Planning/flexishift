const SYMBOLS: Record<string, string> = {
  GBP: '£', USD: '$', EUR: '€', INR: '₹', PKR: '₨', BDT: '৳',
  NGN: '₦', GHS: '₵', ZAR: 'R', PLN: 'zł', RON: 'lei', BGN: 'лв',
  CZK: 'Kč', HUF: 'Ft', UAH: '₴', PHP: '₱', AUD: 'A$', NZD: 'NZ$',
  SGD: 'S$', CAD: 'C$', AED: 'AED', SAR: 'SAR', EUR_LT: '€',
  EUR_LV: '€', EUR_EE: '€',
};

// The logged-in driver's currency (from their registered country). Set once on login
// so every amount displays in that currency without passing it at each call site.
let _displayCurrency: string | null = null;

export const setDisplayCurrency = (code?: string | null): void => {
  _displayCurrency = code ? code.toUpperCase() : null;
};

export const currencySymbol = (code?: string | null): string => {
  const c = (code || _displayCurrency || '').toUpperCase();
  if (!c) return '';
  return SYMBOLS[c] ?? c;
};

export const fmtMoney = (amount: number, code?: string | null): string =>
  `${currencySymbol(code)}${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
