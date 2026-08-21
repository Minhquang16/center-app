import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import Swal from 'sweetalert2';
import { toast } from 'sonner';
import { 
  Users, 
  Search, 
  Plus, 
  Edit, 
  Trash2, 
  UserPlus, 
  Save, 
  X,
  Mail,
  Lock,
  User,
  Shield,
  Building
} from 'lucide-react';

export default function UsersPage({ isEmbedded = false }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // State Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: '',
    branch_id: ''
  });
  const [roles, setRoles] = useState([]);
  const [branches, setBranches] = useState([]);

  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

  const fetchUsersAndRoles = async () => {
    setLoading(true);
    try {
      const [usersRes, rolesRes, branchesRes] = await Promise.all([
        api.get('/users'),
        api.get('/roles'),
        api.get('/branches')
      ]);
      setUsers(usersRes.data);
      setRoles(rolesRes.data);
      setBranches(branchesRes.data);
    } catch (err) {
      toast.error('Lỗi khi tải danh sách người dùng, vai trò hoặc cơ sở');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsersAndRoles();
  }, []);

  // Filter
  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Modal Handlers
  const openAddModal = () => {
    setEditingUser(null);
    setFormData({ name: '', email: '', password: '', role: roles[0]?.name || '', branch_id: '' });
    setIsModalOpen(true);
  };

  const openEditModal = (user) => {
    setEditingUser(user);
    setFormData({ name: user.name, email: user.email, password: '', role: user.role_name || roles[0]?.name || '', branch_id: user.branch_id || '' });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingUser(null);
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email) {
      toast.error('Vui lòng nhập đầy đủ tên và email');
      return;
    }
    
    if (!editingUser && !formData.password) {
      toast.error('Vui lòng nhập mật khẩu cho người dùng mới');
      return;
    }

    try {
      if (editingUser) {
        await api.put(`/users/${editingUser.id}`, formData);
        toast.success('Cập nhật người dùng thành công!');
      } else {
        await api.post('/users', formData);
        toast.success('Thêm tài khoản mới thành công!');
      }
      closeModal();
      fetchUsersAndRoles();
    } catch (err) {
      const msg = err.response?.data?.message || 'Có lỗi xảy ra, vui lòng thử lại';
      toast.error(msg);
    }
  };

  const handleDelete = async (user) => {
    if (user.id === currentUser.id) {
      Swal.fire('Từ chối', 'Bạn không thể tự xóa tài khoản đang đăng nhập.', 'error');
      return;
    }

    const result = await Swal.fire({
      title: 'Xóa người dùng?',
      text: `Bạn có chắc muốn xóa tài khoản ${user.name}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#94a3b8',
      confirmButtonText: 'Đồng ý xóa',
      cancelButtonText: 'Hủy'
    });

    if (result.isConfirmed) {
      try {
        await api.delete(`/users/${user.id}`);
        toast.success('Đã xóa người dùng thành công');
        fetchUsersAndRoles();
      } catch (err) {
        toast.error(err.response?.data?.message || 'Lỗi khi xóa người dùng');
      }
    }
  };

  return (
    <div className={`space-y-6 text-slate-800 dark:text-slate-200 ${isEmbedded ? '' : 'pb-12'}`}>
      {/* Header */}
      {!isEmbedded && (
        <div className="bg-white dark:bg-slate-800 p-4 sm:p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
              <div className="p-2 bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-lg">
                <Users className="w-6 h-6" />
              </div>
              Quản Lý Người Dùng
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Quản lý danh sách tài khoản được phép truy cập hệ thống
            </p>
          </div>
          
          <button
            onClick={openAddModal}
            className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-700 text-white px-5 py-2.5 rounded-xl font-semibold transition-all shadow-md hover:shadow-lg w-full sm:w-auto justify-center"
          >
            <UserPlus className="w-5 h-5" />
            Thêm Tài Khoản
          </button>
        </div>
      )}

      {isEmbedded && (
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-amber-500" /> Danh sách Tài khoản
          </h2>
          <button
            onClick={openAddModal}
            className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-2 rounded-xl font-bold transition-all shadow-md shadow-cyan-600/30 text-sm"
          >
            <UserPlus className="w-4 h-4" /> Thêm Tài Khoản
          </button>
        </div>
      )}

      {/* Main Content */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
        {/* Search Bar */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-700 dark:border-slate-700 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 dark:bg-slate-900/50 dark:bg-slate-800/50">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm kiếm theo tên hoặc email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 dark:border-slate-700 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 dark:focus:ring-cyan-400 dark:focus:ring-cyan-400/50 bg-white dark:bg-slate-800 dark:bg-slate-900 text-slate-900 dark:text-white transition-all shadow-sm dark:shadow-none dark:shadow-none"
            />
          </div>
        </div>

        {/* DẠNG THẺ MOBILE */}
        <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-700/50">
          {loading ? (
            <div className="p-8 text-center text-slate-500 dark:text-slate-400">
              <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
                <span>Đang tải dữ liệu...</span>
              </div>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-8 text-center text-slate-500 dark:text-slate-400">
              Không tìm thấy người dùng nào
            </div>
          ) : (
            filteredUsers.map((u, index) => (
              <div key={u.id} className="p-4 space-y-3 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-cyan-100 dark:bg-cyan-900/50 flex items-center justify-center text-cyan-600 dark:text-cyan-400 font-bold border border-cyan-200 dark:border-cyan-800 shrink-0">
                      {u.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white leading-tight">{u.name}</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                        <Mail className="w-3 h-3" /> {u.email}
                      </div>
                    </div>
                  </div>
                  <div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 dark:bg-purple-500/20 text-purple-800 dark:text-purple-400 uppercase tracking-wider">
                          {u.role_name || 'Thành viên'}
                      </span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-400 tracking-wider">
                          {u.branch_name}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-between items-center pt-2 border-t border-slate-50 dark:border-slate-700/50">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    Ngày tạo: <b className="text-slate-700 dark:text-slate-300">{new Date(u.created_at).toLocaleDateString('vi-VN')}</b>
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => openEditModal(u)}
                      className="p-1.5 text-slate-500 hover:text-cyan-600 bg-slate-100 hover:bg-cyan-50 dark:bg-slate-700 dark:hover:bg-cyan-900/30 rounded-lg transition-colors"
                      title="Chỉnh sửa"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    {u.role_name !== 'admin' && (
                      <button
                        onClick={() => handleDelete(u)}
                        className="p-1.5 text-slate-500 hover:text-rose-600 bg-slate-100 hover:bg-rose-50 dark:bg-slate-700 dark:hover:bg-rose-900/30 rounded-lg transition-colors"
                        title="Xóa"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* BẢNG DESKTOP */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left whitespace-nowrap">
            <thead>
              <tr className="bg-slate-100 dark:bg-slate-700/50 dark:bg-slate-700/50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 dark:text-slate-400 dark:text-slate-400 text-xs uppercase tracking-wider font-semibold border-b border-slate-200 dark:border-slate-700 dark:border-slate-700 dark:border-slate-700">
                <th className="p-4 pl-6">STT</th>
                <th className="p-4">Người Dùng</th>
                <th className="p-4">Vai trò</th>
                <th className="p-4">Cơ sở</th>
                <th className="p-4">Ngày Tạo</th>
                <th className="p-4 pr-6 text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
              {loading ? (
                <tr>
                  <td colSpan="5" className="p-8 text-center text-slate-500 dark:text-slate-400 dark:text-slate-400">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
                      <span>Đang tải dữ liệu...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan="5" className="p-8 text-center text-slate-500 dark:text-slate-400 dark:text-slate-400 dark:text-slate-400">
                    Không tìm thấy người dùng nào
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u, index) => (
                  <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 dark:bg-slate-900/50 dark:hover:bg-slate-700/50 dark:bg-slate-900/50 dark:hover:bg-slate-700/30 transition-colors">
                    <td className="p-4 pl-6 text-sm text-slate-500 dark:text-slate-400 dark:text-slate-400 dark:text-slate-400 font-medium">
                      {index + 1}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-cyan-100 dark:bg-cyan-900/50 flex items-center justify-center text-cyan-600 dark:text-cyan-400 font-bold border border-cyan-200 dark:border-cyan-800">
                          {u.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 dark:text-white">{u.name}</div>
                          <div className="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-400 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                            <Mail className="w-3.5 h-3.5" /> {u.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 dark:bg-purple-500/20 text-purple-800 dark:text-purple-400 capitalize">
                          {u.role_name || 'Thành viên'}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-400">
                          {u.branch_name}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-slate-600 dark:text-slate-400 dark:text-slate-400 dark:text-slate-400">
                      {new Date(u.created_at).toLocaleDateString('vi-VN')}
                    </td>
                    <td className="p-4 pr-6 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => openEditModal(u)}
                          className="p-2 text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-400 bg-slate-100 dark:bg-slate-700/50 dark:bg-slate-700/50 dark:bg-slate-800 hover:bg-cyan-50 dark:hover:bg-cyan-900/30 dark:bg-cyan-900/30 dark:hover:bg-cyan-900/30 dark:bg-cyan-900/30 dark:hover:bg-cyan-900/30 rounded-lg transition-colors"
                          title="Chỉnh sửa"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(u)}
                          disabled={u.id === currentUser.id}
                          className={`p-2 rounded-lg transition-colors ${
                            u.id === currentUser.id 
                            ? 'text-slate-300 dark:text-slate-600 bg-slate-50 dark:bg-slate-900/50 dark:bg-slate-900/50 dark:bg-slate-800/50 cursor-not-allowed'
                            : 'text-slate-400 hover:text-rose-600 bg-slate-100 dark:bg-slate-700/50 dark:bg-slate-700/50 dark:bg-slate-800 hover:bg-rose-50 dark:bg-rose-900/30 dark:bg-rose-900/30 dark:hover:bg-rose-500/20'
                          }`}
                          title="Xóa"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Thêm/Sửa */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={closeModal}></div>
          <div className="relative bg-white dark:bg-slate-800 w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 dark:border-slate-700 dark:border-slate-700 overflow-hidden transform transition-all animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700/50 dark:border-slate-700/50 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50 dark:bg-slate-900/50 dark:bg-slate-800/50">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                {editingUser ? (
                  <><Edit className="w-5 h-5 text-amber-500" /> Cập Nhật Thông Tin</>
                ) : (
                  <><UserPlus className="w-5 h-5 text-cyan-500" /> Thêm Tài Khoản</>
                )}
              </h3>
              <button 
                onClick={closeModal}
                className="text-slate-400 hover:text-slate-600 dark:text-slate-400 dark:text-slate-400 dark:hover:text-slate-300 p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 dark:text-slate-300 dark:text-slate-300 flex items-center gap-1.5">
                  <User className="w-4 h-4" /> Họ và Tên <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Nguyễn Văn A"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 dark:border-slate-700 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-cyan-500 dark:focus:ring-cyan-400 dark:focus:ring-cyan-400/50 bg-white dark:bg-slate-800 dark:bg-slate-900 text-slate-900 dark:text-white transition-all shadow-sm dark:shadow-none dark:shadow-none"
                  required
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
                  placeholder="admin@example.com"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 dark:border-slate-700 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-cyan-500 dark:focus:ring-cyan-400 dark:focus:ring-cyan-400/50 bg-white dark:bg-slate-800 dark:bg-slate-900 text-slate-900 dark:text-white transition-all shadow-sm dark:shadow-none dark:shadow-none"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 dark:text-slate-300 dark:text-slate-300 flex items-center gap-1.5">
                  <Shield className="w-4 h-4" /> Vai trò <span className="text-rose-500">*</span>
                </label>
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 dark:border-slate-700 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-cyan-500 dark:focus:ring-cyan-400 dark:focus:ring-cyan-400/50 bg-white dark:bg-slate-800 dark:bg-slate-900 text-slate-900 dark:text-white transition-all shadow-sm dark:shadow-none dark:shadow-none"
                >
                  <option value="" disabled>Chọn một vai trò</option>
                  {roles.map(r => (
                    <option key={r.id} value={r.name} className="capitalize">{r.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 dark:text-slate-300 dark:text-slate-300 flex items-center gap-1.5">
                  <Building className="w-4 h-4" /> Cơ sở <span className="text-slate-400 font-normal">(Tùy chọn)</span>
                </label>
                <select
                  name="branch_id"
                  value={formData.branch_id}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 dark:border-slate-700 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-cyan-500 dark:focus:ring-cyan-400 dark:focus:ring-cyan-400/50 bg-white dark:bg-slate-800 dark:bg-slate-900 text-slate-900 dark:text-white transition-all shadow-sm dark:shadow-none dark:shadow-none"
                >
                  <option value="">-- Tất cả cơ sở (Quản lý chung) --</option>
                  {branches.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 dark:text-slate-300 dark:text-slate-300 flex items-center gap-1.5">
                  <Lock className="w-4 h-4" /> Mật khẩu {editingUser ? '(Tùy chọn)' : <span className="text-rose-500">*</span>}
                </label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder={editingUser ? "Để trống nếu không muốn đổi" : "Mật khẩu an toàn..."}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 dark:border-slate-700 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-cyan-500 dark:focus:ring-cyan-400 dark:focus:ring-cyan-400/50 bg-white dark:bg-slate-800 dark:bg-slate-900 text-slate-900 dark:text-white transition-all shadow-sm dark:shadow-none dark:shadow-none"
                  {...(!editingUser && { required: true })}
                  minLength={6}
                />
                {editingUser && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                    Chỉ nhập khi bạn muốn thay đổi mật khẩu của tài khoản này.
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-5 py-2.5 rounded-xl font-medium text-slate-600 dark:text-slate-400 dark:text-slate-400 dark:text-slate-300 hover:bg-slate-100 dark:bg-slate-700/50 dark:bg-slate-700/50 dark:hover:bg-slate-700 transition-colors"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-700 text-white px-5 py-2.5 rounded-xl font-semibold transition-all shadow-md dark:shadow-none dark:shadow-none hover:shadow-lg dark:shadow-none dark:shadow-none"
                >
                  <Save className="w-4 h-4" />
                  {editingUser ? 'Lưu Thay Đổi' : 'Tạo Tài Khoản'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
