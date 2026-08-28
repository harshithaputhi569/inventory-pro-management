import { useEffect, useState } from 'react';
import { 
  Building2, Receipt, Package, Bell, Shield, 
  Save, Loader2, Globe, MapPin, Phone, Mail, 
  CreditCard, Banknote, Smartphone, Percent, Hash,
  AlertTriangle, Fingerprint, Box
} from 'lucide-react';
import toast from 'react-hot-toast';
import useSettingsStore from '../store/settingsStore.js';
import useAuthStore from '../store/authStore.js';
import AnnouncementManager from '../components/settings/AnnouncementManager.jsx';
import { Megaphone, User as UserIcon, Lock, Monitor, LineChart, Key } from 'lucide-react';

export default function SettingsPage({ hideHeader }) {
  const { user, updateProfile, changePassword } = useAuthStore();
  const { settings, fetchSettings, updateSettings, isLoading: settingsLoading, isUpdating } = useSettingsStore();
  const [activeTab, setActiveTab] = useState(user?.role === 'staff' ? 'account' : 'branding');
  const [formData, setFormData] = useState(null);
  const [profileData, setProfileData] = useState({ fullName: user?.fullName || '', phone: user?.phone || '' });
  const [passwordData, setPasswordData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });

  useEffect(() => {
    fetchSettings();
  }, []);

  useEffect(() => {
    if (settings) {
      setFormData(settings);
    }
  }, [settings]);

  const handleInputChange = (section, field, value) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = await updateSettings(formData);
    if (result.success) {
      toast.success(result.message);
    } else {
      toast.error(result.message);
    }
  };

  const tabs = user?.role === 'staff' 
    ? [
        { id: 'account', label: 'My Profile', icon: UserIcon },
        { id: 'security', label: 'Security', icon: Lock },
        { id: 'display', label: 'Display Settings', icon: Monitor },
        { id: 'stats', label: 'My Activity', icon: LineChart },
      ]
    : [
        { id: 'branding', label: 'Business Profile', icon: Building2 },
        { id: 'sales', label: 'Sales & Invoicing', icon: Receipt },
        { id: 'inventory', label: 'Inventory Logic', icon: Package },
        { id: 'notifications', label: 'Alerts', icon: Bell },
        { id: 'privacy', label: 'Security & Privacy', icon: Shield },
      ];

  if (user?.role === 'admin') {
    tabs.push({ id: 'announcements', label: 'Announcements', icon: Megaphone });
  }

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    const result = await updateProfile(profileData);
    if (result.success) toast.success('Profile updated!');
    else toast.error(result.message);
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      return toast.error('Passwords do not match');
    }
    const result = await changePassword({ 
      currentPassword: passwordData.currentPassword, 
      newPassword: passwordData.newPassword 
    });
    if (result.success) {
      toast.success('Password updated!');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } else toast.error(result.message);
  };

  if (settingsLoading || !formData) {
    return (
      <div className="h-[60vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl pb-10 overflow-x-hidden">
      {!hideHeader && (
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
          <p className="text-sm text-gray-500">Configure your store's identity and operational rules.</p>
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar Tabs — Optimized for Mobile */}
        <div className="w-full lg:w-64 sticky top-[68px] z-10 lg:static bg-gray-50 dark:bg-gray-950 lg:bg-transparent -mx-4 px-4 py-2 mb-2 lg:m-0 lg:p-0">
          <div className="flex flex-row lg:flex-col gap-2 overflow-x-auto lg:overflow-visible no-scrollbar pb-2 lg:pb-0">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all whitespace-nowrap ${
                  activeTab === tab.id 
                    ? 'bg-primary-600 text-white shadow-md shadow-primary-200 dark:shadow-none' 
                    : 'bg-white dark:bg-gray-900 text-gray-500 border border-gray-100 dark:border-gray-800 lg:bg-transparent lg:border-none'
                }`}
              >
                <tab.icon size={18} />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1">
          {user?.role === 'staff' ? (
            <div className="space-y-6 animate-fade-in">
              {activeTab === 'account' && (
                <form onSubmit={handleProfileUpdate} className="card p-6 lg:p-8 space-y-6">
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <UserIcon className="w-5 h-5 text-primary-600" /> Personal Information
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="col-span-full">
                      <label className="label">Full Name</label>
                      <input 
                        type="text" className="input" 
                        value={profileData.fullName}
                        onChange={e => setProfileData(p => ({...p, fullName: e.target.value}))}
                      />
                    </div>
                    <div>
                      <label className="label">Phone Number</label>
                      <input 
                        type="text" className="input" 
                        value={profileData.phone}
                        onChange={e => setProfileData(p => ({...p, phone: e.target.value}))}
                      />
                    </div>
                    <div>
                      <label className="label">Email Address</label>
                      <input type="text" className="input opacity-60" value={user?.email} disabled />
                    </div>
                  </div>
                  <button type="submit" className="btn-primary w-full py-3 rounded-xl flex items-center justify-center gap-2">
                    <Save className="w-4 h-4" /> Update Profile
                  </button>
                </form>
              )}

              {activeTab === 'security' && (
                <form onSubmit={handlePasswordChange} className="card p-6 lg:p-8 space-y-6">
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <Lock className="w-5 h-5 text-primary-600" /> Security Settings
                  </h2>
                  <div className="space-y-4">
                    <div>
                      <label className="label">Current Password</label>
                      <div className="relative">
                        <Key className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                        <input 
                          type="password" name="currentPassword" className="input pl-10" 
                          value={passwordData.currentPassword}
                          onChange={e => setPasswordData(p => ({...p, currentPassword: e.target.value}))}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="label">New Password</label>
                      <div className="relative">
                        <Shield className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                        <input 
                          type="password" name="newPassword" className="input pl-10" 
                          value={passwordData.newPassword}
                          onChange={e => setPasswordData(p => ({...p, newPassword: e.target.value}))}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="label">Confirm New Password</label>
                      <div className="relative">
                        <Shield className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                        <input 
                          type="password" name="confirmPassword" className="input pl-10" 
                          value={passwordData.confirmPassword}
                          onChange={e => setPasswordData(p => ({...p, confirmPassword: e.target.value}))}
                        />
                      </div>
                    </div>
                  </div>
                  <button type="submit" className="btn-primary w-full py-3 rounded-xl flex items-center justify-center gap-2">
                    <Save className="w-4 h-4" /> Change Password
                  </button>
                </form>
              )}

              {activeTab === 'display' && (
                <div className="card p-6 lg:p-8 space-y-6">
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <Monitor className="w-5 h-5 text-primary-600" /> Appearance
                  </h2>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl">
                      <div>
                        <p className="text-sm font-bold text-gray-900 dark:text-white">Compact Mode</p>
                        <p className="text-xs text-gray-500">Show more information in less space.</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600"></div>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'stats' && (
                <div className="card p-6 lg:p-8 space-y-6">
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <LineChart className="w-5 h-5 text-primary-600" /> My Performance
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 bg-primary-50 dark:bg-primary-900/10 rounded-2xl border border-primary-100 dark:border-primary-900/30">
                      <p className="text-[10px] font-bold text-primary-600 uppercase mb-1">Total Sales Processed</p>
                      <p className="text-2xl font-black text-gray-900 dark:text-white">₹0</p>
                    </div>
                    <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-800">
                      <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Transactions Count</p>
                      <p className="text-2xl font-black text-gray-900 dark:text-white">0</p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 italic text-center">Performance data is updated in real-time based on your processed invoices.</p>
                </div>
              )}
            </div>
          ) : (
            activeTab !== 'announcements' ? (
              <form onSubmit={handleSubmit} className="card p-6 lg:p-8 space-y-8 animate-fade-in">
              
              {activeTab === 'branding' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="col-span-full">
                      <label className="label">Business Name</label>
                      <div className="relative">
                        <Building2 className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                        <input 
                          type="text" 
                          className="input pl-10" 
                          value={formData.business.name} 
                          onChange={(e) => handleInputChange('business', 'name', e.target.value)}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="label">Contact Email</label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                        <input 
                          type="email" 
                          className="input pl-10" 
                          value={formData.business.email} 
                          onChange={(e) => handleInputChange('business', 'email', e.target.value)}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="label">Phone Number</label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                        <input 
                          type="text" 
                          className="input pl-10" 
                          value={formData.business.phone} 
                          onChange={(e) => handleInputChange('business', 'phone', e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="col-span-full">
                      <label className="label">Registered Address</label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                        <textarea 
                          rows="3" 
                          className="input pl-10 pt-2" 
                          value={formData.business.address} 
                          onChange={(e) => handleInputChange('business', 'address', e.target.value)}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="label">Default Currency</label>
                      <div className="relative">
                        <Globe className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                        <select 
                          className="select pl-10" 
                          value={formData.business.currency} 
                          onChange={(e) => handleInputChange('business', 'currency', e.target.value)}
                        >
                          <option value="INR">INR (₹)</option>
                          <option value="USD">USD ($)</option>
                          <option value="EUR">EUR (€)</option>
                          <option value="GBP">GBP (£)</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="label">Tax ID / GST Number</label>
                      <div className="relative">
                        <Shield className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                        <input 
                          type="text" 
                          className="input pl-10" 
                          value={formData.business.taxId} 
                          onChange={(e) => handleInputChange('business', 'taxId', e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'sales' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="label">Invoice Prefix</label>
                      <div className="relative">
                        <Hash className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                        <input 
                          type="text" 
                          className="input pl-10" 
                          value={formData.sales.invoicePrefix} 
                          onChange={(e) => handleInputChange('sales', 'invoicePrefix', e.target.value)}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="label">Default Tax Rate (%)</label>
                      <div className="relative">
                        <Percent className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                        <input 
                          type="number" 
                          className="input pl-10" 
                          value={formData.sales.defaultTax} 
                          onChange={(e) => handleInputChange('sales', 'defaultTax', e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="col-span-full">
                      <label className="label">Terms & Conditions (Invoice Footer)</label>
                      <textarea 
                        rows="4" 
                        className="input" 
                        value={formData.sales.terms} 
                        onChange={(e) => handleInputChange('sales', 'terms', e.target.value)}
                      />
                    </div>
                    <div className="col-span-full">
                      <label className="label mb-3">Enabled Payment Methods</label>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { id: 'cash', label: 'Cash', icon: Banknote },
                          { id: 'card', label: 'Card', icon: CreditCard },
                          { id: 'upi', label: 'UPI / Digital', icon: Smartphone },
                        ].map(method => (
                          <button
                            key={method.id}
                            type="button"
                            onClick={() => handleInputChange('sales', 'defaultPaymentMethod', method.id)}
                            className={`flex-1 p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all ${
                              formData.sales.defaultPaymentMethod === method.id
                                ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400'
                                : 'border-gray-100 dark:border-gray-800 text-gray-500'
                            }`}
                          >
                            <method.icon size={20} />
                            <span className="text-xs font-bold">{method.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'inventory' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="label">Low Stock Threshold (Global)</label>
                      <div className="relative">
                        <AlertTriangle className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                        <input 
                          type="number" 
                          className="input pl-10" 
                          value={formData.inventory.lowStockThreshold} 
                          onChange={(e) => handleInputChange('inventory', 'lowStockThreshold', e.target.value)}
                        />
                      </div>
                      <p className="text-[10px] text-gray-400 mt-1">Default level to trigger low stock warnings.</p>
                    </div>
                    <div>
                      <label className="label">Default Unit</label>
                      <div className="relative">
                        <Box className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                        <input 
                          type="text" 
                          className="input pl-10" 
                          value={formData.inventory.defaultUnit} 
                          onChange={(e) => handleInputChange('inventory', 'defaultUnit', e.target.value)}
                          placeholder="pcs, kg, box..."
                        />
                      </div>
                    </div>
                    <div className="col-span-full">
                      <label className="label">SKU Generation Pattern</label>
                      <div className="relative">
                        <Fingerprint className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                        <input 
                          type="text" 
                          className="input pl-10" 
                          value={formData.inventory.skuPattern} 
                          onChange={(e) => handleInputChange('inventory', 'skuPattern', e.target.value)}
                          placeholder="PROD-{RAND4}"
                        />
                      </div>
                      <p className="text-[10px] text-gray-400 mt-1">Example: PROD-1234. Use {'{RAND4}'} for random digits.</p>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'notifications' && (
                <div className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl">
                      <div>
                        <p className="text-sm font-bold text-gray-900 dark:text-white">Low Stock Email Alerts</p>
                        <p className="text-xs text-gray-500">Get notified when products hit critical levels.</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          className="sr-only peer" 
                          checked={formData.notifications.lowStockEmail}
                          onChange={(e) => handleInputChange('notifications', 'lowStockEmail', e.target.checked)}
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl">
                      <div>
                        <p className="text-sm font-bold text-gray-900 dark:text-white">Daily Sales Report</p>
                        <p className="text-xs text-gray-500">Receive a summary of sales at the end of each day via email.</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          className="sr-only peer" 
                          checked={formData.notifications.dailyReportEmail}
                          onChange={(e) => handleInputChange('notifications', 'dailyReportEmail', e.target.checked)}
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600"></div>
                      </label>
                    </div>

                    <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
                      <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4">In-App Alerts</h3>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl">
                          <div>
                            <p className="text-sm font-bold text-gray-900 dark:text-white">Inventory Alerts</p>
                            <p className="text-xs text-gray-500">Get notified inside the app when stock is low or adjusted.</p>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input 
                              type="checkbox" 
                              className="sr-only peer" 
                              checked={formData.notifications.inAppInventoryAlerts ?? true}
                              onChange={(e) => handleInputChange('notifications', 'inAppInventoryAlerts', e.target.checked)}
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600"></div>
                          </label>
                        </div>

                        <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl">
                          <div>
                            <p className="text-sm font-bold text-gray-900 dark:text-white">Sale Alerts</p>
                            <p className="text-xs text-gray-500">Get notified inside the app for new sales and transactions.</p>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input 
                              type="checkbox" 
                              className="sr-only peer" 
                              checked={formData.notifications.inAppSaleAlerts ?? true}
                              onChange={(e) => handleInputChange('notifications', 'inAppSaleAlerts', e.target.checked)}
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600"></div>
                          </label>
                        </div>

                        <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl">
                          <div>
                            <p className="text-sm font-bold text-gray-900 dark:text-white">Staff Alerts</p>
                            <p className="text-xs text-gray-500">Get notified inside the app for staff actions and logins.</p>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input 
                              type="checkbox" 
                              className="sr-only peer" 
                              checked={formData.notifications.inAppStaffAlerts ?? true}
                              onChange={(e) => handleInputChange('notifications', 'inAppStaffAlerts', e.target.checked)}
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600"></div>
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'privacy' && (
                <div className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-800">
                      <div>
                        <p className="text-sm font-bold text-gray-900 dark:text-white">Hide Product Price from Staff</p>
                        <p className="text-xs text-gray-500">Staff members will not be able to see product prices or order totals.</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          className="sr-only peer" 
                          checked={formData.privacy?.hideStaffPriceDetails ?? false}
                          onChange={(e) => handleInputChange('privacy', 'hideStaffPriceDetails', e.target.checked)}
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-800">
                      <div>
                        <p className="text-sm font-bold text-gray-900 dark:text-white">Hide Tax Details from Staff</p>
                        <p className="text-xs text-gray-500">Hide tax amount and rate calculations from staff during checkout.</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          className="sr-only peer" 
                          checked={formData.privacy?.hideStaffTaxDetails ?? false}
                          onChange={(e) => handleInputChange('privacy', 'hideStaffTaxDetails', e.target.checked)}
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-800">
                      <div>
                        <p className="text-sm font-bold text-gray-900 dark:text-white">Hide Payment Method from Staff</p>
                        <p className="text-xs text-gray-500">Staff will not see specific payment method details in history or checkout.</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          className="sr-only peer" 
                          checked={formData.privacy?.hideStaffPaymentMethod ?? false}
                          onChange={(e) => handleInputChange('privacy', 'hideStaffPaymentMethod', e.target.checked)}
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-primary-50/50 dark:bg-primary-900/10 rounded-2xl border border-primary-100/50 dark:border-primary-900/20">
                      <div>
                        <p className="text-sm font-bold text-gray-900 dark:text-white">Hide Financial Details for All Roles</p>
                        <p className="text-xs text-gray-500">If enabled, payment and price details will be hidden for ALL users (including Admin/Manager).</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          className="sr-only peer" 
                          checked={formData.privacy?.hideAllFinancialDetails ?? false}
                          onChange={(e) => handleInputChange('privacy', 'hideAllFinancialDetails', e.target.checked)}
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600"></div>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              <div className="pt-6 border-t border-gray-100 dark:border-gray-800">
                <button 
                  type="submit" 
                  disabled={isUpdating}
                  className="btn-primary w-full py-4 rounded-2xl flex items-center justify-center gap-2"
                >
                  {isUpdating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                  Save Settings
                </button>
              </div>
            </form>
          ) : (
              <div className="animate-fade-in">
                {user?.role === 'admin' && <AnnouncementManager />}
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
