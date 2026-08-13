<?php

$db = new SQLite3(__DIR__ . '/database/database.sqlite');

try {
    // Indexes cho bảng attendances
    $db->exec("CREATE INDEX IF NOT EXISTS idx_attendances_student_id ON attendances(student_id)");
    $db->exec("CREATE INDEX IF NOT EXISTS idx_attendances_checked_at ON attendances(checked_at)");
    $db->exec("CREATE INDEX IF NOT EXISTS idx_attendances_status ON attendances(status)");
    $db->exec("CREATE INDEX IF NOT EXISTS idx_attendances_student_checked_status ON attendances(student_id, checked_at, status)");

    // Indexes cho bảng invoices
    $db->exec("CREATE INDEX IF NOT EXISTS idx_invoices_student_id ON invoices(student_id)");
    $db->exec("CREATE INDEX IF NOT EXISTS idx_invoices_paid_at ON invoices(paid_at)");
    
    // Indexes cho bảng students
    $db->exec("CREATE INDEX IF NOT EXISTS idx_students_status ON students(status)");
    $db->exec("CREATE INDEX IF NOT EXISTS idx_students_start_date ON students(start_date)");

    echo "Tạo Indexes thành công!\n";
} catch (Exception $e) {
    echo "Lỗi: " . $e->getMessage() . "\n";
}
