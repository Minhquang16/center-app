<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Invoice;
use App\Models\Student;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use App\Models\AuditLog;

class InvoiceController extends Controller
{
    private function getSettings()
    {
        $settingsFile = 'settings.json';
        if (!Storage::exists($settingsFile)) {
            return [
                'bank_id' => 'MB',
                'account_no' => '0987654321',
                'account_name' => 'SUNNY EDUCATION'
            ];
        }
        return json_decode(Storage::get($settingsFile), true);
    }
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

        $approvalStatus = $request->payment_method === 'transfer' ? 'pending' : 'approved';

        $invoice = Invoice::create([
            'invoice_code'   => $invoiceCode,
            'student_id'     => $student->id,
            'title'          => $request->title,
            'amount'         => $request->amount,
            'payment_method' => $request->payment_method,
            'status'         => 'paid',
            'approval_status'=> $approvalStatus,
            'paid_at'        => Carbon::now(),
        ]);

        AuditLog::create([
            'user_id' => $request->user()->id,
            'student_id' => $student->id,
            'action' => 'INVOICE_CREATE',
            'new_data' => json_encode(['amount' => $invoice->amount, 'method' => $invoice->payment_method]),
            'reason' => 'Tạo hóa đơn thu tiền',
        ]);

        // Tạo đường dẫn VietQR động nếu chọn hình thức chuyển khoản
        $qrUrl = '';
        if ($request->payment_method === 'transfer') {
            $settings = $this->getSettings();
            $bankId  = $settings['bank_id'];
            $account = $settings['account_no'];
            $name    = urlencode($settings['account_name']);
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

    public function bulkStore(Request $request)
    {
        $request->validate([
            'invoices' => 'required|array|min:1',
            'invoices.*.student_id' => 'required|exists:students,id',
            'invoices.*.title' => 'required|string',
            'invoices.*.amount' => 'required|numeric|min:1000',
            'payment_method' => 'required|string',
        ]);

        $createdInvoices = [];
        $totalAmount = 0;
        $studentCodes = [];

        DB::beginTransaction();
        try {
            $approvalStatus = $request->payment_method === 'transfer' ? 'pending' : 'approved';

            foreach ($request->invoices as $invData) {
                $student = Student::findOrFail($invData['student_id']);
                $invoiceCode = 'HD' . date('YmdHis') . rand(10, 99) . $student->id;

                $invoice = Invoice::create([
                    'invoice_code'   => $invoiceCode,
                    'student_id'     => $student->id,
                    'title'          => $invData['title'],
                    'amount'         => $invData['amount'],
                    'payment_method' => $request->payment_method,
                    'status'         => 'paid',
                    'approval_status'=> $approvalStatus,
                    'paid_at'        => Carbon::now(),
                ]);

                AuditLog::create([
                    'user_id' => $request->user()->id,
                    'student_id' => $student->id,
                    'action' => 'INVOICE_CREATE',
                    'new_data' => json_encode(['amount' => $invoice->amount, 'method' => $invoice->payment_method]),
                    'reason' => 'Tạo hóa đơn thu tiền gộp',
                ]);

                $invoice->load('student');
                $createdInvoices[] = $invoice;
                $totalAmount += $invData['amount'];
                $studentCodes[] = $student->student_code;
            }
            DB::commit();
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Lỗi tạo hóa đơn gộp: ' . $e->getMessage()], 500);
        }

        $qrUrl = '';
        if ($request->payment_method === 'transfer') {
            $settings = $this->getSettings();
            $bankId  = $settings['bank_id'];
            $account = $settings['account_no'];
            $name    = urlencode($settings['account_name']);
            // Limit addInfo length if too many students
            $addInfoStr = "HP " . implode(" ", $studentCodes);
            if (strlen($addInfoStr) > 50) {
                $addInfoStr = substr($addInfoStr, 0, 47) . "...";
            }
            $addInfo = urlencode($addInfoStr);
            $qrUrl   = "https://img.vietqr.io/image/{$bankId}-{$account}-compact2.png?amount={$totalAmount}&addInfo={$addInfo}&accountName={$name}";
        }

        return response()->json([
            'message' => 'Tạo hóa đơn gộp thành công!',
            'invoices' => $createdInvoices,
            'qr_url'  => $qrUrl,
            'total_amount' => $totalAmount
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
                
            $previousDebt = $student->debt + $unpaidInvoices->sum('final_amount');
            
            $lastMonthDebt = 0;
            $yearlyDebt = $student->debt ?? 0;
            
            $lastMonth = $currentMonth - 1;
            $lastMonthYear = $currentYear;
            if ($lastMonth == 0) {
                $lastMonth = 12;
                $lastMonthYear = $currentYear - 1;
            }

            foreach ($unpaidInvoices as $inv) {
                if ($inv->billing_month == $lastMonth && $inv->billing_year == $lastMonthYear) {
                    $lastMonthDebt += $inv->final_amount;
                } else {
                    $yearlyDebt += $inv->final_amount;
                }
            }
            
            $debtDetails = $unpaidInvoices->map(function($inv) {
                return [
                    'month' => $inv->billing_month,
                    'year' => $inv->billing_year,
                    'unpaid_amount' => $inv->final_amount,
                    'invoice_code' => $inv->invoice_code
                ];
            });

            if ($student->debt > 0) {
                $debtDetails->push([
                    'month' => null,
                    'year' => null,
                    'unpaid_amount' => $student->debt,
                    'invoice_code' => 'Nợ đầu kỳ'
                ]);
            }

            // Bước 2: Tiền tháng này
            $attendedSessions = \App\Models\Attendance::where('student_id', $id)
                ->whereIn('status', ['present', 'makeup'])
                ->whereBetween('checked_at', [$startDate->format('Y-m-d H:i:s'), $endDate->format('Y-m-d H:i:s')])
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
                'last_month_debt' => (float)$lastMonthDebt,
                'yearly_debt' => (float)$yearlyDebt,
                'final_amount' => (float)$finalAmount,
                'has_debt' => $previousDebt > 0,
                'debt_details' => $debtDetails
            ]);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    public function destroy(Request $request, $id)
    {
        $invoice = Invoice::findOrFail($id);
        
        AuditLog::create([
            'user_id' => $request->user()->id,
            'student_id' => $invoice->student_id,
            'action' => 'INVOICE_DELETE',
            'old_data' => json_encode(['amount' => $invoice->amount, 'status' => $invoice->status]),
            'reason' => 'Hoàn tác thu tiền',
        ]);

        $invoice->delete();
        return response()->json(['message' => 'Hóa đơn đã được xóa (hoàn tác) thành công.']);
    }

    public function approve(Request $request, $id)
    {
        $invoice = Invoice::findOrFail($id);
        $invoice->approval_status = 'approved';
        $invoice->save();
        
        AuditLog::create([
            'user_id' => $request->user()->id,
            'student_id' => $invoice->student_id,
            'action' => 'INVOICE_APPROVE',
            'new_data' => json_encode(['status' => 'approved']),
            'reason' => 'Duyệt hóa đơn chuyển khoản',
        ]);

        return response()->json(['message' => 'Hóa đơn đã được duyệt.']);
    }

    public function reject($id)
    {
        $invoice = Invoice::findOrFail($id);
        $invoice->approval_status = 'rejected';
        $invoice->save();
        return response()->json(['message' => 'Hóa đơn đã bị từ chối.']);
    }
}