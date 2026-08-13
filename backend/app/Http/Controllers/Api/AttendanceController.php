<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Student;
use App\Models\Attendance;
use Carbon\Carbon;

class AttendanceController extends Controller
{
    // 1. Quét / Nhập mã điểm danh lẻ 1 học sinh
    public function checkIn(Request $request)
    {
        $request->validate([
            'student_code' => 'required|string',
            'class_id'     => 'required|integer',
            'shift'        => 'required|string',
        ]);

        $student = Student::where('student_code', trim($request->student_code))->first();

        if (!$student) {
            return response()->json(['message' => 'Không tìm thấy học sinh với mã này!'], 404);
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
            'status'         => 'present',
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
            'class_id'      => 'required|integer',
            'shift'         => 'required|string',
        ]);

        $today = Carbon::today();
        $now = Carbon::now();
        $studentIds = $request->student_ids;
        $userId = auth('sanctum')->id();

        // Bỏ qua những bạn đã điểm danh hôm nay rồi
        $alreadyChecked = Attendance::whereIn('student_id', $studentIds)
            ->whereDate('checked_at', $today)
            ->pluck('student_id')
            ->toArray();

        $newStudentIds = array_diff($studentIds, $alreadyChecked);

        // Lấy thông tin học sinh để gán học phí chuẩn từng người
        $students = Student::whereIn('id', $newStudentIds)->get()->keyBy('id');

        $insertData = [];
        foreach ($newStudentIds as $id) {
            $student = $students->get($id);
            $fee = $student ? ($student->price_per_session ?? 130000) : 130000;

            $insertData[] = [
                'student_id'     => $id,
                'class_model_id' => 1,
                'class_id'       => $request->class_id,
                'shift'          => $request->shift,
                'created_by'     => $userId,
                'checked_at'     => $now,
                'status'         => 'present',
                'session_fee'    => $fee,
                'created_at'     => $now,
                'updated_at'     => $now,
            ];
        }

        if (!empty($insertData)) {
            Attendance::insert($insertData);
            
            // Ghi log lưu vết
            \App\Models\AttendanceLog::create([
                'user_id' => $userId,
                'class_id' => $request->class_id,
                'shift' => $request->shift,
                'action_type' => 'bulk_check_in',
                'student_count' => count($insertData)
            ]);
        }

        return response()->json([
            'message' => 'Đã điểm danh thành công cho ' . count($insertData) . ' học sinh!',
        ]);
    }

    // 3. Nhập/Cập nhật Điểm số (Cho phép chuỗi nhiều bài: "8.5, 9") & Trạng thái BTVN
    public function updateGrade(Request $request, $id)
    {
        $request->validate([
            'score'           => 'nullable|string', // Chuỗi để hỗ trợ nhập nhiều điểm
            'homework_status' => 'nullable|string',
            'comment'         => 'nullable|string',
        ]);

        $attendance = Attendance::findOrFail($id);
        $attendance->update([
            'score'           => $request->score,
            'homework_status' => $request->homework_status,
            'comment'         => $request->comment,
        ]);

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
            ->where('status', 'present')
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

    // 8. Hủy điểm danh HÀNG LOẠT cho các học sinh được chọn hôm nay
    public function bulkCancel(Request $request)
    {
        $request->validate([
            'student_ids'   => 'required|array',
            'student_ids.*' => 'exists:students,id',
        ]);

        $deletedCount = Attendance::whereIn('student_id', $request->student_ids)
            ->whereDate('checked_at', Carbon::today())
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
}