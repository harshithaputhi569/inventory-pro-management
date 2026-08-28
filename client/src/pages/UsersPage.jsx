import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Shield, Store, Loader2, Pencil, Trash2, X, Check, Plus, Search, Phone, Eye, EyeOff, Brain } from 'lucide-react';
import toast from 'react-hot-toast';
import useUserStore from '../store/userStore.js';
import useBranchStore from '../store/branchStore.js';
import useAuthStore from '../store/authStore.js';

function UserEditModal({ user, onClose }) {
  const { branches, fetchBranches } = useBranchStore();
  const { updateUser, createUser } = useUserStore();
  const { user: currentUser } = useAuthStore();
  const [role, setRole] = useState(user?.role || 'staff');
  const [branchId, setBranchId] = useState(user?.branchId?._id || (currentUser.role === 'manager' ? currentUser.branchId?._id : ''));
  const [isActive, setIsActive] = useState(user ? user.isActive : true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const isManager = currentUser.role === 'manager';
  const [email, setEmail] = useState(user?.email || '');
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [username, setUsername] = useState(user?.username || '');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState(user?.phone || '');

  useEffect(() => { fetchBranches(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    const result = user
      ? await updateUser(user._id, { role, branchId, isActive, phone })
      : await createUser({ fullName, email, username, password, role, branchId, phone });
    setIsSubmitting(false);
    if (result.success) { toast.success(user ? 'User updated' : 'User created'); onClose(); }
    else toast.error(result.message);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-gray-900 rounded-t-3xl sm:rounded-2xl shadow-xl w-full sm:max-w-md animate-slide-up">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {user ? 'Edit User' : 'Add New Staff Member'}
          </h2>
          <button onClick={onClose} className="p-2 rounded-xl text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 touch-target">
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {!user && (
            <>
              <div>
                <label className="label">Full Name <span className="text-red-500">*</span></label>
                <input required value={fullName} onChange={(e) => setFullName(e.target.value)} className="input" placeholder="John Doe" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Username <span className="text-red-500">*</span></label>
                  <input required value={username} onChange={(e) => setUsername(e.target.value)} className="input" placeholder="johndoe" />
                </div>
                <div>
                  <label className="label">Email <span className="text-red-500">*</span></label>
                  <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input" placeholder="john@example.com" />
                </div>
              </div>
              <div>
                <label className="label">Temporary Password <span className="text-red-500">*</span></label>
                <div className="relative">
                  <input 
                    required 
                    type={showPassword ? "text" : "password"} 
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)} 
                    className="input pr-10" 
                    placeholder="••••••••" 
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </>
          )}

          {user && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 mb-2">
              <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-600 font-bold uppercase text-lg">
                {user.fullName.charAt(0)}
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900 dark:text-white">{user.fullName}</p>
                <p className="text-xs text-gray-500">{user.email}</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Access Role</label>
              <select 
                value={role} 
                onChange={(e) => setRole(e.target.value)} 
                className={`input ${isManager ? 'bg-gray-50 cursor-not-allowed' : ''}`}
                disabled={isManager}
              >
                <option value="staff">Staff</option>
                {!isManager && <option value="manager">Manager</option>}
                {!isManager && <option value="admin">Administrator</option>}
              </select>
            </div>
            <div>
              <label className="label">Assigned Branch</label>
              <select 
                value={branchId} 
                onChange={(e) => setBranchId(e.target.value)} 
                className={`input ${isManager ? 'bg-gray-50 cursor-not-allowed' : ''}`}
                disabled={isManager}
              >
                <option value="">No Branch Assigned</option>
                {branches.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="label">Mobile Number</label>
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="input" placeholder="+91 98765 43210" />
          </div>

          {user && (
            <div className="flex items-center gap-2 py-2">
              <input type="checkbox" id="isActive" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="w-4 h-4 text-primary-600 rounded" />
              <label htmlFor="isActive" className="text-sm font-medium text-gray-700 dark:text-gray-300">Active Account</label>
            </div>
          )}

          <div className="flex gap-3 pt-2 pb-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="btn-primary flex-1">
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : (user ? 'Save Changes' : 'Create User')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const roleColors = {
  admin: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  manager: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  staff: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
};

export default function UsersPage({ hideHeader }) {
  const { users, fetchUsers, isLoading, deactivateUser } = useUserStore();
  const { branches, fetchBranches } = useBranchStore();
  const { user: currentUser } = useAuthStore();
  const navigate = useNavigate();
  const [editUser, setEditUser] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('');

  const isAdmin = currentUser?.role === 'admin';
  const isManager = currentUser?.role === 'manager';
  const canAdd = isAdmin || isManager;

  // Debounce search input by 400ms
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => { 
    fetchBranches();
    fetchUsers({ search: debouncedSearch, branchId: selectedBranch }); 

    // Auto-refresh for real-time online status
    const interval = setInterval(() => {
      fetchUsers({ search: debouncedSearch, branchId: selectedBranch });
    }, 30000);

    return () => clearInterval(interval);
  }, [debouncedSearch, selectedBranch]);
  
    const handleDelete = async (id) => {
      if (window.confirm('Are you sure you want to deactivate this account?')) {
        const result = await deactivateUser(id);
        if (result.success) toast.success('Account deactivated');
      }
    };
  
    return (
      <div>
        {/* Header */}
        {!hideHeader && (
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Staff Management</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Control staff access and branch assignments</p>
            </div>
            {canAdd && (
              <button onClick={() => setShowAddModal(true)} className="btn-primary">
                <Plus className="w-4 h-4" /> <span className="hidden sm:inline">Add Staff</span>
              </button>
            )}
          </div>
        )}
  
        {hideHeader && canAdd && (
          <div className="flex justify-end mb-4">
            <button onClick={() => setShowAddModal(true)} className="btn-primary text-xs py-2">
              <Plus className="w-3.5 h-3.5" /> Add Staff Member
            </button>
          </div>
        )}

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search by name or username..." 
            className="input pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {isAdmin && (
          <select 
            className="select sm:w-64"
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value)}
          >
            <option value="">All Branches</option>
            {branches.map(b => <option key={b._id} value={b._id}>{b.name} ({b.code})</option>)}
          </select>
        )}
      </div>

      {isLoading && users.length === 0 ? (
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary-600" /></div>
      ) : (
        <>
          {/* ── MOBILE CARD LIST (hidden on md+) ───────────────────────────── */}
          <div className="md:hidden space-y-3">
            {/* Mobile-only: Behaviors shortcut */}
            <button
              onClick={() => navigate('/employee-behavior')}
              className="w-full flex items-center justify-between px-4 py-3 rounded-2xl bg-gradient-to-r from-violet-50 to-indigo-50 dark:from-violet-900/20 dark:to-indigo-900/20 border border-violet-100 dark:border-violet-800/40 hover:shadow-md transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center text-violet-600 dark:text-violet-400 flex-shrink-0">
                  <Brain size={18} />
                </div>
                <div className="text-left">
                  <p className="text-sm font-bold text-gray-900 dark:text-white leading-tight">Employee Behavior</p>
                  <p className="text-[10px] text-gray-400 font-medium">Activity, attendance &amp; integrity</p>
                </div>
              </div>
              <div className="flex items-center gap-1 text-xs font-bold text-violet-600 dark:text-violet-400 bg-violet-100 dark:bg-violet-900/40 px-2.5 py-1 rounded-lg">
                View →
              </div>
            </button>

            {users.map((u) => (
              <div key={u._id} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-4">
                <div className="flex items-start gap-3">
                  {/* Avatar */}
                  <div className="w-11 h-11 rounded-full bg-gradient-to-br from-primary-100 to-primary-200 dark:from-primary-900/40 dark:to-primary-800/40 flex items-center justify-center font-bold text-primary-700 dark:text-primary-300 uppercase text-lg flex-shrink-0">
                    {u.fullName.charAt(0)}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-gray-900 dark:text-white text-sm">
                        {u.fullName}
                        {u._id === currentUser.id && <span className="text-[10px] text-primary-600 font-normal ml-1">(You)</span>}
                        <span className={`inline-block w-2 h-2 rounded-full ml-2 ${u.isOnline ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`} />
                      </p>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${roleColors[u.role]}`}>{u.role}</span>
                    </div>
                    <p className="text-xs text-gray-400 font-mono mt-0.5">@{u.username}</p>
                    <div className="flex items-center gap-3 mt-2">
                      {u.branchId ? (
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <Store className="w-3 h-3" /> {u.branchId.name}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400 italic">No branch assigned</span>
                      )}
                      {u.phone && (
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <Phone className="w-3 h-3" /> {u.phone}
                        </div>
                      )}
                      {u.isActive ? (
                        <div className="flex items-center gap-1 text-green-600 text-xs font-medium">
                          <Check className="w-3 h-3" /> Active
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-red-500 text-xs font-medium">
                          <Shield className="w-3 h-3" /> Inactive
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  {(isAdmin || (isManager && u.role === 'staff')) && (
                    <div className="flex flex-col gap-1 flex-shrink-0">
                      <button onClick={() => setEditUser(u)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl text-gray-400 hover:text-primary-600 touch-target">
                        <Pencil className="w-4 h-4" />
                      </button>
                      {u._id !== currentUser.id && (
                        <button onClick={() => handleDelete(u._id)} className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl text-gray-400 hover:text-red-500 touch-target">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* ── DESKTOP TABLE (hidden on mobile) ─────────────────────────── */}
          <div className="card overflow-hidden hidden md:block">
            <div className="overflow-x-auto">
              <table className="w-full text-sm table-fixed">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800">
                    <th className="w-1/5 text-left px-4 py-4 font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider text-xs">Staff</th>
                    <th className="w-1/5 text-center px-4 py-4 font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider text-xs">Role</th>
                    <th className="w-1/5 text-center px-4 py-4 font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider text-xs">Branch</th>
                    <th className="w-1/5 text-center px-4 py-4 font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider text-xs">Status</th>
                    {isAdmin && <th className="w-1/5 text-center px-4 py-4 font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider text-xs">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                  {users.map((u) => (
                    <tr key={u._id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/20 transition-colors">
                      <td className="w-1/5 px-4 py-4">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center font-bold text-gray-600 dark:text-gray-400 uppercase flex-shrink-0">
                            {u.fullName.charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-gray-900 dark:text-white flex items-center gap-2 truncate">
                              {u.fullName}
                              {u._id === currentUser.id && <span className="text-[10px] text-primary-600 font-normal whitespace-nowrap">(You)</span>}
                              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${u.isOnline ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`} />
                            </p>
                            <p className="text-xs text-gray-500 font-mono truncate">@{u.username}</p>
                            {u.phone && <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5 truncate"><Phone className="w-3 h-3 flex-shrink-0" />{u.phone}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="w-1/5 px-4 py-4 text-center">
                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${roleColors[u.role]}`}>{u.role}</span>
                      </td>
                      <td className="w-1/5 px-4 py-4 text-center text-gray-600 dark:text-gray-300">
                        {u.branchId ? (
                          <div className="flex items-center justify-center gap-1.5 truncate"><Store className="w-3.5 h-3.5 opacity-50 flex-shrink-0" /><span className="truncate">{u.branchId.name}</span></div>
                        ) : (
                          <span className="text-gray-400 text-xs italic">Unassigned</span>
                        )}
                      </td>
                      <td className="w-1/5 px-4 py-4">
                        <div className="flex justify-center">
                          {u.isActive ? (
                            <div className="flex items-center gap-1.5 text-green-600 text-xs font-medium"><Check className="w-3.5 h-3.5" /> Active</div>
                          ) : (
                            <div className="flex items-center gap-1.5 text-red-500 text-xs font-medium"><Shield className="w-3.5 h-3.5" /> Inactive</div>
                          )}
                        </div>
                      </td>
                      {isAdmin || (isManager && u.role === 'staff') ? (
                        <td className="w-1/5 px-4 py-4">
                          <div className="flex items-center justify-center gap-1">
                            <button onClick={() => setEditUser(u)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-gray-500 hover:text-primary-600">
                              <Pencil className="w-4 h-4" />
                            </button>
                            {u._id !== currentUser.id && (
                              <button onClick={() => handleDelete(u._id)} className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-red-500">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      ) : isAdmin && (
                        <td className="w-1/5 px-4 py-4"></td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {editUser && <UserEditModal user={editUser} onClose={() => setEditUser(null)} />}
      {showAddModal && <UserEditModal onClose={() => setShowAddModal(false)} />}
    </div>
  );
}
