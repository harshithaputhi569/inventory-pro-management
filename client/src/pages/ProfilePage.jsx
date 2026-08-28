import { useState } from 'react';
import { User, Mail, Phone, Shield, Store, Copy, Check, Save, Loader2, Key, Settings, LogOut, X, Package, GitBranch, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore.js';
import toast from 'react-hot-toast';
import axios from 'axios';

function PasswordModal({ onClose }) {
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.newPassword !== formData.confirmPassword) {
      return toast.error('New passwords do not match');
    }
    if (formData.newPassword.length < 8) {
      return toast.error('Password must be at least 8 characters');
    }

    setIsLoading(true);
    try {
      const { data } = await axios.put('/api/auth/change-password', {
        currentPassword: formData.currentPassword,
        newPassword: formData.newPassword,
      });
      if (data.success) {
        toast.success('Password changed successfully');
        onClose();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to change password');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-slide-up">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Key className="w-5 h-5 text-yellow-500" /> Change Password
          </h2>
          <button onClick={onClose} className="p-2 rounded-xl text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800">
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="label">Current Password</label>
            <input 
              required
              type="password" 
              className="input" 
              placeholder="••••••••"
              value={formData.currentPassword}
              onChange={(e) => setFormData({...formData, currentPassword: e.target.value})}
            />
          </div>
          <div className="grid grid-cols-1 gap-4 pt-2">
            <div>
              <label className="label">New Password</label>
              <input 
                required
                type="password" 
                className="input" 
                placeholder="••••••••"
                value={formData.newPassword}
                onChange={(e) => setFormData({...formData, newPassword: e.target.value})}
              />
            </div>
            <div>
              <label className="label">Confirm New Password</label>
              <input 
                required
                type="password" 
                className="input" 
                placeholder="••••••••"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
              />
            </div>
          </div>
          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={isLoading} className="btn-primary flex-1">
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Update Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const { user, setUser, logout } = useAuthStore();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  
  const [formData, setFormData] = useState({
    fullName: user?.fullName || '',
    phone: user?.phone || '',
  });

  const handleCopyCode = async () => {
    const codeToCopy = user?.storeId?.code || 'MAIN-01';
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(codeToCopy);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = codeToCopy;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
      }
      setCopied(true);
      toast.success('Store Code copied!');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error('Failed to copy code');
      console.error('Copy failed:', err);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const { data } = await axios.put('/api/auth/profile', formData);
      if (data.success) {
        setUser(data.user);
        toast.success('Profile updated successfully');
        setIsEditing(false);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
    navigate('/login');
  };
  
  const isAdmin = user?.role === 'admin';
  const isManager = user?.role === 'manager';
  const currentUser = user;

  return (
    <div className="space-y-6">
      {/* Tab Switcher Removed */}

      <div className="max-w-4xl space-y-6 animate-fade-in">
          <div className="mb-2">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Account Settings</h1>
            <p className="text-sm text-gray-500">Manage your profile and workspace information</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column: User Card */}
            <div className="lg:col-span-1 space-y-6">
              <div className="card p-6 text-center">
                <div className="w-24 h-24 rounded-2xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center mx-auto mb-4 border-4 border-white dark:border-gray-800 shadow-sm">
                  <User className="w-12 h-12 text-primary-600 dark:text-primary-400" />
                </div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">{user?.fullName}</h2>
                <p className="text-sm text-gray-500 capitalize mb-4">{user?.role}</p>
                <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                  user?.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                }`}>
                  <Shield className="w-3 h-3 mr-1" /> {user?.role} Access
                </div>

                <button 
                  onClick={handleLogout}
                  className="w-full mt-6 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-bold text-red-600 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 transition-all border border-red-100 dark:border-red-800/50"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>

              {/* Store Info Card */}
              <div className="card p-6 bg-indigo-600 text-white">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-white/20 rounded-lg">
                    <Store className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="font-bold">Your Store</h3>
                </div>
                <p className="text-xs opacity-80 uppercase font-bold tracking-wider mb-1">Store Name</p>
                <p className="text-lg font-medium mb-4">{user?.storeId?.name || 'Main Warehouse'}</p>
                
                <div className="flex items-center justify-between bg-white/10 p-3 rounded-xl border border-white/20">
                  <code className="text-xl font-bold tracking-widest">{user?.storeId?.code || 'MAIN-01'}</code>
                  <button 
                    onClick={handleCopyCode}
                    className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                    title="Copy Store ID"
                  >
                    {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                  </button>
                </div>
                <p className="text-[10px] mt-3 opacity-70 italic text-center">
                  Staff & Managers need this code to log in to this store.
                </p>
              </div>


            </div>

            {/* Right Column: Edit Profile */}
            <div className="lg:col-span-2 space-y-6">
              <div className="card">
                <div className="card-header flex items-center justify-between">
                  <h3 className="font-bold text-gray-900 dark:text-white">Profile Details</h3>
                  <button 
                    onClick={() => setIsEditing(!isEditing)}
                    className="text-sm font-medium text-primary-600 hover:text-primary-700"
                  >
                    {isEditing ? 'Cancel' : 'Edit Profile'}
                  </button>
                </div>
                <div className="card-body">
                  <form onSubmit={handleSave} className="space-y-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div>
                        <label className="label">Full Name</label>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <input 
                            type="text" 
                            className="input pl-10" 
                            value={formData.fullName}
                            disabled={!isEditing}
                            onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                          />
                        </div>
                      </div>
                      <div>
                        <label className="label">Username</label>
                        <div className="relative">
                          <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <input 
                            type="text" 
                            className="input pl-10 bg-gray-50 dark:bg-gray-800/50 cursor-not-allowed" 
                            value={user?.username}
                            disabled
                          />
                        </div>
                      </div>
                      <div>
                        <label className="label">Email Address</label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <input 
                            type="email" 
                            className="input pl-10 bg-gray-50 dark:bg-gray-800/50 cursor-not-allowed" 
                            value={user?.email}
                            disabled
                          />
                        </div>
                      </div>
                      <div>
                        <label className="label">Phone Number</label>
                        <div className="relative">
                          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <input 
                            type="text" 
                            className="input pl-10" 
                            value={formData.phone}
                            disabled={!isEditing}
                            onChange={(e) => setFormData({...formData, phone: e.target.value})}
                          />
                        </div>
                      </div>
                    </div>

                    {isEditing && (
                      <div className="flex justify-end pt-2">
                        <button 
                          type="submit" 
                          disabled={isLoading}
                          className="btn-primary"
                        >
                          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                          Save Changes
                        </button>
                      </div>
                    )}
                  </form>
                </div>
              </div>

              {/* Password Section */}
              <div className="card p-6 border-l-4 border-l-yellow-500">
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                    <Key className="w-6 h-6 text-yellow-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-900 dark:text-white mb-1">Security & Password</h3>
                    <p className="text-sm text-gray-500 mb-4">Protect your account by using a strong password.</p>
                    <button 
                      onClick={() => setShowPasswordModal(true)}
                      className="btn-secondary text-sm"
                    >
                      Change Password
                    </button>
                  </div>
                </div>
              </div>

              {/* Manage Branches Card — admin only */}
              {isAdmin && (
                <button
                  onClick={() => navigate('/branches')}
                  className="w-full card p-5 flex items-center justify-between hover:shadow-md transition-all group border border-transparent hover:border-primary-200 dark:hover:border-primary-800"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 flex-shrink-0">
                      <GitBranch className="w-5 h-5" />
                    </div>
                    <div className="text-left">
                      <p className="font-bold text-gray-900 dark:text-white text-sm leading-tight">Manage Branches</p>
                      <p className="text-xs text-gray-400 font-medium mt-0.5">View &amp; manage store locations</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-primary-500 transition-colors" />
                </button>
              )}
            </div>
          </div>
        </div>

      {showPasswordModal && <PasswordModal onClose={() => setShowPasswordModal(false)} />}
    </div>
  );
}
