<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Traits\HasBranchScope;

class Attendance extends Model
{
    use HasBranchScope;

    protected $fillable = [
        'student_id',
        'class_session_id',
        'class_id',
        'shift',
        'created_by',
        'checked_at',
        'status',
        'session_fee',
        'score',
        'homework_status',
        'comment',
        'note',
        'branch_id'
    ];

    public function student()
    {
        return $this->belongsTo(Student::class);
    }

    public function classroom()
    {
        return $this->belongsTo(ClassModel::class, 'class_id');
    }

    public function branch()
    {
        return $this->belongsTo(Branch::class);
    }
}