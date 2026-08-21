<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\StudentController;
use App\Http\Controllers\Api\AttendanceController;
use App\Http\Controllers\Api\InvoiceController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Api\AuditController;
use App\Http\Controllers\Api\BranchController;

// Route Đăng nhập công khai
Route::post('/login', [AuthController::class, 'login']);

// Route Tra cứu kết quả thi (Public Portal)
Route::post('/exam-lookup', [\App\Http\Controllers\Api\ExamController::class, 'lookup']);

// Tất cả các route còn lại yêu cầu xác thực Token Sanctum
Route::middleware('auth:sanctum')->group(function () {
    
    // Auth chung cho mọi role
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);
    Route::put('/profile', [UserController::class, 'updateProfile']);
    
    // Phân quyền (Roles & Permissions) - Đọc danh sách vai trò
    Route::middleware('permission:manage_roles|manage_users')->group(function () {
        Route::get('/roles', [\App\Http\Controllers\Api\RoleController::class, 'index']);
    });

    // Phân quyền (Roles & Permissions) - Thêm sửa xoá
    Route::middleware('permission:manage_roles')->group(function () {
        Route::post('/roles', [\App\Http\Controllers\Api\RoleController::class, 'store']);
        Route::put('/roles/{id}', [\App\Http\Controllers\Api\RoleController::class, 'update']);
        Route::delete('/roles/{id}', [\App\Http\Controllers\Api\RoleController::class, 'destroy']);
        Route::get('/permissions', [\App\Http\Controllers\Api\RoleController::class, 'permissions']);
    });

    // Quản lý hệ thống (Dashboard & Audit)
    Route::get('/dashboard', [DashboardController::class, 'index'])->middleware('permission:view_dashboard');
    Route::get('/audit-logs', [AuditController::class, 'index'])->middleware('permission:view_audit_logs');

    // Quản lý người dùng
    Route::middleware('permission:manage_users')->group(function () {
        Route::get('/users', [UserController::class, 'index']);
        Route::post('/users', [UserController::class, 'store']);
        Route::put('/users/{id}', [UserController::class, 'update']);
        Route::delete('/users/{id}', [UserController::class, 'destroy']);
    });

    // Quản lý cơ sở (Branches) - Đọc danh sách cơ sở có thể dùng cho manage_users hoặc manage_roles
    Route::middleware('permission:manage_roles|manage_users')->group(function () {
        Route::get('/branches', [BranchController::class, 'index']);
    });

    // Chỉ Super Admin quản lý (thêm sửa xoá) cơ sở
    Route::middleware('permission:manage_roles')->group(function () {
        Route::post('/branches', [BranchController::class, 'store']);
        Route::put('/branches/{id}', [BranchController::class, 'update']);
        Route::delete('/branches/{id}', [BranchController::class, 'destroy']);
    });

    // Quản lý tài chính
    Route::middleware('permission:view_finance')->group(function () {
        Route::get('/invoices', [InvoiceController::class, 'index']);
        Route::get('/students/{id}/billing-info', [InvoiceController::class, 'getBillingInfo']);
    });
    
    Route::middleware('permission:manage_finance')->group(function () {
        Route::post('/invoices', [InvoiceController::class, 'store']);
        Route::delete('/invoices/{id}', [InvoiceController::class, 'destroy']);
        Route::put('/invoices/{id}/approve', [InvoiceController::class, 'approve']);
        Route::put('/invoices/{id}/reject', [InvoiceController::class, 'reject']);
    });

    // Quản lý Học sinh
    Route::get('/students', [StudentController::class, 'index'])->middleware('permission:view_students');
    Route::get('/students/{id}/tuition-summary', [AttendanceController::class, 'getStudentTuitionSummary'])->middleware('permission:view_students');
    
    Route::middleware('permission:edit_students')->group(function () {
        Route::post('/students', [StudentController::class, 'store']);
        Route::put('/students/{id}', [StudentController::class, 'update']);
        Route::post('/students/import', [StudentController::class, 'importExcel']);
        Route::post('/students/bulk-update-class', [StudentController::class, 'bulkUpdateClass']);
    });

    Route::middleware('permission:delete_students')->group(function () {
        Route::post('/students/bulk-delete', [StudentController::class, 'bulkDestroy']);
        Route::delete('/students/{id}', [StudentController::class, 'destroy']);
    });

    // Quản lý Lớp học
    Route::get('/classes', [\App\Http\Controllers\Api\ClassController::class, 'index'])->middleware('permission:view_classes');
    Route::get('/classes/with-students', [\App\Http\Controllers\Api\ClassController::class, 'withStudents'])->middleware('permission:view_classes');
    Route::get('/classes/{id}/students', [\App\Http\Controllers\Api\ClassController::class, 'getStudentsByClass'])->middleware('permission:view_classes');
    
    Route::middleware('permission:edit_classes')->group(function () {
        Route::post('/classes', [\App\Http\Controllers\Api\ClassController::class, 'store']);
        Route::put('/classes/{id}', [\App\Http\Controllers\Api\ClassController::class, 'update']);
    });
    
    Route::middleware('permission:delete_classes')->group(function () {
        Route::delete('/classes/{id}', [\App\Http\Controllers\Api\ClassController::class, 'destroy']);
    });

    // Quản lý Điểm danh
    Route::middleware('permission:manage_attendance')->group(function () {
        Route::get('/attendance/logs', [AttendanceController::class, 'getLogs']);
        Route::post('/attendance/check-in', [AttendanceController::class, 'checkIn']);
        Route::post('/attendance/bulk-check-in', [AttendanceController::class, 'bulkCheckIn']);
        Route::post('/attendance/bulk-cancel', [AttendanceController::class, 'bulkCancel']);
        Route::get('/attendance/today', [AttendanceController::class, 'todayList']);
        Route::put('/attendance/{id}/grade', [AttendanceController::class, 'updateGrade']); 
        Route::post('/attendance/bulk-grade', [AttendanceController::class, 'bulkUpdateGrade']);
        Route::delete('/attendance/{id}', [AttendanceController::class, 'destroy']);
        Route::delete('/attendance/student/{studentId}', [AttendanceController::class, 'cancelByStudent']);
    });

    // Quản lý thi cử
    Route::get('/notifications', [\App\Http\Controllers\Api\NotificationController::class, 'index']);
    Route::put('/notifications/read-all', [\App\Http\Controllers\Api\NotificationController::class, 'markAllAsRead']);
    Route::put('/notifications/{id}/read', [\App\Http\Controllers\Api\NotificationController::class, 'markAsRead']);

    Route::middleware('permission:manage_exams')->group(function () {
        Route::apiResource('exams', \App\Http\Controllers\Api\ExamController::class);
        Route::post('/exams/{id}/candidates', [\App\Http\Controllers\Api\ExamController::class, 'addCandidates']);
        Route::post('/exams/{id}/import-excel', [\App\Http\Controllers\Api\ExamController::class, 'importExcel']);
        Route::post('/exams/{id}/scores', [\App\Http\Controllers\Api\ExamController::class, 'bulkSaveScores']);
        Route::post('/exams/{id}/finalize', [\App\Http\Controllers\Api\ExamController::class, 'finalizeExam']);
        Route::get('/exams/{id}/export', [\App\Http\Controllers\Api\ExamController::class, 'exportExcel']);
        Route::post('/exams/{id}/shifts', [\App\Http\Controllers\Api\ExamController::class, 'storeShifts']);
        Route::post('/exams/{id}/auto-assign', [\App\Http\Controllers\Api\ExamController::class, 'autoAssignRooms']);
        Route::put('/exam-candidates/{id}/change-room', [\App\Http\Controllers\Api\ExamController::class, 'changeCandidateRoom']);
    });
});
