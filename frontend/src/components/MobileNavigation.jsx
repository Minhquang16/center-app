import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import api from '../api/axios';
import Swal from 'sweetalert2';
import { 
  Home, 
  Users, 
  QrCode, 
  CreditCard, 
  Menu,
  LogOut,
  Sun,
  Moon,
  History,
  X,
  User as UserIcon,
  GraduationCap,
  Shield
} from 'lucide-react';
import NotificationBell from './NotificationBell';

export default function MobileNavigation() {
  const location = useLocation();
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains('dark'));
  }, []);

  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const toggleTheme = () => {
    if (isDark) {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
      setIsDark(false);
    } else {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
      setIsDark(true);
    }
  };

  const handleLogout = async (e) => {
    e.preventDefault();
    const result = await Swal.fire({
      title: 'Đăng xuất?',
      text: "Bạn có chắc chắn muốn đăng xuất khỏi hệ thống?",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#f97316',
      cancelButtonColor: '#ef4444',
      confirmButtonText: 'Đăng xuất',
      cancelButtonText: 'Hủy'
    });

    if (result.isConfirmed) {
      try {
        await api.post('/logout');
      } catch (err) {
        console.warn("Lỗi API logout:", err);
      } finally {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }
  };

  const navItems = [
    { path: '/classes', label: 'Lớp học', icon: Users, permission: 'view_classes' },
    { path: '/attendance', label: 'Điểm danh', icon: QrCode, permission: 'manage_attendance' },
    { path: '/', label: 'Tổng quan', icon: Home, permission: 'view_dashboard' },
    { path: '/pos', label: 'Học phí', icon: CreditCard, permission: 'view_finance' },
  ].filter(item => {
    const perms = user.permissions || [];
    return perms.includes(item.permission);
  });

  return (
    <div className="lg:hidden">
      {/* Mobile Top Header */}
      <div className="fixed top-0 left-0 right-0 h-20 z-40 bg-white dark:bg-slate-800 dark:bg-slate-900 flex items-center justify-between px-4 shadow-sm dark:shadow-none dark:shadow-none border-b border-slate-100 dark:border-slate-700/50 dark:border-slate-700/50 dark:border-slate-800">
        
        {/* Logo thay thế 3 gạch */}
        <div className="flex items-center -ml-2">
          <img src="/logo.png" alt="Logo" className="h-12 w-auto max-w-[200px] object-contain" onError={(e) => { e.target.onerror = null; e.target.style.display='none'; e.target.nextSibling.style.display='block'; }} />
        </div>
        
        {/* Không còn chữ SUNNY EDUCATION ở giữa, có thể để trống hoặc đẩy flex sang 2 bên */}
        <div className="flex-1"></div>

        {/* Nút Chế độ sáng tối và Avatar */}
        <div className="flex items-center gap-3">
          <button 
            onClick={toggleTheme}
            className="p-2 -mr-2 text-slate-500 dark:text-slate-400 dark:text-slate-400 hover:bg-slate-100 dark:bg-slate-700/50 dark:bg-slate-700/50 dark:hover:bg-slate-800 rounded-full transition-colors"
          >
            {isDark ? <Sun className="w-6 h-6 text-amber-500" /> : <Moon className="w-6 h-6" />}
          </button>
          <NotificationBell />
          <Link to="/profile" className="w-8 h-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center border border-orange-200">
            <UserIcon className="w-5 h-5" />
          </Link>
        </div>
      </div>

      {/* "Thêm" Menu Bottom Sheet */}
      {showMoreMenu && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={() => setShowMoreMenu(false)}></div>
          <div className="relative bg-white dark:bg-slate-800 w-full rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl animate-in slide-in-from-bottom-full duration-300">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 dark:text-slate-200 dark:text-white">Menu Mở Rộng</h3>
              <button onClick={() => setShowMoreMenu(false)} className="p-2 bg-slate-100 dark:bg-slate-700/50 dark:bg-slate-700/50 dark:bg-slate-700 rounded-full text-slate-500 dark:text-slate-400 dark:text-slate-400 hover:text-slate-800 dark:text-slate-200 dark:text-slate-200 dark:hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-3">
              {(user.permissions?.includes('manage_exams') || user.roles?.includes('admin')) && (
                <Link to="/exams" onClick={() => setShowMoreMenu(false)} className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 dark:bg-slate-700/50 text-slate-700 dark:text-slate-300 font-semibold hover:bg-orange-50 hover:text-orange-600 transition-colors">
                  <GraduationCap className="w-6 h-6 text-cyan-500" />
                  Quản lý Kỳ thi
                </Link>
              )}
              {(user.permissions?.includes('manage_users') || user.roles?.includes('admin')) && (
                <Link to="/users" onClick={() => setShowMoreMenu(false)} className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 dark:bg-slate-700/50 text-slate-700 dark:text-slate-300 font-semibold hover:bg-orange-50 hover:text-orange-600 transition-colors">
                  <Shield className="w-6 h-6 text-amber-500" />
                  Tài khoản & Phân quyền
                </Link>
              )}
              {(user.permissions?.includes('view_audit_logs') || user.roles?.includes('admin')) && (
                <Link to="/audit-logs" onClick={() => setShowMoreMenu(false)} className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 dark:bg-slate-700/50 text-slate-700 dark:text-slate-300 font-semibold hover:bg-orange-50 hover:text-orange-600 transition-colors">
                  <History className="w-6 h-6 text-emerald-500" />
                  Lịch sử lưu vết
                </Link>
              )}

              <button onClick={handleLogout} className="w-full flex items-center gap-4 p-4 rounded-2xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 font-semibold hover:bg-red-100 transition-colors">
                <LogOut className="w-6 h-6" />
                Đăng xuất khỏi hệ thống
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 h-16 z-40 bg-white dark:bg-slate-800 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-700/50 dark:border-slate-700/50 dark:border-slate-800 flex items-center justify-around px-2 pb-safe shadow-[0_-4px_20px_rgba(0,0,0,0.05)] dark:shadow-none">
        {navItems.map((item, index) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          
          return (
            <React.Fragment key={item.path}>
              <Link
                to={item.path}
                className={`flex flex-col items-center justify-center w-16 h-full space-y-1 transition-colors ${
                  isActive ? 'text-orange-500' : 'text-slate-400 hover:text-slate-600 dark:text-slate-400 dark:text-slate-400 dark:hover:text-slate-300'
                }`}
              >
                <Icon className={`w-6 h-6 ${isActive ? 'fill-orange-100 dark:fill-orange-900/30' : ''}`} strokeWidth={isActive ? 2.5 : 2} />
                <span className={`text-[10px] ${isActive ? 'font-bold' : 'font-medium'}`}>{item.label}</span>
              </Link>
            </React.Fragment>
          );
        })}
        
        <button
          onClick={() => setShowMoreMenu(true)}
          className={`flex flex-col items-center justify-center w-16 h-full space-y-1 transition-colors ${
            showMoreMenu ? 'text-orange-500' : 'text-slate-400 hover:text-slate-600 dark:text-slate-400 dark:text-slate-400 dark:hover:text-slate-300'
          }`}
        >
          <Menu className={`w-6 h-6 ${showMoreMenu ? 'fill-orange-100 dark:fill-orange-900/30' : ''}`} strokeWidth={showMoreMenu ? 2.5 : 2} />
          <span className={`text-[10px] ${showMoreMenu ? 'font-bold' : 'font-medium'}`}>Thêm</span>
        </button>
      </div>
    </div>
  );
}
