<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use Illuminate\Http\Request;

class AuditController extends Controller
{
    public function index(Request $request)
    {
        $user = auth('sanctum')->user();
        $role = $user->role ?: 'admin';
        if ($role !== 'admin') {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $auditQuery = AuditLog::with(['user', 'student', 'attendance.classroom'])
            ->where(function ($q) {
                $q->where('reason', '!=', 'Điểm danh hàng loạt')->orWhereNull('reason');
            });

        if ($request->student_name) {
            $auditQuery->whereHas('student', function ($q) use ($request) {
                $q->where('full_name', 'like', '%' . $request->student_name . '%');
            });
        }

        if ($request->user_name) {
            $auditQuery->whereHas('user', function ($q) use ($request) {
                $q->where('name', 'like', '%' . $request->user_name . '%');
            });
        }

        if ($request->date) {
            $auditQuery->whereDate('created_at', $request->date);
        }

        $audits = $auditQuery->latest()->take(100)->get()->map(function ($item) {
            $item->type = 'audit';
            return $item;
        });

        // Lấy dữ liệu từ bảng attendance_logs
        $attQuery = \App\Models\AttendanceLog::with(['user', 'classroom']);
        
        if ($request->user_name) {
            $attQuery->whereHas('user', function ($q) use ($request) {
                $q->where('name', 'like', '%' . $request->user_name . '%');
            });
        }

        if ($request->date) {
            $attQuery->whereDate('created_at', $request->date);
        }

        $atts = $attQuery->latest()->take(100)->get()->map(function ($att) {
            return [
                'id' => 'att_' . $att->id,
                'created_at' => $att->created_at,
                'user' => $att->user,
                'action' => $att->action_type === 'bulk_check_in' ? 'ĐIỂM DANH HÀNG LOẠT' : 'ĐIỂM DANH',
                'student' => null,
                'attendance' => [
                    'classroom' => $att->classroom
                ],
                'new_data' => json_encode([
                    'shift' => $att->shift,
                    'student_count' => $att->student_count,
                    'class_name' => $att->classroom ? $att->classroom->name : 'N/A'
                ]),
                'reason' => 'Lưu vết điểm danh lớp',
                'is_attendance_log' => true,
                'type' => 'attendance'
            ];
        });

        // Gộp 2 mảng lại và sắp xếp theo ngày tháng giảm dần
        $merged = $audits->concat($atts)->sortByDesc('created_at')->values();

        // Trả về định dạng giả lập paginate (vì frontend dùng res.data.data)
        return response()->json([
            'data' => $merged
        ]);
    }
}
