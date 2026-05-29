export const fmtMoney = (amount: number, currency?: string | null): string => {
  if (!currency) return amount.toFixed(2);
  const code = currency.toUpperCase();
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
