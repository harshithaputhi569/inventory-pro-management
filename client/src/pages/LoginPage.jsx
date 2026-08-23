import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff, Package, Loader2, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import useAuthStore from '../store/authStore.js';
import useThemeStore from '../store/themeStore.js';

const loginSchema = z.object({
  identifier: z.string().min(1, 'Email or username is required'),
  password: z.string().min(1, 'Password is required'),
  storeCode: z.string().optional(),
  intendedRole: z.string().optional(),
});

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [loginMode, setLoginMode] = useState('admin'); // 'admin', 'manager', 'staff'
  const { login, isLoading } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/dashboard';

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (data) => {
    const result = await login({ ...data, intendedRole: loginMode });
    if (result.success) {
      toast.success(`Welcome back, ${loginMode}!`);
      const userRole = useAuthStore.getState().user?.role || loginMode;
      const defaultPath = userRole === 'staff' ? '/staff-home' : '/dashboard';
      const fromPath = location.state?.from?.pathname;
      const targetPath = (fromPath && fromPath !== '/staff-home' && fromPath !== '/login') ? fromPath : defaultPath;
      navigate(targetPath, { replace: true });
    } else if (result.needsVerification) {
      toast.error('Email verification required.');
      navigate(`/verify-email?email=${encodeURIComponent(result.email)}`);
    } else {
      setError('root', { message: result.message });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-indigo-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 flex items-center justify-center p-4">

      {/* Theme toggle */}
      <button
        onClick={toggleTheme}
        className="fixed top-4 right-4 p-2.5 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors shadow-sm"
        aria-label="Toggle theme"
      >
        {theme === 'dark' ? '☀️' : '🌙'}
      </button>

      <div className="w-full max-w-md animate-slide-up">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-white dark:bg-gray-900 shadow-xl shadow-primary-200/50 dark:shadow-none mb-6 overflow-hidden border border-primary-50 dark:border-primary-900/30">
            <img src="/logo.png" alt="Logo" className="w-full h-full object-cover scale-110" />
          </div>
          <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">Inventory Pro</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2 text-sm font-medium uppercase tracking-[0.2em] opacity-70">
            {loginMode} Portal Login
          </p>
        </div>

        {/* Mode Toggle */}
        <div className="flex p-1 bg-gray-100 dark:bg-gray-800 rounded-xl mb-6">
          {['admin', 'manager', 'staff'].map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setLoginMode(mode)}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all capitalize ${
                loginMode === mode
                  ? 'bg-white dark:bg-gray-700 text-primary-600 dark:text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>

        {/* Card */}
        <div className="card p-8 shadow-xl shadow-gray-100 dark:shadow-none">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>

            {/* Root error */}
            {errors.root && (
              <div className="flex items-center gap-2.5 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                <p className="text-sm text-red-600 dark:text-red-400">{errors.root.message}</p>
              </div>
            )}

            {/* Store ID (Only for Manager/Staff Login) */}
            {loginMode !== 'admin' && (
              <div className="animate-fade-in">
                <label className="label">Store ID</label>
                <input
                  {...register('storeCode')}
                  type="text"
                  placeholder="Enter Store Code (e.g. MW-01)"
                  className={`input uppercase ${errors.storeCode ? 'input-error' : ''}`}
                />
              </div>
            )}

            {/* Email / Username */}
            <div>
              <label className="label">Email or Username</label>
              <input
                {...register('identifier')}
                type="text"
                placeholder="Enter your email or username"
                className={`input ${errors.identifier ? 'input-error' : ''}`}
                autoComplete="username"
                autoFocus
              />
              {errors.identifier && (
                <p className="error-text">
                  <AlertCircle className="w-3 h-3" />
                  {errors.identifier.message}
                </p>
              )}
            </div>

            {/* Password */}
            <div>
              <label className="label">Password</label>
              <div className="relative">
                <input
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  className={`input pr-11 ${errors.password ? 'input-error' : ''}`}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="error-text">
                  <AlertCircle className="w-3 h-3" />
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full py-3 text-base"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign in'
              )}
            </button>
          </form>

          {/* Register link */}
          <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-6">
            Don't have an account?{' '}
            <Link
              to="/register"
              className="text-primary-600 dark:text-primary-400 font-medium hover:text-primary-700 dark:hover:text-primary-300 transition-colors"
            >
              Create account
            </Link>
          </p>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-400 dark:text-gray-600 mt-6">
          © 2026 Inventory Pro · Powered by WinWin
        </p>
      </div>
    </div>
  );
}
