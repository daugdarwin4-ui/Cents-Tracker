import { useState, useCallback, useMemo } from 'react';
import {
  ClipboardList,
  Plus,
  Pencil,
  Trash2,
  CheckCircle2,
  Clock,
  Link2,
  Search,
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

// ── Month / Year filter options ───────────────────────────
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

// ── Summary Card ──────────────────────────────────────────
function SummaryCard({ label, value, sub, accent }) {
  return (
    <div className="card flex flex-col gap-1">
      <span className="text-xs text-gray-500 uppercase tracking-wide">{label}</span>
      <span className={`text-2xl font-bold ${accent}`}>{value}</span>
      {sub && <span className="text-xs text-gray-600">{sub}</span>}
    </div>
  );
}

// ── Progress Bar ──────────────────────────────────────────
function ProgressBar({ pct }) {
  return (
    <div className="card space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-400 font-medium">Completion</span>
        <span className="text-primary-400 font-semibold">{pct.toFixed(0)}%</span>
      </div>
      <div className="h-2.5 rounded-full bg-dark-50 overflow-hidden">
        <div
          className="h-full rounded-full bg-primary-500 transition-all duration-500"
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
    </div>
  );
}

// ── Checklist Row ─────────────────────────────────────────
function ChecklistRow({ item, onToggle, onEdit, onDelete }) {
  const isPaid = item.status === 'paid';

  return (
    <div
      className={`card flex items-start gap-3 transition-all duration-200
        ${isPaid ? 'opacity-70' : 'hover:border-dark-100'}`}
    >
      {/* Toggle checkbox */}
      <button
        onClick={() => onToggle(item.id)}
        title={isPaid ? 'Mark as pending' : 'Mark as paid'}
        className={`mt-0.5 flex-shrink-0 transition-colors
          ${isPaid ? 'text-primary-500 hover:text-primary-400' : 'text-gray-600 hover:text-primary-500'}`}
      >
        {isPaid ? <CheckSquare size={18} /> : <Square size={18} />}
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`text-sm font-medium ${isPaid ? 'line-through text-gray-500' : 'text-gray-200'}`}
          >
            {item.title}
          </span>

          {/* Status badge */}
          {isPaid ? (
            <span className="badge-income inline-flex items-center gap-1">
              <CheckCircle2 size={10} />
              Paid
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-950/50 text-yellow-400 border border-yellow-900/30">
              <Clock size={10} />
              Pending
            </span>
          )}

          {/* Category */}
          {item.categories && (
            <span
              className="text-xs px-2 py-0.5 rounded-full border"
              style={{
                color: item.categories.color,
                borderColor: `${item.categories.color}40`,
                backgroundColor: `${item.categories.color}18`,
              }}
            >
              {item.categories.name}
            </span>
          )}
        </div>

        {/* Meta row */}
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5 text-xs text-gray-500">
          {item.expected_amount && (
            <span>{formatCurrency(item.expected_amount)}</span>
          )}
          {item.due_date && (
            <span>Due {formatDate(item.due_date)}</span>
          )}
          <span>{getMonthName(item.month)} {item.year}</span>
          {item.linked_transaction_id && (
            <span className="flex items-center gap-1 text-primary-500">
              <Link2 size={10} />
              Linked to transaction
            </span>
          )}
        </div>

        {item.notes && (
          <p className="mt-1 text-xs text-gray-600 italic truncate max-w-md">{item.notes}</p>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-1 flex-shrink-0">
        <button
          onClick={() => onEdit(item)}
          title="Edit"
          className="p-1.5 rounded text-gray-600 hover:text-primary-400 hover:bg-dark-50 transition-colors"
        >
          <Pencil size={14} />
        </button>
        <button
          onClick={() => onDelete(item)}
          title="Delete"
          className="p-1.5 rounded text-gray-600 hover:text-red-400 hover:bg-red-950/30 transition-colors"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────
export default function Checklist() {
  const [filterMonth, setFilterMonth] = useState(getCurrentMonth());
  const [filterYear, setFilterYear] = useState(getCurrentYear());
  const [filterStatus, setFilterStatus] = useState('');
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [saving, setSaving] = useState(false);

  const { items, loading, error, addItem, updateItem, deleteItem, toggleStatus, refetch } =
    useChecklists(filterMonth, filterYear);
  const { categories } = useCategories();
  const { success, error: showError } = useToast();

  // ── Stats ────────────────────────────────────────────────
  const stats = useMemo(() => {
    const total = items.length;
    const paid = items.filter((i) => i.status === 'paid').length;
    const pending = total - paid;
    const pct = total > 0 ? (paid / total) * 100 : 0;
    return { total, paid, pending, pct };
  }, [items]);

  // ── Filtered display list ────────────────────────────────
  const displayItems = useMemo(() => {
    let list = items;
    if (filterStatus) list = list.filter((i) => i.status === filterStatus);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((i) => i.title.toLowerCase().includes(q));
    }
    return list;
  }, [items, filterStatus, search]);

  // ── Handlers ─────────────────────────────────────────────
  const handleOpenAdd = useCallback(() => {
    setEditItem(null);
    setModalOpen(true);
  }, []);

  const handleEdit = useCallback((item) => {
    setEditItem(item);
    setModalOpen(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setModalOpen(false);
    setEditItem(null);
  }, []);

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

  const handleDeleteConfirm = useCallback((item) => {
    setConfirmDelete(item);
  }, []);

  const handleDeleteCancel = useCallback(() => {
    setConfirmDelete(null);
  }, []);

  const handleDeleteExecute = useCallback(async () => {
    if (!confirmDelete) return;
    const { error: err } = await deleteItem(confirmDelete.id);
    setConfirmDelete(null);
    if (err) showError('Could not delete item.');
    else success('Item deleted.');
  }, [confirmDelete, deleteItem, success, showError]);

  // ── Render ───────────────────────────────────────────────
  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <ClipboardList size={18} className="text-primary-400" />
          <div>
            <h1 className="text-base font-semibold text-gray-100">Checklist</h1>
            <p className="text-xs text-gray-500">
              {getMonthName(filterMonth)} {filterYear} · Track recurring expense payments
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

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <SummaryCard
          label="Total Items"
          value={stats.total}
          accent="text-gray-100"
          sub={`${getMonthName(filterMonth)} ${filterYear}`}
        />
        <SummaryCard
          label="Paid"
          value={stats.paid}
          accent="text-primary-400"
          sub="completed"
        />
        <SummaryCard
          label="Pending"
          value={stats.pending}
          accent="text-yellow-400"
          sub="remaining"
        />
        <SummaryCard
          label="Progress"
          value={`${stats.pct.toFixed(0)}%`}
          accent={stats.pct === 100 ? 'text-primary-400' : stats.pct > 50 ? 'text-blue-400' : 'text-yellow-400'}
          sub={stats.total > 0 ? `${stats.paid} of ${stats.total} done` : 'No items yet'}
        />
      </div>

      {/* Progress Bar */}
      {stats.total > 0 && <ProgressBar pct={stats.pct} />}

      {/* Item List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner />
        </div>
      ) : error ? (
        <div className="card text-center py-10">
          <p className="text-sm text-red-400">{error}</p>
          <Button variant="secondary" size="sm" className="mt-3" onClick={refetch}>
            Retry
          </Button>
        </div>
      ) : displayItems.length === 0 ? (
        <div className="card text-center py-14">
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
        <div className="space-y-2.5">
          {displayItems.map((item) => (
            <ChecklistRow
              key={item.id}
              item={item}
              onToggle={handleToggle}
              onEdit={handleEdit}
              onDelete={handleDeleteConfirm}
            />
          ))}
        </div>
      )}

      {/* Add / Edit Modal */}
      <ChecklistItemModal
        isOpen={modalOpen}
        onClose={handleCloseModal}
        onSave={handleSave}
        item={editItem}
        categories={categories}
        saving={saving}
      />

      {/* Delete Confirmation Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={handleDeleteCancel}
          />
          <div className="relative bg-dark-200 border border-dark-50 rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <Trash2 size={28} className="text-red-400 mb-3 mx-auto" />
            <h3 className="text-base font-semibold text-center text-white mb-1">Delete Item</h3>
            <p className="text-sm text-gray-400 text-center mb-5">
              Delete <strong className="text-gray-200">{confirmDelete.title}</strong>? This cannot
              be undone.
            </p>
            <div className="flex gap-2">
              <Button variant="secondary" className="flex-1" onClick={handleDeleteCancel}>
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
