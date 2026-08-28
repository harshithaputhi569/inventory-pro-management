import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Loader2, AlertCircle } from 'lucide-react';
import useProductStore from '../../store/productStore.js';

const schema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(200),
  sku: z.string().optional(),
  brand: z.string().max(100).optional(),
  category: z.string().optional(),
  description: z.string().max(500).optional(),
  price: z.coerce.number({ invalid_type_error: 'Required' }).min(0, 'Cannot be negative'),
  costPrice: z.coerce.number().min(0).optional().default(0),
  quantity: z.coerce.number({ invalid_type_error: 'Required' }).min(0, 'Cannot be negative'),
  minStockLevel: z.coerce.number().min(0).optional().default(5),
  unit: z.string().optional().default('pcs'),
  damagedStock: z.coerce.number().min(0).optional().default(0),
  sampleStock: z.coerce.number().min(0).optional().default(0),
  exchangedStock: z.coerce.number().min(0).optional().default(0),
  wrongProductStock: z.coerce.number().min(0).optional().default(0),
  pieces_per_box: z.coerce.number().min(1).optional().default(1),
  ava_pieces: z.coerce.number().min(0).optional().default(0),
  weight_of_unit: z.coerce.number().min(0).optional().default(0),
  measurements: z.string().max(100).optional().default(''),
  supplier: z.string().max(100).optional(),
  image: z.string().url('Invalid URL format').optional().or(z.literal('')),
  color: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Invalid hex color').optional().or(z.literal('')),
});

export default function ProductModal({ product, onClose, onSaved }) {
  const { categories, createProduct, updateProduct, isSubmitting } = useProductStore();
  const isEdit = !!product;

  const { register, handleSubmit, formState: { errors }, setError, reset, watch } = useForm({
    resolver: zodResolver(schema),
    defaultValues: isEdit ? {
      name: product.name,
      sku: product.sku,
      brand: product.brand || '',
      category: product.category?._id || '',
      description: product.description,
      price: product.price,
      costPrice: product.costPrice,
      quantity: product.quantity,
      minStockLevel: product.minStockLevel,
      unit: product.unit,
      damagedStock: product.damagedStock || 0,
      sampleStock: product.sampleStock || 0,
      exchangedStock: product.exchangedStock || 0,
      wrongProductStock: product.wrongProductStock || 0,
      pieces_per_box: product.pieces_per_box || 1,
      ava_pieces: product.ava_pieces || 0,
      weight_of_unit: product.weight_of_unit || 0,
      measurements: product.measurements || '',
      supplier: product.supplier,
      image: product.image || '',
      color: product.color || '#3b82f6',
    } : {
      unit: 'pcs',
      minStockLevel: 5,
      costPrice: 0,
      color: '#3b82f6',
      damagedStock: 0,
      sampleStock: 0,
      exchangedStock: 0,
      wrongProductStock: 0,
      pieces_per_box: 1,
      ava_pieces: 0,
      weight_of_unit: 0,
    },
  });

  const onSubmit = async (data) => {
    const payload = { ...data, category: data.category || null };
    const result = isEdit
      ? await updateProduct(product._id, payload)
      : await createProduct(payload);

    if (result.success) {
      onSaved();
      onClose();
    } else {
      setError('root', { message: result.message });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800 sticky top-0 bg-white dark:bg-gray-900 z-10">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {isEdit ? 'Edit Product' : 'Add New Product'}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-5 space-y-4">
          {errors.root && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
              <p className="text-sm text-red-600 dark:text-red-400">{errors.root.message}</p>
            </div>
          )}

          {/* Name */}
          <div>
            <label className="label">Product Name <span className="text-red-400">*</span></label>
            <input {...register('name')} className={`input ${errors.name ? 'input-error' : ''}`} placeholder="e.g. ABC Tiles" />
            {errors.name && <p className="error-text"><AlertCircle className="w-3 h-3" />{errors.name.message}</p>}
          </div>

          {/* SKU + Category row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">SKU <span className="text-gray-400 text-xs">(auto if blank)</span></label>
              <input {...register('sku')} className="input" placeholder="PRD-0001" />
            </div>
            <div>
              <label className="label">Category</label>
              <select {...register('category')} className="select">
                <option value="">No category</option>
                {categories.map((c) => (
                  <option key={c._id} value={c._id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-1">
              <label className="label">Brand</label>
              <input {...register('brand')} className="input" placeholder="Brand" />
            </div>
            <div className="col-span-1">
              <label className="label text-[11px]">Unit Weight (kg)</label>
              <input {...register('weight_of_unit')} type="number" step="0.01" className="input" placeholder="8.5" />
            </div>
            <div className="col-span-1">
              <label className="label text-[11px]">Measurements</label>
              <input {...register('measurements')} className="input" placeholder="10x20 or 25kg" />
            </div>
          </div>

          {/* Price + Cost row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Selling Price (₹) <span className="text-red-400">*</span></label>
              <input {...register('price')} type="number" step="0.01" className={`input ${errors.price ? 'input-error' : ''}`} placeholder="0.00" />
              {errors.price && <p className="error-text"><AlertCircle className="w-3 h-3" />{errors.price.message}</p>}
            </div>
            <div>
              <label className="label">Cost Price (₹)</label>
              <input {...register('costPrice')} type="number" step="0.01" className="input" placeholder="0.00" />
            </div>
          </div>

          {/* Qty + Min Stock + Unit */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="label">Quantity <span className="text-red-400">*</span></label>
              <input {...register('quantity')} type="number" className={`input ${errors.quantity ? 'input-error' : ''}`} placeholder="0" />
              {errors.quantity && <p className="error-text"><AlertCircle className="w-3 h-3" />{errors.quantity.message}</p>}
            </div>
            <div>
              <label className="label">Min Stock</label>
              <input {...register('minStockLevel')} type="number" className="input" placeholder="5" />
            </div>
            <div>
              <label className="label">Unit</label>
              <input {...register('unit')} className="input" placeholder="pcs" />
            </div>
          </div>

          {/* Advanced Inventory Pools */}
          <div className="p-4 rounded-2xl bg-amber-50/50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/20">
            <h3 className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-widest mb-3">Advanced Inventory Pools</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label text-[10px]">Sample Stock</label>
                <input {...register('sampleStock')} type="number" className="input bg-white dark:bg-gray-900" placeholder="0" />
              </div>
              <div>
                <label className="label text-[10px]">Damaged Stock</label>
                <input {...register('damagedStock')} type="number" className="input bg-white dark:bg-gray-900" placeholder="0" />
              </div>
              <div>
                <label className="label text-[10px]">Exchanged Stock</label>
                <input {...register('exchangedStock')} type="number" className="input bg-white dark:bg-gray-900" placeholder="0" />
              </div>
              <div>
                <label className="label text-[10px]">Wrong Product Stock</label>
                <input {...register('wrongProductStock')} type="number" className="input bg-white dark:bg-gray-900" placeholder="0" />
              </div>
            </div>
          </div>

          {/* Piece-Selling Config - Hide if unit is Bag */}
          {watch('unit')?.toLowerCase() !== 'bag' && (
            <div className="p-4 rounded-2xl bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/20 animate-fade-in">
              <h3 className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-1">Piece-Selling Config</h3>
              <p className="text-[10px] text-blue-400 mb-3">Allow selling individual pieces from a box</p>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="label text-[10px]">Pieces / Box <span className="text-red-400">*</span></label>
                  <input {...register('pieces_per_box')} type="number" min="1" className="input bg-white dark:bg-gray-900" placeholder="12" />
                  {errors.pieces_per_box && <p className="error-text"><AlertCircle className="w-3 h-3" />{errors.pieces_per_box.message}</p>}
                </div>
                <div>
                  <label className="label text-[10px]">Available Pieces</label>
                  <input {...register('ava_pieces')} type="number" min="0" className="input bg-white dark:bg-gray-900" placeholder="0" />
                </div>
              </div>
            </div>
          )}

          {/* Supplier */}
          <div>
            <label className="label">Supplier</label>
            <input {...register('supplier')} className="input" placeholder="Supplier name" />
          </div>

          {/* Description */}
          <div>
            <label className="label">Description</label>
            <textarea {...register('description')} rows={2} className="input resize-none" placeholder="Optional product description" />
          </div>

          {/* Visual Identity: Image & Color */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800">
            <div className="space-y-3">
              <label className="label flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-primary-500" /> Image URL
              </label>
              <input {...register('image')} className={`input text-xs ${errors.image ? 'input-error' : ''}`} placeholder="https://images.unsplash.com/..." />
              {errors.image && <p className="error-text text-[10px]">{errors.image.message}</p>}
            </div>
            <div className="space-y-3">
              <label className="label flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-primary-500" /> Theme Color
              </label>
              <div className="flex items-center gap-2">
                <input {...register('color')} type="color" className="w-10 h-10 rounded-lg cursor-pointer bg-transparent border-none p-0" />
                <input {...register('color')} className={`input text-xs font-mono ${errors.color ? 'input-error' : ''}`} placeholder="#3b82f6" />
              </div>
              {errors.color && <p className="error-text text-[10px]">{errors.color.message}</p>}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2 sticky bottom-0 bg-white dark:bg-gray-900 py-4 border-t border-gray-100 dark:border-gray-800 z-10">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="btn-primary flex-1">
              {isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin" />{isEdit ? 'Saving...' : 'Creating...'}</> : (isEdit ? 'Save Changes' : 'Create Product')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
