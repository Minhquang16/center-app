<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ExamRoom extends Model
{
    protected $fillable = ['exam_shift_id', 'name', 'capacity'];

    public function shift()
    {
        return $this->belongsTo(ExamShift::class, 'exam_shift_id');
    }

    public function candidates()
    {
        return $this->hasMany(ExamCandidate::class);
    }
}
