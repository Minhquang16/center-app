<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Traits\HasBranchScope;

class Exam extends Model
{
    use HasFactory, HasBranchScope;

    protected $fillable = ['name', 'exam_date', 'scoring_type', 'status', 'exam_type', 'display_settings', 'branch_id'];

    protected $casts = [
        'display_settings' => 'array'
    ];

    public function candidates()
    {
        return $this->hasMany(ExamCandidate::class);
    }

    public function shifts()
    {
        return $this->hasMany(ExamShift::class);
    }

    public function branch()
    {
        return $this->belongsTo(Branch::class);
    }
}
