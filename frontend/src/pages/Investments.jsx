import { useState, useCallback, useMemo } from 'react';
import { Plus, Pencil, Trash2, TrendingUp } from 'lucide-react';
import { useInvestments } from '../hooks/useInvestments';
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
  const y = getCurrentYear() - 2 + i;
  return { value: y, label: String(y) };
});

const INVESTMENT_TYPES = [
  { value: 'stocks', label: 'Stocks' },
  { value: 'bonds', label: 'Bonds' },
  { value: 'crypto', label: 'Crypto' },
  { value: 'real_estate', label: 'Real Estate' },
  { value: 'mutual_funds', label: 'Mutual Funds' },
  { value: 'etf', label: 'ETF' },
  { value: 'general', label: 'General' },
];

const TYPE_COLOR = {
  stocks: 'text-blue-400 bg-blue-400/10',
  bonds: 'text-purple-400 bg-purple-400/10',
  crypto: 'text-yellow-400 bg-yellow-400/10',
  real_estate: 'text-orange-400 bg-orange-400/10',
  mutual_funds: 'text-cyan-400 bg-cyan-400/10',
  etf: 'text-indigo-400 bg-indigo-400/10',
  general: 'text-gray-400 bg-gray-400/10',
};

const EMPTY_FORM = { name: '', investment_type: 'general', amount: '', date: '', notes: '' };

export default function Investments() {
  const [month, setMonth] = useState(getCurrentMonth());
  const [year, setYear] = useState(getCurrentYear());
  const [showForm, setShowForm] = useState(false);
  const [editData, setEditData] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const { investments, loading, addInvestment, updateInvestment, deleteInvestment } = useInvestments(month, year);
  const { success, error: showError } = useToast();

  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: '' }));
  }, []);

  const openAdd = useCallback(() => {
    setForm(EMPTY_FORM);
    setEditData(null);
    setErrors({});
    setShowForm(true);
  }, []);

  const openEdit = useCallback((inv) => {
    setForm({
      name: inv.name,
      investment_type: inv.type,
      amount: (Number(inv.amount) / 100).toFixed(2),
      date: inv.date,
      notes: inv.notes || '',
    });
    setEditData(inv);
    setErrors({});
    setShowForm(true);
  }, []);

  const handleSave = useCallback(async () => {
    const errs = {};
    if (!form.name.trim()) errs.name = 'Name is required';
    const amt = parseFloat(form.amount);
    if (!form.amount || isNaN(amt) || amt <= 0) errs.amount = 'Enter a valid amount';
    if (!form.date) errs.date = 'Date is required';
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setSaving(true);
    const payload = { ...form };
    const fn = editData
      ? () => updateInvestment(editData.id, payload)
      : () => addInvestment(payload);

    const { error } = await fn();
    setSaving(false);

    if (error) showError(error.message || 'Failed to save investment.');
    else { success(editData ? 'Investment updated.' : 'Investment added.'); setShowForm(false); }
  }, [form, editData, addInvestment, updateInvestment, success, showError]);

  const handleDelete = useCallback(async (id) => {
    const { error } = await deleteInvestment(id);
    setDeleteConfirm(null);
    if (error) showError('Failed to delete investment.');
    else success('Investment deleted.');
  }, [deleteInvestment, success, showError]);

  const total = useMemo(() => investments.reduce((s, inv) => s + Number(inv.amount), 0), [investments]);

  const byType = useMemo(() => {
    return investments.reduce((acc, inv) => {
      acc[inv.investment_type] = (acc[inv.investment_type] || 0) + Number(inv.amount);
      return acc;
    }, {});
  }, [investments]);

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
          Add Investment
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="card sm:col-span-2">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp size={14} className="text-primary-400" />
            <p className="text-xs text-gray-500">Total Invested</p>
          </div>
          <p className="text-2xl font-bold text-primary-400">{formatCurrency(total)}</p>
          <p className="text-xs text-gray-500 mt-0.5">{getMonthName(month)} {year}</p>
        </div>
        {Object.entries(byType).slice(0, 2).map(([type, amount]) => (
          <div key={type} className="card">
            <p className={`text-xs px-2 py-0.5 rounded-full inline-block mb-2 ${TYPE_COLOR[type] || TYPE_COLOR.general}`}>
              {INVESTMENT_TYPES.find((t) => t.value === type)?.label || type}
            </p>
            <p className="text-lg font-semibold text-gray-200">{formatCurrency(amount)}</p>
          </div>
        ))}
      </div>

      {/* Investment list */}
      {loading ? (
        <div className="flex justify-center py-10"><LoadingSpinner /></div>
      ) : investments.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-sm text-gray-500">No investments recorded for {getMonthName(month)} {year}.</p>
          <Button size="sm" className="mt-3" onClick={openAdd}>Add your first investment</Button>
        </div>
      ) : (
        <div className="card overflow-hidden p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-dark-50">
                <th className="text-left text-xs text-gray-500 font-medium px-4 py-3">Name</th>
                <th className="text-left text-xs text-gray-500 font-medium px-4 py-3 hidden sm:table-cell">Type</th>
                <th className="text-left text-xs text-gray-500 font-medium px-4 py-3 hidden md:table-cell">Date</th>
                <th className="text-right text-xs text-gray-500 font-medium px-4 py-3">Amount</th>
                <th className="px-4 py-3 w-16" />
              </tr>
            </thead>
            <tbody>
              {investments.map((inv) => (
                <tr key={inv.id} className="border-b border-dark-50/50 hover:bg-dark-50/30 group transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-200">{inv.name}</p>
                    {inv.notes && <p className="text-xs text-gray-500 truncate max-w-[180px]">{inv.notes}</p>}
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${TYPE_COLOR[inv.type] || TYPE_COLOR.general}`}>
                      {INVESTMENT_TYPES.find((t) => t.value === inv.type)?.label || inv.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400 hidden md:table-cell">
                    {new Date(inv.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-primary-400">
                    {formatCurrency(Number(inv.amount))}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => openEdit(inv)}
                        className="p-1.5 rounded text-gray-500 hover:text-primary-400 hover:bg-dark-50"
                      >
                        <Pencil size={12} />
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(inv)}
                        className="p-1.5 rounded text-gray-500 hover:text-red-400 hover:bg-dark-50"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Form Modal */}
      <Modal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        title={editData ? 'Edit Investment' : 'Add Investment'}
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowForm(false)} disabled={saving}>Cancel</Button>
            <Button onClick={handleSave} loading={saving}>{editData ? 'Update' : 'Add'} Investment</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Investment Name"
            name="name"
            value={form.name}
            onChange={handleChange}
            placeholder="e.g. AAPL, Bitcoin, Index Fund"
            error={errors.name}
          />
          <Select
            label="Type"
            name="investment_type"
            value={form.investment_type}
            onChange={handleChange}
            options={INVESTMENT_TYPES}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Amount (PHP)"
              name="amount"
              type="number"
              step="0.01"
              min="0.01"
              value={form.amount}
              onChange={handleChange}
              placeholder="0.00"
              error={errors.amount}
            />
            <Input
              label="Date"
              name="date"
              type="date"
              value={form.date}
              onChange={handleChange}
              error={errors.date}
            />
          </div>
          <div>
            <label className="label">Notes (optional)</label>
            <textarea
              name="notes"
              value={form.notes}
              onChange={handleChange}
              rows={2}
              placeholder="Any additional notes..."
              className="input-field resize-none"
            />
          </div>
        </div>
      </Modal>

      {/* Delete Confirm */}
      <Modal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="Delete Investment"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
            <Button variant="danger" onClick={() => handleDelete(deleteConfirm?.id)}>Delete</Button>
          </>
        }
      >
        <p className="text-sm text-gray-400">
          Delete <span className="text-white font-medium">{deleteConfirm?.name}</span>? This cannot be undone.
        </p>
      </Modal>
    </div>
  );
}
