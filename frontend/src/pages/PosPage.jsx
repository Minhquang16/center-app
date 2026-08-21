import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../api/axios';
import { toast } from 'sonner';
import { 
  CreditCard, Printer, Search, CheckCircle2, QrCode, 
  CalendarCheck, X, RefreshCw, DollarSign, Receipt, Users, AlertTriangle, ShieldCheck 
} from 'lucide-react';

export default function PosPage() {
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  const [searchParams] = useSearchParams();
  const preselectedStudentId = searchParams.get('studentId');

  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  const [tuitionSummary, setTuitionSummary] = useState(null);
  const [title, setTitle] = useState(`Học phí Tháng ${currentMonth}/${currentYear}`);
  const [amount, setAmount] = useState('0');
  const [paymentMethod, setPaymentMethod] = useState('transfer');

  const [recentInvoice, setRecentInvoice] = useState(null);
  const [qrUrl, setQrUrl] = useState('');
  const [invoicesHistory, setInvoicesHistory] = useState([]);
  const [loadingSummary, setLoadingSummary] = useState(false);

  const fetchData = async () => {
    try {
      const res = await api.get('/students');
      const studentList = Array.isArray(res.data) ? res.data : (res.data?.data || []);
      setStudents(studentList);
    } catch (err) {
      console.error("Lỗi lấy danh sách học sinh:", err);
    }

    try {
      const resInvoices = await api.get('/invoices');
      setInvoicesHistory(resInvoices.data || []);
    } catch (err) {
      console.error("Lỗi lấy lịch sử hóa đơn:", err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (students.length > 0 && preselectedStudentId && !selectedStudent) {
      const s = students.find(x => String(x.id) === preselectedStudentId);
      if (s) {
        setSelectedStudent(s);
      }
    }
  }, [students, preselectedStudentId, selectedStudent]);

  useEffect(() => {
    if (selectedStudent) {
      setLoadingSummary(true);
      api.get(`/students/${selectedStudent.id}/billing-info`, {
        params: { month: currentMonth, year: currentYear }
      })
        .then((res) => {
          setTuitionSummary(res.data);
          setAmount(String(res.data.final_amount || 0));
        })
        .catch((err) => console.error("Lỗi tính học phí:", err))
        .finally(() => setLoadingSummary(false));
    } else {
      setTuitionSummary(null);
      setAmount('0');
    }
  }, [selectedStudent]);

  // KIỂM TRA HỌC SINH ĐÃ NỘP HỌC PHÍ THÁNG NÀY CHƯA (MỖI HỌC SINH CHỈ THU 1 LẦN)
  const existingInvoice = selectedStudent ? invoicesHistory.find((inv) => {
    if (inv.student_id !== selectedStudent.id) return false;
    if (inv.approval_status === 'rejected') return false; // Không tính hóa đơn đã bị từ chối
    const invDate = new Date(inv.paid_at || inv.created_at);
    return (invDate.getMonth() + 1) === currentMonth && invDate.getFullYear() === currentYear;
  }) : null;

  const isAlreadyPaid = Boolean(existingInvoice);

  // TÍNH TOÁN THỐNG KÊ DOANH THU THEO NGÀY TRONG THÁNG
  const monthlySummary = { cash: 0, transfer: 0, total: 0 };
  
  const dailySummary = invoicesHistory.reduce((acc, inv) => {
    if (inv.approval_status === 'rejected') return acc;
    const date = new Date(inv.paid_at || inv.created_at);
    if (date.getMonth() + 1 !== currentMonth || date.getFullYear() !== currentYear) return acc;

    const dateKey = date.toLocaleDateString('vi-VN'); 

    if (!acc[dateKey]) {
      acc[dateKey] = { cash: 0, transfer: 0, total: 0 };
    }
    
    const amt = Number(inv.amount) || 0;
    if (inv.payment_method === 'cash') {
      acc[dateKey].cash += amt;
      monthlySummary.cash += amt;
    } else {
      acc[dateKey].transfer += amt;
      monthlySummary.transfer += amt;
    }
    acc[dateKey].total += amt;
    monthlySummary.total += amt;
    
    return acc;
  }, {});

  const sortedDailySummary = Object.entries(dailySummary).sort((a, b) => {
    const [d1, m1, y1] = a[0].split('/');
    const [d2, m2, y2] = b[0].split('/');
    return new Date(`${y2}-${m2}-${d2}`) - new Date(`${y1}-${m1}-${d1}`);
  });

  const cleanQuery = searchQuery.trim().toLowerCase();
  const filteredStudents = students.filter((s) => {
    if (!cleanQuery) return true;
    const name = s.full_name ? s.full_name.toLowerCase() : '';
    const code = s.student_code ? s.student_code.toLowerCase() : '';
    return name.includes(cleanQuery) || code.includes(cleanQuery);
  });

  const handleCreateInvoice = async (e) => {
    e.preventDefault();
    if (!selectedStudent) return toast.warning('Vui lòng chọn học sinh cần thu tiền!');
    if (isAlreadyPaid) return toast.warning(`Học sinh ${selectedStudent.full_name} đã nộp học phí tháng này rồi!`);
    if (!amount || Number(amount) <= 0) return toast.warning('Số tiền thu phải lớn hơn 0 đ!');

    try {
      const res = await api.post('/invoices', {
        student_id: selectedStudent.id,
        title,
        amount: Number(amount),
        payment_method: paymentMethod,
      });

      setRecentInvoice(res.data.invoice);
      setQrUrl(res.data.qr_url || '');
      toast.success('Đã tạo hóa đơn thành công!');
      fetchData();
    } catch (err) {
      toast.error('Lỗi tạo hóa đơn: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleUndoInvoice = async (id) => {
    if (!window.confirm('Bạn có chắc chắn muốn XÓA (Hoàn tác) hóa đơn này? Mọi dữ liệu liên quan sẽ bị xóa!')) return;
    try {
      await api.delete(`/invoices/${id}`);
      toast.success('Đã hoàn tác (xóa) hóa đơn!');
      fetchData();
    } catch (err) {
      toast.error('Lỗi hoàn tác: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleApproveInvoice = async (id) => {
    try {
      await api.put(`/invoices/${id}/approve`);
      toast.success('Đã duyệt hóa đơn!');
      fetchData();
    } catch (err) {
      toast.error('Lỗi duyệt hóa đơn: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleRejectInvoice = async (id) => {
    if (!window.confirm('Bạn có chắc chắn muốn Từ chối hóa đơn này không?')) return;
    try {
      await api.put(`/invoices/${id}/reject`);
      toast.success('Đã từ chối hóa đơn!');
      fetchData();
    } catch (err) {
      toast.error('Lỗi từ chối hóa đơn: ' + (err.response?.data?.message || err.message));
    }
  };

  return (
    <div className="space-y-6 text-slate-800 dark:text-slate-200 dark:text-slate-200 pb-12">
      {/* NHÚNG THẲNG STYLE IN K80 CHUYÊN NGHIỆP */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #print-invoice, #print-invoice * {
            visibility: visible !important;
          }
          #print-invoice {
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            width: 80mm !important;
            margin: 0 !important;
            padding: 10px !important;
            border: none !important;
            background: #ffffff !important;
            box-shadow: none !important;
          }
        }
      `}</style>

      {/* THANH TIÊU ĐỀ TRANG */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm dark:shadow-none dark:shadow-none border border-slate-200 dark:border-slate-700 dark:border-slate-700 flex justify-between items-center print:hidden">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-cyan-600" />
            <span>Thu Tiền Học Phí POS (K80 / VietQR)</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-400 mt-0.5">
            Tự động tính học phí theo số buổi đi học thực tế và tạo mã QR thanh toán
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-xs font-bold text-slate-600 dark:text-slate-400 dark:text-slate-400 bg-slate-100 dark:bg-slate-700/50 dark:bg-slate-700/50 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 dark:border-slate-700 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-cyan-600" />
            <span>Tổng: {students.length} học sinh</span>
          </span>
          <button
            onClick={fetchData}
            className="p-2 rounded-lg bg-slate-100 dark:bg-slate-700/50 dark:bg-slate-700/50 text-slate-600 dark:text-slate-400 dark:text-slate-400 hover:bg-slate-200 border border-slate-200 dark:border-slate-700 dark:border-slate-700 transition-colors"
            title="Tải lại dữ liệu"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* CỘT TRÁI: FORM THU TIỀN */}
        <div className="lg:col-span-2 space-y-6 print:hidden">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm dark:shadow-none dark:shadow-none border border-slate-200 dark:border-slate-700 dark:border-slate-700 space-y-5">
            <h2 className="text-base font-bold text-slate-800 dark:text-slate-200 dark:text-slate-200 border-b border-slate-100 dark:border-slate-700/50 dark:border-slate-700/50 pb-3 flex items-center space-x-2">
              <Receipt className="w-5 h-5 text-cyan-600" />
              <span>1. Chọn Học Sinh & Nhập Thông Tin Thu</span>
            </h2>

            <div className="relative z-20" ref={dropdownRef}>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Nhập Mã HS hoặc Tên học sinh..."
                  className="w-full pl-9 pr-8 py-2.5 border border-slate-300 dark:border-slate-600 rounded-xl outline-none focus:ring-2 focus:ring-cyan-500 dark:focus:ring-cyan-400 text-sm font-semibold text-slate-800 dark:text-slate-200 placeholder:text-slate-400"
                  value={searchQuery}
                  onFocus={() => setShowDropdown(true)}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setShowDropdown(true);
                  }}
                />
                {searchQuery && (
                  <button 
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:text-slate-400"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {showDropdown && (
                <div className="absolute top-full left-0 right-0 mt-2 z-30 max-h-56 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl dark:shadow-none divide-y divide-slate-100 text-xs bg-white dark:bg-slate-800">
                {filteredStudents.length === 0 ? (
                  <div className="p-4 text-center text-slate-400 italic">
                    {students.length === 0 ? 'Đang tải dữ liệu học sinh...' : `Không tìm thấy học sinh phù hợp.`}
                  </div>
                ) : (
                  filteredStudents.map((s) => (
                    <div
                      key={s.id}
                      onClick={() => {
                        setSelectedStudent(s);
                        setSearchQuery('');
                        setShowDropdown(false);
                      }}
                      className="p-3 hover:bg-cyan-50 dark:hover:bg-cyan-900/30 dark:bg-cyan-900/30 dark:hover:bg-cyan-900/30 dark:bg-cyan-900/30 cursor-pointer flex justify-between items-center transition-colors"
                    >
                      <div>
                        <p className="font-bold text-slate-900 dark:text-white text-sm">{s.full_name}</p>
                        <p className="text-slate-500 dark:text-slate-400 dark:text-slate-400 mt-0.5">
                          Mã: <b className="font-mono text-cyan-700 dark:text-cyan-400 dark:text-cyan-400">{s.student_code}</b> | Khối <b>{s.grade}</b> {s.class_type && `(${s.class_type})`}
                        </p>
                      </div>
                      <span className="bg-cyan-600 text-white px-2.5 py-1 rounded-lg text-[11px] font-bold">
                        Chọn thu
                      </span>
                    </div>
                  ))
                )}
                </div>
              )}
            </div>

            {/* THÔNG TIN HỌC SINH ĐƯỢC CHỌN & TRẠNG THÁI XÁC NHẬN ĐÃ NỘP / CHƯA NỘP */}
            {selectedStudent && (
              <div className="p-4 bg-slate-50 dark:bg-slate-900/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 dark:border-slate-700 rounded-xl space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">HỌC SINH ĐƯỢC CHỌN</span>
                    <p className="font-extrabold text-lg text-slate-900 dark:text-white">{selectedStudent.full_name}</p>
                    <p className="text-xs text-slate-600 dark:text-slate-400 dark:text-slate-400 mt-0.5">
                      Mã: <b className="font-mono text-slate-800 dark:text-slate-200 dark:text-slate-200">{selectedStudent.student_code}</b> | Khối <b>{selectedStudent.grade}</b> {selectedStudent.class_type && `(${selectedStudent.class_type})`} | PH: <b>{selectedStudent.parent_name}</b> ({selectedStudent.parent_phone})
                    </p>
                  </div>
                  <button 
                    onClick={() => {
                      setSelectedStudent(null);
                      setShowDropdown(true);
                    }} 
                    className="text-xs text-rose-600 font-bold hover:underline bg-rose-50 dark:bg-rose-900/30 dark:bg-rose-900/30 border border-rose-200 px-2.5 py-1 rounded-lg"
                  >
                    Đổi HS khác
                  </button>
                </div>

                {/* XÁC NHẬN NẾU HỌC SINH ĐÃ NỘP HỌC PHÍ THÁNG NÀY */}
                {isAlreadyPaid ? (
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-900/30 dark:bg-emerald-900/30 border border-emerald-300 rounded-xl flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-2 text-emerald-900">
                      <ShieldCheck className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                      <div>
                        <p className="font-bold text-emerald-800 dark:text-emerald-300 dark:text-emerald-300">XÁC NHẬN: ĐÃ NỘP HỌC PHÍ THÁNG {currentMonth}/{currentYear}</p>
                        <p className="text-[11px] text-emerald-700 dark:text-emerald-400 dark:text-emerald-400 mt-0.5">
                          Mã HĐ: <b className="font-mono">{existingInvoice.invoice_code}</b> | Đã thu: <b className="text-emerald-900">{Number(existingInvoice.amount).toLocaleString('vi-VN')} đ</b> lúc {new Date(existingInvoice.paid_at || existingInvoice.created_at).toLocaleDateString('vi-VN')}
                        </p>
                      </div>
                    </div>
                    <span className="bg-emerald-600 text-white font-bold text-[10px] px-2.5 py-1 rounded-md uppercase whitespace-nowrap">
                      Đã khóa thu
                    </span>
                  </div>
                ) : (
                  loadingSummary ? (
                    <div className="text-xs text-slate-400 italic p-2">Đang tính số buổi học và công nợ...</div>
                  ) : tuitionSummary && (
                    <div className={`p-4 rounded-xl border flex flex-col space-y-3 text-xs shadow-sm dark:shadow-none dark:shadow-none ${
                      tuitionSummary.has_debt 
                        ? 'bg-red-50 border-red-500 text-red-900' 
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 dark:border-slate-700 text-slate-700 dark:text-slate-300 dark:text-slate-300'
                    }`}>
                      <div className="flex items-start space-x-3">
                        <CalendarCheck className={`w-5 h-5 flex-shrink-0 ${tuitionSummary.has_debt ? 'text-red-600' : 'text-cyan-600'}`} />
                        <div className="flex-1 space-y-1">
                          <p className={`font-semibold ${tuitionSummary.has_debt ? 'text-red-800' : 'text-slate-800 dark:text-slate-200 dark:text-slate-200'}`}>
                            Tháng {tuitionSummary.current_month}/{tuitionSummary.current_year}: Tham gia <b className="text-lg">{tuitionSummary.attended_sessions}</b> buổi học
                          </p>
                          <p className={`text-[11px] ${tuitionSummary.has_debt ? 'text-red-700' : 'text-slate-500 dark:text-slate-400 dark:text-slate-400'}`}>
                            Đơn giá: <b>{Number(tuitionSummary.price_per_session || 130000).toLocaleString('vi-VN')} đ/buổi</b> 
                            <span className="mx-2">→</span> 
                            Tiền tháng này: <b>{Number(tuitionSummary.current_fee || 0).toLocaleString('vi-VN')} đ</b>
                          </p>
                          
                          {tuitionSummary.has_debt && (
                            <div className="mt-2 bg-red-100 p-2 rounded-lg border border-red-200">
                              <div className="flex items-center space-x-1.5 mb-1 font-bold text-red-700">
                                <AlertTriangle className="w-4 h-4" />
                                <span>⚠️ Học sinh đang nợ học phí kỳ trước. Đã cộng dồn vào tổng tiền kỳ này.</span>
                              </div>
                              <p className="text-[11px] text-red-600 pl-5">Nợ cũ cần thu: <b>{Number(tuitionSummary.previous_debt).toLocaleString('vi-VN')} đ</b></p>
                            </div>
                          )}
                          
                          <p className="text-sm pt-2 border-t border-dashed border-slate-300 dark:border-slate-600 dark:border-slate-600 mt-2">
                            Tổng thanh toán: <b className="text-lg text-emerald-700 dark:text-emerald-400 dark:text-emerald-400">{Number(tuitionSummary.final_amount || 0).toLocaleString('vi-VN')} đ</b>
                          </p>
                        </div>
                      </div>
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => setAmount(String(tuitionSummary.final_amount))}
                          className={`text-[11px] font-bold px-3 py-1.5 rounded-lg transition-colors ${
                            tuitionSummary.has_debt 
                              ? 'bg-red-600 text-white hover:bg-red-700 shadow-sm dark:shadow-none dark:shadow-none' 
                              : 'bg-cyan-50 dark:bg-cyan-900/30 dark:bg-cyan-900/30 text-cyan-800 dark:text-cyan-300 dark:text-cyan-300 border border-cyan-200 hover:bg-cyan-100'
                          }`}
                        >
                          Dùng số tiền này
                        </button>
                      </div>
                    </div>
                  )
                )}
              </div>
            )}

            <form onSubmit={handleCreateInvoice} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 dark:text-slate-300 mb-1">Nội dung thu *</label>
                  <input
                    type="text"
                    required
                    disabled={isAlreadyPaid}
                    className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2.5 text-xs font-semibold outline-none focus:ring-2 focus:ring-cyan-500 dark:focus:ring-cyan-400 bg-white dark:bg-slate-800 text-slate-900 dark:text-white disabled:bg-slate-100 disabled:text-slate-500 dark:disabled:bg-slate-700/50 dark:disabled:text-slate-400"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 dark:text-slate-300 mb-1">Số tiền thu (VNĐ) *</label>
                  <input
                    type="number"
                    required
                    disabled={isAlreadyPaid}
                    step="1000"
                    className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2 text-lg font-black bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-cyan-500 dark:focus:ring-cyan-400 outline-none disabled:bg-slate-100 disabled:text-slate-500 dark:disabled:bg-slate-700/50 dark:disabled:text-slate-400"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                  
                  {!isAlreadyPaid && (
                    <div className="flex gap-1.5 mt-1.5 text-[11px]">
                      <button
                        type="button"
                        onClick={() => setAmount(String((Number(amount) || 0) + 100000))}
                        className="bg-slate-100 dark:bg-slate-700/50 dark:bg-slate-700/50 hover:bg-slate-200 text-slate-700 dark:text-slate-300 dark:text-slate-300 px-2 py-0.5 rounded font-semibold border"
                      >
                        +100k
                      </button>
                      <button
                        type="button"
                        onClick={() => setAmount(String((Number(amount) || 0) + 500000))}
                        className="bg-slate-100 dark:bg-slate-700/50 dark:bg-slate-700/50 hover:bg-slate-200 text-slate-700 dark:text-slate-300 dark:text-slate-300 px-2 py-0.5 rounded font-semibold border"
                      >
                        +500k
                      </button>
                      {tuitionSummary && (
                        <button
                          type="button"
                          onClick={() => setAmount(String(tuitionSummary.final_amount))}
                          className="bg-cyan-50 dark:bg-cyan-900/30 dark:bg-cyan-900/30 hover:bg-cyan-100 text-cyan-800 dark:text-cyan-300 dark:text-cyan-300 px-2 py-0.5 rounded font-semibold border border-cyan-200"
                        >
                          Chuẩn HP
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 dark:text-slate-300 mb-1.5">Hình thức thanh toán</label>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('transfer')}
                    className={`p-3 rounded-xl border font-bold flex justify-center items-center space-x-2 transition-all ${
                      paymentMethod === 'transfer' 
                        ? 'border-cyan-600 bg-cyan-50 dark:bg-cyan-900/30 dark:bg-cyan-900/30 text-cyan-800 dark:text-cyan-300 dark:text-cyan-300 ring-2 ring-cyan-500/20 shadow-sm dark:shadow-none dark:shadow-none' 
                        : 'border-slate-200 dark:border-slate-700 dark:border-slate-700 text-slate-600 dark:text-slate-400 dark:text-slate-400 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/50 dark:bg-slate-900/50 dark:hover:bg-slate-700/50 dark:bg-slate-900/50'
                    }`}
                  >
                    <QrCode className="w-4 h-4 text-cyan-600" /> 
                    <span>Chuyển khoản VietQR</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('cash')}
                    className={`p-3 rounded-xl border font-bold flex justify-center items-center space-x-2 transition-all ${
                      paymentMethod === 'cash' 
                        ? 'border-cyan-600 bg-cyan-50 dark:bg-cyan-900/30 dark:bg-cyan-900/30 text-cyan-800 dark:text-cyan-300 dark:text-cyan-300 ring-2 ring-cyan-500/20 shadow-sm dark:shadow-none dark:shadow-none' 
                        : 'border-slate-200 dark:border-slate-700 dark:border-slate-700 text-slate-600 dark:text-slate-400 dark:text-slate-400 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/50 dark:bg-slate-900/50 dark:hover:bg-slate-700/50 dark:bg-slate-900/50'
                    }`}
                  >
                    <DollarSign className="w-4 h-4 text-emerald-600" /> 
                    <span>Tiền mặt (Cash)</span>
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={!selectedStudent || isAlreadyPaid}
                className="w-full bg-cyan-700 text-white py-3 rounded-xl hover:bg-cyan-800 font-bold text-sm disabled:bg-slate-200 disabled:text-slate-400 dark:disabled:bg-slate-800 dark:disabled:text-slate-500 transition-colors shadow-sm dark:shadow-none cursor-pointer"
              >
                {isAlreadyPaid ? `Học Sinh Đã Nộp Học Phí Tháng ${currentMonth}` : "Tạo Hóa Đơn & Xuất Mã VietQR / Phiếu Thu"}
              </button>
            </form>
          </div>

          {/* THỐNG KÊ DOANH THU THEO NGÀY VÀ THÁNG */}
          {sortedDailySummary.length > 0 && (
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-4 space-y-4">
              <h3 className="font-bold text-slate-800 dark:text-slate-200 text-xs uppercase tracking-wider flex items-center gap-2">
                <CalendarCheck className="w-4 h-4 text-cyan-600" />
                Thống Kê Thu Tiền (Tháng {currentMonth}/{currentYear})
              </h3>
              
              {/* TỔNG THÁNG */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                 <div className="p-2 sm:p-3 bg-cyan-50 dark:bg-cyan-900/30 rounded-xl border border-cyan-100 dark:border-cyan-800 text-center flex flex-col justify-center">
                    <p className="text-[10px] sm:text-[11px] text-cyan-700 dark:text-cyan-400 font-bold uppercase mb-1">Chuyển khoản</p>
                    <p className="text-sm sm:text-base font-black text-cyan-800 dark:text-cyan-300">{monthlySummary.transfer.toLocaleString('vi-VN')} đ</p>
                 </div>
                 <div className="p-2 sm:p-3 bg-emerald-50 dark:bg-emerald-900/30 rounded-xl border border-emerald-100 dark:border-emerald-800 text-center flex flex-col justify-center">
                    <p className="text-[10px] sm:text-[11px] text-emerald-700 dark:text-emerald-400 font-bold uppercase mb-1">Tiền mặt</p>
                    <p className="text-sm sm:text-base font-black text-emerald-800 dark:text-emerald-300">{monthlySummary.cash.toLocaleString('vi-VN')} đ</p>
                 </div>
                 <div className="p-2 sm:p-3 bg-slate-100 dark:bg-slate-700/50 rounded-xl border border-slate-200 dark:border-slate-600 text-center col-span-2 sm:col-span-1 flex flex-col justify-center">
                    <p className="text-[10px] sm:text-[11px] text-slate-700 dark:text-slate-400 font-bold uppercase mb-1">Tổng (Cả tháng)</p>
                    <p className="text-sm sm:text-base font-black text-slate-900 dark:text-white">{monthlySummary.total.toLocaleString('vi-VN')} đ</p>
                 </div>
              </div>

              {/* CHI TIẾT NGÀY */}
              <div className="pt-2">
                <p className="text-[11px] font-bold text-slate-500 mb-2 uppercase border-t border-slate-100 dark:border-slate-700 pt-3">Chi tiết theo ngày</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-h-48 overflow-y-auto pr-1">
                  {sortedDailySummary.map(([dateKey, stats]) => (
                    <div key={dateKey} className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                      <p className="font-extrabold text-slate-900 dark:text-white text-sm border-b border-slate-200 dark:border-slate-700 pb-1.5">{dateKey}</p>
                      <div className="text-[11px] space-y-1.5">
                        <div className="flex justify-between items-center text-cyan-700 dark:text-cyan-400 font-semibold">
                          <span>Chuyển khoản:</span>
                          <span>{stats.transfer.toLocaleString('vi-VN')} đ</span>
                        </div>
                        <div className="flex justify-between items-center text-emerald-700 dark:text-emerald-400 font-semibold">
                          <span>Tiền mặt:</span>
                          <span>{stats.cash.toLocaleString('vi-VN')} đ</span>
                        </div>
                        <div className="flex justify-between items-center text-slate-800 dark:text-slate-200 font-black pt-1.5 border-t border-slate-200 dark:border-slate-700">
                          <span>Tổng cộng:</span>
                          <span>{stats.total.toLocaleString('vi-VN')} đ</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* LỊCH SỬ THU TIỀN VÀ TRẠNG THÁI XÁC NHẬN */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm dark:shadow-none dark:shadow-none border border-slate-200 dark:border-slate-700 dark:border-slate-700 p-4 space-y-3">
            <h3 className="font-bold text-slate-800 dark:text-slate-200 dark:text-slate-200 text-xs uppercase tracking-wider">Lịch Sử Thu Tiền Gần Đây</h3>
            {/* GIAO DIỆN MOBILE DẠNG THẺ */}
            <div className="md:hidden space-y-3 max-h-96 overflow-y-auto pr-1">
              {invoicesHistory.length === 0 ? (
                <div className="p-4 text-center text-slate-400 italic bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700">Chưa có lịch sử thu tiền.</div>
              ) : (
                invoicesHistory.map((inv) => (
                  <div key={inv.id} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-3 shadow-sm relative space-y-2">
                    <div className="flex justify-between items-start border-b border-slate-50 dark:border-slate-700/50 pb-2">
                      <div>
                        <p className="font-bold text-slate-900 dark:text-white text-sm">{inv.student?.full_name}</p>
                        <p className="text-[10px] font-mono text-slate-500 dark:text-slate-400">{inv.invoice_code}</p>
                      </div>
                      <div className="text-right flex flex-col items-end">
                        <p className="font-black text-cyan-800 dark:text-cyan-300 text-sm">{Number(inv.amount).toLocaleString('vi-VN')} đ</p>
                        <span className={`px-2 py-0.5 rounded uppercase font-bold text-[9px] mt-1 inline-block ${inv.payment_method === 'cash' ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' : 'bg-cyan-50 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-400'}`}>
                          {inv.payment_method === 'cash' ? 'Tiền mặt' : 'VietQR'}
                        </span>
                      </div>
                    </div>
                    
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 font-semibold">{inv.title}</p>
                    
                    <div className="flex justify-between items-center pt-1">
                      <div>
                        {inv.approval_status === 'pending' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 dark:text-amber-300 dark:bg-amber-900/30">
                            <AlertTriangle className="w-3 h-3" /> Chờ duyệt
                          </span>
                        ) : inv.approval_status === 'rejected' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 dark:text-rose-300 dark:bg-rose-900/30">
                            <X className="w-3 h-3" /> Từ chối
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:text-emerald-300 dark:bg-emerald-900/30">
                            <CheckCircle2 className="w-3 h-3" /> Đã thu
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {user.roles?.includes('admin') && inv.approval_status === 'pending' && (
                          <>
                            <button onClick={() => handleApproveInvoice(inv.id)} className="text-emerald-600 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:hover:bg-emerald-900/50 p-1.5 rounded-lg transition-colors" title="Duyệt">
                              <CheckCircle2 className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleRejectInvoice(inv.id)} className="text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 dark:bg-rose-900/30 dark:hover:bg-rose-900/50 p-1.5 rounded-lg transition-colors" title="Từ chối">
                              <X className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        {(user.roles?.includes('admin') || inv.approval_status === 'pending') && (
                          <button onClick={() => handleUndoInvoice(inv.id)} className="text-slate-500 hover:text-rose-600 text-[10px] underline font-semibold">
                            Hoàn tác
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="hidden md:block overflow-x-auto max-h-96 overflow-y-auto relative border border-slate-100 dark:border-slate-700 rounded-lg">
              <table className="w-full text-left text-xs border-collapse min-w-[550px]">
                <thead className="bg-slate-100 dark:bg-slate-700/50 dark:bg-slate-700/50 text-slate-600 dark:text-slate-400 dark:text-slate-400 uppercase font-semibold sticky top-0 z-10 shadow-sm">
                  <tr>
                    <th className="p-2.5">Mã HD</th>
                    <th className="p-2.5">Học sinh</th>
                    <th className="p-2.5">Nội dung</th>
                    <th className="p-2.5">Số tiền</th>
                    <th className="p-2.5">Hình thức</th>
                    <th className="p-2.5">Trạng thái</th>
                    <th className="p-2.5 text-center">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {invoicesHistory.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="p-4 text-center text-slate-400 italic">Chưa có lịch sử thu tiền.</td>
                    </tr>
                  ) : (
                    invoicesHistory.map((inv) => (
                      <tr key={inv.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 dark:bg-slate-900/50 dark:hover:bg-slate-700/50 dark:bg-slate-900/50 border-b border-slate-50 dark:border-slate-800 last:border-0">
                        <td className="p-2.5 font-bold text-slate-700 dark:text-slate-300 dark:text-slate-300 font-mono">{inv.invoice_code}</td>
                        <td className="p-2.5 font-bold text-slate-900 dark:text-white">{inv.student?.full_name}</td>
                        <td className="p-2.5 text-slate-600 dark:text-slate-400 dark:text-slate-400">{inv.title}</td>
                        <td className="p-2.5 font-black text-cyan-800 dark:text-cyan-300 dark:text-cyan-300">{Number(inv.amount).toLocaleString('vi-VN')} đ</td>
                        <td className="p-2.5 uppercase font-semibold text-[10px]">
                          <span className={`px-2 py-0.5 rounded ${inv.payment_method === 'cash' ? 'bg-emerald-50 dark:bg-emerald-900/30 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 dark:text-emerald-400' : 'bg-cyan-50 dark:bg-cyan-900/30 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-400 dark:text-cyan-400'}`}>
                            {inv.payment_method === 'cash' ? 'Tiền mặt' : 'VietQR'}
                          </span>
                        </td>
                        <td className="p-2.5">
                          {inv.approval_status === 'pending' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 dark:text-amber-300 dark:bg-amber-900/30">
                              <AlertTriangle className="w-3 h-3" /> Chờ duyệt
                            </span>
                          ) : inv.approval_status === 'rejected' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 dark:text-rose-300 dark:bg-rose-900/30">
                              <X className="w-3 h-3" /> Từ chối
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:text-emerald-300 dark:bg-emerald-900/30">
                              <CheckCircle2 className="w-3 h-3" /> Đã thu
                            </span>
                          )}
                        </td>
                        <td className="p-2.5 text-center space-x-2">
                          {user.roles?.includes('admin') && inv.approval_status === 'pending' && (
                            <>
                              <button onClick={() => handleApproveInvoice(inv.id)} className="text-emerald-600 hover:text-emerald-800" title="Duyệt">
                                <CheckCircle2 className="w-4 h-4 inline" />
                              </button>
                              <button onClick={() => handleRejectInvoice(inv.id)} className="text-rose-600 hover:text-rose-800" title="Từ chối">
                                <X className="w-4 h-4 inline" />
                              </button>
                            </>
                          )}
                          {(user.roles?.includes('admin') || inv.approval_status === 'pending') && (
                            <button onClick={() => handleUndoInvoice(inv.id)} className="text-slate-400 hover:text-rose-600 text-[10px] underline ml-2">
                              Hoàn tác
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* CỘT PHẢI: PHIẾU THU K80 (SỬA LỖI ĐỔI HÌNH THỨC THANH TOÁN VẪN HIỂN THỊ CỐ ĐỊNH) */}
        <div className="lg:col-span-1">
          {recentInvoice ? (
            <div className="bg-white dark:bg-slate-800 p-5 rounded-xl shadow-sm dark:shadow-none dark:shadow-none border border-slate-200 dark:border-slate-700 dark:border-slate-700 text-center space-y-4">
              <div className="flex justify-center items-center text-emerald-700 dark:text-emerald-400 dark:text-emerald-400 space-x-1.5 bg-emerald-50 dark:bg-emerald-900/30 dark:bg-emerald-900/30 py-2 rounded-lg border border-emerald-200 print:hidden">
                <CheckCircle2 className="w-5 h-5" />
                <span className="font-bold text-sm">XÁC NHẬN THU TIỀN THÀNH CÔNG</span>
              </div>

              {/* DÙNG recentInvoice.payment_method NÊN KHI ĐỔI PHƯƠNG THỨC Ở FORM KHÔNG BỊ MẤT GIAO DIỆN */}
              {recentInvoice.payment_method === 'transfer' && qrUrl && (
                <div className="bg-slate-50 dark:bg-slate-900/50 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-200 dark:border-slate-700 dark:border-slate-700 inline-block shadow-inner print:hidden">
                  <img src={qrUrl} alt="Mã VietQR" className="w-52 h-auto mx-auto rounded-lg border bg-white dark:bg-slate-800 p-1" />
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 dark:text-slate-400 mt-2 font-medium">Quét mã bằng ứng dụng Ngân hàng</p>
                </div>
              )}

              {/* KHUNG PHIẾU THU K80 */}
              <div id="print-invoice" className="border-2 border-dashed border-slate-300 dark:border-slate-600 dark:border-slate-600 p-4 rounded-xl text-left font-mono text-xs space-y-1.5 text-slate-800 dark:text-slate-200 dark:text-slate-200 bg-slate-50 dark:bg-slate-900/50 dark:bg-slate-900/50">
                <p className="text-center font-black text-sm uppercase text-slate-900 dark:text-white">SUNNY EDUCATION POS</p>
                <p className="text-center text-[10px] text-slate-500 dark:text-slate-400 dark:text-slate-400 uppercase tracking-widest border-b pb-2">PHIẾU XÁC NHẬN THU HỌC PHÍ</p>
                
                <div className="pt-2 space-y-1">
                  <p>Mã HD: <b className="font-mono text-slate-900 dark:text-white">{recentInvoice.invoice_code}</b></p>
                  <p>Ngày thu: <b>{new Date(recentInvoice.paid_at || Date.now()).toLocaleString('vi-VN')}</b></p>
                  <p>Học sinh: <b className="text-slate-900 dark:text-white">{recentInvoice.student?.full_name}</b></p>
                  <p>Mã HS: <b>{recentInvoice.student?.student_code}</b></p>
                  <p>Nội dung: {recentInvoice.title}</p>
                </div>

                <div className="border-t border-b border-slate-300 dark:border-slate-600 dark:border-slate-600 py-2 my-2 font-extrabold text-sm flex justify-between items-center text-slate-900 dark:text-white">
                  <span>TỔNG TIỀN:</span>
                  <span className="text-base text-emerald-700 dark:text-emerald-400 dark:text-emerald-400">{Number(recentInvoice.amount).toLocaleString('vi-VN')} đ</span>
                </div>

                <p className="text-[11px]">Hình thức: <b>{recentInvoice.payment_method === 'cash' ? 'Tiền mặt' : 'Chuyển khoản VietQR'}</b></p>
                <p className="text-[11px]">Trạng thái: <b className="text-emerald-700 dark:text-emerald-400 dark:text-emerald-400">ĐÃ XÁC NHẬN NỘP TIỀN</b></p>
                <p className="text-center text-[10px] text-slate-400 italic pt-2">Cảm ơn Quý Phụ huynh & Học sinh!</p>
              </div>

              <button
                onClick={() => window.print()}
                className="w-full flex justify-center items-center space-x-2 bg-slate-900 text-white py-2.5 rounded-xl hover:bg-slate-800 font-bold text-xs transition-colors shadow-sm dark:shadow-none dark:shadow-none print:hidden"
              >
                <Printer className="w-4 h-4" />
                <span>In Phiếu Thu (K80)</span>
              </button>
            </div>
          ) : (
            <div className="bg-slate-50 dark:bg-slate-900/50 dark:bg-slate-900/50 border-2 border-dashed border-slate-200 dark:border-slate-700 dark:border-slate-700 rounded-xl p-8 text-center text-slate-400 space-y-2 print:hidden">
              <QrCode className="w-12 h-12 mx-auto text-slate-300" />
              <p className="font-bold text-xs text-slate-600 dark:text-slate-400 dark:text-slate-400">Chưa chọn học sinh</p>
              <p className="text-[11px] text-slate-400">
                Hãy chọn học sinh ở cột bên trái để kiểm tra trạng thái nộp tiền và tự động tính học phí.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}