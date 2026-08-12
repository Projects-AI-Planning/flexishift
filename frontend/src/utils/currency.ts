// The logged-in user's currency (derived from their registered country). Set once on
// login so every amount displays in that currency without passing it at each call site.
let _displayCurrency: string | null = null;

export const setDisplayCurrency = (code?: string | null): void => {
  _displayCurrency = code ? code.toUpperCase() : null;
};

export const getDisplayCurrency = (): string | null => _displayCurrency;

export const fmtMoney = (amount: number, currency?: string | null): string => {
  // Prefer an explicit currency (e.g. the record's own), else fall back to the
  // logged-in user's currency.
  const code = (currency || _displayCurrency || '').toUpperCase();
  if (!code) return amount.toFixed(2);
  try {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: code,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${code} ${amount.toFixed(2)}`;
  }
};
