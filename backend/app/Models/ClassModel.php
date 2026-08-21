<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Traits\HasBranchScope;

class ClassModel extends Model
{
    use HasBranchScope;

    protected $table = 'classes';

    protected $fillable = ['class_code', 'name', 'grade', 'schedule_note', 'schedules', 'teacher_id', 'price_per_session', 'status', 'branch_id'];

    protected $casts = [
        'schedules' => 'array'
    ];

    public function students()
    {
        return $this->belongsToMany(Student::class, 'class_student', 'class_id', 'student_id');
    }

    public function branch()
    {
        return $this->belongsTo(Branch::class);
    }
}
