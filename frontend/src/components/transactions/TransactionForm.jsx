import { useState, useCallback, useEffect } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import { useCategories } from '../../hooks/useCategories';
import { useTransactions } from '../../hooks/useTransactions';
import { useToast } from '../../context/ToastContext';
import { todayISO } from '../../utils/date';

const TYPES = [
  { value: 'income', label: 'Income' },
  { value: 'expense', label: 'Expense' },
  { value: 'investment', label: 'Investment' },
  { value: 'savings', label: 'Savings' },
];

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'credit_card', label: 'Credit Card' },
  { value: 'debit_card', label: 'Debit Card' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'digital_wallet', label: 'Digital Wallet' },
  { value: 'other', label: 'Other' },
];

const EMPTY_FORM = {
  amount: '',
  type: 'expense',
  category_id: '',
  date: todayISO(),
  note: '',
  payment_method: '',
  account_name: '',
};

export default function TransactionForm({ isOpen, onClose, onSuccess, editData = null }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const { categories } = useCategories(form.type);
  const { addTransaction, updateTransaction } = useTransactions();
  const { success, error: showError } = useToast();

  const isEdit = !!editData;

  // Prefill on edit
  useEffect(() => {
    if (editData) {
      setForm({
        amount: editData.amount ? (Number(editData.amount) / 100).toFixed(2) : '',
        type: editData.type || 'expense',
        category_id: editData.category_id || '',
        date: editData.date || todayISO(),
        note: editData.note || '',
        payment_method: editData.payment_method || '',
        account_name: editData.account_name || '',
      });
    } else {
      setForm(EMPTY_FORM);
    }
    setErrors({});
  }, [editData, isOpen]);

  const categoryOptions = categories.map((c) => ({ value: c.id, label: c.name }));

  const validate = useCallback(() => {
    const errs = {};
    const amt = parseFloat(form.amount);
    if (!form.amount || isNaN(amt) || amt <= 0) errs.amount = 'Enter a valid amount greater than 0';
    if (!form.type) errs.type = 'Select a type';
    if (!form.date) errs.date = 'Select a date';
    return errs;
  }, [form]);

  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: '' }));
  }, []);

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      const errs = validate();
      if (Object.keys(errs).length) {
        setErrors(errs);
        return;
      }

      setLoading(true);
      let result;

      if (isEdit) {
        result = await updateTransaction(editData.id, {
          amount: form.amount,
          type: form.type,
          category_id: form.category_id || null,
          date: form.date,
          note: form.note || null,
          payment_method: form.payment_method || null,
          account_name: form.account_name || null,
        });
      } else {
        result = await addTransaction({
          amount: form.amount,
          type: form.type,
          category_id: form.category_id || null,
          date: form.date,
          note: form.note || null,
          payment_method: form.payment_method || null,
          account_name: form.account_name || null,
        });
      }

      setLoading(false);

      if (result.error) {
        showError(result.error.message || 'Failed to save transaction.');
      } else {
        success(isEdit ? 'Transaction updated.' : 'Transaction added.');
        onSuccess?.();
      }
    },
    [form, isEdit, editData, validate, addTransaction, updateTransaction, success, showError, onSuccess]
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? 'Edit Transaction' : 'Add Transaction'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" form="tx-form" loading={loading}>
            {isEdit ? 'Update' : 'Add Transaction'}
          </Button>
        </>
      }
    >
      <form id="tx-form" onSubmit={handleSubmit} className="space-y-4" noValidate>
        {/* Amount + Type */}
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

          <Select
            label="Type"
            name="type"
            value={form.type}
            onChange={handleChange}
            options={TYPES}
            error={errors.type}
          />
        </div>

        {/* Date + Category */}
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Date"
            name="date"
            type="date"
            value={form.date}
            onChange={handleChange}
            error={errors.date}
          />

          <Select
            label="Category"
            name="category_id"
            value={form.category_id}
            onChange={handleChange}
            options={categoryOptions}
            placeholder="Select category"
          />
        </div>

        {/* Note */}
        <div>
          <label className="label" htmlFor="note">Note</label>
          <textarea
            id="note"
            name="note"
            value={form.note}
            onChange={handleChange}
            placeholder="Add a note (optional)"
            rows={2}
            className="input-field resize-none"
          />
        </div>

        {/* Payment method + Account */}
        <div className="grid grid-cols-2 gap-3">
          <Select
            label="Payment Method"
            name="payment_method"
            value={form.payment_method}
            onChange={handleChange}
            options={PAYMENT_METHODS}
            placeholder="Select method"
          />

          <Input
            label="Account Name"
            name="account_name"
            type="text"
            value={form.account_name}
            onChange={handleChange}
            placeholder="e.g. Chase Checking"
          />
        </div>
      </form>
    </Modal>
  );
}
