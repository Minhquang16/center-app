import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import Swal from 'sweetalert2';
import { toast } from 'sonner';
import { Shield, Plus, Edit, Trash2, Save, X, CheckSquare } from 'lucide-react';

export const PERMISSION_LABELS = {
  'manage_users': 'Quản lý người dùng',
  'manage_roles': 'Quản lý phân quyền',
  'view_dashboard': 'Xem bảng điều khiển',
  'view_audit_logs': 'Xem lịch sử hệ thống',
  'view_students': 'Xem ds học sinh',
  'edit_students': 'Thêm/sửa học sinh',
  'delete_students': 'Xóa học sinh',
  'view_classes': 'Xem lớp học',
  'edit_classes': 'Thêm/sửa lớp học',
  'delete_classes': 'Xóa lớp học',
  'manage_attendance': 'Quản lý điểm danh',
  'manage_exams': 'Quản lý kỳ thi',
  'view_finance': 'Xem tài chính',
  'manage_finance': 'Quản lý tài chính',
};

export default function RolesPage({ isEmbedded = false }) {
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [formData, setFormData] = useState({ name: '', permissions: [] });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [rolesRes, permsRes] = await Promise.all([
        api.get('/roles'),
        api.get('/permissions')
      ]);
      setRoles(rolesRes.data);
      setPermissions(permsRes.data);
    } catch (error) {
      toast.error('Lỗi khi tải dữ liệu vai trò/quyền');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenAdd = () => {
    setEditingRole(null);
    setFormData({ name: '', permissions: [] });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (role) => {
    setEditingRole(role);
    setFormData({ 
      name: role.name, 
      permissions: role.permissions.map(p => p.name) 
    });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleCheckboxChange = (permName) => {
    setFormData(prev => {
      const perms = prev.permissions.includes(permName)
        ? prev.permissions.filter(p => p !== permName)
        : [...prev.permissions, permName];
      return { ...prev, permissions: perms };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name) {
      toast.error('Tên vai trò không được để trống');
      return;
    }

    try {
      if (editingRole) {
        await api.put(`/roles/${editingRole.id}`, formData);
        toast.success('Cập nhật vai trò thành công');
      } else {
        await api.post('/roles', formData);
        toast.success('Thêm vai trò thành công');
      }
      setIsModalOpen(false);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Có lỗi xảy ra');
    }
  };

  const handleDelete = async (role) => {
    if (role.name === 'admin') {
      toast.error('Không thể xóa vai trò Admin hệ thống');
      return;
    }
    
    const result = await Swal.fire({
      title: 'Xóa vai trò?',
      text: `Bạn có chắc muốn xóa vai trò "${role.name}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      confirmButtonText: 'Xóa',
      cancelButtonText: 'Hủy'
    });

    if (result.isConfirmed) {
      try {
        await api.delete(`/roles/${role.id}`);
        toast.success('Xóa vai trò thành công');
        fetchData();
      } catch (error) {
        toast.error(error.response?.data?.message || 'Lỗi khi xóa vai trò');
      }
    }
  };

  return (
    <div className={`space-y-6 ${isEmbedded ? '' : 'pb-12'}`}>
      {!isEmbedded && (
        <div className="bg-white dark:bg-slate-800 p-4 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 rounded-lg">
                <Shield className="w-6 h-6" />
              </div>
              Cấu Hình Vai Trò & Quyền Hạn
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Quản lý linh hoạt các quyền truy cập hệ thống
            </p>
          </div>
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-5 py-2.5 rounded-xl font-semibold transition-all justify-center w-full sm:w-auto shadow-md"
          >
            <Plus className="w-5 h-5" />
            Thêm Vai Trò Mới
          </button>
        </div>
      )}

      {isEmbedded && (
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <Shield className="w-6 h-6 text-purple-600" /> Vai trò & Quyền
          </h2>
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-xl font-bold transition-all shadow-md shadow-purple-600/30 text-sm"
          >
            <Plus className="w-4 h-4" /> Thêm Vai Trò
          </button>
        </div>
      )}

      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left whitespace-nowrap">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider font-semibold border-b border-slate-200 dark:border-slate-700">
                <th className="p-4 pl-6 w-1/4">Tên Vai Trò</th>
                <th className="p-4 w-1/2">Số Quyền Hạn (Permissions)</th>
                <th className="p-4 pr-6 text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
              {loading ? (
                <tr>
                  <td colSpan="3" className="p-8 text-center text-slate-500">Đang tải...</td>
                </tr>
              ) : roles.map((role) => (
                <tr key={role.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                  <td className="p-4 pl-6 font-bold text-slate-900 dark:text-white">
                    <span className="capitalize">{role.name}</span>
                    {role.name === 'admin' && <span className="ml-2 text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded">Hệ thống</span>}
                  </td>
                  <td className="p-4 text-sm text-slate-600 dark:text-slate-400 whitespace-normal min-w-[300px]">
                    <div className="flex flex-wrap gap-1.5">
                      {role.name === 'admin' ? (
                        <span className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-2.5 py-1 rounded-md text-xs font-medium border border-green-200 dark:border-green-800">Toàn quyền hệ thống</span>
                      ) : (
                        role.permissions.map(p => (
                          <span key={p.id} className="bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300 px-2.5 py-1 rounded-md text-xs border border-slate-200 dark:border-slate-600 whitespace-nowrap">
                            {PERMISSION_LABELS[p.name] || p.name}
                          </span>
                        ))
                      )}
                    </div>
                  </td>
                  <td className="p-4 pr-6 text-right">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => handleOpenEdit(role)} className="p-2 text-slate-400 hover:text-cyan-600 bg-slate-100 dark:bg-slate-800 hover:bg-cyan-50 dark:hover:bg-cyan-900/30 rounded-lg">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDelete(role)} 
                        disabled={role.name === 'admin'}
                        className={`p-2 rounded-lg ${role.name === 'admin' ? 'text-slate-300 dark:text-slate-600 cursor-not-allowed' : 'text-slate-400 hover:text-rose-600 bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-500/20'}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={handleCloseModal}></div>
          <div className="relative bg-white dark:bg-slate-800 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center shrink-0">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {editingRole ? 'Sửa Vai Trò' : 'Thêm Vai Trò Mới'}
              </h3>
              <button onClick={handleCloseModal} className="text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 p-1 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 block mb-1">Tên Vai Trò (Ví dụ: manager, teacher...)</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value.toLowerCase()})}
                    disabled={editingRole?.name === 'admin'}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                  />
                </div>
                
                <div>
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2 mb-3 mt-4">
                    <CheckSquare className="w-4 h-4" /> Gán Quyền Hạn
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {permissions.map(perm => (
                      <label key={perm.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer border border-transparent hover:border-slate-200 dark:hover:border-slate-600 transition-colors">
                        <input
                          type="checkbox"
                          className="w-4 h-4 text-purple-600 rounded bg-slate-100 border-slate-300 focus:ring-purple-500"
                          checked={formData.permissions.includes(perm.name) || editingRole?.name === 'admin'}
                          disabled={editingRole?.name === 'admin'} // Admin has all
                          onChange={() => handleCheckboxChange(perm.name)}
                        />
                          <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                            {PERMISSION_LABELS[perm.name] || perm.name}
                            <div className="text-[10px] text-slate-400 font-normal mt-0.5">{perm.name}</div>
                          </span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 dark:border-slate-700 flex justify-end gap-3 shrink-0">
              <button onClick={handleCloseModal} className="px-5 py-2.5 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700">
                Hủy
              </button>
              <button onClick={handleSubmit} className="bg-purple-600 hover:bg-purple-700 text-white px-5 py-2.5 rounded-xl flex items-center gap-2">
                <Save className="w-4 h-4" /> Lưu Lại
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
