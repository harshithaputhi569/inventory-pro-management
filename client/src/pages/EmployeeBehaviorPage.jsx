import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User, Brain, Timer, UserMinus, TrendingUp,
  AlertTriangle, Clock, ShieldAlert,
  Search, Download, Calendar, Store,
  RefreshCw, Package, ChevronRight, ArrowLeft,
} from 'lucide-react';
import { employeeAPI } from '../api/employee';
import toast from 'react-hot-toast';
import useAuthStore from '../store/authStore';
import useBranchStore from '../store/branchStore';
import EmployeeDetailDrawer from '../components/employees/EmployeeDetailDrawer';
import ExportModal from '../components/employees/ExportModal';
import { fuzzyMatch } from '../utils/searchUtils.js';

const STATUS_COLORS = {
  'High Performer': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  'Good': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  'Stable': 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
};

const fmt = (d) => {
  if (!d) return 'N/A';
  return new Date(d).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true,
  });
};

const isoDate = (d) => {
  if (!d) return '';
  const date = new Date(d);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function EmployeeBehaviorPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [showExport, setShowExport] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState('');
  const [showMobileStats, setShowMobileStats] = useState(false);
  const navigate = useNavigate();

  const { user, isAdmin } = useAuthStore();
  const isStaff = user?.role === 'staff';
  const { branches, fetchBranches } = useBranchStore();

  const now = new Date();
  const [dateRange, setDateRange] = useState({
    startDate: isoDate(new Date(now.getFullYear(), now.getMonth(), 1)),
    endDate: isoDate(now),
  });

  useEffect(() => {
    if (isAdmin()) fetchBranches();
  }, [isAdmin, fetchBranches]);

  const fetchBehaviorData = async () => {
    try {
      setLoading(true);
      const params = {};
      if (dateRange.startDate) params.startDate = dateRange.startDate;
      if (dateRange.endDate) params.endDate = dateRange.endDate;
      if (selectedBranch) params.branchId = selectedBranch;
      const { data } = await employeeAPI.getBehavior(params);
      setEmployees(data.data);
    } catch {
      toast.error('Failed to fetch behavior data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { 
    fetchBehaviorData(); 
    const interval = setInterval(fetchBehaviorData, 30000);
    return () => clearInterval(interval);
  }, [dateRange, selectedBranch]);

  const filtered = employees.filter((e) => {
    const tokens = searchTerm.trim().toLowerCase().split(/\s+/).filter(Boolean);
    return tokens.length === 0 || tokens.every(token => 
      fuzzyMatch(e.name, token) ||
      fuzzyMatch(e.email, token)
    );
  });

  // Colour bar — always shows a proportional split; each segment gets a
  // guaranteed minimum of 4% so colours are always visible.
  const getBarWidths = (staff) => {
    const raw = {
      sales: staff.salesCount || 0,
      damaged: (staff.damagedCount || 0) * 3,
      exchange: (staff.exchangeCount || 0) * 3,
      wrong: (staff.wrongProductCount || 0) * 3,
      sample: (staff.sampleCount || 0) * 3,
    };
    const total = Object.values(raw).reduce((a, b) => a + b, 0) || 1;
    const MIN = 4; // min % per visible segment
    const pct = (v) => Math.max((v / total) * 100, v > 0 ? MIN : 0);
    return {
      sales: pct(raw.sales),
      damaged: pct(raw.damaged),
      exchange: pct(raw.exchange),
      wrong: pct(raw.wrong),
      sample: pct(raw.sample),
    };
  };

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      {/* Mobile back button — returns to Staff Management */}
      <div className="md:hidden flex items-center gap-3">
        {!isStaff && (
          <button
            onClick={() => navigate('/users')}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-violet-50 dark:hover:bg-violet-900/20 hover:text-violet-600 dark:hover:text-violet-400 transition-all text-sm font-semibold"
          >
            <ArrowLeft size={16} />
            Staff
          </button>
        )}
        <h1 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Brain className="w-5 h-5 text-primary-600" />
          Employee Behavior
        </h1>
      </div>

      {/* Header (desktop) */}
      <div className="hidden md:flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Brain className="w-7 h-7 text-primary-600" />
            Employee Behavior
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Staff activity, attendance, and product delivery integrity
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Mobile Toggle Button */}
          <button 
            onClick={() => setShowMobileStats(!showMobileStats)}
            className="md:hidden flex items-center justify-center gap-2 px-4 py-2 bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 rounded-xl text-sm font-bold border border-primary-100 dark:border-primary-800 transition shadow-sm w-full"
          >
            {showMobileStats ? 'Hide Filters & Stats' : 'Show Filters & Stats'}
            {showMobileStats ? <ChevronRight className="w-4 h-4 rotate-90" /> : <ChevronRight className="w-4 h-4 -rotate-90" />}
          </button>
          <div className={`${showMobileStats ? 'flex' : 'hidden'} md:flex flex-wrap items-center gap-2 w-full md:w-auto`}>
            {/* Branch selector */}
            {isAdmin() && (
              <div className="flex items-center gap-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl px-3 py-1.5 w-full sm:w-auto sm:min-w-[180px]">
                <Store className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <select
                  value={selectedBranch}
                  onChange={(e) => setSelectedBranch(e.target.value)}
                  className="bg-transparent border-none text-sm focus:ring-0 p-0 dark:text-white w-full outline-none"
                >
                  <option value="">All Branches</option>
                  {branches.map((b) => (
                    <option key={b._id} value={b._id}>{b.name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Quick Presets */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setDateRange({
                  startDate: isoDate(new Date(now.getFullYear(), now.getMonth(), 1)),
                  endDate: isoDate(now)
                })}
                className={`text-xs px-2.5 py-1.5 rounded-xl font-medium transition ${
                  dateRange.startDate ? 'bg-primary-50 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400 border border-primary-200 dark:border-primary-800 font-bold' : 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50'
                }`}
              >
                This Month
              </button>
              <button
                type="button"
                onClick={() => setDateRange({ startDate: '', endDate: '' })}
                className={`text-xs px-2.5 py-1.5 rounded-xl font-medium transition ${
                  !dateRange.startDate && !dateRange.endDate ? 'bg-primary-50 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400 border border-primary-200 dark:border-primary-800 font-bold' : 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50'
                }`}
              >
                All Time
              </button>
            </div>

            {/* Date range */}
            <div className="flex items-center gap-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl px-3 py-1.5 flex-1 sm:flex-none">
              <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <input type="date"
                className="bg-transparent border-none text-xs focus:ring-0 p-0 dark:text-white outline-none flex-1 sm:w-auto"
                value={dateRange.startDate}
                onChange={(e) => setDateRange((p) => ({ ...p, startDate: e.target.value }))} />
              <span className="text-gray-400 text-xs">→</span>
              <input type="date"
                className="bg-transparent border-none text-xs focus:ring-0 p-0 dark:text-white outline-none flex-1 sm:w-auto"
                value={dateRange.endDate}
                onChange={(e) => setDateRange((p) => ({ ...p, endDate: e.target.value }))} />
            </div>

            <button
              type="button"
              onClick={fetchBehaviorData}
              disabled={loading}
              className="p-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl text-gray-600 dark:text-gray-400 hover:text-primary-600 hover:border-primary-300 transition"
              title="Refresh behavior metrics"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-primary-600' : ''}`} />
            </button>

            {!isStaff && (
              <button
                onClick={() => setShowExport(true)}
                className="flex items-center justify-center gap-2 w-full sm:w-auto px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold transition shadow-sm"
              >
                <Download className="w-4 h-4" />
                Export
              </button>
            )}
          </div>
        </div>
      </div>

      <div className={`${showMobileStats ? 'block' : 'hidden'} md:block space-y-6`}>
        {/* Search bar */}
        {!isStaff && (
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name or email..."
              className="input pl-10 h-11 text-sm w-full"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        )}

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-4 px-1">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Legend:</span>
          {[
            { color: 'bg-primary-500', label: 'Sales' },
            { color: 'bg-red-500', label: 'Damaged' },
            { color: 'bg-amber-500', label: 'Exchange' },
            { color: 'bg-purple-500', label: 'Wrong Product' },
            { color: 'bg-teal-500', label: 'Sample' },
          ].map(({ color, label }) => (
            <div key={label} className="flex items-center gap-1.5">
              <span className={`w-2.5 h-2.5 rounded-sm ${color} flex-shrink-0`} />
              <span className="text-xs text-gray-500 dark:text-gray-400">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* List header */}
      <div className="flex items-center justify-between px-1">
        <h2 className="font-bold text-gray-900 dark:text-white">Staff Behavioral Metrics</h2>
        <span className="text-xs text-gray-500">{filtered.length} employee{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 gap-4">
        {loading && employees.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="card p-10 text-center text-gray-500">
            No employees found matching your criteria.
          </div>
        ) : (
          filtered.map((staff) => {
            const bar = getBarWidths(staff);
            return (
              <div
                key={staff.id}
                onClick={() => setSelectedEmployee(staff)}
                className="card overflow-hidden border border-transparent hover:border-primary-300 dark:hover:border-primary-700 hover:shadow-md transition-all cursor-pointer group"
              >
                <div className="p-5">
                    <div className="flex flex-col xl:flex-row gap-4 sm:gap-5">
                      {/* Employee info */}
                      <div className="flex items-center gap-3 sm:gap-4 xl:min-w-[220px]">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary-500 to-indigo-600 flex items-center justify-center flex-shrink-0 text-white shadow-lg shadow-primary-200 dark:shadow-none">
                        <User className="w-6 h-6" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-bold text-gray-900 dark:text-white truncate">{staff.name}</h3>
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="text-xs text-gray-500 truncate">{staff.email}</p>
                          <span className={`w-2 h-2 rounded-full ${staff.isOnline ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`} title={staff.isOnline ? 'Online' : 'Offline'} />
                        </div>
                        {staff.phone && <p className="text-[10px] text-gray-400 truncate">{staff.phone}</p>}
                        <div className="flex flex-wrap gap-1 mt-1">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_COLORS[staff.status] || STATUS_COLORS['Stable']}`}>
                            {staff.status}
                          </span>
                          {staff.branchName && (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400">
                              {staff.branchName}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                      {/* Attendance section — 3 cols on all, compact on mobile */}
                      <div className="flex-1 grid grid-cols-3 gap-2 sm:gap-3 xl:border-l border-gray-100 dark:border-gray-800 xl:pl-5">
                      <div>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider flex items-center gap-1 mb-0.5">
                          <Clock className="w-3 h-3 text-primary-500" /> Login
                        </p>
                        <p className="text-xs font-semibold text-gray-800 dark:text-gray-200">{fmt(staff.lastLogin)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider flex items-center gap-1 mb-0.5">
                          <UserMinus className="w-3 h-3 text-red-400" /> Logout
                        </p>
                        <p className="text-xs font-semibold text-gray-800 dark:text-gray-200">{fmt(staff.lastLogout)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider flex items-center gap-1 mb-0.5">
                          <Timer className="w-3 h-3 text-indigo-500" /> Hours
                        </p>
                        <p className="text-xs font-bold text-primary-600 dark:text-primary-400">
                          {staff.totalHours ? `${staff.totalHours.toFixed(1)} hrs` : '0.0 hrs'}
                        </p>
                      </div>
                    </div>

                      {/* Sales/incidents — 5 cols, wraps to 3+2 on mobile if needed */}
                      <div className="flex-1 grid grid-cols-5 gap-1 sm:gap-2 xl:border-l border-gray-100 dark:border-gray-800 xl:pl-5">
                      {[
                        { label: 'Sales', value: staff.salesCount, icon: TrendingUp, cls: 'text-gray-900 dark:text-white' },
                        { label: 'Damaged', value: staff.damagedCount, icon: AlertTriangle, cls: 'text-red-600 dark:text-red-400' },
                        { label: 'Exchanges', value: staff.exchangeCount, icon: RefreshCw, cls: 'text-amber-600 dark:text-amber-400' },
                        { label: 'Wrong', value: staff.wrongProductCount, icon: ShieldAlert, cls: 'text-purple-600 dark:text-purple-400' },
                        { label: 'Samples', value: staff.sampleCount, icon: Package, cls: 'text-teal-600 dark:text-teal-400' },
                      ].map(({ label, value, icon: Icon, cls }) => (
                        <div key={label} className="text-center">
                          <Icon className={`w-4 h-4 mx-auto mb-0.5 ${cls}`} />
                          <p className={`text-sm font-bold ${cls}`}>{value || 0}</p>
                          <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">{label}</p>
                        </div>
                      ))}
                    </div>

                    {/* Arrow cue */}
                    <div className="hidden xl:flex items-center text-gray-300 dark:text-gray-700 group-hover:text-primary-500 transition">
                      <ChevronRight className="w-5 h-5" />
                    </div>
                  </div>
                </div>

                {/* Colour progress bar — rounded bottom corners to match card */}
                <div className="h-2 w-full flex overflow-hidden">
                  <div className="bg-primary-500 h-full transition-all duration-500" style={{ width: `${bar.sales}%` }} />
                  <div className="bg-red-500 h-full transition-all duration-500" style={{ width: `${bar.damaged}%` }} />
                  <div className="bg-amber-400 h-full transition-all duration-500" style={{ width: `${bar.exchange}%` }} />
                  <div className="bg-purple-500 h-full transition-all duration-500" style={{ width: `${bar.wrong}%` }} />
                  <div className="bg-teal-500 h-full transition-all duration-500" style={{ width: `${bar.sample}%` }} />
                  {/* Grey fill for remaining space */}
                  <div className="bg-gray-100 dark:bg-gray-800 h-full flex-1" />
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Employee detail drawer */}
      {selectedEmployee && (
        <EmployeeDetailDrawer
          employee={selectedEmployee}
          onClose={() => setSelectedEmployee(null)}
        />
      )}

      {/* Export modal */}
      {showExport && (
        <ExportModal
          branches={branches}
          onClose={() => setShowExport(false)}
        />
      )}
    </div>
  );
}
