<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Invoice;
use App\Models\Student;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class InvoiceController extends Controller
{
    public function index()
    {
        $invoices = Invoice::with('student')
            ->orderBy('id', 'desc')
            ->get();

        return response()->json($invoices);
    }

    public function store(Request $request)
    {
        $request->validate([
            'student_id'     => 'required|exists:students,id',
            'title'          => 'required|string',
            'amount'         => 'required|numeric|min:1000',
            'payment_method' => 'required|string',
        ]);

        $student = Student::findOrFail($request->student_id);

        // Sinh mã hóa đơn tự động chuẩn POS: HD + Thời gian + ID ngẫu nhiên
        $invoiceCode = 'HD' . date('YmdHis') . rand(10, 99);

        $invoice = Invoice::create([
            'invoice_code'   => $invoiceCode,
            'student_id'     => $student->id,
            'title'          => $request->title,
            'amount'         => $request->amount,
            'payment_method' => $request->payment_method,
            'status'         => 'paid',
            'paid_at'        => Carbon::now(),
        ]);

        // Tạo đường dẫn VietQR động nếu chọn hình thức chuyển khoản
        $qrUrl = '';
        if ($request->payment_method === 'transfer') {
            $bankId  = 'MB'; // Mã ngân hàng (MBBank, VCB, ICB, VPB...)
            $account = '0987654321'; // Số tài khoản trung tâm
            $name    = urlencode('MATH CENTER');
            $addInfo = urlencode("HP " . $student->student_code);
            $qrUrl   = "https://img.vietqr.io/image/{$bankId}-{$account}-compact2.png?amount={$request->amount}&addInfo={$addInfo}&accountName={$name}";
        }

        $invoice->load('student');

        return response()->json([
            'message' => 'Tạo hóa đơn thành công!',
            'invoice' => $invoice,
            'qr_url'  => $qrUrl,
        ]);
    }

    public function getBillingInfo(Request $request, $id)
    {
        try {
            $student = Student::findOrFail($id);
            
            $currentMonth = $request->input('month', Carbon::now()->month);
            $currentYear = $request->input('year', Carbon::now()->year);
            
            $startDate = Carbon::create($currentYear, $currentMonth, 21)->subMonth()->startOfDay();
            $endDate = Carbon::create($currentYear, $currentMonth, 20)->endOfDay();
            
            // Bước 1: Nợ cũ
            $unpaidInvoices = Invoice::where('student_id', $id)
                ->where('status', 'unpaid')
                ->get();
                
            $previousDebt = $unpaidInvoices->sum('final_amount');
            
            $debtDetails = $unpaidInvoices->map(function($inv) {
                return [
                    'month' => $inv->billing_month,
                    'year' => $inv->billing_year,
                    'unpaid_amount' => $inv->final_amount,
                    'invoice_code' => $inv->invoice_code
                ];
            });

            // Bước 2: Tiền tháng này
            $attendedSessions = DB::table('attendances')
                ->join('class_sessions', 'attendances.session_id', '=', 'class_sessions.id')
                ->where('attendances.student_id', $id)
                ->where('attendances.status', 'present')
                ->whereBetween('class_sessions.session_date', [$startDate->format('Y-m-d'), $endDate->format('Y-m-d')])
                ->count();
                
            $pricePerSession = collect($student)->get('price_per_session', 130000); // Check if model has it, or DB table
            // Wait, does students table have price_per_session? 
            $pricePerSession = $student->price_per_session ?? 130000;
            
            $currentFee = $attendedSessions * $pricePerSession;
            
            // Bước 3: Tổng
            $finalAmount = $previousDebt + $currentFee;
            
            return response()->json([
                'student_id' => $student->id,
                'current_month' => (int)$currentMonth,
                'current_year' => (int)$currentYear,
                'attended_sessions' => $attendedSessions,
                'price_per_session' => (float)$pricePerSession,
                'current_fee' => (float)$currentFee,
                'previous_debt' => (float)$previousDebt,
                'final_amount' => (float)$finalAmount,
                'has_debt' => $previousDebt > 0,
                'debt_details' => $debtDetails
            ]);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }
}