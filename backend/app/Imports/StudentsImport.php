<?php

namespace App\Imports;

use App\Models\Student;
use App\Models\Invoice;
use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\ToCollection;
use Maatwebsite\Excel\Concerns\WithStartRow;
use Illuminate\Support\Facades\Log;

class StudentsImport implements ToCollection, WithStartRow
{
    /**
     * Bắt đầu đọc từ dòng thứ 2 (bỏ qua dòng tiêu đề)
     */
    public function startRow(): int
    {
        return 2;
    }

    /**
    * @param Collection $rows
    */
    public function collection(Collection $rows)
    {
        $currentYear = date('Y');
        $baseCounter = Student::count() + 1;

        foreach ($rows as $row) {
            $fullName = trim($row[0] ?? '');
            $grade = trim($row[1] ?? '');
            $classType = trim($row[2] ?? '');
            $oldDebt = trim($row[3] ?? '');

            // Bỏ qua nếu không có tên
            if (empty($fullName)) {
                continue;
            }

            $counter = Student::withoutGlobalScopes()->count() + 1;
            do {
                $studentCode = 'HS' . $currentYear . str_pad($counter, 4, '0', STR_PAD_LEFT);
                $exists = Student::withoutGlobalScopes()->where('student_code', $studentCode)->exists();
                if ($exists) {
                    $counter++;
                }
            } while ($exists);

            try {
                $student = Student::create([
                    'student_code'      => $studentCode,
                    'full_name'         => $fullName,
                    'grade'             => $grade ? (int)$grade : null,
                    'class_type'        => $classType ?: null,
                    'parent_name'       => null,
                    'parent_phone'      => null,
                    'price_per_session' => 130000,
                    'start_date'        => date('Y-m-d'),
                    'teacher_comment'   => null,
                    'academic_status'   => 'Khá',
                    'scholarship_count' => 0,
                    'status'            => 'active',
                ]);

                // Nếu có nợ cũ, tự động tạo hóa đơn nợ cũ chưa thanh toán
                $oldDebtVal = floatval(preg_replace('/[^\d.-]/', '', $oldDebt));
                if ($oldDebtVal !== 0.0) {
                    Invoice::create([
                        'invoice_code' => 'NC' . date('YmdHis') . rand(10, 99) . $student->id,
                        'student_id' => $student->id,
                        'title' => $oldDebtVal < 0 ? 'Dư nợ từ hệ thống trước (Học sinh đóng thừa)' : 'Nợ cũ từ hệ thống trước',
                        'amount' => $oldDebtVal,
                        'final_amount' => $oldDebtVal,
                        'status' => 'unpaid',
                        'billing_month' => (int)date('n') === 1 ? 12 : (int)date('n') - 1,
                        'billing_year' => (int)date('n') === 1 ? (int)date('Y') - 1 : (int)date('Y')
                    ]);
                }
            } catch (\Exception $e) {
                Log::error('Import error for student: ' . $fullName . '. Error: ' . $e->getMessage());
            }

            $baseCounter++;
        }
    }
}