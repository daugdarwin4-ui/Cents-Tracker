import { useState, useEffect, useCallback } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import { fromCents } from '../../utils/currency';
import { getCurrentMonth, getCurrentYear } from '../../utils/date';

const MONTH_OPTIONS = Array.from({ length: 12 }, (_, i) => ({
  value: i + 1,
  label: new Date(2000, i).toLocaleString('en-US', { month: 'long' }),
}));

const YEAR_OPTIONS = Array.from({ length: 6 }, (_, i) => {
  const y = getCurrentYear() - 1 + i;
  return { value: y, label: String(y) };
});

const EMPTY_FORM = {
  title: '',
  category_id: '',
  expected_amount: '',
  due_date: '',
  month: getCurrentMonth(),
  year: getCurrentYear(),
  auto_match_keywords: '',
  notes: '',
};

export default function ChecklistItemModal({ isOpen, onClose, onSave, item, categories, saving }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (item) {
      setForm({
        title: item.title || '',
        category_id: item.category_id || '',
        expected_amount: item.expected_amount ? String(fromCents(item.expected_amount)) : '',
        due_date: item.due_date || '',
        month: item.month || getCurrentMonth(),
        year: item.year || getCurrentYear(),
        auto_match_keywords: (item.auto_match_keywords || []).join(', '),
        notes: item.notes || '',
      });
    } else {
      setForm(EMPTY_FORM);
    }
    setErrors({});
  }, [item, isOpen]);

  const set = useCallback((field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  }, []);

  const validate = () => {
    const e = {};
    if (!form.title.trim()) e.title = 'Title is required';
    if (!form.month) e.month = 'Month is required';
    if (!form.year) e.year = 'Year is required';
    if (form.expected_amount && isNaN(Number(form.expected_amount))) {
      e.expected_amount = 'Must be a valid number';
    }
    if (form.expected_amount && Number(form.expected_amount) < 0) {
      e.expected_amount = 'Amount cannot be negative';
    }
    return e;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }

    const keywords = form.auto_match_keywords
      .split(',')
      .map((kw) => kw.trim().toLowerCase())
      .filter(Boolean);

    onSave({
      title: form.title.trim(),
      category_id: form.category_id || null,
      expected_amount: form.expected_amount ? Number(form.expected_amount) : null,
      due_date: form.due_date || null,
      month: Number(form.month),
      year: Number(form.year),
      auto_match_keywords: keywords,
      notes: form.notes.trim() || null,
    });
  };

  const expenseCategories = categories.filter((c) => c.type === 'expense');
  const categoryOptions = [
    { value: '', label: 'No category' },
    ...expenseCategories.map((c) => ({ value: c.id, label: c.name })),
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={item ? 'Edit Checklist Item' : 'Add Checklist Item'}
      size="md"
      footer={
        <div className="flex gap-2 justify-end">
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form="checklist-item-form" loading={saving}>
            {item ? 'Save Changes' : 'Add Item'}
          </Button>
        </div>
      }
    >
      <form id="checklist-item-form" onSubmit={handleSubmit} className="space-y-4 px-6 py-4">
        <Input
          label="Title *"
          placeholder="e.g. Electricity Bill"
          value={form.title}
          onChange={(e) => set('title', e.target.value)}
          error={errors.title}
          maxLength={120}
        />

        <Select
          label="Category (expense)"
          value={form.category_id}
          onChange={(e) => set('category_id', e.target.value)}
          options={categoryOptions}
        />

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Expected Amount"
            type="number"
            min="0"
            step="0.01"
            placeholder="0.00"
            value={form.expected_amount}
            onChange={(e) => set('expected_amount', e.target.value)}
            error={errors.expected_amount}
          />
          <Input
            label="Due Date"
            type="date"
            value={form.due_date}
            onChange={(e) => set('due_date', e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Select
            label="Month *"
            value={form.month}
            onChange={(e) => set('month', e.target.value)}
            options={MONTH_OPTIONS}
            error={errors.month}
          />
          <Select
            label="Year *"
            value={form.year}
            onChange={(e) => set('year', e.target.value)}
            options={YEAR_OPTIONS}
            error={errors.year}
          />
        </div>

        <Input
          label="Auto-match Keywords"
          placeholder="electricity, meralco, power bill (comma separated)"
          value={form.auto_match_keywords}
          onChange={(e) => set('auto_match_keywords', e.target.value)}
          helper="Used to automatically match expense transactions. Separate with commas."
        />

        <Input
          label="Notes"
          placeholder="Optional notes..."
          value={form.notes}
          onChange={(e) => set('notes', e.target.value)}
          maxLength={300}
        />
      </form>
    </Modal>
  );
}
