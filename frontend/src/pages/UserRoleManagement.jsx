import React, { useState } from 'react';
import { Users, Shield } from 'lucide-react';
import UsersPage from './UsersPage';
import RolesPage from './RolesPage';

export default function UserRoleManagement() {
  const [activeTab, setActiveTab] = useState('users');

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-800 dark:text-white flex items-center gap-3">
            <Users className="w-8 h-8 text-amber-600" />
            Tài khoản & Phân quyền
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2">
            Quản lý tài khoản truy cập và thiết lập quyền hạn hệ thống.
          </p>
        </div>
      </div>

      <div className="flex overflow-x-auto hide-scrollbar bg-slate-200/50 dark:bg-slate-800/50 p-1 rounded-2xl max-w-fit">
        <button
          onClick={() => setActiveTab('users')}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${activeTab === 'users' ? 'bg-white dark:bg-slate-700 text-amber-600 dark:text-amber-400 shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:bg-white/50 dark:hover:bg-slate-700/50'}`}
        >
          <Users className="w-4 h-4" /> Danh sách Tài khoản
        </button>
        <button
          onClick={() => setActiveTab('roles')}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${activeTab === 'roles' ? 'bg-white dark:bg-slate-700 text-amber-600 dark:text-amber-400 shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:bg-white/50 dark:hover:bg-slate-700/50'}`}
        >
          <Shield className="w-4 h-4" /> Vai trò & Quyền
        </button>
      </div>

      <div className="pt-2">
        {activeTab === 'users' && <UsersPage isEmbedded={true} />}
        {activeTab === 'roles' && <RolesPage isEmbedded={true} />}
      </div>
    </div>
  );
}
