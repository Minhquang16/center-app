import React, { useState, useEffect, useRef } from 'react';
import api from '../api/axios';
import { toast } from 'sonner';
import Swal from 'sweetalert2';
import { 
  QrCode, CheckCircle2, AlertCircle, Clock, Trash2, Search, 
  Volume2, VolumeX, Sparkles, UserCheck, RefreshCw, Radio 
} from 'lucide-react';

export default function AttendancePage() {
  const [studentCode, setStudentCode] = useState('');
  const [lastCheckin, setLastCheckin] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [todayLogs, setTodayLogs] = useState([]);
  const [logSearch, setLogSearch] = useState('');
  const [enableSound, setEnableSound] = useState(true);

  // Thêm dropdown Class và Shift
  const isWeekend = new Date().getDay() === 0 || new Date().getDay() === 6;
  const initialShift = isWeekend ? 'Ca 1 (08:00 - 09:30)' : 'Ca 1 (17:30 - 19:00)';

  const [classesList, setClassesList] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedShift, setSelectedShift] = useState(initialShift);

  // Đồng hồ thời gian thực
  const [currentTime, setCurrentTime] = useState(new Date());

  const inputRef = useRef(null);

  // Cập nhật đồng hồ mỗi giây
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Tải nhật ký điểm danh hôm nay
  const fetchTodayLogs = async () => {
    try {
      const res = await api.get('/attendance/today');
      setTodayLogs(res.data || []);
    } catch (err) {
      console.error("Lỗi lấy nhật ký điểm danh:", err);
    }
  };

  const fetchClasses = async () => {
    try {
      const res = await api.get('/classes');
      setClassesList(res.data || []);
      if (res.data?.length > 0) {
        setSelectedClass(res.data[0].id);
      }
    } catch (err) {
      console.error("Lỗi tải danh sách lớp:", err);
    }
  }

  useEffect(() => {
    fetchTodayLogs();
    fetchClasses();
    keepInputFocused();

    // Cập nhật nhật ký điểm danh theo thời gian thực (Polling 10s/lần)
    const interval = setInterval(() => {
      fetchTodayLogs();
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  // Giữ ô nhập mã luôn được Focus để máy quét QR hoạt động tự động
  const keepInputFocused = () => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  // Giọng nói thông báo thành công (Web Speech API)
  const speakGreeting = (name) => {
    if (!enableSound || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const msg = new SpeechSynthesisUtterance(`Xin chào ${name}`);
      msg.lang = 'vi-VN';
      msg.rate = 1.0;
      window.speechSynthesis.speak(msg);
    } catch (e) {
      console.error("Lỗi âm thanh:", e);
    }
  };

  // Xử lý điểm danh
  const handleCheckin = async (e) => {
    e.preventDefault();
    const code = studentCode.trim();
    if (!code) return;

    if (!selectedClass) {
      toast.error('Vui lòng chọn Lớp học trước khi điểm danh!');
      return;
    }

    setErrorMsg('');
    try {
      const res = await api.post('/attendance/check-in', { 
        student_code: code,
        class_id: selectedClass,
        shift: selectedShift
      });
      const data = res.data;
      setLastCheckin(data);
      setStudentCode('');
      
      if (data.student?.full_name) {
        speakGreeting(data.student.full_name);
        toast.success(`Đã điểm danh cho ${data.student.full_name}`);
      }

      fetchTodayLogs();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Không tìm thấy thông tin học sinh!');
      toast.error(err.response?.data?.message || 'Không tìm thấy thông tin học sinh!');
      setLastCheckin(null);
      setStudentCode('');
    } finally {
      keepInputFocused();
    }
  };

  // Xóa lượt điểm danh
  const handleDeleteLog = async (id, name) => {
    const result = await Swal.fire({
      title: 'Xác nhận xóa?',
      text: `Bạn có chắc chắn muốn xóa lượt điểm danh của ${name}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#0d9488',
      cancelButtonColor: '#ef4444',
      confirmButtonText: 'Xóa',
      cancelButtonText: 'Hủy'
    });

    if (!result.isConfirmed) return;
    
    try {
      await api.delete(`/attendance/${id}`);
      toast.success('Đã xóa lượt điểm danh!');
      fetchTodayLogs();
      keepInputFocused();
    } catch (err) {
      toast.error('Lỗi xóa lượt điểm danh');
    }
  };

  // Lọc nhật ký điểm danh hôm nay
  const filteredLogs = todayLogs.filter((log) => {
    const term = logSearch.toLowerCase();
    const name = log.student?.full_name?.toLowerCase() || '';
    const code = log.student?.student_code?.toLowerCase() || '';
    return name.includes(term) || code.includes(term);
  });

  return (
    <div className="space-y-6 text-slate-800 dark:text-slate-200 dark:text-slate-200 pb-12" onClick={keepInputFocused}>
      {/* 1. THANH TIÊU ĐỀ & ĐỒNG HỒ THỜI GIAN THỰC */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm dark:shadow-none dark:shadow-none border border-slate-200 dark:border-slate-700 dark:border-slate-700 flex flex-wrap gap-3 items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <QrCode className="w-6 h-6 text-cyan-600" />
            <span>Trạm Điểm Danh Học Sinh (QR Code)</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-400 mt-0.5">
            Quét thẻ học sinh hoặc nhập mã thủ công để ghi nhận sự có mặt
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setEnableSound(!enableSound);
            }}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors border ${
              enableSound 
                ? 'bg-cyan-50 dark:bg-cyan-900/30 dark:bg-cyan-900/30 text-cyan-800 dark:text-cyan-300 dark:text-cyan-300 border-cyan-200' 
                : 'bg-slate-100 dark:bg-slate-700/50 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400 dark:text-slate-400 border-slate-200 dark:border-slate-700 dark:border-slate-700'
            }`}
            title="Bật/Tắt đọc tên học sinh khi quét thành công"
          >
            {enableSound ? <Volume2 className="w-4 h-4 text-cyan-600" /> : <VolumeX className="w-4 h-4" />}
            <span>{enableSound ? 'Âm thanh: BẬT' : 'Âm thanh: TẮT'}</span>
          </button>

          <div className="bg-slate-900 text-white px-3.5 py-1.5 rounded-lg font-mono text-xs font-bold flex items-center space-x-2">
            <Clock className="w-4 h-4 text-cyan-400" />
            <span>
              {currentTime.toLocaleTimeString('vi-VN')} · {currentTime.toLocaleDateString('vi-VN')}
            </span>
          </div>
        </div>
      </div>

      {/* 2. KHU VỰC CHÍNH */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* CỘT TRÁI: KHUNG ĐIỂM DANH */}
        <div className="lg:col-span-1 space-y-6">
          
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm dark:shadow-none dark:shadow-none border border-slate-100 dark:border-slate-700/50 dark:border-slate-700/50 dark:border-slate-700">
            {/* Lựa chọn Lớp và Ca */}
            <div className="mb-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 dark:text-slate-300 dark:text-slate-300 mb-2">Lớp Học</label>
                <select 
                  className="w-full bg-slate-50 dark:bg-slate-900/50 dark:bg-slate-900/50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 dark:border-slate-700 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-cyan-500 dark:focus:ring-cyan-400 dark:focus:ring-cyan-400"
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                >
                  <option value="" disabled>-- Chọn lớp học --</option>
                  {classesList.map(cls => (
                    <option key={cls.id} value={cls.id}>{cls.name} ({cls.class_code})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 dark:text-slate-300 dark:text-slate-300 mb-2">Ca Học</label>
                <select 
                  className="w-full bg-slate-50 dark:bg-slate-900/50 dark:bg-slate-900/50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 dark:border-slate-700 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-cyan-500 dark:focus:ring-cyan-400 dark:focus:ring-cyan-400"
                  value={selectedShift}
                  onChange={(e) => setSelectedShift(e.target.value)}
                >
                  {isWeekend ? (
                    <>
                      <option value="Ca 1 (08:00 - 09:30)">Ca 1 (08:00 - 09:30)</option>
                      <option value="Ca 2 (09:45 - 11:15)">Ca 2 (09:45 - 11:15)</option>
                      <option value="Ca 3 (14:00 - 15:30)">Ca 3 (14:00 - 15:30)</option>
                      <option value="Ca 4 (15:45 - 17:15)">Ca 4 (15:45 - 17:15)</option>
                      <option value="Ca 5 (18:00 - 19:30)">Ca 5 (18:00 - 19:30)</option>
                      <option value="Ca 6 (19:45 - 21:15)">Ca 6 (19:45 - 21:15)</option>
                    </>
                  ) : (
                    <>
                      <option value="Ca 1 (17:30 - 19:00)">Ca 1 (17:30 - 19:00)</option>
                      <option value="Ca 2 (19:00 - 20:30)">Ca 2 (19:00 - 20:30)</option>
                      <option value="Ca 3 (20:30 - 22:00)">Ca 3 (20:30 - 22:00)</option>
                    </>
                  )}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200 dark:text-slate-200 dark:text-white flex items-center">
                <QrCode className="w-5 h-5 mr-2 text-cyan-600 dark:text-cyan-400" />
                Quét Mã QR
              </h2>
              <button 
                onClick={() => setEnableSound(!enableSound)}
                className={`p-2 rounded-xl transition-colors ${enableSound ? 'bg-cyan-100 text-cyan-700 dark:text-cyan-400 dark:text-cyan-400 dark:bg-cyan-900 dark:text-cyan-300' : 'bg-slate-100 dark:bg-slate-700/50 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400 dark:text-slate-400 dark:bg-slate-700'}`}
                title={enableSound ? "Tắt âm thanh" : "Bật âm thanh"}
              >
                {enableSound ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
              </button>
            </div>

            <form onSubmit={handleCheckin} className="space-y-3">
              <div className="relative">
                <input
                  ref={inputRef}
                  type="text"
                  className="w-full border-2 border-cyan-600 rounded-xl p-3.5 text-center text-xl font-bold tracking-widest outline-none focus:ring-4 focus:ring-cyan-100 uppercase transition-all shadow-sm dark:shadow-none dark:shadow-none placeholder:text-slate-300 text-slate-900 dark:text-white"
                  placeholder="QUÉT THẺ HỌC SINH..."
                  value={studentCode}
                  onChange={(e) => setStudentCode(e.target.value)}
                  onBlur={keepInputFocused}
                  autoFocus
                />
              </div>
              <p className="text-[11px] text-slate-400 text-center italic">
                * Đặt con trỏ tại đây và quét thẻ QR bằng máy quét mã vạch
              </p>
            </form>

            {lastCheckin && (
              <div className="p-4 bg-emerald-50 dark:bg-emerald-900/30 dark:bg-emerald-900/30 border border-emerald-200 rounded-xl text-emerald-900 space-y-2 animate-in fade-in zoom-in duration-200">
                <div className="flex items-center space-x-3 border-b border-emerald-200/60 pb-2">
                  <div className="w-10 h-10 bg-emerald-600 text-white rounded-full flex items-center justify-center font-bold text-lg">
                    {lastCheckin.student?.full_name?.charAt(0) || 'H'}
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 dark:text-emerald-400">ĐIỂM DANH THÀNH CÔNG</span>
                    <p className="font-extrabold text-base text-slate-900 dark:text-white">{lastCheckin.student?.full_name}</p>
                  </div>
                </div>

                <div className="text-xs space-y-1 pt-1 text-slate-700 dark:text-slate-300 dark:text-slate-300">
                  <p>• Mã HS: <b className="font-mono text-slate-900 dark:text-white">{lastCheckin.student?.student_code}</b></p>
                  <p>• Khối / Lớp: <b>Khối {lastCheckin.student?.grade} {lastCheckin.student?.class_type && `(${lastCheckin.student.class_type})`}</b></p>
                  <p>• SĐT Bố/Mẹ: <b className="font-mono">{lastCheckin.student?.parent_phone}</b></p>
                  <p>• Thời gian vào lớp: <b className="text-emerald-700 dark:text-emerald-400 dark:text-emerald-400 font-mono">{lastCheckin.time}</b></p>
                </div>
              </div>
            )}

            {errorMsg && (
              <div className="p-4 bg-rose-50 dark:bg-rose-900/30 dark:bg-rose-900/30 border border-rose-200 rounded-xl text-rose-800 dark:text-rose-300 dark:text-rose-300 flex items-start space-x-3 animate-in fade-in duration-200">
                <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-rose-900">LỖI ĐIỂM DANH</p>
                  <p className="text-xs mt-0.5">{errorMsg}</p>
                </div>
              </div>
            )}
          </div>

          <div className="bg-slate-50 dark:bg-slate-900/50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-400 dark:text-slate-400 space-y-1.5">
            <p className="font-bold text-slate-800 dark:text-slate-200 dark:text-slate-200 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-cyan-600" />
              <span>Hướng dẫn điểm danh:</span>
            </p>
            <p>1. Cắm máy quét QR vào cổng USB máy tính.</p>
            <p>2. Đặt con trỏ vào ô màu xanh phía trên.</p>
            <p>3. Đưa mã QR trên thẻ học sinh trước mắt quét.</p>
          </div>
        </div>

        {/* CỘT PHẢI: NHẬT KÝ ĐIỂM DANH HÔM NAY */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm dark:shadow-none dark:shadow-none overflow-hidden border border-slate-200 dark:border-slate-700 dark:border-slate-700">
            {/* Thanh tiêu đề nhật ký & Ô TÌM KIẾM ĐÃ SỬA CĂN CHỈNH */}
            <div className="p-4 bg-slate-900 text-white flex flex-wrap gap-3 items-center justify-between">
              <div className="flex items-center space-x-2">
                <UserCheck className="w-5 h-5 text-cyan-400" />
                <h3 className="font-bold text-sm">Nhật Ký Điểm Danh Hôm Nay</h3>
                <span className="bg-cyan-700 text-white text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-cyan-600">
                  {todayLogs.length} Lượt
                </span>
              </div>

              {/* Ô TÌM KIẾM ĐƯỢC TỐI ƯU GIAO DIỆN */}
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Tìm Tên hoặc Mã HS..."
                  className="w-full pl-9 pr-3 py-2 bg-slate-800/90 border border-slate-700/80 rounded-xl text-xs text-slate-100 placeholder:text-slate-400 outline-none focus:border-cyan-500 dark:focus:border-cyan-400 dark:focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500 dark:focus:ring-cyan-400 dark:focus:ring-cyan-400/20 transition-all shadow-inner"
                  value={logSearch}
                  onChange={(e) => setLogSearch(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            </div>

            {/* DẠNG THẺ MOBILE */}
            <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-700/50">
              {filteredLogs.length === 0 ? (
                <div className="p-8 text-center text-slate-400 italic text-sm">
                  {logSearch ? 'Không tìm thấy lượt điểm danh phù hợp.' : 'Chưa có lượt điểm danh nào hôm nay.'}
                </div>
              ) : (
                filteredLogs.map((log, index) => (
                  <div key={log.id} className="p-4 bg-slate-50 dark:bg-slate-900/30 hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-slate-900 dark:text-white">{log.student?.full_name}</h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">{log.student?.student_code}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] font-bold text-slate-400">#{filteredLogs.length - index}</span>
                        <div className="mt-1">
                          <span className="font-semibold text-xs text-slate-700 dark:text-slate-300">Khối {log.student?.grade}</span>
                          {log.student?.class_type && (
                            <span className="ml-1.5 bg-slate-200 dark:bg-slate-700/50 text-slate-600 dark:text-slate-400 px-1.5 py-0.5 rounded text-[10px] border border-slate-300 dark:border-slate-600">
                              {log.student.class_type}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-mono text-slate-600 dark:text-slate-400">PH: {log.student?.parent_phone}</span>
                      <span className="text-cyan-800 dark:text-cyan-300 font-bold font-mono bg-cyan-100 dark:bg-cyan-900/30 px-2 py-0.5 rounded">
                        {new Date(log.checked_at).toLocaleTimeString('vi-VN')}
                      </span>
                    </div>

                    <div className="flex justify-end pt-2 border-t border-slate-200 dark:border-slate-700 mt-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteLog(log.id, log.student?.full_name);
                        }}
                        className="text-xs flex items-center gap-1 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30 px-2 py-1.5 rounded-md font-bold transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Xóa lượt
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* BẢNG DỮ LIỆU NHẬT KÝ DESKTOP */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[600px]">
                <thead className="bg-slate-100 dark:bg-slate-700/50 dark:bg-slate-700/50 text-slate-600 dark:text-slate-400 dark:text-slate-400 text-xs uppercase font-semibold border-b border-slate-200 dark:border-slate-700 dark:border-slate-700">
                  <tr>
                    <th className="p-3 whitespace-nowrap">STT</th>
                    <th className="p-3 whitespace-nowrap">Mã HS</th>
                    <th className="p-3 whitespace-nowrap">Họ và Tên</th>
                    <th className="p-3 whitespace-nowrap">Khối / Lớp</th>
                    <th className="p-3 whitespace-nowrap">SĐT Bố/Mẹ</th>
                    <th className="p-3 whitespace-nowrap">Thời Gian Vào</th>
                    <th className="p-3 text-center whitespace-nowrap">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-xs">
                  {filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="p-8 text-center text-slate-400 italic">
                        {logSearch ? 'Không tìm thấy lượt điểm danh phù hợp.' : 'Chưa có lượt điểm danh nào hôm nay.'}
                      </td>
                    </tr>
                  ) : (
                    filteredLogs.map((log, index) => (
                      <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 dark:bg-slate-900/50 dark:hover:bg-slate-700/50 dark:bg-slate-900/50 transition-colors">
                        <td className="p-3 text-slate-400 font-semibold">{filteredLogs.length - index}</td>
                        <td className="p-3 font-bold text-slate-700 dark:text-slate-300 dark:text-slate-300 whitespace-nowrap">{log.student?.student_code}</td>
                        <td className="p-3 font-bold text-slate-900 dark:text-white whitespace-nowrap">{log.student?.full_name}</td>
                        <td className="p-3 whitespace-nowrap">
                          <span className="font-semibold">Khối {log.student?.grade}</span>
                          {log.student?.class_type && (
                            <span className="ml-1 bg-slate-100 dark:bg-slate-700/50 dark:bg-slate-700/50 text-slate-600 dark:text-slate-400 dark:text-slate-400 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 dark:border-slate-700">
                              {log.student.class_type}
                            </span>
                          )}
                        </td>
                        <td className="p-3 font-mono text-slate-600 dark:text-slate-400 dark:text-slate-400 whitespace-nowrap">{log.student?.parent_phone}</td>
                        <td className="p-3 text-cyan-800 dark:text-cyan-300 dark:text-cyan-300 font-bold font-mono whitespace-nowrap">
                          {new Date(log.checked_at).toLocaleTimeString('vi-VN')}
                        </td>
                        <td className="p-3 text-center whitespace-nowrap">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteLog(log.id, log.student?.full_name);
                            }}
                            className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 dark:bg-rose-900/30 dark:bg-rose-900/30 border border-transparent hover:border-rose-200 transition-colors"
                            title="Xóa lượt điểm danh này"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}