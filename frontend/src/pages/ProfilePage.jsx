import React, { useState, useEffect } from 'react';
import { User, Mail, Lock, Save, Shield } from 'lucide-react';
import api from '../api/axios';
import { toast } from 'sonner';

export default function ProfilePage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: ''
  });
  
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user') || '{}'));
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setFormData({
      name: user.name || '',
      email: user.email || '',
      password: ''
    });
  }, [user]);

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      // Gọi API cập nhật profile
      const response = await api.put('/profile', formData);
      toast.success('Cập nhật thông tin thành công!');
      
      // Cập nhật localStorage và state
      const updatedUser = { ...user, ...response.data.user };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser);
      setFormData(prev => ({ ...prev, password: '' })); // Reset password field
    } catch (error) {
      console.error("Lỗi cập nhật profile:", error);
      toast.error(error.response?.data?.message || 'Không thể cập nhật thông tin');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getRoleName = (user) => {
    if (user.roles?.includes('admin')) return 'Quản trị viên';
    if (user.roles?.[0]) {
      return user.roles[0];
    }
    return 'Thành viên';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm dark:shadow-none dark:shadow-none border border-slate-100 dark:border-slate-700/50 dark:border-slate-700/50 dark:border-slate-700">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-200 dark:text-slate-200 dark:text-slate-200 flex items-center gap-3">
            <div className="p-2 bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 rounded-lg">
              <User className="w-6 h-6" />
            </div>
            Hồ Sơ Cá Nhân
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-400 dark:text-slate-400 mt-1">
            Cập nhật thông tin đăng nhập và mật khẩu
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm dark:shadow-none dark:shadow-none border border-slate-100 dark:border-slate-700/50 dark:border-slate-700/50 dark:border-slate-700 p-6 md:p-8 max-w-2xl mx-auto">
        
        {/* Avatar Placeholder */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-orange-400 to-amber-300 flex items-center justify-center text-white text-3xl font-bold shadow-lg dark:shadow-none dark:shadow-none shadow-orange-500/30 mb-4">
            {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 dark:text-slate-300 dark:text-slate-300 capitalize">
            <Shield className="w-4 h-4 text-orange-500" />
            {getRoleName(user)}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 dark:text-slate-300 dark:text-slate-300 flex items-center gap-1.5">
              <User className="w-4 h-4" /> Họ và tên <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              required
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 dark:border-slate-700 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-400/50 bg-white dark:bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white transition-all shadow-sm dark:shadow-none dark:shadow-none"
              placeholder="Nhập họ và tên..."
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 dark:text-slate-300 dark:text-slate-300 flex items-center gap-1.5">
              <Mail className="w-4 h-4" /> Email đăng nhập <span className="text-rose-500">*</span>
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              required
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 dark:border-slate-700 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-400/50 bg-white dark:bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white transition-all shadow-sm dark:shadow-none dark:shadow-none"
              placeholder="example@email.com"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 dark:text-slate-300 dark:text-slate-300 flex items-center gap-1.5">
              <Lock className="w-4 h-4" /> Mật khẩu (để trống nếu không đổi)
            </label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 dark:border-slate-700 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-400/50 bg-white dark:bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white transition-all shadow-sm dark:shadow-none dark:shadow-none"
              placeholder="••••••••"
              minLength={6}
            />
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white px-5 py-3 rounded-xl font-bold transition-all shadow-lg dark:shadow-none dark:shadow-none shadow-orange-500/30 disabled:opacity-70"
            >
              <Save className="w-5 h-5" />
              {isSubmitting ? 'Đang lưu...' : 'Lưu Thay Đổi'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
