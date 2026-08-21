<?php

namespace App\Models;

// 1. Khai báo import HasApiTokens và HasRoles
use Laravel\Sanctum\HasApiTokens;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Spatie\Permission\Traits\HasRoles;
use App\Traits\HasBranchScope;

class User extends Authenticatable
{
    // 2. Thêm HasApiTokens và HasRoles vào danh sách use bên trong class
    use HasApiTokens, HasFactory, Notifiable, HasRoles, HasBranchScope;

    protected $fillable = [
        'name',
        'email',
        'password',
        'status',
        'branch_id',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected $casts = [
        'email_verified_at' => 'datetime',
        'password' => 'hashed',
    ];

    public function branch()
    {
        return $this->belongsTo(Branch::class);
    }
}