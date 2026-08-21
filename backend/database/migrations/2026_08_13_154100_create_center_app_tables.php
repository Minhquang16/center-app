<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 0. Bảng Cơ sở (Branches)
        Schema::create('branches', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('address')->nullable();
            $table->string('phone')->nullable();
            $table->string('status')->default('active');
            $table->timestamps();
        });

        // 1. Bảng Users (Admin, Lễ tân, Giáo viên)
        Schema::create('users', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('email')->unique();
            $table->string('password');
            $table->string('role')->default('admin');
            $table->string('status')->default('active');
            $table->foreignId('branch_id')->nullable()->constrained('branches')->onDelete('cascade');
            $table->rememberToken();
            $table->timestamps();
        });

        // 2. Bảng Sessions
        Schema::create('sessions', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->foreignId('user_id')->nullable()->index();
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();
            $table->longText('payload');
            $table->integer('last_activity')->index();
        });

        // 3. Bảng Tokens
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
            $table->integer('grade')->nullable();
            $table->string('class_type')->nullable();
            $table->decimal('price_per_session', 10, 2)->default(130000);
            $table->decimal('debt', 12, 2)->default(0);
            $table->date('start_date')->nullable();
            $table->date('dob')->nullable();
            $table->text('teacher_comment')->nullable();
            $table->string('academic_status')->nullable();
            $table->integer('scholarship_count')->default(0);
            $table->string('status')->default('studying'); // studying, reserved, dropped
            $table->foreignId('branch_id')->nullable()->constrained('branches')->onDelete('cascade');
            $table->timestamps();
        });

        // 5. Bảng Lớp học (Classes)
        Schema::create('classes', function (Blueprint $table) {
            $table->id();
            $table->string('class_code')->nullable();
            $table->string('name')->nullable();
            $table->integer('grade')->nullable();
            $table->string('schedule_note')->nullable();
            $table->foreignId('teacher_id')->nullable()->constrained('users')->onDelete('set null');
            $table->decimal('price_per_session', 10, 2)->default(0);
            $table->json('schedules')->nullable();
            $table->string('status')->default('active');
            $table->foreignId('branch_id')->nullable()->constrained('branches')->onDelete('cascade');
            $table->timestamps();

            $table->unique(['branch_id', 'class_code']);
        });

        // 6. Bảng Trung gian (Học sinh thuộc lớp nào)
        Schema::create('class_student', function (Blueprint $table) {
            $table->id();
            $table->foreignId('class_id')->constrained('classes')->onDelete('cascade');
            $table->foreignId('student_id')->constrained('students')->onDelete('cascade');
            $table->timestamps();
        });

        // 7. Bảng Lịch học thực tế
        Schema::create('class_sessions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('class_id')->constrained('classes')->onDelete('cascade');
            $table->date('session_date');
            $table->timestamps();
        });

        // 8. Bảng Điểm danh
        Schema::create('attendances', function (Blueprint $table) {
            $table->id();
            $table->foreignId('class_session_id')->nullable()->constrained('class_sessions')->onDelete('cascade');
            $table->foreignId('student_id')->constrained('students')->onDelete('cascade');
            $table->foreignId('class_id')->nullable()->constrained('classes')->onDelete('cascade');
            $table->string('shift')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->dateTime('checked_at')->nullable();
            $table->enum('status', ['present', 'absent_excused', 'absent_unexcused', 'makeup']);
            $table->decimal('session_fee', 10, 2)->default(130000);
            $table->string('score')->nullable();
            $table->string('homework_status')->nullable();
            $table->text('comment')->nullable();
            $table->text('note')->nullable();
            $table->foreignId('branch_id')->nullable()->constrained('branches')->onDelete('cascade');
            $table->timestamps();

            $table->index('checked_at');
            $table->index(['student_id', 'checked_at']);
        });
        
        // 8.1. Bảng Nhật ký Điểm danh
        Schema::create('attendance_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('class_id')->nullable()->constrained('classes')->nullOnDelete();
            $table->string('shift')->nullable();
            $table->string('action_type')->nullable(); // check_in, bulk_check_in
            $table->integer('student_count')->default(0);
            $table->timestamps();
        });

        // 8.2 Bảng Nhật ký Kiểm toán (Audit Logs)
        Schema::create('audit_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('student_id')->nullable()->constrained('students')->nullOnDelete();
            $table->foreignId('attendance_id')->nullable()->constrained('attendances')->nullOnDelete();
            $table->string('action')->nullable(); // update_score, update_status
            $table->text('old_data')->nullable();
            $table->text('new_data')->nullable();
            $table->string('reason')->nullable();
            $table->timestamps();
        });

        // 9. Bảng Hóa đơn Học phí
        Schema::create('invoices', function (Blueprint $table) {
            $table->id();
            $table->string('invoice_code')->unique();
            $table->foreignId('student_id')->constrained('students')->onDelete('cascade');
            $table->string('title')->nullable();
            $table->integer('billing_month')->nullable();
            $table->integer('billing_year')->nullable();
            $table->decimal('current_fee', 12, 2)->default(0);
            $table->decimal('previous_debt', 12, 2)->default(0);
            $table->decimal('discount_amount', 12, 2)->default(0);
            $table->decimal('final_amount', 12, 2)->default(0);
            $table->decimal('amount', 12, 2)->default(0); 
            $table->enum('status', ['unpaid', 'partially_paid', 'paid', 'overdue'])->default('unpaid');
            $table->string('approval_status')->default('approved');
            $table->string('payment_method')->nullable();
            $table->dateTime('paid_at')->nullable();
            $table->foreignId('branch_id')->nullable()->constrained('branches')->onDelete('cascade');
            $table->timestamps();

            $table->index('paid_at');
        });

        // 10. Bảng Lịch sử Thanh toán
        Schema::create('payments', function (Blueprint $table) {
            $table->id();
            $table->string('receipt_code')->unique();
            $table->foreignId('student_id')->constrained('students')->onDelete('cascade');
            $table->decimal('amount_paid', 12, 2)->default(0);
            $table->string('payment_method')->default('transfer');
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
        // 11. Bảng Quản lý Kỳ thi
        Schema::create('exams', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->date('exam_date');
            $table->enum('scoring_type', ['multiple_subjects', 'single_total'])->default('multiple_subjects');
            $table->enum('status', ['draft', 'active', 'completed'])->default('draft');
            $table->string('exam_type')->default('mock_test');
            $table->json('display_settings')->nullable();
            $table->foreignId('branch_id')->nullable()->constrained('branches')->onDelete('cascade');
            $table->timestamps();
        });

        Schema::create('exam_shifts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('exam_id')->constrained('exams')->onDelete('cascade');
            $table->string('name');
            $table->time('start_time')->nullable();
            $table->time('end_time')->nullable();
            $table->timestamps();
        });

        Schema::create('exam_rooms', function (Blueprint $table) {
            $table->id();
            $table->foreignId('exam_shift_id')->constrained('exam_shifts')->onDelete('cascade');
            $table->string('name');
            $table->integer('capacity')->default(20);
            $table->timestamps();
        });

        // 12. Bảng Thí sinh & Điểm số
        Schema::create('exam_candidates', function (Blueprint $table) {
            $table->id();
            $table->foreignId('exam_id')->constrained('exams')->onDelete('cascade');
            $table->foreignId('student_id')->constrained('students')->onDelete('cascade');
            $table->foreignId('exam_shift_id')->nullable()->constrained('exam_shifts')->nullOnDelete();
            $table->foreignId('exam_room_id')->nullable()->constrained('exam_rooms')->nullOnDelete();
            $table->boolean('is_absent')->default(false);
            $table->string('candidate_number')->unique(); // Số báo danh (SBD)
            $table->json('scores')->nullable(); // Điểm chi tiết từng môn (Toán, Văn, Anh...)
            $table->decimal('total_score', 8, 2)->nullable();
            $table->integer('rank')->nullable();
            $table->boolean('is_scholarship')->default(false);
            $table->string('note')->nullable(); // Ghi chú theo yêu cầu
            $table->timestamps();
        });

        // 13. Bảng Thông báo (Notifications)
        Schema::create('notifications', function (Blueprint $table) {
            $table->id();
            $table->string('message');
            $table->string('type')->default('info'); // info, success, warning
            $table->boolean('is_read')->default(false);
            $table->foreignId('user_id')->nullable()->constrained('users')->onDelete('cascade'); // If null, means broadcast to all/admins
            $table->timestamps();
        });

        // 14. Bảng Phân quyền (Spatie Permission)
        $teams = config('permission.teams');
        $tableNames = config('permission.table_names');
        $columnNames = config('permission.column_names');
        $pivotRole = $columnNames['role_pivot_key'] ?? 'role_id';
        $pivotPermission = $columnNames['permission_pivot_key'] ?? 'permission_id';

        if (!empty($tableNames)) {
            Schema::create($tableNames['permissions'], static function (Blueprint $table) {
                $table->id();
                $table->string('name');
                $table->string('guard_name');
                $table->timestamps();
                $table->unique(['name', 'guard_name']);
            });

            Schema::create($tableNames['roles'], static function (Blueprint $table) use ($teams, $columnNames) {
                $table->id();
                if ($teams || config('permission.testing')) {
                    $table->unsignedBigInteger($columnNames['team_foreign_key'])->nullable();
                    $table->index($columnNames['team_foreign_key'], 'roles_team_foreign_key_index');
                }
                $table->string('name');
                $table->string('guard_name');
                $table->timestamps();
                if ($teams || config('permission.testing')) {
                    $table->unique([$columnNames['team_foreign_key'], 'name', 'guard_name']);
                } else {
                    $table->unique(['name', 'guard_name']);
                }
            });

            Schema::create($tableNames['model_has_permissions'], static function (Blueprint $table) use ($tableNames, $columnNames, $pivotPermission, $teams) {
                $table->unsignedBigInteger($pivotPermission);
                $table->string('model_type');
                $table->unsignedBigInteger($columnNames['model_morph_key']);
                $table->index([$columnNames['model_morph_key'], 'model_type'], 'model_has_permissions_model_id_model_type_index');
                $table->foreign($pivotPermission)->references('id')->on($tableNames['permissions'])->cascadeOnDelete();
                if ($teams) {
                    $table->unsignedBigInteger($columnNames['team_foreign_key']);
                    $table->index($columnNames['team_foreign_key'], 'model_has_permissions_team_foreign_key_index');
                    $table->primary([$columnNames['team_foreign_key'], $pivotPermission, $columnNames['model_morph_key'], 'model_type'], 'model_has_permissions_permission_model_type_primary');
                } else {
                    $table->primary([$pivotPermission, $columnNames['model_morph_key'], 'model_type'], 'model_has_permissions_permission_model_type_primary');
                }
            });

            Schema::create($tableNames['model_has_roles'], static function (Blueprint $table) use ($tableNames, $columnNames, $pivotRole, $teams) {
                $table->unsignedBigInteger($pivotRole);
                $table->string('model_type');
                $table->unsignedBigInteger($columnNames['model_morph_key']);
                $table->index([$columnNames['model_morph_key'], 'model_type'], 'model_has_roles_model_id_model_type_index');
                $table->foreign($pivotRole)->references('id')->on($tableNames['roles'])->cascadeOnDelete();
                if ($teams) {
                    $table->unsignedBigInteger($columnNames['team_foreign_key']);
                    $table->index($columnNames['team_foreign_key'], 'model_has_roles_team_foreign_key_index');
                    $table->primary([$columnNames['team_foreign_key'], $pivotRole, $columnNames['model_morph_key'], 'model_type'], 'model_has_roles_role_model_type_primary');
                } else {
                    $table->primary([$pivotRole, $columnNames['model_morph_key'], 'model_type'], 'model_has_roles_role_model_type_primary');
                }
            });

            Schema::create($tableNames['role_has_permissions'], static function (Blueprint $table) use ($tableNames, $pivotRole, $pivotPermission) {
                $table->unsignedBigInteger($pivotPermission);
                $table->unsignedBigInteger($pivotRole);
                $table->foreign($pivotPermission)->references('id')->on($tableNames['permissions'])->cascadeOnDelete();
                $table->foreign($pivotRole)->references('id')->on($tableNames['roles'])->cascadeOnDelete();
                $table->primary([$pivotPermission, $pivotRole], 'role_has_permissions_permission_id_role_id_primary');
            });
            app('cache')->store(config('permission.cache.store') != 'default' ? config('permission.cache.store') : null)->forget(config('permission.cache.key'));
        }
    }

    public function down(): void
    {
        $tableNames = config('permission.table_names');
        if (!empty($tableNames)) {
            Schema::dropIfExists($tableNames['role_has_permissions']);
            Schema::dropIfExists($tableNames['model_has_roles']);
            Schema::dropIfExists($tableNames['model_has_permissions']);
            Schema::dropIfExists($tableNames['roles']);
            Schema::dropIfExists($tableNames['permissions']);
        }
        
        Schema::dropIfExists('notifications');
        Schema::dropIfExists('exam_candidates');
        Schema::dropIfExists('exam_rooms');
        Schema::dropIfExists('exam_shifts');
        Schema::dropIfExists('exams');
        Schema::dropIfExists('payments');
        Schema::dropIfExists('invoices');
        Schema::dropIfExists('audit_logs');
        Schema::dropIfExists('attendance_logs');
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