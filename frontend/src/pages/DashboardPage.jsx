import React, { useEffect, useState } from 'react';
import api from '../api/axios';
import { 
  DollarSign, Users, UserPlus, UserMinus, CheckCircle2, Clock, 
  TrendingUp, Filter, CreditCard, AlertCircle, RefreshCw, Layers, Calendar, X 
} from 'lucide-react';

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
      <div className="p-8 text-center text-slate-500 font-medium">
        Đang tổng hợp dữ liệu Bảng điều khiển (Dashboard)...
      </div>
    );
  }

  return (
    <div className="space-y-6 text-slate-800 pb-12">
      {/* 1. THANH TIÊU ĐỀ & BỘ LỌC CÓ NÚT XÓA LỌC */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-wrap gap-3 items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-cyan-600" />
            <span>Bảng Điều Khiển Tổng Quan (Dashboard)</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Theo dõi sức khỏe tài chính, sĩ số học sinh và tình trạng học phí theo thời gian thực
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1 text-slate-700 font-bold text-xs mr-1">
            <Filter className="w-4 h-4 text-cyan-600" />
            <span>Kỳ xem:</span>
          </div>

          <select
            className="border border-slate-300 rounded-lg p-2 text-xs font-semibold bg-slate-50 text-slate-800 outline-none focus:ring-2 focus:ring-cyan-500"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
          >
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => (
              <option key={m} value={m}>Tháng {m}</option>
            ))}
          </select>

                  <select
          className="border border-slate-300 rounded-lg p-2 text-xs font-semibold bg-slate-50 text-slate-800 outline-none focus:ring-2 focus:ring-cyan-500"
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
              className="flex items-center space-x-1 text-xs text-slate-600 hover:text-rose-600 bg-slate-100 hover:bg-rose-50 px-2.5 py-2 rounded-lg font-medium border border-slate-200 transition-colors"
              title="Mặc định quay về kỳ tháng hiện tại"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Xóa lọc</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. KHU VỰC 4 THẺ KPI CỐT LÕI */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              DOANH THU THÁNG {selectedMonth}
            </span>
            <div className="p-2 bg-cyan-50 rounded-lg text-cyan-700">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900">
            {Number(data?.total_revenue_month || 0).toLocaleString('vi-VN')} đ
          </p>
          <p className="text-[11px] text-slate-400">Chốt sổ ngày 20/{selectedMonth < 10 ? `0${selectedMonth}` : selectedMonth}/{selectedYear}</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              TỔNG DOANH THU NĂM {selectedYear}
            </span>
            <div className="p-2 bg-cyan-50 rounded-lg text-cyan-700">
              <CreditCard className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900">
            {Number(data?.total_revenue_year || 0).toLocaleString('vi-VN')} đ
          </p>
          <p className="text-[11px] text-slate-400">Tích lũy từ Tháng 1 đến Tháng 12</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              SĨ SỐ THÁNG {selectedMonth}
            </span>
            <div className="p-2 bg-cyan-50 rounded-lg text-cyan-700">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900">
            {data?.total_active_students || 0} <span className="text-xs font-normal text-slate-500">học sinh</span>
          </p>
          <div className="flex items-center gap-3 text-[11px] font-semibold pt-0.5">
            <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/60 inline-flex items-center gap-1">
              <UserPlus className="w-3 h-3" /> +{data?.students_in_month || 0} mới
            </span>
            <span className="text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200/60 inline-flex items-center gap-1">
              <UserMinus className="w-3 h-3" /> -{data?.students_out_month || 0} nghỉ
            </span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              HỌC PHÍ THÁNG {selectedMonth}
            </span>
            <div className="p-2 bg-cyan-50 rounded-lg text-cyan-700">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <p className="text-2xl font-black text-slate-900">
              {data?.paid_students_count || 0} <span className="text-xs font-normal text-emerald-600">Đã nộp</span>
            </p>
            <p className="text-lg font-bold text-rose-600">
              {data?.unpaid_students_count || 0} <span className="text-xs font-normal text-rose-500">Nợ HP</span>
            </p>
          </div>
          <p className="text-[11px] text-slate-400">
            Nợ đọng: <b className="text-slate-800">{Number(data?.total_unpaid_amount || 0).toLocaleString('vi-VN')} đ</b>
          </p>
        </div>
      </div>

      {/* 3. BẢNG KHỐI LỚP CÓ THỂ BẤM VÀO XEM CHI TIẾT */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <div className="flex items-center space-x-2 text-slate-800">
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
                className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 text-center cursor-pointer hover:border-cyan-500 hover:bg-cyan-50/40 hover:shadow-md transition-all group relative"
              >
                <p className="text-[11px] font-semibold text-slate-500 group-hover:text-cyan-800">Khối {g}</p>
                <p className="text-lg font-black text-cyan-700 mt-0.5 group-hover:scale-105 transition-transform">
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
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-cyan-600" />
              <span>Thời Khóa Biểu Lịch Học Niêm Yết Trung Tâm</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">Lịch học cố định từ Thứ 2 đến Chủ Nhật phân theo các ca chuẩn</p>
          </div>

          <span className="bg-cyan-50 text-cyan-800 text-xs font-bold px-3 py-1.5 rounded-lg border border-cyan-200 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            <span>Kỳ chốt ngày 20 hàng tháng</span>
          </span>
        </div>

        {/* LỊCH HỌC NGÀY THƯỜNG */}
        <div className="space-y-2">
          <h3 className="text-xs font-extrabold text-cyan-800 uppercase tracking-wider flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-cyan-600"></span>
            <span>Lịch Học Ca Tối Ngày Thường (Thứ 2 đến Thứ 6)</span>
          </h3>

          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left text-xs border-collapse min-w-[650px]">
              <thead className="bg-slate-900 text-white font-bold uppercase text-[11px]">
                <tr>
                  <th className="p-2.5 border-b border-slate-800 w-20 text-center">Thứ</th>
                  <th className="p-2.5 border-b border-slate-800 text-center text-cyan-300">Ca 1 (17h30 - 19h00)</th>
                  <th className="p-2.5 border-b border-slate-800 text-center text-cyan-300">Ca 2 (19h00 - 20h30)</th>
                  <th className="p-2.5 border-b border-slate-800 text-center text-cyan-300">Ca 3 (20h30 - 22h00)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-semibold">
                <tr className="hover:bg-slate-50">
                  <td className="p-2.5 text-center font-bold text-rose-700 bg-rose-50/50">Thứ 2</td>
                  <td className="p-2.5 text-center"><span className="bg-rose-100/70 text-rose-900 px-2 py-0.5 rounded">3NC</span> <span className="bg-rose-100/70 text-rose-900 px-2 py-0.5 rounded ml-1">5NC1</span></td>
                  <td className="p-2.5 text-center"><span className="bg-rose-100/70 text-rose-900 px-2 py-0.5 rounded">4NC1</span> <span className="bg-rose-100/70 text-rose-900 px-2 py-0.5 rounded ml-1">6CC2</span></td>
                  <td className="p-2.5 text-center"><span className="bg-rose-100/70 text-rose-900 px-2 py-0.5 rounded">8CLC</span> <span className="bg-rose-100/70 text-rose-900 px-2 py-0.5 rounded ml-1">9CB</span></td>
                </tr>
                <tr className="hover:bg-slate-50">
                  <td className="p-2.5 text-center font-bold text-amber-700 bg-amber-50/50">Thứ 3</td>
                  <td className="p-2.5 text-center"><span className="bg-amber-100/70 text-amber-900 px-2 py-0.5 rounded">3CC</span> <span className="bg-amber-100/70 text-amber-900 px-2 py-0.5 rounded ml-1">5NC2</span></td>
                  <td className="p-2.5 text-center"><span className="bg-amber-100/70 text-amber-900 px-2 py-0.5 rounded">4NC2</span> <span className="bg-amber-100/70 text-amber-900 px-2 py-0.5 rounded ml-1">6CLC</span></td>
                  <td className="p-2.5 text-center"><span className="bg-amber-100/70 text-amber-900 px-2 py-0.5 rounded">9NC</span> <span className="bg-amber-100/70 text-amber-900 px-2 py-0.5 rounded ml-1">Khối 10</span></td>
                </tr>
                <tr className="hover:bg-slate-50">
                  <td className="p-2.5 text-center font-bold text-emerald-700 bg-emerald-50/50">Thứ 4</td>
                  <td className="p-2.5 text-center"><span className="bg-emerald-100/70 text-emerald-900 px-2 py-0.5 rounded">3NC</span> <span className="bg-emerald-100/70 text-emerald-900 px-2 py-0.5 rounded ml-1">5NC1</span></td>
                  <td className="p-2.5 text-center"><span className="bg-emerald-100/70 text-emerald-900 px-2 py-0.5 rounded">4NC1</span> <span className="bg-emerald-100/70 text-emerald-900 px-2 py-0.5 rounded ml-1">8CC</span></td>
                  <td className="p-2.5 text-center"><span className="bg-emerald-100/70 text-emerald-900 px-2 py-0.5 rounded">7CLC</span> <span className="bg-emerald-100/70 text-emerald-900 px-2 py-0.5 rounded ml-1">Khối 12</span></td>
                </tr>
                <tr className="hover:bg-slate-50">
                  <td className="p-2.5 text-center font-bold text-purple-700 bg-purple-50/50">Thứ 5</td>
                  <td className="p-2.5 text-center"><span className="bg-purple-100/70 text-purple-900 px-2 py-0.5 rounded">3CC</span> <span className="bg-purple-100/70 text-purple-900 px-2 py-0.5 rounded ml-1">5NC2</span></td>
                  <td className="p-2.5 text-center"><span className="bg-purple-100/70 text-purple-900 px-2 py-0.5 rounded">4NC2</span> <span className="bg-purple-100/70 text-purple-900 px-2 py-0.5 rounded ml-1">6CLC</span></td>
                  <td className="p-2.5 text-center"><span className="bg-purple-100/70 text-purple-900 px-2 py-0.5 rounded">7CC</span> <span className="bg-purple-100/70 text-purple-900 px-2 py-0.5 rounded ml-1">9NC</span></td>
                </tr>
                <tr className="hover:bg-slate-50">
                  <td className="p-2.5 text-center font-bold text-blue-700 bg-blue-50/50">Thứ 6</td>
                  <td className="p-2.5 text-center"><span className="bg-blue-100/70 text-blue-900 px-2 py-0.5 rounded">5NC3</span> <span className="bg-blue-100/70 text-blue-900 px-2 py-0.5 rounded ml-1">6CC1</span></td>
                  <td className="p-2.5 text-center"><span className="bg-blue-100/70 text-blue-900 px-2 py-0.5 rounded">6CC2</span> <span className="bg-blue-100/70 text-blue-900 px-2 py-0.5 rounded ml-1">8CLC</span></td>
                  <td className="p-2.5 text-center"><span className="bg-blue-100/70 text-blue-900 px-2 py-0.5 rounded">9CB</span> <span className="bg-blue-100/70 text-blue-900 px-2 py-0.5 rounded ml-1">Khối 11</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* LỊCH HỌC CUỐI TUẦN */}
        <div className="space-y-2 pt-1">
          <h3 className="text-xs font-extrabold text-amber-800 uppercase tracking-wider flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
            <span>Lịch Học & Ôn Bù Cuối Tuần (Thứ 7 & Chủ Nhật)</span>
          </h3>

          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left text-xs border-collapse min-w-[750px]">
              <thead className="bg-amber-900 text-amber-100 font-bold uppercase text-[11px]">
                <tr>
                  <th className="p-2.5 border-b border-amber-800 w-24 text-center">Thứ</th>
                  <th className="p-2.5 border-b border-amber-800 text-center">Ca 1 (8h00 - 9h30)</th>
                  <th className="p-2.5 border-b border-amber-800 text-center">Ca 2 (9h30 - 11h00)</th>
                  <th className="p-2.5 border-b border-amber-800 text-center">Ca 3 (14h00 - 15h30)</th>
                  <th className="p-2.5 border-b border-amber-800 text-center">Ca 4 (15h30 - 17h00)</th>
                  <th className="p-2.5 border-b border-amber-800 text-center">Ca 5 (17h00 - 18h30)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-semibold text-[11px]">
                <tr className="hover:bg-slate-50">
                  <td className="p-2.5 text-center font-extrabold text-amber-800 bg-amber-50/60">Thứ 7</td>
                  <td className="p-2.5 text-center">
                    <div className="text-amber-800">Khối 3 học bù</div>
                    <div className="font-bold text-slate-800 mt-0.5">7CC</div>
                  </td>
                  <td className="p-2.5 text-center">
                    <div className="text-amber-800">4NC2 học bù</div>
                    <div className="font-bold text-slate-800 mt-0.5">8CC</div>
                  </td>
                  <td className="p-2.5 text-center">
                    <div className="text-amber-800">Khối 6 học bù</div>
                    <div className="font-bold text-slate-800 mt-0.5">7CLC</div>
                  </td>
                  <td className="p-2.5 text-center">
                    <div className="text-purple-800 font-bold">Ôn Toán 9 Chuyên</div>
                    <div className="font-bold text-slate-800 mt-0.5">Khối 12</div>
                  </td>
                  <td className="p-2.5 text-center">
                    <div className="text-amber-800">8CC học bù</div>
                    <div className="font-bold text-cyan-800 mt-0.5">Lớp KHTN</div>
                  </td>
                </tr>

                <tr className="hover:bg-slate-50">
                  <td className="p-2.5 text-center font-extrabold text-rose-800 bg-rose-50/60">Chủ Nhật</td>
                  <td className="p-2.5 text-center">
                    <div className="text-rose-800">Khối 5 học bù</div>
                    <div className="text-rose-800 mt-0.5">4NC1 học bù</div>
                  </td>
                  <td className="p-2.5 text-center">
                    <div className="font-bold text-slate-800">5NC3</div>
                    <div className="font-bold text-slate-800 mt-0.5">6CC1</div>
                  </td>
                  <td className="p-2.5 text-center">
                    <div className="text-rose-800">Khối 7 học bù</div>
                    <div className="font-bold text-slate-800 mt-0.5">Khối 10</div>
                  </td>
                  <td className="p-2.5 text-center">
                    <div className="text-purple-800 font-bold">Khối 5 Ôn CLC</div>
                    <div className="font-bold text-slate-800 mt-0.5">Khối 11</div>
                  </td>
                  <td className="p-2.5 text-center text-slate-300 italic">
                    - Trống -
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 5. KHU VỰC BIỂU ĐỒ ĐƯỜNG CONG TƯƠNG TÁC (SMOOTH LINE CHARTS + TOOLTIP) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* BIỂU ĐỒ 1: DOANH THU ĐƯỜNG CONG */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4 relative">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Biểu Đồ Doanh Thu Đường Cong (Năm {selectedYear})</h3>
              <p className="text-xs text-slate-500">Uốn lượn mượt mà + Rê chuột xem chỉ số từng tháng</p>
            </div>
            <span className="text-xs font-bold text-cyan-800 bg-cyan-50 px-2.5 py-1 rounded border border-cyan-200">VNĐ</span>
          </div>

          <div className="relative w-full h-52 pt-2">
            {/* TOOLTIP NỔI KHI HOVER */}
            {hoveredRevIndex !== null && revPoints[hoveredRevIndex] && (
              <div 
                className="absolute z-20 bg-slate-900 text-white text-xs font-bold p-2.5 rounded-xl shadow-xl border border-slate-700 pointer-events-none transition-all duration-150 transform -translate-x-1/2 -translate-y-full"
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
                      className={`transition-all duration-150 ${
                        isHovered 
                          ? 'fill-cyan-600 stroke-white stroke-3 shadow-lg' 
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
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4 relative">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Biểu Đồ Biến Động Học Sinh Đường Cong (Năm {selectedYear})</h3>
              <p className="text-xs text-slate-500">Đường cong Học sinh mới (Vào) vs Nghỉ học (Ra)</p>
            </div>
            <div className="flex items-center space-x-3 text-[11px] font-bold">
              <span className="flex items-center gap-1 text-emerald-700">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span> Vào
              </span>
              <span className="flex items-center gap-1 text-rose-700">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span> Ra
              </span>
            </div>
          </div>

          <div className="relative w-full h-52 pt-2">
            {/* TOOLTIP NỔI KHI HOVER */}
            {hoveredStudentIndex !== null && inPoints[hoveredStudentIndex] && (
              <div 
                className="absolute z-20 bg-slate-900 text-white text-xs font-bold p-2.5 rounded-xl shadow-xl border border-slate-700 pointer-events-none transition-all duration-150 transform -translate-x-1/2 -translate-y-full"
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
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-rose-50/50 flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 text-rose-600" />
              <h3 className="font-bold text-slate-900 text-sm">
                Học Sinh CHƯA Nộp Học Phí (Tháng {selectedMonth})
              </h3>
            </div>
            <span className="text-xs font-bold bg-rose-100 text-rose-800 px-2.5 py-0.5 rounded-full border border-rose-200">
              {data?.unpaid_students_count || 0} học sinh
            </span>
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-slate-200 text-xs">
            {!data?.unpaid_list || data.unpaid_list.length === 0 ? (
              <div className="p-6 text-center text-slate-500">
                🎉 Tuyệt vời! Tất cả học sinh đã hoàn thành nộp học phí tháng này.
              </div>
            ) : (
              data.unpaid_list.map((s) => (
                <div key={s.id} className="p-3 hover:bg-slate-50 flex justify-between items-center">
                  <div>
                    <p className="font-bold text-slate-900 text-sm">{s.full_name}</p>
                    <p className="text-slate-500 text-[11px]">
                      Mã: <b>{s.student_code}</b> | Khối {s.grade} {s.class_type} | PH: <b>{s.parent_name}</b> ({s.parent_phone})
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-rose-600 text-sm">
                      {Number(s.expected_fee || 0).toLocaleString('vi-VN')} đ
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Đã đi học: <b>{s.total_sessions || 0} buổi</b>
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* HỌC SINH ĐÃ NỘP HỌC PHÍ */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-emerald-50/50 flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <h3 className="font-bold text-slate-900 text-sm">
                Học Sinh ĐÃ Nộp Học Phí (Tháng {selectedMonth})
              </h3>
            </div>
            <span className="text-xs font-bold bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full border border-emerald-200">
              {data?.paid_students_count || 0} học sinh
            </span>
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-slate-200 text-xs">
            {!data?.paid_list || data.paid_list.length === 0 ? (
              <div className="p-6 text-center text-slate-500">
                Chưa có học sinh nào nộp học phí trong tháng này.
              </div>
            ) : (
              data.paid_list.map((inv) => (
                <div key={inv.id} className="p-3 hover:bg-slate-50 flex justify-between items-center">
                  <div>
                    <p className="font-bold text-slate-900 text-sm">{inv.student?.full_name}</p>
                    <p className="text-slate-500 text-[11px]">
                      Mã HD: <b className="text-cyan-700">{inv.invoice_code}</b> | Nộp lúc: {new Date(inv.paid_at || inv.created_at).toLocaleDateString('vi-VN')} ({inv.payment_method === 'cash' ? 'Tiền mặt' : 'Chuyển khoản'})
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-emerald-700 text-sm">
                      {Number(inv.amount || 0).toLocaleString('vi-VN')} đ
                    </p>
                    <span className="inline-block bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded">
                      Đã hoàn thành
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* MODAL HIỂN THỊ DANH SÁCH HỌC SINH THEO KHỐI LỚP (CÓ BỘ LỌC LOẠI LỚP) */}
      {selectedGradeModal !== null && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex justify-center items-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl p-6 w-full max-w-3xl shadow-2xl relative border border-slate-200 space-y-4 max-h-[85vh] flex flex-col">
            
            {/* TIÊU ĐỀ MODAL */}
            <div className="flex justify-between items-center border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Users className="w-5 h-5 text-cyan-600" />
                  <span>Danh Sách Học Sinh - Khối {selectedGradeModal}</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Hiển thị <b>{filteredGradeStudents.length}</b> / {gradeStudents.length} học sinh
                </p>
              </div>
              <button
                onClick={() => setSelectedGradeModal(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* BỘ LỌC BẤM NHANH LOẠI LỚP */}
            <div className="flex flex-wrap items-center gap-1.5 text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
              <span className="font-bold text-slate-700 mr-1.5 flex items-center gap-1">
                <Filter className="w-3.5 h-3.5 text-cyan-600" /> Lọc Loại Lớp:
              </span>
              {['', 'CLC', 'CC', 'CC1', 'CC2', 'NC', 'NC1', 'NC2', 'NC3'].map((c) => (
                <button
                  key={c}
                  onClick={() => setModalClassFilter(c)}
                  className={`px-3 py-1 rounded-lg font-bold transition-all ${
                    modalClassFilter === c
                      ? 'bg-cyan-700 text-white shadow-sm ring-2 ring-cyan-500/20'
                      : 'bg-white text-slate-600 hover:bg-slate-200/80 border border-slate-200'
                  }`}
                >
                  {c === '' ? 'Tất cả' : `Lớp ${c}`}
                </button>
              ))}
            </div>

            {/* BẢNG DANH SÁCH HỌC SINH IN MODAL */}
            <div className="overflow-y-auto flex-1 border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs border-collapse">
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
                      <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3 font-bold font-mono text-cyan-800">{s.student_code}</td>
                        <td className="p-3 font-bold text-slate-900">{s.full_name}</td>
                        <td className="p-3">
                          <span className="bg-cyan-50 text-cyan-800 font-bold px-2 py-0.5 rounded border border-cyan-200">
                            {s.class_type || 'CLC'}
                          </span>
                        </td>
                        <td className="p-3 font-medium text-slate-800">{s.parent_name}</td>
                        <td className="p-3 font-mono text-slate-600">{s.parent_phone}</td>
                        <td className="p-3 text-right font-extrabold text-slate-900">
                          {Number(s.price_per_session || 130000).toLocaleString('vi-VN')} đ
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="text-right pt-2 border-t border-slate-100">
              <button
                onClick={() => setSelectedGradeModal(null)}
                className="bg-slate-100 text-slate-700 px-4 py-2 rounded-xl text-xs font-bold hover:bg-slate-200 transition-colors"
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