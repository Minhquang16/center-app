<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. Học sinh
        DB::table('students')->whereNull('branch_id')->update(['branch_id' => 1]);
        
        // 2. Lớp học
        DB::table('classes')->whereNull('branch_id')->update(['branch_id' => 1]);
        
        // 3. Nhân viên (ngoại trừ tài khoản admin@gmail.com)
        DB::table('users')
            ->whereNull('branch_id')
            ->where('email', '!=', 'admin@gmail.com')
            ->update(['branch_id' => 1]);
            
        // Các bảng khác (nếu cần)
        DB::table('exams')->whereNull('branch_id')->update(['branch_id' => 1]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        //
    }
};
