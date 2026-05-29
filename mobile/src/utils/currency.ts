const SYMBOLS: Record<string, string> = {
  GBP: '£', USD: '$', EUR: '€', INR: '₹', PKR: '₨', BDT: '৳',
  NGN: '₦', GHS: '₵', ZAR: 'R', PLN: 'zł', RON: 'lei', BGN: 'лв',
  CZK: 'Kč', HUF: 'Ft', UAH: '₴', PHP: '₱', AUD: 'A$', NZD: 'NZ$',
  SGD: 'S$', CAD: 'C$', AED: 'AED', SAR: 'SAR', EUR_LT: '€',
  EUR_LV: '€', EUR_EE: '€',
};

export const currencySymbol = (code?: string | null): string => {
  if (!code) return '';
  return SYMBOLS[code.toUpperCase()] ?? code;
};

export const fmtMoney = (amount: number, code?: string | null): string =>
  `${currencySymbol(code)}${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
