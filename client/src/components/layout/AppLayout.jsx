import { useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  Package, LayoutDashboard, Tags, AlertTriangle,
  LogOut, Menu, X, Sun, Moon, User, ChevronRight, Store,
  ShoppingCart, Receipt, BarChart3, Settings, ShieldCheck, Bell, Clock,
  Trash2, MessageSquare, Send, UserSearch
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useEffect } from 'react';
import useAuthStore from '../../store/authStore.js';
import useThemeStore from '../../store/themeStore.js';
import useNotificationStore from '../../store/notificationStore.js';

// mobileNav: false = hidden from mobile bottom nav (accessible via contextual buttons)
const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', shortLabel: 'Home', roles: ['admin', 'manager'], mobileNav: true },
  { to: '/staff-home', icon: LayoutDashboard, label: 'Home', shortLabel: 'Home', roles: ['staff'], mobileNav: true },
  { to: '/pos', icon: ShoppingCart, label: 'New Voucher', shortLabel: 'Voucher', mobileNav: true },
  { to: '/users', icon: ShieldCheck, label: 'Staff Management', shortLabel: 'Staff', roles: ['admin', 'manager'], mobileNav: true },
  { to: '/analytics', icon: BarChart3, label: 'Sales Analytics', shortLabel: 'Analytics', roles: ['admin', 'manager', 'staff'], mobileNav: true },
  { to: '/products', icon: Package, label: 'Inventory Management', shortLabel: 'Inventory', roles: ['admin', 'manager'], mobileNav: true },
  // Desktop-sidebar-only items (accessible via contextual nav on mobile)
  { to: '/sales', icon: Receipt, label: 'Sales History', shortLabel: 'Sales', roles: ['admin', 'manager', 'staff'], mobileNav: false },
  { to: '/employee-behavior', icon: UserSearch, label: 'Employee Behavior', shortLabel: 'Behavior', roles: ['staff'], mobileNav: true },
  { to: '/employee-behavior', icon: UserSearch, label: 'Employee Behavior', shortLabel: 'Behavior', roles: ['admin', 'manager'], mobileNav: false },
  { to: '/branches', icon: Store, label: 'Branches', shortLabel: 'Branches', roles: ['admin'], mobileNav: false },
];

const roleBadge = {
  admin: 'badge-purple',
  manager: 'badge-blue',
  staff: 'badge-green',
};

export default function AppLayout({ children }) {
  const { user, logout } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  const { notifications, unreadCount, fetchNotifications, markAsRead, deleteNotification, clearNotifications, replyNotification } = useNotificationStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [showNotifications, setShowNotifications] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyMessage, setReplyMessage] = useState('');
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const handleReplySubmit = async (e, id) => {
    e.preventDefault();
    if (!replyMessage.trim()) return;
    const success = await replyNotification(id, replyMessage);
    if (success) {
      toast.success('Reply sent successfully');
      setReplyingTo(null);
      setReplyMessage('');
    } else {
      toast.error('Failed to send reply');
    }
  };

  const handleClearAll = async () => {
    await clearNotifications();
    toast.success('Notifications cleared');
  };

  useEffect(() => {
    if (user?.role === 'admin' || user?.role === 'manager') {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 10000); // Polling every 10 seconds for live feel
      return () => clearInterval(interval);
    }
  }, [user]);

  // Determine the current page label for the mobile header
  const currentPage = navItems.find(item => location.pathname.startsWith(item.to)) || { label: 'Inventory Pro' };

  const handleLogout = () => {
    setShowLogoutConfirm(true);
  };

  const confirmLogout = () => {
    logout();
    toast.success('Logged out successfully');
    navigate('/login');
    setShowLogoutConfirm(false);
  };

  const sidebarContent = (
    <div className="flex flex-col h-full overflow-x-hidden min-w-0">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-gray-100 dark:border-gray-800">
        <div className="w-10 h-10 rounded-xl bg-primary-600/10 flex items-center justify-center flex-shrink-0 overflow-hidden border border-primary-100 dark:border-primary-900/30">
          <img src="/logo.png" alt="Logo" className="w-full h-full object-cover scale-110" />
        </div>
        <div>
          <p className="font-extrabold text-gray-900 dark:text-white text-sm leading-tight tracking-tight">Inventory Pro</p>
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Smart Management</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-x-hidden min-w-0">
        {navItems
          .filter(item => !item.roles || item.roles.includes(user?.role))
          .map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group ${isActive
                  ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon className={`w-4.5 h-4.5 flex-shrink-0 ${isActive ? 'text-primary-600 dark:text-primary-400' : 'text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300'}`} size={18} />
                  {label}
                  {isActive && <ChevronRight className="w-3 h-3 ml-auto text-primary-500" />}
                </>
              )}
            </NavLink>
          ))}
      </nav>

      {/* User section */}
      <div className="px-3 pb-4 border-t border-gray-100 dark:border-gray-800 pt-3">
        <NavLink
          to="/profile"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-gray-50 dark:bg-gray-800/50 mb-2 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors group"
        >
          <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center flex-shrink-0">
            <User className="w-4 h-4 text-primary-600 dark:text-primary-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{user?.fullName}</p>
            <span className={`badge ${roleBadge[user?.role]} text-xs`}>{user?.role}</span>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500" />
        </NavLink>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-500 dark:text-gray-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex overflow-x-hidden min-w-0">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-white dark:bg-gray-900 border-r border-gray-100 dark:border-gray-800 fixed h-full z-30">
        {sidebarContent}
      </aside>

      {/* Sidebar is desktop-only now */}

      {/* Main */}
      <div className="flex-1 md:ml-64 flex flex-col min-h-screen min-w-0 overflow-x-hidden">
        {/* Topbar — Optimized for space */}
        <header className="sticky top-0 z-30 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-100 dark:border-gray-800 px-4 md:px-6 py-2 md:py-3 flex items-center justify-between">
          {/* Left: Logo (Mobile) */}
          <div className="flex items-center gap-2 min-w-0">
            <div className="md:hidden flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-primary-600/10 flex items-center justify-center flex-shrink-0 shadow-lg shadow-primary-200/20 dark:shadow-none overflow-hidden border border-primary-100 dark:border-primary-900/30">
                <img src="/logo.png" alt="Logo" className="w-full h-full object-cover scale-110" />
              </div>
              <div>
                <p className="font-black text-gray-900 dark:text-white text-xs leading-none tracking-tight">Inventory Pro</p>
                <p className="text-[9px] text-gray-400 font-bold uppercase tracking-[0.2em] mt-1">Management</p>
              </div>
            </div>
            {/* Desktop spacer */}
            <div className="hidden md:block" />
          </div>

          {/* Right: Tools */}
          <div className="flex items-center gap-0.5 flex-shrink-0">
            {(user?.role === 'admin' || user?.role === 'manager') && (
              <>
                <button
                  onClick={() => setShowNotifications(true)}
                  className="p-2 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-all touch-target relative"
                >
                  <Bell size={18} />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-gray-900" />
                  )}
                </button>

              </>
            )}
            <NavLink
              to="/settings"
              className={({ isActive }) =>
                `p-2 rounded-xl transition-all touch-target ${isActive
                  ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 scale-105'
                  : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'
                }`
              }
            >
              <Settings size={18} />
            </NavLink>
            <NavLink
              to="/profile"
              className={({ isActive }) =>
                `p-2 rounded-xl transition-all touch-target ${isActive
                  ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 scale-105'
                  : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'
                }`
              }
            >
              <User size={18} />
            </NavLink>
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-all touch-target"
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>
        </header>

        {showNotifications && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90dvh] sm:max-h-[85vh] flex flex-col overflow-hidden animate-slide-up">
              <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 flex justify-between items-center flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-600">
                    <Bell size={20} />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white leading-tight">Notifications</h2>
                    <p className="text-xs text-gray-500 font-medium tracking-wide">
                      {unreadCount} UNREAD ALERTS
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={handleClearAll} className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-900/20 dark:hover:bg-red-900/40 dark:text-red-400 rounded-lg transition-colors text-[11px] font-bold uppercase tracking-wide flex items-center gap-1.5">
                    <Trash2 size={12} /> Clear All
                  </button>
                  <button onClick={() => setShowNotifications(false)} className="p-2 bg-gray-100 dark:bg-gray-800 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-xl transition-colors">
                    <X size={20} />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {notifications.length === 0 ? (
                  <div className="py-20 text-center text-gray-400 italic">No notifications to display.</div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n._id}
                      className={`p-4 rounded-2xl border transition-all ${!n.isRead ? 'bg-primary-50/30 dark:bg-primary-900/10 border-primary-100 dark:border-primary-900/30 shadow-sm' : 'bg-white dark:bg-gray-800/50 border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                    >
                      <div className="flex gap-4 cursor-pointer" onClick={() => { if (!n.isRead) markAsRead(n._id); }}>
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${!n.isRead ? 'bg-primary-100 dark:bg-primary-900/50 text-primary-600' : 'bg-gray-100 dark:bg-gray-800 text-gray-400'}`}>
                          {n.type === 'message' ? <MessageSquare size={18} /> : <Clock size={18} />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className={`text-sm ${!n.isRead ? 'font-bold text-gray-900 dark:text-white' : 'font-medium text-gray-600 dark:text-gray-300'}`}>
                            {n.message}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <p className="text-xs text-gray-400 font-medium">{new Date(n.createdAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</p>
                            {n.performedBy && n.type !== 'system' && (
                              <span className="text-[10px] bg-gray-100 dark:bg-gray-800 text-gray-500 px-2 py-0.5 rounded-md font-bold">
                                By {n.performedBy.fullName || 'User'}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col items-center justify-start gap-2">
                          {!n.isRead && (
                            <span className="w-2.5 h-2.5 rounded-full bg-primary-500"></span>
                          )}
                          <button onClick={(e) => { e.stopPropagation(); deleteNotification(n._id); }} className="text-gray-300 hover:text-red-500 transition-colors p-1" title="Delete">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>

                      {/* Reply Section */}
                      {n.type !== 'system' && n.performedBy && (
                        <div className="mt-3 ml-0 sm:ml-14 pl-0 sm:pl-0">
                          {replyingTo === n._id ? (
                            <form onSubmit={(e) => handleReplySubmit(e, n._id)} className="flex items-center gap-2 mt-2">
                              <input
                                type="text"
                                autoFocus
                                value={replyMessage}
                                onChange={(e) => setReplyMessage(e.target.value)}
                                placeholder="Type your reply..."
                                className="flex-1 text-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none"
                              />
                              <button type="submit" className="p-2 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors flex-shrink-0" title="Send Reply">
                                <Send size={16} />
                              </button>
                              <button type="button" onClick={() => setReplyingTo(null)} className="p-2 bg-gray-100 dark:bg-gray-800 text-gray-500 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors flex-shrink-0">
                                <X size={16} />
                              </button>
                            </form>
                          ) : (
                            <button
                              onClick={() => { setReplyingTo(n._id); setReplyMessage(''); }}
                              className="text-xs font-bold text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 flex items-center gap-1.5 transition-colors"
                            >
                              <MessageSquare size={12} /> Reply to {n.performedBy.fullName || 'User'}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Page content */}
        <main className="flex-1 p-4 pb-24 md:p-6 md:pb-6 animate-fade-in">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 safe-area-pb shadow-[0_-4px_20px_rgba(0,0,0,0.08)] min-h-[4.5rem] flex items-center">
        <div className="flex items-stretch justify-around px-1 pt-1 pb-1 w-full">
          {navItems
            .filter(item => (!item.roles || item.roles.includes(user?.role)) && item.mobileNav !== false)
            .map(({ to, icon: Icon, label, shortLabel }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `flex flex-col items-center justify-center gap-0.5 px-1 py-2 min-w-0 flex-1 rounded-xl text-[9px] font-semibold transition-all duration-150 relative ${isActive
                    ? 'text-primary-600 dark:text-primary-400'
                    : 'text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    {/* Active indicator dot */}
                    {isActive && (
                      <span className="absolute top-0.5 left-1/2 -translate-x-1/2 w-4 h-0.5 rounded-full bg-primary-500" />
                    )}
                    <span className={`w-9 h-9 flex items-center justify-center rounded-xl transition-all duration-150 ${isActive ? 'bg-primary-50 dark:bg-primary-900/30' : ''}`}>
                      <Icon size={20} className={isActive ? 'text-primary-600 dark:text-primary-400' : ''} />
                    </span>
                    <span className="truncate w-full text-center leading-tight">{shortLabel || label}</span>
                  </>
                )}
              </NavLink>
            ))}
        </div>
      </nav>

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] shadow-2xl w-full max-w-sm overflow-hidden animate-slide-up p-8 text-center border border-gray-100 dark:border-gray-800">
            <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-red-200 dark:shadow-none">
              <LogOut size={36} />
            </div>
            <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-2 tracking-tight">Confirm Logout</h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm font-medium mb-8 leading-relaxed">
              Are you sure you want to sign out? You will need to log in again to access the system.
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={confirmLogout}
                className="w-full py-4 bg-red-600 text-white rounded-2xl font-bold text-sm shadow-lg shadow-red-200 dark:shadow-none hover:bg-red-700 transition-all transform active:scale-95"
              >
                Yes, Sign Me Out
              </button>
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="w-full py-4 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-2xl font-bold text-sm hover:bg-gray-200 dark:hover:bg-gray-700 transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
