<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Student;
use App\Models\Attendance;
use App\Models\Invoice;
use Carbon\Carbon;
use Maatwebsite\Excel\Facades\Excel;
use App\Imports\StudentsImport;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
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
            
            if ($targetDate->day > 20) {
                $startDate = Carbon::createFromDate($year, $month, 21)->startOfDay();
                $endDate   = Carbon::createFromDate($year, $month, 20)->addMonth()->endOfDay();
            } else {
                $startDate = Carbon::createFromDate($year, $month, 21)->subMonth()->startOfDay();
                $endDate   = Carbon::createFromDate($year, $month, 20)->endOfDay();
            }

            // Calculate academic year range
            if ($month >= 8) {
                $academicYearStart = Carbon::createFromDate($year, 8, 1)->startOfDay();
                $academicYearEnd   = Carbon::createFromDate($year + 1, 7, 31)->endOfDay();
                $academicYearLabel = "{$year}-" . ($year + 1);
            } else {
                $academicYearStart = Carbon::createFromDate($year - 1, 8, 1)->startOfDay();
                $academicYearEnd   = Carbon::createFromDate($year, 7, 31)->endOfDay();
                $academicYearLabel = ($year - 1) . "-{$year}";
            }

            $nowMinutes = $now->hour * 60 + $now->minute;

            $search = $request->get('search');
            $query = Student::where('status', '!=', 'dropped');
            
            if (empty($search)) {
                if (!empty($classType)) {
                    $query->where('class_type', $classType);
                } else {
                    $query->where(function($q) {
                        $q->where('class_type', '!=', 'Vãng lai')
                          ->orWhereNull('class_type');
                    });
                }

                if (!empty($grade)) {
                    $query->where('grade', $grade);
                }
            } else {
                $query->where(function($q) use ($search) {
                    $q->where('full_name', 'LIKE', '%' . $search . '%')
                      ->orWhere('student_code', 'LIKE', '%' . $search . '%');
                });
            }

            $students = $query->get()->map(function($student) {
                $parts = explode(' ', trim($student->full_name));
                $student->first_name = end($parts);
                return $student;
            })->sort(function ($a, $b) {
                // 1. Sort by grade (Khối) ascending
                if ($a->grade !== $b->grade) {
                    return $a->grade <=> $b->grade;
                }
                // 2. Sort by class type (Loại lớp) ascending
                $classA = $a->class_type ?? '';
                $classB = $b->class_type ?? '';
                if ($classA !== $classB) {
                    return strcmp($classA, $classB);
                }
                // 3. Sort by first name (Tên) alphabetically
                if ($a->first_name !== $b->first_name) {
                    return strcmp($a->first_name, $b->first_name);
                }
                // 4. Sort by full name as tie breaker
                return strcmp($a->full_name, $b->full_name);
            })->values();
            $studentIds = $students->pluck('id')->toArray();

            // Bulk queries to eliminate N+1 (Optimized with select to reduce memory/hydration overhead)
            $allCycleAttendances = Attendance::select('id', 'student_id', 'status', 'score', 'checked_at', 'homework_status')
                ->whereIn('student_id', $studentIds)
                ->whereBetween('checked_at', [$startDate, $endDate])
                ->get()
                ->groupBy('student_id');

            $allInvoices = Invoice::select('id', 'student_id', 'paid_at', 'invoice_code', 'final_amount')
                ->whereIn('student_id', $studentIds)
                ->whereYear('paid_at', $year)
                ->whereMonth('paid_at', $month)
                ->get()
                ->keyBy('student_id');

            $allUnpaidInvoices = Invoice::select('student_id', 'final_amount')
                ->whereIn('student_id', $studentIds)
                ->where('status', 'unpaid')
                ->get()
                ->groupBy('student_id');

            $allTodayAttendances = Attendance::select('id', 'student_id', 'status', 'score', 'homework_status', 'checked_at')
                ->whereIn('student_id', $studentIds)
                ->whereDate('checked_at', $targetDate)
                ->get()
                ->groupBy('student_id');

            $allYearAttendances = Attendance::select('id', 'student_id', 'status', 'score', 'checked_at')
                ->whereIn('student_id', $studentIds)
                ->whereBetween('checked_at', [$academicYearStart, $academicYearEnd])
                ->get()
                ->groupBy('student_id');

            $filteredStudents = [];

            foreach ($students as $s) {
                $cycleAttendances = $allCycleAttendances->get($s->id, collect());

                $presentAttendances = $cycleAttendances->whereIn('status', ['present', 'makeup']);
                $sessionsCount = $presentAttendances->count();

                $s->total_sessions_in_cycle  = $sessionsCount;
                $s->absent_sessions_in_cycle = $cycleAttendances->where('status', 'absent')->count();
                $s->total_tuition_in_cycle   = $sessionsCount * ($s->price_per_session ?? 130000);

                $unpaidInvoices = $allUnpaidInvoices->get($s->id, collect());
                $previousDebt = $unpaidInvoices->sum('final_amount') + ($s->debt ?? 0);
                $s->previous_debt = $previousDebt;
                $s->final_amount = $s->total_tuition_in_cycle + $previousDebt;

                $yearAttendances = $allYearAttendances->get($s->id, collect());

                $calcAvgScore = function($atts) {
                    $presentAtts = $atts->whereIn('status', ['present', 'makeup']);
                    $testScores = [];
                    foreach ($presentAtts as $att) {
                        $sc = $att->score;
                        if ($sc === null || $sc === '') continue;
                        if (is_numeric($sc)) {
                            $testScores[] = (float)$sc;
                        } else {
                            $parsed = json_decode($sc, true);
                            if ($parsed && isset($parsed['tests']) && is_array($parsed['tests'])) {
                                foreach ($parsed['tests'] as $testScore) {
                                    if (is_numeric($testScore)) {
                                        $testScores[] = (float)$testScore;
                                    }
                                }
                            }
                        }
                    }
                    return count($testScores) > 0 ? round(array_sum($testScores) / count($testScores), 1) : null;
                };

                $s->avg_score_in_cycle = $calcAvgScore($cycleAttendances);
                $s->avg_score_in_year  = $calcAvgScore($yearAttendances);

                $getAcademicStatus = function($score) {
                    if ($score === null) return 'Chưa đánh giá';
                    if ($score >= 8.5) return 'Xuất sắc';
                    if ($score >= 8.0) return 'Giỏi';
                    if ($score >= 6.5) return 'Khá';
                    if ($score >= 5.0) return 'Trung bình';
                    return 'Cần cố gắng';
                };

                $s->academic_status_cycle = $getAcademicStatus($s->avg_score_in_cycle);
                $s->academic_status_year  = $getAcademicStatus($s->avg_score_in_year);

                $history = $presentAttendances->map(function ($att) {
                    $ts = strtotime($att->checked_at);
                    return [
                        'id'              => $att->id,
                        'status'          => $att->status,
                        'date'            => date('d/m/Y', $ts),
                        'time'            => date('H:i', $ts),
                        'shift_name'      => $att->shift ?? 'Ca cũ',
                        'score'           => $att->score ?? 'Chưa nhập',
                        'homework_status' => $att->homework_status ?? 'Chưa chọn',
                    ];
                })->values();

                $s->attendance_history_in_cycle = $history;

                $invoice = $allInvoices->get($s->id);
                $s->is_paid_in_cycle = !empty($invoice);
                $s->invoice_info     = $invoice;
                
                if ($s->is_paid_in_cycle) {
                    $s->final_amount = $invoice->final_amount;
                }

                $selectedDayAttendances = $allTodayAttendances->get($s->id, collect());

                $shifts = [];
                foreach ($selectedDayAttendances as $att) {
                    $sKey = $att->shift ?? 'ca_cu';
                    $shifts[$sKey] = ['id' => $att->id, 'status' => $att->status, 'time' => date('H:i', strtotime($att->checked_at)), 'score' => $att->score, 'homework' => $att->homework_status, 'checked_at' => $att->checked_at];
                }

                $activeShiftData = (!empty($shift) && isset($shifts[$shift])) ? $shifts[$shift] : null;
                $activeAtt = $activeShiftData ? $selectedDayAttendances->firstWhere('id', $activeShiftData['id']) : $selectedDayAttendances->last();
                
                // Chỉ cho phép hủy điểm danh khi là HÔM NAY và chưa quá 15 phút sau khi kết thúc ca
                $canCancel = false;
                if ($isToday) {
                    $canCancel = true;
                    if ($shift && preg_match('/-\s*(\d{1,2}):(\d{2})/', $shift, $matches)) {
                        $lockTime = ((int)$matches[1]) * 60 + ((int)$matches[2]) + 15;
                        if ($nowMinutes > $lockTime) {
                            $canCancel = false;
                        }
                    } else if ($shift && in_array($shift, ['ca1', 'ca2', 'ca3', 'ca4', 'ca5', 'ca6'])) {
                        // Fallback lock times for old static ca strings
                        $legacyLocks = $isWeekend ? ['ca1'=>585, 'ca2'=>675, 'ca3'=>945, 'ca4'=>1035, 'ca5'=>1125] : ['ca1'=>1155, 'ca2'=>1245, 'ca3'=>1335];
                        if (isset($legacyLocks[$shift]) && $nowMinutes > $legacyLocks[$shift]) {
                            $canCancel = false;
                        }
                    }
                }

                $s->today_shifts            = $shifts;
                $s->today_attendance        = $selectedDayAttendances->last();
                $s->active_shift_attendance = $activeAtt;
                $s->can_cancel_attendance   = $canCancel;

                if (!empty($shift)) {
                    // We DO NOT filter out unattended students here anymore.
                    // The shift parameter is used by the frontend to determine which shift column to display and target for bulk check-in.
                    $filteredStudents[] = $s;
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
                'academic_year'  => $academicYearLabel,
                'is_weekend'     => $isWeekend,
                'start_date'     => $startDate->format('d/m/Y'),
                'end_date'       => $endDate->format('d/m/Y'),
            ];

            // --- Compute Global Check-in Stats ---
            $globalAttendances = Attendance::with('student:id,grade,class_type')
                ->whereDate('checked_at', $targetDate)
                ->whereIn('status', ['present', 'makeup'])
                ->get();

            $globalShiftCounts = [];
            $globalCheckedInTotal = 0;
            $processedStudents = [];

            foreach ($globalAttendances as $att) {
                $ts = strtotime($att->checked_at);
                $mins = (int)date('H', $ts) * 60 + (int)date('i', $ts);
                
                $attShift = $att->shift ?? 'ca_cu';

                if (!empty($shift) && $attShift !== $shift) {
                    continue;
                }

                if (in_array($att->student_id, $processedStudents)) {
                    continue;
                }
                $processedStudents[] = $att->student_id;

                $stu = $att->student;
                if ($stu) {
                    $grade = $stu->grade ?? '';
                    $classType = $stu->class_type ?? 'Khác';
                    $label = trim("$grade $classType");
                    if ($label === '') $label = 'Khác';
                    
                    if (!isset($globalShiftCounts[$label])) {
                        $globalShiftCounts[$label] = 0;
                    }
                    $globalShiftCounts[$label]++;
                    $globalCheckedInTotal++;
                }
            }

            // Sort globalShiftCounts by keys alphabetically for consistent display
            ksort($globalShiftCounts);

            $cycleInfo['global_shift_counts'] = $globalShiftCounts;
            $cycleInfo['global_checked_in_total'] = $globalCheckedInTotal;

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
                'parent_name'  => 'nullable|string',
                'parent_phone' => 'nullable|string',
            ]);

            // Kiểm tra trùng lặp học sinh (Cùng tên và cùng SĐT phụ huynh)
            if ($request->filled('parent_phone')) {
                $isDuplicate = Student::where('full_name', trim($request->full_name))
                    ->where('parent_phone', trim($request->parent_phone))
                    ->exists();

                if ($isDuplicate) {
                    return response()->json(['message' => 'Học sinh này đã tồn tại trong hệ thống (trùng Tên và SĐT phụ huynh)!'], 422);
                }
            }

            $formattedDate = date('Y-m-d');
            if (!empty($request->start_date)) {
                try {
                    $formattedDate = Carbon::parse($request->start_date)->format('Y-m-d');
                } catch (\Exception $ex) {
                    $formattedDate = date('Y-m-d');
                }
            }

            DB::beginTransaction();

            $currentYear = date('Y');
            $counter = Student::withoutGlobalScopes()->count() + 1;
            do {
                $studentCode = 'HS' . $currentYear . str_pad($counter, 4, '0', STR_PAD_LEFT);
                $exists = Student::withoutGlobalScopes()->where('student_code', $studentCode)->exists();
                if ($exists) $counter++;
            } while ($exists);

            $student = Student::create([
                'student_code'      => $studentCode,
                'full_name'         => trim($request->full_name),
                'grade'             => (int)$request->grade,
                'class_type'        => in_array((string)$request->grade, ['10', '11', '12']) ? null : $request->class_type,
                'parent_name'       => $request->filled('parent_name') ? trim($request->parent_name) : null,
                'parent_phone'      => $request->filled('parent_phone') ? trim($request->parent_phone) : null,
                'price_per_session' => (float)($request->price_per_session ?? 130000),
                'start_date'        => $formattedDate,
                'teacher_comment'   => $request->teacher_comment ?? null,
                'academic_status'   => 'Khá',
                'scholarship_count' => 0,
                'status'            => 'active',
                'debt'              => (float)($request->debt ?? 0),
            ]);

            DB::commit();

            return response()->json($student, 201);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Lỗi thêm học sinh: ' . $e->getMessage());
            return response()->json(['message' => 'Lỗi thêm học sinh: ' . $e->getMessage()], 500);
        }
    }

    public function update(Request $request, $id)
    {
        try {
            DB::beginTransaction();
            $student = Student::findOrFail($id);
            // Ngăn chặn hacker gửi các trường nhạy cảm như 'status', 'price_per_session'
            $student->update($request->only([
                'full_name',
                'grade',
                'class_type',
                'parent_name',
                'parent_phone',
                'teacher_comment',
                'academic_status',
                'start_date',
                'debt'
            ]));
            DB::commit();
            return response()->json($student);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Lỗi cập nhật học sinh: ' . $e->getMessage());
            return response()->json(['message' => 'Lỗi cập nhật: ' . $e->getMessage()], 500);
        }
    }

    public function destroy($id, Request $request)
    {
        try {
            DB::beginTransaction();
            $student = Student::findOrFail($id);
            $reason = $request->input('reason', 'error');

            if ($reason === 'dropped') {
                $student->status = 'dropped';
                $student->save();
                DB::commit();
                return response()->json(['message' => 'Đã chuyển học sinh sang trạng thái nghỉ học']);
            } else {
                $student->delete();
                DB::commit();
                return response()->json(['message' => 'Đã xóa học sinh vĩnh viễn']);
            }
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Lỗi xóa học sinh: ' . $e->getMessage());
            return response()->json(['message' => 'Lỗi xóa học sinh: ' . $e->getMessage()], 500);
        }
    }

    public function bulkDestroy(Request $request)
    {
        $request->validate([
            'student_ids' => 'required|array',
            'reason' => 'required|string',
        ]);

        try {
            DB::beginTransaction();
            $ids = $request->input('student_ids');
            $reason = $request->input('reason', 'error');

            if ($reason === 'dropped') {
                Student::whereIn('id', $ids)->update(['status' => 'dropped']);
                DB::commit();
                return response()->json(['message' => 'Đã chuyển ' . count($ids) . ' học sinh sang trạng thái nghỉ học']);
            } else {
                Student::whereIn('id', $ids)->delete();
                DB::commit();
                return response()->json(['message' => 'Đã xóa vĩnh viễn ' . count($ids) . ' học sinh']);
            }
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Lỗi xóa học sinh hàng loạt: ' . $e->getMessage());
            return response()->json(['message' => 'Lỗi xóa học sinh hàng loạt: ' . $e->getMessage()], 500);
        }
    }

    public function bulkUpdateClass(Request $request)
    {
        $request->validate([
            'student_ids' => 'required|array',
            'student_ids.*' => 'exists:students,id',
            'class_type' => 'nullable|string'
        ]);

        try {
            DB::beginTransaction();
            Student::whereIn('id', $request->student_ids)
                ->update(['class_type' => $request->class_type]);
            DB::commit();
            return response()->json(['message' => 'Đã chuyển lớp hàng loạt thành công']);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Lỗi cập nhật lớp hàng loạt: ' . $e->getMessage());
            return response()->json(['message' => 'Lỗi cập nhật lớp hàng loạt: ' . $e->getMessage()], 500);
        }
    }

    public function importExcel(Request $request)
    {
        $requestedBranchId = $request->header('X-Branch-Id');
        $user = \Illuminate\Support\Facades\Auth::user();
        
        // Nếu user thường không có branch_id thì không cho import (đã bắt ở middleware)
        // Nếu admin đang chọn 'all' thì cũng chặn lại
        if (($user->branch_id === null) && (empty($requestedBranchId) || $requestedBranchId === 'all')) {
            return response()->json(['message' => 'Vui lòng chọn một Cơ sở cụ thể ở góc dưới bên trái màn hình trước khi tải file Excel lên (Không chọn "Tất cả cơ sở").'], 422);
        }

        $request->validate([
            'file' => 'required|file|max:10240'
        ]);

        $file = $request->file('file');
        $extension = strtolower($file->getClientOriginalExtension());
        
        if (!in_array($extension, ['xlsx', 'xls', 'csv'])) {
            return response()->json(['message' => 'File không đúng định dạng. Vui lòng tải lên file .xlsx, .xls hoặc .csv (File hiện tại: ' . $extension . ')'], 422);
        }

        try {
            Excel::import(new StudentsImport, $file);
            return response()->json(['message' => 'Import thành công']);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Lỗi import: ' . $e->getMessage()], 500);
        }
    }
}