<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // Tạo cơ sở mặc định đầu tiên
        $branch = \App\Models\Branch::create([
            'name' => 'Cơ sở Chính',
            'address' => 'Hà Nội',
            'phone' => '0988888888',
        ]);

        $user = User::create([
            'name'     => 'Quản Trị Viên',
            'email'    => 'admin@gmail.com',
            'password' => Hash::make('123456'),
            'branch_id'=> null, // Super Admin không thuộc cơ sở cụ thể nào
        ]);
        
        $this->call(RolePermissionSeeder::class);

        // Assign Spatie role
        $user->assignRole('admin');
    }
}