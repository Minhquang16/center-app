import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import Swal from 'sweetalert2';
import { 
  Plus, Calendar, CheckCircle2, Search, ArrowLeft, 
  GraduationCap, FileEdit, Save, Award, Users, Upload, Trash2, Download, Settings
} from 'lucide-react';
import api from '../api/axios';
import ExamRoomManager from '../components/ExamRoomManager';

export default function ExamsPage() {
  const user = JSON.parse(localStorage.getItem('user')) || {};
  const isAdmin = user.roles?.includes('admin');

  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  
  // Create Exam Form
  const [newExam, setNewExam] = useState({ 
    name: '', 
    exam_date: new Date().toISOString().split('T')[0], 
    scoring_type: 'multiple_subjects',
    exam_type: 'Thi Thử (Định kỳ)',
    display_settings: { 
      subjects: [
        { name: 'Toán', multiplier: 1 },
        { name: 'Văn', multiplier: 1 },
        { name: 'Anh', multiplier: 1 }
      ], 
      show_total: true 
    },
    shifts: [
      { name: 'Ca 1', start_time: '08:00', end_time: '10:00', room_count: 5, capacity_per_room: 24 }
    ]
  });
  
  // Selected Exam for Details View
  const [selectedExam, setSelectedExam] = useState(null);
  const [selectedShift, setSelectedShift] = useState(null);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [candidates, setCandidates] = useState([]);
  
  // Add students to exam
  const [classesData, setClassesData] = useState([]);
  const [showAddStudentsModal, setShowAddStudentsModal] = useState(false);
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);
  const [addTab, setAddTab] = useState('class'); // 'class' or 'excel'
  const [selectedClassId, setSelectedClassId] = useState('');
  const [excelFile, setExcelFile] = useState(null);
  const [importing, setImporting] = useState(false);

  // Scores state for grading
  const [editingScores, setEditingScores] = useState({});
  const [showRoomManager, setShowRoomManager] = useState(false);

  useEffect(() => {
    fetchExams();
  }, []);

  const fetchExams = async () => {
    setLoading(true);
    try {
      const res = await api.get('/exams');
      setExams(res.data);
    } catch (err) {
      toast.error('Lỗi khi tải danh sách kỳ thi');
    } finally {
      setLoading(false);
    }
  };

  const getExamStatus = (exam) => {
    if (exam.status === 'completed') return { text: 'Đã chốt', colorClass: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' };
    
    const today = new Date();
    today.setHours(0,0,0,0);
    const examDate = new Date(exam.exam_date);
    examDate.setHours(0,0,0,0);
    
    if (examDate > today) return { text: 'Sắp diễn ra', colorClass: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400' };
    if (examDate.getTime() === today.getTime()) return { text: 'Đang diễn ra', colorClass: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' };
    return { text: 'Đã diễn ra', colorClass: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300' };
  };

  const fetchExamDetails = async (id) => {
    try {
      const res = await api.get(`/exams/${id}`);
      setSelectedExam(res.data.exam);
      setSelectedShift(null);
      setSelectedRoom(null);
      setCandidates(res.data.candidates);
      
      // Init editing state
      const initialScores = {};
      res.data.candidates.forEach(c => {
        initialScores[c.id] = {
          scores: c.scores || {},
          total_score: c.total_score || '',
          note: c.note || '',
          is_absent: c.is_absent || false
        };
      });
      setEditingScores(initialScores);
    } catch (err) {
      toast.error('Lỗi khi tải chi tiết kỳ thi');
    }
  };

  const fetchClassesWithStudents = async () => {
    try {
      const res = await api.get('/classes/with-students');
      setClassesData(res.data);
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Lỗi khi tải danh sách lớp học');
    }
  };

  const handleCreateExam = async (e) => {
    e.preventDefault();
    try {
      await api.post('/exams', newExam);
      toast.success('Đã tạo kỳ thi mới thành công!');
      setShowCreateModal(false);
      fetchExams();
      setNewExam({
        name: '', exam_date: new Date().toISOString().split('T')[0], 
        scoring_type: 'multiple_subjects', exam_type: 'Thi Thử (Định kỳ)',
        display_settings: { 
          subjects: [
            { name: 'Toán', multiplier: 1 },
            { name: 'Văn', multiplier: 1 },
            { name: 'Anh', multiplier: 1 }
          ], 
          show_total: true 
        },
        shifts: [
          { name: 'Ca 1', start_time: '08:00', end_time: '10:00', room_count: 5, capacity_per_room: 24 }
        ]
      });
    } catch (err) {
      toast.error('Lỗi khi tạo kỳ thi');
    }
  };

  const handleDeleteExam = async (id, name) => {
    const result = await Swal.fire({
      title: 'Xóa kỳ thi?',
      text: `Bạn có chắc chắn muốn xóa kỳ thi "${name}"? Hành động này không thể hoàn tác và sẽ xóa toàn bộ điểm của thí sinh trong kỳ thi này.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#94a3b8',
      confirmButtonText: 'Đồng ý xóa',
      cancelButtonText: 'Hủy'
    });

    if (result.isConfirmed) {
      try {
        await api.delete(`/exams/${id}`);
        toast.success('Đã xóa kỳ thi thành công');
        fetchExams();
      } catch (err) {
        toast.error('Lỗi khi xóa kỳ thi');
      }
    }
  };

  const handleAddStudents = async () => {
    if (selectedStudentIds.length === 0) return toast.error('Vui lòng chọn ít nhất 1 học sinh');
    try {
      const res = await api.post(`/exams/${selectedExam.id}/candidates`, { student_ids: selectedStudentIds });
      toast.success(res.data.message);
      setShowAddStudentsModal(false);
      setSelectedStudentIds([]);
      fetchExamDetails(selectedExam.id);
    } catch (err) {
      toast.error('Lỗi khi thêm học sinh');
    }
  };



  const handleScoreChange = (candidateId, field, value) => {
    setEditingScores(prev => ({
      ...prev,
      [candidateId]: {
        ...prev[candidateId],
        [field]: value
      }
    }));
  };

  const handleSubjectScoreChange = (candidateId, subject, value) => {
    let numVal = parseFloat(value);
    if (value !== '' && (isNaN(numVal) || numVal < 0)) numVal = 0;
    if (value !== '' && numVal > 10) numVal = 10;
    const finalStrValue = value === '' ? '' : numVal.toString();

    setEditingScores(prev => {
      const currentScores = prev[candidateId]?.scores || {};
      const newScores = { ...currentScores, [subject]: finalStrValue };
      
      let newTotal = '';
      if (selectedExam?.display_settings?.subjects) {
        let total = 0;
        let hasAnyScore = false;
        selectedExam.display_settings.subjects.forEach(subj => {
          const sValue = parseFloat(newScores[subj.name]);
          if (!isNaN(sValue)) {
            hasAnyScore = true;
            total += sValue * (parseFloat(subj.multiplier) || 1);
          }
        });
        if (hasAnyScore) newTotal = total.toString();
      }

      return {
        ...prev,
        [candidateId]: {
          ...prev[candidateId],
          scores: newScores,
          total_score: newTotal
        }
      };
    });
  };

  const handleBulkSaveScores = async () => {
    const updates = Object.keys(editingScores).map(id => ({
      id: parseInt(id),
      scores: editingScores[id].scores,
      total_score: editingScores[id].total_score === '' ? null : parseFloat(editingScores[id].total_score),
      note: editingScores[id].note
    }));

    try {
      await api.post(`/exams/${selectedExam.id}/scores`, { updates });
      toast.success('Đã lưu điểm thành công');
      fetchExamDetails(selectedExam.id);
    } catch (err) {
      toast.error('Lỗi khi lưu điểm');
    }
  };

  const handleFinalizeExam = async () => {
    const result = await Swal.fire({
      title: 'Chốt điểm & Xếp hạng?',
      text: "Hệ thống sẽ lưu điểm hiện tại, xếp hạng học sinh và đánh dấu Top 3 đạt Học bổng. Hành động này không thể hoàn tác!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#0891b2',
      cancelButtonColor: '#ef4444',
      confirmButtonText: 'Đồng ý chốt'
    });

    if (result.isConfirmed) {
      try {
        const updates = Object.keys(editingScores).map(id => ({
          id: parseInt(id),
          scores: editingScores[id].scores,
          total_score: editingScores[id].total_score === '' ? null : parseFloat(editingScores[id].total_score),
          note: editingScores[id].note,
          is_absent: editingScores[id].is_absent || false
        }));
        await api.post(`/exams/${selectedExam.id}/scores`, { updates });
        await api.post(`/exams/${selectedExam.id}/finalize`);
        toast.success('Đã chốt điểm và xếp hạng thành công!');
        fetchExamDetails(selectedExam.id);
      } catch (err) {
        toast.error(err.response?.data?.message || 'Lỗi khi chốt điểm');
      }
    }
  };

  const handleChangeCandidateRoom = async (candidateId, shiftId, roomId) => {
    try {
      await api.put(`/exam-candidates/${candidateId}/change-room`, {
        exam_shift_id: shiftId,
        exam_room_id: roomId
      });
      toast.success('Đã chuyển ca/phòng thành công');
      fetchExamDetails(selectedExam.id);
    } catch (err) {
      toast.error('Lỗi khi chuyển phòng');
    }
  };

  const handleExportExcel = async () => {
    try {
      // Tự động lưu điểm trước khi xuất Excel để Excel có dữ liệu mới nhất
      const updates = Object.keys(editingScores).map(id => ({
        id: parseInt(id),
        scores: editingScores[id].scores,
        total_score: editingScores[id].total_score === '' ? null : parseFloat(editingScores[id].total_score),
        note: editingScores[id].note,
        is_absent: editingScores[id].is_absent || false
      }));
      await api.post(`/exams/${selectedExam.id}/scores`, { updates });

      const params = new URLSearchParams();
      if (selectedShift && selectedShift.id !== 'unassigned') params.append('shift_id', selectedShift.id);
      else if (selectedShift && selectedShift.id === 'unassigned') params.append('shift_id', 'unassigned');
      
      if (selectedRoom && selectedRoom.id !== 'unassigned') params.append('room_id', selectedRoom.id);
      else if (selectedRoom && selectedRoom.id === 'unassigned') params.append('room_id', 'unassigned');

      const res = await api.get(`/exams/${selectedExam.id}/export?${params.toString()}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      let safeName = selectedExam.name.replace(/\s+/g, '_');
      if (selectedShift && selectedShift.name) safeName += `_${selectedShift.name.replace(/\s+/g, '_')}`;
      if (selectedRoom && selectedRoom.name) safeName += `_${selectedRoom.name.replace(/\s+/g, '_')}`;
      link.setAttribute('download', `Diem_Thi_${safeName}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      toast.error('Lỗi khi xuất excel');
    }
  };

  const handleImportExcel = async () => {
    if (!excelFile) return toast.error('Vui lòng chọn file Excel');
    const formData = new FormData();
    formData.append('file', excelFile);
    setImporting(true);
    try {
      const res = await api.post(`/exams/${selectedExam.id}/import-excel`, formData);
      toast.success(res.data.message);
      setShowAddStudentsModal(false);
      setExcelFile(null);
      fetchExamDetails(selectedExam.id);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi khi import excel');
    } finally {
      setImporting(false);
    }
  };

  const [roomFilter, setRoomFilter] = useState(''); // '' means all

  // DYNAMIC RANKING
  const dynamicRanks = useMemo(() => {
    if (!selectedExam || !candidates) return {};
    const scores = [];
    candidates.forEach(c => {
      const ts = editingScores[c.id]?.total_score;
      if (ts !== undefined && ts !== null && ts !== '') {
        scores.push({ id: c.id, score: parseFloat(ts) });
      }
    });
    scores.sort((a, b) => b.score - a.score);
    
    const ranks = {};
    let currentRank = 1;
    let displayRank = 1;
    let prevScore = null;
    
    scores.forEach(s => {
      if (prevScore !== null) {
        if (s.score === prevScore) {
          ranks[s.id] = displayRank;
        } else {
          displayRank = currentRank;
          ranks[s.id] = displayRank;
        }
      } else {
        ranks[s.id] = displayRank;
      }
      prevScore = s.score;
      currentRank++;
    });
    return ranks;
  }, [candidates, editingScores, selectedExam]);

  // Filter candidates by room with Memoization for performance
  const filteredCandidates = React.useMemo(() => {
    return candidates.filter(c => {
      if (!roomFilter) return true;
      if (roomFilter === 'unassigned') return !c.exam_room_id;
      return c.exam_room_id?.toString() === roomFilter;
    });
  }, [candidates, roomFilter]);

  // RENDER DETAILS VIEW
  if (selectedExam) {
    const showTotal = selectedExam.display_settings?.show_total !== false;

    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => { 
                if (selectedRoom) setSelectedRoom(null);
                else if (selectedShift) setSelectedShift(null);
                else { setSelectedExam(null); fetchExams(); }
              }}
              className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors"
            >
              <ArrowLeft className="w-6 h-6 text-slate-600 dark:text-slate-300" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                {selectedExam.name}
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Ngày thi: {new Date(selectedExam.exam_date).toLocaleDateString('vi-VN')} | Trạng thái: {getExamStatus(selectedExam).text}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {selectedExam.status !== 'completed' && (
              <>
                {isAdmin && (
                  <button
                    onClick={() => { fetchClassesWithStudents(); setAddTab('class'); setShowAddStudentsModal(true); }}
                    className="bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 px-4 py-2 rounded-xl font-medium hover:border-cyan-500 hover:text-cyan-600 dark:hover:text-cyan-400 dark:hover:border-cyan-500 transition-all duration-300 shadow-sm hover:shadow-md flex items-center gap-2 text-sm"
                  >
                    <Users className="w-4 h-4" />
                    <span>Thêm Thí Sinh</span>
                  </button>
                )}
                {isAdmin && (
                  <button
                    onClick={() => setShowRoomManager(true)}
                    className="bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 px-4 py-2 rounded-xl font-medium hover:border-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400 dark:hover:border-indigo-500 transition-all duration-300 shadow-sm hover:shadow-md flex items-center gap-2 text-sm"
                  >
                    <Settings className="w-4 h-4" />
                    <span>Ca / Phòng thi</span>
                  </button>
                )}
                <button
                  onClick={handleBulkSaveScores}
                  className="bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white px-4 py-2 rounded-xl font-semibold transition-all duration-300 shadow-md shadow-emerald-500/20 hover:shadow-emerald-500/40 hover:-translate-y-0.5 flex items-center gap-2 text-sm"
                >
                  <Save className="w-4 h-4" />
                  <span>Lưu Điểm</span>
                </button>
                {isAdmin && (
                  <button
                    onClick={async () => {
                      try {
                        await api.post(`/exams/${selectedExam.id}/auto-assign`);
                        toast.success('Đã xếp phòng ngẫu nhiên thành công!');
                        fetchExamDetails(selectedExam.id);
                      } catch (err) {
                        toast.error(err.response?.data?.message || 'Lỗi khi xếp phòng');
                      }
                    }}
                    className="bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600 text-white px-4 py-2 rounded-xl font-semibold transition-all duration-300 shadow-md shadow-violet-500/20 hover:shadow-violet-500/40 hover:-translate-y-0.5 flex items-center gap-2 text-sm"
                  >
                    <Users className="w-4 h-4" />
                    <span>Xếp ngẫu nhiên</span>
                  </button>
                )}
                {isAdmin && (
                  <button
                    onClick={handleFinalizeExam}
                    className="bg-gradient-to-r from-slate-800 to-slate-900 dark:from-slate-700 dark:to-slate-800 hover:from-black hover:to-black text-white px-4 py-2 rounded-xl font-semibold transition-all duration-300 shadow-md hover:shadow-xl hover:-translate-y-0.5 flex items-center gap-2 text-sm ring-1 ring-white/10"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Chốt Kỳ Thi</span>
                  </button>
                )}
                <button
                  onClick={handleExportExcel}
                  className="bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 px-4 py-2 rounded-xl font-medium hover:bg-emerald-50 dark:hover:bg-emerald-900/30 transition-all duration-300 shadow-sm hover:shadow-md flex items-center gap-2 text-sm"
                >
                  <Download className="w-4 h-4" />
                  <span>Xuất Excel</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* UNIFIED CANDIDATE TABLE */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-visible">
          
          <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex flex-wrap gap-4 items-center bg-slate-50 dark:bg-slate-900/50 rounded-t-2xl">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-slate-400" />
              <span className="font-semibold text-slate-700 dark:text-slate-300">Danh sách thí sinh ({candidates.length})</span>
            </div>
            
            <div className="flex-1"></div>

            <div className="flex items-center gap-3">
              <select
                className="text-sm p-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 focus:ring-2 focus:ring-cyan-500 outline-none text-slate-700 dark:text-slate-200"
                value={selectedShift?.id || ''}
                onChange={(e) => {
                  if (!e.target.value) { setSelectedShift(null); setSelectedRoom(null); return; }
                  if (e.target.value === 'unassigned') { setSelectedShift({ id: 'unassigned' }); setSelectedRoom(null); return; }
                  const s = selectedExam.shifts?.find(x => x.id == e.target.value);
                  setSelectedShift(s || null);
                  setSelectedRoom(null);
                }}
              >
                <option value="">Tất cả Ca thi</option>
                <option value="unassigned">Chưa xếp ca</option>
                {selectedExam.shifts?.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>

              <select
                className="text-sm p-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 focus:ring-2 focus:ring-cyan-500 outline-none text-slate-700 dark:text-slate-200"
                value={selectedRoom?.id || ''}
                onChange={(e) => {
                  if (!e.target.value) { setSelectedRoom(null); return; }
                  if (e.target.value === 'unassigned') { setSelectedRoom({ id: 'unassigned' }); return; }
                  const r = selectedShift?.rooms?.find(x => x.id == e.target.value);
                  setSelectedRoom(r || null);
                }}
                disabled={!selectedShift || selectedShift.id === 'unassigned'}
              >
                <option value="">Tất cả Phòng</option>
                {selectedShift && selectedShift.id !== 'unassigned' && (
                  <>
                    <option value="unassigned">Chưa xếp phòng</option>
                    {selectedShift.rooms?.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </>
                )}
              </select>
            </div>
          </div>
            <div className="overflow-x-auto min-h-[300px]">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-900/50">
                    <th className="p-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">SBD</th>
                    <th className="p-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Học sinh</th>
                    <th className="p-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase text-center">Bỏ thi</th>
                    {selectedExam.scoring_type === 'multiple_subjects' && selectedExam.display_settings?.subjects && (
                      <>
                        {selectedExam.display_settings.subjects.map((subj, idx) => (
                          <th key={idx} className="p-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">{subj.name}</th>
                        ))}
                      </>
                    )}
                    {showTotal && <th className="p-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Tổng điểm</th>}
                    <th className="p-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Xếp hạng</th>
                    <th className="p-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Ghi chú</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {candidates.filter(c => {
                    if (selectedShift && selectedShift.id === 'unassigned' && c.exam_shift_id) return false;
                    if (selectedShift && selectedShift.id !== 'unassigned' && c.exam_shift_id !== selectedShift.id) return false;
                    if (selectedRoom && selectedRoom.id === 'unassigned' && c.exam_room_id) return false;
                    if (selectedRoom && selectedRoom.id !== 'unassigned' && c.exam_room_id !== selectedRoom.id) return false;
                    return true;
                  }).map((c) => (
                    <tr key={c.id} className={`hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors border-b border-slate-100 dark:border-slate-700 last:border-0 ${c.is_scholarship ? 'bg-amber-50/50 dark:bg-amber-900/10' : ''}`}>
                      <td className="px-4 py-2 font-mono font-bold text-cyan-600 dark:text-cyan-400">{c.candidate_number}</td>
                      <td className="px-4 py-2 font-bold text-slate-800 dark:text-slate-200">
                        {c.student?.full_name}
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-slate-500 font-normal">Khối {c.student?.grade}</span>
                          <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-1.5 py-0.5 rounded">
                            {c.shift?.name || 'Chưa xếp ca'} - {c.room?.name || 'Chưa xếp phòng'}
                          </span>
                        </div>
                        {isAdmin && selectedExam.status !== 'completed' && selectedExam.shifts?.length > 0 && (
                          <select 
                            className="mt-2 text-xs p-1 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 outline-none w-full max-w-[200px]"
                            onChange={(e) => {
                              if (!e.target.value) return;
                              const [shiftId, roomId] = e.target.value.split('-');
                              handleChangeCandidateRoom(c.id, shiftId, roomId);
                              e.target.value = ""; // reset
                            }}
                            defaultValue=""
                          >
                            <option value="" disabled>Đổi phòng...</option>
                            {selectedExam.shifts.map(s => (
                              <optgroup key={s.id} label={s.name}>
                                {s.rooms?.map(r => (
                                  <option key={r.id} value={`${s.id}-${r.id}`}>{r.name}</option>
                                ))}
                              </optgroup>
                            ))}
                          </select>
                        )}
                      </td>
                      <td className="px-4 py-2 text-center">
                        <input 
                          type="checkbox" 
                          disabled={selectedExam.status === 'completed'}
                          className="w-4 h-4 rounded text-red-500 focus:ring-red-500"
                          checked={editingScores[c.id]?.is_absent || false}
                          onChange={(e) => {
                            handleScoreChange(c.id, 'is_absent', e.target.checked);
                            if (e.target.checked) handleScoreChange(c.id, 'note', 'Bỏ thi');
                          }}
                        />
                      </td>
                      
                      {selectedExam.scoring_type === 'multiple_subjects' && selectedExam.display_settings?.subjects && (
                        <>
                          {selectedExam.display_settings.subjects.map((subj, idx) => (
                            <td key={idx} className="px-4 py-2">
                              <input 
                                type="number"
                                min="0"
                                max="10"
                                step="any"
                                disabled={selectedExam.status === 'completed' || editingScores[c.id]?.is_absent}
                                className="w-16 p-1 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 disabled:opacity-50"
                                value={editingScores[c.id]?.scores?.[subj.name] || ''}
                                onChange={(e) => handleSubjectScoreChange(c.id, subj.name, e.target.value)}
                              />
                            </td>
                          ))}
                        </>
                      )}

                      {showTotal && (
                        <td className="px-4 py-2">
                          <input 
                            type="number" 
                            disabled={selectedExam.status === 'completed' || editingScores[c.id]?.is_absent}
                            className="w-20 p-1 border border-slate-300 dark:border-slate-600 rounded bg-slate-50 dark:bg-slate-900 font-bold text-cyan-700 focus:border-cyan-500 disabled:opacity-50"
                            value={editingScores[c.id]?.total_score || ''}
                            onChange={(e) => handleScoreChange(c.id, 'total_score', e.target.value)}
                          />
                        </td>
                      )}
                      <td className="px-4 py-2">
                        {(dynamicRanks[c.id] || c.rank) ? (
                          <div className="flex items-center gap-2">
                            <span className={`font-black text-lg ${(dynamicRanks[c.id] || c.rank) <= 3 ? 'text-amber-500' : 'text-slate-600 dark:text-slate-400'}`}>#{dynamicRanks[c.id] || c.rank}</span>
                            {((dynamicRanks[c.id] || c.rank) <= 3) && <Award className="w-5 h-5 text-amber-500 fill-amber-500/20" />}
                          </div>
                        ) : null}
                      </td>
                      <td className="px-4 py-2">
                        <input 
                          type="text" 
                          disabled={selectedExam.status === 'completed'}
                          className="w-32 p-1 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 focus:border-cyan-500 text-sm disabled:opacity-50"
                          placeholder="Ghi chú..."
                          value={editingScores[c.id]?.note || ''}
                          onChange={(e) => handleScoreChange(c.id, 'note', e.target.value)}
                        />
                      </td>
                    </tr>
                  ))}
                  {candidates.filter(c => {
                    if (selectedShift && selectedShift.id === 'unassigned' && c.exam_shift_id) return false;
                    if (selectedShift && selectedShift.id !== 'unassigned' && c.exam_shift_id !== selectedShift.id) return false;
                    if (selectedRoom && selectedRoom.id === 'unassigned' && c.exam_room_id) return false;
                    if (selectedRoom && selectedRoom.id !== 'unassigned' && c.exam_room_id !== selectedRoom.id) return false;
                    return true;
                  }).length === 0 && (
                    <tr><td colSpan="8" className="p-8 text-center text-slate-500">Chưa có thí sinh nào.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        {/* Modal Thêm Học Sinh */}
        {showAddStudentsModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowAddStudentsModal(false)}></div>
            <div className="relative bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh]">
              <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-4">Thêm học sinh vào kỳ thi</h2>
              
              <div className="flex border-b border-slate-200 dark:border-slate-700 mb-4">
                <button
                  className={`px-4 py-2 font-bold text-sm ${addTab === 'class' ? 'text-cyan-600 border-b-2 border-cyan-600' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}
                  onClick={() => setAddTab('class')}
                >
                  Chọn từ Lớp
                </button>
                <button
                  className={`px-4 py-2 font-bold text-sm ${addTab === 'excel' ? 'text-cyan-600 border-b-2 border-cyan-600' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}
                  onClick={() => setAddTab('excel')}
                >
                  Import Excel
                </button>
              </div>

              <div className="flex-1 overflow-hidden flex flex-col">
                {addTab === 'class' ? (
                  <>
                    <div className="mb-4">
                      <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Chọn Lớp học</label>
                      <select 
                        className="w-full p-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-cyan-500 outline-none"
                        value={selectedClassId}
                        onChange={async (e) => {
                          const classId = e.target.value;
                          setSelectedClassId(classId);
                          setSelectedStudentIds([]);
                          if (classId) {
                            const selectedClass = classesData.find(c => c.id == classId);
                            if (!selectedClass?.students) {
                              try {
                                const res = await api.get(`/classes/${classId}/students`);
                                setClassesData(prev => prev.map(c => c.id == classId ? { ...c, students: res.data } : c));
                              } catch (err) {
                                toast.error('Lỗi khi tải danh sách học sinh');
                              }
                            }
                          }
                        }}
                      >
                        <option value="">-- Chọn một lớp --</option>
                        {classesData.map(c => (
                          <option key={c.id} value={c.id}>{c.name} ({c.class_code})</option>
                        ))}
                      </select>
                    </div>

                    {selectedClassId && (
                      <div className="flex-1 overflow-y-auto space-y-2 border border-slate-200 dark:border-slate-700 rounded-xl p-2 min-h-[200px]">
                        {classesData.find(c => c.id == selectedClassId)?.students?.map(student => (
                          <label key={student.id} className="flex items-center gap-3 p-3 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg cursor-pointer transition-colors border border-transparent hover:border-slate-100 dark:hover:border-slate-600">
                            <input 
                              type="checkbox" 
                              className="w-5 h-5 rounded text-cyan-600 focus:ring-cyan-500 dark:bg-slate-800 dark:border-slate-600"
                              checked={selectedStudentIds.includes(student.id)}
                              onChange={(e) => {
                                if (e.target.checked) setSelectedStudentIds(prev => [...prev, student.id]);
                                else setSelectedStudentIds(prev => prev.filter(id => id !== student.id));
                              }}
                            />
                            <div>
                              <div className="font-bold text-slate-800 dark:text-slate-200">{student.full_name}</div>
                              <div className="text-xs text-slate-500 font-mono mt-0.5">Mã: {student.student_code} | Khối: {student.grade}</div>
                            </div>
                          </label>
                        ))}
                        {classesData.find(c => c.id == selectedClassId)?.students?.length === 0 && (
                          <div className="p-4 text-center text-slate-500 text-sm">Lớp này chưa có học sinh nào.</div>
                        )}
                      </div>
                    )}

                    <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-100 dark:border-slate-700">
                      <button type="button" onClick={() => setShowAddStudentsModal(false)} className="px-5 py-2.5 rounded-xl font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700">Đóng</button>
                      <button type="button" onClick={handleAddStudents} disabled={selectedStudentIds.length === 0} className="px-5 py-2.5 rounded-xl font-bold bg-cyan-600 hover:bg-cyan-700 text-white shadow-lg shadow-cyan-600/20 disabled:opacity-50">
                        Thêm đã chọn ({selectedStudentIds.length})
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="mb-4">
                      <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Tải lên file danh sách (.xlsx, .xls, .csv)</label>
                      <div className="mt-2 flex justify-center rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 px-6 py-10 hover:border-cyan-500 transition-colors bg-slate-50 dark:bg-slate-800/50">
                        <div className="text-center">
                          <Upload className="mx-auto h-12 w-12 text-slate-400" aria-hidden="true" />
                          <div className="mt-4 flex text-sm leading-6 text-slate-600 dark:text-slate-400">
                            <label className="relative cursor-pointer rounded-md font-semibold text-cyan-600 hover:text-cyan-500">
                              <span>Chọn file</span>
                              <input id="file-upload" name="file-upload" type="file" className="sr-only" accept=".xlsx,.xls,.csv" onChange={(e) => setExcelFile(e.target.files[0])} />
                            </label>
                            <p className="pl-1">hoặc kéo thả vào đây</p>
                          </div>
                          <p className="text-xs leading-5 text-slate-500 mt-2">Chỉ hỗ trợ file Excel / CSV (Cột đầu là Mã HS / SBD)</p>
                          {excelFile && <p className="mt-4 text-sm font-bold text-emerald-600 dark:text-emerald-400">File đã chọn: {excelFile.name}</p>}
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-100 dark:border-slate-700">
                      <button type="button" onClick={() => setShowAddStudentsModal(false)} className="px-5 py-2.5 rounded-xl font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700">Đóng</button>
                      <button type="button" onClick={handleImportExcel} disabled={!excelFile || importing} className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/20 disabled:opacity-50">
                        {importing && <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span>}
                        Bắt đầu Import
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {showRoomManager && (
          <ExamRoomManager 
            exam={selectedExam}
            candidates={candidates}
            onClose={() => setShowRoomManager(false)}
            onRefresh={() => fetchExamDetails(selectedExam.id)}
          />
        )}

      </div>
    );
  }

  // RENDER EXAM LIST VIEW
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <GraduationCap className="w-8 h-8 text-cyan-600" />
            Quản lý Kỳ Thi
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Tổ chức thi, nhập điểm và cấp học bổng
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-cyan-600/30 flex items-center space-x-2"
          >
            <Plus className="w-5 h-5" />
            <span>Tạo kỳ thi mới</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {exams.map(exam => (
          <div key={exam.id} className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
            {exam.status === 'completed' && <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>}
            
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-bold text-slate-800 dark:text-slate-200 text-lg">{exam.name}</h3>
                <p className="text-slate-500 dark:text-slate-400 text-sm mt-1 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4" />
                  {new Date(exam.exam_date).toLocaleDateString('vi-VN')}
                </p>
              </div>
              <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${getExamStatus(exam).colorClass}`}>
                {getExamStatus(exam).text}
              </span>
            </div>
            
            <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700 flex justify-between items-center">
              <div>
                {isAdmin && (
                  <button 
                    onClick={() => handleDeleteExam(exam.id, exam.name)} 
                    className="text-slate-400 hover:text-red-500 transition-colors p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
                    title="Xóa kỳ thi"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
              <div className="flex gap-2">

                <button onClick={() => fetchExamDetails(exam.id)} className="bg-cyan-50 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400 font-semibold text-sm px-4 py-2 rounded-lg hover:bg-cyan-100 dark:hover:bg-cyan-900/50 flex items-center gap-1">
                  <FileEdit className="w-4 h-4" />
                  Quản lý điểm
                </button>
              </div>
            </div>
          </div>
        ))}
        {exams.length === 0 && !loading && (
          <div className="col-span-full py-12 text-center border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl">
            <GraduationCap className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <p className="text-slate-500 dark:text-slate-400 font-medium">Chưa có kỳ thi nào. Hãy tạo mới!</p>
          </div>
        )}
      </div>

      {/* Modal Tạo Kỳ Thi */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowCreateModal(false)}></div>
          <div className="relative bg-white dark:bg-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl w-full max-w-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-6">Tạo kỳ thi mới</h2>
            <form onSubmit={handleCreateExam} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Tên kỳ thi</label>
                <input 
                  type="text" 
                  autoFocus
                  required
                  placeholder="VD: Thi Thử Tháng 10"
                  className="w-full p-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-cyan-500 outline-none"
                  value={newExam.name}
                  onChange={e => setNewExam({...newExam, name: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Ngày tổ chức</label>
                <input 
                  type="date" 
                  required
                  className="w-full p-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-cyan-500 outline-none"
                  value={newExam.exam_date}
                  onChange={e => setNewExam({...newExam, exam_date: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Loại kỳ thi</label>
                <input 
                  type="text" 
                  placeholder="VD: Thi Thử, Thi Học Kì..."
                  className="w-full p-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-cyan-500 outline-none"
                  value={newExam.exam_type}
                  onChange={e => setNewExam({...newExam, exam_type: e.target.value})}
                  list="exam-types"
                />
                <datalist id="exam-types">
                  <option value="Thi Thử (Định kỳ)"></option>
                  <option value="Thi Học Bổng"></option>
                </datalist>
              </div>

              {newExam.scoring_type === 'multiple_subjects' && (
                <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl space-y-3">
                  <div className="flex justify-between items-center">
                    <label className="block text-sm font-semibold text-amber-800 dark:text-amber-400">Cấu hình Môn thi & Hệ số</label>
                    <button type="button" onClick={() => {
                      setNewExam({
                        ...newExam, 
                        display_settings: {
                          ...newExam.display_settings,
                          subjects: [...newExam.display_settings.subjects, {name: 'Môn mới', multiplier: 1}]
                        }
                      })
                    }} className="text-xs bg-amber-200 dark:bg-amber-800 text-amber-800 dark:text-amber-200 px-2 py-1 rounded font-bold hover:bg-amber-300">
                      + Thêm môn
                    </button>
                  </div>
                  
                  <div className="space-y-2">
                    {newExam.display_settings.subjects.map((subj, idx) => (
                      <div key={idx} className="flex gap-2 items-center">
                        <input 
                          type="text" 
                          value={subj.name}
                          onChange={e => {
                            const newSubjects = [...newExam.display_settings.subjects];
                            newSubjects[idx].name = e.target.value;
                            setNewExam({...newExam, display_settings: {...newExam.display_settings, subjects: newSubjects}});
                          }}
                          className="flex-1 p-2 text-sm bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-700 rounded-lg focus:ring-1 focus:ring-amber-500"
                          placeholder="Tên môn"
                        />
                        <span className="text-sm font-bold text-slate-500">x</span>
                        <input 
                          type="number" 
                          min="0.1" 
                          step="0.1"
                          value={subj.multiplier}
                          onChange={e => {
                            const newSubjects = [...newExam.display_settings.subjects];
                            newSubjects[idx].multiplier = parseFloat(e.target.value) || 1;
                            setNewExam({...newExam, display_settings: {...newExam.display_settings, subjects: newSubjects}});
                          }}
                          className="w-16 p-2 text-sm text-center bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-700 rounded-lg focus:ring-1 focus:ring-amber-500"
                          title="Hệ số"
                        />
                        <button type="button" onClick={() => {
                          const newSubjects = newExam.display_settings.subjects.filter((_, i) => i !== idx);
                          setNewExam({...newExam, display_settings: {...newExam.display_settings, subjects: newSubjects}});
                        }} className="p-2 text-red-500 hover:bg-red-50 rounded-lg">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-xl space-y-3">
                <div className="flex justify-between items-center">
                  <label className="block text-sm font-semibold text-indigo-800 dark:text-indigo-400">Tạo sẵn Ca / Phòng thi</label>
                  <button type="button" onClick={() => {
                    setNewExam({
                      ...newExam,
                      shifts: [...newExam.shifts, {name: `Ca ${newExam.shifts.length + 1}`, start_time: '08:00', end_time: '10:00', room_count: 1, capacity_per_room: 24}]
                    })
                  }} className="text-xs bg-indigo-200 dark:bg-indigo-800 text-indigo-800 dark:text-indigo-200 px-2 py-1 rounded font-bold hover:bg-indigo-300">
                    + Thêm ca
                  </button>
                </div>
                
                <div className="space-y-3">
                  {newExam.shifts.map((shift, idx) => (
                    <div key={idx} className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-indigo-100 dark:border-indigo-700">
                      <div className="flex gap-2 items-center mb-2">
                        <input 
                          type="text" 
                          value={shift.name}
                          onChange={e => {
                            const newShifts = [...newExam.shifts];
                            newShifts[idx].name = e.target.value;
                            setNewExam({...newExam, shifts: newShifts});
                          }}
                          className="flex-1 p-2 text-sm font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                          placeholder="Tên ca"
                        />
                        <button type="button" onClick={() => {
                          const newShifts = newExam.shifts.filter((_, i) => i !== idx);
                          setNewExam({...newExam, shifts: newShifts});
                        }} className="p-2 text-red-500 hover:bg-red-50 rounded-lg">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="grid grid-cols-4 gap-2">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 mb-1">Bắt đầu</label>
                          <input type="time" value={shift.start_time} onChange={e => {
                            const newShifts = [...newExam.shifts];
                            newShifts[idx].start_time = e.target.value;
                            setNewExam({...newExam, shifts: newShifts});
                          }} className="w-full p-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 rounded-lg" />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 mb-1">Kết thúc</label>
                          <input type="time" value={shift.end_time} onChange={e => {
                            const newShifts = [...newExam.shifts];
                            newShifts[idx].end_time = e.target.value;
                            setNewExam({...newExam, shifts: newShifts});
                          }} className="w-full p-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 rounded-lg" />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 mb-1">Số phòng</label>
                          <input type="number" min="1" value={shift.room_count} onChange={e => {
                            const newShifts = [...newExam.shifts];
                            newShifts[idx].room_count = parseInt(e.target.value) || 1;
                            setNewExam({...newExam, shifts: newShifts});
                          }} className="w-full p-2 text-xs text-center bg-slate-50 dark:bg-slate-800 border border-slate-200 rounded-lg" />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 mb-1">Sức chứa/phòng</label>
                          <input type="number" min="1" value={shift.capacity_per_room} onChange={e => {
                            const newShifts = [...newExam.shifts];
                            newShifts[idx].capacity_per_room = parseInt(e.target.value) || 24;
                            setNewExam({...newExam, shifts: newShifts});
                          }} className="w-full p-2 text-xs text-center bg-slate-50 dark:bg-slate-800 border border-slate-200 rounded-lg" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setShowCreateModal(false)} className="px-5 py-2.5 rounded-xl font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700">Hủy</button>
                <button type="submit" className="px-5 py-2.5 rounded-xl font-bold bg-cyan-600 hover:bg-cyan-700 text-white shadow-lg shadow-cyan-600/20">
                  Tạo kỳ thi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
