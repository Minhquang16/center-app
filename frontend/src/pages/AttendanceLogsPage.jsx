import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { toast } from 'sonner';
import { History, Search, Calendar, User, Clock, Loader2 } from 'lucide-react';

export default function AttendanceLogsPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const res = await api.get('/attendance/logs');
      setLogs(res.data || []);
    } catch (err) {
      toast.error('Lỗi lấy lịch sử điểm danh!');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filteredLogs = logs.filter(log => {
    const term = searchTerm.toLowerCase();
    const className = log.classroom?.name?.toLowerCase() || '';
    const userName = log.user?.name?.toLowerCase() || '';
    const shift = log.shift?.toLowerCase() || '';
    return className.includes(term) || userName.includes(term) || shift.includes(term);
  });

  const getActionName = (action) => {
    if (action === 'check_in') return 'Điểm danh 1 học sinh';
    if (action === 'bulk_check_in') return 'Điểm danh hàng loạt';
    return action;
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const d = new Date(dateString);
    return d.toLocaleString('vi-VN', {
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      day: '2-digit', month: '2-digit', year: 'numeric'
    });
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-800 dark:text-white flex items-center gap-3">
            <History className="w-8 h-8 text-cyan-600 dark:text-cyan-400" />
            Lịch Sử Lưu Vết Điểm Danh
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium">
            Theo dõi chi tiết giáo viên/quản trị viên đã thực hiện điểm danh cho các lớp.
          </p>
        </div>

        <button 
          onClick={fetchLogs}
          className="flex items-center justify-center gap-2 bg-cyan-50 dark:bg-slate-700 text-cyan-700 dark:text-cyan-300 px-5 py-2.5 rounded-xl font-bold hover:bg-cyan-100 dark:hover:bg-slate-600 transition-colors"
        >
          Tải lại danh sách
        </button>
      </div>

      {/* Bộ lọc */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-700">
        <div className="relative max-w-md">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-slate-400" />
          </div>
          <input
            type="text"
            placeholder="Tìm theo Tên người điểm danh, Tên lớp, Ca học..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm focus:ring-2 focus:ring-cyan-500 outline-none transition-all dark:text-white"
          />
        </div>
      </div>

      {/* Danh sách Logs */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center p-20 text-slate-400">
            <Loader2 className="w-10 h-10 animate-spin mb-4 text-cyan-500" />
            <p className="font-semibold">Đang tải dữ liệu lưu vết...</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-20 text-slate-400">
            <History className="w-16 h-16 mb-4 opacity-20" />
            <p className="text-lg font-semibold text-slate-500">Chưa có dữ liệu lưu vết</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Thời gian thao tác
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Người điểm danh
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Lớp Học
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Ca Học
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Hành Động
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/20 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center text-sm font-semibold text-slate-700 dark:text-slate-300">
                        <Clock className="w-4 h-4 mr-2 text-cyan-500" />
                        {formatDate(log.created_at)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="w-8 h-8 rounded-full bg-cyan-100 dark:bg-cyan-900/50 text-cyan-600 dark:text-cyan-400 flex items-center justify-center mr-3">
                          <User className="w-4 h-4" />
                        </div>
                        <span className="font-bold text-sm text-slate-800 dark:text-slate-200">
                          {log.user?.name || 'Không rõ'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 inline-flex px-3 py-1 rounded-lg">
                        {log.classroom?.name || '---'} {log.classroom?.class_code ? `(${log.classroom.class_code})` : ''}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 px-3 py-1 rounded-lg">
                        {log.shift || '---'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm">
                        <p className="font-semibold text-slate-700 dark:text-slate-300">{getActionName(log.action_type)}</p>
                        <p className="text-xs text-slate-500">Số lượng: {log.student_count} học sinh</p>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
