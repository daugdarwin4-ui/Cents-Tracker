export const toCents = (amount) => Math.round(parseFloat(amount) * 100);

export const fromCents = (cents) => Number(cents) / 100;

export const formatCurrency = (cents, currency = 'PHP') =>
  new Intl.NumberFormat('en-PH', { style: 'currency', currency }).format(Number(cents) / 100);
