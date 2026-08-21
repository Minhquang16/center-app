import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import {
  DollarSign, Users, UserPlus, UserMinus, CheckCircle2, Clock,
  TrendingUp, Filter, CreditCard, AlertCircle, RefreshCw, Layers, Calendar, X, Download
} from 'lucide-react';
import * as XLSX from 'xlsx';

// THUẬT TOÁN TẠO ĐƯỜNG CONG SMOOTH CUBIC BEZIER CHO BIỂU ĐỒ SVG
const getSmoothPath = (points) => {
  if (!points || points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

  return points.reduce((acc, point, i, a) => {
    if (i === 0) return `M ${point.x} ${point.y}`;
    const prev = a[i - 1];
    const cp1x = prev.x + (point.x - prev.x) / 2;
    const cp1y = prev.y;
    const cp2x = prev.x + (point.x - prev.x) / 2;
    const cp2y = point.y;
    return `${acc} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${point.x} ${point.y}`;
  }, '');
};

const getAreaPath = (points, chartHeight, paddingY) => {
  if (!points || points.length === 0) return '';
  const linePath = getSmoothPath(points);
  const lastPoint = points[points.length - 1];
  const firstPoint = points[0];
  return `${linePath} L ${lastPoint.x} ${chartHeight - paddingY} L ${firstPoint.x} ${chartHeight - paddingY} Z`;
};

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Tháng và Năm thực tế
  const currentRealMonth = new Date().getMonth() + 1;
  const currentRealYear = new Date().getFullYear();

  const [selectedMonth, setSelectedMonth] = useState(currentRealMonth);
  const [selectedYear, setSelectedYear] = useState(currentRealYear);

  // STATE HOVER TRỎ CHUỘT CHO BIỂU ĐỒ
  const [hoveredRevIndex, setHoveredRevIndex] = useState(null);
  const [hoveredStudentIndex, setHoveredStudentIndex] = useState(null);

  // STATE MODAL HỌC SINH THEO KHỐI
  const [selectedGradeModal, setSelectedGradeModal] = useState(null);
  const [gradeStudents, setGradeStudents] = useState([]);
  const [loadingGradeStudents, setLoadingGradeStudents] = useState(false);
  const [modalClassFilter, setModalClassFilter] = useState('');

  const [visibleUnpaidCount, setVisibleUnpaidCount] = useState(5);
  const [visiblePaidCount, setVisiblePaidCount] = useState(5);

  const [timetableClasses, setTimetableClasses] = useState([]);

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const res = await api.get('/dashboard', {
        params: {
          month: selectedMonth,
          year: selectedYear,
        },
      });
      setData(res.data);
    } catch (err) {
      console.error("Lỗi tải dữ liệu Dashboard:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, [selectedMonth, selectedYear]);

  useEffect(() => {
    api.get('/classes')
      .then(res => {
        setTimetableClasses(Array.isArray(res.data) ? res.data : (res.data?.data || []));
      })
      .catch(err => console.error("Lỗi tải lớp học:", err));
  }, []);

  // TẢI DANH SÁCH HỌC SINH KHI BẤM VÀO KHỐI LỚP
  useEffect(() => {
    if (selectedGradeModal !== null) {
      setLoadingGradeStudents(true);
      api.get('/students', { params: { grade: selectedGradeModal } })
        .then((res) => {
          const list = Array.isArray(res.data) ? res.data : (res.data?.data || []);
          setGradeStudents(list);
        })
        .catch((err) => console.error("Lỗi tải danh sách học sinh khối:", err))
        .finally(() => setLoadingGradeStudents(false));
    }
  }, [selectedGradeModal]);

  const handleResetFilter = () => {
    setSelectedMonth(currentRealMonth);
    setSelectedYear(currentRealYear);
  };

  // Logic Thời Khóa Biểu Động
  const getUniqueTimeSlots = (isWeekend) => {
    const slots = new Set();
    timetableClasses.forEach(c => {
      (c.schedules || []).forEach(s => {
        const isDayWeekend = (parseInt(s.dayOfWeek) === 7 || parseInt(s.dayOfWeek) === 8);
        if (isWeekend === isDayWeekend && s.startTime && s.endTime) {
          slots.add(`${s.startTime} - ${s.endTime}`);
        }
      });
    });
    return Array.from(slots).sort((a, b) => a.localeCompare(b));
  };

  const weekdaySlots = getUniqueTimeSlots(false);
  const weekendSlots = getUniqueTimeSlots(true);

  const weekdayDays = [
    { label: 'Thứ 2', val: 2, 
      headerClass: 'text-rose-700 bg-rose-50 dark:bg-rose-900/30 dark:text-rose-400',
      badgeClass: 'bg-rose-100/70 text-rose-900 dark:bg-rose-900/50 dark:text-rose-300' },
    { label: 'Thứ 3', val: 3, 
      headerClass: 'text-amber-700 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-400',
      badgeClass: 'bg-amber-100/70 text-amber-900 dark:bg-amber-900/50 dark:text-amber-300' },
    { label: 'Thứ 4', val: 4, 
      headerClass: 'text-emerald-700 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-400',
      badgeClass: 'bg-emerald-100/70 text-emerald-900 dark:bg-emerald-900/50 dark:text-emerald-300' },
    { label: 'Thứ 5', val: 5, 
      headerClass: 'text-purple-700 bg-purple-50 dark:bg-purple-900/30 dark:text-purple-400',
      badgeClass: 'bg-purple-100/70 text-purple-900 dark:bg-purple-900/50 dark:text-purple-300' },
    { label: 'Thứ 6', val: 6, 
      headerClass: 'text-blue-700 bg-blue-50 dark:bg-blue-900/30 dark:text-blue-400',
      badgeClass: 'bg-blue-100/70 text-blue-900 dark:bg-blue-900/50 dark:text-blue-300' }
  ];
  const weekendDays = [
    { label: 'Thứ 7', val: 7, 
      headerClass: 'text-amber-800 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-300',
      badgeClass: 'bg-amber-100/70 text-amber-900 dark:bg-amber-900/50 dark:text-amber-300' },
    { label: 'Chủ Nhật', val: 8, 
      headerClass: 'text-rose-800 bg-rose-50 dark:bg-rose-900/30 dark:text-rose-300',
      badgeClass: 'bg-rose-100/70 text-rose-900 dark:bg-rose-900/50 dark:text-rose-300' }
  ];

  const getMatrix = (days, timeSlots) => {
    const matrix = {};
    days.forEach(d => {
      matrix[d.val] = {};
      timeSlots.forEach(t => matrix[d.val][t] = []);
    });
    timetableClasses.forEach(c => {
      (c.schedules || []).forEach(s => {
        const dVal = parseInt(s.dayOfWeek);
        if (matrix[dVal]) {
          const slot = `${s.startTime} - ${s.endTime}`;
          if (matrix[dVal][slot]) {
            matrix[dVal][slot].push(c.class_code || c.name);
          }
        }
      });
    });
    return matrix;
  };

  const weekdayMatrix = getMatrix(weekdayDays, weekdaySlots);
  const weekendMatrix = getMatrix(weekendDays, weekendSlots);

  const exportToExcel = () => {
    if (!data) return;

    const wb = XLSX.utils.book_new();

    // 1. Sheet Tổng quan
    const overviewData = [
      ["BÁO CÁO TỔNG QUAN TRUNG TÂM"],
      ["Kỳ báo cáo:", `Tháng ${selectedMonth}/${selectedYear}`],
      ["Ngày xuất:", new Date().toLocaleDateString('vi-VN')],
      [],
      ["CHỈ SỐ TÀI CHÍNH", ""],
      ["Doanh thu tháng (VNĐ)", data.total_revenue_month],
      ["Tổng doanh thu năm (VNĐ)", data.total_revenue_year],
      ["Tổng nợ đọng (VNĐ)", data.total_unpaid_amount],
      [],
      ["CHỈ SỐ HỌC SINH", ""],
      ["Tổng sĩ số hiện tại", data.total_active_students],
      ["Học sinh mới (trong tháng)", data.students_in_month],
      ["Học sinh nghỉ (trong tháng)", data.students_out_month],
      ["Đã nộp học phí", data.paid_students_count],
      ["Chưa nộp học phí", data.unpaid_students_count]
    ];
    const wsOverview = XLSX.utils.aoa_to_sheet(overviewData);

    // Tự động điều chỉnh độ rộng cột
    wsOverview['!cols'] = [{ wch: 30 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(wb, wsOverview, "Tổng Quan");

    // 2. Sheets Chưa nộp theo từng lớp
    if (data.unpaid_list && data.unpaid_list.length > 0) {
      // Nhóm học sinh theo Khối + Lớp (Ví dụ: 9NC, 8CC)
      const unpaidByClass = {};
      data.unpaid_list.forEach((s) => {
        const gradeStr = s.grade || '';
        const typeStr = s.class_type ? (s.class_type.startsWith(' ') ? s.class_type : ` ${s.class_type}`) : '';
        const c = `${gradeStr}${typeStr}`.trim() || 'Chưa phân lớp';
        
        if (!unpaidByClass[c]) {
          unpaidByClass[c] = [];
        }
        unpaidByClass[c].push(s);
      });

      // Tạo sheet cho mỗi lớp
      Object.keys(unpaidByClass).forEach((className) => {
        const classData = unpaidByClass[className].map((s, index) => ({
          "STT": index + 1,
          "Mã HS": s.student_code,
          "Họ Tên": s.full_name,
          "Khối": s.grade,
          "Lớp": s.class_type,
          "Phụ huynh": s.parent_name,
          "SĐT": s.parent_phone,
          "Số buổi học": s.total_sessions,
          "Số tiền nợ (VNĐ)": s.expected_fee
        }));
        const wsUnpaid = XLSX.utils.json_to_sheet(classData);
        wsUnpaid['!cols'] = [{ wch: 5 }, { wch: 15 }, { wch: 25 }, { wch: 10 }, { wch: 10 }, { wch: 25 }, { wch: 15 }, { wch: 15 }, { wch: 20 }];
        
        // Tên sheet trong Excel chỉ cho phép tối đa 31 ký tự và không chứa ký tự đặc biệt
        let sheetName = `Nợ - ${className}`.replace(/[\\/?*\[\]:]/g, '');
        if (sheetName.length > 31) {
          sheetName = sheetName.substring(0, 31);
        }
        XLSX.utils.book_append_sheet(wb, wsUnpaid, sheetName);
      });
    }

    // 3. Sheet Đã nộp
    if (data.paid_list && data.paid_list.length > 0) {
      const paidData = data.paid_list.map((inv, index) => ({
        "STT": index + 1,
        "Mã HS": inv.student?.student_code || '',
        "Họ Tên": inv.student?.full_name || '',
        "Khối": inv.student?.grade || '',
        "Lớp": inv.student?.class_type || '',
        "Phụ huynh": inv.student?.parent_name || '',
        "SĐT": inv.student?.parent_phone || '',
        "Đã nộp (VNĐ)": inv.amount || 0
      }));
      const wsPaid = XLSX.utils.json_to_sheet(paidData);
      wsPaid['!cols'] = [{ wch: 5 }, { wch: 15 }, { wch: 25 }, { wch: 10 }, { wch: 10 }, { wch: 25 }, { wch: 15 }, { wch: 20 }];
      XLSX.utils.book_append_sheet(wb, wsPaid, "DS Đã Nộp Học Phí");
    }

    XLSX.writeFile(wb, `Bao_Cao_Dashboard_T${selectedMonth}_${selectedYear}.xlsx`);
  };

  // Cấu hình kích thước Biểu đồ SVG
  const chartWidth = 560;
  const chartHeight = 180;
  const paddingX = 35;
  const paddingY = 25;

  // 1. Tọa độ đường Doanh Thu
  const maxRevenue = React.useMemo(() => data ? Math.max(...(data.revenue_chart?.map((i) => i.revenue) || [1]), 1) : 1, [data]);
  const revPoints = React.useMemo(() => data?.revenue_chart?.map((d, i) => {
    const x = paddingX + i * ((chartWidth - 2 * paddingX) / 11);
    const y = chartHeight - paddingY - (d.revenue / maxRevenue) * (chartHeight - 2 * paddingY);
    return { x, y, val: d.revenue, month: d.month };
  }) || [], [data, maxRevenue, chartWidth, chartHeight, paddingX, paddingY]);

  const revSmoothPath = React.useMemo(() => getSmoothPath(revPoints), [revPoints]);
  const revAreaPath = React.useMemo(() => getAreaPath(revPoints, chartHeight, paddingY), [revPoints, chartHeight, paddingY]);

  // 2. Tọa độ đường Biến Động Học Sinh (Vào / Ra)
  const maxStudents = React.useMemo(() => data ? Math.max(...(data.student_movement_chart?.map((i) => Math.max(i.in, i.out)) || [1]), 1) : 1, [data]);

  const inPoints = React.useMemo(() => data?.student_movement_chart?.map((d, i) => {
    const x = paddingX + i * ((chartWidth - 2 * paddingX) / 11);
    const y = chartHeight - paddingY - (d.in / maxStudents) * (chartHeight - 2 * paddingY);
    return { x, y, val: d.in, month: d.month };
  }) || [], [data, maxStudents, chartWidth, chartHeight, paddingX, paddingY]);

  const outPoints = React.useMemo(() => data?.student_movement_chart?.map((d, i) => {
    const x = paddingX + i * ((chartWidth - 2 * paddingX) / 11);
    const y = chartHeight - paddingY - (d.out / maxStudents) * (chartHeight - 2 * paddingY);
    return { x, y, val: d.out, month: d.month };
  }) || [], [data, maxStudents, chartWidth, chartHeight, paddingX, paddingY]);

  const inSmoothPath = React.useMemo(() => getSmoothPath(inPoints), [inPoints]);
  const outSmoothPath = React.useMemo(() => getSmoothPath(outPoints), [outPoints]);

  const gradesList = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  const studentsByGradeData = data?.students_by_grade || {};

  // Lọc học sinh theo Loại Lớp trong Modal
  const filteredGradeStudents = gradeStudents.filter((s) => {
    if (!modalClassFilter) return true;
    return s.class_type === modalClassFilter;
  });

  if (loading && !data) {
    return (
      <div className="p-8 text-center text-slate-500 dark:text-slate-400 dark:text-slate-400 font-medium">
        Đang tổng hợp dữ liệu Bảng điều khiển (Dashboard)...
      </div>
    );
  }

  return (
    <div className="space-y-6 text-slate-800 dark:text-slate-200 dark:text-slate-200 pb-12">
      {/* 1. THANH TIÊU ĐỀ & BỘ LỌC CÓ NÚT XÓA LỌC */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm dark:shadow-none dark:shadow-none border border-slate-200 dark:border-slate-700 dark:border-slate-700 flex flex-wrap gap-3 items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-cyan-600" />
            <span>Bảng Điều Khiển Tổng Quan (Dashboard)</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-400 mt-0.5">
            Theo dõi sức khỏe tài chính, sĩ số học sinh và tình trạng học phí theo thời gian thực
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1 text-slate-700 dark:text-slate-300 dark:text-slate-300 font-bold text-xs mr-1">
            <Filter className="w-4 h-4 text-cyan-600" />
            <span>Kỳ xem:</span>
          </div>

          <select
            className="border border-slate-300 dark:border-slate-600 dark:border-slate-600 rounded-lg p-2 text-xs font-semibold bg-slate-50 dark:bg-slate-900/50 dark:bg-slate-900/50 text-slate-800 dark:text-slate-200 dark:text-slate-200 outline-none focus:ring-2 focus:ring-cyan-500 dark:focus:ring-cyan-400 dark:focus:ring-cyan-400"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
          >
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => (
              <option key={m} value={m}>Tháng {m}</option>
            ))}
          </select>

          <select
            className="border border-slate-300 dark:border-slate-600 dark:border-slate-600 rounded-lg p-2 text-xs font-semibold bg-slate-50 dark:bg-slate-900/50 dark:bg-slate-900/50 text-slate-800 dark:text-slate-200 dark:text-slate-200 outline-none focus:ring-2 focus:ring-cyan-500 dark:focus:ring-cyan-400 dark:focus:ring-cyan-400"
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
          >
            {Array.from(
              { length: (new Date().getFullYear() + 5) - 2024 + 1 },
              (_, i) => 2024 + i
            ).map((y) => (
              <option key={y} value={y}>Năm {y}</option>
            ))}
          </select>

          {(selectedMonth !== currentRealMonth || selectedYear !== currentRealYear) && (
            <button
              onClick={handleResetFilter}
              className="flex items-center space-x-1 text-xs text-slate-600 dark:text-slate-400 dark:text-slate-400 hover:text-rose-600 bg-slate-100 dark:bg-slate-700/50 dark:bg-slate-700/50 hover:bg-rose-50 dark:bg-rose-900/30 dark:bg-rose-900/30 px-2.5 py-2 rounded-lg font-medium border border-slate-200 dark:border-slate-700 dark:border-slate-700 transition-colors"
              title="Mặc định quay về kỳ tháng hiện tại"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Xóa lọc</span>
            </button>
          )}

          <button
            onClick={exportToExcel}
            className="flex items-center space-x-1.5 text-xs text-white bg-emerald-600 hover:bg-emerald-700 px-3 py-2 rounded-lg font-bold transition-colors shadow-sm ml-2"
          >
            <Download className="w-4 h-4" />
            <span>Xuất báo cáo Excel</span>
          </button>
        </div>
      </div>

      {/* 2. KHU VỰC 4 THẺ KPI CỐT LÕI */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <div className="bg-white dark:bg-slate-800 p-3 md:p-4 rounded-xl border border-slate-200 dark:border-slate-700 dark:border-slate-700 shadow-sm dark:shadow-none dark:shadow-none space-y-1.5 md:space-y-2">
          <div className="flex justify-between items-start md:items-center">
            <span className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 dark:text-slate-400 leading-tight pr-1">
              DOANH THU THÁNG {selectedMonth}
            </span>
            <div className="p-1.5 md:p-2 bg-cyan-50 dark:bg-cyan-900/30 dark:bg-cyan-900/30 rounded-lg text-cyan-700 dark:text-cyan-400 dark:text-cyan-400 shrink-0">
              <DollarSign className="w-4 h-4 md:w-5 md:h-5" />
            </div>
          </div>
          <p className="text-lg md:text-2xl font-black text-slate-900 dark:text-white">
            {Number(data?.total_revenue_month || 0).toLocaleString('vi-VN')} đ
          </p>
          <p className="text-[10px] md:text-[11px] text-slate-400 leading-tight">Chốt sổ ngày 20/{selectedMonth < 10 ? `0${selectedMonth}` : selectedMonth}/{selectedYear}</p>
        </div>

        <div className="bg-white dark:bg-slate-800 p-3 md:p-4 rounded-xl border border-slate-200 dark:border-slate-700 dark:border-slate-700 shadow-sm dark:shadow-none dark:shadow-none space-y-1.5 md:space-y-2">
          <div className="flex justify-between items-start md:items-center">
            <span className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 dark:text-slate-400 leading-tight pr-1">
              TỔNG DOANH THU NĂM {selectedYear}
            </span>
            <div className="p-1.5 md:p-2 bg-cyan-50 dark:bg-cyan-900/30 dark:bg-cyan-900/30 rounded-lg text-cyan-700 dark:text-cyan-400 dark:text-cyan-400 shrink-0">
              <CreditCard className="w-4 h-4 md:w-5 md:h-5" />
            </div>
          </div>
          <p className="text-lg md:text-2xl font-black text-slate-900 dark:text-white">
            {Number(data?.total_revenue_year || 0).toLocaleString('vi-VN')} đ
          </p>
          <p className="text-[10px] md:text-[11px] text-slate-400 leading-tight">Tích lũy từ Tháng 1 đến Tháng 12</p>
        </div>

        <div className="bg-white dark:bg-slate-800 p-3 md:p-4 rounded-xl border border-slate-200 dark:border-slate-700 dark:border-slate-700 shadow-sm dark:shadow-none dark:shadow-none space-y-1.5 md:space-y-2">
          <div className="flex justify-between items-start md:items-center">
            <span className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 dark:text-slate-400 leading-tight pr-1">
              SĨ SỐ THÁNG {selectedMonth}
            </span>
            <div className="p-1.5 md:p-2 bg-cyan-50 dark:bg-cyan-900/30 dark:bg-cyan-900/30 rounded-lg text-cyan-700 dark:text-cyan-400 dark:text-cyan-400 shrink-0">
              <Users className="w-4 h-4 md:w-5 md:h-5" />
            </div>
          </div>
          <p className="text-lg md:text-2xl font-black text-slate-900 dark:text-white">
            {data?.total_active_students || 0} <span className="text-[10px] md:text-xs font-normal text-slate-500 dark:text-slate-400 dark:text-slate-400">học sinh</span>
          </p>
          <div className="flex flex-col xl:flex-row xl:items-center gap-1.5 md:gap-3 text-[10px] md:text-[11px] font-semibold pt-0.5">
            <span className="text-emerald-700 dark:text-emerald-400 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 dark:bg-emerald-900/30 px-1.5 md:px-2 py-0.5 rounded border border-emerald-200/60 inline-flex items-center gap-1 w-fit">
              <UserPlus className="w-3 h-3" /> +{data?.students_in_month || 0} mới
            </span>
            <span className="text-rose-700 dark:text-rose-400 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/30 dark:bg-rose-900/30 px-1.5 md:px-2 py-0.5 rounded border border-rose-200/60 inline-flex items-center gap-1 w-fit">
              <UserMinus className="w-3 h-3" /> -{data?.students_out_month || 0} nghỉ
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-3 md:p-4 rounded-xl border border-slate-200 dark:border-slate-700 dark:border-slate-700 shadow-sm dark:shadow-none dark:shadow-none space-y-1.5 md:space-y-2">
          <div className="flex justify-between items-start md:items-center">
            <span className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 dark:text-slate-400 leading-tight pr-1">
              HỌC PHÍ THÁNG {selectedMonth}
            </span>
            <div className="p-1.5 md:p-2 bg-cyan-50 dark:bg-cyan-900/30 dark:bg-cyan-900/30 rounded-lg text-cyan-700 dark:text-cyan-400 dark:text-cyan-400 shrink-0">
              <Clock className="w-4 h-4 md:w-5 md:h-5" />
            </div>
          </div>
          <div className="flex flex-col xl:flex-row xl:items-baseline justify-between gap-0.5 md:gap-0">
            <p className="text-lg md:text-2xl font-black text-slate-900 dark:text-white">
              {data?.paid_students_count || 0} <span className="text-[10px] md:text-xs font-normal text-emerald-600">Đã nộp</span>
            </p>
            <p className="text-base md:text-lg font-bold text-rose-600">
              {data?.unpaid_students_count || 0} <span className="text-[10px] md:text-xs font-normal text-rose-500">Nợ HP</span>
            </p>
          </div>
          <p className="text-[10px] md:text-[11px] text-slate-400 leading-tight">
            Nợ đọng: <b className="text-slate-800 dark:text-slate-200 dark:text-slate-200">{Number(data?.total_unpaid_amount || 0).toLocaleString('vi-VN')} đ</b>
          </p>
        </div>
      </div>

      {/* 3. BẢNG KHỐI LỚP CÓ THỂ BẤM VÀO XEM CHI TIẾT */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 dark:border-slate-700 shadow-sm dark:shadow-none dark:shadow-none space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700/50 dark:border-slate-700/50 pb-2">
          <div className="flex items-center space-x-2 text-slate-800 dark:text-slate-200 dark:text-slate-200">
            <Layers className="w-4 h-4 text-cyan-600" />
            <h3 className="font-bold text-sm">Thống Kê Sĩ Số Học Sinh Theo Từng Khối Lớp</h3>
          </div>
          <span className="text-[11px] font-semibold text-slate-400 italic">💡 Bấm vào từng Khối để xem danh sách học sinh</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-10 gap-2">
          {gradesList.map((g) => {
            const count = studentsByGradeData[`Khối ${g}`] ?? 0;
            return (
              <div
                key={g}
                onClick={() => {
                  setSelectedGradeModal(g);
                  setModalClassFilter('');
                }}
                className="bg-slate-50 dark:bg-slate-900/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 dark:border-slate-700/80 rounded-xl p-3 text-center cursor-pointer hover:border-cyan-500 hover:bg-cyan-50 dark:hover:bg-cyan-900/30 dark:bg-cyan-900/30 dark:hover:bg-cyan-900/30 dark:bg-cyan-900/30 hover:shadow-md dark:shadow-none dark:shadow-none transition-all group relative"
              >
                <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 dark:text-slate-400 group-hover:text-cyan-800 dark:text-cyan-300 dark:text-cyan-300">Khối {g}</p>
                <p className="text-lg font-black text-cyan-700 dark:text-cyan-400 dark:text-cyan-400 mt-0.5 group-hover:scale-105 transition-transform">
                  {count} <span className="text-[10px] font-normal text-slate-400">HS</span>
                </p>
                <span className="text-[9px] font-bold text-cyan-600 block mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  Xem DS →
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. KHU VỰC THỜI KHÓA BIỂU TRUNG TÂM */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm dark:shadow-none dark:shadow-none border border-slate-200 dark:border-slate-700 dark:border-slate-700 p-5 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-700/50 dark:border-slate-700/50 pb-3">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-cyan-600" />
              <span>Thời Khóa Biểu Lịch Học Niêm Yết Trung Tâm</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-400 mt-0.5">Lịch học cố định từ Thứ 2 đến Chủ Nhật phân theo các ca chuẩn</p>
          </div>

          <span className="bg-cyan-50 dark:bg-cyan-900/30 dark:bg-cyan-900/30 text-cyan-800 dark:text-cyan-300 dark:text-cyan-300 text-xs font-bold px-3 py-1.5 rounded-lg border border-cyan-200 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            <span>Kỳ chốt ngày 20 hàng tháng</span>
          </span>
        </div>

        {/* LỊCH HỌC NGÀY THƯỜNG */}
        <div className="space-y-2">
          <h3 className="text-xs font-extrabold text-cyan-800 dark:text-cyan-300 dark:text-cyan-300 uppercase tracking-wider flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-cyan-600"></span>
            <span>Lịch Học Ngày Thường (Thứ 2 đến Thứ 6)</span>
          </h3>

          {/* DẠNG THẺ MOBILE LỊCH NGÀY THƯỜNG */}
          <div className="md:hidden space-y-3">
            {weekdayDays.map(item => (
              <div key={item.val} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
                <div className={`p-2.5 font-bold text-center border-b border-slate-100 dark:border-slate-700 ${item.headerClass}`}>
                  {item.label}
                </div>
                <div className="p-3 space-y-2 text-xs">
                  {weekdaySlots.length > 0 ? weekdaySlots.map(slot => (
                    <div key={slot} className="flex justify-between items-center border-b border-slate-50 dark:border-slate-700/50 pb-1.5 last:border-0 last:pb-0">
                      <span className="text-slate-500 dark:text-slate-400 font-semibold whitespace-nowrap">{slot}</span>
                      <div className="space-x-1.5 flex flex-wrap justify-end gap-y-1 pl-2 w-full">
                        {weekdayMatrix[item.val][slot].length > 0 ? (
                          weekdayMatrix[item.val][slot].map(cls => (
                            <span key={cls} className={`px-2 py-0.5 rounded font-bold ${item.badgeClass}`}>{cls}</span>
                          ))
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">- Trống -</span>
                        )}
                      </div>
                    </div>
                  )) : <div className="text-center text-slate-400 italic">Chưa có dữ liệu lịch học</div>}
                </div>
              </div>
            ))}
          </div>

          {/* BẢNG LỊCH NGÀY THƯỜNG DESKTOP */}
          <div className="hidden md:block overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-xl">
            <table className="w-full text-left text-xs border-collapse min-w-[650px]">
              <thead className="bg-slate-900 text-white font-bold uppercase text-[11px]">
                <tr>
                  <th className="p-2.5 border-b border-slate-800 w-20 text-center whitespace-nowrap">Thứ</th>
                  {weekdaySlots.length > 0 ? weekdaySlots.map(slot => (
                    <th key={slot} className="p-2.5 border-b border-slate-800 text-center text-cyan-300 whitespace-nowrap">{slot}</th>
                  )) : (
                    <th className="p-2.5 border-b border-slate-800 text-center text-slate-400 italic">Chưa có khung giờ nào</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-semibold">
                {weekdayDays.map(item => (
                  <tr key={item.val} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 dark:bg-slate-900/50">
                    <td className={`p-2.5 text-center font-bold ${item.headerClass}`}>{item.label}</td>
                    {weekdaySlots.length > 0 ? weekdaySlots.map(slot => (
                      <td key={slot} className="p-2.5 text-center">
                        {weekdayMatrix[item.val][slot].length > 0 ? (
                          weekdayMatrix[item.val][slot].map(cls => (
                            <span key={cls} className={`px-2 py-0.5 rounded font-bold ml-1 mb-1 inline-block ${item.badgeClass}`}>{cls}</span>
                          ))
                        ) : (
                          <span className="text-slate-300 italic">-</span>
                        )}
                      </td>
                    )) : (
                      <td className="p-2.5 text-center"></td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* LỊCH HỌC CUỐI TUẦN */}
        <div className="space-y-2 pt-1">
          <h3 className="text-xs font-extrabold text-amber-800 dark:text-amber-300 dark:text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
            <span>Lịch Học Cuối Tuần (Thứ 7 & Chủ Nhật)</span>
          </h3>

          {/* DẠNG THẺ MOBILE LỊCH CUỐI TUẦN */}
          <div className="md:hidden space-y-3">
            {weekendDays.map(item => (
              <div key={item.val} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
                <div className={`p-2.5 font-bold text-center border-b border-slate-100 dark:border-slate-700 ${item.headerClass}`}>
                  {item.label}
                </div>
                <div className="p-3 space-y-2 text-xs">
                  {weekendSlots.length > 0 ? weekendSlots.map(slot => (
                    <div key={slot} className="flex justify-between items-center border-b border-slate-50 dark:border-slate-700/50 pb-2 last:border-0 last:pb-0">
                      <span className="text-slate-500 dark:text-slate-400 font-semibold whitespace-nowrap">{slot}</span>
                      <div className="space-x-1 flex justify-end flex-wrap gap-y-1 pl-2 w-full">
                        {weekendMatrix[item.val][slot].length > 0 ? (
                          weekendMatrix[item.val][slot].map(cls => (
                            <span key={cls} className={`px-2 py-0.5 rounded font-bold ${item.badgeClass}`}>{cls}</span>
                          ))
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">- Trống -</span>
                        )}
                      </div>
                    </div>
                  )) : <div className="text-center text-slate-400 italic">Chưa có dữ liệu lịch học</div>}
                </div>
              </div>
            ))}
          </div>

          {/* BẢNG LỊCH CUỐI TUẦN DESKTOP */}
          <div className="hidden md:block overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-xl">
            <table className="w-full text-left text-xs border-collapse min-w-[750px]">
              <thead className="bg-amber-900 text-amber-100 font-bold uppercase text-[11px]">
                <tr>
                  <th className="p-2.5 border-b border-amber-800 w-24 text-center whitespace-nowrap">Thứ</th>
                  {weekendSlots.length > 0 ? weekendSlots.map(slot => (
                    <th key={slot} className="p-2.5 border-b border-amber-800 text-center whitespace-nowrap">{slot}</th>
                  )) : (
                    <th className="p-2.5 border-b border-amber-800 text-center text-amber-200 italic">Chưa có khung giờ nào</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-semibold text-[11px]">
                {weekendDays.map(item => (
                  <tr key={item.val} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 dark:bg-slate-900/50">
                    <td className={`p-2.5 text-center font-extrabold ${item.headerClass}`}>{item.label}</td>
                    {weekendSlots.length > 0 ? weekendSlots.map(slot => (
                      <td key={slot} className="p-2.5 text-center">
                        {weekendMatrix[item.val][slot].length > 0 ? (
                          weekendMatrix[item.val][slot].map(cls => (
                            <span key={cls} className={`px-2 py-0.5 rounded font-bold ml-1 mb-1 inline-block ${item.badgeClass}`}>{cls}</span>
                          ))
                        ) : (
                          <span className="text-slate-300 italic">-</span>
                        )}
                      </td>
                    )) : (
                      <td className="p-2.5 text-center"></td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 5. KHU VỰC BIỂU ĐỒ ĐƯỜNG CONG TƯƠNG TÁC (SMOOTH LINE CHARTS + TOOLTIP) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* BIỂU ĐỒ 1: DOANH THU ĐƯỜNG CONG */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 dark:border-slate-700 shadow-sm dark:shadow-none dark:shadow-none space-y-4 relative">
          <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-700/50 dark:border-slate-700/50 pb-3">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-sm">Biểu Đồ Doanh Thu Đường Cong (Năm {selectedYear})</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-400">Uốn lượn mượt mà + Rê chuột xem chỉ số từng tháng</p>
            </div>
            <span className="text-xs font-bold text-cyan-800 dark:text-cyan-300 dark:text-cyan-300 bg-cyan-50 dark:bg-cyan-900/30 dark:bg-cyan-900/30 px-2.5 py-1 rounded border border-cyan-200">VNĐ</span>
          </div>

          <div className="relative w-full h-52 pt-2">
            {/* TOOLTIP NỔI KHI HOVER */}
            {hoveredRevIndex !== null && revPoints[hoveredRevIndex] && (
              <div
                className="absolute z-20 bg-slate-900 text-white text-xs font-bold p-2.5 rounded-xl shadow-xl dark:shadow-none dark:shadow-none border border-slate-700 pointer-events-none transition-all duration-150 transform -translate-x-1/2 -translate-y-full"
                style={{
                  left: `${(revPoints[hoveredRevIndex].x / chartWidth) * 100}%`,
                  top: `${(revPoints[hoveredRevIndex].y / chartHeight) * 100 - 8}%`
                }}
              >
                <p className="text-[10px] text-cyan-300 uppercase font-semibold">Tháng {revPoints[hoveredRevIndex].month}/{selectedYear}</p>
                <p className="text-sm font-black mt-0.5 text-white">
                  {Number(revPoints[hoveredRevIndex].val).toLocaleString('vi-VN')} đ
                </p>
              </div>
            )}

            <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-full overflow-visible">
              <defs>
                <linearGradient id="revGradientSmooth" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0891b2" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#0891b2" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              <line x1={paddingX} y1={25} x2={chartWidth - paddingX} y2={25} stroke="#f1f5f9" strokeDasharray="4 4" />
              <line x1={paddingX} y1={85} x2={chartWidth - paddingX} y2={85} stroke="#f1f5f9" strokeDasharray="4 4" />
              <line x1={paddingX} y1={145} x2={chartWidth - paddingX} y2={145} stroke="#e2e8f0" />

              {/* BÓNG ĐƯỜNG CONG GRADIENT */}
              {revAreaPath && <path d={revAreaPath} fill="url(#revGradientSmooth)" />}

              {/* ĐƯỜNG CONG CHÍNH */}
              {revSmoothPath && (
                <path
                  d={revSmoothPath}
                  fill="none"
                  stroke="#0891b2"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* NÚT ĐIỂM DỮ LIỆU & BẢO CẢNH CẢM ỨNG HOVER */}
              {revPoints.map((p, idx) => {
                const isHovered = hoveredRevIndex === idx;
                const isCurrentMonth = idx + 1 === selectedMonth;

                return (
                  <g
                    key={idx}
                    className="cursor-pointer"
                    onMouseEnter={() => setHoveredRevIndex(idx)}
                    onMouseLeave={() => setHoveredRevIndex(null)}
                  >
                    {/* VÙNG HOVER RỘNG HƠN ĐỂ DỄ RÊ CHUỘT */}
                    <rect
                      x={p.x - 15}
                      y={0}
                      width={30}
                      height={chartHeight}
                      fill="transparent"
                    />

                    {/* VẠCH DỰNG ĐỨNG KHI HOVER */}
                    {isHovered && (
                      <line x1={p.x} y1={25} x2={p.x} y2={145} stroke="#0891b2" strokeWidth="1.5" strokeDasharray="3 3" />
                    )}

                    <circle
                      cx={p.x}
                      cy={p.y}
                      r={isHovered ? "7" : isCurrentMonth ? "5" : "3.5"}
                      className={`transition-all duration-150 ${isHovered
                          ? 'fill-cyan-600 stroke-white stroke-3 shadow-lg dark:shadow-none dark:shadow-none'
                          : isCurrentMonth
                            ? 'fill-slate-900 stroke-white stroke-2'
                            : 'fill-cyan-600'
                        }`}
                    />

                    <text
                      x={p.x}
                      y={chartHeight - 2}
                      textAnchor="middle"
                      className={`text-[10px] font-bold ${isHovered || isCurrentMonth ? 'fill-cyan-700 font-extrabold' : 'fill-slate-400'}`}
                    >
                      {p.month}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        {/* BIỂU ĐỒ 2: BIẾN ĐỘNG HỌC SINH ĐƯỜNG CONG */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 dark:border-slate-700 shadow-sm dark:shadow-none dark:shadow-none space-y-4 relative">
          <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-700/50 dark:border-slate-700/50 pb-3">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-sm">Biểu Đồ Biến Động Học Sinh Đường Cong (Năm {selectedYear})</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-400">Đường cong Học sinh mới (Vào) vs Nghỉ học (Ra)</p>
            </div>
            <div className="flex items-center space-x-3 text-[11px] font-bold">
              <span className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400 dark:text-emerald-400">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span> Vào
              </span>
              <span className="flex items-center gap-1 text-rose-700 dark:text-rose-400 dark:text-rose-400">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span> Ra
              </span>
            </div>
          </div>

          <div className="relative w-full h-52 pt-2">
            {/* TOOLTIP NỔI KHI HOVER */}
            {hoveredStudentIndex !== null && inPoints[hoveredStudentIndex] && (
              <div
                className="absolute z-20 bg-slate-900 text-white text-xs font-bold p-2.5 rounded-xl shadow-xl dark:shadow-none dark:shadow-none border border-slate-700 pointer-events-none transition-all duration-150 transform -translate-x-1/2 -translate-y-full"
                style={{
                  left: `${(inPoints[hoveredStudentIndex].x / chartWidth) * 100}%`,
                  top: `${(Math.min(inPoints[hoveredStudentIndex].y, outPoints[hoveredStudentIndex].y) / chartHeight) * 100 - 8}%`
                }}
              >
                <p className="text-[10px] text-cyan-300 uppercase font-semibold">Tháng {inPoints[hoveredStudentIndex].month}/{selectedYear}</p>
                <div className="flex items-center gap-3 mt-1 text-xs">
                  <span className="text-emerald-400 font-bold">🟢 Nhập học: +{inPoints[hoveredStudentIndex].val}</span>
                  <span className="text-rose-400 font-bold">🔴 Nghỉ học: -{outPoints[hoveredStudentIndex].val}</span>
                </div>
              </div>
            )}

            <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-full overflow-visible">
              <line x1={paddingX} y1={25} x2={chartWidth - paddingX} y2={25} stroke="#f1f5f9" strokeDasharray="4 4" />
              <line x1={paddingX} y1={85} x2={chartWidth - paddingX} y2={85} stroke="#f1f5f9" strokeDasharray="4 4" />
              <line x1={paddingX} y1={145} x2={chartWidth - paddingX} y2={145} stroke="#e2e8f0" />

              {/* ĐƯỜNG CONG NHẬP HỌC (VÀO) */}
              {inSmoothPath && (
                <path
                  d={inSmoothPath}
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* ĐƯỜNG CONG NGHỈ HỌC (RA) */}
              {outSmoothPath && (
                <path
                  d={outSmoothPath}
                  fill="none"
                  stroke="#f43f5e"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {inPoints.map((p, idx) => {
                const isHovered = hoveredStudentIndex === idx;
                return (
                  <g
                    key={`st-${idx}`}
                    className="cursor-pointer"
                    onMouseEnter={() => setHoveredStudentIndex(idx)}
                    onMouseLeave={() => setHoveredStudentIndex(null)}
                  >
                    <rect x={p.x - 15} y={0} width={30} height={chartHeight} fill="transparent" />

                    {isHovered && (
                      <line x1={p.x} y1={25} x2={p.x} y2={145} stroke="#64748b" strokeWidth="1.5" strokeDasharray="3 3" />
                    )}

                    <circle cx={p.x} cy={p.y} r={isHovered ? "6" : "3.5"} className="fill-emerald-600 stroke-white stroke-2" />
                    <circle cx={outPoints[idx].x} cy={outPoints[idx].y} r={isHovered ? "6" : "3.5"} className="fill-rose-500 stroke-white stroke-2" />

                    <text
                      x={p.x}
                      y={chartHeight - 2}
                      textAnchor="middle"
                      className={`text-[10px] font-bold ${isHovered ? 'fill-slate-900 font-extrabold' : 'fill-slate-400'}`}
                    >
                      {p.month}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>
      </div>

      {/* 6. BẢNG DANH SÁCH CHI TIẾT THU HỌC PHÍ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* HỌC SINH CHƯA NỘP HỌC PHÍ */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 dark:border-slate-700 shadow-sm dark:shadow-none dark:shadow-none overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-slate-700 dark:border-slate-700 bg-rose-50 dark:bg-rose-900/30 dark:bg-rose-900/30 flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 text-rose-600" />
              <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                Học Sinh CHƯA Nộp Học Phí (Tháng {selectedMonth})
              </h3>
            </div>
            <span className="text-xs font-bold bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300 px-2.5 py-0.5 rounded-full border border-rose-200 dark:border-rose-800/50">
              {data?.unpaid_students_count || 0} học sinh
            </span>
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-slate-200 text-xs">
            {!data?.unpaid_list || data.unpaid_list.length === 0 ? (
              <div className="p-6 text-center text-slate-500 dark:text-slate-400 dark:text-slate-400">
                🎉 Tuyệt vời! Tất cả học sinh đã hoàn thành nộp học phí tháng này.
              </div>
            ) : (
              data.unpaid_list.slice(0, visibleUnpaidCount).map((s) => (
                <div
                  key={s.id}
                  onClick={() => navigate(`/pos?studentId=${s.id}`)}
                  className="p-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 dark:bg-slate-900/50 dark:hover:bg-slate-700/50 dark:bg-slate-900/50 flex justify-between items-center cursor-pointer group transition-colors"
                >
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white text-sm group-hover:text-cyan-600 transition-colors">{s.full_name}</p>
                    <p className="text-slate-500 dark:text-slate-400 dark:text-slate-400 text-[11px]">
                      Mã: <b>{s.student_code}</b> | Khối {s.grade} {s.class_type} | PH: <b>{s.parent_name}</b> ({s.parent_phone})
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-rose-600 text-sm">
                      {Number(s.expected_fee || 0).toLocaleString('vi-VN')} đ
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 dark:text-slate-400">
                      Đã đi học: <b>{s.total_sessions || 0} buổi</b>
                    </p>
                  </div>
                </div>
              ))
            )}

            {data?.unpaid_list?.length > visibleUnpaidCount && (
              <div className="p-3 bg-slate-50 dark:bg-slate-900/30 flex justify-center border-t border-slate-200 dark:border-slate-700">
                <button
                  onClick={() => setVisibleUnpaidCount(prev => prev + 10)}
                  className="text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 px-4 py-2 rounded-lg transition-colors"
                >
                  Xem thêm ({visibleUnpaidCount} / {data.unpaid_list.length})
                </button>
              </div>
            )}
          </div>
        </div>

        {/* HỌC SINH ĐÃ NỘP HỌC PHÍ */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 dark:border-slate-700 shadow-sm dark:shadow-none dark:shadow-none overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-slate-700 dark:border-slate-700 bg-emerald-50 dark:bg-emerald-900/30 dark:bg-emerald-900/30 flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                Học Sinh ĐÃ Nộp Học Phí (Tháng {selectedMonth})
              </h3>
            </div>
            <span className="text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800/50">
              {data?.paid_students_count || 0} học sinh
            </span>
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-slate-200 text-xs">
            {!data?.paid_list || data.paid_list.length === 0 ? (
              <div className="p-6 text-center text-slate-500 dark:text-slate-400 dark:text-slate-400">
                Chưa có học sinh nào nộp học phí trong tháng này.
              </div>
            ) : (
              data.paid_list.slice(0, visiblePaidCount).map((inv) => (
                <div key={inv.id} className="p-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 dark:bg-slate-900/50 dark:hover:bg-slate-700/50 dark:bg-slate-900/50 flex justify-between items-center">
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white text-sm">{inv.student?.full_name}</p>
                    <p className="text-slate-500 dark:text-slate-400 dark:text-slate-400 text-[11px]">
                      Mã HD: <b className="text-cyan-700 dark:text-cyan-400 dark:text-cyan-400">{inv.invoice_code}</b> | Nộp lúc: {new Date(inv.paid_at || inv.created_at).toLocaleDateString('vi-VN')} ({inv.payment_method === 'cash' ? 'Tiền mặt' : 'Chuyển khoản'})
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-emerald-700 dark:text-emerald-400 dark:text-emerald-400 text-sm">
                      {Number(inv.amount || 0).toLocaleString('vi-VN')} đ
                    </p>
                    <span className="inline-block bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded">
                      Đã hoàn thành
                    </span>
                  </div>
                </div>
              ))
            )}

            {data?.paid_list?.length > visiblePaidCount && (
              <div className="p-3 bg-slate-50 dark:bg-slate-900/30 flex justify-center border-t border-slate-200 dark:border-slate-700">
                <button
                  onClick={() => setVisiblePaidCount(prev => prev + 10)}
                  className="text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 px-4 py-2 rounded-lg transition-colors"
                >
                  Xem thêm ({visiblePaidCount} / {data.paid_list.length})
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MODAL HIỂN THỊ DANH SÁCH HỌC SINH THEO KHỐI LỚP (CÓ BỘ LỌC LOẠI LỚP) */}
      {selectedGradeModal !== null && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex justify-center items-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-3xl shadow-2xl relative border border-slate-200 dark:border-slate-700 dark:border-slate-700 space-y-4 max-h-[85vh] flex flex-col">

            {/* TIÊU ĐỀ MODAL */}
            <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-700 dark:border-slate-700 pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Users className="w-5 h-5 text-cyan-600" />
                  <span>Danh Sách Học Sinh - Khối {selectedGradeModal}</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-400 mt-0.5">
                  Hiển thị <b>{filteredGradeStudents.length}</b> / {gradeStudents.length} học sinh
                </p>
              </div>
              <button
                onClick={() => setSelectedGradeModal(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 dark:text-slate-300 dark:text-slate-400 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:bg-slate-700/50 dark:bg-slate-700/50 dark:hover:bg-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* BỘ LỌC BẤM NHANH LOẠI LỚP */}
            <div className="flex flex-wrap items-center gap-1.5 text-xs bg-slate-50 dark:bg-slate-900/50 dark:bg-slate-900/50 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 dark:border-slate-700/80">
              <span className="font-bold text-slate-700 dark:text-slate-300 dark:text-slate-300 mr-1.5 flex items-center gap-1">
                <Filter className="w-3.5 h-3.5 text-cyan-600" /> Lọc Loại Lớp:
              </span>
              {['', 'CLC', 'CC', 'CC1', 'CC2', 'NC', 'NC1', 'NC2', 'NC3'].map((c) => (
                <button
                  key={c}
                  onClick={() => setModalClassFilter(c)}
                  className={`px-3 py-1 rounded-lg font-bold transition-all ${modalClassFilter === c
                      ? 'bg-cyan-700 text-white shadow-sm dark:shadow-none dark:shadow-none ring-2 ring-cyan-500/20'
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 dark:text-slate-400 hover:bg-slate-200/80 border border-slate-200 dark:border-slate-700 dark:border-slate-700'
                    }`}
                >
                  {c === '' ? 'Tất cả' : `Lớp ${c}`}
                </button>
              ))}
            </div>

            {/* BẢNG DANH SÁCH HỌC SINH IN MODAL */}
            <div className="overflow-y-auto flex-1 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800">

              {/* DẠNG THẺ MOBILE */}
              <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-700/50">
                {loadingGradeStudents ? (
                  <div className="p-6 text-center text-slate-400 italic text-xs">
                    Đang tải danh sách học sinh Khối {selectedGradeModal}...
                  </div>
                ) : filteredGradeStudents.length === 0 ? (
                  <div className="p-6 text-center text-slate-400 italic text-xs">
                    Không tìm thấy học sinh phù hợp với bộ lọc Lớp "{modalClassFilter || 'Tất cả'}".
                  </div>
                ) : (
                  filteredGradeStudents.map((s) => (
                    <div key={s.id} className="p-3.5 space-y-2 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-bold text-slate-900 dark:text-white text-sm">{s.full_name}</h4>
                          <p className="text-xs text-slate-500 font-mono mt-0.5">{s.student_code}</p>
                        </div>
                        <div className="text-right">
                          <span className="bg-cyan-50 dark:bg-cyan-900/30 text-cyan-800 dark:text-cyan-300 font-bold px-2 py-0.5 rounded border border-cyan-200 text-[10px]">
                            {s.class_type || 'CLC'}
                          </span>
                        </div>
                      </div>
                      <div className="bg-slate-50 dark:bg-slate-900/50 p-2.5 rounded-lg text-xs space-y-1.5 border border-slate-100 dark:border-slate-700/80">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Phụ huynh:</span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200">{s.parent_name || 'Chưa cập nhật'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">SĐT:</span>
                          <span className="font-mono text-slate-700 dark:text-slate-300">{s.parent_phone || 'Chưa cập nhật'}</span>
                        </div>
                        <div className="flex justify-between border-t border-slate-200 dark:border-slate-700 pt-1.5 mt-1.5">
                          <span className="text-slate-500">Đơn giá / Buổi:</span>
                          <span className="font-extrabold text-cyan-700 dark:text-cyan-400">
                            {Number(s.price_per_session || 130000).toLocaleString('vi-VN')} đ
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* BẢNG DESKTOP */}
              <table className="hidden md:table w-full text-left text-xs border-collapse">
                <thead className="bg-slate-900 text-slate-100 uppercase font-semibold sticky top-0 z-10">
                  <tr>
                    <th className="p-3">Mã HS</th>
                    <th className="p-3">Họ và Tên</th>
                    <th className="p-3">Loại Lớp</th>
                    <th className="p-3">Phụ Huynh (Bố/Mẹ)</th>
                    <th className="p-3">Số Điện Thoại</th>
                    <th className="p-3 text-right">Đơn giá / Buổi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loadingGradeStudents ? (
                    <tr>
                      <td colSpan="6" className="p-6 text-center text-slate-400 italic">
                        Đang tải danh sách học sinh Khối {selectedGradeModal}...
                      </td>
                    </tr>
                  ) : filteredGradeStudents.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="p-6 text-center text-slate-400 italic">
                        Không tìm thấy học sinh phù hợp với bộ lọc Lớp "{modalClassFilter || 'Tất cả'}".
                      </td>
                    </tr>
                  ) : (
                    filteredGradeStudents.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 dark:bg-slate-900/50 dark:hover:bg-slate-700/50 dark:bg-slate-900/50 transition-colors">
                        <td className="p-3 font-bold font-mono text-cyan-800 dark:text-cyan-300 dark:text-cyan-300">{s.student_code}</td>
                        <td className="p-3 font-bold text-slate-900 dark:text-white">{s.full_name}</td>
                        <td className="p-3">
                          <span className="bg-cyan-50 dark:bg-cyan-900/30 dark:bg-cyan-900/30 text-cyan-800 dark:text-cyan-300 dark:text-cyan-300 font-bold px-2 py-0.5 rounded border border-cyan-200">
                            {s.class_type || 'CLC'}
                          </span>
                        </td>
                        <td className="p-3 font-medium text-slate-800 dark:text-slate-200 dark:text-slate-200">{s.parent_name}</td>
                        <td className="p-3 font-mono text-slate-600 dark:text-slate-400 dark:text-slate-400">{s.parent_phone}</td>
                        <td className="p-3 text-right font-extrabold text-slate-900 dark:text-white">
                          {Number(s.price_per_session || 130000).toLocaleString('vi-VN')} đ
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="text-right pt-2 border-t border-slate-100 dark:border-slate-700/50 dark:border-slate-700/50">
              <button
                onClick={() => setSelectedGradeModal(null)}
                className="bg-slate-100 dark:bg-slate-700/50 dark:bg-slate-700/50 text-slate-700 dark:text-slate-300 dark:text-slate-300 px-4 py-2 rounded-xl text-xs font-bold hover:bg-slate-200 transition-colors"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}