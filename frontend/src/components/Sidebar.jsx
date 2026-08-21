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
  History,
  Shield,
  GraduationCap,
  Building2,
  ChevronDown
} from 'lucide-react';
import NotificationBell from './NotificationBell';

export default function Sidebar() {
  const location = useLocation();
  const [isDark, setIsDark] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(true); 
  const [openSubMenus, setOpenSubMenus] = useState({});

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

  const toggleSubMenu = (label, e) => {
    e.preventDefault();
    if (isCollapsed) setIsCollapsed(false); // expand sidebar if clicking submenu while collapsed
    setOpenSubMenus(prev => ({ ...prev, [label]: !prev[label] }));
  };

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdmin = user.roles?.includes('admin');
  const isSuperAdmin = isAdmin && !user.branch_id;

  const [branches, setBranches] = useState([]);
  const [activeBranch, setActiveBranch] = useState(localStorage.getItem('active_branch_id') || '');

  useEffect(() => {
    if (isSuperAdmin) {
      api.get('/branches').then(res => {
        setBranches(res.data);
      }).catch(err => console.log('Lỗi tải cơ sở:', err));
    }
  }, [isSuperAdmin]);

  const handleBranchChange = (e) => {
    const val = e.target.value;
    setActiveBranch(val);
    if (val) {
      localStorage.setItem('active_branch_id', val);
    } else {
      localStorage.removeItem('active_branch_id');
    }
    window.location.reload(); // Reload trang để áp dụng scope mới
  };

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
    { path: '/', label: 'Bảng Điều Khiển', icon: LayoutDashboard, permission: 'view_dashboard' },
    { path: '/classes', label: 'Quản lý Lớp học', icon: Users, permission: 'view_classes' },
    { path: '/attendance', label: 'Điểm danh QR', icon: QrCode, permission: 'manage_attendance' },
    { path: '/exams', label: 'Quản lý Kỳ thi', icon: GraduationCap, permission: 'manage_exams' },
    { path: '/pos', label: 'Thu tiền POS', icon: CreditCard, permission: 'view_finance' },
    { 
      label: 'Tài khoản & Phân quyền', 
      icon: Shield,
      subItems: [
        { path: '/users', label: 'Tài khoản', permission: 'manage_users' },
        { path: '/roles', label: 'Phân quyền', permission: 'manage_roles' },
        { path: '/branches', label: 'Cơ sở', icon: Building2, permission: 'manage_roles' }
      ]
    },
    { path: '/audit-logs', label: 'Nhật ký hệ thống', icon: History, permission: 'view_audit_logs' },
  ].filter(item => {
    const perms = user.permissions || [];
    if (item.subItems) {
      item.subItems = item.subItems.filter(sub => perms.includes(sub.permission));
      return item.subItems.length > 0;
    }
    return perms.includes(item.permission);
  });

  return (
    <aside 
      className={`hidden lg:flex fixed sticky top-4 ml-4 my-4 z-50 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 dark:text-slate-300 dark:text-slate-300 flex-col justify-between transition-all duration-300 shadow-xl dark:shadow-none dark:shadow-none rounded-3xl border border-slate-100 dark:border-slate-700/50 dark:border-slate-700/50 dark:border-slate-700 print:hidden ${
        isCollapsed ? 'w-20' : 'w-64'
      } h-[calc(100vh-2rem)]`}
    >
      <div className="flex flex-col space-y-2 p-3 flex-1 overflow-hidden">
        
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
            className="flex items-center justify-center p-1.5 rounded-xl text-slate-400 hover:bg-slate-100 dark:bg-slate-700/50 dark:hover:bg-slate-700 hover:text-orange-500 transition-colors cursor-pointer"
          >
            <Menu className="w-6 h-6" />
          </button>
        </div>

        <div className="h-px bg-slate-100 dark:bg-slate-700/50 w-full mb-2 mt-1"></div>

        {/* Danh sách Menu */}
        <nav className="w-full space-y-1.5 flex-1 overflow-y-auto overflow-x-hidden py-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {menuItems.map((item) => {
            const Icon = item.icon;
            
            if (item.subItems) {
              const isActive = item.subItems.some(sub => location.pathname === sub.path);
              const isOpen = openSubMenus[item.label] || (!isCollapsed && isActive);

              return (
                <div key={item.label} className="mx-1">
                  <div
                    onClick={(e) => toggleSubMenu(item.label, e)}
                    className={`relative flex items-center p-3 rounded-2xl transition-all duration-300 group cursor-pointer ${
                      isActive && !isOpen
                        ? 'bg-orange-50 dark:bg-slate-700 text-orange-600 dark:text-amber-400 font-bold'
                        : 'text-slate-500 dark:text-slate-400 hover:bg-orange-50 dark:hover:bg-slate-700 hover:text-orange-600 dark:hover:text-amber-400 font-semibold'
                    }`}
                  >
                    <div className={`flex items-center justify-center transition-all duration-300 flex-shrink-0 ${isCollapsed ? 'w-full' : 'w-5'}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className={`text-[13px] whitespace-nowrap overflow-hidden transition-all duration-300 ${isCollapsed ? 'max-w-0 opacity-0 ml-0' : 'max-w-[200px] opacity-100 ml-3 flex-1'}`}>
                      {item.label}
                    </span>
                    {!isCollapsed && (
                      <span className="ml-auto opacity-50">
                        <svg className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </span>
                    )}

                    {/* Tooltip khi thu gọn */}
                    {isCollapsed && (
                      <div className="absolute left-16 bg-slate-800 dark:bg-slate-700 text-white text-xs font-bold px-3 py-2 rounded-xl shadow-xl opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all whitespace-nowrap z-50 pointer-events-none">
                        {item.label}
                      </div>
                    )}
                  </div>
                  
                  {/* Submenu Items */}
                  {!isCollapsed && isOpen && (
                    <div className="mt-1 mb-2 ml-4 pl-4 border-l-2 border-slate-100 dark:border-slate-700/50 space-y-1">
                      {item.subItems.map(sub => (
                        <Link
                          key={sub.path}
                          to={sub.path}
                          className={`flex items-center p-2.5 rounded-xl transition-all duration-300 text-[13px] font-semibold ${
                            location.pathname === sub.path
                              ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md shadow-orange-500/20 font-bold'
                              : 'text-slate-500 dark:text-slate-400 hover:bg-orange-50 dark:hover:bg-slate-700 hover:text-orange-600 dark:hover:text-amber-400'
                          }`}
                        >
                          {sub.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            }

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
      <div className="p-3 space-y-2 flex-shrink-0">
        <div className="h-px bg-slate-100 dark:bg-slate-700/50 w-full mb-3"></div>

        {/* Branch Selector (Chỉ dành cho Super Admin) */}
        {isSuperAdmin && !isCollapsed && branches.length > 0 && (
          <div className="mx-1 mb-3">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider pl-2 mb-1 block">
              Đang làm việc tại
            </label>
            <div className="relative">
              <select
                value={activeBranch}
                onChange={handleBranchChange}
                className="w-full appearance-none bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-sm font-semibold rounded-xl px-4 py-2.5 pr-10 focus:outline-none focus:ring-2 focus:ring-orange-500 cursor-pointer"
              >
                <option value="">🏢 Tất cả cơ sở (Gộp)</option>
                {branches.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
          </div>
        )}
        
        {/* Theme Toggle */}
        <button
          type="button"
          onClick={toggleTheme}
          className={`p-3 rounded-2xl text-slate-500 dark:text-slate-400 dark:text-slate-400 dark:text-slate-400 hover:bg-slate-100 dark:bg-slate-700/50 dark:bg-slate-700/50 dark:hover:bg-slate-700 hover:text-slate-900 dark:text-white dark:hover:text-white transition-all duration-300 w-full flex items-center group relative cursor-pointer mx-1`}
        >
          <div className={`flex items-center justify-center flex-shrink-0 transition-all duration-300 ${isCollapsed ? 'w-full' : 'w-5'}`}>
            {isDark ? <Sun className="w-5 h-5 text-amber-500" /> : <Moon className="w-5 h-5 text-slate-600 dark:text-slate-400 dark:text-slate-400" />}
          </div>
          <span className={`text-[13px] font-semibold whitespace-nowrap overflow-hidden transition-all duration-300 ${isCollapsed ? 'max-w-0 opacity-0 ml-0' : 'max-w-[200px] opacity-100 ml-3'}`}>
            {isDark ? 'Chế độ Sáng' : 'Chế độ Tối'}
          </span>
          {/* Tooltip khi thu gọn */}
          {isCollapsed && (
            <div className="absolute left-16 bg-slate-800 dark:bg-slate-700 text-white text-xs font-bold px-3 py-2 rounded-xl shadow-xl dark:shadow-none opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all whitespace-nowrap z-50 pointer-events-none">
              {isDark ? 'Chế độ Sáng' : 'Chế độ Tối'}
            </div>
          )}
        </button>

        <div className={`flex items-center justify-center transition-all duration-300 mx-1 p-0.5 ${isCollapsed ? 'w-full' : 'w-full justify-start'}`}>
          <NotificationBell align="left" label={!isCollapsed ? 'Thông báo' : null} />
        </div>

        {/* Profile / Logout section */}
        <div className={`mt-2 flex items-center rounded-2xl bg-slate-50 dark:bg-slate-900/50 dark:bg-slate-900/50 dark:bg-slate-700/30 border border-slate-100 dark:border-slate-700/50 dark:border-slate-700/50 dark:border-slate-700 p-2 transition-all duration-300 mx-1 ${
          isCollapsed ? 'flex-col space-y-2 justify-center' : 'justify-between'
        }`}>
          <Link 
            to="/profile"
            className={`flex items-center cursor-pointer group hover:opacity-80 transition-opacity flex-1 overflow-hidden ${isCollapsed ? 'justify-center w-full' : 'gap-2'}`}
          >
            <div className="w-9 h-9 flex-shrink-0 rounded-xl bg-orange-100 dark:bg-orange-900/50 text-orange-600 dark:text-orange-400 flex items-center justify-center mx-auto transition-all duration-300">
              <User className="w-5 h-5" />
            </div>
            <div className={`flex flex-col whitespace-nowrap overflow-hidden transition-all duration-300 ${isCollapsed ? 'max-w-0 opacity-0' : 'max-w-[150px] opacity-100 ml-1'}`}>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 dark:text-slate-200 dark:text-slate-200 truncate">
                {user.name || 'Admin'}
              </span>
              <span className="text-[10px] text-slate-400 font-medium truncate capitalize">
                {user.roles?.includes('admin') ? 'Quản trị hệ thống' : (user.roles?.[0] || 'Thành viên')}
              </span>
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
