<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Invoice extends Model
{
    protected $fillable = [
        'invoice_code',
        'student_id',
        'title',
        'amount',
        'payment_method',
        'status',
        'paid_at'
    ];

    public function student()
    {
        return $this->belongsTo(Student::class, 'student_id');
    }
}