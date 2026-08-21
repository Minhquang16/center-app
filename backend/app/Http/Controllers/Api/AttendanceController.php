<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Student;
use App\Models\Attendance;
use App\Models\AuditLog;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
class AttendanceController extends Controller
{
    // 1. Quét / Nhập mã điểm danh lẻ 1 học sinh
    public function checkIn(Request $request)
    {
        $request->validate([
            'student_code' => 'required|string',
            'class_id'     => 'required|integer',
            'shift'        => 'required|string',
            'is_makeup'    => 'nullable|boolean',
        ]);

        $student = Student::where('student_code', trim($request->student_code))->first();

        if (!$student) {
            return response()->json(['message' => 'Không tìm thấy học sinh với mã này!'], 404);
        }

        $now = Carbon::now();
        $normalizedShift = $this->normalizeShiftKey($request->shift);
        $mins = $now->hour * 60 + $now->minute;
        $shiftStart = $this->getShiftStartTime($now, $normalizedShift);
        
        if ($mins < $shiftStart) {
            return response()->json(['message' => "Chưa đến giờ điểm danh của Ca " . preg_replace('/[^0-9]/', '', $normalizedShift) . ". Vui lòng đợi đến giờ vào ca!"], 400);
        }

        // Lấy giá tiền 1 buổi hiện tại của học sinh (mặc định 130.000đ nếu chưa cài)
        $currentFee = $student->price_per_session ?? 130000;
        $userId = auth('sanctum')->id(); // Get logged in user

        $attendance = Attendance::create([
            'student_id'     => $student->id,
            'class_model_id' => 1, // Legacy or placeholder
            'class_id'       => $request->class_id,
            'shift'          => $request->shift,
            'created_by'     => $userId,
            'checked_at'     => Carbon::now(),
            'status'         => $request->boolean('is_makeup') ? 'makeup' : 'present',
            'session_fee'    => $currentFee, 
        ]);

        // Ghi log lưu vết
        \App\Models\AttendanceLog::create([
            'user_id' => $userId,
            'class_id' => $request->class_id,
            'shift' => $request->shift,
            'action_type' => 'check_in',
            'student_count' => 1
        ]);

        AuditLog::create([
            'user_id' => $userId,
            'student_id' => $student->id,
            'attendance_id' => $attendance->id,
            'action' => 'check_in',
            'new_data' => json_encode(['status' => $attendance->status, 'shift' => $request->shift]),
            'reason' => $request->boolean('is_makeup') ? 'Điểm danh học bù' : 'Điểm danh cá nhân'
        ]);

        return response()->json([
            'message' => 'Điểm danh thành công!',
            'student' => $student,
            'time'    => $attendance->checked_at->format('H:i:s - d/m/Y')
        ]);
    }

    // 2. Điểm danh HÀNG LOẠT cho mảng danh sách ID học sinh
    public function bulkCheckIn(Request $request)
    {
        $request->validate([
            'student_ids'   => 'required|array',
            'student_ids.*' => 'exists:students,id',
            'class_id'      => 'nullable|integer',
            'shift'         => 'nullable|string',
            'is_makeup'     => 'nullable|boolean',
        ]);

        $targetDate = $request->date ? Carbon::parse($request->date) : Carbon::today();
        $checkedAt = $request->date && $targetDate->isPast() && !$targetDate->isToday() 
                     ? $targetDate->setTime(18, 0, 0) 
                     : Carbon::now();
        $now = Carbon::now();
        
        $user = auth('sanctum')->user();
        $diffDays = Carbon::today()->diffInDays($targetDate->copy()->startOfDay(), false);
        $diffDays = abs($diffDays);

        if ($user->email !== 'admin@gmail.com') {
            if ($diffDays > 0) {
                return response()->json(['message' => 'Giáo viên chỉ được điểm danh trong ngày hiện tại!'], 403);
            }
        } else {
            if ($diffDays > 3) {
                return response()->json(['message' => 'Quản trị viên chỉ được điểm danh lùi tối đa 3 ngày!'], 403);
            }
        }

        try {
            DB::beginTransaction();

            $studentIds = $request->student_ids;
            $userId = $user->id;

            // Bỏ qua những bạn đã điểm danh trong ngày mục tiêu rồi
            $alreadyChecked = Attendance::whereIn('student_id', $studentIds)
                ->whereDate('checked_at', $targetDate)
                ->pluck('student_id')
                ->toArray();

            $newStudentIds = array_diff($studentIds, $alreadyChecked);

            // Lấy thông tin học sinh để gán học phí chuẩn từng người
            $students = Student::whereIn('id', $newStudentIds)->get()->keyBy('id');

            $targetShift = $request->shift ?: $this->getShiftFromTime($checkedAt);

            if ($targetDate->isToday()) {
                $mins = $now->hour * 60 + $now->minute;
                $shiftStart = $this->getShiftStartTime($now, $targetShift);
                if ($mins < $shiftStart) {
                    return response()->json(['message' => "Chưa đến giờ điểm danh của " . strtoupper($targetShift) . ". Vui lòng đợi đến giờ vào ca!"], 400);
                }
            }

            $insertData = [];
            foreach ($newStudentIds as $id) {
                $student = $students->get($id);
                $fee = $student ? ($student->price_per_session ?? 130000) : 130000;

                $insertData[] = [
                    'student_id'     => $id,
                    'class_id'       => $request->class_id,
                    'shift'          => $targetShift,
                    'created_by'     => $userId,
                    'checked_at'     => $checkedAt,
                    'status'         => $request->boolean('is_makeup') ? 'makeup' : 'present',
                    'session_fee'    => $fee,
                    'created_at'     => $now,
                    'updated_at'     => $now,
                ];
            }

            if (!empty($insertData)) {
                Attendance::insert($insertData);
                
                // Ghi log lưu vết cũ
                \App\Models\AttendanceLog::create([
                    'user_id' => $userId,
                    'class_id' => $request->class_id,
                    'shift' => $targetShift,
                    'action_type' => 'bulk_check_in',
                    'student_count' => count($insertData)
                ]);

                $insertedAttendances = Attendance::whereIn('student_id', $newStudentIds)
                                         ->where('checked_at', $checkedAt)
                                         ->get();

                // Ghi log Audit mới
                foreach ($insertedAttendances as $att) {
                    AuditLog::create([
                        'user_id' => $userId,
                        'student_id' => $att->student_id,
                        'attendance_id' => $att->id,
                        'action' => 'check_in',
                        'new_data' => json_encode(['status' => $att->status, 'shift' => $att->shift]),
                        'reason' => $request->boolean('is_makeup') ? 'Điểm danh học bù' : 'Điểm danh hàng loạt'
                    ]);
                }
            }

            DB::commit();

            return response()->json([
                'message' => 'Đã điểm danh thành công cho ' . count($insertData) . ' học sinh!',
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Lỗi điểm danh hàng loạt: ' . $e->getMessage());
            return response()->json(['message' => 'Lỗi điểm danh hàng loạt: ' . $e->getMessage()], 500);
        }
    }

    // 3. Nhập/Cập nhật Điểm số (Cho phép chuỗi nhiều bài: "8.5, 9") & Trạng thái BTVN
    public function updateGrade(Request $request, $id)
    {
        $request->validate([
            'score'           => 'nullable|string', // Chuỗi để hỗ trợ nhập nhiều điểm
            'homework_status' => 'nullable|string',
            'comment'         => 'nullable|string',
            'reason'          => 'nullable|string',
        ]);

        $attendance = Attendance::findOrFail($id);
        
        $user = auth('sanctum')->user();
        $checkedAt = Carbon::parse($attendance->checked_at);
        $diffDays = Carbon::today()->diffInDays($checkedAt->copy()->startOfDay(), false);
        $diffDays = abs($diffDays);

        if ($user->email !== 'admin@gmail.com') {
            if ($diffDays > 0) {
                return response()->json(['message' => 'Giáo viên chỉ được sửa điểm trong ngày. Đã quá 24h!'], 403);
            }
        } else {
            if ($diffDays > 3) {
                return response()->json(['message' => 'Quản trị viên chỉ được sửa điểm lùi tối đa 3 ngày!'], 403);
            }
        }

        $oldData = $attendance->only(['score', 'homework_status', 'comment']);
        $newData = $request->only(['score', 'homework_status', 'comment']);

        if ($oldData !== $newData) {
            AuditLog::create([
                'user_id'       => $user->id,
                'student_id'    => $attendance->student_id,
                'attendance_id' => $attendance->id,
                'action'        => 'update_grade',
                'old_data'      => json_encode($oldData),
                'new_data'      => json_encode($newData),
                'reason'        => $request->reason ?? 'Cập nhật điểm/BTVN',
            ]);
        }

        $attendance->update($newData);

        return response()->json(['message' => 'Lưu thông tin buổi học thành công!']);
    }

    // 4. Thống kê số buổi học & Học phí trong chu kỳ chốt ngày 20 hàng tháng
    public function getStudentTuitionSummary($studentId, Request $request)
    {
        $month = $request->get('month', date('m'));
        $year  = $request->get('year', date('Y'));

        $student = Student::findOrFail($studentId);

        // Tính khoảng ngày theo chu kỳ chốt ngày 20 (Ví dụ T8: 21/07 -> 20/08)
        $endDate   = Carbon::createFromDate($year, $month, 20)->endOfDay();
        $startDate = Carbon::createFromDate($year, $month, 20)->subMonth()->addDay()->startOfDay();

        $attendances = Attendance::where('student_id', $studentId)
            ->whereBetween('checked_at', [$startDate, $endDate])
            ->whereIn('status', ['present', 'makeup'])
            ->get();

        // Cộng tổng session_fee của từng buổi đi học trong chu kỳ
        $totalTuition = $attendances->sum('session_fee');

        return response()->json([
            'student'           => $student,
            'month'             => (int)$month,
            'year'              => (int)$year,
            'start_date'        => $startDate->format('d/m/Y'),
            'end_date'          => $endDate->format('d/m/Y'),
            'total_sessions'    => $attendances->count(),
            'price_per_session' => $student->price_per_session ?? 130000,
            'total_tuition'     => $totalTuition,
        ]);
    }

    // 5. Lấy nhật ký điểm danh hôm nay
    public function todayList()
    {
        $list = Attendance::with('student')
            ->whereDate('checked_at', Carbon::today())
            ->orderBy('id', 'desc')
            ->get();

        return response()->json($list);
    }

    // 6. Hủy điểm danh theo ID bản ghi
    public function destroy($id)
    {
        Attendance::destroy($id);
        return response()->json(['message' => 'Đã xóa lượt điểm danh!']);
    }

    // 7. Hủy điểm danh hôm nay theo ID học sinh
    public function cancelByStudent($studentId)
    {
        Attendance::where('student_id', $studentId)
            ->whereDate('checked_at', Carbon::today())
            ->delete();

        return response()->json(['message' => 'Đã hủy điểm danh thành công!']);
    }

    // 8. Hủy điểm danh HÀNG LOẠT cho các học sinh được chọn
    public function bulkCancel(Request $request)
    {
        $request->validate([
            'student_ids'   => 'required|array',
            'student_ids.*' => 'exists:students,id',
            'date'          => 'nullable|date',
        ]);

        $targetDate = $request->date ? Carbon::parse($request->date) : Carbon::today();

        $deletedCount = Attendance::whereIn('student_id', $request->student_ids)
            ->whereDate('checked_at', $targetDate)
            ->delete();

        return response()->json([
            'message' => "Đã hủy điểm danh thành công cho {$deletedCount} học sinh!",
        ]);
    }
    // Cập nhật điểm & BTVN hàng loạt
    public function bulkUpdateGrade(Request $request)
    {
        $request->validate([
            'items'                   => 'required|array',
            'items.*.id'              => 'required|exists:attendances,id',
            'items.*.score'           => 'nullable|string',
            'items.*.homework_status' => 'nullable|string',
        ]);

        foreach ($request->items as $item) {
            Attendance::where('id', $item['id'])->update([
                'score'           => $item['score'] ?? null,
                'homework_status' => $item['homework_status'] ?? null,
            ]);
        }

        return response()->json(['message' => 'Đã lưu tất cả điểm và BTVN thành công!']);
    }

    // 9. Lấy danh sách lưu vết (Logs)
    public function getLogs(Request $request)
    {
        $logs = \App\Models\AttendanceLog::with(['user', 'classroom'])->latest()->limit(100)->get();
        return response()->json($logs);
    }

    private function getShiftFromTime(Carbon $time)
    {
        return 'Ca tự động ' . $time->format('H:i');
    }

    public function normalizeShiftKey($shift) {
        return $shift;
    }

    private function getShiftStartTime(Carbon $time, string $shift)
    {
        if (preg_match('/^(\d{1,2}):(\d{2})/', $shift, $matches)) {
            $h = (int)$matches[1];
            $m = (int)$matches[2];
            return $h * 60 + $m;
        }

        if ($time->isWeekend()) {
            $starts = ['ca1' => 480, 'ca2' => 570, 'ca3' => 840, 'ca4' => 930, 'ca5' => 1020, 'ca6' => 1185];
        } else {
            $starts = ['ca1' => 1050, 'ca2' => 1140, 'ca3' => 1230];
        }
        return $starts[strtolower($shift)] ?? 0;
    }
}