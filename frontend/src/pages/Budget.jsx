import { useState, useCallback, useMemo } from 'react';
import { Plus, Pencil, Trash2, AlertTriangle } from 'lucide-react';
import { useBudgets, useCategorySpending } from '../hooks/useBudgets';
import { useCategories } from '../hooks/useCategories';
import { useToast } from '../context/ToastContext';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { formatCurrency } from '../utils/currency';
import { getCurrentMonth, getCurrentYear, getMonthName } from '../utils/date';

const MONTH_OPTIONS = Array.from({ length: 12 }, (_, i) => ({
  value: i + 1,
  label: getMonthName(i + 1),
}));

const YEAR_OPTIONS = Array.from({ length: 5 }, (_, i) => {
  const y = getCurrentYear() - 1 + i;
  return { value: y, label: String(y) };
});

function BudgetProgressBar({ spent, budget, label, color }) {
  const pct = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0;
  const over = spent > budget;

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm font-medium text-gray-300">{label}</span>
        {over && (
          <span className="flex items-center gap-1 text-xs text-red-400">
            <AlertTriangle size={11} /> Over budget
          </span>
        )}
      </div>
      <div className="h-2 rounded-full bg-dark-50 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: over ? '#ef4444' : color }}
        />
      </div>
      <div className="flex justify-between mt-1 text-xs text-gray-500">
        <span>{formatCurrency(spent)} spent</span>
        <span>{formatCurrency(budget)} budget</span>
      </div>
    </div>
  );
}

export default function Budget() {
  const [month, setMonth] = useState(getCurrentMonth());
  const [year, setYear] = useState(getCurrentYear());
  const [showForm, setShowForm] = useState(false);
  const [editData, setEditData] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [form, setForm] = useState({ category_id: '', amount: '' });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const { budgets, loading, upsertBudget, deleteBudget } = useBudgets(month, year);
  const { spending, loading: spendingLoad } = useCategorySpending(month, year);
  const { categories } = useCategories('expense');
  const { success, error: showError } = useToast();

  const categoryOptions = useMemo(
    () => categories.map((c) => ({ value: c.id, label: c.name })),
    [categories]
  );

  const budgetCategoryIds = useMemo(() => new Set(budgets.map((b) => b.category_id)), [budgets]);

  const availableCategories = useMemo(
    () => categoryOptions.filter((c) => !budgetCategoryIds.has(c.value) || editData?.category_id === c.value),
    [categoryOptions, budgetCategoryIds, editData]
  );

  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: '' }));
  }, []);

  const openAdd = useCallback(() => {
    setForm({ category_id: '', amount: '' });
    setEditData(null);
    setErrors({});
    setShowForm(true);
  }, []);

  const openEdit = useCallback((budget) => {
    setForm({
      category_id: budget.category_id,
      amount: (Number(budget.amount) / 100).toFixed(2),
    });
    setEditData(budget);
    setErrors({});
    setShowForm(true);
  }, []);

  const handleSave = useCallback(async () => {
    const errs = {};
    if (!form.category_id) errs.category_id = 'Select a category';
    const amt = parseFloat(form.amount);
    if (!form.amount || isNaN(amt) || amt <= 0) errs.amount = 'Enter a valid amount';
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setSaving(true);
    const { error } = await upsertBudget({
      category_id: form.category_id,
      amount: form.amount,
      month,
      year,
    });
    setSaving(false);

    if (error) showError(error.message || 'Failed to save budget.');
    else { success('Budget saved.'); setShowForm(false); }
  }, [form, month, year, upsertBudget, success, showError]);

  const handleDelete = useCallback(async (id) => {
    const { error } = await deleteBudget(id);
    setDeleteConfirm(null);
    if (error) showError('Failed to delete budget.');
    else success('Budget removed.');
  }, [deleteBudget, success, showError]);

  const totalBudget = useMemo(() => budgets.reduce((s, b) => s + Number(b.amount), 0), [budgets]);
  const totalSpent = useMemo(() => budgets.reduce((s, b) => s + (spending[b.category_id] || 0), 0), [budgets, spending]);
  const overBudgetCount = useMemo(
    () => budgets.filter((b) => (spending[b.category_id] || 0) > Number(b.amount)).length,
    [budgets, spending]
  );

  return (
    <div className="space-y-5">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex gap-2">
          <Select
            name="month"
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            options={MONTH_OPTIONS}
            containerClassName="w-36"
          />
          <Select
            name="year"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            options={YEAR_OPTIONS}
            containerClassName="w-24"
          />
        </div>
        <Button icon={Plus} onClick={openAdd}>
          Set Budget
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card">
          <p className="text-xs text-gray-500 mb-1">Total Budget</p>
          <p className="text-xl font-bold text-primary-400">{formatCurrency(totalBudget)}</p>
        </div>
        <div className="card">
          <p className="text-xs text-gray-500 mb-1">Total Spent</p>
          <p className={`text-xl font-bold ${totalSpent > totalBudget ? 'text-red-400' : 'text-gray-200'}`}>
            {formatCurrency(totalSpent)}
          </p>
        </div>
        <div className="card">
          <p className="text-xs text-gray-500 mb-1">Over Budget</p>
          <p className={`text-xl font-bold ${overBudgetCount > 0 ? 'text-red-400' : 'text-primary-400'}`}>
            {overBudgetCount} {overBudgetCount === 1 ? 'category' : 'categories'}
          </p>
        </div>
      </div>

      {/* Budget list */}
      {loading || spendingLoad ? (
        <div className="flex justify-center py-10"><LoadingSpinner /></div>
      ) : budgets.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-sm text-gray-500">No budgets set for {getMonthName(month)} {year}.</p>
          <Button size="sm" className="mt-3" onClick={openAdd}>Set your first budget</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {budgets.map((budget) => {
            const spent = spending[budget.category_id] || 0;
            return (
              <div key={budget.id} className="card group">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-sm font-medium text-gray-200">{budget.categories?.name}</p>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => openEdit(budget)}
                      className="p-1.5 rounded text-gray-500 hover:text-primary-400 hover:bg-dark-50"
                    >
                      <Pencil size={12} />
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(budget)}
                      className="p-1.5 rounded text-gray-500 hover:text-red-400 hover:bg-dark-50"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
                <BudgetProgressBar
                  spent={spent}
                  budget={Number(budget.amount)}
                  label=""
                  color={budget.categories?.color || '#22c55e'}
                />
                <p className="mt-2 text-xs text-gray-500">
                  Remaining:{' '}
                  <span className={Number(budget.amount) - spent < 0 ? 'text-red-400' : 'text-primary-400'}>
                    {formatCurrency(Number(budget.amount) - spent)}
                  </span>
                </p>
              </div>
            );
          })}
        </div>
      )}

      {/* Form Modal */}
      <Modal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        title={editData ? 'Edit Budget' : 'Set Budget'}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowForm(false)} disabled={saving}>Cancel</Button>
            <Button onClick={handleSave} loading={saving}>Save Budget</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Select
            label="Category"
            name="category_id"
            value={form.category_id}
            onChange={handleChange}
            options={availableCategories}
            placeholder="Select expense category"
            error={errors.category_id}
            disabled={!!editData}
          />
          <Input
            label={`Budget Amount for ${getMonthName(month)} ${year} (PHP)`}
            name="amount"
            type="number"
            step="0.01"
            min="0.01"
            value={form.amount}
            onChange={handleChange}
            placeholder="0.00"
            error={errors.amount}
          />
        </div>
      </Modal>

      {/* Delete Confirm */}
      <Modal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="Remove Budget"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
            <Button variant="danger" onClick={() => handleDelete(deleteConfirm?.id)}>Remove</Button>
          </>
        }
      >
        <p className="text-sm text-gray-400">
          Remove the budget for <span className="text-white font-medium">{deleteConfirm?.categories?.name}</span>?
        </p>
      </Modal>
    </div>
  );
}
