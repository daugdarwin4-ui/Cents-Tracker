import { useState, useCallback, useMemo } from 'react';
import { Plus, Search, SlidersHorizontal, Download } from 'lucide-react';
import { useTransactions } from '../hooks/useTransactions';
import { useCategories } from '../hooks/useCategories';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import TransactionForm from '../components/transactions/TransactionForm';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Badge from '../components/ui/Badge';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { formatCurrency } from '../utils/currency';
import { formatDate } from '../utils/date';
import { exportTransactionsCSV } from '../utils/export';

const TYPES = [
  { value: '', label: 'All Types' },
  { value: 'income', label: 'Income' },
  { value: 'expense', label: 'Expense' },
  { value: 'investment', label: 'Investment' },
  { value: 'savings', label: 'Savings' },
];

const SORT_OPTIONS = [
  { value: 'date_desc', label: 'Date (Newest)' },
  { value: 'date_asc', label: 'Date (Oldest)' },
  { value: 'amount_desc', label: 'Amount (High)' },
  { value: 'amount_asc', label: 'Amount (Low)' },
];

export default function Transactions() {
  const { getToken } = useAuth();
  const [filters, setFilters] = useState({ type: '', startDate: '', endDate: '', search: '', sortBy: 'date', sortOrder: 'desc' });
  const [showForm, setShowForm] = useState(false);
  const [editData, setEditData] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [pendingDelete, setPendingDelete] = useState({}); // id -> timeout
  const { success, error: showError, info } = useToast();

  const { transactions, loading, refetch, softDeleteTransaction, restoreTransaction } = useTransactions(filters);
  const { categories } = useCategories();

  const categoryOptions = useMemo(() => [
    { value: '', label: 'All Categories' },
    ...categories.map((c) => ({ value: c.id, label: c.name })),
  ], [categories]);

  const handleFilterChange = useCallback((e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  }, []);

  const handleSortChange = useCallback((e) => {
    const [sortBy, sortOrder] = e.target.value.split('_');
    setFilters((prev) => ({ ...prev, sortBy, sortOrder }));
  }, []);

  const handleEdit = useCallback((tx) => {
    setEditData(tx);
    setShowForm(true);
  }, []);

  const handleDelete = useCallback(
    async (tx) => {
      const { error } = await softDeleteTransaction(tx.id);
      if (error) {
        showError('Failed to delete transaction.');
        return;
      }

      // Show undo toast for 5 seconds
      const toastId = info(
        `Deleted "${tx.note || tx.type}" transaction`,
        {
          label: 'Undo',
          onClick: async () => {
            clearTimeout(pendingDelete[tx.id]);
            setPendingDelete((prev) => { const n = { ...prev }; delete n[tx.id]; return n; });
            const { error: restoreErr } = await restoreTransaction(tx.id);
            if (!restoreErr) success('Transaction restored.');
            else showError('Could not undo delete.');
          },
        },
        5000
      );

      // After 5s, the transaction stays soft-deleted (already removed from UI)
      const timer = setTimeout(() => {
        setPendingDelete((prev) => { const n = { ...prev }; delete n[tx.id]; return n; });
      }, 5000);
      setPendingDelete((prev) => ({ ...prev, [tx.id]: timer }));
    },
    [softDeleteTransaction, restoreTransaction, pendingDelete, success, showError, info]
  );

  const handleExport = useCallback(async () => {
    try {
      const token = getToken();
      const params = new URLSearchParams();
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      if (filters.type) params.append('type', filters.type);

      const res = await fetch(`${import.meta.env.VITE_API_URL}/reports/export/transactions?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `transactions-${Date.now()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      success('Export downloaded.');
    } catch {
      // Fallback to client-side export
      exportTransactionsCSV(transactions);
      success('Export downloaded.');
    }
  }, [filters, getToken, transactions, success]);

  const currentSort = `${filters.sortBy}_${filters.sortOrder}`;

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            name="search"
            value={filters.search}
            onChange={handleFilterChange}
            placeholder="Search transactions..."
            className="input-field pl-8"
          />
        </div>

        <div className="flex gap-2">
          <Button
            variant="secondary"
            icon={SlidersHorizontal}
            onClick={() => setShowFilters((v) => !v)}
          >
            Filters
          </Button>
          <Button
            variant="secondary"
            icon={Download}
            onClick={handleExport}
          >
            Export
          </Button>
          <Button icon={Plus} onClick={() => { setEditData(null); setShowForm(true); }}>
            Add
          </Button>
        </div>
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div className="card grid grid-cols-2 md:grid-cols-4 gap-3 animate-slide-up">
          <Select
            label="Type"
            name="type"
            value={filters.type}
            onChange={handleFilterChange}
            options={TYPES}
          />
          <Select
            label="Category"
            name="categoryId"
            value={filters.categoryId || ''}
            onChange={handleFilterChange}
            options={categoryOptions}
          />
          <Input
            label="From"
            name="startDate"
            type="date"
            value={filters.startDate}
            onChange={handleFilterChange}
          />
          <Input
            label="To"
            name="endDate"
            type="date"
            value={filters.endDate}
            onChange={handleFilterChange}
          />
          <Select
            label="Sort by"
            name="sort"
            value={currentSort}
            onChange={handleSortChange}
            options={SORT_OPTIONS}
          />
          <div className="flex items-end">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setFilters({ type: '', startDate: '', endDate: '', search: '', sortBy: 'date', sortOrder: 'desc' })}
            >
              Clear
            </Button>
          </div>
        </div>
      )}

      {/* Transaction Table */}
      <div className="card overflow-hidden !p-0">
        {loading ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner size="md" />
          </div>
        ) : transactions.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-sm text-gray-500">No transactions found.</p>
            <Button
              size="sm"
              className="mt-3"
              onClick={() => { setEditData(null); setShowForm(true); }}
            >
              Add your first transaction
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-dark-50">
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">Category</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">Note</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-50">
                {transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-dark-100 transition-colors group">
                    <td className="px-4 py-3 text-gray-400 whitespace-nowrap">{formatDate(tx.date)}</td>
                    <td className="px-4 py-3">
                      <Badge variant={tx.type} label={tx.type} />
                    </td>
                    <td className="px-4 py-3 text-gray-300 hidden sm:table-cell">
                      {tx.categories?.name || '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-400 max-w-[180px] truncate hidden md:table-cell">
                      {tx.note || '—'}
                    </td>
                    <td className={`px-4 py-3 text-right font-medium whitespace-nowrap ${
                      tx.type === 'income' ? 'text-primary-400' : 'text-red-400'
                    }`}>
                      {tx.type === 'income' ? '+' : '-'}
                      {formatCurrency(tx.amount)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleEdit(tx)}
                          className="text-gray-500 hover:text-primary-400 text-xs px-2 py-1 rounded hover:bg-dark-50"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(tx)}
                          className="text-gray-500 hover:text-red-400 text-xs px-2 py-1 rounded hover:bg-dark-50"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Form Modal */}
      {showForm && (
        <TransactionForm
          isOpen={showForm}
          onClose={() => { setShowForm(false); setEditData(null); }}
          onSuccess={() => { setShowForm(false); setEditData(null); refetch(); }}
          editData={editData}
        />
      )}
    </div>
  );
}
