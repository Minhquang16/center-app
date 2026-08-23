<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Exam;
use App\Models\ExamCandidate;
use App\Models\Student;
use App\Models\Classes;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Maatwebsite\Excel\Facades\Excel;
use App\Imports\ExamCandidatesImport;
use App\Exports\ExamResultsExport;
use App\Models\ExamShift;
use App\Models\ExamRoom;
use App\Models\Notification;

class ExamController extends Controller
{
    public function index()
    {
        $exams = Exam::orderBy('exam_date', 'desc')->get();
        return response()->json($exams);
    }

    public function store(Request $request)
    {
        if (auth()->user()->role !== 'admin') {
            return response()->json(['message' => 'Bạn không có quyền tạo kỳ thi'], 403);
        }

        $request->validate([
            'name' => 'required|string|max:255',
            'exam_date' => 'required|date',
            'scoring_type' => 'required|in:multiple_subjects,single_total'
        ]);

        $exam = DB::transaction(function() use ($request) {
            $exam = Exam::create($request->except('shifts'));
            
            $shifts = $request->input('shifts', []);
            foreach ($shifts as $shiftData) {
                $shift = ExamShift::create([
                    'exam_id' => $exam->id,
                    'name' => $shiftData['name'],
                    'start_time' => $shiftData['start_time'] ?? null,
                    'end_time' => $shiftData['end_time'] ?? null
                ]);

                $roomCount = intval($shiftData['room_count'] ?? 0);
                $capacity = intval($shiftData['capacity_per_room'] ?? 20);
                
                for ($i = 1; $i <= $roomCount; $i++) {
                    ExamRoom::create([
                        'exam_shift_id' => $shift->id,
                        'name' => 'Phòng ' . str_pad($i, 2, '0', STR_PAD_LEFT), // Phòng 01, Phòng 02
                        'capacity' => $capacity
                    ]);
                }
            }
            
            return $exam;
        });

        return response()->json($exam, 201);
    }

    public function show($id)
    {
        $exam = Exam::with('shifts.rooms')->findOrFail($id);
        $candidates = ExamCandidate::with(['student', 'shift', 'room'])->where('exam_id', $id)->get();
        
        return response()->json([
            'exam' => $exam,
            'candidates' => $candidates
        ]);
    }

    public function update(Request $request, $id)
    {
        $exam = Exam::findOrFail($id);
        $exam->update($request->only(['name', 'exam_date', 'scoring_type', 'status']));
        return response()->json($exam);
    }

    public function destroy($id)
    {
        if (auth()->user()->role !== 'admin') {
            return response()->json(['message' => 'Bạn không có quyền xóa kỳ thi'], 403);
        }

        $exam = Exam::findOrFail($id);
        $exam->delete();
        return response()->json(['message' => 'Deleted successfully']);
    }

    // Thêm học sinh vào kỳ thi (Tạo SBD tự động)
    public function addCandidates(Request $request, $id)
    {
        $exam = Exam::findOrFail($id);
        $studentIds = $request->input('student_ids', []); // Array of student IDs to add
        
        $addedCount = 0;
        foreach ($studentIds as $studentId) {
            // Check if already in exam
            if (ExamCandidate::where('exam_id', $id)->where('student_id', $studentId)->exists()) {
                continue;
            }

            $student = Student::find($studentId);
            if (!$student) continue;

            $grade = $student->grade ?: 1;
            
            // Format grade to 2 digits (e.g. 01, 12)
            $gradePrefix = str_pad($grade, 2, '0', STR_PAD_LEFT);

            // Find max sequence for this grade in this exam
            $latestCandidate = ExamCandidate::where('exam_id', $id)
                ->where('candidate_number', 'LIKE', $gradePrefix . '%')
                ->orderBy('candidate_number', 'desc')
                ->first();

            if ($latestCandidate) {
                // Extract sequence
                $seq = intval(substr($latestCandidate->candidate_number, 2));
                $newSeq = $seq + 1;
            } else {
                $newSeq = 1;
            }

            $sbd = $gradePrefix . str_pad($newSeq, 3, '0', STR_PAD_LEFT);

            ExamCandidate::create([
                'exam_id' => $id,
                'student_id' => $studentId,
                'candidate_number' => $sbd
            ]);
            $addedCount++;
        }

        return response()->json(['message' => "Đã thêm {$addedCount} thí sinh vào kỳ thi"]);
    }

    // Import học sinh vãng lai từ Excel
    public function importExcel(Request $request, $id)
    {
        $request->validate([
            'file' => 'required|file|max:10240'
        ]);

        $file = $request->file('file');
        $extension = strtolower($file->getClientOriginalExtension());
        
        if (!in_array($extension, ['xlsx', 'xls', 'csv'])) {
            return response()->json(['message' => 'File không đúng định dạng. Vui lòng tải lên file .xlsx, .xls hoặc .csv'], 422);
        }

        $exam = Exam::findOrFail($id);

        try {
            $import = new ExamCandidatesImport($id);
            Excel::import($import, $file);

            $count = $import->getAddedCount();
            return response()->json(['message' => "Đã import và thêm {$count} thí sinh vào kỳ thi"]);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Lỗi import: ' . $e->getMessage()], 500);
        }
    }

    // Lưu điểm hàng loạt
    public function bulkSaveScores(Request $request, $id)
    {
        $exam = Exam::findOrFail($id);
        $updates = $request->input('updates', []); // Array of { id, scores, total_score, note }

        DB::transaction(function() use ($updates) {
            foreach ($updates as $data) {
                $candidate = ExamCandidate::find($data['id']);
                if ($candidate) {
                    $candidate->update([
                        'scores' => array_key_exists('scores', $data) ? $data['scores'] : $candidate->scores,
                        'total_score' => array_key_exists('total_score', $data) ? $data['total_score'] : $candidate->total_score,
                        'note' => array_key_exists('note', $data) ? $data['note'] : $candidate->note,
                        'is_absent' => array_key_exists('is_absent', $data) ? $data['is_absent'] : $candidate->is_absent
                    ]);
                }
            }
        });

        return response()->json(['message' => 'Đã lưu điểm thành công']);
    }

    // Chốt kỳ thi và tự động xếp hạng
    public function finalizeExam($id)
    {
        if (auth()->user()->role !== 'admin') {
            return response()->json(['message' => 'Chỉ Admin mới có quyền chốt kỳ thi'], 403);
        }

        $exam = Exam::findOrFail($id);
        
        if ($exam->status == 'completed') {
            return response()->json(['message' => 'Kỳ thi đã được chốt'], 400);
        }

        DB::transaction(function() use ($exam, $id) {
            $candidates = ExamCandidate::where('exam_id', $id)
                ->whereNotNull('total_score')
                ->orderBy('total_score', 'desc')
                ->get();

            $rank = 1;
            $displayRank = 1;
            $prevScore = null;
            $scholarshipsAwarded = 0;
            
            // Xếp hạng (Ranking)
            foreach ($candidates as $candidate) {
                if ($prevScore !== null) {
                    if ($candidate->total_score == $prevScore) {
                        $candidate->rank = $displayRank;
                    } else {
                        $displayRank = $rank;
                        $candidate->rank = $displayRank;
                    }
                } else {
                    $candidate->rank = $displayRank;
                }
                $prevScore = $candidate->total_score;
                
                if ($candidate->rank <= 3 && $scholarshipsAwarded < 3) {
                    $candidate->is_scholarship = true;
                    // Tăng số lần học bổng của học sinh
                    $student = Student::find($candidate->student_id);
                    if ($student) {
                        $student->scholarship_count += 1;
                        $student->save();
                    }
                    $scholarshipsAwarded++;
                } else {
                    $candidate->is_scholarship = false;
                }
                $candidate->save();
                $rank++;
            }

            $exam->status = 'completed';
            $exam->save();
        });

        return response()->json(['message' => 'Đã chốt kỳ thi và xếp hạng thành công']);
    }

    // Public lookup
    public function lookup(Request $request)
    {
        $studentCode = $request->input('student_code');
        $parentPhone = $request->input('parent_phone');

        if (!$studentCode || !$parentPhone) {
            return response()->json(['message' => 'Vui lòng nhập Mã học sinh và SĐT Phụ huynh'], 400);
        }

        $student = Student::where('student_code', $studentCode)
            ->where('parent_phone', $parentPhone)
            ->first();

        if (!$student) {
            return response()->json(['message' => 'Thông tin không chính xác'], 404);
        }

        // Lấy kết quả kỳ thi gần nhất đã chốt
        $latestExamCandidate = ExamCandidate::with('exam')
            ->where('student_id', $student->id)
            ->whereHas('exam', function($q) {
                $q->where('status', 'completed');
            })
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json([
            'student' => [
                'full_name' => $student->full_name,
                'student_code' => $student->student_code,
                'grade' => $student->grade
            ],
            'results' => $latestExamCandidate
        ]);
    }

    public function exportExcel(Request $request, $id)
    {
        $exam = Exam::findOrFail($id);
        $shiftId = $request->query('shift_id');
        $roomId = $request->query('room_id');

        return Excel::download(new ExamResultsExport($id, $shiftId, $roomId), 'Diem_Thi_' . \Str::slug($exam->name) . '.xlsx');
    }

    public function storeShifts(Request $request, $id)
    {
        if (auth()->user()->role !== 'admin') {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $shifts = $request->input('shifts', []); // [{name, start_time, end_time, rooms: [{name, capacity}]}]
        DB::transaction(function() use ($id, $shifts) {
            // Delete old shifts & rooms for this exam (assuming rewrite)
            ExamShift::where('exam_id', $id)->delete();
            
            foreach ($shifts as $shiftData) {
                $shift = ExamShift::create([
                    'exam_id' => $id,
                    'name' => $shiftData['name'],
                    'start_time' => $shiftData['start_time'] ?? null,
                    'end_time' => $shiftData['end_time'] ?? null
                ]);

                if (!empty($shiftData['rooms'])) {
                    foreach ($shiftData['rooms'] as $roomData) {
                        ExamRoom::create([
                            'exam_shift_id' => $shift->id,
                            'name' => $roomData['name'],
                            'capacity' => $roomData['capacity'] ?? 20
                        ]);
                    }
                }
            }
        });

        return response()->json(['message' => 'Lưu ca thi thành công']);
    }

    public function autoAssignRooms(Request $request, $id)
    {
        if (auth()->user()->role !== 'admin') {
            return response()->json(['message' => 'Unauthorized'], 403);
        }
        
        $assignments = $request->input('assignments', []);
        
        DB::transaction(function() use ($id, $assignments) {
            if (empty($assignments)) {
                // Backend auto-assign logic
                $exam = Exam::with('shifts.rooms')->findOrFail($id);
                $unassignedCandidates = ExamCandidate::where('exam_id', $id)
                    ->whereNull('exam_room_id')
                    ->where('is_absent', false)
                    ->inRandomOrder()
                    ->get();

                if ($unassignedCandidates->isEmpty()) {
                    return;
                }

                $availableRooms = [];
                foreach ($exam->shifts as $shift) {
                    foreach ($shift->rooms as $room) {
                        $occupied = ExamCandidate::where('exam_room_id', $room->id)->count();
                        if ($occupied < $room->capacity) {
                            $availableRooms[] = [
                                'shift_id' => $shift->id,
                                'room_id' => $room->id,
                                'capacity' => $room->capacity - $occupied
                            ];
                        }
                    }
                }

                $currentRoomIndex = 0;
                foreach ($unassignedCandidates as $candidate) {
                    while ($currentRoomIndex < count($availableRooms) && $availableRooms[$currentRoomIndex]['capacity'] <= 0) {
                        $currentRoomIndex++;
                    }

                    if ($currentRoomIndex >= count($availableRooms)) {
                        break; // No more capacity
                    }

                    $candidate->update([
                        'exam_shift_id' => $availableRooms[$currentRoomIndex]['shift_id'],
                        'exam_room_id' => $availableRooms[$currentRoomIndex]['room_id']
                    ]);
                    $availableRooms[$currentRoomIndex]['capacity']--;
                }
            } else {
                // Client provided assignments
                foreach ($assignments as $a) {
                    $candidate = ExamCandidate::find($a['candidate_id']);
                    if ($candidate) {
                        $candidate->update([
                            'exam_shift_id' => $a['exam_shift_id'],
                            'exam_room_id' => $a['exam_room_id']
                        ]);
                    }
                }
            }
        });

        return response()->json(['message' => 'Lưu xếp phòng thành công']);
    }

    public function changeCandidateRoom(Request $request, $id)
    {
        if (auth()->user()->role !== 'admin') {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $shiftId = $request->input('exam_shift_id');
        $roomId = $request->input('exam_room_id');
        
        $candidate = ExamCandidate::findOrFail($id);
        $oldShift = $candidate->shift;
        $oldRoom = $candidate->room;

        $candidate->update([
            'exam_shift_id' => $shiftId,
            'exam_room_id' => $roomId
        ]);

        $newShift = ExamShift::find($shiftId);
        $newRoom = ExamRoom::find($roomId);

        // Notify
        $studentName = $candidate->student ? $candidate->student->full_name : 'Học sinh';
        $message = "Đã chuyển $studentName từ " . 
            ($oldShift ? $oldShift->name : 'chưa có ca') . " (" . ($oldRoom ? $oldRoom->name : 'chưa có phòng') . ") " .
            "sang " . 
            ($newShift ? $newShift->name : 'chưa có ca') . " (" . ($newRoom ? $newRoom->name : 'chưa có phòng') . ")";

        Notification::create([
            'message' => $message,
            'type' => 'info',
            'user_id' => null // Broadcast
        ]);

        return response()->json(['message' => 'Chuyển phòng thành công']);
    }
}
