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
        // 1. Quét và dọn dẹp các bản ghi điểm danh bị null
        DB::table('attendances')->whereNull('branch_id')->update(['branch_id' => 1]);
        
        // 2. Tìm các bản ghi bị nhân đôi (cùng student_id, cùng ngày)
        // và chỉ giữ lại 1 bản ghi duy nhất (min_id)
        $duplicates = DB::table('attendances')
            ->selectRaw('MIN(id) as min_id, student_id, DATE(checked_at) as date')
            ->groupBy('student_id', DB::raw('DATE(checked_at)'))
            ->havingRaw('COUNT(id) > 1')
            ->get();

        foreach ($duplicates as $dup) {
            DB::table('attendances')
                ->where('student_id', $dup->student_id)
                ->whereDate('checked_at', $dup->date)
                ->where('id', '!=', $dup->min_id)
                ->delete();
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        //
    }
};
