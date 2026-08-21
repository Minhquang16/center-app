<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Carbon\Carbon;
use App\Traits\HasBranchScope;

class Student extends Model
{
    use HasBranchScope;

    protected $fillable = [
        'student_code',
        'full_name',
        'dob',
        'grade',
        'class_type',
        'price_per_session',
        'start_date',
        'teacher_comment',
        'academic_status',
        'scholarship_count',
        'parent_name',
        'parent_phone',
        'status',
        'debt',
        'branch_id'
    ];

    public function attendances()
    {
        return $this->hasMany(Attendance::class);
    }

    // Kết nối lấy bản ghi điểm danh ngày hôm nay
    public function todayAttendance()
    {
        return $this->hasOne(Attendance::class)->whereDate('checked_at', Carbon::today());
    }

    public function branch()
    {
        return $this->belongsTo(Branch::class);
    }
}