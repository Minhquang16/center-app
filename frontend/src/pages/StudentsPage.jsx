import React, { useEffect, useState } from 'react';
import api from '../api/axios';
import { toast } from 'sonner';
import Swal from 'sweetalert2';
import { 
  UserPlus, Upload, CheckSquare, X, RotateCcw, Filter, Eye, Award, 
  Calendar, BookOpen, Calculator, RefreshCw, Printer, Edit3, Save, 
  UserX, MessageSquare, Trash2, Check, TrendingUp, Download, CheckCircle2, Clock, Lock 
} from 'lucide-react';

export default function StudentsPage() {
  const [students, setStudents] = useState([]);
  const [cycleInfo, setCycleInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);

  // Bộ Lọc & Lịch Calendar
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedGrade, setSelectedGrade] = useState('');
  const [selectedClassType, setSelectedClassType] = useState('');
  const [selectedShift, setSelectedShift] = useState(''); 

  const [rowInputs, setRowInputs] = useState({});

  const [detailStudent, setDetailStudent] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editFormData, setEditFormData] = useState({});
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    grade: 9,
    class_type: 'CLC',
    parent_name: '',
    parent_phone: '',
    price_per_session: 130000,
    start_date: new Date().toISOString().split('T')[0],
    teacher_comment: '',
  });

  const [showImportModal, setShowImportModal] = useState(false);
  const [excelFile, setExcelFile] = useState(null);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const res = await api.get('/students', {
        params: {
          date: selectedDate,
          grade: selectedGrade,
          class_type: selectedClassType,
          shift: selectedShift,
        },
      });

      const data = Array.isArray(res.data) ? res.data : (res.data?.data || []);
      setStudents(data);

      if (res.data?.cycle_info) {
        setCycleInfo(res.data.cycle_info);
      }

      setRowInputs((prev) => {
        const updated = { ...prev };
        data.forEach((s) => {
          const activeAtt = s.active_shift_attendance || s.today_attendance;
          if (activeAtt) {
            const attId = activeAtt.id;
            const existing = prev[attId];
            updated[attId] = {
              score: existing ? existing.score : (activeAtt.score || ''),
              homework_status: existing ? existing.homework_status : (activeAtt.homework_status || ''),
              isSaved: existing ? existing.isSaved : false,
            };
          }
        });
        return updated;
      });

      if (detailStudent) {
        const updatedDetail = data.find((item) => item.id === detailStudent.id);
        if (updatedDetail) {
          setDetailStudent(updatedDetail);
        }
      }
    } catch (err) {
      console.error("Lỗi lấy dữ liệu:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, [selectedDate, selectedGrade, selectedClassType, selectedShift]);

  const handleResetFilters = () => {
    setSelectedDate(new Date().toISOString().split('T')[0]);
    setSelectedGrade('');
    setSelectedClassType('');
    setSelectedShift('');
  };

  const handleGradeChange = (e) => {
    const val = e.target.value;
    setSelectedGrade(val);
    if (['10', '11', '12'].includes(val)) {
      setSelectedClassType('');
    }
  };

  const handleInputChange = (attendanceId, field, value) => {
    setRowInputs((prev) => ({
      ...prev,
      [attendanceId]: {
        ...prev[attendanceId],
        [field]: value,
        isSaved: false,
      },
    }));
  };

  const handleSaveRow = async (attendanceId) => {
    const row = rowInputs[attendanceId];
    if (!row) return;

    try {
      await api.put(`/attendance/${attendanceId}/grade`, {
        score: row.score,
        homework_status: row.homework_status,
      });

      setRowInputs((prev) => ({
        ...prev,
        [attendanceId]: {
          ...prev[attendanceId],
          isSaved: true,
        },
      }));

      toast.success('Đã lưu điểm và BTVN thành công!');
      fetchStudents();
    } catch (err) {
      toast.error('Lỗi lưu thông tin: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleSaveAllGrades = async () => {
    const itemsToSave = Object.keys(rowInputs).map((attId) => ({
      id: Number(attId),
      score: rowInputs[attId].score,
      homework_status: rowInputs[attId].homework_status,
    }));

    if (itemsToSave.length === 0) return toast.warning('Chưa có học sinh nào điểm danh ca này!');

    try {
      const res = await api.post('/attendance/bulk-grade', { items: itemsToSave });
      toast.success(res.data.message);

      setRowInputs((prev) => {
        const updated = { ...prev };
        Object.keys(updated).forEach((id) => {
          updated[id].isSaved = true;
        });
        return updated;
      });
      fetchStudents();
    } catch (err) {
      toast.error('Lỗi lưu hàng loạt!');
    }
  };

  const handleExportExcel = () => {
    if (students.length === 0) return toast.warning('Không có dữ liệu học sinh để xuất file!');

    const nowStr = new Date().toLocaleString('vi-VN');
    const dateStr = cycleInfo?.date_formatted || selectedDate;
    const gradeStr = selectedGrade ? `Khối ${selectedGrade}` : 'Tất cả Khối';
    const classStr = selectedClassType ? `Lớp ${selectedClassType}` : 'Tất cả Loại Lớp';
    const shiftStr = selectedShift ? `Ca ${selectedShift.replace('ca', '')}` : 'Tất cả Ca';

    let tableHtml = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8" />
        <style>
          body { font-family: Raleway, Arial, sans-serif; }
          .title { font-size: 16pt; font-weight: bold; text-align: center; color: #0891b2; }
          .subtitle { font-size: 11pt; text-align: center; color: #64748b; }
          .meta { font-size: 10pt; color: #334155; margin-bottom: 10px; }
          table { border-collapse: collapse; width: 100%; }
          th { background: #0e7490; color: #ffffff; font-weight: bold; border: 1px solid #155e75; padding: 8px; text-align: center; }
          td { border: 1px solid #cbd5e1; padding: 6px 10px; font-size: 10pt; }
          .text-center { text-align: center; }
          .text-bold { font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="title">TRUNG TÂM TOÁN MATH CENTER</div>
        <div class="subtitle">BÁO CÁO ĐIỂM BÀI HỌC VÀ BÀI TẬP VỀ NHÀ</div>
        <br/>
        <div class="meta">
          <p><b>• Ngày xuất báo cáo:</b> ${nowStr}</p>
          <p><b>• Ngày xem báo cáo:</b> ${dateStr}</p>
          <p><b>• Bộ lọc áp dụng:</b> ${gradeStr} | ${classStr} | ${shiftStr}</p>
        </div>
        <table>
          <thead>
            <tr>
              <th>STT</th>
              <th>Mã HS</th>
              <th>Họ và Tên</th>
              <th>Khối / Lớp</th>
              <th>Phụ Huynh</th>
              <th>SĐT Phụ Huynh</th>
              <th>Trạng Thái Điểm Danh</th>
              <th>Giờ Đến Lớp</th>
              <th>Điểm Buổi Học</th>
              <th>Bài Tập Về Nhà</th>
              <th>Tổng Buổi Đi Học (T${cycleInfo?.month || ''})</th>
            </tr>
          </thead>
          <tbody>
    `;

    students.forEach((s, index) => {
      const att = s.active_shift_attendance || s.today_attendance;
      const attStatus = att ? 'Đã đến lớp' : 'Chưa đến lớp';
      const checkinTime = att ? new Date(att.checked_at || att.time).toLocaleTimeString('vi-VN') : '-';
      const score = att ? (att.score || 'Chưa nhập') : '-';
      const hw = att ? (att.homework_status || 'Chưa chọn') : '-';

      tableHtml += `
        <tr>
          <td class="text-center">${index + 1}</td>
          <td class="text-center text-bold">${s.student_code}</td>
          <td class="text-bold">${s.full_name}</td>
          <td class="text-center">Khối ${s.grade} ${s.class_type || ''}</td>
          <td>${s.parent_name}</td>
          <td>'${s.parent_phone}</td>
          <td class="text-center">${attStatus}</td>
          <td class="text-center">${checkinTime}</td>
          <td class="text-center text-bold">${score}</td>
          <td class="text-center">${hw}</td>
          <td class="text-center text-bold">${s.total_sessions_in_cycle || 0} buổi</td>
        </tr>
      `;
    });

    tableHtml += `
          </tbody>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob([tableHtml], { type: 'application/vnd.ms-excel;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `BaoCao_Diem_BTVN_${dateStr.replace(/\//g, '-')}.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDeleteStudent = async (studentId, studentName) => {
    const result = await Swal.fire({
      title: 'Xác nhận xóa',
      text: `Bạn có chắc chắn muốn xóa học sinh "${studentName}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Xóa',
      cancelButtonText: 'Hủy'
    });
    if (!result.isConfirmed) return;

    try {
      await api.delete(`/students/${studentId}`);
      toast.success('Đã xóa học sinh thành công!');
      setDetailStudent(null);
      fetchStudents();
    } catch (err) {
      toast.error('Lỗi xóa học sinh');
    }
  };

  const handleUpdateStudent = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/students/${editFormData.id}`, editFormData);
      toast.success('Cập nhật thông tin học sinh thành công!');
      setIsEditing(false);
      fetchStudents();
      setDetailStudent((prev) => ({ ...prev, ...editFormData }));
    } catch (err) {
      toast.error('Lỗi cập nhật học sinh');
    }
  };

  const handleOpenDetail = (student) => {
    setDetailStudent(student);
    setEditFormData(student);
    setIsEditing(false);
    setShowHistoryModal(false);
  };

  const handlePrintStudent = () => {
    window.print();
  };

  const unattendedSelectedIds = students.filter((s) => selectedIds.includes(s.id) && !s.today_attendance).map((s) => s.id);
  const attendedSelectedIds = students.filter((s) => selectedIds.includes(s.id) && s.today_attendance && s.can_cancel_attendance).map((s) => s.id);

  const handleBulkAttendance = async () => {
    if (unattendedSelectedIds.length === 0) return;
    try {
      const res = await api.post('/attendance/bulk-check-in', { student_ids: unattendedSelectedIds, date: selectedDate });
      toast.success(res.data.message);
      setSelectedIds([]);
      fetchStudents();
    } catch (err) {
      toast.error('Lỗi điểm danh hàng loạt');
    }
  };

  const handleBulkCancelAttendance = async () => {
    if (attendedSelectedIds.length === 0) return;
    
    const result = await Swal.fire({
      title: 'Hủy điểm danh',
      text: `Bạn có chắc muốn hủy điểm danh của ${attendedSelectedIds.length} học sinh?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Hủy điểm danh',
      cancelButtonText: 'Thoát'
    });
    if (!result.isConfirmed) return;

    try {
      const res = await api.post('/attendance/bulk-cancel', { student_ids: attendedSelectedIds, date: selectedDate });
      toast.success(res.data.message);
      setSelectedIds([]);
      fetchStudents();
    } catch (err) {
      toast.error('Lỗi hủy điểm danh');
    }
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        grade: Number(formData.grade),
        price_per_session: Number(formData.price_per_session),
      };

      await api.post('/students', payload);
      toast.success('🎉 Thêm học sinh mới thành công!');
      setShowAddModal(false);
      
      setFormData({
        full_name: '',
        grade: 9,
        class_type: 'CLC',
        parent_name: '',
        parent_phone: '',
        price_per_session: 130000,
        start_date: new Date().toISOString().split('T')[0],
        teacher_comment: '',
      });

      fetchStudents();
    } catch (err) {
      const serverMessage = err.response?.data?.message || err.message;
      toast.error('Lỗi thêm học sinh: ' + serverMessage);
    }
  };

  const handleImportSubmit = async (e) => {
    e.preventDefault();
    if (!excelFile) return toast.warning('Vui lòng chọn file Excel!');

    const data = new FormData();
    data.append('file', excelFile);

    try {
      await api.post('/students/import', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('Import file Excel thành công!');
      setShowImportModal(false);
      setExcelFile(null);
      fetchStudents();
    } catch (err) {
      toast.error('Lỗi Import file');
    }
  };

  // KIỂM TRA CHÍNH XÁC: NẾU KHÔNG PHẢI NGÀY HÔM NAY THÌ KHÓA TOÀN BỘ (READ-ONLY)
  const isToday = cycleInfo?.is_today ?? (selectedDate === new Date().toISOString().split('T')[0]);
  const isReadOnly = !isToday;
  const isWeekend = cycleInfo?.is_weekend !== undefined ? cycleInfo.is_weekend : [0, 6].includes(new Date(selectedDate).getDay());

  return (
    <div className="space-y-6">
      {/* THANH BỘ LỌC TỔ HỢP TÍCH HỢP LỊCH CALENDAR CHỌN NGÀY VÀO CA */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-wrap gap-3 items-center justify-between print:hidden">
        <div className="flex flex-wrap gap-2 items-center">
          <div className="flex items-center space-x-1 text-slate-700 font-bold mr-1 text-sm">
            <Filter className="w-4 h-4 text-cyan-600" />
            <span>Bộ Lọc:</span>
          </div>

          <div className="flex items-center space-x-1.5 bg-cyan-50/70 border border-cyan-300 rounded-lg p-1.5">
            <Calendar className="w-4 h-4 text-cyan-700" />
            <input
              type="date"
              className="bg-transparent font-bold text-xs text-cyan-950 outline-none cursor-pointer"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </div>

          <select
            className="border border-slate-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-cyan-500 outline-none font-semibold text-slate-700"
            value={selectedGrade}
            onChange={handleGradeChange}
          >
            <option value="">-- Tất cả Khối (3 - 12) --</option>
            {[3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((g) => (
              <option key={g} value={g}>Khối {g}</option>
            ))}
          </select>

          <select
            disabled={['10', '11', '12'].includes(selectedGrade)}
            className="border border-slate-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-cyan-500 outline-none font-semibold disabled:bg-slate-100 disabled:text-slate-400 text-slate-700"
            value={selectedClassType}
            onChange={(e) => setSelectedClassType(e.target.value)}
          >
            <option value="">-- Tất cả Loại Lớp --</option>
            {['CLC', 'CC', 'CC1', 'CC2', 'NC', 'NC1', 'NC2', 'NC3'].map((c) => (
              <option key={c} value={c}>Lớp {c}</option>
            ))}
          </select>

          <select
            className="border border-slate-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-cyan-500 outline-none font-bold bg-slate-50 text-slate-800"
            value={selectedShift}
            onChange={(e) => setSelectedShift(e.target.value)}
          >
            <option value="">-- Tất cả Ca Trong Ngày --</option>
            {isWeekend ? (
              <>
                <option value="ca1">Ca 1 (8h00 - 9h30)</option>
                <option value="ca2">Ca 2 (9h30 - 11h00)</option>
                <option value="ca3">Ca 3 (14h00 - 15h30)</option>
                <option value="ca4">Ca 4 (15h30 - 17h00)</option>
                <option value="ca5">Ca 5 (17h00 - 18h30)</option>
              </>
            ) : (
              <>
                <option value="ca1">Ca 1 (17h30 - 19h00)</option>
                <option value="ca2">Ca 2 (19h00 - 20h30)</option>
                <option value="ca3">Ca 3 (20h30 - 22h00)</option>
              </>
            )}
          </select>

          {(selectedGrade || selectedClassType || selectedShift || selectedDate !== new Date().toISOString().split('T')[0]) && (
            <button
              onClick={handleResetFilters}
              className="flex items-center space-x-1 text-xs text-slate-600 hover:text-rose-600 bg-slate-100 hover:bg-rose-50 px-2.5 py-2 rounded-lg font-medium border border-slate-200 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Hôm nay</span>
            </button>
          )}
        </div>

        {/* NÚT ĐIỂM DANH VÀ LƯU ĐIỂM CHỈ HIỂN THỊ KHI LÀ NGÀY HÔM NAY (!isReadOnly) */}
        <div className="flex space-x-2">
          <button
            onClick={handleExportExcel}
            className="bg-emerald-700 text-white px-3 py-2 rounded-lg text-xs font-bold flex items-center space-x-1 hover:bg-emerald-800 shadow-sm transition-colors"
            title="Xuất Excel"
          >
            <Download className="w-4 h-4" />
            <span>Xuất Excel</span>
          </button>

          {!isReadOnly && (
            <button
              onClick={handleSaveAllGrades}
              className="bg-cyan-700 text-white px-3 py-2 rounded-lg text-xs font-bold flex items-center space-x-1 hover:bg-cyan-800 shadow-sm transition-colors"
            >
              <Save className="w-4 h-4" />
              <span>Lưu tất cả điểm</span>
            </button>
          )}

          {!isReadOnly && unattendedSelectedIds.length > 0 && (
            <button onClick={handleBulkAttendance} className="bg-slate-800 text-white px-3 py-2 rounded-lg text-xs font-bold flex items-center space-x-1 hover:bg-slate-900">
              <CheckSquare className="w-4 h-4" />
              <span>Điểm danh ({unattendedSelectedIds.length})</span>
            </button>
          )}

          {!isReadOnly && attendedSelectedIds.length > 0 && (
            <button onClick={handleBulkCancelAttendance} className="bg-rose-700 text-white px-3 py-2 rounded-lg text-xs font-bold flex items-center space-x-1 hover:bg-rose-800">
              <RotateCcw className="w-4 h-4" />
              <span>Hủy ({attendedSelectedIds.length})</span>
            </button>
          )}

          <button onClick={() => setShowImportModal(true)} className="bg-slate-700 text-white px-3 py-2 rounded-lg text-xs font-bold flex items-center space-x-1 hover:bg-slate-800">
            <Upload className="w-4 h-4" />
            <span>Import Excel</span>
          </button>

          <button onClick={() => setShowAddModal(true)} className="bg-cyan-600 text-white px-3 py-2 rounded-lg text-xs font-bold flex items-center space-x-1 hover:bg-cyan-700">
            <UserPlus className="w-4 h-4" />
            <span>Thêm Học Sinh</span>
          </button>
        </div>
      </div>

      {/* CẢNH BÁO CHẾ ĐỘ CHỈ XEM NẾU KHÔNG PHẢI HÔM NAY */}
      {cycleInfo && (
        <div className={`text-xs p-3 rounded-lg border flex items-center justify-between print:hidden transition-colors ${
          isReadOnly 
            ? 'bg-amber-50 text-amber-900 border-amber-300' 
            : 'bg-slate-50 text-slate-600 border-slate-200'
        }`}>
          <div className="flex items-center space-x-2">
            {isReadOnly ? <Lock className="w-4 h-4 text-amber-700" /> : <Calendar className="w-4 h-4 text-cyan-600" />}
            <span>
              {isReadOnly ? (
                <b>⚠️ ĐANG XEM NGÀY KHÁC ({cycleInfo.date_formatted}): Hệ thống đã khóa tính năng điểm danh và nhập điểm đối với ngày này.</b>
              ) : (
                <>Kỳ tính buổi Tháng {cycleInfo.month}/{cycleInfo.year}: Từ ngày <b>{cycleInfo.start_date}</b> đến ngày <b>{cycleInfo.end_date}</b> (Chốt hết ngày 20)</>
              )}
            </span>
          </div>

          <span className="font-bold text-cyan-900 bg-cyan-100/70 px-2.5 py-1 rounded-md">
            {isWeekend ? '⚡ Khung giờ Cuối Tuần (5 Ca)' : '🌙 Khung giờ Ngày Thường (3 Ca Tối)'}
          </span>
        </div>
      )}

      {/* BẢNG DANH SÁCH HỌC SINH */}
      <div className="bg-white rounded-xl shadow-sm overflow-x-auto border border-slate-200 print:hidden">
        <table className="w-full text-left border-collapse min-w-[1100px]">
          <thead className="bg-slate-900 text-slate-100 text-xs uppercase font-semibold">
            <tr>
              <th className="p-3.5 w-10 text-center">
                <input
                  type="checkbox"
                  disabled={isReadOnly}
                  className="w-4 h-4 rounded cursor-pointer disabled:cursor-not-allowed"
                  onChange={(e) => setSelectedIds(e.target.checked ? students.map((s) => s.id) : [])}
                  checked={students.length > 0 && selectedIds.length === students.length}
                />
              </th>
              <th className="p-3.5 whitespace-nowrap">Mã HS</th>
              <th className="p-3.5 whitespace-nowrap">Họ và Tên</th>
              <th className="p-3.5 whitespace-nowrap">Khối / Lớp</th>
              <th className="p-3.5 whitespace-nowrap">Tên Bố/Mẹ & SĐT</th>
              <th className="p-3.5 text-center whitespace-nowrap">Số buổi trong tháng</th>
              <th className="p-3.5 text-center whitespace-nowrap">Điểm Buổi Học</th>
              <th className="p-3.5 text-center whitespace-nowrap">Bài Tập Về Nhà</th>
              <th className="p-3.5 text-center whitespace-nowrap">Thao tác</th>
              <th className="p-3.5 text-center whitespace-nowrap">
                Trạng thái ngày {cycleInfo?.date_formatted || ''}
              </th>
              <th className="p-3.5 text-center whitespace-nowrap">Chi tiết</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 text-xs">
            {loading ? (
              <tr><td colSpan="11" className="p-6 text-center text-slate-500">Đang tải dữ liệu...</td></tr>
            ) : students.length === 0 ? (
              <tr><td colSpan="11" className="p-6 text-center text-slate-500 font-medium">Không tìm thấy học sinh phù hợp.</td></tr>
            ) : (
              students.map((s) => {
                const activeAtt = s.active_shift_attendance || s.today_attendance;
                const attId = activeAtt?.id;
                const rowState = attId ? rowInputs[attId] || { score: '', homework_status: '', isSaved: false } : null;
                const shifts = s.today_shifts || {};

                return (
                  <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3.5 text-center">
                      <input
                        type="checkbox"
                        disabled={isReadOnly}
                        className="w-4 h-4 rounded cursor-pointer disabled:cursor-not-allowed"
                        checked={selectedIds.includes(s.id)}
                        onChange={() => setSelectedIds(selectedIds.includes(s.id) ? selectedIds.filter((i) => i !== s.id) : [...selectedIds, s.id])}
                      />
                    </td>
                    <td className="p-3.5 font-bold text-slate-700 whitespace-nowrap">{s.student_code}</td>
                    
                    <td className="p-3.5 whitespace-nowrap">
                      <span
                        onClick={() => handleOpenDetail(s)}
                        className="font-bold text-slate-900 hover:text-cyan-600 cursor-pointer transition-colors"
                      >
                        {s.full_name}
                      </span>
                    </td>

                    <td className="p-3.5 whitespace-nowrap">
                      <span className="font-semibold text-slate-800">Khối {s.grade}</span>
                      {s.class_type && <span className="ml-1.5 bg-slate-100 text-slate-700 font-medium px-2 py-0.5 rounded border border-slate-200">{s.class_type}</span>}
                    </td>

                    <td className="p-3.5 whitespace-nowrap">
                      <p className="font-semibold text-slate-800">{s.parent_name}</p>
                      <p className="font-mono text-slate-500 text-[11px]">{s.parent_phone}</p>
                    </td>
                    
                    <td className="p-3.5 text-center font-bold text-cyan-800 text-sm whitespace-nowrap bg-cyan-50/20">
                      {s.total_sessions_in_cycle || 0} buổi
                    </td>

                    <td className="p-3.5 text-center whitespace-nowrap">
                      {attId ? (
                        <input
                          type="text"
                          disabled={isReadOnly}
                          placeholder="VD: 8.5"
                          value={rowState?.score ?? ''}
                          onChange={(e) => handleInputChange(attId, 'score', e.target.value)}
                          className="w-20 border border-slate-300 rounded-md p-1 text-center font-bold text-slate-800 focus:ring-2 focus:ring-cyan-500 outline-none disabled:bg-slate-100 disabled:text-slate-500"
                        />
                      ) : (
                        <span className="text-slate-400 italic">Vắng / Chưa điểm danh</span>
                      )}
                    </td>

                    <td className="p-3.5 text-center whitespace-nowrap">
                      {attId ? (
                        <select
                          disabled={isReadOnly}
                          value={rowState?.homework_status ?? ''}
                          onChange={(e) => handleInputChange(attId, 'homework_status', e.target.value)}
                          className="border border-slate-300 rounded-md p-1 font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-cyan-500 disabled:bg-slate-100 disabled:text-slate-500"
                        >
                          <option value="">-- BTVN --</option>
                          <option value="Đã làm">Đã làm</option>
                          <option value="Chưa làm">Chưa làm</option>
                          <option value="Thiếu bài">Thiếu bài</option>
                        </select>
                      ) : (
                        <span className="text-slate-400 italic">-</span>
                      )}
                    </td>

                    <td className="p-3.5 text-center whitespace-nowrap">
                      {attId && !isReadOnly ? (
                        <button
                          onClick={() => handleSaveRow(attId)}
                          className={`px-2.5 py-1 rounded-md text-xs font-bold inline-flex items-center space-x-1 transition-colors ${
                            rowState?.isSaved
                              ? 'bg-slate-100 text-slate-600 border border-slate-300'
                              : 'bg-cyan-700 text-white hover:bg-cyan-800'
                          }`}
                        >
                          {rowState?.isSaved ? <Check className="w-3 h-3" /> : <Save className="w-3 h-3" />}
                          <span>{rowState?.isSaved ? 'Đã lưu' : 'Lưu'}</span>
                        </button>
                      ) : isReadOnly ? (
                        <span className="inline-flex items-center space-x-1 text-[11px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded border">
                          <Lock className="w-3 h-3" />
                          <span>Chỉ xem</span>
                        </span>
                      ) : null}
                    </td>

                    <td className="p-3.5 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center space-x-1 text-[10px]">
                        {isWeekend ? (
                          ['ca1', 'ca2', 'ca3', 'ca4', 'ca5'].map((cKey, idx) => (
                            <span 
                              key={cKey}
                              className={`px-1.5 py-0.5 rounded font-bold border ${
                                shifts[cKey] ? 'bg-emerald-50 text-emerald-800 border-emerald-300' : 'bg-slate-50 text-slate-400 border-slate-200'
                              }`}
                            >
                              Ca{idx + 1}: {shifts[cKey] ? shifts[cKey].time : 'Vắng'}
                            </span>
                          ))
                        ) : (
                          ['ca1', 'ca2', 'ca3'].map((cKey, idx) => (
                            <span 
                              key={cKey}
                              className={`px-2 py-0.5 rounded font-bold border ${
                                shifts[cKey] ? 'bg-emerald-50 text-emerald-800 border-emerald-300' : 'bg-slate-50 text-slate-400 border-slate-200'
                              }`}
                            >
                              Ca {idx + 1}: {shifts[cKey] ? shifts[cKey].time : 'Vắng'}
                            </span>
                          ))
                        )}
                      </div>
                    </td>

                    <td className="p-3.5 text-center whitespace-nowrap">
                      <button onClick={() => handleOpenDetail(s)} className="text-slate-600 hover:bg-slate-100 p-1.5 rounded-lg border border-slate-200 transition-colors">
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL CHI TIẾT HỌC SINH */}
      {detailStudent && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex justify-center items-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-2xl shadow-xl relative border border-slate-200 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-200 pb-3 print:hidden">
              <div className="flex space-x-2">
                <button
                  onClick={() => setIsEditing(!isEditing)}
                  className="flex items-center space-x-1.5 bg-slate-100 text-slate-700 border border-slate-300 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-slate-200"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>{isEditing ? 'Hủy chỉnh sửa' : 'Chỉnh sửa thông tin'}</span>
                </button>

                <button
                  onClick={handlePrintStudent}
                  className="flex items-center space-x-1.5 bg-slate-800 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-slate-900"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>In phiếu thông tin</span>
                </button>

                <button
                  onClick={() => handleDeleteStudent(detailStudent.id, detailStudent.full_name)}
                  className="flex items-center space-x-1.5 bg-rose-50 text-rose-700 border border-rose-200 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-rose-100"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Xóa học sinh</span>
                </button>
              </div>

              <button onClick={() => setDetailStudent(null)} className="text-slate-400 hover:text-slate-800 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            {!isEditing ? (
              <div id="print-area" className="space-y-5 text-slate-800">
                <div className="text-center border-b border-slate-200 pb-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500">TRUNG TÂM TOÁN MATH CENTER</p>
                  <p className="text-[11px] text-slate-400 uppercase tracking-widest mt-0.5">PHIẾU BÁO CÁO HỌC TẬP HỌC SINH</p>
                  <h2 className="text-2xl font-extrabold text-cyan-800 mt-2">{detailStudent.full_name}</h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Mã HS: <span className="font-mono font-bold text-slate-800">{detailStudent.student_code}</span> | Khối <b className="text-slate-800">{detailStudent.grade}</b> {detailStudent.class_type && `(${detailStudent.class_type})`}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50">
                    <p className="text-slate-500 font-medium flex items-center space-x-1.5">
                      <Calendar className="w-3.5 h-3.5 text-cyan-600" />
                      <span>Ngày bắt đầu học:</span>
                    </p>
                    <p className="font-bold text-slate-800 text-sm mt-1">{new Date(detailStudent.start_date || Date.now()).toLocaleDateString('vi-VN')}</p>
                  </div>

                  <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50">
                    <p className="text-slate-500 font-medium flex items-center space-x-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-cyan-600" />
                      <span>Tình trạng học tập:</span>
                    </p>
                    <p className="font-bold text-slate-800 text-sm mt-1">{detailStudent.academic_status || 'Khá'}</p>
                  </div>

                  <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50">
                    <p className="text-slate-500 font-medium flex items-center space-x-1.5">
                      <TrendingUp className="w-3.5 h-3.5 text-cyan-600" />
                      <span>Điểm trung bình (Tháng {cycleInfo?.month}):</span>
                    </p>
                    <p className="font-extrabold text-cyan-800 text-base mt-1">
                      {detailStudent.avg_score_in_cycle > 0 ? `${detailStudent.avg_score_in_cycle} / 10` : 'Chưa có điểm'}
                    </p>
                  </div>

                  <div 
                    onClick={() => setShowHistoryModal(true)}
                    className="p-3.5 rounded-xl border border-cyan-300 bg-cyan-50/80 hover:bg-cyan-100 cursor-pointer transition-all hover:shadow-md group relative"
                    title="Bấm để xem lịch sử những buổi nào đã đi học"
                  >
                    <div className="flex justify-between items-start">
                      <p className="text-cyan-900 font-bold flex items-center space-x-1.5">
                        <CheckSquare className="w-3.5 h-3.5 text-cyan-600" />
                        <span>Tổng đi học (Tháng {cycleInfo?.month}):</span>
                      </p>
                      <span className="text-[10px] bg-cyan-700 text-white font-bold px-2 py-0.5 rounded-full group-hover:bg-cyan-800 transition-colors">
                        Xem chi tiết ➔
                      </span>
                    </div>
                    <p className="font-black text-cyan-950 text-lg mt-1">
                      {detailStudent.total_sessions_in_cycle || 0} buổi
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50">
                    <p className="text-slate-500 font-medium flex items-center space-x-1.5">
                      <UserX className="w-3.5 h-3.5 text-cyan-600" />
                      <span>Số buổi nghỉ học:</span>
                    </p>
                    <p className="font-bold text-slate-800 text-xs mt-1">
                      Tháng {cycleInfo?.month}: <b>{detailStudent.absent_sessions_in_cycle || 0} buổi</b>
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50">
                    <p className="text-slate-500 font-medium flex items-center space-x-1.5">
                      <Award className="w-3.5 h-3.5 text-cyan-600" />
                      <span>Học bổng đạt được:</span>
                    </p>
                    <p className="font-extrabold text-slate-900 text-sm mt-1">{detailStudent.scholarship_count || 0} lần / năm</p>
                  </div>

                  <div className={`p-4 rounded-xl border flex items-center justify-between ${
                    detailStudent.is_paid_in_cycle 
                      ? 'bg-emerald-50/50 border-emerald-200' 
                      : (new Date().getDate() > 20 ? 'bg-rose-50/50 border-rose-200' : 'bg-slate-50 border-slate-200')
                  }`}>
                    <div>
                      <p className="text-slate-700 font-bold flex items-center space-x-1.5 text-xs">
                        <Calculator className="w-4 h-4 text-cyan-600" />
                        <span>Tổng học phí (Tháng {cycleInfo?.month}):</span>
                      </p>
                      
                      <div className="flex items-center space-x-2 mt-1">
                        {detailStudent.is_paid_in_cycle ? (
                          <span className="inline-flex items-center space-x-1 bg-emerald-600 text-white font-bold text-[10px] px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Đã thanh toán</span>
                          </span>
                        ) : new Date().getDate() > 20 ? (
                          <span className="inline-flex items-center space-x-1 bg-rose-600 text-white font-bold text-[10px] px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                            <Clock className="w-3 h-3" />
                            <span>Chưa nộp học phí</span>
                          </span>
                        ) : null}
                        <span className="text-[11px] text-slate-500">
                          ({detailStudent.total_sessions_in_cycle || 0} buổi x {Number(detailStudent.price_per_session || 130000).toLocaleString('vi-VN')} đ)
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className={`text-2xl font-black ${detailStudent.is_paid_in_cycle ? 'text-emerald-800' : (new Date().getDate() > 20 ? 'text-rose-700' : 'text-slate-800')}`}>
                        {Number(detailStudent.total_tuition_in_cycle || 0).toLocaleString('vi-VN')} đ
                      </p>
                      {detailStudent.invoice_info && (
                        <p className="text-[10px] font-mono text-emerald-700 mt-0.5">
                          Mã HD: {detailStudent.invoice_info.invoice_code}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/30 text-xs space-y-1.5">
                  <p className="font-bold text-slate-700 flex items-center space-x-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-cyan-600" />
                    <span>Nhận xét của giáo viên:</span>
                  </p>
                  <p className="text-slate-700 bg-white p-3 rounded-lg border border-slate-200 font-normal leading-relaxed">
                    {detailStudent.teacher_comment || 'Chưa có nhận xét chi tiết.'}
                  </p>
                </div>

                <div className="border-t border-slate-200 pt-3 text-xs text-slate-600 space-y-1">
                  <p>• Phụ huynh liên hệ: <b>{detailStudent.parent_name}</b> - SĐT: <b className="font-mono">{(detailStudent.parent_phone || '').replace(/\D/g, '')}</b></p>
                  <p>• Mức học phí niêm yết: <b>{Number(detailStudent.price_per_session || 130000).toLocaleString('vi-VN')} đ/buổi</b></p>
                </div>
              </div>
            ) : (
              <form onSubmit={handleUpdateStudent} className="space-y-3 text-xs">
                <h3 className="font-bold text-sm text-slate-800 border-b border-slate-200 pb-2">Chỉnh Sửa Thông Tin Học Sinh</h3>
                
                <div>
                  <label className="block font-medium mb-1">Họ và tên *</label>
                  <input
                    type="text"
                    required
                    className="w-full border border-slate-300 rounded p-2 text-sm font-bold"
                    value={editFormData.full_name || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, full_name: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-medium mb-1">Khối *</label>
                    <select
                      className="w-full border border-slate-300 rounded p-2 text-sm font-semibold"
                      value={editFormData.grade || 9}
                      onChange={(e) => setEditFormData({ ...editFormData, grade: e.target.value })}
                    >
                      {[3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((g) => (
                        <option key={g} value={g}>Khối {g}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-medium mb-1">Loại lớp</label>
                    <select
                      disabled={['10', '11', '12'].includes(String(editFormData.grade))}
                      className="w-full border border-slate-300 rounded p-2 text-sm font-semibold disabled:bg-slate-100"
                      value={editFormData.class_type || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, class_type: e.target.value })}
                    >
                      <option value="">-- Chọn lớp --</option>
                      {['CLC', 'CC', 'CC1', 'CC2', 'NC', 'NC1', 'NC2', 'NC3'].map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-medium mb-1">Tên Bố/Mẹ *</label>
                    <input
                      type="text"
                      required
                      className="w-full border border-slate-300 rounded p-2 text-sm"
                      value={editFormData.parent_name || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, parent_name: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block font-medium mb-1">SĐT Bố/Mẹ *</label>
                    <input
                      type="text"
                      required
                      className="w-full border border-slate-300 rounded p-2 text-sm font-mono"
                      value={editFormData.parent_phone || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, parent_phone: e.target.value.replace(/\D/g, '') })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-medium mb-1">Học phí / Buổi (VNĐ)</label>
                    <input
                      type="number"
                      step="5000"
                      className="w-full border border-slate-300 rounded p-2 text-sm font-bold text-slate-800"
                      value={editFormData.price_per_session || 130000}
                      onChange={(e) => setEditFormData({ ...editFormData, price_per_session: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block font-medium mb-1">Ngày bắt đầu học</label>
                    <input
                      type="date"
                      className="w-full border border-slate-300 rounded p-2 text-sm"
                      value={editFormData.start_date || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, start_date: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-medium mb-1">Tình trạng học tập</label>
                    <input
                      type="text"
                      className="w-full border border-slate-300 rounded p-2 text-sm"
                      value={editFormData.academic_status || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, academic_status: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block font-medium mb-1">Số lần học bổng tháng / năm</label>
                    <input
                      type="number"
                      className="w-full border border-slate-300 rounded p-2 text-sm"
                      value={editFormData.scholarship_count || 0}
                      onChange={(e) => setEditFormData({ ...editFormData, scholarship_count: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-medium mb-1">Nhận xét của giáo viên</label>
                  <textarea
                    rows="3"
                    className="w-full border border-slate-300 rounded p-2 text-sm"
                    placeholder="Nhập nhận xét..."
                    value={editFormData.teacher_comment || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, teacher_comment: e.target.value })}
                  />
                </div>

                <button type="submit" className="w-full bg-cyan-700 text-white py-2.5 rounded-lg font-bold hover:bg-cyan-800 transition-colors">
                  Lưu Thay Đổi
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* POPUP BẢNG LỊCH SỬ ĐI HỌC CHI TIẾT */}
      {showHistoryModal && detailStudent && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center p-4 z-[60]">
          <div className="bg-white rounded-2xl p-6 w-full max-w-xl shadow-2xl relative border border-slate-200 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-200 pb-3">
              <div>
                <h3 className="font-extrabold text-base text-cyan-900">Bảng Lịch Sử Buổi Đi Học</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Học sinh: <b className="text-slate-800">{detailStudent.full_name}</b> ({detailStudent.student_code}) - Kỳ Tháng {cycleInfo?.month}/{cycleInfo?.year}
                </p>
              </div>
              <button 
                onClick={() => setShowHistoryModal(false)} 
                className="text-slate-400 hover:text-slate-800 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {(!detailStudent.attendance_history_in_cycle || detailStudent.attendance_history_in_cycle.length === 0) ? (
              <div className="p-8 text-center text-slate-500 text-xs font-medium">
                Chưa có dữ liệu buổi đi học nào trong kỳ tháng {cycleInfo?.month}.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-cyan-900 text-white font-bold uppercase text-[11px]">
                    <tr>
                      <th className="p-3 text-center w-12">STT</th>
                      <th className="p-3">Ngày Đi Học</th>
                      <th className="p-3">Ca Học / Giờ Đến Lớp</th>
                      <th className="p-3 text-center">Điểm Buổi</th>
                      <th className="p-3 text-center">Bài Tập Về Nhà</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {detailStudent.attendance_history_in_cycle.map((item, idx) => (
                      <tr key={item.id || idx} className="hover:bg-cyan-50/50 transition-colors">
                        <td className="p-3 text-center font-bold text-slate-500">{idx + 1}</td>
                        <td className="p-3 font-bold text-slate-900">{item.date}</td>
                        <td className="p-3">
                          <span className="bg-emerald-100 text-emerald-800 font-bold px-2.5 py-1 rounded text-[11px] inline-block border border-emerald-200">
                            {item.shift_name} ({item.time})
                          </span>
                        </td>
                        <td className="p-3 text-center font-extrabold text-cyan-800">{item.score}</td>
                        <td className="p-3 text-center font-semibold text-slate-700">{item.homework_status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex justify-between items-center pt-3 border-t border-slate-200 text-xs font-bold text-slate-700">
              <span>Tổng số buổi đã tham gia: <b className="text-cyan-800 text-sm">{detailStudent.total_sessions_in_cycle || 0} buổi</b></span>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="bg-slate-800 text-white px-4 py-1.5 rounded-lg hover:bg-slate-900 transition-colors"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL THÊM HỌC SINH MỚI */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex justify-center items-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl relative border border-slate-200">
            <button onClick={() => setShowAddModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-800">
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-bold mb-4 text-slate-900">Thêm Học Sinh Mới</h2>
            <form onSubmit={handleAddSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-medium mb-1">Họ và tên *</label>
                <input type="text" required className="w-full border rounded p-2 text-sm" value={formData.full_name} onChange={(e) => setFormData({ ...formData, full_name: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1">Khối lớp *</label>
                  <select className="w-full border rounded p-2 text-sm" value={formData.grade} onChange={(e) => setFormData({ ...formData, grade: e.target.value })}>
                    {[3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((g) => (<option key={g} value={g}>Khối {g}</option>))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Loại lớp</label>
                  <select disabled={['10', '11', '12'].includes(String(formData.grade))} className="w-full border rounded p-2 text-sm disabled:bg-slate-100" value={formData.class_type} onChange={(e) => setFormData({ ...formData, class_type: e.target.value })}>
                    {['CLC', 'CC', 'CC1', 'CC2', 'NC', 'NC1', 'NC2', 'NC3'].map((c) => (<option key={c} value={c}>{c}</option>))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Tên Bố/Mẹ *</label>
                <input type="text" required placeholder="Ví dụ: Nguyễn Văn Bình (Bố)" className="w-full border rounded p-2 text-sm" value={formData.parent_name} onChange={(e) => setFormData({ ...formData, parent_name: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">SĐT Bố/Mẹ *</label>
                <input type="text" required className="w-full border rounded p-2 text-sm" value={formData.parent_phone} onChange={(e) => setFormData({ ...formData, parent_phone: e.target.value.replace(/\D/g, '') })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1">Học phí / Buổi</label>
                  <input type="number" step="5000" className="w-full border rounded p-2 text-sm font-bold text-slate-800" value={formData.price_per_session} onChange={(e) => setFormData({ ...formData, price_per_session: e.target.value })} />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Ngày bắt đầu</label>
                  <input type="date" className="w-full border rounded p-2 text-sm" value={formData.start_date} onChange={(e) => setFormData({ ...formData, start_date: e.target.value })} />
                </div>
              </div>
              <button type="submit" className="w-full bg-cyan-700 text-white py-2.5 rounded-lg font-bold mt-2 hover:bg-cyan-800 transition-colors">Lưu Học Sinh</button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL IMPORT EXCEL */}
      {showImportModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex justify-center items-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl relative border border-slate-200">
            <button onClick={() => setShowImportModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-800">
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-bold mb-4 text-slate-900">Import Danh Sách Từ Excel</h2>
            <form onSubmit={handleImportSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Chọn file (.xlsx, .xls, .csv)</label>
                <input
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  required
                  className="w-full border rounded-lg p-2 text-sm"
                  onChange={(e) => setExcelFile(e.target.files[0])}
                />
              </div>
              <button type="submit" className="w-full bg-cyan-700 text-white py-2.5 rounded-lg font-bold hover:bg-cyan-800 transition-colors">
                Tải Lên File Excel
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}