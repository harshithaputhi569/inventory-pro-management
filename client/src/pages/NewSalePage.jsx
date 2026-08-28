import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, Trash2, Plus, Minus, X, Loader2, Package, History,
  ChevronRight, FileText, Tag, AlertTriangle, RefreshCw, Check,
  Banknote, CreditCard, AlertCircle, User, MapPin, Car, Hash, Calendar, ArrowLeft,
  Phone, Box, Maximize, Scale
} from 'lucide-react';
import toast from 'react-hot-toast';
import useProductStore from '../store/productStore.js';
import useSaleStore from '../store/saleStore.js';
import useSettingsStore from '../store/settingsStore.js';
import useCartStore from '../store/cartStore.js';
import useAuthStore from '../store/authStore.js';
import { generateInvoicePDF } from '../utils/pdfGenerator.js';
import { searchProducts } from '../utils/searchUtils.js';

const VOUCHER_TYPES = [
  { id: 'sale', label: 'Sale', desc: 'Regular product sale', icon: Tag, color: '#6366f1' },
  { id: 'sample', label: 'Sample', desc: 'Free sample dispatch', icon: Package, color: '#22c55e' },
  { id: 'damaged', label: 'Damaged', desc: 'Damaged goods report', icon: AlertTriangle, color: '#ef4444' },
  { id: 'return', label: 'Return / Exchange', desc: 'Product return or exchange', icon: RefreshCw, color: '#f59e0b' },
];

const poolMap = { sale: 'isSelling', sample: 'isSample', damaged: 'isDamaged', return: 'isWrongProduct' };

export default function NewSalePage() {
  const navigate = useNavigate();
  const {
    products, isLoading, fetchProducts, fetchCategories, fetchBrands,
    categories: storeCategories, brands
  } = useProductStore();
  const { processSale, isSubmitting } = useSaleStore();
  const { settings, fetchSettings } = useSettingsStore();
  const { user } = useAuthStore();
  const {
    cart, setCart, removeFromCart, updateQty, setQty, setPieces, toggleItemFlag, customer, setCustomer,
    taxRate, setTaxRate, discountRate, setDiscountRate,
    paymentMethod, setPaymentMethod, clearCart, transporter, setTransporter,
    voucherType, setVoucherType, ref, setRef
  } = useCartStore();

  const [showPicker, setShowPicker] = useState(false);
  const [pickerSearch, setPickerSearch] = useState('');
  const [pickerCategory, setPickerCategory] = useState('all');
  const [pickerBrand, setPickerBrand] = useState('all');
  const [pickerQty, setPickerQty] = useState(1);
  const [pickerPieces, setPickerPieces] = useState(0);
  const [pickerProduct, setPickerProduct] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [invoiceDate] = useState(new Date().toISOString().slice(0, 10));
  const [taxAmount, setTaxAmount] = useState(0);
  const [discountAmount, setDiscountAmount] = useState(0);

  const isStaff = user?.role === 'staff';
  const hidePrice = (isStaff && settings?.privacy?.hideStaffPriceDetails !== false) || settings?.privacy?.hideAllFinancialDetails;
  const hideTax = (isStaff && settings?.privacy?.hideStaffTaxDetails !== false) || settings?.privacy?.hideAllFinancialDetails;
  const hidePaymentMethod = (isStaff && settings?.privacy?.hideStaffPaymentMethod !== false) || settings?.privacy?.hideAllFinancialDetails;

  useEffect(() => {
    fetchCategories(); fetchBrands(); fetchProducts({ limit: 50 });
    if (!settings) fetchSettings();
  }, []);

  useEffect(() => {
    if (settings?.sales?.defaultTax && cart.length === 0) setTaxRate(settings.sales.defaultTax);
  }, [settings]);

  const subtotal = useMemo(() => cart.reduce((acc, item) => {
    if (item.isDamaged || item.isWrongProduct) return acc;
    const ppb = item.pieces_per_box || 1;
    return acc + (item.price * item.quantity) + (item.pieces * (item.price / ppb));
  }, 0), [cart]);

  useEffect(() => {
    setTaxAmount((subtotal * taxRate) / 100);
    setDiscountAmount((subtotal * discountRate) / 100);
  }, [subtotal, taxRate, discountRate]);

  const finalTotal = subtotal + taxAmount - discountAmount;

  const handleTaxRateChange = (rate) => { const val = parseFloat(rate) || 0; setTaxRate(val); };
  const handleTaxAmountChange = (amount) => { const val = parseFloat(amount) || 0; setTaxAmount(val); setTaxRate(subtotal > 0 ? (val / subtotal) * 100 : 0); };
  const handleDiscountRateChange = (rate) => { const val = parseFloat(rate) || 0; setDiscountRate(val); };
  const handleDiscountAmountChange = (amount) => { const val = parseFloat(amount) || 0; setDiscountAmount(val); setDiscountRate(subtotal > 0 ? (val / subtotal) * 100 : 0); };

  const filteredProducts = useMemo(() => {
    let list = products;

    // Category filter
    if (pickerCategory && pickerCategory !== 'all') {
      list = list.filter(p => p.category === pickerCategory || p.category?._id === pickerCategory || p.category?.name === pickerCategory);
    }

    // Brand filter
    if (pickerBrand && pickerBrand !== 'all') {
      list = list.filter(p => {
        const pBrand = typeof p.brand === 'string' ? p.brand : p.brand?.name || p.brand;
        return pBrand === pickerBrand;
      });
    }

    // Search query
    if (pickerSearch.trim()) {
      list = searchProducts(list, pickerSearch);
    }

    return list;
  }, [pickerSearch, pickerCategory, pickerBrand, products]);

  const addProduct = (product) => {
    if (product.quantity <= 0 && product.ava_pieces <= 0) { toast.error('Product completely out of stock'); return; }
    setPickerProduct(product);
    if (product.quantity > 0) { setPickerQty(1); setPickerPieces(0); }
    else { setPickerQty(0); setPickerPieces(1); }
  };

  const confirmAdd = () => {
    if (!pickerProduct) return;
    const pool = poolMap[voucherType] || 'isSelling';
    const existing = cart.find(i => i.product === pickerProduct._id);
    const qty = parseInt(pickerQty) || 0;
    const pces = parseInt(pickerPieces) || 0;
    if (qty === 0 && pces === 0) { toast.error('Please enter a quantity'); return; }

    const ppb = pickerProduct.pieces_per_box || 1;
    let finalQty = qty;
    let finalPieces = pces;
    if (finalPieces >= ppb) { finalQty += Math.floor(finalPieces / ppb); finalPieces = finalPieces % ppb; }

    if (existing) {
      if (existing.quantity + finalQty > pickerProduct.quantity) { toast.error('Insufficient box stock.'); return; }
      setCart(prev => prev.map(i => i.product === pickerProduct._id ? {
        ...i, quantity: i.quantity + finalQty, pieces: i.pieces + finalPieces,
        isSelling: pool === 'isSelling', isDamaged: pool === 'isDamaged',
        isSample: pool === 'isSample', isWrongProduct: pool === 'isWrongProduct',
      } : i));
    } else {
      setCart(prev => [...prev, {
        product: pickerProduct._id, name: pickerProduct.name, brand: pickerProduct.brand,
        price: pickerProduct.price, image: pickerProduct.image, color: pickerProduct.color,
        quantity: finalQty, pieces: finalPieces, pieces_per_box: ppb,
        unit: pickerProduct.unit || 'box',
        maxQty: pickerProduct.quantity, maxPieces: pickerProduct.ava_pieces,
        isSelling: pool === 'isSelling', isDamaged: pool === 'isDamaged',
        isSample: pool === 'isSample', isWrongProduct: pool === 'isWrongProduct',
      }]);
    }
    toast.success(`Added ${pickerProduct.name}`);
    setPickerProduct(null);
    setPickerQty(1);
    setPickerPieces(0);
  };

  const handleComplete = async () => {
    if (cart.length === 0) { toast.error('Add at least one product'); return; }
    const items = cart.map(({ isSelling, ...rest }) => rest);
    const result = await processSale({ items, customer, transporter, paymentMethod, tax: taxAmount, discount: discountAmount });
    if (result.success) {
      toast.success('Voucher completed! Invoice: ' + result.data.invoiceNumber);
      generateInvoicePDF(result.data, { hidePrice, hideTax, hidePaymentMethod });
      clearCart(); setVoucherType(null); setShowConfirm(false);
      // Immediately refetch products to sync updated stock quantities from DB to frontend
      fetchProducts({ limit: 50 });
    } else {
      toast.error(result.message);
    }
  };

  // ── Type Picker Screen ───────────────────────────────────────────────────
  if (!voucherType) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
        <div className="mb-8 text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-primary-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">New Voucher</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">Select the voucher type to continue</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-xl">
          {VOUCHER_TYPES.map(({ id, label, desc, icon: Icon, color }) => (
            <button
              key={id}
              onClick={() => { clearCart(); setVoucherType(id); }}
              className="flex items-center gap-4 p-5 rounded-2xl border-2 border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 hover:border-primary-400 hover:shadow-lg transition-all text-left group active:scale-95"
            >
              <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: color + '22' }}>
                <Icon className="w-6 h-6" style={{ color }} />
              </div>
              <div>
                <p className="font-bold text-gray-900 dark:text-white text-sm">{label}</p>
                <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-primary-500 ml-auto transition-colors" />
            </button>
          ))}
        </div>
      </div>
    );
  }

  const typeInfo = VOUCHER_TYPES.find(t => t.id === voucherType);

  // ── Invoice Template ─────────────────────────────────────────────────────
  return (
    <div className="max-w-3xl mx-auto">
      {/* Top Bar */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setVoucherType(null)}
            className="p-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-500 hover:text-primary-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">New Voucher</h1>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-lg" style={{ backgroundColor: typeInfo.color + '22', color: typeInfo.color }}>
              {typeInfo.label}
            </span>
          </div>
        </div>
        <button onClick={() => navigate('/sales')} className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded-xl text-xs font-bold text-gray-600 dark:text-gray-300 hover:text-primary-600 transition-colors">
          <History size={14} /> History
        </button>
      </div>

      {/* Invoice Card */}
      <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-xl overflow-hidden">

        {/* Invoice Header Strip */}
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between" style={{ borderTopColor: typeInfo.color, borderTopWidth: 4 }}>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: typeInfo.color + '22' }}>
              <typeInfo.icon className="w-4 h-4" style={{ color: typeInfo.color }} />
            </div>
            <span className="text-xs font-black uppercase tracking-widest text-gray-400">Voucher / {typeInfo.label}</span>
          </div>
          <div className="flex items-center gap-4 text-xs text-gray-400">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              <span className="font-semibold">{invoiceDate}</span>
            </div>
          </div>
        </div>

        {/* Customer Details */}
        <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800">
          <p className="text-[10px] font-black uppercase tracking-widest text-primary-600 mb-4">Dispatch To</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InvoiceField icon={User} label="Customer Name" placeholder="Enter customer name" value={customer.name} onChange={v => setCustomer({ ...customer, name: v })} />
            <InvoiceField icon={MapPin} label="Delivery Address" placeholder="Enter full delivery address" value={customer.addressLine} onChange={v => setCustomer({ ...customer, addressLine: v })} />
          </div>
        </div>

        {/* Transporter & Shipping Details */}
        <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800">
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-4">Transporter Details</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InvoiceField icon={Car} label="Vehicle Type" placeholder="e.g. Truck, Van" value={transporter.vehicleType || ''} onChange={v => setTransporter({ ...transporter, vehicleType: v })} />
            <InvoiceField icon={Car} label="Vehicle Number" placeholder="e.g. AP 01 AB 1234" value={transporter.vehicleNumber || ''} onChange={v => setTransporter({ ...transporter, vehicleNumber: v })} />
            <InvoiceField icon={Hash} label="Reference Number" placeholder="Reference or Order No" value={ref} onChange={setRef} />
            <InvoiceField icon={Calendar} label="Voucher Date" value={invoiceDate} readOnly />
          </div>
        </div>

        {/* Products Table */}
        <div className="px-6 py-4">
          <div className="flex items-center justify-between mb-3 border-b border-gray-100 dark:border-gray-800 pb-2">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Products</p>
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 w-36 text-center">Quantities</p>
          </div>

          {cart.length === 0 ? (
            <div className="py-10 flex flex-col items-center justify-center text-gray-300 dark:text-gray-700">
              <Package className="w-10 h-10 mb-2" />
              <p className="text-sm italic">No products added yet</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50 dark:divide-gray-800">
              {cart.map((item, idx) => {
                const ppb = item.pieces_per_box || 1;
                const itemTotal = (item.price * item.quantity) + (item.pieces * (item.price / ppb));
                return (
                  <div key={item.product} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-4">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <span className="text-xs font-bold text-gray-300 w-5 text-center flex-shrink-0">{idx + 1}</span>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-gray-800 dark:text-gray-100 truncate">{item.name}</p>
                        {!hidePrice && (
                          <div className="flex flex-wrap items-center gap-2 text-xs text-gray-400 mt-0.5">
                            <span>₹{item.price.toLocaleString('en-IN')} / box</span>
                            {ppb > 1 && (
                              <span className="text-[10px] bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded font-medium">
                                ₹{(item.price / ppb).toFixed(2)} / pc
                              </span>
                            )}
                          </div>
                        )}
                        {/* Status tag */}
                        <div className="flex gap-1.5 mt-1.5">
                          {['isSelling', 'isSample', 'isDamaged', 'isWrongProduct'].map(flag => {
                            const labels = { isSelling: 'Sale', isSample: 'Sample', isDamaged: 'Damaged', isWrongProduct: 'Exchange' };
                            const isActive = item[flag];
                            if (!isActive) return null;
                            return (
                              <span key={flag} className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${flag === 'isSelling' ? 'bg-primary-50 text-primary-700 border border-primary-200/50' :
                                flag === 'isSample' ? 'bg-green-50 text-green-700 border border-green-200/50' :
                                  flag === 'isDamaged' ? 'bg-red-50 text-red-700 border border-red-200/50' :
                                    'bg-purple-50 text-purple-700 border border-purple-200/50'
                                }`}>
                                {labels[flag]}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-4">
                      {/* Interactive Boxes & Pieces inputs */}
                      <div className="flex items-center gap-3">
                        <div className="flex flex-col items-center">
                          <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">{item.unit === 'bag' ? 'Bags' : item.unit === 'box' ? 'Boxes' : (item.unit || 'Units')}</span>
                          <div className="flex items-center bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-0.5">
                            <button onClick={() => updateQty(item.product, -1)} className="p-1 hover:text-primary-600 transition-colors rounded"><Minus className="w-3 h-3" /></button>
                            <input
                              type="number"
                              min={0}
                              value={item.quantity}
                              onChange={e => setQty(item.product, Math.max(0, parseInt(e.target.value) || 0))}
                              className="text-xs font-bold text-gray-900 dark:text-white w-8 text-center bg-transparent border-none outline-none focus:ring-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                            <button onClick={() => updateQty(item.product, 1)} className="p-1 hover:text-primary-600 transition-colors rounded"><Plus className="w-3 h-3" /></button>
                          </div>
                        </div>

                        {(ppb > 1 && (item.unit || 'box').toLowerCase() !== 'bag') && (
                          <div className="flex flex-col items-center">
                            <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">Pieces</span>
                            <div className="flex items-center bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-0.5">
                              <button onClick={() => setPieces(item.product, item.pieces - 1)} className="p-1 hover:text-primary-600 transition-colors rounded"><Minus className="w-3 h-3" /></button>
                              <input
                                type="number"
                                min={0}
                                value={item.pieces}
                                onChange={e => setPieces(item.product, Math.max(0, parseInt(e.target.value) || 0))}
                                className="text-xs font-bold text-gray-900 dark:text-white w-8 text-center bg-transparent border-none outline-none focus:ring-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                              />
                              <button onClick={() => setPieces(item.product, item.pieces + 1)} className="p-1 hover:text-primary-600 transition-colors rounded"><Plus className="w-3 h-3" /></button>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Item Total Price */}
                      {!hidePrice && (
                        <div className="w-24 text-right flex flex-col justify-center">
                          <span className="text-sm font-black text-primary-600">
                            ₹{itemTotal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                          </span>
                        </div>
                      )}

                      <button onClick={() => removeFromCart(item.product)} className="p-1.5 text-gray-300 hover:text-red-500 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Add Product Button */}
          <button
            onClick={() => { setShowPicker(true); setPickerSearch(''); setPickerProduct(null); }}
            className="mt-6 w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl border-2 border-dashed border-primary-300 dark:border-primary-800 text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-all text-sm font-bold active:scale-95"
          >
            <Plus className="w-4 h-4" /> Add Product
          </button>
        </div>

        {/* Taxes & Discounts Inputs */}
        {!hidePrice && cart.length > 0 && !hideTax && (
          <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">Taxes & Discounts</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-gray-50 dark:bg-gray-800/40 p-4 rounded-2xl border border-gray-100 dark:border-gray-800">
              {/* Taxation */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Taxation</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">%</span>
                    <input
                      type="number"
                      className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm text-center font-semibold outline-none focus:ring-2 focus:ring-primary-500/20"
                      value={taxRate === 0 ? '' : taxRate}
                      onChange={e => handleTaxRateChange(e.target.value)}
                      placeholder="Rate %"
                    />
                  </div>
                  <div className="relative flex-[1.5]">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">₹</span>
                    <input
                      type="number"
                      className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl pl-7 pr-3 py-2 text-sm font-semibold outline-none focus:ring-2 focus:ring-primary-500/20"
                      value={taxAmount === 0 ? '' : taxAmount.toFixed(0)}
                      onChange={e => handleTaxAmountChange(e.target.value)}
                      placeholder="Amount ₹"
                    />
                  </div>
                </div>
              </div>

              {/* Discount */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Discount</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">%</span>
                    <input
                      type="number"
                      className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm text-center font-semibold outline-none focus:ring-2 focus:ring-primary-500/20"
                      value={discountRate === 0 ? '' : discountRate}
                      onChange={e => handleDiscountRateChange(e.target.value)}
                      placeholder="Rate %"
                    />
                  </div>
                  <div className="relative flex-[1.5]">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">₹</span>
                    <input
                      type="number"
                      className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl pl-7 pr-3 py-2 text-sm font-semibold outline-none focus:ring-2 focus:ring-primary-500/20"
                      value={discountAmount === 0 ? '' : discountAmount.toFixed(0)}
                      onChange={e => handleDiscountAmountChange(e.target.value)}
                      placeholder="Amount ₹"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Totals */}
        {!hidePrice && cart.length > 0 && (
          <div className="mx-6 mb-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl space-y-2 border border-gray-100 dark:border-gray-800">
            <div className="flex justify-between text-sm text-gray-500"><span>Subtotal</span><span className="font-bold text-gray-800 dark:text-gray-200">₹{subtotal.toLocaleString('en-IN')}</span></div>
            {taxAmount > 0 && <div className="flex justify-between text-sm text-gray-500"><span>Tax ({taxRate}%)</span><span className="font-bold">+ ₹{taxAmount.toLocaleString('en-IN')}</span></div>}
            {discountAmount > 0 && <div className="flex justify-between text-sm text-gray-500"><span>Discount ({discountRate}%)</span><span className="font-bold text-red-500">- ₹{discountAmount.toLocaleString('en-IN')}</span></div>}
            <div className="flex justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
              <span className="font-black text-gray-900 dark:text-white">Total</span>
              <span className="font-black text-xl text-primary-600">₹{finalTotal.toLocaleString('en-IN')}</span>
            </div>
          </div>
        )}

        {/* Payment & Complete */}
        <div className="px-6 pb-6 space-y-4">
          {!hidePaymentMethod && (
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Payment Method</p>
              <div className="grid grid-cols-3 gap-2">
                {[{ id: 'cash', label: 'Cash', Icon: Banknote }, { id: 'card', label: 'Card', Icon: CreditCard }, { id: 'upi', label: 'UPI', Icon: AlertCircle }].map(({ id, label, Icon }) => (
                  <button key={id} onClick={() => setPaymentMethod(id)} className={`py-3 rounded-xl flex flex-col items-center gap-1.5 border-2 transition-all text-xs font-bold ${paymentMethod === id ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700' : 'border-gray-100 dark:border-gray-800 text-gray-400'}`}>
                    <Icon className="w-5 h-5" />{label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={() => setShowConfirm(true)}
            disabled={cart.length === 0 || isSubmitting}
            className="btn-primary w-full py-4 rounded-2xl text-base font-bold flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Check className="w-5 h-5" /> Complete Voucher
          </button>
        </div>
      </div>

      {/* ── Product Picker Sidebar ─────────────────────────────────────────── */}
      {showPicker && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={() => setShowPicker(false)} />
          <div className="fixed right-0 top-0 h-full w-full max-w-sm z-50 flex flex-col bg-white dark:bg-gray-900 shadow-2xl border-l border-gray-200 dark:border-gray-800 animate-slide-up">
            <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
              <h3 className="font-bold text-gray-900 dark:text-white">Select Product</h3>
              <button onClick={() => setShowPicker(false)} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 transition-colors"><X className="w-4 h-4" /></button>
            </div>

            <div className="p-3 border-b border-gray-100 dark:border-gray-800 space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by name or SKU…"
                  value={pickerSearch}
                  onChange={e => setPickerSearch(e.target.value)}
                  className="w-full input pl-9 text-sm"
                  autoFocus
                />
              </div>

              {/* Category & Brand Dropdowns */}
              <div className="grid grid-cols-2 gap-2">
                <div className="relative">
                  <select
                    value={pickerCategory}
                    onChange={e => setPickerCategory(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-2.5 py-2 text-xs font-semibold text-gray-600 dark:text-gray-300 outline-none focus:ring-2 focus:ring-primary-500/20 appearance-none cursor-pointer"
                  >
                    <option value="all">All Categories</option>
                    {storeCategories.map(cat => (
                      <option key={cat._id} value={cat._id || cat.name}>{cat.name}</option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400">
                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" /></svg>
                  </div>
                </div>

                <div className="relative">
                  <select
                    value={pickerBrand}
                    onChange={e => setPickerBrand(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-2.5 py-2 text-xs font-semibold text-gray-600 dark:text-gray-300 outline-none focus:ring-2 focus:ring-primary-500/20 appearance-none cursor-pointer"
                  >
                    <option value="all">All Brands</option>
                    {brands.map(brand => {
                      const name = typeof brand === 'string' ? brand : brand?.name || brand;
                      return <option key={name} value={name}>{name}</option>;
                    })}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400">
                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" /></svg>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {isLoading ? (
                <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-primary-600" /></div>
              ) : filteredProducts.length === 0 ? (
                <div className="text-center py-10 text-gray-400 text-sm italic">No products found</div>
              ) : filteredProducts.map(p => (
                <button
                  key={p._id}
                  onClick={() => addProduct(p)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left ${pickerProduct?._id === p._id ? 'border-primary-400 bg-primary-50 dark:bg-primary-900/20' : 'border-transparent bg-gray-50 dark:bg-gray-800 hover:border-primary-200'}`}
                >
                  <div className="w-10 h-10 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 overflow-hidden flex-shrink-0 flex items-center justify-center">
                    {p.image ? <img src={p.image} alt={p.name} className="w-full h-full object-cover" /> : <Package className="w-4 h-4 text-gray-300" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-800 dark:text-gray-100 truncate">{p.name}</p>
                    <p className="text-[10px] text-gray-400">
                      {p.sku} · {p.quantity} in stock {p.pieces_per_box > 1 && `· ${p.pieces_per_box} Pcs/Box`}
                    </p>
                  </div>
                  {!hidePrice && <span className="text-sm font-black text-primary-600">₹{p.price?.toLocaleString('en-IN')}</span>}
                </button>
              ))}
            </div>

            {pickerProduct && (
              <div className="p-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/80 space-y-4 max-h-[60vh] overflow-y-auto shadow-inner">
                {/* Product Detail Header */}
                <div className="flex gap-3">
                  <div className="w-16 h-16 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 overflow-hidden flex-shrink-0 flex items-center justify-center">
                    {pickerProduct.image ? <img src={pickerProduct.image} alt={pickerProduct.name} className="w-full h-full object-cover" /> : <Package className="w-6 h-6 text-gray-300" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-gray-800 dark:text-white leading-tight">{pickerProduct.name}</p>
                    <p className="text-[10px] text-gray-400 font-mono mt-0.5">{pickerProduct.sku} • {pickerProduct.brand || 'General'}</p>
                    {!hidePrice && <p className="text-sm font-black text-primary-600 mt-1">₹{pickerProduct.price?.toLocaleString('en-IN')}</p>}
                  </div>
                </div>

                {pickerProduct.description && (
                  <p className="text-xs text-gray-500 line-clamp-2">{pickerProduct.description}</p>
                )}

                {/* Technical Specifications badges */}
                <div className="grid grid-cols-2 gap-2 text-[10px] font-semibold text-gray-500">
                  <div className="bg-white dark:bg-gray-900 p-2 rounded-lg border border-gray-100 dark:border-gray-800 flex items-center gap-1.5">
                    <Box className="w-3.5 h-3.5 text-primary-500" />
                    <span>Stock: {pickerProduct.quantity} {pickerProduct.unit === 'bag' ? 'Bags' : pickerProduct.unit === 'box' ? 'Boxes' : (pickerProduct.unit || 'Units')}</span>
                  </div>
                  {pickerProduct.pieces_per_box > 1 && (
                    <div className="bg-white dark:bg-gray-900 p-2 rounded-lg border border-gray-100 dark:border-gray-800 flex items-center gap-1.5">
                      <Package className="w-3.5 h-3.5 text-green-500" />
                      <span>{pickerProduct.ava_pieces} Loose Pcs</span>
                    </div>
                  )}
                  {pickerProduct.pieces_per_box > 1 && (
                    <div className="bg-white dark:bg-gray-900 p-2 rounded-lg border border-gray-100 dark:border-gray-800 flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5 text-violet-500" />
                      <span>{pickerProduct.pieces_per_box} Pcs / Box</span>
                    </div>
                  )}
                  {pickerProduct.measurements && (
                    <div className="bg-white dark:bg-gray-900 p-2 rounded-lg border border-gray-100 dark:border-gray-800 flex items-center gap-1.5">
                      <Maximize className="w-3.5 h-3.5 text-blue-500" />
                      <span className="truncate">{pickerProduct.measurements}</span>
                    </div>
                  )}
                  {pickerProduct.weight_of_unit > 0 && (
                    <div className="bg-white dark:bg-gray-900 p-2 rounded-lg border border-gray-100 dark:border-gray-800 flex items-center gap-1.5">
                      <Scale className="w-3.5 h-3.5 text-orange-500" />
                      <span>{pickerProduct.weight_of_unit} KG / Unit</span>
                    </div>
                  )}
                </div>

                {/* Box & Pieces Selector */}
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">{pickerProduct.unit === 'bag' ? 'Bags' : pickerProduct.unit === 'box' ? 'Boxes' : (pickerProduct.unit || 'Units')}</label>
                    <div className="flex items-center bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-1">
                      <button onClick={() => setPickerQty(Math.max(0, pickerQty - 1))} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 font-bold">−</button>
                      <input type="number" min={0} value={pickerQty} onChange={e => setPickerQty(Math.max(0, parseInt(e.target.value) || 0))} className="flex-1 text-center font-bold text-gray-900 dark:text-white bg-transparent outline-none text-sm w-8" />
                      <button onClick={() => setPickerQty(pickerQty + 1)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 font-bold">+</button>
                    </div>
                  </div>

                  {(pickerProduct.pieces_per_box > 1 && (pickerProduct.unit || 'box').toLowerCase() !== 'bag') && (
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Loose Pieces</label>
                      <div className="flex items-center bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-1">
                        <button onClick={() => setPickerPieces(Math.max(0, pickerPieces - 1))} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 font-bold">−</button>
                        <input type="number" min={0} value={pickerPieces} onChange={e => setPickerPieces(Math.max(0, parseInt(e.target.value) || 0))} className="flex-1 text-center font-bold text-gray-900 dark:text-white bg-transparent outline-none text-sm w-8" />
                        <button onClick={() => setPickerPieces(pickerPieces + 1)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 font-bold">+</button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 pt-2">
                  <button onClick={() => setPickerProduct(null)} className="flex-1 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-xs font-bold text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">Cancel</button>
                  <button onClick={() => { confirmAdd(); setShowPicker(false); }} className="flex-[2] btn-primary py-3 rounded-xl font-bold flex items-center justify-center gap-2 text-xs">
                    <Check className="w-4 h-4" /> Add to Voucher
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* ── Confirm Modal ─────────────────────────────────────────────────── */}
      {showConfirm && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 w-full max-w-sm shadow-2xl border border-gray-100 dark:border-gray-800">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Confirm Voucher</h3>
            <p className="text-sm text-gray-500 mb-4">Complete this <strong>{typeInfo.label}</strong> voucher for <strong>{cart.length}</strong> product(s)?</p>
            {!hidePrice && <p className="text-2xl font-black text-primary-600 mb-6">₹{finalTotal.toLocaleString('en-IN')}</p>}
            <div className="flex gap-3">
              <button onClick={() => setShowConfirm(false)} className="flex-1 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 text-sm font-bold text-gray-600 dark:text-gray-400 hover:bg-gray-50 transition-all">Cancel</button>
              <button onClick={handleComplete} disabled={isSubmitting} className="flex-[2] btn-primary py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2">
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Check className="w-4 h-4" /> Confirm & Complete</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InvoiceField({ icon: Icon, label, placeholder, value, onChange, readOnly }) {
  return (
    <div className="space-y-1">
      <label className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-gray-400">
        <Icon className="w-3 h-3" />{label}
      </label>
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={onChange ? e => onChange(e.target.value) : undefined}
        readOnly={readOnly}
        className={`w-full border-b-2 border-gray-200 dark:border-gray-700 bg-transparent py-2 text-sm font-semibold text-gray-800 dark:text-gray-200 outline-none focus:border-primary-400 transition-colors placeholder:text-gray-300 dark:placeholder:text-gray-600 ${readOnly ? 'text-gray-400 dark:text-gray-600 cursor-not-allowed' : ''}`}
      />
    </div>
  );
}
