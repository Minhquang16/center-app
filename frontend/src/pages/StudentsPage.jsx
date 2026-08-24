import React, { useEffect, useState } from 'react';
import api from '../api/axios';
import { toast } from 'sonner';
import { useLocation } from 'react-router-dom';
import Swal from 'sweetalert2';
import {
  UserPlus, Upload, CheckSquare, X, RotateCcw, Filter, Eye, Award,
  Calendar, BookOpen, Calculator, RefreshCw, Printer, Edit3, Save,
  UserX, MessageSquare, Trash2, Check, TrendingUp, Download, CheckCircle2, Clock, Lock, Search
} from 'lucide-react';

export default function StudentsPage() {
  const getLocalDateString = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const getCurrentShift = () => {
    const d = new Date();
    const mins = d.getHours() * 60 + d.getMinutes();
    const isWk = [0, 6].includes(d.getDay());
    if (isWk) {
      if (mins < 9 * 60 + 30) return 'ca1';
      if (mins < 11 * 60 + 15) return 'ca2';
      if (mins < 15 * 60 + 30) return 'ca3';
      if (mins < 17 * 60 + 15) return 'ca4';
      return 'ca5';
    } else {
      if (mins < 19 * 60) return 'ca1';
      if (mins < 20 * 60 + 30) return 'ca2';
      return 'ca3';
    }
  };

  const [students, setStudents] = useState([]);
  const [cycleInfo, setCycleInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);

  const location = useLocation();

  const [selectedDate, setSelectedDate] = useState(getLocalDateString());
  const [selectedGrade, setSelectedGrade] = useState('');
  const [selectedClassType, setSelectedClassType] = useState('');
  
  // Read state from location (navigation from Classes page)
  useEffect(() => {
    if (location.state) {
      if (location.state.grade) setSelectedGrade(location.state.grade);
      if (location.state.classType) setSelectedClassType(location.state.classType);
      
      // Also clear search term when coming from another page
      setSearchTerm('');
    }
  }, [location.state]);

  const [selectedShift, setSelectedShift] = useState(getCurrentShift());
  const [searchTerm, setSearchTerm] = useState('');
  const deferredSearchTerm = React.useDeferredValue(searchTerm);
  
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  const [visibleMobileCount, setVisibleMobileCount] = useState(15);
  const [classesList, setClassesList] = useState([]);

  useEffect(() => {
    const loadClasses = async () => {
      try {
        const res = await api.get('/classes');
        setClassesList(res.data || []);
      } catch (err) { }
    };
    loadClasses();
  }, []);

  // Compute shifts for the selected class and date
  const availableShiftsForClass = React.useMemo(() => {
    const d = new Date(selectedDate);
    const dayOfWeek = d.getDay() === 0 ? 8 : d.getDay() + 1;

    const isAllClasses = !selectedGrade && !selectedClassType;

    if (isAllClasses) {
      // Gather ALL shifts across ALL classes
      const allShifts = [];
      classesList.forEach(c => {
        if (c.schedules && c.schedules.length > 0) {
          c.schedules.forEach(s => {
            if (Number(s.dayOfWeek) === dayOfWeek) {
              const label = `${s.startTime} - ${s.endTime}`;
              if (!allShifts.find(x => x.label === label)) {
                allShifts.push({
                  value: label,
                  label: label,
                  startTime: s.startTime,
                  endTime: s.endTime
                });
              }
            }
          });
        }
      });
      allShifts.sort((a, b) => a.startTime.localeCompare(b.startTime));
      return allShifts;
    }

    // find class matching grade and class_type
    const selectedClass = classesList.find(c => {
      const isHighSchool = ['10', '11', '12'].includes(String(c.grade));
      const type = isHighSchool ? '' : c.class_code.replace(`${c.grade}-`, '');
      return String(c.grade) === String(selectedGrade) && type === selectedClassType;
    });

    if (!selectedClass || !selectedClass.schedules || selectedClass.schedules.length === 0) return [];

    return selectedClass.schedules.filter(s => Number(s.dayOfWeek) === dayOfWeek).map((s) => {
      return {
        value: `${s.startTime} - ${s.endTime}`,
        label: `${s.startTime} - ${s.endTime}`,
        startTime: s.startTime,
        endTime: s.endTime
      };
    });
  }, [selectedGrade, selectedClassType, selectedDate, classesList]);

  // Auto-select shift if a class has a shift today
  useEffect(() => {
    if (availableShiftsForClass && availableShiftsForClass.length > 0) {
      // just pick the first one by default if not set
      setSelectedShift(availableShiftsForClass[0].value);
    } else if (availableShiftsForClass && availableShiftsForClass.length === 0) {
      setSelectedShift(''); // No shift available
    }
  }, [availableShiftsForClass]);

  // Reset pagination when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedGrade, selectedClassType, selectedShift, deferredSearchTerm, selectedDate]);

  const shiftStarted = React.useMemo(() => {
    if (!selectedShift) return false;
    try {
      const startTimeStr = selectedShift.split(' - ')[0];
      if (!startTimeStr) return true;
      const [sh, sm] = startTimeStr.split(':').map(Number);
      const now = new Date();
      if (selectedDate !== getLocalDateString()) return true;
      
      const shiftMins = sh * 60 + sm;
      const nowMins = now.getHours() * 60 + now.getMinutes();
      return nowMins >= (shiftMins - 30);
    } catch {
      return true;
    }
  }, [selectedShift, selectedDate]);


  const [scoreModalData, setScoreModalData] = useState(null);
  const [tuitionDetailModal, setTuitionDetailModal] = useState(null);

  const [detailStudent, setDetailStudent] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editFormData, setEditFormData] = useState({});
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  const [inlineEditingNote, setInlineEditingNote] = useState(false);
  const [inlineNoteValue, setInlineNoteValue] = useState('');

  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    grade: '',
    class_type: '',
    parent_name: '',
    parent_phone: '',
    price_per_session: 130000,
    start_date: getLocalDateString(),
    teacher_comment: '',
    debt: 0,
  });

  const [showImportModal, setShowImportModal] = useState(false);
  const [excelFile, setExcelFile] = useState(null);

  const fetchStudents = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const res = await api.get('/students', {
        params: {
          date: selectedDate,
          grade: selectedGrade,
          class_type: selectedClassType,
          shift: selectedShift,
          search: searchTerm,
        },
      });

      let data = Array.isArray(res.data) ? res.data : (res.data?.data || []);

      const parsedStudents = data.map(s => {
        const activeAtt = s.active_shift_attendance;
        let rankScore = { hasHw: false, totalTestScore: 0, hwStatus: '', rawScore: null };
        if (activeAtt) {
          try {
            if (activeAtt.score && activeAtt.score.startsWith('{')) {
              const parsed = JSON.parse(activeAtt.score);
              const tests = parsed.tests || [];
              rankScore.totalTestScore = Math.round(tests.reduce((acc, val) => acc + (parseFloat(val) || 0), 0) * 100) / 100;
              rankScore.hwStatus = activeAtt.homework_status || '';
              rankScore.hasHw = ['Đã làm', 'Đã nộp'].includes(rankScore.hwStatus);
              rankScore.rawScore = parsed;
            } else {
              rankScore.totalTestScore = parseFloat(activeAtt.score) || 0;
              rankScore.hwStatus = activeAtt.homework_status || '';
              rankScore.hasHw = ['Đã làm', 'Đã nộp'].includes(rankScore.hwStatus);
              rankScore.rawScore = { tests: [activeAtt.score], hwScore: '', hwComment: '' };
            }
          } catch (e) { }
        }
        return { ...s, rankScore };
      });

      // Sort logic
      parsedStudents.sort((a, b) => {
        const aAttended = !!(a.active_shift_attendance);
        const bAttended = !!(b.active_shift_attendance);
        if (aAttended !== bAttended) return aAttended ? -1 : 1;

        if (a.rankScore.hasHw !== b.rankScore.hasHw) {
          return a.rankScore.hasHw ? -1 : 1;
        }
        return b.rankScore.totalTestScore - a.rankScore.totalTestScore;
      });

      let currentRank = 1;
      let displayRank = 1;
      let prevRankScore = null;
      
      parsedStudents.forEach((s, idx) => {
        const activeAtt = s.active_shift_attendance;
        if (!activeAtt) {
          s.session_rank = '-';
          return;
        }
        if (prevRankScore) {
          if (s.rankScore.hasHw === prevRankScore.hasHw && s.rankScore.totalTestScore === prevRankScore.totalTestScore) {
            s.session_rank = displayRank;
          } else {
            displayRank = currentRank;
            s.session_rank = displayRank;
          }
        } else {
          s.session_rank = displayRank;
        }
        prevRankScore = s.rankScore;
        currentRank++;
      });

      setStudents(parsedStudents);

      if (res.data?.cycle_info) {
        setCycleInfo(res.data.cycle_info);
      }

      if (detailStudent) {
        const updatedDetail = data.find((item) => item.id === detailStudent.id);
        if (updatedDetail) {
          setDetailStudent(updatedDetail);
        }
      }
    } catch (err) {
      console.error("Lỗi lấy dữ liệu:", err);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchStudents();
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [selectedDate, selectedGrade, selectedClassType, selectedShift, searchTerm]);

  const handleResetFilters = () => {
    setSelectedDate(getLocalDateString());
    setSelectedGrade('');
    setSelectedClassType('');
    setSelectedShift(getCurrentShift());
    setSearchTerm('');
    setVisibleMobileCount(15);
  };

  const handleClassChange = (e) => {
    const val = e.target.value;
    if (!val) {
      setSelectedGrade('');
      setSelectedClassType('');
      return;
    }
    const [grade, type] = val.split('|');
    setSelectedGrade(grade);
    setSelectedClassType(type);
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

  const handleOpenScoreModal = (student) => {
    const activeAtt = student.active_shift_attendance;
    if (!activeAtt) return toast.warning('Học sinh chưa được điểm danh!');

    setScoreModalData({
      attendanceId: activeAtt.id,
      studentName: student.full_name,
      tests: student.rankScore?.rawScore?.tests || [''],
      hwStatus: student.rankScore?.hwStatus || '',
      hwScore: student.rankScore?.rawScore?.hwScore || '',
      hwComment: student.rankScore?.rawScore?.hwComment || ''
    });
  };

  const handleSaveScoreModal = async (e) => {
    e.preventDefault();
    if (!scoreModalData) return;

    try {
      const payload = {
        tests: scoreModalData.tests,
        hwScore: scoreModalData.hwScore,
        hwComment: scoreModalData.hwComment
      };
      const scoreStr = JSON.stringify(payload);

      await api.put(`/attendance/${scoreModalData.attendanceId}/grade`, {
        score: scoreStr,
        homework_status: scoreModalData.hwStatus,
      });

      toast.success('Lưu điểm thành công!');
      setScoreModalData(null);
      fetchStudents(false);
    } catch (err) {
      toast.error('Lỗi lưu điểm');
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
      fetchStudents(false);
    } catch (err) {
      toast.error('Lỗi lưu hàng loạt!');
    }
  };

  const handleExportExcel = () => {
    if (students.length === 0) return toast.warning('Không có dữ liệu học sinh để xuất file!');

    const nowStr = new Date().toLocaleString('vi-VN');
    const gradeStr = selectedGrade ? `Khối ${selectedGrade}` : 'Tất cả Khối';
    const classStr = selectedClassType ? `Lớp ${selectedClassType}` : 'Tất cả Loại Lớp';

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
<div class="title">TRUNG TÂM SUNNY EDUCATION</div>
<div class="subtitle">BÁO CÁO ĐIỂM BÀI HỌC VÀ BÀI TẬP VỀ NHÀ</div>
<br/>
<div class="meta">
<p><b>• Ngày xuất báo cáo:</b> ${nowStr}</p>
</div>
<table>
<thead>
<tr>
<th>STT</th>
<th>Mã HS</th>
<th>Họ và Tên</th>
<th>Khối / Lớp</th>
<th>Trạng Thái Điểm Danh</th>
<th>Điểm Buổi Học</th>
<th>Bài Tập Về Nhà</th>
<th>Tổng Điểm Buổi Học</th>
<th>Xếp Hạng Buổi Học</th>
</tr>
</thead>
<tbody>
`;

    const checkedInStudents = students.filter(s => s.active_shift_attendance);
    checkedInStudents.forEach((s, index) => {
      const att = s.active_shift_attendance;
      const attStatus = 'Đã đến lớp';

      let scoreStr = '-';
      let hwStr = '-';
      if (s.rankScore) {
        if (s.rankScore.rawScore && Array.isArray(s.rankScore.rawScore.tests)) {
          const tests = s.rankScore.rawScore.tests;
          const validTests = tests.filter(v => v !== null && v !== undefined && String(v).trim() !== '');
          if (validTests.length > 0) {
            scoreStr = validTests.map((v, i) => `Bài ${i + 1}: ${v}`).join(' | ');
          }

          let parts = [s.rankScore.hwStatus];
          if (s.rankScore.rawScore.hwScore) parts.push(s.rankScore.rawScore.hwScore);
          if (s.rankScore.rawScore.hwComment) parts.push(s.rankScore.rawScore.hwComment);
          hwStr = parts.filter(Boolean).join(' - ') || '';
        } else {
          scoreStr = s.rankScore.totalTestScore ? (Math.round(s.rankScore.totalTestScore * 100) / 100) : '-';
          hwStr = s.rankScore.hwStatus || '';
        }
      }

      tableHtml += `
<tr>
<td class="text-center">${index + 1}</td>
<td class="text-center text-bold">${s.student_code}</td>
<td class="text-bold">${s.full_name}</td>
<td class="text-center">Khối ${s.grade} ${s.class_type || ''}</td>
<td class="text-center">${attStatus}</td>
<td class="text-center text-bold">${scoreStr}</td>
<td class="text-center">${hwStr}</td>
<td class="text-center text-bold">${s.rankScore?.totalTestScore ? (Math.round(s.rankScore.totalTestScore * 100) / 100) : 0}</td>
<td class="text-center text-bold">${s.session_rank || '-'}</td>
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
    let className = 'Toan_Trung_Tam';
    if (selectedGrade) className = `Khoi_${selectedGrade}_${selectedClassType || ''}`;
    link.download = `Báo_cáo_điểm_${className.trim()}.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDeleteStudent = async (studentId, studentName) => {
    const result = await Swal.fire({
      title: 'Xác nhận xóa học sinh',
      html: `Bạn đang chọn xóa học sinh <b>${studentName}</b>.<br/>Vui lòng chọn lý do xóa:`,
      icon: 'warning',
      input: 'radio',
      inputOptions: {
        'dropped': 'Nghỉ học (Giữ lại dữ liệu điểm số, học phí)',
        'error': 'Xóa nhầm / Lỗi dữ liệu (Xóa vĩnh viễn)'
      },
      customClass: {
        input: 'flex flex-col text-sm text-left'
      },
      showCancelButton: true,
      confirmButtonText: 'Thực hiện',
      cancelButtonText: 'Hủy',
      inputValidator: (value) => {
        if (!value) {
          return 'Bạn cần chọn một lý do xóa!';
        }
      }
    });
    if (!result.isConfirmed) return;

    const reason = result.value;

    try {
      const res = await api.delete(`/students/${studentId}`, {
        data: { reason }
      });
      toast.success(res.data.message);
      setDetailStudent(null);
      fetchStudents(false);
    } catch (err) {
      toast.error('Lỗi xóa học sinh');
    }
  };

  const handleBulkDeleteStudents = async () => {
    if (selectedIds.length === 0) return;

    const result = await Swal.fire({
      title: 'Xác nhận xóa hàng loạt',
      html: `Bạn đang chọn xóa <b>${selectedIds.length}</b> học sinh.<br/>Vui lòng chọn lý do xóa:`,
      icon: 'warning',
      input: 'radio',
      inputOptions: {
        'dropped': 'Nghỉ học (Giữ lại dữ liệu điểm số, học phí)',
        'error': 'Xóa nhầm / Lỗi dữ liệu (Xóa vĩnh viễn)'
      },
      customClass: {
        input: 'flex flex-col text-sm text-left'
      },
      showCancelButton: true,
      confirmButtonText: 'Thực hiện',
      cancelButtonText: 'Hủy',
      inputValidator: (value) => {
        if (!value) return 'Bạn cần chọn một lý do xóa!';
      }
    });

    if (!result.isConfirmed) return;
    const reason = result.value;

    try {
      const res = await api.post('/students/bulk-delete', {
        student_ids: selectedIds,
        reason
      });
      toast.success(res.data.message || 'Xóa hàng loạt thành công');
      setSelectedIds([]);
      fetchStudents(false);
    } catch (err) {
      toast.error('Lỗi xóa học sinh hàng loạt');
    }
  };

  const handleSaveInlineNote = async () => {
    try {
      await api.put(`/students/${detailStudent.id}`, { ...detailStudent, teacher_comment: inlineNoteValue });
      setDetailStudent({ ...detailStudent, teacher_comment: inlineNoteValue });
      setInlineEditingNote(false);
      toast.success('Đã cập nhật ghi chú!');
      fetchStudents(false);
    } catch (err) {
      toast.error('Lỗi cập nhật ghi chú');
    }
  };

  const handleUpdateStudent = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/students/${editFormData.id}`, editFormData);
      toast.success('Cập nhật thông tin học sinh thành công!');
      setIsEditing(false);
      fetchStudents(false);
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

  const unattendedSelectedIds = students.filter((s) => selectedIds.includes(s.id) && !s.active_shift_attendance).map((s) => s.id);
  const attendedSelectedIds = students.filter((s) => selectedIds.includes(s.id) && s.active_shift_attendance && s.can_cancel_attendance).map((s) => s.id);

  const handleBulkAttendance = async () => {
    if (unattendedSelectedIds.length === 0) return;
    try {
      const res = await api.post('/attendance/bulk-check-in', { student_ids: unattendedSelectedIds, date: selectedDate, shift: selectedShift });
      toast.success(res.data.message);
      setSelectedIds([]);
      fetchStudents(false);
    } catch (err) {
      const serverMessage = err.response?.data?.message || 'Lỗi điểm danh hàng loạt';
      toast.error(serverMessage);
    }
  };

  const handleSingleAttendance = async (studentId) => {
    try {
      const res = await api.post('/attendance/bulk-check-in', { student_ids: [studentId], date: selectedDate, shift: selectedShift });
      toast.success(res.data.message);
      fetchStudents(false);
    } catch (err) {
      const serverMessage = err.response?.data?.message || 'Lỗi điểm danh';
      toast.error(serverMessage);
    }
  };

  const handleMakeupAttendance = async (studentId) => {
    let targetShift = selectedShift;
    
    if (!targetShift) {
      const options = {};
      if (availableShiftsForClass && availableShiftsForClass.length > 0) {
        availableShiftsForClass.forEach(s => options[s.value] = s.label);
      } else {
        // Fallback if no shifts available for this class, just allow text input
        const { value: textShift } = await Swal.fire({
          title: 'Nhập ca học bù',
          input: 'text',
          inputPlaceholder: 'VD: 18:00 - 19:30',
          showCancelButton: true,
          confirmButtonText: 'Điểm danh',
          cancelButtonText: 'Thoát'
        });
        if (!textShift) return;
        targetShift = textShift;
      }
      
      if (!targetShift && Object.keys(options).length > 0) {
        const result = await Swal.fire({
          title: 'Chọn ca học bù',
          input: 'select',
          inputOptions: options,
          inputPlaceholder: 'Chọn một ca học',
          showCancelButton: true,
          confirmButtonText: 'Điểm danh',
          cancelButtonText: 'Thoát'
        });
        if (!result.isConfirmed || !result.value) return;
        targetShift = result.value;
      }
    }

    try {
      const res = await api.post('/attendance/bulk-check-in', { student_ids: [studentId], date: selectedDate, shift: targetShift, is_makeup: true });
      toast.success(res.data.message);
      fetchStudents(false);
    } catch (err) {
      const serverMessage = err.response?.data?.message || 'Lỗi điểm danh học bù';
      toast.error(serverMessage);
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
      fetchStudents(false);
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
        debt: Number(formData.debt || 0),
      };

      const res = await api.post('/students', payload);
      toast.success('🎉 Thêm học sinh mới thành công!');
      setShowAddModal(false);

      setFormData({
        full_name: '',
        grade: '',
        class_type: '',
        parent_name: '',
        parent_phone: '',
        price_per_session: 130000,
        start_date: getLocalDateString(),
        teacher_comment: '',
        debt: 0,
      });

      if (res.data && res.data.id) {
        setSelectedIds(prev => [...prev, res.data.id]);
      }

      fetchStudents(false);
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
      fetchStudents(false);
    } catch (err) {
      toast.error('Lỗi Import file');
    }
  };

  const todayStr = getLocalDateString();
  const isToday = cycleInfo?.is_today ?? (selectedDate === todayStr);

  const targetDateObj = new Date(selectedDate);
  const targetDayOfWeek = targetDateObj.getDay() === 0 ? 8 : targetDateObj.getDay() + 1;

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdmin = user.email === 'admin@gmail.com';

  const calculateIsReadOnly = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selectedD = new Date(selectedDate);
    selectedD.setHours(0, 0, 0, 0);
    const diffDays = (today.getTime() - selectedD.getTime()) / (1000 * 3600 * 24);

    if (diffDays < 0) return true;
    if (isAdmin) {
      return diffDays > 3;
    } else {
      return diffDays > 0;
    }
  };
  const isReadOnly = calculateIsReadOnly();

  const isWeekend = cycleInfo?.is_weekend !== undefined ? cycleInfo.is_weekend : [0, 6].includes(new Date(selectedDate).getDay());

  const filteredStudents = React.useMemo(() => {
    return students.filter(s => {
      if (!deferredSearchTerm) return true;
      const term = deferredSearchTerm.toLowerCase();
      const name = s.full_name?.toLowerCase() || '';
      const code = s.student_code?.toLowerCase() || '';
      return name.includes(term) || code.includes(term);
    });
  }, [students, deferredSearchTerm]);

  const totalPages = Math.ceil(filteredStudents.length / itemsPerPage);
  const paginatedStudents = React.useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredStudents.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredStudents, currentPage, itemsPerPage]);

  const classCounts = cycleInfo?.global_shift_counts || {};
  const checkedInTotal = cycleInfo?.global_checked_in_total || 0;

  return (
    <div className="space-y-6">
      {/* THANH BỘ LỌC TỔ HỢP TÍCH HỢP LỊCH CALENDAR CHỌN NGÀY VÀO CA */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm dark:shadow-none border border-slate-200 dark:border-slate-700 flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between print:hidden">
        <div className="flex flex-wrap gap-2.5 items-center w-full lg:w-auto">
          <div className="flex items-center space-x-1 text-slate-700 dark:text-slate-300 font-bold mr-1 text-sm">
            <Filter className="w-4 h-4 text-cyan-600" />
            <span>Bộ Lọc:</span>
          </div>

          <div className="flex items-center space-x-1.5 bg-cyan-50 dark:bg-cyan-900/30 border border-cyan-300 dark:border-cyan-700 rounded-lg p-1.5">
            <Calendar className="w-4 h-4 text-cyan-700 dark:text-cyan-400" />
            <input
              type="date"
              max={todayStr}
              className="bg-transparent font-bold text-xs text-cyan-950 dark:text-cyan-100 outline-none cursor-pointer dark:[color-scheme:dark]"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </div>

          <select
            className="border border-slate-300 dark:border-slate-600 rounded-lg p-2 text-xs focus:ring-2 focus:ring-cyan-500 dark:focus:ring-cyan-400 outline-none font-semibold text-slate-700 dark:text-slate-300 w-full sm:w-auto"
            value={selectedGrade ? `${selectedGrade}|${selectedClassType}` : ""}
            onChange={handleClassChange}
          >
            <option value="">-- Tất cả Lớp học --</option>
            {classesList.map(c => {
              const isHighSchool = ['10', '11', '12'].includes(String(c.grade));
              const type = isHighSchool ? '' : c.class_code.replace(`${c.grade}-`, '');
              return <option key={c.id} value={`${c.grade}|${type}`}>{c.name}</option>;
            })}
          </select>

          <select
            className="border border-slate-300 dark:border-slate-600 rounded-lg p-2 text-xs focus:ring-2 focus:ring-cyan-500 dark:focus:ring-cyan-400 outline-none font-bold bg-slate-50 dark:bg-slate-900/50 text-slate-800 dark:text-slate-200 w-full sm:w-auto"
            value={selectedShift}
            onChange={(e) => setSelectedShift(e.target.value)}
          >
            <option value="">-- Tất cả Ca Trong Ngày --</option>
            {availableShiftsForClass && availableShiftsForClass.length > 0 ? (
              availableShiftsForClass.map(s => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))
            ) : (
              <option value="" disabled>Hôm nay không có lịch học nào</option>
            )}
          </select>

          {/* Search field */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-slate-400" />
            </div>
            <input
              type="text"
              placeholder="Tìm tên hoặc mã HS..."
              className="pl-8 pr-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-xs focus:ring-2 focus:ring-cyan-500 dark:focus:ring-cyan-400 outline-none font-semibold text-slate-700 dark:text-slate-300 w-full sm:w-48"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {(searchTerm || selectedGrade || selectedClassType || selectedShift || selectedDate !== getLocalDateString()) && (
            <button
              onClick={handleResetFilters}
              className="flex items-center space-x-1 text-xs text-slate-600 dark:text-slate-400 hover:text-rose-600 bg-slate-100 dark:bg-slate-700/50 hover:bg-rose-50 dark:bg-rose-900/30 px-2.5 py-2 rounded-lg font-medium border border-slate-200 dark:border-slate-700 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Hôm nay</span>
            </button>
          )}
        </div>

        {/* NÚT ĐIỂM DANH VÀ LƯU ĐIỂM CHỈ HIỂN THỊ KHI LÀ NGÀY HÔM NAY (!isReadOnly) */}
        <div className="flex flex-wrap gap-2 w-full lg:w-auto border-t lg:border-t-0 border-slate-100 dark:border-slate-700 pt-3 lg:pt-0">
          <button
            onClick={handleExportExcel}
            className="bg-emerald-700 text-white px-3 py-2 rounded-lg text-xs font-bold flex items-center space-x-1 hover:bg-emerald-800 shadow-sm dark:shadow-none transition-colors"
            title="Xuất Excel"
          >
            <Download className="w-4 h-4" />
            <span>Xuất Excel</span>
          </button>

          {!isReadOnly && (
            <button
              onClick={handleSaveAllGrades}
              className="bg-cyan-700 text-white px-3 py-2 rounded-lg text-xs font-bold flex items-center space-x-1 hover:bg-cyan-800 shadow-sm dark:shadow-none transition-colors"
            >
              <Save className="w-4 h-4" />
              <span>Lưu tất cả điểm</span>
            </button>
          )}

          {!isReadOnly && unattendedSelectedIds.length > 0 && (
            <button onClick={handleBulkAttendance} className="bg-slate-800 text-white px-3 py-2 rounded-lg text-xs font-bold flex items-center space-x-1 hover:bg-slate-900" disabled={!shiftStarted || !selectedShift}>
              <CheckSquare className="w-4 h-4" />
              <span>{!selectedShift ? 'Chọn Ca học' : (shiftStarted ? `Điểm danh (${unattendedSelectedIds.length})` : 'Chưa đến giờ')}</span>
            </button>
          )}

          {!isReadOnly && attendedSelectedIds.length > 0 && (
            <button onClick={handleBulkCancelAttendance} className="bg-rose-700 text-white px-3 py-2 rounded-lg text-xs font-bold flex items-center space-x-1 hover:bg-rose-800">
              <RotateCcw className="w-4 h-4" />
              <span>Hủy ({attendedSelectedIds.length})</span>
            </button>
          )}

          {selectedIds.length > 0 && (
            <button onClick={handleBulkDeleteStudents} className="bg-red-600 text-white px-3 py-2 rounded-lg text-xs font-bold flex items-center space-x-1 hover:bg-red-700 shadow-sm dark:shadow-none transition-colors">
              <Trash2 className="w-4 h-4" />
              <span>Xóa ({selectedIds.length})</span>
            </button>
          )}

          <button onClick={() => setShowImportModal(true)} className="bg-slate-700 text-white px-3 py-2 rounded-lg text-xs font-bold flex items-center space-x-1 hover:bg-slate-800">
            <Upload className="w-4 h-4" />
            <span>Import Excel</span>
          </button>

          <button onClick={() => {
            setFormData({
              ...formData,
              grade: selectedGrade ? Number(selectedGrade) : '',
              class_type: selectedClassType || ''
            });
            setShowAddModal(true);
          }} className="bg-cyan-600 text-white px-3 py-2 rounded-lg text-xs font-bold flex items-center space-x-1 hover:bg-cyan-700">
            <UserPlus className="w-4 h-4" />
            <span>Thêm Học Sinh</span>
          </button>
        </div>
      </div>

      {/* CẢNH BÁO CHẾ ĐỘ CHỈ XEM NẾU KHÔNG PHẢI HÔM NAY */}
      {cycleInfo && (
        <div className={`text-xs p-3.5 rounded-xl border flex flex-col md:flex-row gap-3 items-start md:items-center justify-between print:hidden transition-colors ${isReadOnly
            ? 'bg-amber-50 dark:bg-amber-900/30 text-amber-900 border-amber-300'
            : 'bg-slate-50 dark:bg-slate-900/50 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
          }`}>
          <div className="flex items-start md:items-center space-x-2">
            {isReadOnly ? <Lock className="w-4 h-4 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5 md:mt-0" /> : <Calendar className="w-4 h-4 text-cyan-600 shrink-0 mt-0.5 md:mt-0" />}
            <span>
              {isReadOnly ? (
                <b>⚠️ ĐANG XEM NGÀY KHÁC ({cycleInfo.date_formatted}): Hệ thống đã khóa tính năng điểm danh và nhập điểm đối với ngày này.</b>
              ) : (
                <>Kỳ tính buổi Tháng {cycleInfo.month}/{cycleInfo.year}: Từ ngày <b>{cycleInfo.start_date}</b> đến ngày <b>{cycleInfo.end_date}</b> (Chốt hết ngày 20)</>
              )}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto border-t md:border-t-0 border-slate-200 dark:border-slate-700 pt-3 md:pt-0">
            <span className="font-bold text-slate-800 dark:text-slate-200 bg-slate-200/70 dark:bg-slate-700/60 px-2.5 py-1.5 rounded-md shadow-sm dark:shadow-none border border-slate-300 dark:border-slate-600">
              Sĩ số: {students.length} học sinh
            </span>
            <span className="font-bold text-cyan-900 dark:text-cyan-300 bg-cyan-100/70 dark:bg-cyan-900/40 px-2.5 py-1.5 rounded-md border border-transparent dark:border-cyan-800">
              {isWeekend ? '⚡ Khung giờ Cuối Tuần (5 Ca)' : '🌙 Khung giờ Ngày Thường (3 Ca Tối)'}
            </span>
          </div>
        </div>
      )}

      {/* THỐNG KÊ ĐIỂM DANH THEO LỚP */}
      <div className="bg-white dark:bg-slate-800 p-3 rounded-xl shadow-sm dark:shadow-none border border-slate-200 dark:border-slate-700 flex flex-wrap gap-2 items-center text-xs print:hidden">
        <span className="font-bold text-slate-700 dark:text-slate-300 mr-2 flex items-center">
          <CheckSquare className="w-4 h-4 text-emerald-600 mr-1.5" />
          Đã điểm danh ({checkedInTotal}):
        </span>
        {Object.entries(classCounts).map(([type, count]) => (
          <span key={type} className="bg-emerald-50 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded-md font-semibold">
            Lớp {type}: {count}
          </span>
        ))}
        {checkedInTotal === 0 && <span className="text-slate-500 italic">Chưa có học sinh nào điểm danh ca này</span>}
      </div>

      {/* BẢNG DANH SÁCH HỌC SINH */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm dark:shadow-none overflow-hidden border border-slate-200 dark:border-slate-700 print:hidden">

        {/* BẢNG DESKTOP */}
        <div className="overflow-x-auto hidden md:block">
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
                {(!selectedGrade) ? (
                  <th className="p-3.5 text-center whitespace-nowrap">Số buổi đi học trong tháng</th>
                ) : (
                  <>
                    <th className="p-3.5 text-center whitespace-nowrap">Tổng điểm buổi học</th>
                    <th className="p-3.5 text-center whitespace-nowrap">Xếp hạng buổi học</th>
                  </>
                )}
                <th className="p-3.5 text-center whitespace-nowrap">Điểm buổi học</th>
                <th className="p-3.5 text-center whitespace-nowrap">
                  Trạng thái ngày {cycleInfo?.date_formatted || ''}
                </th>
                <th className="p-3.5 text-center whitespace-nowrap">Chi tiết</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs">
              {loading ? (
                <tr><td colSpan="11" className="p-6 text-center text-slate-500 dark:text-slate-400">Đang tải dữ liệu...</td></tr>
              ) : filteredStudents.length === 0 ? (
                <tr><td colSpan="11" className="p-6 text-center text-slate-500 dark:text-slate-400 font-medium">Không tìm thấy học sinh phù hợp.</td></tr>
              ) : (
                paginatedStudents.map((s) => {
                  const activeAtt = s.active_shift_attendance;
                  const attId = activeAtt?.id;
                  const shifts = s.today_shifts || {};

                  const studentClassInfo = classesList.find(c => {
                    const isHighSchool = ['10', '11', '12'].includes(String(c.grade));
                    const type = isHighSchool ? '' : c.class_code.replace(`${c.grade}-`, '');
                    return String(c.grade) === String(s.grade) && type === (s.class_type || '');
                  });
                  const studentHasShiftToday = studentClassInfo?.schedules?.some(sch => Number(sch.dayOfWeek) === targetDayOfWeek) || false;

                  return (
                    <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 dark:bg-slate-900/50 transition-colors">
                      <td className="p-3.5 text-center">
                        <input
                          type="checkbox"
                          disabled={isReadOnly}
                          className="w-4 h-4 rounded cursor-pointer disabled:cursor-not-allowed"
                          checked={selectedIds.includes(s.id)}
                          onChange={() => setSelectedIds(selectedIds.includes(s.id) ? selectedIds.filter((i) => i !== s.id) : [...selectedIds, s.id])}
                        />
                      </td>
                      <td className="p-3.5 font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">{s.student_code}</td>

                      <td className="p-3.5 whitespace-nowrap">
                        <span
                          onClick={() => handleOpenDetail(s)}
                          className="font-bold text-slate-900 dark:text-white hover:text-cyan-600 cursor-pointer transition-colors"
                        >
                          {s.full_name}
                        </span>
                      </td>

                      <td className="p-3.5 whitespace-nowrap">
                        <span className="font-semibold text-slate-800 dark:text-slate-200">Khối {s.grade}</span>
                        {s.class_type && <span className="ml-1.5 bg-slate-100 dark:bg-slate-700/50 text-slate-700 dark:text-slate-300 font-medium px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">{s.class_type}</span>}
                      </td>

                      <td className="p-3.5 whitespace-nowrap">
                        <p className="font-semibold text-slate-800 dark:text-slate-200">{s.parent_name}</p>
                        <p className="font-mono text-slate-500 dark:text-slate-400 text-[11px]">{s.parent_phone}</p>
                      </td>

                      {(!selectedGrade) ? (
                        <td className="p-3.5 text-center font-bold text-emerald-600 text-sm whitespace-nowrap bg-emerald-50 dark:bg-emerald-900/30">
                          {s.total_sessions_in_cycle || 0} buổi
                        </td>
                      ) : (
                        <>
                          <td className="p-3.5 text-center font-bold text-cyan-800 dark:text-cyan-300 text-sm whitespace-nowrap bg-cyan-50 dark:bg-cyan-900/30">
                            {s.rankScore?.totalTestScore ? (Math.round(s.rankScore.totalTestScore * 100) / 100) : 0} đ
                          </td>
                          <td className="p-3.5 text-center font-bold text-rose-600 text-sm whitespace-nowrap bg-rose-50 dark:bg-rose-900/30">
                            {s.session_rank || '-'}
                          </td>
                        </>
                      )}

                      <td className="p-3.5 text-center whitespace-nowrap">
                        {attId ? (
                          <button
                            disabled={isReadOnly}
                            onClick={() => handleOpenScoreModal(s)}
                            className="px-3 py-1.5 rounded-md text-xs font-bold bg-cyan-600 text-white hover:bg-cyan-700 disabled:bg-slate-300"
                          >
                            Nhập / Xem Điểm
                          </button>
                        ) : (
                          <div className="flex justify-center gap-2">
                            {studentHasShiftToday ? (
                              <button
                                disabled={isReadOnly}
                                onClick={() => handleSingleAttendance(s.id)}
                                className="px-3 py-1.5 rounded-md text-xs font-bold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600 disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:text-slate-400 border border-slate-300 dark:border-slate-600 transition-colors"
                              >
                                Điểm danh
                              </button>
                            ) : (
                              <button
                                disabled={isReadOnly}
                                onClick={() => handleMakeupAttendance(s.id)}
                                className="px-3 py-1.5 rounded-md text-xs font-bold bg-amber-500 text-white hover:bg-amber-600 disabled:bg-slate-300 transition-colors"
                                title="Điểm danh học bù"
                              >
                                Học bù
                              </button>
                            )}
                          </div>
                        )}
                      </td>

                      <td className="p-3.5 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center space-x-1 text-[10px]">
                          {(selectedShift ? [selectedShift] : (isWeekend ? ['ca1', 'ca2', 'ca3', 'ca4', 'ca5'] : ['ca1', 'ca2', 'ca3'])).map((cKey) => {
                            const shiftNum = cKey.replace('ca', '');
                            return (
                              <span
                                key={cKey}
                                className={`px-2 py-0.5 rounded font-bold border ${shifts[cKey] ? (shifts[cKey].status === 'makeup' ? 'bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 border-amber-300' : 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300 border-emerald-300') : 'bg-slate-50 dark:bg-slate-900/50 text-slate-400 border-slate-200 dark:border-slate-700'
                                  }`}
                              >
                                {shifts[cKey] ? (shifts[cKey].status === 'makeup' ? `Học bù (${shifts[cKey].time})` : `Ca ${shiftNum}: ${shifts[cKey].time}`) : `Ca ${shiftNum}: Vắng`}
                              </span>
                            );
                          })}
                        </div>
                      </td>

                      <td className="p-3.5 text-center whitespace-nowrap">
                        <button onClick={() => handleOpenDetail(s)} className="text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:bg-slate-700/50 p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 transition-colors">
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

        {/* Pagination Desktop */}
        {totalPages > 1 && (
          <div className="hidden md:flex justify-between items-center p-4 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 rounded-b-xl shadow-sm">
            <div className="text-sm text-slate-500 dark:text-slate-400">
              Hiển thị trang <b>{currentPage}</b> / {totalPages} (Tổng số <b>{filteredStudents.length}</b> học sinh)
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-4 py-1.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >Trang trước</button>
              <button 
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-4 py-1.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >Trang sau</button>
            </div>
          </div>
        )}

        {/* DẠNG THẺ MOBILE */}
        <div className="md:hidden">
          <div className="grid grid-cols-1 gap-4 p-4 bg-slate-50 dark:bg-slate-900/30">
            {loading ? (
              <div className="text-center text-slate-500 py-4">Đang tải dữ liệu...</div>
            ) : filteredStudents.length === 0 ? (
              <div className="text-center text-slate-500 py-4 font-medium">Không tìm thấy học sinh phù hợp.</div>
            ) : (
              filteredStudents.slice(0, visibleMobileCount).map((s) => {
                const activeAtt = s.active_shift_attendance;
                const attId = activeAtt?.id;
                const shifts = s.today_shifts || {};

                const studentClassInfo = classesList.find(c => {
                  const isHighSchool = ['10', '11', '12'].includes(String(c.grade));
                  const type = isHighSchool ? '' : c.class_code.replace(`${c.grade}-`, '');
                  return String(c.grade) === String(s.grade) && type === (s.class_type || '');
                });
                const studentHasShiftToday = studentClassInfo?.schedules?.some(sch => Number(sch.dayOfWeek) === targetDayOfWeek) || false;

                return (
                  <div key={s.id} className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-slate-200 dark:border-slate-700 space-y-3 relative">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          disabled={isReadOnly}
                          className="w-5 h-5 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500 cursor-pointer disabled:cursor-not-allowed"
                          checked={selectedIds.includes(s.id)}
                          onChange={() => setSelectedIds(selectedIds.includes(s.id) ? selectedIds.filter((i) => i !== s.id) : [...selectedIds, s.id])}
                        />
                        <div>
                          <h3 className="font-bold text-slate-900 dark:text-white text-base" onClick={() => handleOpenDetail(s)}>{s.full_name}</h3>
                          <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">{s.student_code}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="font-semibold text-xs text-slate-800 dark:text-slate-200">Khối {s.grade}</span>
                        {s.class_type && <span className="ml-1.5 bg-slate-100 dark:bg-slate-700/50 text-slate-700 dark:text-slate-300 text-[10px] font-bold px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">{s.class_type}</span>}
                      </div>
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-3 text-xs space-y-2 border border-slate-100 dark:border-slate-700">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500">Phụ huynh:</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">{s.parent_name} - <span className="font-mono text-[11px]">{s.parent_phone}</span></span>
                      </div>

                      {(!selectedGrade) ? (
                        <div className="flex justify-between items-center border-t border-slate-200 dark:border-slate-700 pt-2">
                          <span className="text-slate-500">Số buổi (tháng):</span>
                          <span className="font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 rounded">{s.total_sessions_in_cycle || 0} buổi</span>
                        </div>
                      ) : (
                        <>
                          <div className="flex justify-between items-center border-t border-slate-200 dark:border-slate-700 pt-2">
                            <span className="text-slate-500">Điểm buổi học:</span>
                            <span className="font-bold text-cyan-700 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-900/30 px-2 py-0.5 rounded">{s.rankScore?.totalTestScore ? (Math.round(s.rankScore.totalTestScore * 100) / 100) : 0} đ</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-slate-500">Xếp hạng:</span>
                            <span className="font-bold text-rose-600 bg-rose-50 dark:bg-rose-900/30 px-2 py-0.5 rounded">{s.session_rank || '-'}</span>
                          </div>
                        </>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {(selectedShift ? [selectedShift] : (isWeekend ? ['ca1', 'ca2', 'ca3', 'ca4', 'ca5'] : ['ca1', 'ca2', 'ca3'])).map((cKey) => {
                        const shiftNum = cKey.replace('ca', '');
                        return (
                          <span
                            key={cKey}
                            className={`text-[10px] px-2 py-1 rounded font-bold border flex-1 text-center ${shifts[cKey] ? (shifts[cKey].status === 'makeup' ? 'bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 border-amber-300' : 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300 border-emerald-300') : 'bg-slate-50 dark:bg-slate-900/50 text-slate-400 border-slate-200 dark:border-slate-700'
                              }`}
                          >
                            {shifts[cKey] ? (shifts[cKey].status === 'makeup' ? `Học bù: ${shifts[cKey].time}` : `Ca ${shiftNum}: ${shifts[cKey].time}`) : `Ca ${shiftNum}: Vắng`}
                          </span>
                        );
                      })}
                    </div>

                    <div className="flex justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-700">
                      <button onClick={() => handleOpenDetail(s)} className="flex-1 flex justify-center items-center gap-1 text-center text-[11px] sm:text-xs font-bold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-700/50 py-2 rounded-lg border border-slate-200 dark:border-slate-600">
                        <Eye className="w-3.5 h-3.5 hidden sm:block" /> Chi tiết
                      </button>
                      {attId ? (
                        <button
                          disabled={isReadOnly}
                          onClick={() => handleOpenScoreModal(s)}
                          className="flex-[2] flex justify-center items-center gap-1 text-center text-[11px] sm:text-xs font-bold bg-cyan-600 text-white py-2 rounded-lg disabled:bg-slate-300 hover:bg-cyan-700 transition-colors"
                        >
                          <Award className="w-3.5 h-3.5" /> Nhập Điểm
                        </button>
                      ) : (
                        <>
                          {studentHasShiftToday ? (
                            <button
                              disabled={isReadOnly}
                              onClick={() => handleSingleAttendance(s.id)}
                              className="flex-[1.2] flex justify-center items-center gap-1 text-center text-[11px] sm:text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-200 dark:bg-slate-700 py-2 rounded-lg disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:text-slate-400 hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors border border-slate-300 dark:border-slate-600"
                            >
                              <CheckSquare className="w-3.5 h-3.5 hidden sm:block" /> Điểm danh
                            </button>
                          ) : (
                            <button
                              disabled={isReadOnly}
                              onClick={() => handleMakeupAttendance(s.id)}
                              className="flex-[1.2] flex justify-center items-center gap-1 text-center text-[11px] sm:text-xs font-bold bg-amber-500 text-white py-2 rounded-lg disabled:bg-slate-300 hover:bg-amber-600 transition-colors shadow-sm"
                            >
                              Học bù
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {filteredStudents.length > visibleMobileCount && (
            <div className="p-4 bg-slate-50 dark:bg-slate-900/30 flex justify-center pb-2">
              <button
                onClick={() => setVisibleMobileCount(prev => prev + 15)}
                className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 px-6 py-2.5 rounded-full text-sm font-bold shadow-sm hover:shadow-md transition-all active:scale-95"
              >
                Xem thêm học sinh ({visibleMobileCount} / {filteredStudents.length})
              </button>
            </div>
          )}

          {selectedIds.length > 0 && (
            <div className="p-4 bg-slate-100 dark:bg-slate-800 flex flex-wrap gap-2 justify-center border-t border-slate-200 dark:border-slate-700 pb-8 sticky bottom-0 z-10 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
              <span className="w-full text-center text-xs font-bold text-slate-500 mb-1">Đã chọn {selectedIds.length} học sinh:</span>
              {!isReadOnly && unattendedSelectedIds.length > 0 && (
                <button onClick={handleBulkAttendance} className="bg-slate-800 text-white px-4 py-2.5 rounded-xl text-sm font-bold flex items-center space-x-1.5 shadow-md active:scale-95 transition-all">
                  <CheckSquare className="w-4 h-4" />
                  <span>Điểm danh hàng loạt ({unattendedSelectedIds.length})</span>
                </button>
              )}
              {!isReadOnly && attendedSelectedIds.length > 0 && (
                <button onClick={handleBulkCancelAttendance} className="bg-rose-700 text-white px-4 py-2.5 rounded-xl text-sm font-bold flex items-center space-x-1.5 shadow-md active:scale-95 transition-all">
                  <RotateCcw className="w-4 h-4" />
                  <span>Hủy điểm danh ({attendedSelectedIds.length})</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* MODAL CHI TIẾT HỌC SINH */}
      {detailStudent && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex justify-center items-center p-4 z-50" onClick={() => setDetailStudent(null)}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-2xl shadow-xl dark:shadow-none relative border border-slate-200 dark:border-slate-700 space-y-5 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-start gap-4 border-b border-slate-200 dark:border-slate-700 pb-3 print:hidden">
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setIsEditing(!isEditing)}
                  className="flex items-center space-x-1.5 bg-slate-100 dark:bg-slate-700/50 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-600 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-slate-200"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>{isEditing ? 'Hủy chỉnh sửa' : 'Chỉnh sửa thông tin'}</span>
                </button>

                <button
                  onClick={handlePrintStudent}
                  className="flex items-center justify-center space-x-1.5 bg-slate-800 text-white px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-slate-900"
                  title="In phiếu thông tin"
                >
                  <Printer className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                  <span className="hidden sm:inline">In phiếu thông tin</span>
                </button>

                <button
                  onClick={() => handleDeleteStudent(detailStudent.id, detailStudent.full_name)}
                  className="flex items-center justify-center space-x-1.5 bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 border border-rose-200 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-rose-100"
                  title="Xóa học sinh"
                >
                  <Trash2 className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                  <span className="hidden sm:inline">Xóa học sinh</span>
                </button>
              </div>

              <button onClick={() => { setDetailStudent(null); setInlineEditingNote(false); }} className="text-slate-400 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-700/50 rounded p-1 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {!isEditing ? (
              <div id="print-area" className="space-y-5 text-slate-800 dark:text-slate-200">
                <div className="text-center border-b border-slate-200 dark:border-slate-700 pb-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">TRUNG TÂM SUNNY EDUCATION</p>
                  <p className="text-[11px] text-slate-400 uppercase tracking-widest mt-0.5">PHIẾU BÁO CÁO HỌC TẬP HỌC SINH</p>
                  <h2 className="text-2xl font-extrabold text-cyan-800 dark:text-cyan-300 mt-2">{detailStudent.full_name}</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Mã HS: <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{detailStudent.student_code}</span> | Khối <b className="text-slate-800 dark:text-slate-200">{detailStudent.grade}</b> {detailStudent.class_type && `(${detailStudent.class_type})`}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
                    <p className="text-slate-500 dark:text-slate-400 font-medium flex items-center space-x-1.5">
                      <Calendar className="w-3.5 h-3.5 text-cyan-600" />
                      <span>Ngày bắt đầu học:</span>
                    </p>
                    <p className="font-bold text-slate-800 dark:text-slate-200 text-sm mt-1">{new Date(detailStudent.start_date || Date.now()).toLocaleDateString('vi-VN')}</p>
                  </div>

                  <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
                    <p className="text-slate-500 dark:text-slate-400 font-medium flex items-center space-x-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-cyan-600" />
                      <span>Tình trạng học tập:</span>
                    </p>
                    <div className="mt-1 space-y-1">
                      <p className="font-bold text-slate-800 dark:text-slate-200 text-sm flex items-center justify-between">
                        <span className="text-slate-500 text-[11px] font-medium mr-2">Tháng {cycleInfo?.month}:</span>
                        <span className="text-cyan-700 dark:text-cyan-400">{detailStudent.academic_status_cycle || 'Chưa đánh giá'}</span>
                      </p>
                      <p className="font-bold text-slate-800 dark:text-slate-200 text-sm flex items-center justify-between border-t border-slate-200/60 dark:border-slate-700/60 pt-1 mt-1">
                        <span className="text-slate-500 text-[11px] font-medium mr-2">Năm {cycleInfo?.academic_year}:</span>
                        <span className="text-emerald-700 dark:text-emerald-400">{detailStudent.academic_status_year || 'Chưa đánh giá'}</span>
                      </p>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
                    <p className="text-slate-500 dark:text-slate-400 font-medium flex items-center space-x-1.5">
                      <TrendingUp className="w-3.5 h-3.5 text-cyan-600" />
                      <span>Điểm trung bình (Tháng {cycleInfo?.month}):</span>
                    </p>
                    <p className="font-extrabold text-cyan-800 dark:text-cyan-300 text-base mt-1">
                      {detailStudent.avg_score_in_cycle !== null && detailStudent.avg_score_in_cycle !== undefined ? `${detailStudent.avg_score_in_cycle} / 10` : 'Chưa có điểm'}
                    </p>
                    <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
                      <p className="text-slate-500 dark:text-slate-400 font-medium text-[11px]">Năm học {cycleInfo?.academic_year}:</p>
                      <p className="font-bold text-emerald-700 dark:text-emerald-400 text-sm">
                        {detailStudent.avg_score_in_year !== null && detailStudent.avg_score_in_year !== undefined ? `${detailStudent.avg_score_in_year} / 10` : 'Chưa có điểm'}
                      </p>
                    </div>
                  </div>

                  <div
                    onClick={() => setShowHistoryModal(true)}
                    className="p-3.5 rounded-xl border border-cyan-300 dark:border-cyan-700 bg-cyan-50 dark:bg-cyan-900/30 hover:bg-cyan-100 dark:hover:bg-cyan-800/50 cursor-pointer transition-all hover:shadow-md dark:shadow-none group relative"
                    title="Bấm để xem lịch sử những buổi nào đã đi học"
                  >
                    <p className="text-cyan-900 dark:text-cyan-100 font-bold flex items-center space-x-1.5 text-xs">
                      <CheckSquare className="w-3.5 h-3.5 text-cyan-600 shrink-0" />
                      <span>Tổng đi học (Tháng {cycleInfo?.month}):</span>
                    </p>
                    <div className="flex justify-between items-end mt-2">
                      <p className="font-black text-cyan-950 dark:text-cyan-100 text-lg leading-none">
                        {detailStudent.total_sessions_in_cycle || 0} buổi
                      </p>
                      <span className="text-[10px] bg-cyan-700 text-white font-bold px-2 py-1 rounded group-hover:bg-cyan-800 transition-colors whitespace-nowrap">
                        Chi tiết ➔
                      </span>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
                    <p className="text-slate-500 dark:text-slate-400 font-medium flex items-center space-x-1.5">
                      <UserX className="w-3.5 h-3.5 text-cyan-600" />
                      <span>Số buổi nghỉ học:</span>
                    </p>
                    <p className="font-bold text-slate-800 dark:text-slate-200 text-xs mt-1">
                      Tháng {cycleInfo?.month}: <b>{detailStudent.absent_sessions_in_cycle || 0} buổi</b>
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
                    <p className="text-slate-500 dark:text-slate-400 font-medium flex items-center space-x-1.5">
                      <Award className="w-3.5 h-3.5 text-cyan-600" />
                      <span>Học bổng đạt được:</span>
                    </p>
                    <p className="font-extrabold text-slate-900 dark:text-white text-sm mt-1">{detailStudent.scholarship_count || 0} lần / năm</p>
                  </div>

                  <div className={`col-span-2 p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${detailStudent.is_paid_in_cycle
                      ? 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200'
                      : (new Date().getDate() > 20 ? 'bg-rose-50 dark:bg-rose-900/30 border-rose-200' : 'bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-700')
                    }`}>
                    <div>
                      <p className="text-slate-700 dark:text-slate-300 font-bold flex items-center space-x-1.5 text-xs">
                        <Calculator className="w-4 h-4 text-cyan-600" />
                        <span>Tổng học phí cần đóng:</span>
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
                      </div>
                      <button
                        onClick={() => setTuitionDetailModal(detailStudent)}
                        className="mt-2 text-[10px] font-bold text-cyan-700 dark:text-cyan-400 bg-cyan-100 dark:bg-cyan-900/40 px-2 py-1 rounded hover:bg-cyan-200 dark:hover:bg-cyan-800/60 transition-colors"
                      >
                        Xem chi tiết học phí
                      </button>
                    </div>

                    <div className="text-left sm:text-right">
                      <p className={`text-2xl font-black ${detailStudent.is_paid_in_cycle ? 'text-emerald-800 dark:text-emerald-300' : (new Date().getDate() > 20 ? 'text-rose-700 dark:text-rose-400' : 'text-slate-800 dark:text-slate-200')}`}>
                        {Number(detailStudent.final_amount || detailStudent.total_tuition_in_cycle || 0).toLocaleString('vi-VN')} đ
                      </p>
                      {detailStudent.invoice_info && (
                        <p className="text-[10px] font-mono text-emerald-700 dark:text-emerald-400 mt-0.5">
                          Mã HD: {detailStudent.invoice_info.invoice_code}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs space-y-1.5">
                  <div className="flex justify-between items-center">
                    <p className="font-bold text-slate-700 dark:text-slate-300 flex items-center space-x-1.5">
                      <MessageSquare className="w-3.5 h-3.5 text-cyan-600" />
                      <span>Ghi chú:</span>
                    </p>
                    {!inlineEditingNote && (
                      <button
                        onClick={() => {
                          setInlineNoteValue(detailStudent.teacher_comment || '');
                          setInlineEditingNote(true);
                        }}
                        className="text-[10px] bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-1 rounded hover:bg-slate-300 dark:hover:bg-slate-600 font-bold transition-colors flex items-center space-x-1"
                      >
                        <Edit3 className="w-3 h-3" />
                        <span>Chỉnh sửa</span>
                      </button>
                    )}
                  </div>
                  {inlineEditingNote ? (
                    <div className="space-y-2 mt-2">
                      <textarea
                        autoFocus
                        rows="3"
                        className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2 text-sm bg-white dark:bg-slate-800 outline-none focus:border-cyan-500 text-slate-800 dark:text-slate-200"
                        value={inlineNoteValue}
                        onChange={(e) => setInlineNoteValue(e.target.value)}
                        placeholder="Nhập ghi chú..."
                      />
                      <div className="flex space-x-2 justify-end">
                        <button
                          onClick={() => setInlineEditingNote(false)}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                        >
                          Hủy
                        </button>
                        <button
                          onClick={handleSaveInlineNote}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold bg-cyan-600 text-white hover:bg-cyan-700 transition-colors flex items-center space-x-1"
                        >
                          <Save className="w-3.5 h-3.5" />
                          <span>Lưu ghi chú</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p
                      onDoubleClick={() => {
                        setInlineNoteValue(detailStudent.teacher_comment || '');
                        setInlineEditingNote(true);
                      }}
                      className="text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700 font-normal leading-relaxed whitespace-pre-wrap cursor-pointer hover:border-cyan-300 dark:hover:border-cyan-600 transition-colors"
                      title="Nhấp đúp để chỉnh sửa nhanh"
                    >
                      {detailStudent.teacher_comment || 'Chưa có ghi chú.'}
                    </p>
                  )}
                </div>

                <div className="border-t border-slate-200 dark:border-slate-700 pt-3 text-xs text-slate-600 dark:text-slate-400 space-y-1">
                  <p>• Phụ huynh liên hệ: <b>{detailStudent.parent_name}</b> - SĐT: <b className="font-mono">{(detailStudent.parent_phone || '').replace(/\D/g, '')}</b></p>
                  <p>• Mức học phí niêm yết: <b>{Number(detailStudent.price_per_session || 130000).toLocaleString('vi-VN')} đ/buổi</b></p>
                </div>
              </div>
            ) : (
              <form onSubmit={handleUpdateStudent} className="space-y-3 text-xs">
                <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700 pb-2">Chỉnh Sửa Thông Tin Học Sinh</h3>

                <div>
                  <label className="block font-medium mb-1">Họ và tên *</label>
                  <input
                    type="text"
                    required
                    className="w-full border border-slate-300 dark:border-slate-600 rounded p-2 text-sm font-bold"
                    value={editFormData.full_name || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, full_name: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-medium mb-1">Lớp học</label>
                    <select
                      required
                      className="w-full border-slate-300 dark:border-slate-600 rounded-xl bg-slate-50 dark:bg-slate-900/50 px-4 py-2 text-sm focus:ring-cyan-500 dark:focus:ring-cyan-400 dark:text-white"
                      value={editFormData.grade ? `${editFormData.grade}|${editFormData.class_type || ''}` : ''}
                      onChange={(e) => {
                        if (!e.target.value) {
                          setEditFormData({ ...editFormData, grade: '', class_type: '' });
                          return;
                        }
                        const [g, t] = e.target.value.split('|');
                        setEditFormData({ ...editFormData, grade: g, class_type: t });
                      }}
                    >
                      <option value="" disabled>-- Chọn Lớp Học --</option>
                      {/* Hiển thị lớp hiện tại nếu lớp đó đã bị xoá khỏi danh sách hệ thống */}
                      {editFormData.grade && !classesList.some(c => String(c.grade) === String(editFormData.grade) && (['10','11','12'].includes(String(c.grade)) ? '' : c.class_code.replace(`${c.grade}-`, '')) === (editFormData.class_type || '')) && (
                        <option value={`${editFormData.grade}|${editFormData.class_type || ''}`}>
                          Khối {editFormData.grade} {editFormData.class_type} (Lớp đã ẩn/xóa)
                        </option>
                      )}
                      {classesList.map(c => {
                        const isHighSchool = ['10', '11', '12'].includes(String(c.grade));
                        const type = isHighSchool ? '' : c.class_code.replace(`${c.grade}-`, '');
                        return <option key={c.id} value={`${c.grade}|${type}`}>{c.name}</option>;
                      })}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-medium mb-1">Tên Bố/Mẹ *</label>
                    <input
                      type="text"
                      required
                      className="w-full border border-slate-300 dark:border-slate-600 rounded p-2 text-sm"
                      value={editFormData.parent_name || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, parent_name: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block font-medium mb-1">SĐT Bố/Mẹ *</label>
                    <input
                      type="text"
                      required
                      className="w-full border border-slate-300 dark:border-slate-600 rounded p-2 text-sm font-mono"
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
                      className="w-full border border-slate-300 dark:border-slate-600 rounded p-2 text-sm font-bold text-slate-800 dark:text-slate-200"
                      value={editFormData.price_per_session || 130000}
                      onChange={(e) => setEditFormData({ ...editFormData, price_per_session: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block font-medium mb-1">Ngày bắt đầu học</label>
                    <input
                      type="date"
                      className="w-full border border-slate-300 dark:border-slate-600 rounded p-2 text-sm"
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
                      className="w-full border border-slate-300 dark:border-slate-600 rounded p-2 text-sm"
                      value={editFormData.academic_status || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, academic_status: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block font-medium mb-1">Số lần học bổng tháng / năm</label>
                    <input
                      type="number"
                      className="w-full border border-slate-300 dark:border-slate-600 rounded p-2 text-sm"
                      value={editFormData.scholarship_count || 0}
                      onChange={(e) => setEditFormData({ ...editFormData, scholarship_count: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-medium mb-1">Dư nợ hiện tại (VNĐ)</label>
                  <input
                    type="number"
                    className="w-full border border-slate-300 dark:border-slate-600 rounded p-2 text-sm font-bold text-red-600"
                    value={editFormData.debt || 0}
                    onChange={(e) => setEditFormData({ ...editFormData, debt: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block font-medium mb-1">Ghi chú</label>
                  <textarea
                    rows="3"
                    className="w-full border border-slate-300 dark:border-slate-600 rounded p-2 text-sm"
                    placeholder="Nhập ghi chú..."
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
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center p-4 z-[60]" onClick={() => setShowHistoryModal(false)}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-xl shadow-2xl relative border border-slate-200 dark:border-slate-700 space-y-4 max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-700 pb-3">
              <div>
                <h3 className="font-extrabold text-base text-cyan-900 dark:text-cyan-100">Bảng Lịch Sử Buổi Đi Học</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Học sinh: <b className="text-slate-800 dark:text-slate-200">{detailStudent.full_name}</b> ({detailStudent.student_code}) - Kỳ Tháng {cycleInfo?.month}/{cycleInfo?.year}
                </p>
              </div>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="text-slate-400 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {(!detailStudent.attendance_history_in_cycle || detailStudent.attendance_history_in_cycle.length === 0) ? (
              <div className="p-8 text-center text-slate-500 dark:text-slate-400 text-xs font-medium">
                Chưa có dữ liệu buổi đi học nào trong kỳ tháng {cycleInfo?.month}.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
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
                      <tr key={item.id || idx} className="hover:bg-cyan-50 dark:hover:bg-cyan-900/30 dark:bg-cyan-900/30 transition-colors">
                        <td className="p-3 text-center font-bold text-slate-500 dark:text-slate-400">{idx + 1}</td>
                        <td className="p-3 font-bold text-slate-900 dark:text-white">{item.date}</td>
                        <td className="p-3">
                          <span className={`font-bold px-2.5 py-1 rounded text-[11px] inline-block border ${item.status === 'makeup' ? 'bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800' : 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'}`}>
                            {item.status === 'makeup' ? `Học bù: ${item.shift_name} (${item.time})` : `${item.shift_name} (${item.time})`}
                          </span>
                        </td>
                        <td className="p-3 text-center font-extrabold text-cyan-800 dark:text-cyan-300">
                          {(() => {
                            if (!item.score) return '-';
                            try {
                              if (typeof item.score === 'string' && item.score.startsWith('{')) {
                                const parsed = JSON.parse(item.score);
                                const validTests = (parsed.tests || []).filter(t => t !== null && t !== '');
                                return validTests.length > 0 ? validTests.join(', ') : '-';
                              }
                            } catch (e) { }
                            return item.score;
                          })()}
                        </td>
                        <td className="p-3 text-center font-semibold text-slate-700 dark:text-slate-300">{item.homework_status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex justify-between items-center pt-3 border-t border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300">
              <span>Tổng số buổi đã tham gia: <b className="text-cyan-800 dark:text-cyan-300 text-sm">{detailStudent.total_sessions_in_cycle || 0} buổi</b></span>
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
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex justify-center items-center p-4 z-50" onClick={() => setShowAddModal(false)}>
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 w-full max-w-md shadow-xl dark:shadow-none relative border border-slate-200 dark:border-slate-700" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setShowAddModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-700/50 p-1 rounded transition-colors">
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-bold mb-4 text-slate-900 dark:text-white">Thêm Học Sinh Mới</h2>
            <form onSubmit={handleAddSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-medium mb-1">Họ và tên *</label>
                <input type="text" required className="w-full border rounded p-2 text-sm" value={formData.full_name} onChange={(e) => setFormData({ ...formData, full_name: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1">Lớp học *</label>
                  <select
                    required
                    className="w-full border-slate-300 dark:border-slate-600 rounded-xl bg-slate-50 dark:bg-slate-900/50 px-4 py-2 text-sm focus:ring-cyan-500 dark:focus:ring-cyan-400 dark:text-white"
                    value={formData.grade ? `${formData.grade}|${formData.class_type || ''}` : ''}
                    onChange={(e) => {
                      if (!e.target.value) {
                        setFormData({ ...formData, grade: '', class_type: '' });
                        return;
                      }
                      const [g, t] = e.target.value.split('|');
                      setFormData({ ...formData, grade: g, class_type: t });
                    }}
                  >
                    <option value="" disabled>-- Chọn Lớp Học --</option>
                    {classesList.map(c => {
                      const isHighSchool = ['10', '11', '12'].includes(String(c.grade));
                      const type = isHighSchool ? '' : c.class_code.replace(`${c.grade}-`, '');
                      return <option key={c.id} value={`${c.grade}|${type}`}>{c.name}</option>;
                    })}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Tên Bố/Mẹ</label>
                <input type="text" placeholder="Ví dụ: Nguyễn Văn Bình (Bố)" className="w-full border rounded p-2 text-sm" value={formData.parent_name} onChange={(e) => setFormData({ ...formData, parent_name: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">SĐT Bố/Mẹ</label>
                <input type="text" className="w-full border rounded p-2 text-sm" value={formData.parent_phone} onChange={(e) => setFormData({ ...formData, parent_phone: e.target.value.replace(/\D/g, '') })} />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Ghi chú (Nhận xét)</label>
                <textarea
                  placeholder="Nhận xét của giáo viên về học sinh (không bắt buộc)"
                  className="w-full border rounded p-2 text-sm h-16 resize-none"
                  value={formData.teacher_comment}
                  onChange={(e) => setFormData({ ...formData, teacher_comment: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1">Học phí / Buổi</label>
                  <input type="number" step="5000" className="w-full border rounded p-2 text-sm font-bold text-slate-800 dark:text-slate-200" value={formData.price_per_session} onChange={(e) => setFormData({ ...formData, price_per_session: e.target.value })} />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Ngày bắt đầu</label>
                  <input type="date" className="w-full border rounded p-2 text-sm" value={formData.start_date} onChange={(e) => setFormData({ ...formData, start_date: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Dư nợ hiện tại (VNĐ)</label>
                <input type="number" className="w-full border rounded p-2 text-sm font-bold text-red-600" value={formData.debt} onChange={(e) => setFormData({ ...formData, debt: e.target.value })} />
              </div>
              <button type="submit" className="w-full bg-cyan-700 text-white py-2.5 rounded-lg font-bold mt-2 hover:bg-cyan-800 transition-colors">Lưu Học Sinh</button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL IMPORT EXCEL */}
      {showImportModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex justify-center items-center p-4 z-50" onClick={() => setShowImportModal(false)}>
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 w-full max-w-md shadow-xl dark:shadow-none relative border border-slate-200 dark:border-slate-700" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setShowImportModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-700/50 p-1 rounded transition-colors">
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-bold mb-4 text-slate-900 dark:text-white">Import Danh Sách Từ Excel</h2>
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

      {/* MODAL NHẬP ĐIỂM CHI TIẾT */}
      {scoreModalData && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex justify-center items-center p-4 z-50" onClick={() => setScoreModalData(null)}>
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 w-full max-w-md shadow-xl dark:shadow-none relative border border-slate-200 dark:border-slate-700" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setScoreModalData(null)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-700/50 p-1 rounded transition-colors">
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-bold mb-4 text-slate-900 dark:text-white">Nhập Điểm - <span className="text-cyan-700">{scoreModalData.studentName}</span></h2>
            <form onSubmit={handleSaveScoreModal} className="flex flex-col max-h-[75vh]">
              <div className="overflow-y-auto pr-2 space-y-4">
                {/* FAST SCORE INPUT */}
                <div className="mb-2">
                  <label className="block text-sm font-semibold mb-1 text-cyan-800 dark:text-cyan-300">Nhập điểm nhanh (VD: 10x3,9.5x2)</label>
                  <div className="flex space-x-2">
                    <input
                      id="fast-score-input"
                      type="text"
                      className="w-full border border-cyan-300 dark:border-cyan-700 rounded p-2 text-sm focus:ring-2 focus:ring-cyan-500 bg-cyan-50 dark:bg-cyan-900/20"
                      placeholder="10x3,9.5x2 ..."
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          const input = e.target.value.trim();
                          if (input) {
                            let parsedScores = [];
                            const parts = input.split(',');
                            parts.forEach(part => {
                              const p = part.trim();
                              if (p.includes('x')) {
                                const [score, count] = p.split('x');
                                const s = parseFloat(score);
                                const c = parseInt(count, 10);
                                if (!isNaN(s) && !isNaN(c) && c > 0 && c < 50) {
                                  for (let i = 0; i < c; i++) parsedScores.push(String(s));
                                }
                              } else {
                                const s = parseFloat(p);
                                if (!isNaN(s)) parsedScores.push(String(s));
                              }
                            });

                            if (parsedScores.length > 0) {
                              setScoreModalData({ ...scoreModalData, tests: parsedScores });
                            }
                            e.target.value = '';
                          }
                        }
                      }}
                    />
                    <button
                      type="button"
                      className="px-4 py-2 bg-cyan-600 text-white rounded text-sm font-bold hover:bg-cyan-700 shrink-0"
                      onClick={() => {
                        const inputEl = document.getElementById('fast-score-input');
                        if (!inputEl) return;
                        const input = inputEl.value.trim();
                        if (input) {
                          let parsedScores = [];
                          const parts = input.split(',');
                          parts.forEach(part => {
                            const p = part.trim();
                            if (p.includes('x')) {
                              const [score, count] = p.split('x');
                              const s = parseFloat(score);
                              const c = parseInt(count, 10);
                              if (!isNaN(s) && !isNaN(c) && c > 0 && c < 50) {
                                for (let i = 0; i < c; i++) parsedScores.push(String(s));
                              }
                            } else {
                              const s = parseFloat(p);
                              if (!isNaN(s)) parsedScores.push(String(s));
                            }
                          });

                          if (parsedScores.length > 0) {
                            setScoreModalData({ ...scoreModalData, tests: parsedScores });
                          }
                          inputEl.value = '';
                        }
                      }}
                    >
                      Thêm
                    </button>
                  </div>
                </div>
                <div className="space-y-3">
                  <p className="font-bold text-cyan-800 dark:text-cyan-300 border-b pb-1">1. Điểm trên lớp</p>
                  {scoreModalData.tests.map((testScore, idx) => (
                    <div key={idx} className="flex items-center space-x-2">
                      <label className="w-20 text-sm font-semibold">Bài {idx + 1}:</label>
                      <input
                        type="number" step="any" min="0" max="10"
                        className="border rounded p-1.5 w-full text-sm focus:ring-2 focus:ring-cyan-500 dark:focus:ring-cyan-400"
                        value={testScore}
                        onChange={(e) => {
                          const newTests = [...scoreModalData.tests];
                          newTests[idx] = e.target.value;
                          setScoreModalData({ ...scoreModalData, tests: newTests });
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const newTests = scoreModalData.tests.filter((_, i) => i !== idx);
                          setScoreModalData({ ...scoreModalData, tests: newTests });
                        }}
                        className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:bg-rose-900/30 rounded"
                        title="Xóa cột điểm này"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => setScoreModalData({ ...scoreModalData, tests: [...scoreModalData.tests, ''] })}
                    className="text-xs text-cyan-600 font-bold hover:underline"
                  >
                    + Thêm cột điểm
                  </button>
                </div>

                <div className="space-y-3 pt-3">
                  <p className="font-bold text-cyan-800 dark:text-cyan-300 border-b pb-1">2. Bài tập về nhà</p>
                  <div>
                    <label className="block text-sm font-semibold mb-1">Trạng thái BTVN</label>
                    <select
                      className="w-full border rounded p-2 text-sm focus:ring-2 focus:ring-cyan-500 dark:focus:ring-cyan-400"
                      value={scoreModalData.hwStatus}
                      onChange={(e) => setScoreModalData({ ...scoreModalData, hwStatus: e.target.value })}
                    >
                      <option value="">-- Chọn trạng thái --</option>
                      <option value="Đã nộp">Đã nộp</option>
                      <option value="Chưa nộp">Chưa nộp</option>
                      <option value="Làm thiếu">Làm thiếu</option>
                    </select>
                  </div>
                  <div className="flex space-x-2">
                    <div className="w-1/3">
                      <label className="block text-sm font-semibold mb-1">Điểm</label>
                      <input
                        type="number" step="any" min="0" max="10"
                        className="w-full border rounded p-2 text-sm focus:ring-2 focus:ring-cyan-500 dark:focus:ring-cyan-400"
                        value={scoreModalData.hwScore}
                        onChange={(e) => setScoreModalData({ ...scoreModalData, hwScore: e.target.value })}
                      />
                    </div>
                    <div className="w-2/3">
                      <label className="block text-sm font-semibold mb-1">Nhận xét BTVN</label>
                      <input
                        type="text"
                        className="w-full border rounded p-2 text-sm focus:ring-2 focus:ring-cyan-500 dark:focus:ring-cyan-400"
                        value={scoreModalData.hwComment}
                        onChange={(e) => setScoreModalData({ ...scoreModalData, hwComment: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 mt-4 border-t shrink-0">
                <button type="submit" className="w-full bg-cyan-700 text-white py-2 rounded-lg font-bold hover:bg-cyan-800 transition-colors">
                  Lưu Thông Tin Điểm
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL CHI TIẾT HỌC PHÍ */}
      {tuitionDetailModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex justify-center items-center p-4 z-50" onClick={() => setTuitionDetailModal(null)}>
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 w-full max-w-sm shadow-xl dark:shadow-none relative border border-slate-200 dark:border-slate-700" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setTuitionDetailModal(null)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-700/50 p-1 rounded transition-colors">
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-lg font-bold mb-4 text-slate-900 dark:text-white border-b pb-2">Chi tiết Học Phí</h2>
            <div className="space-y-4 text-sm text-slate-700 dark:text-slate-300">
              <div className="flex justify-between">
                <span>Nợ cũ (Tháng trước):</span>
                <span className="font-bold text-rose-600">
                  {Number(tuitionDetailModal.previous_debt || 0).toLocaleString('vi-VN')} đ
                </span>
              </div>
              <div className="flex justify-between">
                <span>Học phí phát sinh (Tháng {cycleInfo?.month}):</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {Number(tuitionDetailModal.total_tuition_in_cycle || 0).toLocaleString('vi-VN')} đ
                </span>
              </div>
              <div className="border-t pt-3 flex justify-between font-bold text-base">
                <span>Tổng cộng cần đóng:</span>
                <span className="text-cyan-800 dark:text-cyan-300">
                  {Number(tuitionDetailModal.final_amount || tuitionDetailModal.total_tuition_in_cycle || 0).toLocaleString('vi-VN')} đ
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}