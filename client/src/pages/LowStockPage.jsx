import { useEffect, useState } from 'react';
import { AlertTriangle, Package, Loader2, PlusCircle, X, TrendingDown, Store } from 'lucide-react';
import toast from 'react-hot-toast';
import useProductStore from '../store/productStore.js';
import useBranchStore from '../store/branchStore.js';
import useAuthStore from '../store/authStore.js';

function StockAdjustModal({ product, onClose }) {
  const [value, setValue] = useState('');
  const [type, setType] = useState('add');
  const { adjustStock } = useProductStore();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!value || isNaN(value)) return;
    setLoading(true);
    const result = await adjustStock(product._id, Number(value), type);
    setLoading(false);
    if (result.success) { toast.success('Stock updated'); onClose(); }
    else toast.error(result.message || 'Failed to update stock');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 animate-fade-in">
      <div className="bg-white dark:bg-gray-900 rounded-t-3xl sm:rounded-2xl shadow-2xl w-full sm:max-w-sm animate-slide-up">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
          <h2 className="font-semibold text-gray-900 dark:text-white">Restock Product</h2>
          <button onClick={onClose} className="p-2 rounded-xl text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 touch-target"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Product: <span className="font-medium text-gray-800 dark:text-gray-200">{product.name}</span>
            <br />Current: <span className="font-bold text-gray-900 dark:text-white">{product.quantity} {product.unit}</span>
            {' / '} Min: <span className="font-bold text-yellow-600">{product.minStockLevel} {product.unit}</span>
          </p>
          <div>
            <label className="label">Operation</label>
            <select value={type} onChange={(e) => setType(e.target.value)} className="input">
              <option value="add">Add stock</option>
              <option value="set">Set exact value</option>
            </select>
          </div>
          <div>
            <label className="label">Quantity</label>
            <input type="number" value={value} onChange={(e) => setValue(e.target.value)} className="input" placeholder="Enter quantity" min="0" />
          </div>
          <div className="flex gap-3 pb-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Update Stock'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Stock progress bar
function StockBar({ current, min }) {
  const pct = min > 0 ? Math.min(100, Math.round((current / min) * 100)) : 100;
  const color = current === 0 ? 'bg-red-500' : pct < 50 ? 'bg-orange-400' : 'bg-yellow-400';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[10px] text-gray-400 w-8 text-right">{pct}%</span>
    </div>
  );
}

function ProductTable({ items, onRestock, headerColor, rowHover }) {
  return (
    <div className="card overflow-hidden hidden md:block">
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-center">
          <thead>
            <tr className={`border-b ${headerColor}`}>
              <th className="text-center px-4 py-3 text-xs font-semibold uppercase tracking-wider">Product</th>
              <th className="text-center px-4 py-3 text-xs font-semibold uppercase tracking-wider hidden sm:table-cell">Category</th>
              <th className="text-center px-4 py-3 text-xs font-semibold uppercase tracking-wider">Qty</th>
              <th className="text-center px-4 py-3 text-xs font-semibold uppercase tracking-wider">Min Level</th>
              <th className="text-center px-4 py-3 text-xs font-semibold uppercase tracking-wider">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
            {items.map((p) => (
              <tr key={p._id} className={`transition-colors ${rowHover}`}>
                <td className="px-4 py-3 text-center">
                  <p className="font-medium text-gray-900 dark:text-white">{p.name}</p>
                  <p className="text-xs text-gray-400 font-mono">{p.sku}</p>
                </td>
                <td className="px-4 py-3 hidden sm:table-cell text-center">
                  {p.category ? <span className="badge badge-blue">{p.category.name}</span> : <span className="text-gray-400 text-xs">—</span>}
                </td>
                <td className="px-4 py-3 text-center font-bold">{p.quantity}</td>
                <td className="px-4 py-3 text-center text-gray-500 dark:text-gray-400">{p.minStockLevel}</td>
                <td className="px-4 py-3 text-center">
                  <button onClick={() => onRestock(p)} className="inline-flex items-center justify-center gap-1 text-xs font-medium text-primary-600 dark:text-primary-400 hover:underline">
                    <PlusCircle className="w-3.5 h-3.5" /> Restock
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ProductCards({ items, onRestock, borderColor, quantityColor }) {
  return (
    <div className="md:hidden space-y-3">
      {items.map((p) => (
        <div key={p._id} className={`bg-white dark:bg-gray-900 rounded-2xl border-l-4 ${borderColor} border border-gray-100 dark:border-gray-800 shadow-sm p-4`}>
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1 min-w-0 pr-2">
              <p className="font-bold text-gray-900 dark:text-white text-sm leading-tight">{p.name}</p>
              <p className="text-[11px] text-gray-400 font-mono mt-0.5">{p.sku}</p>
              {p.category && <span className="badge badge-blue text-[10px] mt-1">{p.category.name}</span>}
            </div>
            <button
              onClick={() => onRestock(p)}
              className="btn-primary py-1.5 px-3 text-xs flex-shrink-0"
            >
              <PlusCircle className="w-3.5 h-3.5" /> Restock
            </button>
          </div>
          <div className="flex items-center gap-4 mb-2">
            <div>
              <p className="text-[10px] text-gray-400 uppercase font-semibold">Current</p>
              <p className={`text-lg font-bold ${quantityColor}`}>{p.quantity}</p>
            </div>
            <div>
              <p className="text-[10px] text-gray-400 uppercase font-semibold">Minimum</p>
              <p className="text-lg font-bold text-gray-500">{p.minStockLevel}</p>
            </div>
            <div className="flex-1">
              <p className="text-[10px] text-gray-400 uppercase font-semibold mb-1">Level</p>
              <StockBar current={p.quantity} min={p.minStockLevel} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function LowStockPage({ hideHeader }) {
  const { products, isLoading, fetchProducts, setFilters, filters } = useProductStore();
  const { branches, fetchBranches } = useBranchStore();
  const { user } = useAuthStore();
  const [stockProduct, setStockProduct] = useState(null);

  const isAdmin = user?.role === 'admin';

  useEffect(() => { 
    if (isAdmin) fetchBranches();
    setFilters({ status: 'low', search: '', category: 'all' }); 
    return () => setFilters({ status: '' });
  }, []);
  useEffect(() => { if (filters.status === 'low') fetchProducts(); }, [filters]);

  const outOfStock = products.filter((p) => p.quantity === 0);
  const lowStock = products.filter((p) => p.quantity > 0 && p.quantity <= p.minStockLevel);

  return (
    <div>
      {/* Page header */}
      {!hideHeader && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Low Stock Alerts</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">{products.length} product{products.length !== 1 ? 's' : ''} need attention</p>
            </div>
          </div>

          {isAdmin && (
            <div className="flex items-center gap-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl px-3 py-2 shadow-sm focus-within:ring-2 focus-within:ring-primary-500/20 transition-all">
              <Store className="w-4 h-4 text-gray-400" />
              <select 
                value={filters.branchId || ''} 
                onChange={(e) => setFilters({ branchId: e.target.value })}
                className="bg-transparent border-none text-sm font-bold focus:ring-0 p-0 pr-8 outline-none dark:text-white cursor-pointer"
              >
                <option value="">All Branches</option>
                {branches.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
              </select>
            </div>
          )}
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
        </div>
      ) : products.length === 0 ? (
        <div className="card flex flex-col items-center justify-center py-24 text-center">
          <div className="w-14 h-14 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-4">
            <Package className="w-7 h-7 text-green-500" />
          </div>
          <p className="font-semibold text-gray-800 dark:text-gray-200">All stock levels are healthy!</p>
          <p className="text-sm text-gray-400 mt-1">No products are below their minimum stock level.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {outOfStock.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-red-600 dark:text-red-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-500 inline-block animate-pulse" />
                Out of Stock ({outOfStock.length})
              </h2>
              <ProductCards
                items={outOfStock}
                onRestock={setStockProduct}
                borderColor="border-l-red-500"
                quantityColor="text-red-600 dark:text-red-400"
              />
              <ProductTable
                items={outOfStock}
                onRestock={setStockProduct}
                headerColor="bg-red-50 dark:bg-red-900/10 border-red-100 dark:border-red-900/30 text-red-500"
                rowHover="hover:bg-red-50/50 dark:hover:bg-red-900/10"
              />
            </div>
          )}

          {lowStock.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-yellow-600 dark:text-yellow-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-yellow-500 inline-block" />
                Low Stock ({lowStock.length})
              </h2>
              <ProductCards
                items={lowStock}
                onRestock={setStockProduct}
                borderColor="border-l-yellow-500"
                quantityColor="text-yellow-600 dark:text-yellow-400"
              />
              <ProductTable
                items={lowStock}
                onRestock={setStockProduct}
                headerColor="bg-yellow-50 dark:bg-yellow-900/10 border-yellow-100 dark:border-yellow-900/30 text-yellow-600"
                rowHover="hover:bg-yellow-50/50 dark:hover:bg-yellow-900/10"
              />
            </div>
          )}
        </div>
      )}

      {stockProduct && <StockAdjustModal product={stockProduct} onClose={() => setStockProduct(null)} />}
    </div>
  );
}
