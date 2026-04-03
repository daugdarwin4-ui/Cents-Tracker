import { formatCurrency } from './currency';

/**
 * Client-side CSV export fallback for when the backend is unavailable.
 * @param {Array} transactions - Array of transaction objects (amounts in cents)
 */
export const exportTransactionsCSV = (transactions) => {
  const headers = ['Date', 'Type', 'Category', 'Amount', 'Note', 'Payment Method', 'Account'];

  const escape = (val) => {
    const s = val == null ? '' : String(val);
    return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
  };

  const rows = transactions.map((t) => [
    escape(t.date),
    escape(t.type),
    escape(t.categories?.name || ''),
    escape(formatCurrency(Number(t.amount))),
    escape(t.note || ''),
    escape(t.payment_method || ''),
    escape(t.account_name || ''),
  ]);

  const csv = [headers, ...rows].map((row) => row.join(',')).join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `transactions_${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
