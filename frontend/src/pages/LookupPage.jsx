import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Search, GraduationCap, Award, Phone, User, ArrowLeft, Trophy, BarChart3, Calendar } from 'lucide-react';
import api from '../api/axios';

export default function LookupPage() {
  const [studentCode, setStudentCode] = useState('');
  const [parentPhone, setParentPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  // Khởi tạo Dark Mode (nếu có lưu trong localStorage hoặc theo hệ thống)
  useEffect(() => {
    if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark');
    }
  }, []);

  const handleLookup = async (e) => {
    e.preventDefault();
    if (!studentCode || !parentPhone) return toast.error('Vui lòng nhập đầy đủ thông tin');
    
    setLoading(true);
    try {
      const res = await api.post('/exam-lookup', { student_code: studentCode, parent_phone: parentPhone });
      setResult(res.data);
      if (res.data.results && res.data.results.length > 0 && res.data.results[0].is_scholarship) {
        // Simple confetti effect triggers by adding class or you can use a library
        toast.success('🎉 Chúc mừng bạn đã đạt Học Bổng!', { duration: 5000, position: 'top-center' });
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Không tìm thấy kết quả phù hợp');
    } finally {
      setLoading(false);
    }
  };

  const renderScoreBar = (label, score, max = 10) => (
    <div className="mb-4">
      <div className="flex justify-between items-center mb-1">
        <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{label}</span>
        <span className="text-sm font-black text-cyan-600 dark:text-cyan-400">{score} / {max}</span>
      </div>
      <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-3">
        <div 
          className="bg-gradient-to-r from-cyan-400 to-blue-500 h-3 rounded-full transition-all duration-1000 ease-out"
          style={{ width: `${Math.min((score / max) * 100, 100)}%` }}
        ></div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4 selection:bg-cyan-200">
      
      {/* Background Decorators */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-cyan-400/20 dark:bg-cyan-600/10 blur-3xl"></div>
        <div className="absolute top-[60%] -right-[10%] w-[40%] h-[40%] rounded-full bg-blue-400/20 dark:bg-blue-600/10 blur-3xl"></div>
      </div>

      <div className="w-full max-w-xl z-10 relative">
        
        {/* Lottie / Logo Placeholder */}
        <div className="flex justify-center mb-6">
          <div className="bg-white dark:bg-slate-800 p-4 rounded-3xl shadow-xl shadow-cyan-900/5 border border-slate-100 dark:border-slate-700 flex items-center gap-3">
            <GraduationCap className="w-8 h-8 text-cyan-600" />
            <h1 className="text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-cyan-600 to-blue-600">
              Tra Cứu Điểm Thi
            </h1>
          </div>
        </div>

        {!result ? (
          /* FORM TRA CỨU */
          <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl p-8 rounded-[2rem] shadow-2xl border border-slate-200 dark:border-slate-700 animate-in fade-in zoom-in-95 duration-500">
            <p className="text-center text-slate-500 dark:text-slate-400 mb-8 font-medium">
              Vui lòng nhập Mã học sinh và Số điện thoại phụ huynh để xem kết quả kỳ thi mới nhất.
            </p>

            <form onSubmit={handleLookup} className="space-y-5">
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Mã Học Sinh</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="VD: HS01001"
                    className="block w-full pl-11 pr-4 py-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition-all font-mono font-medium text-slate-800 dark:text-slate-200"
                    value={studentCode}
                    onChange={(e) => setStudentCode(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Số điện thoại Phụ huynh</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Phone className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    type="tel"
                    required
                    placeholder="VD: 0912345678"
                    className="block w-full pl-11 pr-4 py-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition-all font-mono font-medium text-slate-800 dark:text-slate-200"
                    value={parentPhone}
                    onChange={(e) => setParentPhone(e.target.value)}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 mt-4 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-2xl font-black text-lg shadow-xl shadow-cyan-600/20 transition-all flex justify-center items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {loading ? 'Đang tìm kiếm...' : (
                  <>
                    <Search className="w-5 h-5" />
                    Tra Cứu Kết Quả
                  </>
                )}
              </button>
            </form>
          </div>
        ) : (
          /* KẾT QUẢ TRA CỨU */
          <div className="animate-in slide-in-from-bottom-8 duration-500">
            <button 
              onClick={() => setResult(null)}
              className="mb-4 flex items-center gap-2 text-slate-500 hover:text-cyan-600 dark:text-slate-400 dark:hover:text-cyan-400 font-bold transition-colors"
            >
              <ArrowLeft className="w-5 h-5" /> Tra cứu lại
            </button>
            
            <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl rounded-[2.5rem] shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden relative">
              
              {/* Header Profile */}
              <div className="bg-gradient-to-br from-cyan-600 to-blue-700 p-8 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-10">
                  <GraduationCap className="w-40 h-40" />
                </div>
                <div className="relative z-10">
                  <h2 className="text-3xl font-black">{result.student.full_name}</h2>
                  <p className="opacity-90 font-medium mt-1 text-cyan-100 flex items-center gap-4">
                    <span>Mã HS: <b className="font-mono">{result.student.student_code}</b></span>
                    <span>Khối: <b>{result.student.grade}</b></span>
                  </p>
                </div>
              </div>

              {/* Chi tiết điểm thi */}
              <div className="p-8 space-y-8">
                {result.results.length === 0 ? (
                  <div className="text-center py-10 text-slate-500">
                    <Trophy className="w-16 h-16 mx-auto mb-4 opacity-20" />
                    <p className="font-medium text-lg">Chưa có kết quả kỳ thi nào được công bố.</p>
                  </div>
                ) : (
                  result.results.map((candidate, idx) => (
                    <div key={idx} className="relative">
                      
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
                        <div>
                          <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">{candidate.exam?.name}</h3>
                          <p className="text-slate-500 dark:text-slate-400 text-sm flex items-center gap-1.5 mt-1">
                            <Calendar className="w-4 h-4" /> {new Date(candidate.exam?.exam_date).toLocaleDateString('vi-VN')}
                            <span className="mx-2">•</span>
                            SBD: <span className="font-mono font-bold text-cyan-600 dark:text-cyan-400">{candidate.candidate_number}</span>
                          </p>
                        </div>
                        
                        <div className="mt-4 sm:mt-0 px-4 py-2 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-700 flex flex-col items-center">
                          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Thứ hạng</span>
                          <span className="text-2xl font-black text-cyan-600 dark:text-cyan-400">#{candidate.rank}</span>
                        </div>
                      </div>

                      {/* Thông báo học bổng */}
                      {candidate.is_scholarship && (
                        <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-white flex items-center gap-4 shadow-lg shadow-amber-500/30 animate-pulse">
                          <Award className="w-10 h-10 flex-shrink-0" />
                          <div>
                            <h4 className="font-black text-lg">XUẤT SẮC - ĐẠT HỌC BỔNG!</h4>
                            <p className="text-sm font-medium opacity-90">Học sinh nằm trong Top 3 xuất sắc nhất kỳ thi. Chúc mừng gia đình!</p>
                          </div>
                        </div>
                      )}

                      {/* Bảng điểm */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-slate-50 dark:bg-slate-900/50 p-6 rounded-3xl border border-slate-100 dark:border-slate-700">
                        {candidate.scores && candidate.scores.toan !== undefined && (
                          <div className="col-span-1">
                            {renderScoreBar('Môn Toán', candidate.scores.toan)}
                            {renderScoreBar('Môn Văn', candidate.scores.van)}
                            {renderScoreBar('Môn Tiếng Anh', candidate.scores.anh)}
                          </div>
                        )}
                        <div className={`col-span-1 flex flex-col justify-center items-center ${candidate.scores ? 'border-l border-slate-200 dark:border-slate-700 pl-6' : 'col-span-full'}`}>
                          <BarChart3 className="w-10 h-10 text-cyan-600 mb-2 opacity-50" />
                          <span className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Tổng Điểm</span>
                          <span className="text-5xl font-black text-slate-800 dark:text-white mt-2">{candidate.total_score}</span>
                          {candidate.note && (
                            <p className="mt-4 text-sm text-center text-slate-500 italic px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-lg">"{candidate.note}"</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

            </div>
          </div>
        )}
      </div>
    </div>
  );
}
