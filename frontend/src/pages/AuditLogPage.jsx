import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { Search, History, Calendar, User, UserCheck } from 'lucide-react';
import { toast } from 'sonner';

export default function AuditLogPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filterStudent, setFilterStudent] = useState('');
  const [filterUser, setFilterUser] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [visibleMobileCount, setVisibleMobileCount] = useState(10);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await api.get('/audit-logs', {
        params: {
          student_name: filterStudent,
          user_name: filterUser,
          date: filterDate,
        }
      });
      setLogs(res.data.data || []);
    } catch (err) {
      toast.error('Lỗi lấy nhật ký hệ thống. Có thể bạn không có quyền!');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [filterStudent, filterUser, filterDate]);

  const renderDataChange = (log) => {
    if (log.is_attendance_log) {
      try {
        const newD = log.new_data ? JSON.parse(log.new_data) : {};
        return (
          <div className="text-xs space-y-1">
            <div className="text-slate-600 dark:text-slate-400 font-medium bg-slate-50 dark:bg-slate-900/50 px-2 py-1 rounded border border-slate-100 dark:border-slate-700/50">Ca học: {newD.shift || '-'}</div>
            <div className="text-slate-600 dark:text-slate-400 font-medium bg-slate-50 dark:bg-slate-900/50 px-2 py-1 rounded border border-slate-100 dark:border-slate-700/50">Số lượng: {newD.student_count || 0} học sinh</div>
          </div>
        );
      } catch {
        return <span>Lỗi hiển thị</span>;
      }
    }

    if (log.action && log.action.startsWith('INVOICE_')) {
      try {
        const d = log.new_data ? JSON.parse(log.new_data) : (log.old_data ? JSON.parse(log.old_data) : {});
        return (
          <div className="text-xs space-y-1">
            {d.amount && <div className="text-slate-600 dark:text-slate-400 font-medium bg-slate-50 dark:bg-slate-900/50 px-2 py-1 rounded border border-slate-100 dark:border-slate-700/50">Số tiền: {Number(d.amount).toLocaleString('vi-VN')} đ</div>}
            {d.method && <div className="text-slate-600 dark:text-slate-400 font-medium bg-slate-50 dark:bg-slate-900/50 px-2 py-1 rounded border border-slate-100 dark:border-slate-700/50">HT: {d.method === 'transfer' ? 'Chuyển khoản' : 'Tiền mặt'}</div>}
            {d.status && <div className="text-slate-600 dark:text-slate-400 font-medium bg-slate-50 dark:bg-slate-900/50 px-2 py-1 rounded border border-slate-100 dark:border-slate-700/50">Trạng thái: {d.status}</div>}
          </div>
        );
      } catch {
        return <span>Lỗi hiển thị hóa đơn</span>;
      }
    }

    if (!log.old_data && !log.new_data) return <span className="text-slate-400">Không có dữ liệu</span>;
    try {
      const oldD = log.old_data ? JSON.parse(log.old_data) : {};
      const newD = log.new_data ? JSON.parse(log.new_data) : {};
      
      const formatScore = (val) => {
        if (!val) return '-';
        let parsed = val;
        if (typeof val === 'string') {
          try {
            parsed = JSON.parse(val);
          } catch {
            return val;
          }
        }
        if (typeof parsed === 'object' && parsed !== null) {
          let res = [];
          if (parsed.tests && Array.isArray(parsed.tests) && parsed.tests.some(x=>x)) {
            res.push(`Tests: ${parsed.tests.filter(x=>x).join(', ')}`);
          }
          if (parsed.hwScore) res.push(`Điểm BTVN: ${parsed.hwScore}`);
          if (parsed.hwComment) res.push(`NX: ${parsed.hwComment}`);
          return res.length > 0 ? res.join(' | ') : '-';
        }
        return String(val);
      };

      const changes = [];
      const oldScoreStr = typeof oldD.score === 'object' ? JSON.stringify(oldD.score) : oldD.score;
      const newScoreStr = typeof newD.score === 'object' ? JSON.stringify(newD.score) : newD.score;
      
      if (oldScoreStr !== newScoreStr) {
        changes.push(`Điểm: ${formatScore(oldD.score)} ➔ ${formatScore(newD.score)}`);
      }
      
      if (oldD.homework_status !== newD.homework_status) changes.push(`BTVN: ${oldD.homework_status || '-'} ➔ ${newD.homework_status || '-'}`);
      if (oldD.status !== newD.status) changes.push(`Trạng thái: ${oldD.status || '-'} ➔ ${newD.status || '-'}`);

      return (
        <div className="text-xs space-y-1">
          {changes.map((c, i) => <div key={i} className="text-slate-600 dark:text-slate-400 font-medium bg-slate-50 dark:bg-slate-900/50 px-2 py-1 rounded border border-slate-100 dark:border-slate-700/50">{c}</div>)}
        </div>
      );
    } catch {
      return <span>Lỗi hiển thị</span>;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in zoom-in duration-300">

      <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm dark:shadow-none dark:shadow-none dark:shadow-none dark:shadow-none border border-slate-200 dark:border-slate-700 dark:border-slate-700 dark:border-slate-700 dark:border-slate-700 flex flex-wrap gap-3 items-center">
        <div className="flex items-center space-x-2 bg-slate-50 dark:bg-slate-900/50 dark:bg-slate-900/50 dark:bg-slate-900/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 dark:border-slate-700 dark:border-slate-700 dark:border-slate-700 rounded-lg px-3 py-2 w-64">
          <User className="w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm theo học sinh/lớp..."
              className="bg-transparent text-sm outline-none w-full font-medium"
            value={filterStudent}
            onChange={(e) => setFilterStudent(e.target.value)}
          />
        </div>
        <div className="flex items-center space-x-2 bg-slate-50 dark:bg-slate-900/50 dark:bg-slate-900/50 dark:bg-slate-900/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 dark:border-slate-700 dark:border-slate-700 dark:border-slate-700 rounded-lg px-3 py-2 w-64">
          <UserCheck className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm theo nhân viên (tài khoản)..."
            className="bg-transparent text-sm outline-none w-full font-medium"
            value={filterUser}
            onChange={(e) => setFilterUser(e.target.value)}
          />
        </div>
        <div className="flex items-center space-x-2 bg-slate-50 dark:bg-slate-900/50 dark:bg-slate-900/50 dark:bg-slate-900/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 dark:border-slate-700 dark:border-slate-700 dark:border-slate-700 rounded-lg px-3 py-2">
          <Calendar className="w-4 h-4 text-slate-400" />
          <input
            type="date"
            className="bg-transparent text-sm outline-none font-medium"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm dark:shadow-none dark:shadow-none dark:shadow-none dark:shadow-none border border-slate-200 dark:border-slate-700 dark:border-slate-700 dark:border-slate-700 dark:border-slate-700 overflow-hidden">
        {/* DẠNG THẺ MOBILE */}
        <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-700/50">
          {loading ? (
            <div className="p-8 text-center text-slate-500 dark:text-slate-400 font-semibold">Đang tải nhật ký...</div>
          ) : logs.length === 0 ? (
            <div className="p-8 text-center text-slate-500 dark:text-slate-400 font-semibold">Không có nhật ký nào!</div>
          ) : (
            <>
              {logs.slice(0, visibleMobileCount).map((log) => (
                <div key={log.id} className="p-4 space-y-3 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                  <div className="flex justify-between items-start border-b border-slate-50 dark:border-slate-700/50 pb-2">
                    <div>
                      {log.is_attendance_log ? (
                        <div className="font-bold text-slate-800 dark:text-slate-200 text-sm">Lớp: {log.attendance?.classroom?.name || 'N/A'}</div>
                      ) : (
                        <div className="font-bold text-slate-800 dark:text-slate-200 text-sm">{log.student?.full_name || 'N/A'}</div>
                      )}
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold mt-0.5">
                        {new Date(log.created_at).toLocaleString('vi-VN')}
                      </div>
                    </div>
                    <div className="text-right flex flex-col items-end">
                      <span className="font-bold text-indigo-700 dark:text-indigo-400 text-xs">
                        {log.user?.name || 'Hệ thống'}
                      </span>
                      <span className="bg-cyan-100 dark:bg-cyan-900/50 text-cyan-800 dark:text-cyan-300 px-2 py-0.5 rounded text-[9px] font-bold uppercase mt-1">
                        {log.action}
                      </span>
                    </div>
                  </div>
                  
                  <div className="text-xs text-slate-700 dark:text-slate-300 space-y-2">
                    {log.is_attendance_log ? (
                      <div className="font-medium text-slate-500 dark:text-slate-400">Điểm danh toàn lớp</div>
                    ) : (
                      <div className="font-medium text-slate-500 dark:text-slate-400">Lớp: {log.student?.classroom?.name || log.attendance?.classroom?.name || 'N/A'} {log.action && log.action.startsWith('INVOICE_') ? '- Thu tiền' : ''}</div>
                    )}
                    
                    <div className="bg-slate-50 dark:bg-slate-900/50 p-2.5 rounded-lg border border-slate-100 dark:border-slate-700/50 text-[11px] overflow-x-auto">
                      {renderDataChange(log)}
                    </div>
                    
                    {log.reason && (
                      <div className="italic text-slate-500 dark:text-slate-400 font-medium">
                        Lý do: {log.reason}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              
              {visibleMobileCount < logs.length && (
                <div className="p-4 text-center">
                  <button 
                    onClick={() => setVisibleMobileCount(prev => prev + 10)}
                    className="px-4 py-2 bg-slate-100 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300 font-semibold text-xs rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                  >
                    Xem thêm ({logs.length - visibleMobileCount} nhật ký nữa)
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* BẢNG DESKTOP */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left">
          <thead className="bg-slate-900 text-slate-100 text-xs uppercase font-semibold">
            <tr>
              <th className="p-4">Thời gian</th>
              <th className="p-4">Nhân sự thực hiện</th>
              <th className="p-4">Học sinh / Lớp</th>
              <th className="p-4">Hành động</th>
              <th className="p-4">Chi tiết thay đổi</th>
              <th className="p-4">Lý do</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {loading ? (
              <tr><td colSpan="6" className="p-8 text-center text-slate-500 dark:text-slate-400 dark:text-slate-400 dark:text-slate-400 dark:text-slate-400 font-semibold">Đang tải nhật ký...</td></tr>
            ) : logs.length === 0 ? (
              <tr><td colSpan="6" className="p-8 text-center text-slate-500 dark:text-slate-400 dark:text-slate-400 dark:text-slate-400 dark:text-slate-400 font-semibold">Không có nhật ký nào!</td></tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 dark:bg-slate-900/50 dark:hover:bg-slate-700/50 dark:bg-slate-900/50 dark:hover:bg-slate-700/50 dark:bg-slate-900/50 dark:hover:bg-slate-700/50 dark:bg-slate-900/50 transition-colors">
                  <td className="p-4 font-bold text-slate-600 dark:text-slate-400 dark:text-slate-400 dark:text-slate-400 dark:text-slate-400 whitespace-nowrap">
                    {new Date(log.created_at).toLocaleString('vi-VN')}
                  </td>
                  <td className="p-4 font-semibold text-indigo-700 dark:text-indigo-300">
                    {log.user?.name || 'Hệ thống'}
                  </td>
                  <td className="p-4">
                    {log.is_attendance_log ? (
                      <>
                        <div className="font-bold text-slate-800 dark:text-slate-200">Lớp: {log.attendance?.classroom?.name || 'N/A'}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Điểm danh toàn lớp</div>
                      </>
                    ) : (
                      <>
                        <div className="font-bold text-slate-800 dark:text-slate-200">{log.student?.full_name || 'N/A'}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Lớp: {log.student?.classroom?.name || log.attendance?.classroom?.name || 'N/A'} {log.action && log.action.startsWith('INVOICE_') ? '- Thu tiền' : ''}</div>
                      </>
                    )}
                  </td>
                  <td className="p-4">
                    <span className="bg-cyan-100 dark:bg-cyan-900/50 text-cyan-800 dark:text-cyan-300 dark:text-cyan-300 dark:text-cyan-300 dark:text-cyan-300 px-2 py-1 rounded text-xs font-bold uppercase">
                      {log.action}
                    </span>
                  </td>
                  <td className="p-4 min-w-[200px]">
                    {renderDataChange(log)}
                  </td>
                  <td className="p-4 text-slate-600 dark:text-slate-400 dark:text-slate-400 dark:text-slate-400 dark:text-slate-400 italic font-medium">
                    {log.reason || '-'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
