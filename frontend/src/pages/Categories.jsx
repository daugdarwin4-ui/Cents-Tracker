import { useState, useCallback, useMemo } from 'react';
import { Plus, Tag, Pencil, Trash2, ChevronRight } from 'lucide-react';
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
  '#22c55e', '#16a34a', '#15803d', '#4ade80', '#86efac',
  '#3b82f6', '#6366f1', '#8b5cf6', '#f59e0b', '#ef4444',
  '#ec4899', '#14b8a6', '#f97316', '#a3a3a3', '#f5f5f5',
];

const EMPTY_FORM = { name: '', type: 'expense', color: '#22c55e', parent_id: '' };

// ── Category Card ──────────────────────────────────────────
function CategoryCard({ cat, onEdit, onDelete, isChild = false }) {
  return (
    <div
      className={`card flex items-center justify-between group hover:border-primary-900/40 transition-colors
        ${isChild ? 'bg-dark-300/60' : ''}`}
    >
      <div className="flex items-center gap-3 min-w-0">
        {isChild && (
          <ChevronRight size={12} className="text-gray-600 flex-shrink-0 -ml-1" />
        )}
        <div
          className="w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center"
          style={{ backgroundColor: `${cat.color}20`, border: `1px solid ${cat.color}40` }}
        >
          <Tag size={13} style={{ color: cat.color }} />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-200 truncate">{cat.name}</p>
          <div className="flex items-center gap-2 mt-0.5">
            {cat.is_default && (
              <span className="text-xs text-gray-600">Default</span>
            )}
            {cat.parent && (
              <span className="text-xs text-gray-600">
                under <span className="text-gray-500">{cat.parent.name}</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Actions — revealed on hover */}
      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 ml-2">
        <button
          onClick={() => onEdit(cat)}
          className="p-1.5 rounded text-gray-500 hover:text-primary-400 hover:bg-dark-50 transition-colors"
          aria-label="Edit"
          title="Edit"
        >
          <Pencil size={13} />
        </button>
        <button
          onClick={() => onDelete(cat)}
          className="p-1.5 rounded text-gray-500 hover:text-red-400 hover:bg-red-950/30 transition-colors"
          aria-label="Delete"
          title="Delete"
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────
export default function Categories() {
  const { categories, loading, addCategory, updateCategory, deleteCategory, getCategoryUsage } =
    useCategories();
  const { success, error: showError } = useToast();

  const [typeFilter, setTypeFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editData, setEditData] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deleteUsage, setDeleteUsage] = useState(null); // null=loading, number=count

  // Build tree grouped by type
  const treeByType = useMemo(() => {
    const filtered = typeFilter
      ? categories.filter((c) => c.type === typeFilter)
      : categories;

    return TYPES.reduce((acc, t) => {
      const typeCats = filtered.filter((c) => c.type === t.value);
      const roots = typeCats.filter((c) => !c.parent_id);
      const childrenOf = (pid) => typeCats.filter((c) => c.parent_id === pid);
      acc[t.value] = roots.map((root) => ({ ...root, children: childrenOf(root.id) }));
      return acc;
    }, {});
  }, [categories, typeFilter]);

  // Parent options for form (same type, top-level only, excluding self)
  const parentOptions = useMemo(() => {
    const eligible = categories.filter(
      (c) =>
        c.type === form.type &&
        !c.parent_id &&
        (!editData || c.id !== editData.id)
    );
    return [
      { value: '', label: 'None (top-level category)' },
      ...eligible.map((c) => ({ value: c.id, label: c.name })),
    ];
  }, [categories, form.type, editData]);

  const openAdd = useCallback(() => {
    setForm(EMPTY_FORM);
    setEditData(null);
    setErrors({});
    setShowForm(true);
  }, []);

  const openEdit = useCallback((cat) => {
    setForm({
      name: cat.name,
      type: cat.type,
      color: cat.color,
      parent_id: cat.parent_id || '',
    });
    setEditData(cat);
    setErrors({});
    setShowForm(true);
  }, []);

  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
      // Reset parent when type changes so we don't carry over an invalid parent
      ...(name === 'type' ? { parent_id: '' } : {}),
    }));
    setErrors((prev) => ({ ...prev, [name]: '' }));
  }, []);

  const handleSave = useCallback(async () => {
    const errs = {};
    if (!form.name.trim()) errs.name = 'Name is required';
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setSaving(true);
    let result;
    if (editData) {
      result = await updateCategory(editData.id, {
        name: form.name,
        color: form.color,
        parent_id: form.parent_id || null,
      });
    } else {
      result = await addCategory({ ...form, parent_id: form.parent_id || null });
    }
    setSaving(false);

    if (result.error) {
      showError(result.error.message || 'Failed to save category.');
    } else {
      success(editData ? 'Category updated.' : 'Category created.');
      setShowForm(false);
    }
  }, [form, editData, addCategory, updateCategory, success, showError]);

  const handleDeleteClick = useCallback(
    async (cat) => {
      setDeleteConfirm(cat);
      setDeleteUsage(null);
      const { count } = await getCategoryUsage(cat.id);
      setDeleteUsage(count);
    },
    [getCategoryUsage]
  );

  const handleDeleteExecute = useCallback(async () => {
    const { error } = await deleteCategory(deleteConfirm.id);
    setDeleteConfirm(null);
    setDeleteUsage(null);
    if (error) showError('Could not delete category.');
    else success('Category deleted.');
  }, [deleteConfirm, deleteCategory, success, showError]);

  const visibleCount = typeFilter
    ? categories.filter((c) => c.type === typeFilter).length
    : categories.length;

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex items-center gap-3">
          <Select
            name="typeFilter"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            options={TYPE_FILTER}
            containerClassName="w-40"
          />
          <span className="text-xs text-gray-500">
            {visibleCount} categor{visibleCount !== 1 ? 'ies' : 'y'}
          </span>
        </div>
        <Button icon={Plus} onClick={openAdd}>
          Add Category
        </Button>
      </div>

      {/* Category list */}
      {loading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner />
        </div>
      ) : (
        <div className="space-y-7">
          {TYPES.filter((t) => !typeFilter || t.value === typeFilter).map((t) => {
            const roots = treeByType[t.value];
            if (!roots || roots.length === 0) return null;
            const totalInType = roots.reduce((n, r) => n + 1 + r.children.length, 0);

            return (
              <div key={t.value}>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Badge variant={t.value} label={t.label} />
                  <span>{totalInType} categor{totalInType !== 1 ? 'ies' : 'y'}</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {roots.map((root) => (
                    <div key={root.id} className="space-y-2">
                      <CategoryCard cat={root} onEdit={openEdit} onDelete={handleDeleteClick} />
                      {root.children.map((child) => (
                        <CategoryCard
                          key={child.id}
                          cat={child}
                          onEdit={openEdit}
                          onDelete={handleDeleteClick}
                          isChild
                        />
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {visibleCount === 0 && (
            <div className="card text-center py-14">
              <Tag size={32} className="text-gray-700 mx-auto mb-3" />
              <p className="text-sm text-gray-400">No categories found.</p>
              <Button icon={Plus} size="sm" className="mt-4 mx-auto" onClick={openAdd}>
                Add First Category
              </Button>
            </div>
          )}
        </div>
      )}

      {/* ── Add / Edit Modal ── */}
      <Modal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        title={editData ? 'Edit Category' : 'Add Category'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowForm(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} loading={saving}>
              {editData ? 'Update' : 'Create'}
            </Button>
          </>
        }
      >
        <div className="space-y-4 px-6 py-4">
          <Input
            label="Category Name *"
            name="name"
            value={form.name}
            onChange={handleChange}
            placeholder="e.g. Groceries"
            error={errors.name}
            autoFocus
            maxLength={80}
          />

          {/* Type — only shown when adding */}
          {!editData && (
            <Select
              label="Type"
              name="type"
              value={form.type}
              onChange={handleChange}
              options={TYPES}
            />
          )}

          {/* Parent category */}
          <div className="flex flex-col gap-1">
            <Select
              label="Parent Category"
              name="parent_id"
              value={form.parent_id}
              onChange={handleChange}
              options={parentOptions}
            />
            <p className="text-xs text-gray-600">
              Optional. Selecting a parent makes this a subcategory. Only top-level categories
              can be parents.
            </p>
          </div>

          {/* Color picker */}
          <div>
            <label className="label">Color</label>
            <div className="flex flex-wrap gap-2 mt-1">
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

      {/* ── Delete Confirmation Modal ── */}
      <Modal
        isOpen={!!deleteConfirm}
        onClose={() => { setDeleteConfirm(null); setDeleteUsage(null); }}
        title="Delete Category"
        size="sm"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => { setDeleteConfirm(null); setDeleteUsage(null); }}
            >
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDeleteExecute}>
              Delete
            </Button>
          </>
        }
      >
        <div className="px-6 py-4 space-y-3">
          <p className="text-sm text-gray-400">
            Delete <span className="text-white font-medium">{deleteConfirm?.name}</span>?
          </p>

          {deleteUsage === null ? (
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <LoadingSpinner size="sm" />
              Checking usage…
            </div>
          ) : deleteUsage > 0 ? (
            <p className="text-xs text-yellow-400 bg-yellow-900/20 border border-yellow-900/30 rounded-lg px-3 py-2">
              ⚠ {deleteUsage} transaction{deleteUsage !== 1 ? 's' : ''} use{deleteUsage === 1 ? 's' : ''} this category.
              They will keep their data but lose the category link.
            </p>
          ) : (
            <p className="text-xs text-gray-500">
              This category is not used by any transactions.
            </p>
          )}
        </div>
      </Modal>
    </div>
  );
}
