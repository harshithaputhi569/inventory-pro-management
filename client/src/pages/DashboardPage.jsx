import { useEffect, useState } from 'react';
import { Package, TrendingDown, AlertTriangle, DollarSign, Store, ShoppingCart, Plus, FileUp, FileText, ArrowRight, Loader2, FileDown, Eye, ClipboardList, Clock, User as UserIcon, X, CheckCircle2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore.js';
import useDashboardStore from '../store/dashboardStore.js';
import { generateInvoicePDF, generateMismatchReportPDF } from '../utils/pdfGenerator.js';
import useProductStore from '../store/productStore.js';
import useSettingsStore from '../store/settingsStore.js';
import BannerDisplay from '../components/dashboard/BannerDisplay.jsx';

function ActivityModal({ activity, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-slide-up">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-primary-600" /> Today's Staff Activity
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>
        <div className="p-4 max-h-[60vh] overflow-y-auto space-y-3">
          {activity.length === 0 ? (
            <div className="py-10 text-center text-gray-400 italic">No activity recorded today yet.</div>
          ) : (
            activity.map((staff) => (
              <div key={staff._id} className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-600 font-bold uppercase">
                    {staff.fullName.charAt(0)}
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 dark:text-white text-sm">{staff.fullName}</p>
                    <div className="flex items-center gap-3 text-[10px] text-gray-500 uppercase font-bold mt-0.5">
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {staff.lastLogin ? new Date(staff.lastLogin).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</span>
                      <span className="flex items-center gap-1">Sales: {staff.salesCount}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${staff.lastLogout && new Date(staff.lastLogout) > new Date(staff.lastLogin) ? 'bg-gray-100 text-gray-500' : 'bg-green-100 text-green-700'}`}>
                    {staff.lastLogout && new Date(staff.lastLogout) > new Date(staff.lastLogin) ? 'Logged Out' : 'Active Now'}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
        <div className="p-6 bg-gray-50 dark:bg-gray-800/30 border-t border-gray-100 dark:border-gray-800">
          <button onClick={onClose} className="w-full py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-2xl font-bold text-sm shadow-lg hover:opacity-90 transition-opacity">
            Close Report
          </button>
        </div>
      </div>
    </div>
  );
}

function InspectionModal({ topProducts, user, onClose }) {
  const { products, fetchProducts, page, totalPages, setPage } = useProductStore();
  const [inspectedIds, setInspectedIds] = useState(new Set());
  const [mismatchedProducts, setMismatchedProducts] = useState([]);
  const [isFinished, setIsFinished] = useState(false);
  const [loadingBatch, setLoadingBatch] = useState(false);

  const getNextProduct = (currentInspectedIds) => {
    if (topProducts && topProducts.length > 0) {
      for (const tp of topProducts) {
        const product = products.find(p => p.name === tp._id);
        if (product && !currentInspectedIds.has(product._id)) {
          return product;
        }
      }
    }
    const uninspectedProducts = products.filter(p => !currentInspectedIds.has(p._id));
    if (uninspectedProducts.length > 0) {
      return uninspectedProducts[Math.floor(Math.random() * uninspectedProducts.length)];
    }
    return null;
  };

  const [currentProduct, setCurrentProduct] = useState(() => getNextProduct(new Set()));

  const handleNext = (isMismatch = false) => {
    if (!currentProduct) return;

    if (isMismatch) {
      setMismatchedProducts(prev => [...prev, currentProduct]);
    }

    const newInspectedIds = new Set(inspectedIds);
    newInspectedIds.add(currentProduct._id);
    setInspectedIds(newInspectedIds);

    const nextProd = getNextProduct(newInspectedIds);
    if (nextProd) {
      setCurrentProduct(nextProd);
    } else {
      setCurrentProduct(null);
      loadNextBatch();
    }
  };

  const loadNextBatch = async () => {
    if (page >= totalPages) {
      setIsFinished(true);
      return;
    }
    setLoadingBatch(true);
    setPage(page + 1);
    await fetchProducts({ limit: 100 });
    setLoadingBatch(false);
  };

  useEffect(() => {
    if (!currentProduct && !isFinished && products.length > 0) {
      const next = getNextProduct(inspectedIds);
      if (next) setCurrentProduct(next);
    }
  }, [products, currentProduct, isFinished]);

  if (!currentProduct && inspectedIds.size === 0 && !loadingBatch) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-slide-up flex flex-col max-h-[90vh]">
        <div className="bg-gradient-to-br from-indigo-600 to-primary-700 p-8 text-center text-white relative flex-shrink-0">
          <div className="absolute top-4 right-4">
            <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-xl transition-colors">
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
          <div className="w-20 h-20 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mx-auto mb-4 border border-white/30 shadow-xl">
            <Eye className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-xl font-black uppercase tracking-widest">Product Inspection</h2>
          <p className="text-xs opacity-75 mt-1">Physical Stock Audit Tool</p>
        </div>

        <div className="p-8 space-y-6 overflow-y-auto">
          {loadingBatch ? (
            <div className="py-16 flex flex-col items-center justify-center space-y-4">
              <Loader2 className="w-10 h-10 text-primary-500 animate-spin" />
              <p className="text-sm text-gray-500 font-medium">Loading next batch of products...</p>
            </div>
          ) : currentProduct && !isFinished ? (
            <>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-xl bg-gray-100 dark:bg-gray-800 overflow-hidden border border-gray-100 dark:border-gray-800 flex-shrink-0">
                  {currentProduct.image ? (
                    <img src={currentProduct.image} alt={currentProduct.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300">
                      <Package className="w-6 h-6" />
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] text-gray-400 font-mono uppercase tracking-widest">{currentProduct.sku}</p>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white truncate">{currentProduct.name}</h3>
                  <p className="text-xs text-primary-600 dark:text-primary-400 font-bold">{currentProduct.category?.name || 'General'}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 text-center">
                  <p className="text-[10px] text-gray-400 font-black uppercase mb-1">System Stock</p>
                  <p className="text-2xl font-black text-gray-900 dark:text-white">{currentProduct.quantity}</p>
                  <p className="text-[9px] text-gray-500">{currentProduct.unit}</p>
                </div>
                <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 text-center">
                  <p className="text-[10px] text-gray-400 font-black uppercase mb-1">Min. Alert</p>
                  <p className="text-2xl font-black text-amber-500">{currentProduct.minStockLevel}</p>
                  <p className="text-[9px] text-gray-500">{currentProduct.unit}</p>
                </div>
              </div>

              <div className="pt-2 flex flex-col gap-3">
                <button
                  onClick={() => handleNext(false)}
                  className="flex items-center justify-center gap-2 w-full py-4 bg-emerald-600 text-white rounded-2xl font-bold shadow-lg shadow-emerald-200 dark:shadow-none hover:bg-emerald-700 transition-all"
                >
                  <CheckCircle2 className="w-5 h-5" /> Stock Matches
                </button>
                <button
                  onClick={() => handleNext(true)}
                  className="flex items-center justify-center gap-2 w-full py-4 bg-rose-600 text-white rounded-2xl font-bold shadow-lg shadow-rose-200 dark:shadow-none hover:bg-rose-700 transition-all"
                >
                  <AlertTriangle className="w-5 h-5" /> Stock Mismatch
                </button>
                <button
                  onClick={() => handleNext(false)}
                  className="w-full py-3 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 rounded-2xl font-bold text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-all mt-2"
                >
                  Skip to Next Product
                </button>
                <button
                  onClick={() => setIsFinished(true)}
                  className="w-full py-3 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 rounded-2xl font-bold text-sm hover:bg-gray-200 dark:hover:bg-gray-700 transition-all"
                >
                  Finish Inspection Early
                </button>
              </div>
            </>
          ) : (
            <div className="text-center py-10">
              <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Inspection Complete</h3>
              <p className="text-gray-500 text-sm mb-6">You inspected {inspectedIds.size} product{inspectedIds.size !== 1 ? 's' : ''}.</p>

              {mismatchedProducts.length > 0 ? (
                <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-800">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-bold text-gray-900 dark:text-white text-sm">Mismatches Found ({mismatchedProducts.length})</h4>
                  </div>
                  <button
                    onClick={() => generateMismatchReportPDF(mismatchedProducts, user)}
                    className="flex items-center justify-center gap-2 w-full py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-2xl font-bold text-sm shadow-lg hover:opacity-90 transition-opacity"
                  >
                    <FileDown className="w-4 h-4" /> Download Mismatch Report
                  </button>
                </div>
              ) : (
                <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-2xl text-sm font-medium">
                  No mismatches found during this session! Great job.
                </div>
              )}
              <button
                onClick={onClose}
                className="w-full py-3 mt-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 rounded-2xl font-bold text-sm"
              >
                Close Window
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuthStore();
  const { summary, fetchSummary, isLoading } = useDashboardStore();
  const navigate = useNavigate();
  const { products, fetchProducts } = useProductStore();
  const [showInspection, setShowInspection] = useState(false);
  const [showActivity, setShowActivity] = useState(false);
  const { settings, fetchSettings } = useSettingsStore();

  const isStaff = user?.role === 'staff';
  const hidePrice = (isStaff && settings?.privacy?.hideStaffPriceDetails !== false) || settings?.privacy?.hideAllFinancialDetails;
  const hideTax = (isStaff && settings?.privacy?.hideStaffTaxDetails !== false) || settings?.privacy?.hideAllFinancialDetails;
  const hidePayment = (isStaff && settings?.privacy?.hideStaffPaymentMethod !== false) || settings?.privacy?.hideAllFinancialDetails;

  useEffect(() => {
    fetchSummary();
    fetchProducts({ limit: 100 }); // Pre-fetch first batch for inspection
    if (!settings) fetchSettings();
  }, [settings]);

  if (isLoading || !summary) {
    return (
      <div className="h-[60vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  const { stats, recentSales, topProducts, lowStockProducts, revenueToday, salesToday } = summary;

  return (
    <div className="space-y-5 pb-6">

      {/* ── Page Header ──────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
            Welcome back, {user?.fullName || 'Admin'}! 👋
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-0.5 text-sm">
            Here's what's happening with your inventory today.
          </p>
        </div>
        {/* Store Code Badge */}
        <div className="flex items-center gap-3 bg-white dark:bg-gray-900 px-4 py-2.5 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm self-start sm:self-auto">
          <Store className="w-4 h-4 text-primary-500 flex-shrink-0" />
          <div>
            <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Store ID</p>
            <p className="font-bold text-gray-900 dark:text-white text-sm leading-tight">{user?.storeId?.code || 'MAIN-01'}</p>
          </div>
        </div>
      </div>

      {/* ── Global Announcement Banner ────────────────────────────────────── */}
      <BannerDisplay />

      {/* ── Quick Actions ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          onClick={() => navigate('/pos')}
          className="btn-primary py-3.5 flex flex-col items-center justify-center gap-1.5 h-auto rounded-2xl"
        >
          <ShoppingCart className="w-5 h-5" />
          <span className="text-xs font-semibold">New Voucher</span>
        </button>
        <button
          onClick={() => navigate('/products')}
          className="card p-3.5 hover:border-primary-400 dark:hover:border-primary-600 border-2 border-transparent transition-all flex flex-col items-center justify-center gap-1.5 text-primary-600 dark:text-primary-400 font-medium cursor-pointer rounded-2xl"
        >
          <Plus className="w-5 h-5" />
          <span className="text-xs font-semibold">Add Product</span>
        </button>
        <button
          onClick={() => setShowInspection(true)}
          className="card p-3.5 hover:border-amber-400 dark:hover:border-amber-600 border-2 border-transparent transition-all flex flex-col items-center justify-center gap-1.5 text-amber-600 dark:text-amber-400 font-medium cursor-pointer rounded-2xl"
        >
          <Eye className="w-5 h-5" />
          <span className="text-xs font-semibold">Inspect Stock</span>
        </button>
        <button
          onClick={() => setShowActivity(true)}
          className="card p-3.5 hover:border-purple-400 dark:hover:border-purple-600 border-2 border-transparent transition-all flex flex-col items-center justify-center gap-1.5 text-purple-600 dark:text-purple-400 font-medium cursor-pointer rounded-2xl"
        >
          <ClipboardList className="w-5 h-5" />
          <span className="text-xs font-semibold">Daily Activity</span>
        </button>
      </div>

      {/* ── KPI Cards ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {/* Revenue — spans 2 cols on mobile */}
        {!hidePrice && (
          <div className="card p-4 sm:p-5 bg-gradient-to-br from-primary-600 to-primary-700 text-white col-span-2 lg:col-span-1 rounded-2xl">
            <DollarSign className="w-5 h-5 mb-2 opacity-80" />
            <p className="text-xs sm:text-sm opacity-90 mb-1">Today's Revenue</p>
            <p className="text-2xl sm:text-3xl font-bold">₹{revenueToday.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
            <p className="text-xs opacity-75 mt-1.5">{salesToday} sales completed</p>
          </div>
        )}

        <div className="card p-4 border-l-4 border-l-blue-500 rounded-2xl">
          <Package className="w-5 h-5 mb-2 text-blue-500" />
          <p className="text-xs text-gray-500 mb-1">Total Products</p>
          <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
        </div>

        <div className="card p-4 border-l-4 border-l-green-500 rounded-2xl">
          <Package className="w-5 h-5 mb-2 text-green-500" />
          <p className="text-xs text-gray-500 mb-1">In Stock</p>
          <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">{stats.inStock}</p>
        </div>

        <Link to="/low-stock" className="card p-4 border-l-4 border-l-yellow-500 hover:bg-yellow-50 dark:hover:bg-yellow-900/10 transition-colors group block rounded-2xl">
          <AlertTriangle className="w-5 h-5 mb-2 text-yellow-500 group-hover:scale-110 transition-transform" />
          <p className="text-xs text-gray-500 mb-1">Low Stock</p>
          <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">{stats.lowStock}</p>
        </Link>

        <div className="card p-4 border-l-4 border-l-red-500 rounded-2xl">
          <TrendingDown className="w-5 h-5 mb-2 text-red-500" />
          <p className="text-xs text-gray-500 mb-1">Out of Stock</p>
          <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">{stats.outOfStock}</p>
        </div>
      </div>

      {/* ── Main content grid ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Recent Transactions */}
        <div className="lg:col-span-2 card p-0 overflow-hidden flex flex-col rounded-2xl">
          <div className="p-4 sm:p-5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
            <h2 className="font-bold text-gray-900 dark:text-white flex items-center gap-2 text-sm sm:text-base">
              <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-primary-500" /> Recent Transactions
            </h2>
            <Link to="/sales" className="text-xs sm:text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1 font-medium">
              View All <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {recentSales.length === 0 ? (
            <div className="p-10 text-center text-gray-400 italic text-sm">No recent sales found.</div>
          ) : (
            <>
              {/* Mobile card list */}
              <div className="sm:hidden divide-y divide-gray-50 dark:divide-gray-800">
                {recentSales.map(sale => (
                  <div key={sale._id} className="flex items-center justify-between p-4">
                    <div className="min-w-0 pr-3">
                      <p className="font-bold text-xs text-gray-900 dark:text-white">{sale.invoiceNumber}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{sale.customer?.name || 'Walk-in'}</p>
                      <p className="text-[10px] text-gray-400">{new Date(sale.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {!hidePrice && <span className="font-bold text-sm text-primary-600">₹{sale.totalAmount.toLocaleString('en-IN')}</span>}
                      <button onClick={() => generateInvoicePDF(sale, { hidePrice, hideTax, hidePaymentMethod: hidePayment })} className="p-2 text-gray-300 hover:text-primary-600 transition-colors touch-target rounded-xl">
                        <FileDown className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop table */}
              <div className="hidden sm:block w-full">
                {/* Header */}
                <div className={`grid ${!hidePrice ? 'grid-cols-4' : 'grid-cols-3'} w-full bg-gray-50/50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800`}>
                  <div className="px-6 py-3 text-left font-medium text-gray-500 text-xs">Invoice</div>
                  <div className="px-6 py-3 text-left font-medium text-gray-500 text-xs">Customer</div>
                  {!hidePrice && <div className="px-6 py-3 text-center font-medium text-gray-500 text-xs">Amount</div>}
                  <div className="px-6 py-3 text-center font-medium text-gray-500 text-xs">Action</div>
                </div>
                {/* Rows */}
                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                  {recentSales.map(sale => (
                    <div
                      key={sale._id}
                      className={`grid ${!hidePrice ? 'grid-cols-4' : 'grid-cols-3'} w-full hover:bg-gray-50 dark:hover:bg-gray-800/20 transition-colors`}
                    >
                      <div className="px-6 py-3 font-medium text-gray-900 dark:text-white text-sm truncate self-center">{sale.invoiceNumber}</div>
                      <div className="px-6 py-3 self-center min-w-0">
                        <p className="text-gray-900 dark:text-white text-sm truncate">{sale.customer?.name || 'Walk-in'}</p>
                        <p className="text-xs text-gray-500">{new Date(sale.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                      {!hidePrice && <div className="px-6 py-3 text-center font-medium text-primary-600 self-center">₹{sale.totalAmount.toLocaleString('en-IN')}</div>}
                      <div className="px-6 py-3 text-center self-center">
                        <button onClick={() => generateInvoicePDF(sale, { hidePrice, hideTax, hidePaymentMethod: hidePayment })} className="text-gray-400 hover:text-primary-600 transition-colors" title="Download Invoice">
                          <FileDown className="w-5 h-5 mx-auto" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Sidebar: Urgent Restock + Top Sellers */}
        <div className="space-y-5">
          {/* Urgent Restock */}
          <div className="card p-0 overflow-hidden rounded-2xl">
            <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
              <h2 className="font-bold text-gray-900 dark:text-white flex items-center gap-2 text-sm">
                <AlertTriangle className="w-4 h-4 text-yellow-500" /> Urgent Restock
              </h2>
            </div>
            <div className="p-2">
              {lowStockProducts.length === 0 ? (
                <div className="p-6 text-center text-gray-400 italic text-sm">All products are well stocked.</div>
              ) : (
                <ul className="divide-y divide-gray-50 dark:divide-gray-800/50">
                  {lowStockProducts.map(product => (
                    <li key={product._id} className="p-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800/30 rounded-xl">
                      <div className="min-w-0 pr-2">
                        <p className="font-medium text-sm text-gray-900 dark:text-white truncate">{product.name}</p>
                        <p className="text-[10px] text-gray-500 font-mono truncate">{product.sku}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="font-bold text-red-500 text-sm">{product.quantity} left</p>
                        <p className="text-[10px] text-gray-400">Min: {product.minStockLevel}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Top Sellers */}
          <div className="card p-0 overflow-hidden rounded-2xl">
            <div className="p-4 border-b border-gray-100 dark:border-gray-800">
              <h2 className="font-bold text-gray-900 dark:text-white flex items-center gap-2 text-sm">
                <TrendingDown className="w-4 h-4 text-green-500 rotate-180" /> Top Sellers
              </h2>
            </div>
            <div className="p-2">
              {topProducts.length === 0 ? (
                <div className="p-6 text-center text-gray-400 italic text-sm">No sales data yet.</div>
              ) : (
                <ul className="divide-y divide-gray-50 dark:divide-gray-800/50">
                  {topProducts.map((product, idx) => (
                    <li key={product._id} className="p-3 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-800/30 rounded-xl">
                      <div className="w-6 h-6 rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-600 flex items-center justify-center text-xs font-bold flex-shrink-0">
                        {idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-gray-900 dark:text-white truncate">{product._id}</p>
                      </div>
                      <div className="text-right whitespace-nowrap flex-shrink-0">
                        <p className="font-bold text-gray-900 dark:text-white text-sm">{product.totalSold}</p>
                        <p className="text-[10px] text-gray-400">sold</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>

      </div>

      {showActivity && <ActivityModal activity={summary.todayActivity || []} onClose={() => setShowActivity(false)} />}
      {showInspection && products.length > 0 && <InspectionModal topProducts={summary.topProducts} user={user} onClose={() => setShowInspection(false)} />}
    </div>
  );
}
