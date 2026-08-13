<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Student;
use App\Models\Attendance;
use App\Models\Invoice;
use Carbon\Carbon;

class StudentController extends Controller
{
    public function index(Request $request)
    {
        try {
            $grade        = $request->get('grade');
            $classType    = $request->get('class_type');
            $shift        = $request->get('shift');
            $selectedDate = $request->get('date', date('Y-m-d'));

            $targetDate   = Carbon::parse($selectedDate)->startOfDay();
            $today        = Carbon::today();
            $now          = Carbon::now();

            $isPastDay   = $targetDate->lt($today);
            $isToday     = $targetDate->equalTo($today);
            $isWeekend   = ($targetDate->dayOfWeek == 0 || $targetDate->dayOfWeek == 6);

            $month = $targetDate->month;
            $year  = $targetDate->year;
            $endDate   = Carbon::createFromDate($year, $month, 20)->endOfDay();
            $startDate = Carbon::createFromDate($year, $month, 20)->subMonth()->addDay()->startOfDay();

            $shiftLockMinutes = $isWeekend ? [
                'ca1' => 9 * 60 + 30 + 15,
                'ca2' => 11 * 60 + 15,
                'ca3' => 15 * 60 + 30 + 15,
                'ca4' => 17 * 60 + 15,
                'ca5' => 18 * 60 + 30 + 15,
            ] : [
                'ca1' => 19 * 60 + 15,
                'ca2' => 20 * 60 + 30 + 15,
                'ca3' => 22 * 60 + 15,
            ];

            $nowMinutes = $now->hour * 60 + $now->minute;

            $query = Student::query();
            if (!empty($grade)) $query->where('grade', $grade);
            if (!empty($classType)) $query->where('class_type', $classType);

            $students = $query->orderBy('id', 'desc')->get();
            $studentIds = $students->pluck('id')->toArray();

            // Bulk queries to eliminate N+1
            $allCycleAttendances = Attendance::whereIn('student_id', $studentIds)
                ->whereBetween('checked_at', [$startDate, $endDate])
                ->get()
                ->groupBy('student_id');

            $allInvoices = Invoice::whereIn('student_id', $studentIds)
                ->whereYear('paid_at', $year)
                ->whereMonth('paid_at', $month)
                ->get()
                ->keyBy('student_id');

            $allTodayAttendances = Attendance::whereIn('student_id', $studentIds)
                ->whereDate('checked_at', $targetDate)
                ->get()
                ->groupBy('student_id');

            $filteredStudents = [];

            foreach ($students as $s) {
                $cycleAttendances = $allCycleAttendances->get($s->id, collect());

                $presentAttendances = $cycleAttendances->where('status', 'present');
                $sessionsCount = $presentAttendances->count();

                $s->total_sessions_in_cycle  = $sessionsCount;
                $s->absent_sessions_in_cycle = $cycleAttendances->where('status', 'absent')->count();
                $s->total_tuition_in_cycle   = $sessionsCount * ($s->price_per_session ?? 130000);

                $scores = $presentAttendances->pluck('score')->filter(fn($sc) => is_numeric($sc))->map(fn($sc) => (float)$sc);
                $s->avg_score_in_cycle = $scores->count() > 0 ? round($scores->avg(), 1) : 0;

                $history = $presentAttendances->map(function ($att) {
                    $dt = Carbon::parse($att->checked_at);
                    $isWk = ($dt->dayOfWeek == 0 || $dt->dayOfWeek == 6);
                    $mins = $dt->hour * 60 + $dt->minute;

                    $shiftName = 'Ca học';
                    if ($isWk) {
                        if ($mins < 570) $shiftName = 'Ca 1 (8h00 - 9h30)';
                        elseif ($mins < 720) $shiftName = 'Ca 2 (9h30 - 11h00)';
                        elseif ($mins < 930) $shiftName = 'Ca 3 (14h00 - 15h30)';
                        elseif ($mins < 1020) $shiftName = 'Ca 4 (15h30 - 17h00)';
                        else $shiftName = 'Ca 5 (17h00 - 18h30)';
                    } else {
                        if ($mins < 1140) $shiftName = 'Ca 1 (17h30 - 19h00)';
                        elseif ($mins < 1230) $shiftName = 'Ca 2 (19h00 - 20h30)';
                        else $shiftName = 'Ca 3 (20h30 - 22h00)';
                    }

                    return [
                        'id'              => $att->id,
                        'date'            => $dt->format('d/m/Y'),
                        'time'            => $dt->format('H:i'),
                        'shift_name'      => $shiftName,
                        'score'           => $att->score ?? 'Chưa nhập',
                        'homework_status' => $att->homework_status ?? 'Chưa chọn',
                    ];
                })->values();

                $s->attendance_history_in_cycle = $history;

                $invoice = $allInvoices->get($s->id);
                $s->is_paid_in_cycle = !empty($invoice);
                $s->invoice_info     = $invoice;

                $selectedDayAttendances = $allTodayAttendances->get($s->id, collect());

                if ($isWeekend) {
                    $shifts = ['ca1' => null, 'ca2' => null, 'ca3' => null, 'ca4' => null, 'ca5' => null];
                    foreach ($selectedDayAttendances as $att) {
                        $time = Carbon::parse($att->checked_at);
                        $mins = $time->hour * 60 + $time->minute;
                        if ($mins < 570) $shifts['ca1'] = ['id' => $att->id, 'time' => $time->format('H:i'), 'score' => $att->score, 'homework' => $att->homework_status, 'checked_at' => $att->checked_at];
                        elseif ($mins < 720) $shifts['ca2'] = ['id' => $att->id, 'time' => $time->format('H:i'), 'score' => $att->score, 'homework' => $att->homework_status, 'checked_at' => $att->checked_at];
                        elseif ($mins < 930) $shifts['ca3'] = ['id' => $att->id, 'time' => $time->format('H:i'), 'score' => $att->score, 'homework' => $att->homework_status, 'checked_at' => $att->checked_at];
                        elseif ($mins < 1020) $shifts['ca4'] = ['id' => $att->id, 'time' => $time->format('H:i'), 'score' => $att->score, 'homework' => $att->homework_status, 'checked_at' => $att->checked_at];
                        else $shifts['ca5'] = ['id' => $att->id, 'time' => $time->format('H:i'), 'score' => $att->score, 'homework' => $att->homework_status, 'checked_at' => $att->checked_at];
                    }
                } else {
                    $shifts = ['ca1' => null, 'ca2' => null, 'ca3' => null];
                    foreach ($selectedDayAttendances as $att) {
                        $time = Carbon::parse($att->checked_at);
                        $mins = $time->hour * 60 + $time->minute;
                        if ($mins < 1140) $shifts['ca1'] = ['id' => $att->id, 'time' => $time->format('H:i'), 'score' => $att->score, 'homework' => $att->homework_status, 'checked_at' => $att->checked_at];
                        elseif ($mins < 1230) $shifts['ca2'] = ['id' => $att->id, 'time' => $time->format('H:i'), 'score' => $att->score, 'homework' => $att->homework_status, 'checked_at' => $att->checked_at];
                        else $shifts['ca3'] = ['id' => $att->id, 'time' => $time->format('H:i'), 'score' => $att->score, 'homework' => $att->homework_status, 'checked_at' => $att->checked_at];
                    }
                }

                $activeShiftData = (!empty($shift) && isset($shifts[$shift])) ? $shifts[$shift] : null;
                $activeAtt = $activeShiftData ? Attendance::find($activeShiftData['id']) : $selectedDayAttendances->last();
                
                // Chỉ cho phép hủy điểm danh khi là HÔM NAY và chưa quá 15 phút sau khi kết thúc ca
                $canCancel = false;
                if ($isToday) {
                    $canCancel = true;
                    if ($shift && isset($shiftLockMinutes[$shift]) && $nowMinutes > $shiftLockMinutes[$shift]) {
                        $canCancel = false;
                    }
                }

                $s->today_shifts            = $shifts;
                $s->today_attendance        = $selectedDayAttendances->last();
                $s->active_shift_attendance = $activeAtt;
                $s->can_cancel_attendance   = $canCancel;

                if (!empty($shift)) {
                    if (isset($shifts[$shift]) && $shifts[$shift] !== null) {
                        $filteredStudents[] = $s;
                    }
                } else {
                    $filteredStudents[] = $s;
                }
            }

            $cycleInfo = [
                'selected_date'  => $targetDate->format('Y-m-d'),
                'date_formatted' => $targetDate->format('d/m/Y'),
                'is_past_day'    => $isPastDay,
                'is_today'       => $isToday,
                'month'          => $month,
                'year'           => $year,
                'is_weekend'     => $isWeekend,
                'start_date'     => $startDate->format('d/m/Y'),
                'end_date'       => $endDate->format('d/m/Y'),
            ];

            return response()->json([
                'data'       => $filteredStudents,
                'cycle_info' => $cycleInfo
            ]);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Lỗi server: ' . $e->getMessage()], 500);
        }
    }

    public function store(Request $request)
    {
        try {
            $request->validate([
                'full_name'    => 'required|string',
                'grade'        => 'required',
                'parent_name'  => 'required|string',
                'parent_phone' => 'required|string',
            ]);

            $formattedDate = date('Y-m-d');
            if (!empty($request->start_date)) {
                try {
                    $formattedDate = Carbon::parse($request->start_date)->format('Y-m-d');
                } catch (\Exception $ex) {
                    $formattedDate = date('Y-m-d');
                }
            }

            $currentYear = date('Y');
            $counter = Student::count() + 1;
            do {
                $studentCode = 'HS' . $currentYear . str_pad($counter, 4, '0', STR_PAD_LEFT);
                $exists = Student::where('student_code', $studentCode)->exists();
                if ($exists) $counter++;
            } while ($exists);

            $student = Student::create([
                'student_code'      => $studentCode,
                'full_name'         => trim($request->full_name),
                'grade'             => (int)$request->grade,
                'class_type'        => in_array((string)$request->grade, ['10', '11', '12']) ? null : $request->class_type,
                'parent_name'       => trim($request->parent_name),
                'parent_phone'      => trim($request->parent_phone),
                'price_per_session' => (float)($request->price_per_session ?? 130000),
                'start_date'        => $formattedDate,
                'teacher_comment'   => $request->teacher_comment ?? null,
                'academic_status'   => 'Khá',
                'scholarship_count' => 0,
                'status'            => 'active',
            ]);

            return response()->json($student, 201);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Lỗi thêm học sinh: ' . $e->getMessage()], 500);
        }
    }

    public function update(Request $request, $id)
    {
        try {
            $student = Student::findOrFail($id);
            $student->update($request->all());
            return response()->json($student);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Lỗi cập nhật: ' . $e->getMessage()], 500);
        }
    }

    public function destroy($id)
    {
        try {
            $student = Student::findOrFail($id);
            $student->delete();
            return response()->json(['message' => 'Đã xóa học sinh']);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Lỗi xóa học sinh: ' . $e->getMessage()], 500);
        }
    }

    public function importExcel(Request $request)
    {
        return response()->json(['message' => 'Tính năng Import Excel sẵn sàng']);
    }
}