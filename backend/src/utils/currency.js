/**
 * Currency utilities for the backend.
 * All amounts are stored as integers (cents) in the database.
 */

/**
 * Convert a decimal dollar amount to integer cents.
 * Example: 12.50 → 1250
 */
function toCents(amount) {
  return Math.round(parseFloat(amount) * 100);
}

/**
 * Convert integer cents to a decimal dollar amount.
 * Example: 1250 → 12.50
 */
function fromCents(cents) {
  return (parseInt(cents, 10) / 100);
}

/**
 * Format cents as a USD currency string.
 * Example: 1250 → "$12.50"
 */
function formatCurrency(cents) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100);
}

module.exports = { toCents, fromCents, formatCurrency };
