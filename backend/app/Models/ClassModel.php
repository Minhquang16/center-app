<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ClassModel extends Model
{
    protected $table = 'classes';

    protected $fillable = ['class_code', 'name', 'grade', 'schedule_note'];

    public function students()
    {
        return $this->belongsToMany(Student::class, 'class_student', 'class_model_id', 'student_id');
    }
}
