import { useState, useCallback, useMemo } from 'react';
import {
  ClipboardList,
  Plus,
  Pencil,
  Trash2,
  CheckCircle2,
  Clock,
  Link2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  CheckSquare,
  Square,
} from 'lucide-react';
import { useChecklists } from '../hooks/useChecklists';
import { useCategories } from '../hooks/useCategories';
import { useToast } from '../context/ToastContext';
import Button from '../components/ui/Button';
import Select from '../components/ui/Select';
import Input from '../components/ui/Input';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import ChecklistItemModal from '../components/checklist/ChecklistItemModal';
import { formatCurrency, fromCents } from '../utils/currency';
import { getCurrentMonth, getCurrentYear, getMonthName, formatDate } from '../utils/date';

// â”€â”€ Filter / sort constants â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const MONTH_OPTIONS = Array.from({ length: 12 }, (_, i) => ({
  value: i + 1,
  label: new Date(2000, i).toLocaleString('en-US', { month: 'long' }),
}));

const YEAR_OPTIONS = Array.from({ length: 6 }, (_, i) => {
  const y = getCurrentYear() - 1 + i;
  return { value: y, label: String(y) };
});

const STATUS_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'paid', label: 'Paid' },
];

const SORT_OPTIONS = [
  { value: 'due_date_asc', label: 'Due Date (Earliest)' },
  { value: 'due_date_desc', label: 'Due Date (Latest)' },
  { value: 'amount_desc', label: 'Amount (High â†’ Low)' },
  { value: 'amount_asc', label: 'Amount (Low â†’ High)' },
  { value: 'status_asc', label: 'Status (Pending first)' },
  { value: 'status_desc', label: 'Status (Paid first)' },
];

// â”€â”€ Summary Card â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function SummaryCard({ label, value, sub, accent }) {
  return (
    <div className="card flex flex-col gap-1 min-w-0">
      <span className="text-xs text-gray-500 uppercase tracking-wide truncate">{label}</span>
      <span className={`text-xl sm:text-2xl font-bold tabular-nums truncate ${accent}`}>{value}</span>
      {sub && <span className="text-xs text-gray-600">{sub}</span>}
    </div>
  );
}

// â”€â”€ Progress Bar â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function ProgressBar({ pct, paidAmount, totalAmount }) {
  const safeP = Math.min(Math.max(pct, 0), 100);
  const barColor =
    safeP === 100 ? '#22c55e' : safeP >= 50 ? '#3b82f6' : '#f59e0b';

  return (
    <div className="card space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-400 font-medium">Payment Progress</span>
        <span className="font-semibold tabular-nums" style={{ color: barColor }}>
          {safeP.toFixed(1)}%
        </span>
      </div>
      <div className="h-2.5 rounded-full bg-dark-50 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${safeP}%`, backgroundColor: barColor }}
        />
      </div>
      <div className="flex justify-between text-xs text-gray-600 tabular-nums">
        <span>{formatCurrency(paidAmount)} paid</span>
        <span>{formatCurrency(totalAmount)} total</span>
      </div>
    </div>
  );
}

// â”€â”€ Checklist Table Row â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function ChecklistTableRow({ item, onToggle, onEdit, onDelete }) {
  const isPaid = item.status === 'paid';

  return (
    <tr
      className={`border-b border-dark-50 transition-colors group
        ${isPaid ? 'opacity-60 hover:opacity-80' : 'hover:bg-dark-100'}`}
    >
      {/* Checkbox */}
      <td className="px-3 py-3 w-8">
        <button
          onClick={() => onToggle(item.id)}
          title={isPaid ? 'Mark as pending' : 'Mark as paid'}
          className={`flex-shrink-0 transition-colors
            ${isPaid ? 'text-primary-500 hover:text-primary-400' : 'text-gray-600 hover:text-primary-500'}`}
        >
          {isPaid ? <CheckSquare size={16} /> : <Square size={16} />}
        </button>
      </td>

      {/* Due Date */}
      <td className="px-3 py-3 text-xs text-gray-400 whitespace-nowrap w-24">
        {item.due_date ? formatDate(item.due_date) : (
          <span className="text-gray-700">â€”</span>
        )}
      </td>

      {/* Status */}
      <td className="px-3 py-3 w-24">
        {isPaid ? (
          <span className="badge-income inline-flex items-center gap-1 whitespace-nowrap">
            <CheckCircle2 size={10} />
            Paid
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-950/50 text-yellow-400 border border-yellow-900/30 whitespace-nowrap">
            <Clock size={10} />
            Pending
          </span>
        )}
      </td>

      {/* Title + linked indicator */}
      <td className="px-3 py-3 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-sm font-medium ${isPaid ? 'line-through text-gray-500' : 'text-gray-100'}`}>
            {item.title}
          </span>
          {item.linked_transaction_id && (
            <span className="inline-flex items-center gap-1 text-xs text-primary-500">
              <Link2 size={10} />
              auto-matched
            </span>
          )}
          {item.notes && (
            <span className="text-xs text-gray-600 italic hidden sm:inline truncate max-w-[160px]">
              {item.notes}
            </span>
          )}
        </div>
      </td>

      {/* Category */}
      <td className="px-3 py-3 hidden sm:table-cell w-36">
        {item.categories ? (
          <span
            className="text-xs px-2 py-0.5 rounded-full border whitespace-nowrap"
            style={{
              color: item.categories.color,
              borderColor: `${item.categories.color}40`,
              backgroundColor: `${item.categories.color}18`,
            }}
          >
            {item.categories.name}
          </span>
        ) : (
          <span className="text-gray-700 text-xs">â€”</span>
        )}
      </td>

      {/* Billing Month */}
      <td className="px-3 py-3 text-xs text-gray-500 hidden md:table-cell whitespace-nowrap w-28">
        {getMonthName(item.month, 'short')} {item.year}
      </td>

      {/* Amount */}
      <td className="px-3 py-3 text-right w-32">
        {item.expected_amount ? (
          <span
            className={`text-sm font-bold tabular-nums whitespace-nowrap
              ${isPaid ? 'text-primary-400' : 'text-yellow-300'}`}
          >
            {formatCurrency(item.expected_amount)}
          </span>
        ) : (
          <span className="text-gray-700 text-xs">â€”</span>
        )}
      </td>

      {/* Actions */}
      <td className="px-3 py-3 w-20">
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
          <button
            onClick={() => onEdit(item)}
            title="Edit"
            className="p-1.5 rounded text-gray-500 hover:text-primary-400 hover:bg-dark-50 transition-colors"
          >
            <Pencil size={13} />
          </button>
          <button
            onClick={() => onDelete(item)}
            title="Delete"
            className="p-1.5 rounded text-gray-500 hover:text-red-400 hover:bg-red-950/30 transition-colors"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </td>
    </tr>
  );
}

// â”€â”€ Main Page â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export default function Checklist() {
  const [filterMonth, setFilterMonth] = useState(getCurrentMonth());
  const [filterYear, setFilterYear] = useState(getCurrentYear());
  const [filterStatus, setFilterStatus] = useState('');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('due_date_asc');
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [saving, setSaving] = useState(false);

  const { items, loading, error, addItem, updateItem, deleteItem, toggleStatus, refetch } =
    useChecklists(filterMonth, filterYear);
  const { categories } = useCategories();
  const { success, error: showError } = useToast();

  // â”€â”€ Amount-based stats â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const stats = useMemo(() => {
    const totalToPay = items.reduce((sum, i) => sum + (i.expected_amount || 0), 0);
    const totalPaid = items.reduce(
      (sum, i) => sum + (i.status === 'paid' ? i.expected_amount || 0 : 0),
      0
    );
    const remaining = totalToPay - totalPaid;
    const pct = totalToPay > 0 ? (totalPaid / totalToPay) * 100 : 0;
    return { totalToPay, totalPaid, remaining, pct };
  }, [items]);

  // â”€â”€ Sorted + filtered display list â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const displayItems = useMemo(() => {
    let list = items;
    if (filterStatus) list = list.filter((i) => i.status === filterStatus);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((i) => i.title.toLowerCase().includes(q));
    }

    const [sortField, sortDir] = sort.split('_').reduce((acc, part, idx, arr) => {
      if (idx === arr.length - 1) return [arr.slice(0, -1).join('_'), part];
      return acc;
    }, ['', '']);

    list = [...list].sort((a, b) => {
      let cmp = 0;
      if (sortField === 'due_date') {
        const da = a.due_date ? new Date(a.due_date) : new Date('9999-12-31');
        const db = b.due_date ? new Date(b.due_date) : new Date('9999-12-31');
        cmp = da - db;
      } else if (sortField === 'amount') {
        cmp = (a.expected_amount || 0) - (b.expected_amount || 0);
      } else if (sortField === 'status') {
        cmp = a.status.localeCompare(b.status);
      }
      return sortDir === 'desc' ? -cmp : cmp;
    });

    return list;
  }, [items, filterStatus, search, sort]);

  // â”€â”€ Handlers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handleOpenAdd = useCallback(() => { setEditItem(null); setModalOpen(true); }, []);
  const handleEdit = useCallback((item) => { setEditItem(item); setModalOpen(true); }, []);
  const handleCloseModal = useCallback(() => { setModalOpen(false); setEditItem(null); }, []);

  const handleSave = useCallback(
    async (payload) => {
      setSaving(true);
      try {
        if (editItem) {
          const { error: err } = await updateItem(editItem.id, payload);
          if (err) throw err;
          success('Checklist item updated.');
        } else {
          const { error: err } = await addItem(payload);
          if (err) throw err;
          success('Checklist item added.');
        }
        handleCloseModal();
      } catch (err) {
        showError(err.message || 'Could not save item.');
      } finally {
        setSaving(false);
      }
    },
    [editItem, addItem, updateItem, success, showError, handleCloseModal]
  );

  const handleToggle = useCallback(
    async (id) => {
      const { error: err } = await toggleStatus(id);
      if (err) showError('Could not update status.');
    },
    [toggleStatus, showError]
  );

  const handleDeleteExecute = useCallback(async () => {
    if (!confirmDelete) return;
    const { error: err } = await deleteItem(confirmDelete.id);
    setConfirmDelete(null);
    if (err) showError('Could not delete item.');
    else success('Item deleted.');
  }, [confirmDelete, deleteItem, success, showError]);

  // â”€â”€ Render â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <ClipboardList size={18} className="text-primary-400" />
          <div>
            <h1 className="text-base font-semibold text-gray-100">Checklist</h1>
            <p className="text-xs text-gray-500">
              {getMonthName(filterMonth)} {filterYear} Â· Payment tracker
            </p>
          </div>
        </div>
        <Button icon={Plus} onClick={handleOpenAdd}>
          Add Item
        </Button>
      </div>

      {/* Filters Row */}
      <div className="flex flex-wrap gap-3 items-end">
        <Select
          label="Month"
          value={filterMonth}
          onChange={(e) => setFilterMonth(Number(e.target.value))}
          options={MONTH_OPTIONS}
          containerClassName="w-36"
        />
        <Select
          label="Year"
          value={filterYear}
          onChange={(e) => setFilterYear(Number(e.target.value))}
          options={YEAR_OPTIONS}
          containerClassName="w-28"
        />
        <Select
          label="Status"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          options={STATUS_OPTIONS}
          containerClassName="w-32"
        />
        <Select
          label="Sort by"
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          options={SORT_OPTIONS}
          containerClassName="w-48"
        />
        <div className="flex-1 min-w-48">
          <Input
            label="Search"
            placeholder="Search by title..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            containerClassName="w-full"
          />
        </div>
      </div>

      {/* Summary Cards â€” Amount-based */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <SummaryCard
          label="Total To Pay"
          value={formatCurrency(stats.totalToPay)}
          accent="text-gray-100"
          sub={`${getMonthName(filterMonth)} ${filterYear}`}
        />
        <SummaryCard
          label="Total Paid"
          value={formatCurrency(stats.totalPaid)}
          accent="text-primary-400"
          sub="already paid"
        />
        <SummaryCard
          label="Remaining Balance"
          value={formatCurrency(stats.remaining)}
          accent={stats.remaining > 0 ? 'text-yellow-400' : 'text-primary-400'}
          sub="left to pay"
        />
        <SummaryCard
          label="Progress"
          value={`${stats.pct.toFixed(1)}%`}
          accent={
            stats.pct === 100
              ? 'text-primary-400'
              : stats.pct >= 50
              ? 'text-blue-400'
              : 'text-yellow-400'
          }
          sub="based on amount paid"
        />
      </div>

      {/* Progress Bar â€” Amount-based */}
      {stats.totalToPay > 0 && (
        <ProgressBar
          pct={stats.pct}
          paidAmount={stats.totalPaid}
          totalAmount={stats.totalToPay}
        />
      )}

      {/* Checklist Table */}
      <div className="card overflow-hidden !p-0">
        {loading ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner />
          </div>
        ) : error ? (
          <div className="text-center py-10">
            <p className="text-sm text-red-400">{error}</p>
            <Button variant="secondary" size="sm" className="mt-3" onClick={refetch}>
              Retry
            </Button>
          </div>
        ) : displayItems.length === 0 ? (
          <div className="text-center py-14">
            <ClipboardList size={36} className="text-gray-700 mx-auto mb-3" />
            {items.length === 0 ? (
              <>
                <p className="text-sm text-gray-400">No checklist items for this period.</p>
                <p className="text-xs text-gray-600 mt-1">
                  Add planned expense payments like rent, utilities, or subscriptions.
                </p>
                <Button icon={Plus} size="sm" className="mt-4 mx-auto" onClick={handleOpenAdd}>
                  Add First Item
                </Button>
              </>
            ) : (
              <p className="text-sm text-gray-500">No items match your current filters.</p>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-dark-50">
                  <th className="px-3 py-3 w-8" />
                  <th className="text-left px-3 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    Due Date
                  </th>
                  <th className="text-left px-3 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="text-left px-3 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    What to Pay
                  </th>
                  <th className="text-left px-3 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">
                    Category
                  </th>
                  <th className="text-left px-3 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell whitespace-nowrap">
                    Billing Month
                  </th>
                  <th className="text-right px-3 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-3 py-3 w-20" />
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-50">
                {displayItems.map((item) => (
                  <ChecklistTableRow
                    key={item.id}
                    item={item}
                    onToggle={handleToggle}
                    onEdit={handleEdit}
                    onDelete={setConfirmDelete}
                  />
                ))}
              </tbody>
              {/* Footer totals row */}
              {displayItems.length > 1 && (
                <tfoot>
                  <tr className="border-t-2 border-dark-50 bg-dark-300/50">
                    <td colSpan={6} className="px-3 py-2.5 text-xs text-gray-500 hidden md:table-cell">
                      {displayItems.length} items
                    </td>
                    <td colSpan={3} className="md:hidden px-3 py-2.5 text-xs text-gray-500">
                      {displayItems.length} items
                    </td>
                    <td className="px-3 py-2.5 text-right hidden md:table-cell">
                      <span className="text-sm font-bold text-gray-200 tabular-nums">
                        {formatCurrency(
                          displayItems.reduce((s, i) => s + (i.expected_amount || 0), 0)
                        )}
                      </span>
                    </td>
                    <td className="px-3 py-2.5" />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      <ChecklistItemModal
        isOpen={modalOpen}
        onClose={handleCloseModal}
        onSave={handleSave}
        item={editItem}
        categories={categories}
        saving={saving}
      />

      {/* Delete Confirmation */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setConfirmDelete(null)}
          />
          <div className="relative bg-dark-200 border border-dark-50 rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <Trash2 size={28} className="text-red-400 mb-3 mx-auto" />
            <h3 className="text-base font-semibold text-center text-white mb-1">Delete Item</h3>
            <p className="text-sm text-gray-400 text-center mb-5">
              Delete <strong className="text-gray-200">{confirmDelete.title}</strong>? This cannot
              be undone.
            </p>
            <div className="flex gap-2">
              <Button variant="secondary" className="flex-1" onClick={() => setConfirmDelete(null)}>
                Cancel
              </Button>
              <Button variant="danger" className="flex-1" onClick={handleDeleteExecute}>
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
