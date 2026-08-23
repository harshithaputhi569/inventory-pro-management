import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useEffect, useState } from 'react';

import useThemeStore from './store/themeStore.js';
import useAuthStore from './store/authStore.js';
import { ProtectedRoute, GuestRoute, RoleRoute } from './components/auth/ProtectedRoute.jsx';
import AppLayout from './components/layout/AppLayout.jsx';
import NetworkStatus from './components/layout/NetworkStatus.jsx';
import Heartbeat from './components/auth/Heartbeat.jsx';
import SplashScreen from './components/common/SplashScreen.jsx';

import LoginPage from './pages/LoginPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import ProductsPage from './pages/ProductsPage.jsx';
import CategoriesPage from './pages/CategoriesPage.jsx';
import LowStockPage from './pages/LowStockPage.jsx';
import BranchesPage from './pages/BranchesPage.jsx';
import UsersPage from './pages/UsersPage.jsx';
import NewSalePage from './pages/NewSalePage.jsx';
import SalesPage from './pages/SalesPage.jsx';
import AnalyticsPage from './pages/AnalyticsPage.jsx';
import ProfilePage from './pages/ProfilePage.jsx';
import SettingsPage from './pages/SettingsPage.jsx';
import EmployeeBehaviorPage from './pages/EmployeeBehaviorPage.jsx';
import LandingPage from './pages/LandingPage.jsx';
import StaffHomePage from './pages/StaffHomePage.jsx';
import VerifyEmailPage from './pages/VerifyEmailPage.jsx';

export default function App() {
  const { theme } = useThemeStore();
  const { isAuthenticated, user } = useAuthStore();
  
  // Only show splash if it hasn't been shown in this SESSION
  const [showSplash, setShowSplash] = useState(() => {
    return !sessionStorage.getItem('splash_shown');
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  useEffect(() => {
    if (showSplash) {
      const timer = setTimeout(() => {
        setShowSplash(false);
        sessionStorage.setItem('splash_shown', 'true');
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [showSplash]);

  if (showSplash) {
    return <SplashScreen />;
  }

  // Enhanced PWA detection
  const isPWA = 
    window.matchMedia('(display-mode: standalone)').matches || 
    window.navigator.standalone === true ||
    window.location.search.includes('mode=standalone');

  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: theme === 'dark' ? '#1f2937' : '#ffffff',
            color: theme === 'dark' ? '#f9fafb' : '#111827',
            border: theme === 'dark' ? '1px solid #374151' : '1px solid #e5e7eb',
            borderRadius: '10px',
            fontSize: '14px',
          },
          success: { iconTheme: { primary: '#6366f1', secondary: '#fff' } },
          error: { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
        }}
      />
      <NetworkStatus />
      <Heartbeat />

      <Routes>
        {/* Public / guest-only routes */}
        <Route path="/login" element={<GuestRoute><LoginPage /></GuestRoute>} />
        <Route path="/register" element={<GuestRoute><RegisterPage /></GuestRoute>} />
        <Route path="/verify-email" element={<GuestRoute><VerifyEmailPage /></GuestRoute>} />

        {/* Protected routes — all wrapped in AppLayout sidebar */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <RoleRoute allowedRoles={['admin', 'manager']}>
                <AppLayout><DashboardPage /></AppLayout>
              </RoleRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/staff-home"
          element={
            <ProtectedRoute>
              <RoleRoute allowedRoles={['staff']}>
                <AppLayout><StaffHomePage /></AppLayout>
              </RoleRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/products"
          element={
            <ProtectedRoute>
              <AppLayout><ProductsPage /></AppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/categories"
          element={
            <ProtectedRoute>
              <AppLayout><CategoriesPage /></AppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/low-stock"
          element={
            <ProtectedRoute>
              <AppLayout><LowStockPage /></AppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/branches"
          element={
            <ProtectedRoute>
              <AppLayout><BranchesPage /></AppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/users"
          element={
            <ProtectedRoute>
              <AppLayout><UsersPage /></AppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/pos"
          element={
            <ProtectedRoute>
              <AppLayout><NewSalePage /></AppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/sales"
          element={
            <ProtectedRoute>
              <AppLayout><SalesPage /></AppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/analytics"
          element={
            <ProtectedRoute>
              <AppLayout><AnalyticsPage /></AppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <AppLayout><ProfilePage /></AppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <AppLayout><SettingsPage /></AppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/employee-behavior"
          element={
            <ProtectedRoute>
              <AppLayout><EmployeeBehaviorPage /></AppLayout>
            </ProtectedRoute>
          }
        />

        {/* Landing Page - Redirect if PWA and Authenticated */}
        <Route 
          path="/" 
          element={
            (isAuthenticated && isPWA) 
              ? <Navigate to={user?.role === 'staff' ? "/staff-home" : "/dashboard"} replace /> 
              : <LandingPage />
          } 
        />

        {/* Default redirect for unknown routes */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
