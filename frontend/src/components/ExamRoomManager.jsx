import React, { useState } from 'react';
import { Settings, Users, Save, Plus, Trash2, Shuffle } from 'lucide-react';
import api from '../api/axios';
import { toast } from 'sonner';
import Swal from 'sweetalert2';

export default function ExamRoomManager({ exam, candidates, onClose, onRefresh }) {
  const [shifts, setShifts] = useState(exam.shifts || []);
  const [saving, setSaving] = useState(false);

  const handleAddShift = () => {
    setShifts([...shifts, { name: `Ca ${shifts.length + 1}`, start_time: '08:00', end_time: '10:00', rooms: [] }]);
  };

  const handleAddRoom = (shiftIndex) => {
    const newShifts = [...shifts];
    newShifts[shiftIndex].rooms.push({ name: `Phòng ${newShifts[shiftIndex].rooms.length + 1}`, capacity: 20 });
    setShifts(newShifts);
  };

  const handleSaveShifts = async () => {
    try {
      setSaving(true);
      await api.post(`/exams/${exam.id}/shifts`, { shifts });
      toast.success('Đã lưu cấu hình ca và phòng thi!');
      onRefresh();
    } catch (err) {
      toast.error('Lỗi khi lưu cấu hình');
    } finally {
      setSaving(false);
    }
  };

  const handleAutoAssign = async () => {
    if (shifts.length === 0 || shifts.every(s => s.rooms.length === 0)) {
      return toast.error('Vui lòng tạo ít nhất 1 ca và 1 phòng thi trước');
    }

    const unassignedCandidates = candidates.filter(c => !c.exam_room_id && !c.is_absent);
    if (unassignedCandidates.length === 0) {
      return toast.error('Tất cả thí sinh đã có phòng hoặc không có thí sinh mới.');
    }

    // Prepare rooms array with remaining capacity
    let availableRooms = [];
    shifts.forEach(shift => {
      shift.rooms.forEach(room => {
        // Count how many already in this room (if we had the room id, but currently shifts/rooms are recreated on save)
        // Since we recreate, we should ideally fetch the freshly saved shifts from backend.
        // Let's assume we use the existing candidates to count if shift.id and room.id matches.
        let occupied = 0;
        if (room.id) {
          occupied = candidates.filter(c => c.exam_room_id === room.id).length;
        }
        availableRooms.push({
          shift_id: room.exam_shift_id || shift.id,
          room_id: room.id,
          name: room.name,
          capacity: room.capacity - occupied
        });
      });
    });

    // Shuffle students randomly
    const shuffled = [...unassignedCandidates].sort(() => 0.5 - Math.random());
    const assignments = [];

    let currentRoomIndex = 0;
    
    // Assign
    for (let c of shuffled) {
      // Find a room with capacity
      while (currentRoomIndex < availableRooms.length && availableRooms[currentRoomIndex].capacity <= 0) {
        currentRoomIndex++;
      }

      if (currentRoomIndex >= availableRooms.length) {
        toast.error(`Không đủ phòng. Đã xếp ${assignments.length}/${shuffled.length} thí sinh.`);
        break;
      }

      assignments.push({
        candidate_id: c.id,
        exam_shift_id: availableRooms[currentRoomIndex].shift_id,
        exam_room_id: availableRooms[currentRoomIndex].room_id
      });
      availableRooms[currentRoomIndex].capacity--;
    }

    if (assignments.length > 0) {
      try {
        await api.post(`/exams/${exam.id}/auto-assign`, { assignments });
        toast.success(`Đã xếp phòng cho ${assignments.length} thí sinh!`);
        onRefresh();
      } catch (err) {
        toast.error('Lỗi khi lưu xếp phòng');
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-start mb-6">
          <div className="flex flex-col gap-1">
            <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <Settings className="w-5 h-5 text-cyan-600" />
              Quản lý Ca & Phòng thi - {exam.name}
            </h2>
            <div className="flex gap-3 ml-7 mt-1">
              <div className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-sm font-semibold text-slate-700 dark:text-slate-300">
                Tổng số: {candidates.filter(c => !c.is_absent).length} thí sinh
              </div>
              <div className="px-3 py-1 bg-red-50 dark:bg-red-900/30 rounded-lg text-sm font-semibold text-red-600 dark:text-red-400">
                Chưa xếp phòng: {candidates.filter(c => !c.exam_room_id && !c.is_absent).length} thí sinh
              </div>
            </div>
          </div>
          <div className="flex gap-2 mt-1">
            <button 
              onClick={handleAutoAssign}
              className="bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400 px-4 py-2 rounded-xl font-semibold hover:bg-indigo-100 flex items-center gap-2"
            >
              <Shuffle className="w-4 h-4" /> Tự động xếp phòng
            </button>
            <button 
              onClick={handleSaveShifts}
              disabled={saving}
              className="bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-2 rounded-xl font-bold shadow-lg shadow-cyan-600/30 flex items-center gap-2"
            >
              <Save className="w-4 h-4" /> Lưu cấu hình
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto space-y-4 p-1">
          {shifts.map((shift, sIdx) => (
            <div key={sIdx} className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
              <div className="flex gap-4 items-end mb-4">
                <div className="flex-1">
                  <label className="block text-xs font-bold text-slate-500 mb-1">Tên ca thi</label>
                  <input 
                    type="text" 
                    value={shift.name} 
                    onChange={e => {
                      const newShifts = [...shifts];
                      newShifts[sIdx].name = e.target.value;
                      setShifts(newShifts);
                    }}
                    className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-1 focus:ring-cyan-500"
                  />
                </div>
                <div className="w-32">
                  <label className="block text-xs font-bold text-slate-500 mb-1">Bắt đầu</label>
                  <input 
                    type="time" 
                    value={shift.start_time ? shift.start_time.substring(0, 5) : ''} 
                    onChange={e => {
                      const newShifts = [...shifts];
                      newShifts[sIdx].start_time = e.target.value;
                      setShifts(newShifts);
                    }}
                    className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-1 focus:ring-cyan-500 font-semibold text-slate-700 dark:text-slate-200 text-sm"
                  />
                </div>
                <div className="w-32">
                  <label className="block text-xs font-bold text-slate-500 mb-1">Kết thúc</label>
                  <input 
                    type="time" 
                    value={shift.end_time ? shift.end_time.substring(0, 5) : ''} 
                    onChange={e => {
                      const newShifts = [...shifts];
                      newShifts[sIdx].end_time = e.target.value;
                      setShifts(newShifts);
                    }}
                    className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-1 focus:ring-cyan-500 font-semibold text-slate-700 dark:text-slate-200 text-sm"
                  />
                </div>
                <button 
                  onClick={() => {
                    setShifts(shifts.filter((_, i) => i !== sIdx));
                  }}
                  className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>

              <div className="pl-4 border-l-2 border-cyan-200 dark:border-cyan-900/50 space-y-3">
                <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span>Danh sách Phòng thi</span>
                  <button onClick={() => handleAddRoom(sIdx)} className="text-cyan-600 text-xs flex items-center gap-1 hover:underline">
                    <Plus className="w-3 h-3" /> Thêm phòng
                  </button>
                </h4>
                
                <div className="grid grid-cols-2 gap-3">
                  {shift.rooms.map((room, rIdx) => (
                    <div key={rIdx} className="flex items-center gap-2 bg-white dark:bg-slate-800 p-2 rounded-lg border border-slate-200 dark:border-slate-700">
                      <input 
                        type="text" 
                        value={room.name} 
                        onChange={e => {
                          const newShifts = [...shifts];
                          newShifts[sIdx].rooms[rIdx].name = e.target.value;
                          setShifts(newShifts);
                        }}
                        className="flex-1 min-w-0 p-1.5 text-sm bg-transparent border-b border-slate-300 focus:border-cyan-500 outline-none"
                      />
                      <div className="w-20 relative">
                        <Users className="w-3 h-3 absolute left-2 top-2.5 text-slate-400" />
                        <input 
                          type="number" 
                          title="Sức chứa"
                          value={room.capacity} 
                          onChange={e => {
                            const newShifts = [...shifts];
                            newShifts[sIdx].rooms[rIdx].capacity = parseInt(e.target.value) || 0;
                            setShifts(newShifts);
                          }}
                          className="w-full pl-6 pr-2 py-1.5 text-sm bg-slate-50 dark:bg-slate-900 rounded border border-slate-300 outline-none focus:border-cyan-500"
                        />
                      </div>
                      <button 
                        onClick={() => {
                          const newShifts = [...shifts];
                          newShifts[sIdx].rooms = newShifts[sIdx].rooms.filter((_, i) => i !== rIdx);
                          setShifts(newShifts);
                        }}
                        className="text-red-400 hover:text-red-600 p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}

          <button onClick={handleAddShift} className="w-full py-4 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl text-slate-500 hover:border-cyan-500 hover:text-cyan-600 transition-colors font-semibold flex items-center justify-center gap-2">
            <Plus className="w-5 h-5" /> Thêm Ca thi mới
          </button>
        </div>

      </div>
    </div>
  );
}
