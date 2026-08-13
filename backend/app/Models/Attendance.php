<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Attendance extends Model
{
    protected $fillable = [
        'student_id',
        'class_model_id',
        'checked_at',
        'status',
        'session_fee',
        'score',
        'homework_status',
        'comment',
        'note'
    ];

    public function student()
    {
        return $this->belongsTo(Student::class);
    }
}