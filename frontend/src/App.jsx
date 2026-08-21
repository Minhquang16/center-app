import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { Toaster } from 'sonner';
import api from './api/axios';
import Sidebar from './components/Sidebar';

// Import các trang using React.lazy for Code Splitting
const LoginPage = React.lazy(() => import('./pages/LoginPage'));
const DashboardPage = React.lazy(() => import('./pages/DashboardPage'));
const StudentsPage = React.lazy(() => import('./pages/StudentsPage'));
const AttendancePage = React.lazy(() => import('./pages/AttendancePage'));
const PosPage = React.lazy(() => import('./pages/PosPage'));
const UsersPage = React.lazy(() => import('./pages/UsersPage'));
const RolesPage = React.lazy(() => import('./pages/RolesPage'));
const UserRoleManagement = React.lazy(() => import('./pages/UserRoleManagement'));
const BranchesPage = React.lazy(() => import('./pages/BranchesPage'));
const AuditLogPage = React.lazy(() => import('./pages/AuditLogPage'));
const ProfilePage = React.lazy(() => import('./pages/ProfilePage'));
const ClassesPage = React.lazy(() => import('./pages/ClassesPage'));
const ExamsPage = React.lazy(() => import('./pages/ExamsPage'));
const LookupPage = React.lazy(() => import('./pages/LookupPage'));

import MobileNavigation from './components/MobileNavigation';

const ProtectedLayout = () => {
  const token = localStorage.getItem('token');
  const [profileUpdated, setProfileUpdated] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    // Tự động làm mới thông tin user ngầm để cập nhật roles/permissions mới nhất
    if (token) {
      api.get('/me').then(res => {
        localStorage.setItem('user', JSON.stringify(res.data));
        setProfileUpdated(true);
      }).catch(err => {
        console.warn('Lỗi làm mới profile:', err);
        setProfileUpdated(true); // Vẫn cho render dù lỗi
      }).finally(() => {
        setIsInitializing(false);
      });
    } else {
      setIsInitializing(false);
    }
  }, [token]);

  // Nếu chưa đăng nhập -> Đẩy ngay về trang /login
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  // Hiển thị màn hình chờ khi đang check phiên đăng nhập
  if (isInitializing) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-100 dark:bg-slate-900 transition-colors duration-300">
        <img src="/logo.png" alt="Sunny Logo" className="h-24 mb-6 animate-pulse object-contain drop-shadow-lg" />
        <p className="text-cyan-700 dark:text-cyan-400 font-bold animate-pulse text-lg tracking-wide">Đang tải dữ liệu hệ thống...</p>
      </div>
    );
  }

  // Nếu đã đăng nhập -> Hiển thị Sidebar + Nội dung trang bên phải
  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-slate-100 dark:bg-slate-900 dark:text-slate-200 transition-colors duration-300">
      <Sidebar />
      <MobileNavigation />
      <main className="flex-1 p-3 sm:p-6 overflow-y-auto pt-24 pb-20 lg:pt-6 lg:pb-6">
        <React.Suspense fallback={
          <div className="flex h-full items-center justify-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-cyan-600"></div>
          </div>
        }>
          <Outlet />
        </React.Suspense>
      </main>
    </div>
  );
};

// 2. Component CÔNG KHAI: Nếu ĐÃ ĐĂNG NHẬP rồi thì không cho quay lại trang /login nữa
const PublicOnlyRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  
  if (token) {
    const isMember = user.roles?.includes('member');
    const isAccountant = user.roles?.includes('accountant');

    if (isMember) {
      return <Navigate to="/students" replace />;
    }
    if (isAccountant) {
      return <Navigate to="/pos" replace />;
    }
    return <Navigate to="/" replace />;
  }
  
  return children;
};

// 3. Component BẢO VỆ PERMISSION: Dành cho dynamic RBAC
const PermissionRoute = ({ permission, children }) => {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const userPerms = user.permissions || [];
  
  const hasPermission = userPerms.includes(permission);

  if (!hasPermission) {
    return <Navigate to="/students" replace />;
  }
  
  return children ? children : <Outlet />;
};

import ErrorBoundary from './components/ErrorBoundary';

export default function App() {
  useEffect(() => {
    // Khởi tạo Dark Mode
    if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  return (
    <ErrorBoundary>
      <Toaster position="top-right" richColors />
      <Router>
        <Routes>
        {/* Route Đăng nhập (Màn hình độc lập, KHÔNG có Sidebar) */}
        <Route 
          path="/login" 
          element={
            <PublicOnlyRoute>
              <LoginPage />
            </PublicOnlyRoute>
          } 
        />

        {/* Cổng tra cứu điểm công khai */}
        <Route path="/tra-cuu" element={<LookupPage />} />

        {/* Các Route được bảo vệ (Bắt buộc phải Đăng nhập mới xem được) */}
        <Route element={<ProtectedLayout />}>
          {/* Dành cho MỌI USER đã đăng nhập */}
          <Route path="/profile" element={<ProfilePage />} />
          
          {/* Cần quyền view_classes, view_students, manage_attendance */}
          <Route element={<PermissionRoute permission="view_classes" />}>
            <Route path="/classes" element={<ClassesPage />} />
          </Route>
          <Route element={<PermissionRoute permission="view_students" />}>
            <Route path="/students" element={<StudentsPage />} />
          </Route>
          <Route element={<PermissionRoute permission="manage_attendance" />}>
            <Route path="/attendance" element={<AttendancePage />} />
          </Route>
          <Route element={<PermissionRoute permission="manage_exams" />}>
            <Route path="/exams" element={<ExamsPage />} />
          </Route>
          
          {/* Cần quyền hệ thống */}
          <Route element={<PermissionRoute permission="view_dashboard" />}>
            <Route path="/" element={<DashboardPage />} />
          </Route>
          <Route element={<PermissionRoute permission="manage_users" />}>
            <Route path="/users" element={<UsersPage />} />
          </Route>
          <Route element={<PermissionRoute permission="manage_roles" />}>
            <Route path="/roles" element={<RolesPage />} />
            <Route path="/branches" element={<BranchesPage />} />
          </Route>
          <Route element={<PermissionRoute permission="view_audit_logs" />}>
            <Route path="/audit-logs" element={<AuditLogPage />} />
          </Route>
          
          {/* Dành cho Admin và Kế toán */}
          <Route element={<PermissionRoute permission="view_finance" />}>
            <Route path="/pos" element={<PosPage />} />
          </Route>
        </Route>

        {/* Nếu gõ đường dẫn lạ/sai -> Tự động chuyển về trang chủ */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
    </ErrorBoundary>
  );
}

