<?php

namespace App\Imports;

use App\Models\Student;
use Maatwebsite\Excel\Concerns\ToModel;
use Maatwebsite\Excel\Concerns\WithHeadingRow;

class StudentsImport implements ToModel, WithHeadingRow
{
    public function model(array $row)
    {
        // Tự động sinh mã học sinh HS + năm + số ngẫu nhiên nếu thiếu
        $studentCode = $row['ma_hoc_sinh'] ?? 'HS' . date('Y') . str_pad(rand(1, 9999), 4, '0', STR_PAD_LEFT);

        return new Student([
            'student_code' => $studentCode,
            'full_name'    => $row['ho_ten'],
            'grade'        => $row['khoi_lop'],
            'parent_name'  => $row['ten_phu_huynh'],
            'parent_phone' => $row['sdt_phu_huynh'],
            'dob'          => isset($row['ngay_sinh']) ? date('Y-m-d', strtotime($row['ngay_sinh'])) : null,
            'status'       => 'active',
        ]);
    }
}