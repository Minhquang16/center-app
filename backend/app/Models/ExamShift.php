<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ExamShift extends Model
{
    protected $fillable = ['exam_id', 'name', 'start_time', 'end_time'];

    public function exam()
    {
        return $this->belongsTo(Exam::class);
    }

    public function rooms()
    {
        return $this->hasMany(ExamRoom::class);
    }

    public function candidates()
    {
        return $this->hasMany(ExamCandidate::class);
    }
}
