<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Carbon\Carbon;

class Student extends Model
{
    protected $fillable = [
        'student_code',
        'full_name',
        'dob',
        'grade',
        'parent_name',
        'parent_phone',
        'status'
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
}