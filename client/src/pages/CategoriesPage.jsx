import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Tags, Loader2, X, AlertCircle, Search, Package } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import useProductStore from '../store/productStore.js';
import useAuthStore from '../store/authStore.js';
import { fuzzyMatch } from '../utils/searchUtils.js';

const PRESET_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#ef4444',
  '#f97316', '#eab308', '#22c55e', '#14b8a6',
  '#3b82f6', '#64748b',
];

const schema = z.object({
  name: z.string().min(2, 'At least 2 characters').max(200),
  description: z.string().max(200).optional(),
  color: z.string().optional(),
});

function CategoryModal({ category, onClose }) {
  const { createCategory, updateCategory, isSubmitting } = useProductStore();
  const isEdit = !!category;
  const [selectedColor, setSelectedColor] = useState(category?.color || '#6366f1');

  const { register, handleSubmit, formState: { errors }, setError } = useForm({
    resolver: zodResolver(schema),
    defaultValues: isEdit ? { name: category.name, description: category.description } : {},
  });

  const onSubmit = async (data) => {
    const payload = { ...data, color: selectedColor };
    const result = isEdit
      ? await updateCategory(category._id, payload)
      : await createCategory(payload);

    if (result.success) {
      toast.success(isEdit ? 'Category updated!' : 'Category created!');
      onClose();
    } else {
      setError('root', { message: result.message });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-fade-in">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-sm animate-slide-up">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
          <h2 className="font-semibold text-gray-900 dark:text-white">{isEdit ? 'Edit Category' : 'New Category'}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="px-5 py-4 space-y-4">
          {errors.root && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
              <p className="text-sm text-red-600 dark:text-red-400">{errors.root.message}</p>
            </div>
          )}
          <div>
            <label className="label">Name <span className="text-red-400">*</span></label>
            <input {...register('name')} className={`input ${errors.name ? 'input-error' : ''}`} placeholder="e.g. Natural Stone" />
            {errors.name && <p className="error-text"><AlertCircle className="w-3 h-3" />{errors.name.message}</p>}
          </div>
          <div>
            <label className="label">Description</label>
            <input {...register('description')} className="input" placeholder="Optional description" />
          </div>
          <div>
            <label className="label">Color</label>
            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setSelectedColor(c)}
                  className={`w-7 h-7 rounded-full transition-all ${selectedColor === c ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : 'hover:scale-105'}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="btn-primary flex-1">
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : (isEdit ? 'Save' : 'Create')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function CategoriesPage({ hideHeader }) {
  const { categories, fetchCategories, deleteCategory, isLoading } = useProductStore();
  const { user } = useAuthStore();
  const [showModal, setShowModal] = useState(false);
  const [editCategory, setEditCategory] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredCategories = categories.filter(cat => {
    const tokens = searchTerm.trim().toLowerCase().split(/\s+/).filter(Boolean);
    return tokens.length === 0 || tokens.every(token => 
      fuzzyMatch(cat.name, token) || 
      (cat.description && fuzzyMatch(cat.description, token))
    );
  });

  const canEdit = ['admin', 'manager'].includes(user?.role);
  const isAdmin = user?.role === 'admin';

  useEffect(() => { fetchCategories(); }, []);

  const handleDelete = async (cat) => {
    if (!window.confirm(`Delete category "${cat.name}"? Products in this category will become uncategorized.`)) return;
    const result = await deleteCategory(cat._id);
    if (result.success) toast.success('Category deleted');
    else toast.error(result.message || 'Failed to delete');
  };

  return (
    <div>
      {!hideHeader && (
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Categories</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{categories.length} categories total</p>
          </div>
          {canEdit && (
            <button onClick={() => { setEditCategory(null); setShowModal(true); }} className="btn-primary">
              <Plus className="w-4 h-4" /> Add Category
            </button>
          )}
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search categories..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input pl-9"
          />
        </div>
        {hideHeader && canEdit && (
          <button onClick={() => { setEditCategory(null); setShowModal(true); }} className="btn-primary text-xs py-2 whitespace-nowrap">
            <Plus className="w-3.5 h-3.5" /> Add Category
          </button>
        )}
      </div>

      {categories.length === 0 ? (
        <div className="card flex flex-col items-center justify-center py-20 text-center">
          <Tags className="w-12 h-12 text-gray-300 dark:text-gray-700 mb-3" />
          <p className="text-gray-500 dark:text-gray-400 font-medium">No categories yet</p>
          <p className="text-sm text-gray-400 dark:text-gray-600 mt-1">Add your first category to organize products.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCategories.map((cat) => (
            <div key={cat._id} className="card p-5 flex items-center gap-4 hover:shadow-md transition-shadow group">
              <div className="w-12 h-12 rounded-2xl flex-shrink-0 flex items-center justify-center transition-transform group-hover:scale-110" style={{ backgroundColor: cat.color + '22' }}>
                <Tags className="w-6 h-6" style={{ color: cat.color }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-gray-900 dark:text-white truncate">{cat.name}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="flex items-center gap-1 text-[10px] font-bold text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">
                    <Package size={10} /> {cat.productCount || 0} Products
                  </span>
                  {cat.description && <p className="text-xs text-gray-400 truncate flex-1">— {cat.description}</p>}
                </div>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                {canEdit && (
                  <button onClick={() => { setEditCategory(cat); setShowModal(true); }} className="p-1.5 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors">
                    <Pencil className="w-4 h-4" />
                  </button>
                )}
                {isAdmin && (
                  <button onClick={() => handleDelete(cat)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <CategoryModal
          category={editCategory}
          onClose={() => { setShowModal(false); setEditCategory(null); fetchCategories(); }}
        />
      )}
    </div>
  );
}
