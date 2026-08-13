import React from 'react';
import { Link, Outlet } from 'react-router-dom';
import { Users, QrCode, CreditCard, BookOpen, LayoutDashboard } from 'lucide-react';

export default function Layout() {
  return (
    <div className="flex h-screen bg-gray-100 font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col">
        <div className="p-5 text-xl font-bold border-b border-slate-800 text-blue-400">
          MATH CENTER POS
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <Link to="/" className="flex items-center space-x-3 p-3 rounded-lg hover:bg-slate-800 text-gray-300 hover:text-white">
            <Users className="w-5 h-5" /> <span>Quản lý Học sinh</span>
          </Link>
          <Link to="/attendance" className="flex items-center space-x-3 p-3 rounded-lg hover:bg-slate-800 text-gray-300 hover:text-white">
            <QrCode className="w-5 h-5" /> <span>Điểm danh QR</span>
          </Link>
          <Link to="/pos" className="flex items-center space-x-3 p-3 rounded-lg hover:bg-slate-800 text-gray-300 hover:text-white">
            <CreditCard className="w-5 h-5" /> <span>Thu tiền POS (K80)</span>
          </Link>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-8">
        <Outlet />
      </main>
    </div>
  );
}