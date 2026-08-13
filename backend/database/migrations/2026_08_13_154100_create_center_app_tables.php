<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Bảng Users (Admin, Lễ tân, Giáo viên)
        Schema::create('users', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('email')->unique();
            $table->string('password');
            $table->string('role')->default('admin'); // admin, teacher, staff
            $table->string('status')->default('active');
            $table->rememberToken();
            $table->timestamps();
        });

        // 2. Bảng Sessions (Bắt buộc để lưu phiên đăng nhập của Laravel)
        Schema::create('sessions', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->foreignId('user_id')->nullable()->index();
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();
            $table->longText('payload');
            $table->integer('last_activity')->index();
        });

        // 3. Bảng Tokens (Bắt buộc để chạy Sanctum / API React)
        Schema::create('personal_access_tokens', function (Blueprint $table) {
            $table->id();
            $table->morphs('tokenable');
            $table->string('name');
            $table->string('token', 64)->unique();
            $table->text('abilities')->nullable();
            $table->timestamp('last_used_at')->nullable();
            $table->timestamp('expires_at')->nullable();
            $table->timestamps();
        });

        // 4. Bảng Học sinh (Students)
        Schema::create('students', function (Blueprint $table) {
            $table->id();
            $table->string('student_code')->unique();
            $table->string('full_name');
            $table->string('parent_name')->nullable();
            $table->string('parent_phone')->nullable();
            $table->string('status')->default('studying'); // studying, reserved, dropped
            $table->timestamps();
        });

        // 5. Bảng Lớp học (Classes)
        Schema::create('classes', function (Blueprint $table) {
            $table->id();
            $table->string('class_name');
            $table->foreignId('teacher_id')->constrained('users')->onDelete('cascade');
            $table->decimal('price_per_session', 10, 2)->default(0); // Giá tiền 1 buổi học
            $table->timestamps();
        });

        // 6. Bảng Trung gian (Học sinh thuộc lớp nào)
        Schema::create('class_student', function (Blueprint $table) {
            $table->id();
            $table->foreignId('class_id')->constrained('classes')->onDelete('cascade');
            $table->foreignId('student_id')->constrained('students')->onDelete('cascade');
            $table->timestamps();
        });

        // 7. Bảng Lịch học thực tế (Để sinh mã QR điểm danh)
        Schema::create('class_sessions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('class_id')->constrained('classes')->onDelete('cascade');
            $table->date('session_date');
            $table->timestamps();
        });

        // 8. Bảng Điểm danh (Lưu lịch sử đi học/nghỉ)
        Schema::create('attendances', function (Blueprint $table) {
            $table->id();
            $table->foreignId('class_session_id')->constrained('class_sessions')->onDelete('cascade');
            $table->foreignId('student_id')->constrained('students')->onDelete('cascade');
            $table->enum('status', ['present', 'absent_excused', 'absent_unexcused']); 
            $table->timestamps();
        });

        // 9. Bảng Hóa đơn Học phí (Chốt ngày 20 hàng tháng)
        Schema::create('invoices', function (Blueprint $table) {
            $table->id();
            $table->string('invoice_code')->unique();
            $table->foreignId('student_id')->constrained('students')->onDelete('cascade');
            $table->integer('billing_month');
            $table->integer('billing_year');
            $table->decimal('current_fee', 12, 2)->default(0); // Phí phát sinh tháng này
            $table->decimal('previous_debt', 12, 2)->default(0); // Nợ cũ gộp vào
            $table->decimal('discount_amount', 12, 2)->default(0); // Miễn giảm
            $table->decimal('final_amount', 12, 2)->default(0); // Tổng thanh toán
            $table->enum('status', ['unpaid', 'partially_paid', 'paid', 'overdue'])->default('unpaid');
            $table->timestamps();
        });

        // 10. Bảng Lịch sử Thanh toán (Thu tiền thực tế qua POS/Chuyển khoản)
        Schema::create('payments', function (Blueprint $table) {
            $table->id();
            $table->string('receipt_code')->unique(); // Mã phiếu thu
            $table->foreignId('student_id')->constrained('students')->onDelete('cascade');
            $table->decimal('amount_paid', 12, 2)->default(0);
            $table->string('payment_method')->default('transfer'); // transfer, cash, pos
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        // Xóa ngược từ dưới lên trên để không lỗi khóa ngoại
        Schema::dropIfExists('payments');
        Schema::dropIfExists('invoices');
        Schema::dropIfExists('attendances');
        Schema::dropIfExists('class_sessions');
        Schema::dropIfExists('class_student');
        Schema::dropIfExists('classes');
        Schema::dropIfExists('students');
        Schema::dropIfExists('personal_access_tokens');
        Schema::dropIfExists('sessions');
        Schema::dropIfExists('users');
    }
};