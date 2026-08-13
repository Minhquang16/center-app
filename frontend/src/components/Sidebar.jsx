import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import api from '../api/axios';
import Swal from 'sweetalert2';
import { 
  LayoutDashboard, 
  Users, 
  QrCode, 
  CreditCard, 
  Menu, 
  LogOut, 
  User,
  Sun,
  Moon,
  History
} from 'lucide-react';

export default function Sidebar() {
  const location = useLocation();
  const [isDark, setIsDark] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(true); 

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains('dark'));
  }, []);

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

  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const handleLogout = async (e) => {
    e.preventDefault();
    e.stopPropagation();

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

  const menuItems = [
    { path: '/', label: 'Bảng Điều Khiển', icon: LayoutDashboard },
    { path: '/students', label: 'Quản lý Học sinh', icon: Users },
    { path: '/attendance', label: 'Điểm danh QR', icon: QrCode },
    { path: '/attendance-logs', label: 'Lịch sử Điểm danh', icon: History },
    { path: '/pos', label: 'Thu tiền POS', icon: CreditCard },
  ];

  return (
    <aside 
      className={`hidden lg:flex fixed sticky top-4 ml-4 my-4 z-50 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex-col justify-between transition-all duration-300 shadow-xl rounded-3xl border border-slate-100 dark:border-slate-700 print:hidden ${
        isCollapsed ? 'w-20' : 'w-64'
      } h-[calc(100vh-2rem)]`}
    >
      <div className="flex flex-col space-y-2 p-3">
        
        <div className={`w-full flex items-center h-20 ${!isCollapsed ? 'justify-between px-2' : 'justify-center gap-[2px]'}`}>
          {!isCollapsed ? (
            <Link to="/" className="flex items-center">
              <img src="/logo.png" alt="Sunny Education" className="h-14 object-contain" onError={(e) => { e.target.onerror = null; e.target.style.display='none'; e.target.nextSibling.style.display='block'; }} />
            </Link>
          ) : (
            <Link to="/" className="flex items-center justify-center w-8">
              <span className="font-black text-2xl text-orange-500 tracking-tighter">S</span>
            </Link>
          )}
          
          {/* Desktop Menu Toggle */}
          <button 
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="flex items-center justify-center p-1.5 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-orange-500 transition-colors cursor-pointer"
          >
            <Menu className="w-6 h-6" />
          </button>
        </div>

        <div className="h-px bg-slate-100 dark:bg-slate-700/50 w-full mb-2 mt-1"></div>

        {/* Danh sách Menu */}
        <nav className="w-full space-y-1.5 flex-1 overflow-y-auto overflow-x-hidden scrollbar-hide py-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`relative flex items-center p-3 rounded-2xl transition-all duration-300 group mx-1 ${
                  isActive 
                    ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md shadow-orange-500/20 font-bold' 
                    : 'text-slate-500 dark:text-slate-400 hover:bg-orange-50 dark:hover:bg-slate-700 hover:text-orange-600 dark:hover:text-amber-400 font-semibold'
                }`}
              >
                <div className={`flex items-center justify-center transition-all duration-300 flex-shrink-0 ${isCollapsed ? 'w-full' : 'w-5'}`}>
                  <Icon className={`w-5 h-5 ${isActive ? 'text-white' : ''}`} />
                </div>
                <span className={`text-[13px] whitespace-nowrap overflow-hidden transition-all duration-300 ${isCollapsed ? 'max-w-0 opacity-0 ml-0' : 'max-w-[200px] opacity-100 ml-3'}`}>
                  {item.label}
                </span>
                
                {/* Tooltip khi thu gọn */}
                {isCollapsed && (
                  <div className="absolute left-16 bg-slate-800 dark:bg-slate-700 text-white text-xs font-bold px-3 py-2 rounded-xl shadow-xl opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all whitespace-nowrap z-50 pointer-events-none">
                    {item.label}
                  </div>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer Actions & Profile */}
      <div className="p-3 space-y-2">
        <div className="h-px bg-slate-100 dark:bg-slate-700/50 w-full mb-3"></div>
        
        {/* Theme Toggle */}
        <button
          type="button"
          onClick={toggleTheme}
          className={`p-3 rounded-2xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white transition-all duration-300 w-full flex items-center group relative cursor-pointer mx-1`}
        >
          <div className={`flex items-center justify-center flex-shrink-0 transition-all duration-300 ${isCollapsed ? 'w-full' : 'w-5'}`}>
            {isDark ? <Sun className="w-5 h-5 text-amber-500" /> : <Moon className="w-5 h-5 text-slate-600" />}
          </div>
          <span className={`text-[13px] font-semibold whitespace-nowrap overflow-hidden transition-all duration-300 ${isCollapsed ? 'max-w-0 opacity-0 ml-0' : 'max-w-[200px] opacity-100 ml-3'}`}>
            {isDark ? 'Chế độ Sáng' : 'Chế độ Tối'}
          </span>
          {isCollapsed && (
            <div className="absolute left-16 bg-slate-800 dark:bg-slate-700 text-white text-xs font-bold px-3 py-2 rounded-xl shadow-xl opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all whitespace-nowrap z-50 pointer-events-none">
              {isDark ? 'Chế độ Sáng' : 'Chế độ Tối'}
            </div>
          )}
        </button>

        {/* Profile / Logout section */}
        <div className={`mt-2 flex items-center rounded-2xl bg-slate-50 dark:bg-slate-700/30 border border-slate-100 dark:border-slate-700 p-2 transition-all duration-300 mx-1 ${
          isCollapsed ? 'flex-col space-y-2 justify-center' : 'justify-between'
        }`}>
          <Link 
            to="/users"
            className={`flex items-center cursor-pointer group hover:opacity-80 transition-opacity flex-1 overflow-hidden ${isCollapsed ? 'justify-center w-full' : 'gap-2'}`}
          >
            <div className="w-9 h-9 flex-shrink-0 rounded-xl bg-orange-100 dark:bg-orange-900/50 text-orange-600 dark:text-orange-400 flex items-center justify-center mx-auto transition-all duration-300">
              <User className="w-5 h-5" />
            </div>
            <div className={`flex flex-col whitespace-nowrap overflow-hidden transition-all duration-300 ${isCollapsed ? 'max-w-0 opacity-0' : 'max-w-[150px] opacity-100 ml-1'}`}>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                {user.name || 'Admin'}
              </span>
              <span className="text-[10px] text-slate-400 font-medium truncate">Quản trị viên</span>
            </div>
          </Link>
          
          <button
            onClick={handleLogout}
            title="Đăng xuất"
            className={`p-2 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors flex-shrink-0 ${
              isCollapsed ? 'w-full flex justify-center mt-1' : ''
            }`}
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}