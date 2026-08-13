<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\StudentController;
use App\Http\Controllers\Api\AttendanceController;
use App\Http\Controllers\Api\InvoiceController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\UserController;

// Users Management
Route::get('/users', [UserController::class, 'index']);
Route::post('/users', [UserController::class, 'store']);
Route::put('/users/{id}', [UserController::class, 'update']);
Route::delete('/users/{id}', [UserController::class, 'destroy']);

// 1. Routes Học sinh
Route::get('/students', [StudentController::class, 'index']);
Route::post('/students', [StudentController::class, 'store']);
Route::post('/students/import', [StudentController::class, 'importExcel']);
Route::get('/students/{id}/tuition-summary', [AttendanceController::class, 'getStudentTuitionSummary']);

// 2. Routes Điểm danh & Nhập điểm
Route::get('/classes', [\App\Http\Controllers\Api\ClassController::class, 'index']);
Route::get('/attendance/logs', [AttendanceController::class, 'getLogs']);
Route::post('/attendance/check-in', [AttendanceController::class, 'checkIn']);
Route::post('/attendance/bulk-check-in', [AttendanceController::class, 'bulkCheckIn']);
Route::post('/attendance/bulk-cancel', [AttendanceController::class, 'bulkCancel']);
Route::get('/attendance/today', [AttendanceController::class, 'todayList']);
Route::put('/attendance/{id}/grade', [AttendanceController::class, 'updateGrade']); // Route nhập điểm & BTVN
Route::delete('/attendance/{id}', [AttendanceController::class, 'destroy']);
Route::post('/attendance/bulk-grade', [AttendanceController::class, 'bulkUpdateGrade']);
Route::put('/students/{id}', [StudentController::class, 'update']);
Route::delete('/students/{id}', [StudentController::class, 'destroy']);
Route::delete('/attendance/student/{studentId}', [AttendanceController::class, 'cancelByStudent']);

// Dashboard
Route::get('/dashboard', [DashboardController::class, 'index']);

//postpage
Route::get('/invoices', [InvoiceController::class, 'index']);
Route::post('/invoices', [InvoiceController::class, 'store']);
Route::get('/students/{id}/billing-info', [InvoiceController::class, 'getBillingInfo']);

// Route Đăng nhập công khai
Route::post('/login', [AuthController::class, 'login']);

// Route yêu cầu xác thực Token Sanctum
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);
});

