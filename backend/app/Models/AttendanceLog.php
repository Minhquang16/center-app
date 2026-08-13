<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AttendanceLog extends Model
{
    protected $fillable = [
        'user_id',
        'class_id',
        'shift',
        'action_type',
        'student_count'
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function classroom()
    {
        return $this->belongsTo(Classroom::class, 'class_id'); // Assuming the class model is actually named Classroom or ClassModel, let me check classes table
    }
}
