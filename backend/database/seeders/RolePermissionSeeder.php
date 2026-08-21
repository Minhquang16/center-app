<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;
use App\Models\User;

class RolePermissionSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Reset cached roles and permissions
        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

        // 1. Tạo danh sách các Permissions cơ bản
        $permissions = [
            // Quản lý tài khoản và quyền
            'manage_users',
            'manage_roles',
            
            // Quản lý hệ thống
            'view_dashboard',
            'view_audit_logs',

            // Quản lý học sinh
            'view_students',
            'edit_students',
            'delete_students',

            // Quản lý lớp học & điểm danh
            'view_classes',
            'edit_classes',
            'delete_classes',
            'manage_attendance',

            // Quản lý thi cử
            'manage_exams',

            // Quản lý tài chính (học phí, hoá đơn)
            'view_finance',
            'manage_finance',
        ];

        foreach ($permissions as $permission) {
            Permission::firstOrCreate(['name' => $permission]);
        }

        // 2. Tạo các Roles mặc định và gán quyền
        $adminRole = Role::firstOrCreate(['name' => 'admin']);
        // Admin có toàn bộ quyền
        $adminRole->givePermissionTo(Permission::all());

        $accountantRole = Role::firstOrCreate(['name' => 'accountant']);
        $accountantRole->givePermissionTo([
            'view_students',
            'view_classes',
            'manage_attendance', // Kế toán có thể vẫn cần xem lớp học và điểm danh
            'view_finance',
            'manage_finance',
        ]);

        $memberRole = Role::firstOrCreate(['name' => 'member']);
        $memberRole->givePermissionTo([
            'view_students',
            'edit_students', // Giả sử thành viên (nhân viên) được phép thêm/sửa học sinh
            'view_classes',
            'manage_attendance',
            'manage_exams',
        ]);

        // 3. Migrate Users hiện tại (từ cột `role` tĩnh sang thư viện)
        $users = User::all();
        foreach ($users as $user) {
            // Kiểm tra cột role cũ và gán role mới tương ứng
            if ($user->role === 'admin') {
                $user->assignRole($adminRole);
            } elseif ($user->role === 'accountant') {
                $user->assignRole($accountantRole);
            } elseif ($user->role === 'member') {
                $user->assignRole($memberRole);
            }
        }
    }
}
