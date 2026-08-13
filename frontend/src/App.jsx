import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { Toaster } from 'sonner';
import Sidebar from './components/Sidebar';

// Import các trang
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import StudentsPage from './pages/StudentsPage';
import AttendancePage from './pages/AttendancePage';
import PosPage from './pages/PosPage';
import UsersPage from './pages/UsersPage';
import AttendanceLogsPage from './pages/AttendanceLogsPage';

import MobileNavigation from './components/MobileNavigation';

// 1. Component BẢO VỆ ROUTE: Chỉ hiển thị Sidebar & Nội dung khi ĐÃ DĂNG NHẬP (có Token)
const ProtectedLayout = () => {
  const token = localStorage.getItem('token');

  // Nếu chưa đăng nhập -> Đẩy ngay về trang /login
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  // Nếu đã đăng nhập -> Hiển thị Sidebar + Nội dung trang bên phải
  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-slate-100 dark:bg-slate-900 dark:text-slate-200 transition-colors duration-300">
      <Sidebar />
      <MobileNavigation />
      <main className="flex-1 p-3 sm:p-6 overflow-y-auto pt-24 pb-20 lg:pt-6 lg:pb-6">
        <Outlet />
      </main>
    </div>
  );
};

// 2. Component CÔNG KHAI: Nếu ĐÃ ĐĂNG NHẬP rồi thì không cho quay lại trang /login nữa
const PublicOnlyRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  
  if (token) {
    return <Navigate to="/" replace />;
  }
  
  return children;
};

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
    <>
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

        {/* Các Route được bảo vệ (Bắt buộc phải Đăng nhập mới xem được) */}
        <Route element={<ProtectedLayout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/students" element={<StudentsPage />} />
          <Route path="/attendance" element={<AttendancePage />} />
          <Route path="/attendance-logs" element={<AttendanceLogsPage />} />
          <Route path="/pos" element={<PosPage />} />
          <Route path="/users" element={<UsersPage />} />
        </Route>

        {/* Nếu gõ đường dẫn lạ/sai -> Tự động chuyển về trang chủ */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
    </>
  );
}