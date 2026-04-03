import { useState, useCallback } from 'react';
import { Plus, Tag, Pencil, Trash2 } from 'lucide-react';
import { useCategories } from '../hooks/useCategories';
import { useToast } from '../context/ToastContext';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Badge from '../components/ui/Badge';
import LoadingSpinner from '../components/ui/LoadingSpinner';

const TYPES = [
  { value: 'income', label: 'Income' },
  { value: 'expense', label: 'Expense' },
  { value: 'investment', label: 'Investment' },
  { value: 'savings', label: 'Savings' },
];

const TYPE_FILTER = [{ value: '', label: 'All Types' }, ...TYPES];

const COLOR_PRESETS = [
  '#22c55e', '#16a34a', '#15803d', '#166534', '#14532d',
  '#4ade80', '#86efac', '#bbf7d0', '#052e16', '#f5f5f5',
];

const EMPTY_FORM = { name: '', type: 'expense', color: '#22c55e' };

export default function Categories() {
  const { categories, loading, addCategory, updateCategory, deleteCategory } = useCategories();
  const { success, error: showError } = useToast();
  const [typeFilter, setTypeFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editData, setEditData] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const filteredCategories = typeFilter
    ? categories.filter((c) => c.type === typeFilter)
    : categories;

  const grouped = TYPES.reduce((acc, t) => {
    acc[t.value] = filteredCategories.filter((c) => c.type === t.value);
    return acc;
  }, {});

  const openAdd = useCallback(() => {
    setForm(EMPTY_FORM);
    setEditData(null);
    setErrors({});
    setShowForm(true);
  }, []);

  const openEdit = useCallback((cat) => {
    setForm({ name: cat.name, type: cat.type, color: cat.color });
    setEditData(cat);
    setErrors({});
    setShowForm(true);
  }, []);

  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: '' }));
  }, []);

  const handleSave = useCallback(async () => {
    const errs = {};
    if (!form.name.trim()) errs.name = 'Name is required';
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setSaving(true);
    let result;
    if (editData) {
      result = await updateCategory(editData.id, { name: form.name, color: form.color });
    } else {
      result = await addCategory(form);
    }
    setSaving(false);

    if (result.error) {
      showError(result.error.message || 'Failed to save category.');
    } else {
      success(editData ? 'Category updated.' : 'Category created.');
      setShowForm(false);
    }
  }, [form, editData, addCategory, updateCategory, success, showError]);

  const handleDelete = useCallback(async (id) => {
    const { error } = await deleteCategory(id);
    setDeleteConfirm(null);
    if (error) showError('Could not delete. It may be in use by transactions.');
    else success('Category deleted.');
  }, [deleteCategory, success, showError]);

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <Select
          name="typeFilter"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          options={TYPE_FILTER}
          containerClassName="w-40"
        />
        <Button icon={Plus} onClick={openAdd}>
          Add Category
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner />
        </div>
      ) : (
        <div className="space-y-6">
          {TYPES.filter((t) => !typeFilter || t.value === typeFilter).map((t) => (
            grouped[t.value].length > 0 && (
              <div key={t.value}>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Badge variant={t.value} label={t.label} />
                  <span>{grouped[t.value].length} categories</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {grouped[t.value].map((cat) => (
                    <div
                      key={cat.id}
                      className="card flex items-center justify-between group hover:border-primary-900/40 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className="w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center"
                          style={{ backgroundColor: `${cat.color}20`, border: `1px solid ${cat.color}40` }}
                        >
                          <Tag size={13} style={{ color: cat.color }} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-200 truncate">{cat.name}</p>
                          {cat.is_default && (
                            <p className="text-xs text-gray-600">Default</p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 ml-2">
                        <button
                          onClick={() => openEdit(cat)}
                          className="p-1.5 rounded text-gray-500 hover:text-primary-400 hover:bg-dark-50"
                          aria-label="Edit"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(cat)}
                          className="p-1.5 rounded text-gray-500 hover:text-red-400 hover:bg-dark-50"
                          aria-label="Delete"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          ))}

          {filteredCategories.length === 0 && (
            <div className="text-center py-12">
              <p className="text-sm text-gray-500">No categories found.</p>
            </div>
          )}
        </div>
      )}

      {/* Add / Edit Modal */}
      <Modal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        title={editData ? 'Edit Category' : 'Add Category'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowForm(false)} disabled={saving}>Cancel</Button>
            <Button onClick={handleSave} loading={saving}>
              {editData ? 'Update' : 'Create'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Category Name"
            name="name"
            value={form.name}
            onChange={handleChange}
            placeholder="e.g. Groceries"
            error={errors.name}
            autoFocus
          />

          {!editData && (
            <Select
              label="Type"
              name="type"
              value={form.type}
              onChange={handleChange}
              options={TYPES}
            />
          )}

          <div>
            <label className="label">Color</label>
            <div className="flex flex-wrap gap-2">
              {COLOR_PRESETS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, color: c }))}
                  className={`w-7 h-7 rounded-lg border-2 transition-all ${
                    form.color === c ? 'border-white scale-110' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: c }}
                  aria-label={c}
                />
              ))}
              <input
                type="color"
                value={form.color}
                onChange={(e) => setForm((prev) => ({ ...prev, color: e.target.value }))}
                className="w-7 h-7 rounded-lg cursor-pointer bg-transparent border border-dark-50"
                title="Custom color"
              />
            </div>
          </div>
        </div>
      </Modal>

      {/* Delete confirmation */}
      <Modal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="Delete Category"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
            <Button variant="danger" onClick={() => handleDelete(deleteConfirm?.id)}>Delete</Button>
          </>
        }
      >
        <p className="text-sm text-gray-400">
          Delete <span className="text-white font-medium">{deleteConfirm?.name}</span>?
          Existing transactions using this category will not be deleted, but will lose their category reference.
        </p>
      </Modal>
    </div>
  );
}
