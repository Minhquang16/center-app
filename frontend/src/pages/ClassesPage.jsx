import React, { useState, useEffect } from 'react';
import { Users, Shield, Calendar, Clock, BookOpen, ChevronRight, CheckCircle2, Plus, Edit, Trash2, X } from 'lucide-react';
import api from '../api/axios';
import { toast } from 'sonner';

import StudentsPage from './StudentsPage';
import UsersPage from './UsersPage';

function ClassOverview() {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedClass, setSelectedClass] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [showBulkEditModal, setShowBulkEditModal] = useState(false);
  const [bulkEditClassType, setBulkEditClassType] = useState('');
  const [loadingStudents, setLoadingStudents] = useState(false);

  const handleBulkUpdateClass = async () => {
    if (selectedStudents.length === 0) return;
    try {
      await api.post('/students/bulk-update-class', {
        student_ids: selectedStudents,
        class_type: bulkEditClassType === '' ? null : bulkEditClassType
      });
      toast.success('Đã chuyển lớp hàng loạt thành công');
      setShowBulkEditModal(false);
      setSelectedStudents([]);
      // Reload classes to reflect changes
      fetchClasses();
      // Reload selected class if it was updated
      setSelectedClass(null);
    } catch (err) {
      toast.error('Lỗi chuyển lớp: ' + (err.response?.data?.message || err.message));
    }
  };
  const [editForm, setEditForm] = useState({
    id: null,
    name: '',
    class_code: '',
    grade: '',
    schedules: []
  });

  useEffect(() => {
    fetchClasses();
  }, []);

  const fetchClasses = async () => {
    try {
      const res = await api.get('/classes/with-students');
      setClasses(res.data);
      // If a class is currently selected, update its student list
      if (selectedClass) {
         openClassDetail(res.data.find(c => c.id === selectedClass.id) || null);
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Lỗi khi tải danh sách lớp học');
    } finally {
      setLoading(false);
    }
  };

  const openClassDetail = async (c) => {
    if (!c) {
      setSelectedClass(null);
      return;
    }
    setSelectedClass(c); // Show UI immediately (can show a loading indicator inside)
    setLoadingStudents(true);
    try {
      const res = await api.get(`/classes/${c.id}/students`);
      setSelectedClass({...c, students: res.data});
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi khi tải danh sách học sinh của lớp');
    } finally {
      setLoadingStudents(false);
    }
  };

  const getTodayClasses = () => {
    const today = new Date().getDay(); 
    const todayFormat = today === 0 ? 8 : today + 1;
    
    return classes.filter(c => {
      if (!c.schedules) return false;
      return c.schedules.some(s => parseInt(s.dayOfWeek) === todayFormat);
    });
  };

  const todayClasses = getTodayClasses();

  const handleSaveClass = async (e) => {
    e.preventDefault();
    try {
      if (editForm.id) {
        await api.put(`/classes/${editForm.id}`, editForm);
        toast.success('Cập nhật lớp thành công');
      } else {
        await api.post('/classes', editForm);
        toast.success('Tạo lớp thành công');
      }
      setShowModal(false);
      fetchClasses();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi khi lưu lớp học');
    }
  };

  const handleDeleteClass = async (id) => {
    if (!window.confirm('Bạn có chắc muốn xóa lớp này?')) return;
    try {
      await api.delete(`/classes/${id}`);
      toast.success('Xóa lớp thành công');
      if (selectedClass?.id === id) setSelectedClass(null);
      fetchClasses();
    } catch (err) {
      toast.error('Lỗi khi xóa lớp');
    }
  };

  const openCreateModal = () => {
    setEditForm({ id: null, name: '', class_code: '', grade: '', schedules: [] });
    setShowModal(true);
  };

  const openEditModal = (c, e) => {
    e.stopPropagation();
    setEditForm({ 
      id: c.id, 
      name: c.name, 
      class_code: c.class_code, 
      grade: c.grade || '', 
      schedules: c.schedules || [] 
    });
    setShowModal(true);
  };

  const addSchedule = () => {
    setEditForm({
      ...editForm,
      schedules: [...editForm.schedules, { dayOfWeek: 2, startTime: '18:00', endTime: '19:30' }]
    });
  };

  const updateSchedule = (index, field, value) => {
    const newSchedules = [...editForm.schedules];
    newSchedules[index][field] = value;
    setEditForm({ ...editForm, schedules: newSchedules });
  };

  const removeSchedule = (index) => {
    const newSchedules = editForm.schedules.filter((_, i) => i !== index);
    setEditForm({ ...editForm, schedules: newSchedules });
  };

  if (selectedClass) {
    const isAllSelected = Boolean(selectedClass.students && selectedClass.students.length > 0 && selectedStudents.length === selectedClass.students.length);
    const toggleSelectAll = () => {
      if (isAllSelected) {
        setSelectedStudents([]);
      } else {
        setSelectedStudents((selectedClass.students || []).map(s => s.id));
      }
    };

    return (
      <div className="space-y-6">
        <button onClick={() => setSelectedClass(null)} className="text-sm font-semibold text-slate-500 hover:text-cyan-600 flex items-center gap-1">
          &larr; Quay lại danh sách lớp
        </button>
        <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">{selectedClass.name} ({selectedClass.class_code})</h2>
              <div className="flex gap-4 text-sm text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1"><BookOpen className="w-4 h-4"/> Khối {selectedClass.grade}</span>
                <span className="flex items-center gap-1"><Users className="w-4 h-4"/> {selectedClass.students?.length || 0} học sinh</span>
              </div>
            </div>
            <div className="flex gap-2">
              {selectedStudents.length > 0 ? (
                <button onClick={() => setShowBulkEditModal(true)} className="bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-md shadow-cyan-500/20 transition-all flex items-center gap-2">
                  Chuyển lớp ({selectedStudents.length})
                </button>
              ) : null}
              <button onClick={(e) => openEditModal(selectedClass, e)} className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 p-2 rounded-xl transition-colors">
                <Edit className="w-5 h-5 text-slate-600 dark:text-slate-300" />
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900/50">
                  <th className="p-4 w-12 text-center">
                    <input type="checkbox" className="w-4 h-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500 cursor-pointer" checked={isAllSelected} onChange={toggleSelectAll} />
                  </th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase">Mã HS</th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase">Họ và tên</th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase">Liên hệ (Phụ huynh)</th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase text-center">Buổi học trong tháng</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {loadingStudents ? (
                  <tr><td colSpan="5" className="p-8 text-center text-slate-500">Đang tải danh sách học sinh...</td></tr>
                ) : (
                  <>
                    {selectedClass.students?.map(student => (
                  <tr key={student.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                    <td className="p-4 text-center">
                      <input type="checkbox" className="w-4 h-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500 cursor-pointer" checked={selectedStudents.includes(student.id)} onChange={() => {
                        if (selectedStudents.includes(student.id)) {
                          setSelectedStudents(selectedStudents.filter(id => id !== student.id));
                        } else {
                          setSelectedStudents([...selectedStudents, student.id]);
                        }
                      }} />
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-cyan-600">{student.student_code}</td>
                    <td className="px-4 py-3 font-bold text-slate-800 dark:text-slate-200">{student.full_name}</td>
                    <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">
                      <div className="font-medium">{student.parent_name || '-'}</div>
                      {student.parent_phone && <div className="font-mono text-slate-500 text-[11px] mt-0.5">{student.parent_phone}</div>}
                    </td>
                    <td className="px-4 py-3 text-sm font-bold text-center text-cyan-600 dark:text-cyan-400">{student.attended_this_month || 0} buổi</td>
                  </tr>
                ))}
                {(!selectedClass.students || selectedClass.students.length === 0) && !loadingStudents && (
                  <tr><td colSpan="5" className="p-8 text-center text-slate-500">Lớp này chưa có học sinh nào.</td></tr>
                )}
                  </>
                )}
              </tbody>
            </table>
          </div>
        </div>
        {showModal && renderClassModal()}
        {showBulkEditModal && renderBulkEditModal()}
      </div>
    );
  }

  function renderBulkEditModal() {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowBulkEditModal(false)}></div>
        <div className="relative bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-2xl w-full max-w-md">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-slate-800 dark:text-white">Chuyển lớp hàng loạt</h2>
            <button onClick={() => setShowBulkEditModal(false)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"><X className="w-5 h-5 text-slate-500" /></button>
          </div>
          <div className="mb-4 text-sm text-slate-600 dark:text-slate-400">
            Bạn đang chọn <b>{selectedStudents.length}</b> học sinh. Vui lòng chọn lớp mới để chuyển các học sinh này sang.
          </div>
          <div className="mb-6">
            <label className="block text-sm font-semibold mb-2 text-slate-700 dark:text-slate-300">Lớp học đích</label>
            <select
              value={bulkEditClassType}
              onChange={(e) => setBulkEditClassType(e.target.value)}
              className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-cyan-500 font-semibold"
            >
              <option value="">-- Xóa khỏi lớp hiện tại (Không gán lớp) --</option>
              {classes.map(c => (
                <option key={c.id} value={c.class_code}>{c.name} ({c.class_code}) - Khối {c.grade}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-3 justify-end">
            <button onClick={() => setShowBulkEditModal(false)} className="px-5 py-2.5 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-300 transition-colors">
              Hủy
            </button>
            <button onClick={handleBulkUpdateClass} className="px-5 py-2.5 rounded-xl font-bold bg-cyan-600 hover:bg-cyan-700 text-white shadow-md shadow-cyan-500/20 transition-all">
              Xác nhận
            </button>
          </div>
        </div>
      </div>
    );
  }

  function renderClassModal() {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowModal(false)}></div>
        <div className="relative bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-6">
            {editForm.id ? 'Sửa thông tin Lớp' : 'Tạo Lớp mới'}
          </h2>
          <form onSubmit={handleSaveClass} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-1.5 text-slate-700 dark:text-slate-300">Tên lớp</label>
                <input required type="text" className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-cyan-500" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} placeholder="VD: Toán 10A1" />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1.5 text-slate-700 dark:text-slate-300">Mã lớp</label>
                <input required type="text" className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-cyan-500" value={editForm.class_code} onChange={e => setEditForm({...editForm, class_code: e.target.value})} placeholder="VD: T10A1" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1.5 text-slate-700 dark:text-slate-300">Khối</label>
              <input type="number" min="1" max="12" className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-cyan-500" value={editForm.grade} onChange={e => setEditForm({...editForm, grade: e.target.value})} placeholder="VD: 10" />
            </div>

            <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-xl space-y-3 mt-4">
              <div className="flex justify-between items-center">
                <label className="block text-sm font-bold text-indigo-800 dark:text-indigo-400">Thời khóa biểu / Ca học</label>
                <button type="button" onClick={addSchedule} className="text-xs bg-indigo-200 dark:bg-indigo-800 text-indigo-800 dark:text-indigo-200 px-3 py-1.5 rounded-lg font-bold hover:bg-indigo-300 transition-colors">
                  + Thêm lịch học
                </button>
              </div>
              
              <div className="space-y-2">
                {editForm.schedules.map((s, idx) => (
                  <div key={idx} className="flex gap-2 items-center bg-white dark:bg-slate-900 p-2 rounded-xl border border-indigo-100 dark:border-indigo-700">
                    <select 
                      className="p-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none flex-1"
                      value={s.dayOfWeek}
                      onChange={e => updateSchedule(idx, 'dayOfWeek', e.target.value)}
                    >
                      <option value="2">Thứ 2</option>
                      <option value="3">Thứ 3</option>
                      <option value="4">Thứ 4</option>
                      <option value="5">Thứ 5</option>
                      <option value="6">Thứ 6</option>
                      <option value="7">Thứ 7</option>
                      <option value="8">Chủ nhật</option>
                    </select>
                    <input type="time" className="p-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none" value={s.startTime} onChange={e => updateSchedule(idx, 'startTime', e.target.value)} required />
                    <span className="text-slate-400">-</span>
                    <input type="time" className="p-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none" value={s.endTime} onChange={e => updateSchedule(idx, 'endTime', e.target.value)} required />
                    <button type="button" onClick={() => removeSchedule(idx)} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                {editForm.schedules.length === 0 && (
                  <div className="text-xs text-slate-500 italic p-2 text-center">Chưa có lịch học nào. Nhấn Thêm lịch học để tạo Ca học.</div>
                )}
              </div>
            </div>

            <div className="pt-4 flex justify-end gap-3 border-t border-slate-100 dark:border-slate-700 mt-4">
              <button type="button" onClick={() => setShowModal(false)} className="px-5 py-2.5 rounded-xl font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700">Hủy</button>
              <button type="submit" className="px-5 py-2.5 rounded-xl font-bold bg-cyan-600 hover:bg-cyan-700 text-white shadow-lg shadow-cyan-600/20">
                {editForm.id ? 'Lưu thay đổi' : 'Tạo lớp'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Học sinh học ngày hôm nay */}
      <div className="relative overflow-hidden bg-gradient-to-r from-blue-700 to-blue-500 rounded-3xl p-6 text-white shadow-lg shadow-blue-500/20">
        {/* Background decorative icons */}
        <div className="absolute right-4 -bottom-4 opacity-10 pointer-events-none transition-transform">
          <div className="relative">
            <Calendar className="w-32 h-32" />
            <div className="absolute -bottom-2 -right-2 bg-blue-600 rounded-full p-2">
              <Clock className="w-12 h-12" />
            </div>
          </div>
        </div>

        <div className="relative z-10">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><Calendar className="w-6 h-6" /> Lớp học hôm nay</h2>
          {todayClasses.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {todayClasses.map(c => (
                <div key={c.id} onClick={() => openClassDetail(c)} className="bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/20 rounded-2xl p-4 cursor-pointer transition-all">
                  <h3 className="font-bold text-lg">{c.name}</h3>
                  <div className="text-cyan-100 text-sm mt-1">{c.class_code}</div>
                  <div className="mt-3 flex items-center justify-between text-sm">
                    <span className="flex items-center gap-1"><Users className="w-4 h-4"/> {c.student_count || 0} HS</span>
                    <span className="flex items-center gap-1 font-semibold">
                      {c.schedules?.find(s => parseInt(s.dayOfWeek) === (new Date().getDay() === 0 ? 8 : new Date().getDay() + 1))?.startTime}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-blue-100">
              Không có lớp nào có lịch học vào ngày hôm nay.
            </div>
          )}
        </div>
      </div>

      {/* Tất cả lớp động */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-cyan-600" /> Tất cả Lớp học
          </h2>
          <button onClick={openCreateModal} className="bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-2 rounded-xl font-bold transition-all shadow-lg shadow-cyan-600/30 flex items-center gap-2 text-sm">
            <Plus className="w-4 h-4" /> Tạo Lớp
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {classes.map(c => (
            <div key={c.id} onClick={() => openClassDetail(c)} className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm cursor-pointer hover:shadow-md hover:border-cyan-500 transition-all group relative">
              <div className="absolute top-4 right-4 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={(e) => openEditModal(c, e)} className="p-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 rounded-lg text-slate-600 dark:text-slate-300 transition-colors">
                  <Edit className="w-4 h-4" />
                </button>
                <button onClick={(e) => { e.stopPropagation(); handleDeleteClass(c.id); }} className="p-1.5 bg-red-50 hover:bg-red-100 dark:bg-red-900/30 dark:hover:bg-red-900/50 rounded-lg text-red-500 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="flex justify-between items-start mb-3 pr-16">
                <h3 className="font-bold text-slate-800 dark:text-slate-200 group-hover:text-cyan-600 transition-colors text-lg truncate">{c.name}</h3>
              </div>
              <div className="space-y-2">
                <span className="bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs px-2 py-1 rounded font-mono font-semibold">{c.class_code}</span>
                <div className="flex items-center text-sm text-slate-500 dark:text-slate-400 gap-2 mt-2">
                  <Users className="w-4 h-4" /> Sĩ số: {c.student_count || 0} học sinh
                </div>
                {c.schedules && c.schedules.length > 0 ? (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {c.schedules.map((s, idx) => (
                      <span key={idx} className="bg-cyan-50 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-400 text-xs px-2 py-1 rounded-md border border-cyan-100 dark:border-cyan-800">
                        T{s.dayOfWeek}: {s.startTime}-{s.endTime}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-slate-400 italic mt-2">Chưa thiết lập lịch học</div>
                )}
              </div>
            </div>
          ))}
          {classes.length === 0 && !loading && (
            <div className="col-span-full py-12 text-center border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl text-slate-500">
              Chưa có lớp học nào.
            </div>
          )}
        </div>
      </div>
      
      {showModal && renderClassModal()}
    </div>
  );
}

export default function ClassesPage() {
  const [activeTab, setActiveTab] = useState('overview');
  
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const userPerms = user.permissions || [];
  const hasManageUsers = userPerms.includes('manage_users');

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-800 dark:text-white flex items-center gap-3">
            <BookOpen className="w-8 h-8 text-cyan-600" />
            Quản lý Lớp học
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2">
            Điều hành lịch học, theo dõi lớp và nhân sự.
          </p>
        </div>
      </div>

      <div className="flex overflow-x-auto hide-scrollbar bg-slate-200/50 dark:bg-slate-800/50 p-1 rounded-2xl max-w-fit">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${activeTab === 'overview' ? 'bg-white dark:bg-slate-700 text-cyan-600 dark:text-cyan-400 shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:bg-white/50 dark:hover:bg-slate-700/50'}`}
        >
          <Calendar className="w-4 h-4" /> Lịch & Lớp
        </button>
        <button
          onClick={() => setActiveTab('students')}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${activeTab === 'students' ? 'bg-white dark:bg-slate-700 text-cyan-600 dark:text-cyan-400 shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:bg-white/50 dark:hover:bg-slate-700/50'}`}
        >
          <Users className="w-4 h-4" /> Học sinh
        </button>
        {hasManageUsers && (
          <button
            onClick={() => setActiveTab('users')}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${activeTab === 'users' ? 'bg-white dark:bg-slate-700 text-cyan-600 dark:text-cyan-400 shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:bg-white/50 dark:hover:bg-slate-700/50'}`}
          >
            <Shield className="w-4 h-4" /> Tài khoản
          </button>
        )}
      </div>

      <div className="pt-2">
        {activeTab === 'overview' && <ClassOverview />}
        {activeTab === 'students' && <StudentsPage isEmbedded={true} />}
        {activeTab === 'users' && <UsersPage isEmbedded={true} />}
      </div>
    </div>
  );
}
