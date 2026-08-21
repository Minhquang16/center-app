<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ExamCandidate extends Model
{
    use HasFactory;

    protected $fillable = [
        'exam_id',
        'student_id',
        'exam_shift_id',
        'exam_room_id',
        'is_absent',
        'candidate_number',
        'scores',
        'total_score',
        'rank',
        'is_scholarship',
        'note',
    ];

    protected $casts = [
        'scores' => 'array',
        'is_scholarship' => 'boolean',
        'is_absent' => 'boolean'
    ];

    public function exam()
    {
        return $this->belongsTo(Exam::class);
    }

    public function student()
    {
        return $this->belongsTo(Student::class);
    }

    public function shift()
    {
        return $this->belongsTo(ExamShift::class, 'exam_shift_id');
    }

    public function room()
    {
        return $this->belongsTo(ExamRoom::class, 'exam_room_id');
    }
}
