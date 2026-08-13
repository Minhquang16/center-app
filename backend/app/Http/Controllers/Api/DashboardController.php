<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Student;
use App\Models\Attendance;
use App\Models\Invoice;
use Carbon\Carbon;

class DashboardController extends Controller
{
    public function index(Request $request)
    {
        $month = (int)$request->get('month', date('m'));
        $year  = (int)$request->get('year', date('Y'));

        // Chu kỳ chốt học phí ngày 20
        $endDate   = Carbon::createFromDate($year, $month, 20)->endOfDay();
        $startDate = Carbon::createFromDate($year, $month, 20)->subMonth()->addDay()->startOfDay();

        // 1. DOANH THU THÁNG & NĂM
        // MySQL or SQLite group functions have slightly different date extraction, but here we can keep the simple sums for single month/year.
        $monthlyRevenue = Invoice::whereYear('paid_at', $year)
            ->whereMonth('paid_at', $month)
            ->sum('amount');

        $yearlyRevenue = Invoice::whereYear('paid_at', $year)->sum('amount');

        // 2. SĨ SỐ VÀ BIẾN ĐỘNG HỌC SINH
        $totalActiveStudents = Student::where('status', 'active')->count();

        $studentsInMonth = Student::whereBetween('start_date', [$startDate, $endDate])->count();

        $studentsOutMonth = Student::whereIn('status', ['paused', 'dropped'])
            ->whereBetween('updated_at', [$startDate, $endDate])
            ->count();

        // 3. TỔNG HỢP SỐ LƯỢNG HỌC SINH THEO TỪNG KHỐI (Khối 3 -> 12) - Tối ưu 1 query
        $studentsByGradeRaw = Student::where('status', 'active')
            ->selectRaw('grade, count(*) as count')
            ->groupBy('grade')
            ->pluck('count', 'grade')
            ->toArray();
            
        $studentsByGrade = [];
        for ($g = 3; $g <= 12; $g++) {
            $studentsByGrade["Khối $g"] = $studentsByGradeRaw[$g] ?? 0;
        }

        // 4. HỌC SINH ĐÃ NỘP HỌC PHÍ THÁNG
        $paidInvoices = Invoice::with('student')
            ->whereYear('paid_at', $year)
            ->whereMonth('paid_at', $month)
            ->orderBy('id', 'desc')
            ->get();

        $paidStudentIds = $paidInvoices->pluck('student_id')->unique()->toArray();

        // 5. HỌC SINH CHƯA NỘP HỌC PHÍ THÁNG - Tối ưu bằng bulk query
        $activeStudents = Student::where('status', 'active')->get()->keyBy('id');
        
        $unpaidStudentIds = $activeStudents->keys()->diff($paidStudentIds)->toArray();
        
        $attendanceCounts = Attendance::whereIn('student_id', $unpaidStudentIds)
            ->whereBetween('checked_at', [$startDate, $endDate])
            ->where('status', 'present')
            ->selectRaw('student_id, count(*) as count')
            ->groupBy('student_id')
            ->pluck('count', 'student_id')
            ->toArray();

        $unpaidStudents = [];
        $totalUnpaidAmount = 0;

        foreach ($attendanceCounts as $sId => $sessions) {
            if ($sessions > 0) {
                $s = $activeStudents->get($sId);
                if ($s) {
                    $expectedFee = $sessions * ($s->price_per_session ?? 130000);
                    $totalUnpaidAmount += $expectedFee;

                    $unpaidStudents[] = [
                        'id'             => $s->id,
                        'student_code'   => $s->student_code,
                        'full_name'      => $s->full_name,
                        'grade'          => $s->grade,
                        'class_type'     => $s->class_type,
                        'parent_name'    => $s->parent_name,
                        'parent_phone'   => $s->parent_phone,
                        'total_sessions' => $sessions,
                        'expected_fee'   => $expectedFee,
                    ];
                }
            }
        }

        // 6. BIỂU ĐỒ DOANH THU 12 THÁNG - Tối ưu 1 query (SQLite compatible)
        $monthlyRevenues = Invoice::whereYear('paid_at', $year)
            ->selectRaw('strftime("%m", paid_at) as m, sum(amount) as sum')
            ->groupBy('m')
            ->pluck('sum', 'm')
            ->toArray();

        $revenueChart = [];
        for ($m = 1; $m <= 12; $m++) {
            $monthStr = str_pad($m, 2, '0', STR_PAD_LEFT);
            $revenueChart[] = [
                'month'   => "T$m",
                'revenue' => (float)($monthlyRevenues[$monthStr] ?? 0),
            ];
        }

        // 7. BIỂU ĐỒ BIẾN ĐỘNG HỌC SINH (RA/VÀO) 12 THÁNG - Tối ưu
        // Chúng ta cần lấy số lượng vào và ra cho 12 tháng.
        // Để tránh 24 queries phức tạp với chu kỳ 20 hàng tháng, ta thực hiện lấy các data và lọc trong collection.
        $allYearStudentsIn = Student::whereBetween('start_date', [
            Carbon::createFromDate($year, 1, 20)->subMonth()->addDay()->startOfDay(),
            Carbon::createFromDate($year, 12, 20)->endOfDay()
        ])->get(['start_date']);
        
        $allYearStudentsOut = Student::whereIn('status', ['paused', 'dropped'])
            ->whereBetween('updated_at', [
                Carbon::createFromDate($year, 1, 20)->subMonth()->addDay()->startOfDay(),
                Carbon::createFromDate($year, 12, 20)->endOfDay()
            ])->get(['updated_at']);

        $studentMovementChart = [];
        for ($m = 1; $m <= 12; $m++) {
            $mEnd   = Carbon::createFromDate($year, $m, 20)->endOfDay();
            $mStart = Carbon::createFromDate($year, $m, 20)->subMonth()->addDay()->startOfDay();

            $inCount = $allYearStudentsIn->filter(function($s) use ($mStart, $mEnd) {
                $sd = Carbon::parse($s->start_date);
                return $sd->between($mStart, $mEnd);
            })->count();

            $outCount = $allYearStudentsOut->filter(function($s) use ($mStart, $mEnd) {
                $ud = Carbon::parse($s->updated_at);
                return $ud->between($mStart, $mEnd);
            })->count();

            $studentMovementChart[] = [
                'month' => "T$m",
                'in'    => $inCount,
                'out'   => $outCount,
            ];
        }

        return response()->json([
            'month'                 => $month,
            'year'                  => $year,
            'total_revenue_month'   => $monthlyRevenue,
            'total_revenue_year'    => $yearlyRevenue,
            'total_active_students' => $totalActiveStudents,
            'students_in_month'     => $studentsInMonth,
            'students_out_month'    => $studentsOutMonth,
            'students_by_grade'     => $studentsByGrade,
            'paid_students_count'   => count($paidStudentIds),
            'unpaid_students_count' => count($unpaidStudents),
            'total_unpaid_amount'   => $totalUnpaidAmount,
            'paid_list'             => $paidInvoices,
            'unpaid_list'           => $unpaidStudents,
            'revenue_chart'         => $revenueChart,
            'student_movement_chart'=> $studentMovementChart,
        ]);
    }
}