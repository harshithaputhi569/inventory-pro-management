import { useState, useCallback, useEffect } from 'react';
import { X, User, Clock, Timer, UserMinus, TrendingUp, AlertTriangle, 
  RefreshCw, Package, ShieldAlert, Download, ChevronLeft, ChevronRight,
  BarChart2, Calendar, Activity, ChevronDown } from 'lucide-react';
import { employeeAPI } from '../../api/employee';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import useSettingsStore from '../../store/settingsStore';
import useAuthStore from '../../store/authStore';

const DATE_PRESETS = [
  { label: 'All Time', key: 'all' },
  { label: 'This Month', key: 'month' },
  { label: 'Today', key: 'today' },
  { label: 'Yesterday', key: 'yesterday' },
  { label: 'This Week', key: 'week' },
  { label: 'This Year', key: 'year' },
  { label: 'Custom', key: 'custom' },
];

const toLocalDateStr = (d) => {
  if (!d) return '';
  const date = new Date(d);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

function getPresetDates(key) {
  const now = new Date();
  if (key === 'all') return { startDate: '', endDate: '' };
  if (key === 'today') return { startDate: toLocalDateStr(now), endDate: toLocalDateStr(now) };
  if (key === 'yesterday') {
    const y = new Date(now); y.setDate(y.getDate() - 1);
    return { startDate: toLocalDateStr(y), endDate: toLocalDateStr(y) };
  }
  if (key === 'week') {
    const s = new Date(now); s.setDate(s.getDate() - s.getDay());
    return { startDate: toLocalDateStr(s), endDate: toLocalDateStr(now) };
  }
  if (key === 'month') {
    return { startDate: toLocalDateStr(new Date(now.getFullYear(), now.getMonth(), 1)), endDate: toLocalDateStr(now) };
  }
  if (key === 'year') {
    return { startDate: `${now.getFullYear()}-01-01`, endDate: toLocalDateStr(now) };
  }
  return null;
}

const STATUS_COLORS = {
  'High Performer': 'bg-emerald-500 text-white',
  'Good': 'bg-blue-500 text-white',
  'Stable': 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
};

const fmt = (d, type = 'full') => {
  if (!d) return 'N/A';
  const date = new Date(d);
  if (type === 'date') return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  return date.toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true });
};

const KpiTile = ({ label, value, color, icon: Icon }) => (
  <div className={`rounded-xl p-3 border ${color}`}>
    <div className="flex items-center gap-2 mb-1">
      <Icon className="w-3.5 h-3.5 opacity-70" />
      <p className="text-[10px] font-bold uppercase tracking-wider opacity-70">{label}</p>
    </div>
    <p className="text-xl font-extrabold">{value ?? 0}</p>
  </div>
);

const TABS = ['Sales History', 'Incidents', 'Attendance'];

export default function EmployeeDetailDrawer({ employee, onClose }) {
  const { settings, fetchSettings } = useSettingsStore();
  const { user } = useAuthStore();
  const isStaff = user?.role === 'staff';
  const hidePrice = (isStaff && settings?.privacy?.hideStaffPriceDetails !== false) || settings?.privacy?.hideAllFinancialDetails;
  const hidePayment = (isStaff && settings?.privacy?.hideStaffPaymentMethod !== false) || settings?.privacy?.hideAllFinancialDetails;

  const [activePreset, setActivePreset] = useState('month');
  const [customDates, setCustomDates] = useState({ startDate: '', endDate: '' });
  const [activeTab, setActiveTab] = useState('Sales History');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [salesPage, setSalesPage] = useState(1);
  const [attPage, setAttPage] = useState(1);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [isKpiExpanded, setIsKpiExpanded] = useState(false);

  const getDateRange = useCallback(() => {
    if (activePreset === 'custom') return customDates;
    return getPresetDates(activePreset) || {};
  }, [activePreset, customDates]);

  const loadDetail = useCallback(async (pg = 1) => {
    if (!employee) return;
    setLoading(true);
    try {
      const range = getDateRange();
      const { data: res } = await employeeAPI.getDetail(employee.id, {
        ...range,
        page: pg,
        limit: 15,
      });
      setData(res.data);
    } catch {
      toast.error('Failed to load employee details');
    } finally {
      setLoading(false);
    }
  }, [employee, getDateRange]);

  // Auto-load whenever employee or activePreset changes (skip for custom — user must press Apply)
  useEffect(() => {
    if (!employee) return;
    if (activePreset === 'custom') return;
    loadDetail(1);
    if (!settings) fetchSettings();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employee, activePreset, settings]);

  const applyPreset = (key) => {
    setActivePreset(key);
    setSalesPage(1); setAttPage(1);
    // Non-custom: useEffect above will fire automatically on activePreset change
    // Custom: user must press Apply
  };

  const applyCustom = () => { setSalesPage(1); setAttPage(1); loadDetail(1); };

  const handleSalesPage = (pg) => { setSalesPage(pg); loadDetail(pg); };
  const handleAttPage = (pg) => { setAttPage(pg); loadDetail(pg); };

  const downloadPDF = async () => {
    if (!data) return;
    setPdfLoading(true);
    try {
      const doc = new jsPDF();
      const range = getDateRange();
      const emp = data.employee;
      const branch = emp.branchId?.name || emp.branchId || '—';
      const phone  = emp.phone || '—';
      const periodLabel = DATE_PRESETS.find(p => p.key === activePreset)?.label || 'Custom';

      // ── Cover header ─────────────────────────────────────────────────────────
      doc.setFillColor(99, 102, 241);
      doc.rect(0, 0, 210, 40, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(15); doc.setFont('helvetica', 'bold');
      doc.text('Employee Performance Report', 14, 13);
      doc.setFontSize(9); doc.setFont('helvetica', 'normal');
      doc.text(`Name   : ${emp.fullName}`, 14, 22);
      doc.text(`Email  : ${emp.email}`, 14, 27);
      doc.text(`Phone  : ${phone}`, 14, 32);
      doc.text(`Branch : ${branch}`, 110, 22);
      doc.text(`Period : ${periodLabel} (${range.startDate || 'All'} to ${range.endDate || 'All'})`, 110, 27);
      doc.text(`Generated: ${new Date().toLocaleDateString('en-IN')}`, 110, 32);

      // ── KPI summary table ─────────────────────────────────────────────────
      doc.setTextColor(30, 30, 30);
      doc.setFontSize(11); doc.setFont('helvetica', 'bold');
      doc.text('Performance Summary', 14, 48);
      const kpi = data.kpi;
      const kpiRowBody = [
        ['Items Sold', String(kpi.totalItems)],
        ['Damaged Items', String(kpi.damagedCount)],
        ['Exchanged Items', String(kpi.exchangeCount)],
        ['Wrong Products', String(kpi.wrongProductCount)],
        ['Sample Items', String(kpi.sampleCount)],
        ['Total Hours Worked', `${(kpi.totalHours || 0).toFixed(1)} hrs`],
        ['Login Sessions', String(kpi.sessions)],
      ];
      if (!hidePrice) {
        kpiRowBody.splice(1, 0, ['Total Revenue', `Rs. ${(kpi.totalRevenue || 0).toLocaleString('en-IN')}`]);
      }

      autoTable(doc, {
        startY: 52,
        head: [['Metric', 'Value']],
        body: kpiRowBody,
        headStyles: { fillColor: [99, 102, 241], halign: 'left' },
        columnStyles: {
          0: { cellWidth: 80, fontStyle: 'bold' },
          1: { cellWidth: 60, halign: 'right' },
        },
        alternateRowStyles: { fillColor: [245, 245, 255] },
        margin: { left: 14, right: 14 },
      });

      // ── Sales History ─────────────────────────────────────────────────────
      if (data.salesList?.length) {
        const afterKpi = doc.lastAutoTable.finalY;
        doc.setFontSize(10); doc.setFont('helvetica', 'bold');
        doc.setTextColor(30, 30, 30);
        doc.text('Sales History', 14, afterKpi + 12);
        const salesHead = ['Date', 'Invoice #', 'Items'];
        if (!hidePrice) salesHead.push('Amount (Rs.)');

        autoTable(doc, {
          startY: afterKpi + 16,
          head: [salesHead],
          body: data.salesList.map((s) => {
            const row = [
              fmt(s.createdAt, 'date'),
              s.invoiceNumber,
              String(s.items.reduce((acc, i) => acc + i.quantity, 0)),
            ];
            if (!hidePrice) row.push((s.totalAmount || 0).toLocaleString('en-IN'));
            return row;
          }),
          headStyles: { fillColor: [99, 102, 241] },
          columnStyles: {
            0: { cellWidth: 32 },
            1: { cellWidth: 58 },
            2: { cellWidth: 24, halign: 'right' },
            3: { cellWidth: 42, halign: 'right' },
          },
          margin: { left: 14, right: 14 },
        });
      }

      // ── Attendance Log ────────────────────────────────────────────────────
      if (data.attendanceList?.length) {
        const afterPrev = doc.lastAutoTable.finalY;
        doc.setFontSize(10); doc.setFont('helvetica', 'bold');
        doc.setTextColor(30, 30, 30);
        doc.text('Attendance Log', 14, afterPrev + 12);
        autoTable(doc, {
          startY: afterPrev + 16,
          head: [['Date', 'Login', 'Logout', 'Hrs', 'Status']],
          body: data.attendanceList.map((a) => [
            fmt(a.loginTime, 'date'),
            fmt(a.loginTime),
            a.logoutTime ? fmt(a.logoutTime) : 'Active',
            `${(a.totalHours || 0).toFixed(1)}`,
            a.status,
          ]),
          headStyles: { fillColor: [99, 102, 241] },
          columnStyles: {
            0: { cellWidth: 28 },
            1: { cellWidth: 44 },
            2: { cellWidth: 44 },
            3: { cellWidth: 18, halign: 'right' },
            4: { cellWidth: 28, halign: 'center' },
          },
          margin: { left: 14, right: 14 },
        });
      }

      // ── Incidents Log ─────────────────────────────────────────────────────
      if (data.incidents?.length) {
        const afterPrev = doc.lastAutoTable.finalY;
        doc.setFontSize(10); doc.setFont('helvetica', 'bold');
        doc.setTextColor(30, 30, 30);
        doc.text('Incidents Log', 14, afterPrev + 12);
        autoTable(doc, {
          startY: afterPrev + 16,
          head: [['Date', 'Invoice #', 'Product', 'Qty', 'Type']],
          body: data.incidents.map((inc) => {
            const type = inc.items.isDamaged     ? 'Damaged'
              : inc.items.isExchange             ? 'Exchange'
              : inc.items.isWrongProduct         ? 'Wrong Product'
              : 'Sample';
            return [
              fmt(inc.createdAt, 'date'),
              inc.invoiceNumber,
              inc.items.name || '—',
              String(inc.items.quantity),
              type,
            ];
          }),
          headStyles: { fillColor: [99, 102, 241] },
          columnStyles: {
            0: { cellWidth: 28 },
            1: { cellWidth: 46 },
            2: { cellWidth: 54 },
            3: { cellWidth: 14, halign: 'right' },
            4: { cellWidth: 34, halign: 'center' },
          },
          margin: { left: 14, right: 14 },
        });
      }

      // ── Footer on every page ──────────────────────────────────────────────
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(7); doc.setFont('helvetica', 'normal');
        doc.setTextColor(170, 170, 170);
        doc.text(
          `${emp.fullName}  |  ${periodLabel}  (${range.startDate || 'All'} to ${range.endDate || 'All'})  |  Page ${i} of ${pageCount}`,
          14, 292
        );
      }

      doc.save(`${emp.fullName.replace(/\s+/g, '_')}_${activePreset}_report.pdf`);
      toast.success('PDF downloaded!');
    } catch (e) {
      console.error(e);
      toast.error('Failed to generate PDF');
    } finally {
      setPdfLoading(false);
    }
  };

  if (!employee) return null;

  const kpi = data?.kpi;
  const sp = data?.salesPagination;
  const ap = data?.attendancePagination;

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="flex-1 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Drawer panel */}
      <div className="w-full max-w-3xl bg-white dark:bg-gray-900 shadow-2xl flex flex-col overflow-hidden animate-slide-in-right">
        {/* Drawer Header */}
        <div className="bg-gradient-to-r from-primary-600 to-indigo-600 px-4 sm:px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
              <User className="w-6 h-6 text-white" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-white text-lg leading-tight truncate">{employee.name}</h2>
                {(employee.status || data?.kpi?.status) && (
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm ${
                    STATUS_COLORS[employee.status || data?.kpi?.status] || 'bg-white/20 text-white'
                  }`}>
                    {employee.status || data?.kpi?.status}
                  </span>
                )}
              </div>
              <p className="text-primary-100 text-xs truncate">{employee.email}</p>
              <div className="flex items-center gap-3 mt-0.5 truncate">
                {employee.phone && <p className="text-primary-200 text-[10px] truncate">{employee.phone}</p>}
                {employee.branchName && <p className="text-primary-200 text-[10px] font-semibold truncate">{employee.branchName}</p>}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={loadDetail}
              className="p-2 rounded-lg bg-white/10 text-white hover:bg-white/20 transition"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={downloadPDF}
              disabled={!data || pdfLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 text-white hover:bg-white/20 transition text-sm font-medium disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{pdfLoading ? 'Generating...' : 'PDF'}</span>
            </button>
            <button onClick={onClose} className="p-2 rounded-lg bg-white/10 text-white hover:bg-white/20 transition">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Date filter */}
        <div className="px-6 py-3 border-b border-gray-100 dark:border-gray-800 flex-shrink-0 bg-gray-50 dark:bg-gray-900/50">
          <div className="flex flex-wrap gap-1.5 items-center">
            <Calendar className="w-3.5 h-3.5 text-gray-400 mr-1" />
            {DATE_PRESETS.map((p) => (
              <button
                key={p.key}
                onClick={() => applyPreset(p.key)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                  activePreset === p.key
                    ? 'bg-primary-600 text-white'
                    : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-primary-400'
                }`}
              >
                {p.label}
              </button>
            ))}
            {activePreset === 'custom' && (
              <div className="flex items-center gap-2 ml-2">
                <input type="date" className="input text-xs py-1 h-7"
                  value={customDates.startDate}
                  onChange={(e) => setCustomDates((p) => ({ ...p, startDate: e.target.value }))} />
                <span className="text-gray-400 text-xs">to</span>
                <input type="date" className="input text-xs py-1 h-7"
                  value={customDates.endDate}
                  onChange={(e) => setCustomDates((p) => ({ ...p, endDate: e.target.value }))} />
                <button onClick={applyCustom}
                  className="px-3 py-1 bg-primary-600 text-white rounded-lg text-xs font-semibold hover:bg-primary-700 transition">
                  Apply
                </button>
              </div>
            )}
          </div>
        </div>

        {/* KPI tiles */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
          </div>
        ) : kpi ? (
          <>
            {/* KPI Expand Toggle (Mobile only) */}
            <button 
              onClick={() => setIsKpiExpanded(!isKpiExpanded)}
              className="md:hidden w-full py-3 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800 flex items-center justify-center gap-2 text-[10px] font-black text-primary-600 dark:text-primary-400 uppercase tracking-[0.2em]"
            >
              {isKpiExpanded ? 'Hide Summary' : 'Show Performance Summary'}
              <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${isKpiExpanded ? 'rotate-180' : ''}`} />
            </button>

            <div className={`${isKpiExpanded ? 'grid' : 'hidden'} md:grid px-6 py-4 grid-cols-2 sm:grid-cols-4 gap-3 flex-shrink-0 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 transition-all`}>
              <KpiTile label="Items Sold" value={kpi.totalItems} icon={BarChart2}
                color="bg-primary-50 dark:bg-primary-900/20 border-primary-200 dark:border-primary-800 text-primary-700 dark:text-primary-300" />
              {!hidePrice && (
                <KpiTile label="Revenue" value={`₹${(kpi.totalRevenue||0).toLocaleString('en-IN')}`} icon={TrendingUp}
                  color="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300" />
              )}
              <KpiTile label="Hours Worked" value={`${(kpi.totalHours||0).toFixed(1)}h`} icon={Timer}
                color="bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300" />
              <KpiTile label="Sessions" value={kpi.sessions} icon={Activity}
                color="bg-sky-50 dark:bg-sky-900/20 border-sky-200 dark:border-sky-800 text-sky-700 dark:text-sky-300" />
              <KpiTile label="Damaged" value={kpi.damagedCount} icon={AlertTriangle}
                color="bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300" />
              <KpiTile label="Exchanged" value={kpi.exchangeCount} icon={RefreshCw}
                color="bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300" />
              <KpiTile label="Wrong Prod." value={kpi.wrongProductCount} icon={ShieldAlert}
                color="bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300" />
              <KpiTile label="Samples" value={kpi.sampleCount} icon={Package}
                color="bg-teal-50 dark:bg-teal-900/20 border-teal-200 dark:border-teal-800 text-teal-700 dark:text-teal-300" />
            </div>

            {/* Tabs */}
            <div className="flex gap-1 px-6 pt-3 flex-shrink-0 border-b border-gray-100 dark:border-gray-800">
              {TABS.map((tab) => (
                <button key={tab} onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 text-sm font-semibold rounded-t-lg transition border-b-2 ${
                    activeTab === tab
                      ? 'border-primary-600 text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20'
                      : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {activeTab === 'Sales History' && (
                <div>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs font-bold text-gray-400 uppercase tracking-wider">
                        <th className="pb-2">Date</th>
                        <th className="pb-2">Invoice</th>
                        <th className="pb-2">Items</th>
                        {!hidePrice && <th className="pb-2">Total</th>}
                        {!hidePayment && <th className="pb-2">Payment</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                      {(data.salesList || []).length === 0 ? (
                        <tr><td colSpan={5} className="text-center py-8 text-gray-400">No sales found</td></tr>
                      ) : (data.salesList || []).map((sale) => (
                        <tr key={sale._id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                          <td className="py-2.5 text-gray-600 dark:text-gray-400">{fmt(sale.createdAt, 'date')}</td>
                          <td className="py-2.5 font-mono text-xs text-primary-600 dark:text-primary-400">{sale.invoiceNumber}</td>
                          <td className="py-2.5 text-gray-900 dark:text-white font-medium">
                            {sale.items.reduce((a, i) => a + i.quantity, 0)} items
                          </td>
                          {!hidePrice && <td className="py-2.5 font-bold text-gray-900 dark:text-white">₹{sale.totalAmount?.toLocaleString('en-IN')}</td>}
                          {!hidePayment && (
                            <td className="py-2.5">
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 uppercase">
                                {sale.paymentMethod}
                              </span>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {sp && sp.total > sp.limit && (
                    <div className="flex items-center justify-between mt-4">
                      <span className="text-xs text-gray-400">{sp.total} total sales</span>
                      <div className="flex gap-2">
                        <button disabled={salesPage <= 1} onClick={() => handleSalesPage(salesPage - 1)}
                          className="p-1.5 rounded border border-gray-200 dark:border-gray-700 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800">
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <span className="text-sm px-3 py-1 border rounded border-gray-200 dark:border-gray-700">
                          {salesPage} / {Math.ceil(sp.total / sp.limit)}
                        </span>
                        <button disabled={salesPage >= Math.ceil(sp.total / sp.limit)} onClick={() => handleSalesPage(salesPage + 1)}
                          className="p-1.5 rounded border border-gray-200 dark:border-gray-700 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800">
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'Incidents' && (
                <div>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs font-bold text-gray-400 uppercase tracking-wider">
                        <th className="pb-2">Date</th>
                        <th className="pb-2">Product</th>
                        <th className="pb-2">Qty</th>
                        <th className="pb-2">Type</th>
                        <th className="pb-2">Invoice</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                      {(data.incidents || []).length === 0 ? (
                        <tr><td colSpan={5} className="text-center py-8 text-gray-400">No incidents found</td></tr>
                      ) : (data.incidents || []).map((inc, idx) => {
                        const type = inc.items.isDamaged ? 'Damaged'
                          : inc.items.isExchange ? 'Exchange'
                          : inc.items.isWrongProduct ? 'Wrong Product'
                          : 'Sample';
                        const colors = {
                          'Damaged': 'bg-red-100 text-red-700',
                          'Exchange': 'bg-amber-100 text-amber-700',
                          'Wrong Product': 'bg-purple-100 text-purple-700',
                          'Sample': 'bg-teal-100 text-teal-700',
                        };
                        return (
                          <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                            <td className="py-2.5 text-gray-600 dark:text-gray-400">{fmt(inc.createdAt, 'date')}</td>
                            <td className="py-2.5 text-gray-900 dark:text-white font-medium">{inc.items.name || '—'}</td>
                            <td className="py-2.5 text-gray-600 dark:text-gray-400">{inc.items.quantity}</td>
                            <td className="py-2.5">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${colors[type]}`}>{type}</span>
                            </td>
                            <td className="py-2.5 font-mono text-xs text-primary-600 dark:text-primary-400">{inc.invoiceNumber}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {activeTab === 'Attendance' && (
                <div>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs font-bold text-gray-400 uppercase tracking-wider">
                        <th className="pb-2">Date</th>
                        <th className="pb-2">Login</th>
                        <th className="pb-2">Logout</th>
                        <th className="pb-2">Hours</th>
                        <th className="pb-2">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                      {(data.attendanceList || []).length === 0 ? (
                        <tr><td colSpan={5} className="text-center py-8 text-gray-400">No attendance records</td></tr>
                      ) : (data.attendanceList || []).map((att) => (
                        <tr key={att._id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                          <td className="py-2.5 text-gray-600 dark:text-gray-400">{fmt(att.loginTime, 'date')}</td>
                          <td className="py-2.5 font-medium text-gray-900 dark:text-white">{fmt(att.loginTime)}</td>
                          <td className="py-2.5 text-gray-600 dark:text-gray-400">
                            {att.logoutTime ? fmt(att.logoutTime) : <span className="text-green-600 font-semibold">Active</span>}
                          </td>
                          <td className="py-2.5 font-bold text-primary-600 dark:text-primary-400">
                            {(att.totalHours || 0).toFixed(1)} hrs
                          </td>
                          <td className="py-2.5">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              att.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                            }`}>
                              {att.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {ap && ap.total > ap.limit && (
                    <div className="flex items-center justify-between mt-4">
                      <span className="text-xs text-gray-400">{ap.total} total sessions</span>
                      <div className="flex gap-2">
                        <button disabled={attPage <= 1} onClick={() => handleAttPage(attPage - 1)}
                          className="p-1.5 rounded border border-gray-200 dark:border-gray-700 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800">
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <span className="text-sm px-3 py-1 border rounded border-gray-200 dark:border-gray-700">
                          {attPage} / {Math.ceil(ap.total / ap.limit)}
                        </span>
                        <button disabled={attPage >= Math.ceil(ap.total / ap.limit)} onClick={() => handleAttPage(attPage + 1)}
                          className="p-1.5 rounded border border-gray-200 dark:border-gray-700 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800">
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center py-20 text-gray-400">
            Click a date range to load data.
          </div>
        )}
      </div>
    </div>
  );
}
