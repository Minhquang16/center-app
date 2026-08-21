<?php

namespace App\Imports;

use App\Models\Student;
use App\Models\ExamCandidate;
use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\ToCollection;
use Maatwebsite\Excel\Concerns\WithStartRow;
use Illuminate\Support\Facades\Log;

class ExamCandidatesImport implements ToCollection, WithStartRow
{
    protected $examId;
    protected $addedCount = 0;

    public function __construct($examId)
    {
        $this->examId = $examId;
    }

    public function startRow(): int
    {
        return 2; // Skip header
    }

    public function collection(Collection $rows)
    {
        $currentYear = date('Y');
        $baseCounter = Student::count() + 1;

        foreach ($rows as $row) {
            $fullName = trim($row[0] ?? '');
            $grade = trim($row[1] ?? '');
            $dob = trim($row[2] ?? '');

            if (empty($fullName)) {
                continue;
            }

            // Xử lý ngày sinh nếu có (Excel thường lưu ngày dưới dạng số serial hoặc chuỗi)
            $formattedDob = null;
            if ($dob) {
                if (is_numeric($dob)) {
                    $formattedDob = \PhpOffice\PhpSpreadsheet\Shared\Date::excelToDateTimeObject($dob)->format('Y-m-d');
                } else {
                    // Cố gắng parse chuỗi ngày
                    try {
                        $formattedDob = \Carbon\Carbon::parse($dob)->format('Y-m-d');
                    } catch (\Exception $e) {
                        $formattedDob = null;
                    }
                }
            }

            // Tìm học sinh theo Tên và Ngày sinh (nếu có), hoặc tạo mới
            $student = null;
            if ($formattedDob) {
                $student = Student::where('full_name', $fullName)->where('dob', $formattedDob)->first();
            }

            if (!$student) {
                // Tạo mới học sinh vãng lai
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
                        'class_type'        => 'Vãng lai',
                        'dob'               => $formattedDob,
                        'price_per_session' => 130000,
                        'start_date'        => date('Y-m-d'),
                        'academic_status'   => 'Trung bình',
                        'scholarship_count' => 0,
                        'status'            => 'active',
                    ]);
                    $baseCounter++;
                } catch (\Exception $e) {
                    Log::error('Lỗi tạo học sinh vãng lai: ' . $e->getMessage());
                    continue;
                }
            }

            // Thêm vào kỳ thi
            if ($student) {
                // Kiểm tra xem đã trong kỳ thi chưa
                $existsInExam = ExamCandidate::where('exam_id', $this->examId)
                    ->where('student_id', $student->id)
                    ->exists();

                if (!$existsInExam) {
                    $gradeVal = $student->grade ?: 1;
                    $gradePrefix = str_pad($gradeVal, 2, '0', STR_PAD_LEFT);

                    $latestCandidate = ExamCandidate::where('exam_id', $this->examId)
                        ->where('candidate_number', 'LIKE', $gradePrefix . '%')
                        ->orderBy('candidate_number', 'desc')
                        ->first();

                    $newSeq = 1;
                    if ($latestCandidate) {
                        $newSeq = intval(substr($latestCandidate->candidate_number, 2)) + 1;
                    }

                    $sbd = $gradePrefix . str_pad($newSeq, 3, '0', STR_PAD_LEFT);

                    ExamCandidate::create([
                        'exam_id' => $this->examId,
                        'student_id' => $student->id,
                        'candidate_number' => $sbd
                    ]);

                    $this->addedCount++;
                }
            }
        }
    }

    public function getAddedCount()
    {
        return $this->addedCount;
    }
}
