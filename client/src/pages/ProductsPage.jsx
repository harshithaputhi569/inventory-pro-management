import { useEffect, useState } from 'react';
import {
  Plus, Search, Pencil, Trash2, Package,
  ChevronLeft, ChevronRight, Loader2,
  MinusCircle, PlusCircle, X, Download, FileUp, Filter, AlertTriangle
} from 'lucide-react';
import toast from 'react-hot-toast';
import useProductStore from '../store/productStore.js';
import useAuthStore from '../store/authStore.js';
import ProductModal from '../components/products/ProductModal.jsx';
import api from '../api/client.js';
import ImportMappingModal from '../components/products/ImportMappingModal.jsx';
import CategoriesPage from './CategoriesPage.jsx';
import LowStockPage from './LowStockPage.jsx';
import ProductDetailModal from '../components/products/ProductDetailModal.jsx';
import useBranchStore from '../store/branchStore.js';
import useSettingsStore from '../store/settingsStore.js';

const statusColors = { ok: 'badge-green', low: 'badge-yellow', out: 'badge-red' };
const statusLabels = { ok: 'In Stock', low: 'Low Stock', out: 'Out of Stock' };

function StockAdjustModal({ product, onClose }) {
  const [value, setValue] = useState('');
  const [type, setType] = useState('set');
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
          <h2 className="font-semibold text-gray-900 dark:text-white">Adjust Stock</h2>
          <button onClick={onClose} className="p-2 rounded-xl text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Product: <span className="font-medium text-gray-800 dark:text-gray-200">{product.name}</span></p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Current stock: <span className="font-bold text-gray-900 dark:text-white">{product.quantity} {product.unit}</span></p>
          </div>
          <div>
            <label className="label">Operation</label>
            <select value={type} onChange={(e) => setType(e.target.value)} className="input">
              <option value="set">Set to exact value</option>
              <option value="add">Add to current stock</option>
              <option value="subtract">Subtract from current stock</option>
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

function DeleteConfirm({ product, onClose }) {
  const { deleteProduct } = useProductStore();
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    setLoading(true);
    const result = await deleteProduct(product._id);
    setLoading(false);
    if (result.success) { toast.success('Product deleted'); onClose(); }
    else toast.error(result.message || 'Failed to delete');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 animate-fade-in">
      <div className="bg-white dark:bg-gray-900 rounded-t-3xl sm:rounded-2xl shadow-2xl w-full sm:max-w-sm animate-slide-up p-6">
        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 mx-auto mb-4">
          <Trash2 className="w-5 h-5 text-red-600 dark:text-red-400" />
        </div>
        <h2 className="text-center font-semibold text-gray-900 dark:text-white mb-1">Delete Product</h2>
        <p className="text-center text-sm text-gray-500 dark:text-gray-400 mb-5">
          Are you sure you want to delete <span className="font-medium text-gray-800 dark:text-gray-200">"{product.name}"</span>? This cannot be undone.
        </p>
        <div className="flex gap-3">
          <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button onClick={handleDelete} disabled={loading} className="btn-danger flex-1">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ProductsPage() {
  const {
    products, total, totalPages, page, isLoading, filters,
    fetchProducts, fetchCategories, setFilters, setPage, categories,
    stats, fetchStats, brands, fetchBrands
  } = useProductStore();
  const { branches, fetchBranches } = useBranchStore();
  const { user } = useAuthStore();
  const { settings } = useSettingsStore();
  const isStaff = user?.role === 'staff';
  const hidePrice = isStaff && settings?.privacy?.hideStaffPriceDetails;

  const [showModal, setShowModal] = useState(false);
  const [editProduct, setEditProduct] = useState(null);
  const [stockProduct, setStockProduct] = useState(null);
  const [deleteProduct, setDeleteProductState] = useState(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importHeaders, setImportHeaders] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [activeTab, setActiveTab] = useState('all'); // all, categories, low-stock
  const [selectedProduct, setSelectedProduct] = useState(null);

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImportFile(file);
    const formData = new FormData();
    formData.append('file', file);
    setIsScanning(true);
    try {
      const { data } = await api.post('/products/import/scan', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setImportHeaders(data.data.headers);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to scan file');
      setImportFile(null);
    } finally {
      setIsScanning(false);
      e.target.value = null;
    }
  };

  const handleConfirmMapping = async (mapping, branchId) => {
    if (!importFile) return;
    const formData = new FormData();
    formData.append('file', importFile);
    formData.append('mapping', JSON.stringify(mapping));
    if (branchId) formData.append('branchId', branchId);
    setIsImporting(true);
    try {
      const { data } = await api.post('/products/import', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      if (data.success) { toast.success(data.message); fetchProducts(); setImportHeaders(null); setImportFile(null); }
      if (data.errors?.length > 0) toast('Some rows were skipped. Check console for details.', { icon: '⚠️' });
    } catch (error) {
      toast.error(error.response?.data?.message || 'Import failed');
    } finally {
      setIsImporting(false);
    }
  };

  const canEdit = ['admin', 'manager'].includes(user?.role);
  const isAdmin = user?.role === 'admin';

  useEffect(() => { fetchCategories(); fetchBrands(); fetchStats(); fetchBranches(); }, []);
  useEffect(() => { fetchProducts(); fetchStats(); }, [filters, page]);
  
  // Clear the low-stock status filter when switching back to the "All Products" tab
  useEffect(() => {
    if (activeTab === 'all' && filters.status === 'low') {
      setFilters({ status: '' });
    }
  }, [activeTab, filters.status, setFilters]);

  const [localSearch, setLocalSearch] = useState(filters.search);
  useEffect(() => {
    const timer = setTimeout(() => { if (localSearch !== filters.search) setFilters({ search: localSearch }); }, 500);
    return () => clearTimeout(timer);
  }, [localSearch]);

  const handleExportInventory = async () => {
    try {
      toast.loading('Generating report...', { id: 'export' });
      // Include branchId in the export request
      const branchParam = filters.branchId ? `?branchId=${filters.branchId}` : '';
      const response = await api.get(`/reports/inventory/export${branchParam}`, { responseType: 'blob' });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      const fileName = filters.branchId 
        ? `inventory_report_branch_${filters.branchId}_${new Date().toLocaleDateString()}.xlsx`
        : `inventory_report_all_${new Date().toLocaleDateString()}.xlsx`;
        
      link.setAttribute('download', fileName);
      document.body.appendChild(link); link.click(); link.remove();
      toast.success('Report downloaded!', { id: 'export' });
    } catch {
      toast.error('Failed to export inventory', { id: 'export' });
    }
  };
  return (
    <div className="space-y-6">
      {/* Compact Tab Switcher — Segmented Control Style */}
      <div className="sticky top-[60px] z-20 bg-gray-50/80 dark:bg-gray-950/80 backdrop-blur-md py-2 -mx-4 px-4 sm:mx-0 sm:px-0">
        <div className="flex p-1 bg-gray-200/50 dark:bg-gray-800/50 rounded-xl max-w-md mx-auto">
          {[
            { id: 'all', label: 'Products', icon: Package },
            { id: 'categories', label: 'Categories', icon: Filter },
            { id: 'low-stock', label: 'Alerts', icon: AlertTriangle },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                activeTab === tab.id
                  ? 'bg-white dark:bg-gray-700 text-primary-600 dark:text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <tab.icon size={12} className={activeTab === tab.id ? 'opacity-100' : 'opacity-50'} />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'all' && (
        <div className="animate-fade-in space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Inventory Management</h1>
              <div className="flex items-center gap-2 mt-0.5">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {filters.search || filters.category !== 'all' || filters.status ? (
                    <span className="text-primary-600 font-semibold">Showing {total} matching products</span>
                  ) : (
                    <span>{total} products total</span>
                  )}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button onClick={handleExportInventory} className="btn-secondary flex-1 sm:flex-none">
                <Download className="w-4 h-4" /> <span className="hidden sm:inline">Export</span>
              </button>
              {canEdit && (
                <>
                  <input type="file" id="excel-import" className="hidden" accept=".xlsx, .xls" onChange={handleFileSelect} />
                  <button
                    onClick={() => document.getElementById('excel-import').click()}
                    disabled={isScanning || isImporting}
                    className="btn-secondary flex-1 sm:flex-none"
                  >
                    {isScanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileUp className="w-4 h-4" />}
                    <span className="hidden sm:inline">Import</span>
                  </button>
                  <button onClick={() => { setEditProduct(null); setShowModal(true); }} className="btn-primary flex-1 sm:flex-none">
                    <Plus className="w-4 h-4" /> <span className="hidden sm:inline">Add Product</span>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <button 
              onClick={() => setFilters({ status: '' })}
              className={`card p-4 border-l-4 transition-all text-left ${filters.status === '' ? 'border-l-blue-600 bg-blue-50/30 dark:bg-blue-900/10' : 'border-l-blue-500 hover:bg-gray-50 dark:hover:bg-gray-800/50'}`}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
                   <Package className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Total Items</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">{stats?.total || 0}</p>
                </div>
              </div>
            </button>
            <button 
              onClick={() => setFilters({ status: 'ok' })}
              className={`card p-4 border-l-4 transition-all text-left ${filters.status === 'ok' ? 'border-l-green-600 bg-green-50/30 dark:bg-green-900/10' : 'border-l-green-500 hover:bg-gray-50 dark:hover:bg-gray-800/50'}`}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-green-50 dark:bg-green-900/20 flex items-center justify-center text-green-600 dark:text-green-400">
                   <Package className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">In Stock</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">{stats?.inStock || 0}</p>
                </div>
              </div>
            </button>
            <button 
              onClick={() => setFilters({ status: 'low' })}
              className={`card p-4 border-l-4 transition-all text-left ${filters.status === 'low' ? 'border-l-amber-600 bg-amber-50/30 dark:amber-900/10' : 'border-l-amber-500 hover:bg-gray-50 dark:hover:bg-gray-800/50'}`}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center text-amber-600 dark:text-amber-400">
                   <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Low Stock</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">{stats?.lowStock || 0}</p>
                </div>
              </div>
            </button>
            <button 
              onClick={() => setFilters({ status: 'out' })}
              className={`card p-4 border-l-4 transition-all text-left ${filters.status === 'out' ? 'border-l-red-600 bg-red-50/30 dark:bg-red-900/10' : 'border-l-red-500 hover:bg-gray-50 dark:hover:bg-gray-800/50'}`}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center text-red-600 dark:text-red-400">
                   <MinusCircle className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Out of Stock</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">{stats?.outOfStock || 0}</p>
                </div>
              </div>
            </button>
          </div>

      {/* Search + Filter Bar */}
      <div className="card p-3 mb-5">
        <div className="flex gap-2 mb-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, SKU, supplier..."
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              className="input pl-9"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`btn-secondary px-3 ${showFilters ? 'bg-primary-50 dark:bg-primary-900/20 border-primary-300 text-primary-600' : ''}`}
          >
            <Filter className="w-4 h-4" />
          </button>
        </div>
        {showFilters && (
          <div className="relative flex flex-col sm:flex-row gap-2 pt-2 border-t border-gray-100 dark:border-gray-800 animate-fade-in">
            <button 
              onClick={() => setShowFilters(false)}
              className="absolute -top-3 -right-1 p-1 bg-white dark:bg-gray-800 rounded-full border border-gray-100 dark:border-gray-700 text-gray-400 hover:text-red-500 shadow-sm transition-colors z-10"
              title="Close Filters"
            >
              <X className="w-3 h-3" />
            </button>
            <select value={filters.category} onChange={(e) => setFilters({ category: e.target.value })} className="input flex-1">
              <option value="all">All Categories</option>
              {categories.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
            </select>
            <select value={filters.brand || ''} onChange={(e) => setFilters({ brand: e.target.value })} className="input flex-1">
              <option value="">All Brands</option>
              {brands.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
            {isAdmin && (
              <select value={filters.branchId} onChange={(e) => setFilters({ branchId: e.target.value })} className="input flex-1">
                <option value="">All Branches</option>
                {branches.map((b) => <option key={b._id} value={b._id}>{b.name} ({b.code})</option>)}
              </select>
            )}
            <select value={filters.sort} onChange={(e) => setFilters({ sort: e.target.value })} className="input flex-1">
              <option value="-createdAt">Newest First</option>
              <option value="createdAt">Oldest First</option>
              <option value="name">Name A-Z</option>
              <option value="-name">Name Z-A</option>
              <option value="quantity">Qty Low-High</option>
              <option value="-quantity">Qty High-Low</option>
              <option value="-price">Price High-Low</option>
            </select>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary-500" /></div>
      ) : products.length === 0 ? (
        <div className="card flex flex-col items-center justify-center py-20 text-center">
          <Package className="w-12 h-12 text-gray-300 dark:text-gray-700 mb-3" />
          <p className="text-gray-500 dark:text-gray-400 font-medium">No products found</p>
          <p className="text-sm text-gray-400 dark:text-gray-600 mt-1">Try adjusting your search or add a new product.</p>
        </div>
      ) : (
        <>
          {/* ── MOBILE CARD LIST (hidden on md+) ───────────────────────── */}
          <div className="md:hidden space-y-3">
            {products.map((p) => (
              <div 
                key={p._id} 
                onClick={() => setSelectedProduct(p)}
                className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden hover:border-primary-300 dark:hover:border-primary-700 transition-all cursor-pointer group min-h-[300px] flex flex-col"
              >
                {/* Product Image */}
                <div className="relative h-44 w-full bg-gray-100 dark:bg-gray-900 flex-shrink-0">
                  {p.image ? (
                    <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300">
                      <Package size={32} />
                    </div>
                  )}
                </div>

                <div className="p-4 flex-1 flex flex-col">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-900 dark:text-white text-sm leading-tight">{p.name}</p>
                      {p.supplier && <p className="text-xs text-gray-400 mt-0.5">{p.supplier}</p>}
                      <p className="text-[11px] text-gray-400 font-mono mt-1">{p.sku}</p>
                    </div>
                    <span className={`badge ${statusColors[p.stockStatus]} flex-shrink-0`}>{statusLabels[p.stockStatus]}</span>
                  </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div>
                      {!hidePrice && (
                        <>
                          <p className="text-xs text-gray-400">Price</p>
                          <p className="font-bold text-gray-900 dark:text-white">₹{p.price.toLocaleString('en-IN')}</p>
                        </>
                      )}
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Stock</p>
                      <p className="font-bold text-gray-900 dark:text-white">{p.quantity} <span className="text-[10px] text-gray-400 uppercase font-normal">{p.unit}</span></p>
                    </div>
                    {p.category && (
                      <span className="badge badge-blue text-[10px]">{p.category.name}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={(e) => { e.stopPropagation(); setStockProduct(p); }} className="p-2 rounded-xl text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors touch-target">
                      <PlusCircle className="w-4 h-4" />
                    </button>
                    {canEdit && (
                      <button onClick={(e) => { e.stopPropagation(); setEditProduct(p); setShowModal(true); }} className="p-2 rounded-xl text-gray-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors touch-target">
                        <Pencil className="w-4 h-4" />
                      </button>
                    )}
                    {isAdmin && (
                      <button onClick={(e) => { e.stopPropagation(); setDeleteProductState(p); }} className="p-2 rounded-xl text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors touch-target">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
          </div>

          {/* ── DESKTOP TABLE (hidden on mobile) ───────────────────────── */}
          <div className="card overflow-hidden hidden md:block">
            <div className="table-container">
              <table className="w-full text-sm text-center">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800">
                    <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Product</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden lg:table-cell">SKU</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden lg:table-cell">Brand</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Category</th>
                    {!hidePrice && <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Price</th>}
                    <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Stock</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                  {products.map((p) => (
                    <tr 
                      key={p._id} 
                      onClick={() => setSelectedProduct(p)}
                      className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer"
                    >
                      <td className="px-4 py-3 text-center">
                        <p className="font-medium text-gray-900 dark:text-white">{p.name}</p>
                        {p.supplier && <p className="text-xs text-gray-400">{p.supplier}</p>}
                      </td>
                      <td className="px-4 py-4 hidden lg:table-cell font-mono text-xs text-gray-400 text-center">
                        {p.sku}
                      </td>
                      <td className="px-4 py-4 hidden lg:table-cell text-center">
                        <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">{p.brand || '—'}</span>
                      </td>
                      <td className="px-4 py-4 text-center">
                        {p.category ? <span className="badge badge-blue">{p.category.name}</span> : <span className="text-gray-400 text-xs">—</span>}
                      </td>
                      {!hidePrice && <td className="px-4 py-3 text-center font-medium text-gray-900 dark:text-white">₹{p.price.toLocaleString('en-IN')}</td>}
                      <td className="px-4 py-3 text-center">
                        <p className="font-medium text-gray-900 dark:text-white">{p.quantity}</p>
                        <p className="text-[10px] text-gray-400 uppercase">{p.unit}</p>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`badge ${statusColors[p.stockStatus]}`}>{statusLabels[p.stockStatus]}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={(e) => { e.stopPropagation(); setStockProduct(p); }} title="Adjust stock" className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors">
                            <PlusCircle className="w-4 h-4" />
                          </button>
                          {canEdit && (
                            <button onClick={(e) => { e.stopPropagation(); setEditProduct(p); setShowModal(true); }} title="Edit" className="p-1.5 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors">
                              <Pencil className="w-4 h-4" />
                            </button>
                          )}
                          {isAdmin && (
                            <button onClick={(e) => { e.stopPropagation(); setDeleteProductState(p); }} title="Delete" className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
        </div>
      )}

      {activeTab === 'categories' && (
        <div className="animate-fade-in">
          <CategoriesPage hideHeader={true} />
        </div>
      )}

      {activeTab === 'low-stock' && (
        <div className="animate-fade-in">
          <LowStockPage hideHeader={true} />
        </div>
      )}

      {/* Pagination (Only for products tab) */}
      {activeTab === 'all' && totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Page {page} of {totalPages} — {total} records</p>
          <div className="flex gap-2">
            <button onClick={() => setPage(page - 1)} disabled={page === 1} className="btn-secondary py-2 px-3 disabled:opacity-40">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button onClick={() => setPage(page + 1)} disabled={page === totalPages} className="btn-secondary py-2 px-3 disabled:opacity-40">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Modals */}
      {showModal && (
        <ProductModal
          product={editProduct}
          onClose={() => { setShowModal(false); setEditProduct(null); }}
          onSaved={() => toast.success(editProduct ? 'Product updated!' : 'Product created!')}
        />
      )}
      {stockProduct && <StockAdjustModal product={stockProduct} onClose={() => setStockProduct(null)} />}
      {deleteProduct && <DeleteConfirm product={deleteProduct} onClose={() => setDeleteProductState(null)} />}
      {selectedProduct && <ProductDetailModal product={selectedProduct} onClose={() => setSelectedProduct(null)} />}
      {importHeaders && (
        <ImportMappingModal
          headers={importHeaders}
          branches={branches}
          user={user}
          isSubmitting={isImporting}
          onClose={() => { setImportHeaders(null); setImportFile(null); }}
          onConfirm={handleConfirmMapping}
        />
      )}
    </div>
  );
}
