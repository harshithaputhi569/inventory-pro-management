import { TrendingUp, ShoppingBag, AlertTriangle, RefreshCcw, Package, HelpCircle, ChevronDown, ChevronLeft, ChevronRight, Hash, ChevronUp } from 'lucide-react';
import useAuthStore from '../../store/authStore.js';
import useSettingsStore from '../../store/settingsStore.js';

export default function AnalysisTable({ 
  data, 
  type = 'product', 
  selectedItems = [], 
  onToggleItem, 
  onToggleAll,
  groupBy = 'day',
  onGroupByChange,
  dateRange,
  pagination = { page: 1, totalPages: 1 },
  onPageChange,
  isUpdating = false,
  sortBy = { field: 'salesCount', direction: -1 },
  onSortChange
}) {
  const { user } = useAuthStore();
  const { settings } = useSettingsStore();

  const isStaff = user?.role === 'staff';
  const hidePrice = isStaff && settings?.privacy?.hideStaffPriceDetails;

  if (!data || (data.length === 0 && !isUpdating)) {
    return (
      <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-10 text-center">
        <p className="text-gray-500">No data found for the selected period.</p>
      </div>
    );
  }

  const isAllSelected = data.length > 0 && data.every(row => selectedItems.includes(row._id));
  const showCheckboxes = type === 'product';

  const getAllowedIntervals = () => {
    if (!dateRange?.startDate || !dateRange?.endDate) return [{ value: 'day', label: 'Daily' }];
    const start = new Date(dateRange.startDate);
    const end = new Date(dateRange.endDate);
    const diffDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
    const intervals = [{ value: 'day', label: 'Daily' }];
    if (diffDays >= 7) intervals.push({ value: 'week', label: 'Weekly' });
    if (diffDays >= 28) intervals.push({ value: 'month', label: 'Monthly' });
    return intervals;
  };

  const allowedIntervals = getAllowedIntervals();

  const handleSort = (field) => {
    if (sortBy.field === field) {
      onSortChange({ field, direction: sortBy.direction === -1 ? 1 : -1 });
    } else {
      onSortChange({ field, direction: -1 });
    }
  };

  const SortIcon = ({ field }) => {
    if (sortBy.field !== field) return null;
    return sortBy.direction === -1 ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />;
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className={`bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl overflow-hidden shadow-sm transition-opacity duration-200 ${isUpdating ? 'opacity-60 pointer-events-none' : 'opacity-100'}`}>
        <div className="overflow-x-auto">
          <table className="w-full text-center border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800/50">
                {showCheckboxes && (
                  <th className="px-6 py-4 w-12 text-center">
                    <input 
                      type="checkbox" 
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 w-4 h-4 cursor-pointer"
                      checked={isAllSelected}
                      onChange={onToggleAll}
                    />
                  </th>
                )}
                {type === 'product' && (
                  <th 
                    onClick={() => handleSort('sku')}
                    className="px-4 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider min-w-[120px] md:w-32 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors text-center"
                  >
                    <div className="flex items-center justify-center gap-1">SKU <SortIcon field="sku" /></div>
                  </th>
                )}
                <th 
                  onClick={() => handleSort(type === 'product' ? 'name' : '_id')}
                  className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider min-w-[180px] md:min-w-0 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors text-center"
                >
                  <div className="flex items-center justify-center gap-2">
                    {type === 'product' ? 'Product Name' : 'Date / Period'} <SortIcon field={type === 'product' ? 'name' : '_id'} />
                    {type === 'time' && allowedIntervals.length > 1 && (
                      <div className="relative group">
                        <select 
                          value={groupBy}
                          onChange={(e) => onGroupByChange(e.target.value)}
                          className="appearance-none bg-gray-100 dark:bg-gray-700 border-none rounded-lg py-0.5 pl-2 pr-6 text-[10px] font-bold cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600 transition focus:ring-0 outline-none dark:text-white"
                        >
                          {allowedIntervals.map(i => (
                            <option key={i.value} value={i.value} className="dark:bg-gray-800">{i.label}</option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
                      </div>
                    )}
                  </div>
                </th>
                <th onClick={() => handleSort('unitSalesCount')} className="px-4 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-center cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors">
                  <div className="flex items-center justify-center gap-1">Units Sold <SortIcon field="unitSalesCount" /></div>
                </th>
                <th onClick={() => handleSort('pieceSalesCount')} className="px-4 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-center cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors">
                  <div className="flex items-center justify-center gap-1">Pieces Sold <SortIcon field="pieceSalesCount" /></div>
                </th>
                {!hidePrice && (
                  <th onClick={() => handleSort('totalSales')} className="px-4 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-center cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors">
                    <div className="flex items-center justify-center gap-1">Revenue <SortIcon field="totalSales" /></div>
                  </th>
                )}
                <th onClick={() => handleSort('sampleCount')} className="px-4 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-center cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors">
                  <div className="flex items-center justify-center gap-1">Samples <SortIcon field="sampleCount" /></div>
                </th>
                <th onClick={() => handleSort('damagedCount')} className="px-4 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-center cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors">
                  <div className="flex items-center justify-center gap-1">Damages <SortIcon field="damagedCount" /></div>
                </th>
                <th onClick={() => handleSort('exchangeCount')} className="px-4 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-center cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors">
                  <div className="flex items-center justify-center gap-1">Exchanges <SortIcon field="exchangeCount" /></div>
                </th>
                <th onClick={() => handleSort('wrongProductCount')} className="px-4 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-center cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors">
                  <div className="flex items-center justify-center gap-1">Wrong Delivery <SortIcon field="wrongProductCount" /></div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {data.map((row, idx) => {
                const itemKey = row._id;
                return (
                  <tr 
                    key={idx} 
                    className={`transition-colors ${
                      showCheckboxes ? 'hover:bg-gray-50/50 dark:hover:bg-gray-800/30 cursor-pointer' : 'hover:bg-gray-50/30'
                    } ${
                      showCheckboxes && selectedItems.includes(itemKey) ? 'bg-primary-50/30 dark:bg-primary-900/10' : ''
                    }`}
                    onClick={() => showCheckboxes && onToggleItem(itemKey)}
                  >
                    {showCheckboxes && (
                      <td className="px-6 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <input 
                          type="checkbox" 
                          className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 w-4 h-4 cursor-pointer"
                          checked={selectedItems.includes(itemKey)}
                          onChange={() => onToggleItem(itemKey)}
                        />
                      </td>
                    )}
                    {type === 'product' && (
                      <td className="px-4 py-4 text-center">
                        <span className="text-[10px] md:text-xs font-mono font-bold text-primary-600 bg-primary-50 dark:bg-primary-900/20 px-2 py-1 rounded whitespace-nowrap">
                          {row.sku || 'N/A'}
                        </span>
                      </td>
                    )}
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-block text-center text-sm font-semibold ${type === 'time' ? 'text-primary-600 font-mono' : 'text-gray-900 dark:text-white'}`}>
                        {row.name || row._id}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className="inline-block text-center text-sm font-bold text-gray-900 dark:text-white">{row.unitSalesCount || 0}</span>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className="inline-block text-center text-sm font-bold text-gray-900 dark:text-white">{row.pieceSalesCount || 0}</span>
                    </td>
                    {!hidePrice && (
                      <td className="px-4 py-4 text-center">
                        <span className="inline-block text-center text-sm font-bold text-emerald-600 dark:text-emerald-400">₹{(row.totalSales || 0).toLocaleString('en-IN')}</span>
                      </td>
                    )}
                    <td className="px-4 py-4 text-center">
                      <span className="inline-block text-center text-sm text-gray-600 dark:text-gray-400">{row.sampleCount ?? 0}</span>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className="inline-block text-center text-sm font-semibold text-red-600">{row.damagedCount ?? 0}</span>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className="inline-block text-center text-sm font-semibold text-amber-600">{row.exchangeCount ?? 0}</span>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className="inline-block text-center text-sm font-semibold text-purple-600">{row.wrongProductCount ?? 0}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between px-2 py-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest">
            Page {pagination.page} of {pagination.totalPages} {pagination.totalRecords !== undefined && `— ${pagination.totalRecords} records`}
          </p>
          <div className="flex items-center gap-1">
            <button 
              onClick={() => onPageChange(pagination.page - 1)}
              disabled={pagination.page === 1 || isUpdating}
              className="p-2 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-50 disabled:opacity-50 transition shadow-sm"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button 
              onClick={() => onPageChange(pagination.page + 1)}
              disabled={pagination.page === pagination.totalPages || isUpdating}
              className="p-2 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-50 disabled:opacity-50 transition shadow-sm"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
