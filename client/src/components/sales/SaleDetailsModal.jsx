import { useState, useEffect } from 'react';
import { X, Download, User, Calendar, MapPin, CreditCard, ShoppingBag, AlertTriangle, RefreshCw, Box, Gift, FileText, Smartphone, Loader2, Edit3, Check, MessageSquare, History, Package } from 'lucide-react';
import { generateInvoicePDF } from '../../utils/pdfGenerator.js';
import useSaleStore from '../../store/saleStore.js';
import useAuthStore from '../../store/authStore.js';
import useSettingsStore from '../../store/settingsStore.js';
import useProductStore from '../../store/productStore.js';
import toast from 'react-hot-toast';

export default function SaleDetailsModal({ sale: initialSale, onClose }) {
  const { updateSaleItem, isSubmitting } = useSaleStore();
  const { user } = useAuthStore();
  const { settings, fetchSettings } = useSettingsStore();
  const { fetchProducts } = useProductStore();
  const [sale, setSale] = useState(initialSale);

  useEffect(() => {
    if (!settings) fetchSettings();
  }, [settings]);
  const [isDownloading, setIsDownloading] = useState(false);
  const [editingItem, setEditingItem] = useState(null); // { id, ...data }
  const [viewingHistory, setViewingHistory] = useState(null); // itemId

  const isPrivileged = ['admin', 'manager'].includes(user?.role);
  const soldById = typeof sale.soldBy === 'string' ? sale.soldBy : sale.soldBy?._id;
  const isOwner = soldById === user?.id;
  
  const isStaff = user?.role === 'staff';
  const hidePrice = (isStaff && settings?.privacy?.hideStaffPriceDetails !== false) || settings?.privacy?.hideAllFinancialDetails;
  const hideTax = (isStaff && settings?.privacy?.hideStaffTaxDetails !== false) || settings?.privacy?.hideAllFinancialDetails;
  const hidePayment = (isStaff && settings?.privacy?.hideStaffPaymentMethod !== false) || settings?.privacy?.hideAllFinancialDetails;
  
  if (!sale) return null;

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const handleUpdateStatus = async (itemId) => {
    let res;
    if (itemId === 'all') {
      // Bulk update all items
      for (const item of sale.items) {
        res = await updateSaleItem(sale._id, item._id, editingItem.data);
      }
    } else {
      res = await updateSaleItem(sale._id, itemId, editingItem.data);
    }
    
    if (res?.success) {
      setSale(res.data);
      setEditingItem(null);
      toast.success(itemId === 'all' ? 'Order status updated' : 'Item status updated');
      fetchProducts();
    } else {
      toast.error(res?.message || 'Update failed');
    }
  };
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl relative border border-gray-100 dark:border-gray-800">
        
        {/* Header */}
        <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gray-50/50 dark:bg-gray-800/50">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/30 text-primary-600 rounded-2xl flex items-center justify-center">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">{sale.invoiceNumber}</h2>

            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={async () => {
                try {
                  setIsDownloading(true);
                  await generateInvoicePDF(sale, { hidePrice, hideTax, hidePaymentMethod: hidePayment });
                } catch (error) {
                  console.error('Download failed:', error);
                  toast.error('Failed to generate PDF');
                } finally {
                  setIsDownloading(false);
                }
              }}
              disabled={isDownloading}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-xl text-sm font-bold hover:bg-primary-700 transition-all shadow-lg shadow-primary-200 dark:shadow-none disabled:opacity-50"
            >
              {isDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              {isDownloading ? 'Downloading...' : 'Download'}
            </button>
            <button 
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8">
          
          {/* Top Info Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-4">
              <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                <User className="w-3 h-3 text-primary-500" /> Dispatch Information
              </h3>
              <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-700">
                <p className="font-bold text-gray-900 dark:text-white">{sale.customer?.name || 'Walk-in Customer'}</p>
                {sale.customer?.companyName && (
                  <p className="text-xs font-semibold text-primary-600 mt-0.5">{sale.customer.companyName}</p>
                )}
                <div className="mt-2 space-y-1">
                  {sale.customer?.phone ? (
                    <p className="text-xs text-gray-500 flex items-center gap-2">
                      <Smartphone className="w-3.5 h-3.5" /> {sale.customer.phone}
                    </p>
                  ) : (
                    <p className="text-[10px] italic text-gray-400">No phone provided</p>
                  )}
                  {sale.customer?.addressLine && (
                    <p className="text-xs text-gray-500 flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5" /> {sale.customer.addressLine}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                <MapPin className="w-3 h-3 text-red-500" /> Store & Staff
              </h3>
              <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-700">
                <p className="text-sm font-bold text-gray-900 dark:text-white">{sale.storeId?.name || 'Main Branch'}</p>
                <div className="mt-2 space-y-1">
                  <p className="text-xs text-gray-500">Delivered by: <span className="font-semibold text-primary-600">{sale.soldBy?.fullName || 'System Admin'}</span></p>
                  {sale.soldBy?.username && (
                    <p className="text-[10px] text-gray-400">Staff ID: <span className="font-medium text-gray-600 dark:text-gray-400">{sale.soldBy.username}</span></p>
                  )}
                  {sale.soldBy?.phone && (
                    <p className="text-[10px] text-gray-400">Mobile: <span className="font-medium text-gray-600 dark:text-gray-400">{sale.soldBy.phone}</span></p>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                <Calendar className="w-3 h-3 text-amber-500" /> Date & Payment
              </h3>
              <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-700">
                <p className="text-sm font-bold text-gray-900 dark:text-white">{formatDate(sale.createdAt)}</p>
                <div className="flex items-center justify-between mt-1">
                  {!hidePayment && (
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-3.5 h-3.5 text-gray-400" />
                      <span className="text-xs font-bold uppercase text-gray-500">{sale.paymentMethod}</span>
                    </div>
                  )}

                </div>
              </div>
            </div>
          </div>

          {/* Transporter Details */}
          {sale.transporter?.name && (
            <div className="space-y-4">
              <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                <Box className="w-3 h-3 text-blue-500" /> Driver / Transporter Details
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-2xl bg-blue-50/30 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/20">
                <div>
                  <p className="text-[10px] text-gray-400 uppercase font-bold">Driver Name</p>
                  <p className="text-sm font-bold text-gray-900 dark:text-white">{sale.transporter.name}</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 uppercase font-bold">Mobile</p>
                  <p className="text-sm font-bold text-gray-900 dark:text-white">{sale.transporter.mobile || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 uppercase font-bold">Vehicle Type</p>
                  <p className="text-sm font-bold text-gray-900 dark:text-white">{sale.transporter.vehicleType || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 uppercase font-bold">Vehicle #</p>
                  <p className="text-sm font-bold text-gray-900 dark:text-white">{sale.transporter.vehicleNumber || 'N/A'}</p>
                </div>
              </div>
            </div>
          )}

          {/* Items Table */}
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                <ShoppingBag className="w-3 h-3 text-indigo-500" /> Order Summary
              </h3>
              
              {/* Consolidated Status & Actions for entire invoice */}
              <div className="flex items-center gap-3 bg-gray-50 dark:bg-gray-800/50 px-4 py-2 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
                <div className="flex flex-wrap gap-1">
                  {(() => {
                    const firstItem = sale.items[0] || {};
                    if (firstItem.isDamaged) return <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-100 text-red-700 text-[10px] font-bold shadow-sm"><AlertTriangle className="w-3 h-3" /> Damaged Order</span>;
                    if (firstItem.isExchange) return <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold shadow-sm"><RefreshCw className="w-3 h-3" /> Exchange Order</span>;
                    if (firstItem.isWrongProduct) return <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-100 text-purple-700 text-[10px] font-bold shadow-sm"><Box className="w-3 h-3" /> Wrong Delivery</span>;
                    if (firstItem.isSample) return <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-100 text-green-700 text-[10px] font-bold shadow-sm"><Gift className="w-3 h-3" /> Sample Order</span>;
                    return <span className="px-2.5 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 text-[10px] font-bold">Standard Sale</span>;
                  })()}
                </div>
                
                <div className="flex items-center gap-1.5 border-l border-gray-200 dark:border-gray-700 pl-3">
                  {(isPrivileged || isOwner) && (
                    <button 
                      onClick={() => {
                        const firstItem = sale.items[0] || {};
                        setEditingItem({ 
                          id: 'all', // Special flag for bulk update
                          data: { 
                            isDamaged: firstItem.isDamaged, 
                            isExchange: firstItem.isExchange, 
                            isSample: firstItem.isSample, 
                            isWrongProduct: firstItem.isWrongProduct,
                            statusReason: firstItem.statusReason
                          } 
                        });
                      }}
                      title="Update Order Status"
                      className="p-1.5 rounded-xl bg-primary-600 text-white hover:bg-primary-700 transition-all shadow-md shadow-primary-100 dark:shadow-none"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button 
                    onClick={() => setViewingHistory(sale.items[0]?._id)}
                    title="View Status History"
                    className="p-1.5 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-400 hover:text-primary-600 transition-all shadow-sm"
                  >
                    <History className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
            <div className="overflow-x-auto border border-gray-100 dark:border-gray-800 rounded-2xl">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-800/80 border-b border-gray-100 dark:border-gray-800">
                    <th className="text-left px-6 py-4 font-bold text-gray-600 dark:text-gray-400 uppercase text-[10px]">Product Details</th>
                    <th className="text-center px-4 py-4 font-bold text-gray-600 dark:text-gray-400 uppercase text-[10px]">Qty</th>
                    {!hidePrice && <th className="text-right px-4 py-4 font-bold text-gray-600 dark:text-gray-400 uppercase text-[10px]">Price</th>}
                    {!hidePrice && <th className="text-right px-6 py-4 font-bold text-gray-600 dark:text-gray-400 uppercase text-[10px]">Subtotal</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                  {sale.items.map((item, idx) => (
                    <tr key={idx} className="bg-white dark:bg-transparent">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 overflow-hidden flex-shrink-0 relative">
                            {item.product?.image ? (
                              <img src={item.product.image} alt={item.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-gray-300">
                                <Package className="w-6 h-6" />
                              </div>
                            )}
                            <div className="absolute top-1 left-1 w-2 h-2 rounded-full shadow-sm" style={{ backgroundColor: item.product?.color || '#3b82f6' }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-gray-900 dark:text-white text-xs md:text-sm leading-tight line-clamp-2">{item.name}</p>
                            <div className="flex flex-wrap items-center gap-1.5 mt-1">
                              <span className="text-[9px] md:text-[10px] text-gray-400 font-mono whitespace-nowrap bg-gray-50 dark:bg-gray-800/50 px-1.5 py-0.5 rounded border border-gray-100 dark:border-gray-700">
                                SKU: {item.product?.sku || (typeof item.product === 'string' ? item.product.slice(-6) : 'N/A')}
                              </span>
                              {(item.product?.category?.name || item.product?.category) && (
                                <span className="text-[9px] md:text-[10px] text-primary-500 font-medium px-1.5 py-0.5 bg-primary-50 dark:bg-primary-900/20 rounded" style={{ color: item.product?.color, backgroundColor: (item.product?.color || '#3b82f6') + '15' }}>
                                  {item.product?.category?.name || 'General'}
                                </span>
                              )}
                              {(() => {
                                const ppb = item.product?.pieces_per_box || 1;
                                const weightPerUnit = item.product?.weight_of_unit || 0;
                                const calculatedWeight = item.weight || ( (item.quantity * weightPerUnit) + (item.pieces * (weightPerUnit / ppb)) );
                                return calculatedWeight > 0 ? (
                                  <span className="text-[9px] md:text-[10px] text-amber-600 font-medium px-1.5 py-0.5 bg-amber-50 dark:bg-amber-900/20 rounded">
                                    {calculatedWeight.toFixed(2)} KG
                                  </span>
                                ) : null;
                              })()}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-center font-bold text-gray-700 dark:text-gray-300">
                        <div className="flex flex-col items-center gap-0.5">
                          {(() => {
                            const unit = (item.product?.unit || 'box').toLowerCase();
                            const isBag = unit === 'bag';
                            if (isBag) {
                              return <span className="text-sm font-black">{item.quantity || 0} bag</span>;
                            }
                            const hasBoxes = (item.quantity || 0) > 0;
                            const hasPieces = (item.pieces || 0) > 0;

                            if (hasBoxes && hasPieces) {
                              return (
                                <div className="flex flex-col items-center">
                                  <span className="text-sm font-black whitespace-nowrap">{item.quantity} Boxes</span>
                                  <span className="text-xs font-bold text-primary-600">+ {item.pieces} Pieces</span>
                                </div>
                              );
                            } else if (hasBoxes) {
                              return <span className="text-sm font-black whitespace-nowrap">{item.quantity} Boxes</span>;
                            } else if (hasPieces) {
                              return <span className="text-sm font-black whitespace-nowrap">{item.pieces} Pieces</span>;
                            }
                            return <span className="text-sm font-black">0 Boxes</span>;
                          })()}
                          {(() => {
                            const unit = (item.product?.unit || 'box').toLowerCase();
                            const isBag = unit === 'bag';
                            const ppb = item.product?.pieces_per_box || 1;
                            if (!isBag && ppb > 1) {
                              return (
                                <span className="text-[10px] text-gray-400 font-medium">
                                  {ppb} Pieces/Box
                                </span>
                              );
                            }
                            return null;
                          })()}
                        </div>
                      </td>
                      {!hidePrice && (
                        <td className="px-4 py-4 text-right text-gray-600 dark:text-gray-400">
                          <div className="flex flex-col items-end">
                            <span>₹{item.price.toLocaleString('en-IN')}</span>
                            {(item.product?.pieces_per_box > 1 || item.pieces > 0) && (
                              <span className="text-[10px] text-gray-400 font-medium">
                                ₹{(item.pricePerPiece || (item.price / (item.product?.pieces_per_box || 1))).toFixed(2)}/Piece
                              </span>
                            )}
                          </div>
                        </td>
                      )}
                      {!hidePrice && <td className="px-6 py-4 text-right font-bold text-gray-900 dark:text-white">₹{item.subtotal.toLocaleString('en-IN')}</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Totals */}
          <div className="flex flex-col md:flex-row justify-between gap-8 pt-4">
            <div className="max-w-md">
              <p className="text-xs text-gray-400 italic">
                * This document serves as an official proof of purchase. Product status flags indicate reported issues or promotional distribution at the time of sale.
              </p>
            </div>
            <div className="w-full md:w-72 space-y-3">
              {!hidePrice && (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Subtotal</span>
                    <span className="font-bold text-gray-900 dark:text-white">₹{(sale.totalAmount - (sale.tax || 0) + (sale.discount || 0)).toLocaleString('en-IN')}</span>
                  </div>
                  {!hideTax && sale.tax > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Tax</span>
                      <span className="font-bold text-green-600">+ ₹{sale.tax.toLocaleString('en-IN')}</span>
                    </div>
                  )}
                  {sale.discount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Discount</span>
                      <span className="font-bold text-red-600">- ₹{sale.discount.toLocaleString('en-IN')}</span>
                    </div>
                  )}
                  <div className="h-px bg-gray-100 dark:bg-gray-800 my-2" />
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-bold text-gray-900 dark:text-white">Total</span>
                    <span className="text-2xl font-black text-primary-600">₹{sale.totalAmount.toLocaleString('en-IN')}</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 bg-gray-50 dark:bg-gray-800/30 border-t border-gray-100 dark:border-gray-800 text-center">
          <p className="text-xs text-gray-400 font-medium">Generated by Inventory Pro • Thank you for your business!</p>
        </div>

        {/* --- POP-UP OVERLAYS --- */}
        
        {/* Status Edit Pop-up */}
        {editingItem && (
          <div className="absolute inset-0 z-[70] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 w-full max-w-sm shadow-2xl border border-gray-100 dark:border-gray-800 animate-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Edit3 className="w-5 h-5 text-primary-600" /> Update Item Status
                </h3>
                <button onClick={() => setEditingItem(null)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl text-gray-400 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { id: 'isSample', label: 'Sample', Icon: Gift, color: 'text-green-600', bg: 'bg-green-50' },
                    { id: 'isDamaged', label: 'Damaged', Icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50' },
                    { id: 'isWrongProduct', label: 'Wrong Item', Icon: Box, color: 'text-purple-600', bg: 'bg-purple-50' },
                    { id: 'isExchange', label: 'Exchange', Icon: RefreshCw, color: 'text-blue-600', bg: 'bg-blue-50' },
                  ].map(flag => (
                    <button
                      key={flag.id}
                      onClick={() => setEditingItem({
                        ...editingItem,
                        data: {
                          ...editingItem.data,
                          isDamaged: flag.id === 'isDamaged' ? !editingItem.data.isDamaged : false,
                          isSample: flag.id === 'isSample' ? !editingItem.data.isSample : false,
                          isWrongProduct: flag.id === 'isWrongProduct' ? !editingItem.data.isWrongProduct : false,
                          isExchange: flag.id === 'isExchange' ? !editingItem.data.isExchange : false,
                        }
                      })}
                      className={`flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border-2 transition-all ${editingItem.data[flag.id] ? 'border-primary-500 bg-primary-50/50 shadow-md ring-4 ring-primary-500/5' : 'border-gray-100 dark:border-gray-800 hover:border-gray-200 text-gray-400'}`}
                    >
                      <flag.Icon className={`w-6 h-6 ${editingItem.data[flag.id] ? flag.color : ''}`} />
                      <span className={`text-xs font-bold ${editingItem.data[flag.id] ? 'text-primary-700' : ''}`}>{flag.label}</span>
                    </button>
                  ))}
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Reason for status change</label>
                  <div className="relative">
                    <MessageSquare className="absolute left-3 top-3.5 w-4 h-4 text-gray-400" />
                    <textarea 
                      placeholder="Explain why this status is being set..." 
                      className="w-full text-sm pl-10 pr-4 py-3 rounded-2xl border-gray-100 dark:border-gray-700 dark:bg-gray-800 min-h-[100px] focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                      value={editingItem.data.statusReason || ''}
                      onChange={(e) => setEditingItem({...editingItem, data: { ...editingItem.data, statusReason: e.target.value }})}
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button 
                    onClick={() => handleUpdateStatus(editingItem.id)}
                    disabled={isSubmitting}
                    className="flex-[2] bg-primary-600 text-white py-3.5 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-primary-200 dark:shadow-none hover:bg-primary-700 transition-all disabled:opacity-50"
                  >
                    {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
                    Save Changes
                  </button>
                  <button 
                    onClick={() => setEditingItem(null)}
                    className="flex-1 bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 py-3.5 rounded-2xl font-bold hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Timeline Pop-up */}
        {viewingHistory && (() => {
          const item = sale.items.find(i => i._id === viewingHistory);
          return (
            <div className="absolute inset-0 z-[70] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
              <div className="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-md shadow-2xl border border-gray-100 dark:border-gray-800 flex flex-col max-h-[80vh] animate-in slide-in-from-bottom-4 duration-300">
                <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                      <History className="w-5 h-5 text-indigo-600" /> Status Timeline
                    </h3>
                    <p className="text-[10px] text-gray-400 font-medium uppercase tracking-widest mt-0.5">{item?.name}</p>
                  </div>
                  <button onClick={() => setViewingHistory(null)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl text-gray-400 transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                  {item?.statusHistory?.length > 0 ? (
                    <div className="space-y-8 relative">
                      <div className="absolute left-[7px] top-2 bottom-2 w-0.5 bg-gray-100 dark:bg-gray-800" />
                      
                      {item.statusHistory.slice().reverse().map((h, i) => (
                        <div key={i} className="relative pl-8 group">
                          <div className={`absolute left-0 top-1.5 w-4 h-4 rounded-full border-4 border-white dark:border-gray-900 shadow-sm transition-all group-hover:scale-125 ${i === 0 ? 'bg-primary-600 ring-4 ring-primary-500/10' : 'bg-gray-300 dark:bg-gray-600'}`} />
                          <div className="bg-gray-50/50 dark:bg-gray-800/40 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 transition-all group-hover:shadow-md group-hover:bg-white dark:group-hover:bg-gray-800">
                            <div className="flex items-center justify-between gap-4 mb-2">
                              <p className={`font-bold ${i === 0 ? 'text-primary-700 dark:text-primary-400' : 'text-gray-700 dark:text-gray-300'}`}>
                                {h.status}
                              </p>
                              <span className="text-[9px] font-bold text-gray-400 bg-white dark:bg-gray-900 px-2 py-1 rounded-lg border border-gray-100 dark:border-gray-800 shadow-sm">
                                {formatDate(h.updatedAt)}
                              </span>
                            </div>
                            {h.reason && (
                              <div className="relative mb-3">
                                <MessageSquare className="absolute -left-1 -top-1 w-3 h-3 text-gray-200" />
                                <p className="text-xs text-gray-500 dark:text-gray-400 italic pl-3">
                                  "{h.reason}"
                                </p>
                              </div>
                            )}
                            <div className="flex items-center gap-2 mt-auto pt-2 border-t border-gray-100/50 dark:border-gray-700/50">
                              <div className="w-6 h-6 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-[10px] font-black text-primary-600">
                                {h.updatedBy?.fullName?.charAt(0) || 'S'}
                              </div>
                              <div className="flex flex-col">
                                <p className="text-[10px] font-bold text-gray-900 dark:text-white">
                                  {h.updatedBy?.fullName || 'System'}
                                </p>
                                <p className="text-[8px] text-gray-400 font-medium">Update performed</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <History className="w-12 h-12 text-gray-100 dark:text-gray-800 mx-auto mb-4" />
                      <p className="text-gray-400 text-sm">No history records found for this item.</p>
                    </div>
                  )}
                </div>
                <div className="p-6 bg-gray-50 dark:bg-gray-800/30 border-t border-gray-100 dark:border-gray-800">
                  <button onClick={() => setViewingHistory(null)} className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 py-3 rounded-2xl font-bold text-gray-600 dark:text-gray-400 hover:bg-gray-50 transition-all">
                    Close History
                  </button>
                </div>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
