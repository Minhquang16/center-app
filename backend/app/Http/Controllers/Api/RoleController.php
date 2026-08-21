<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;
use Illuminate\Validation\Rule;

class RoleController extends Controller
{
    /**
     * Get all roles with their associated permissions
     */
    public function index()
    {
        $roles = Role::with('permissions')->get();
        return response()->json($roles);
    }

    /**
     * Get all available permissions in the system
     */
    public function permissions()
    {
        $permissions = Permission::all();
        return response()->json($permissions);
    }

    /**
     * Create a new role and assign permissions
     */
    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|unique:roles,name',
            'permissions' => 'array',
            'permissions.*' => 'string|exists:permissions,name'
        ]);

        $role = Role::create(['name' => $request->name]);

        if ($request->has('permissions')) {
            $role->syncPermissions($request->permissions);
        }

        $role->load('permissions');

        return response()->json([
            'message' => 'Tạo vai trò thành công',
            'role' => $role
        ], 201);
    }

    /**
     * Update an existing role and its permissions
     */
    public function update(Request $request, $id)
    {
        $role = Role::findOrFail($id);

        $request->validate([
            'name' => [
                'required',
                'string',
                Rule::unique('roles', 'name')->ignore($role->id),
            ],
            'permissions' => 'array',
            'permissions.*' => 'string|exists:permissions,name'
        ]);

        // Không cho phép sửa tên vai trò admin hệ thống để tránh lỗi tự khóa
        if ($role->name === 'admin' && $request->name !== 'admin') {
            return response()->json(['message' => 'Không thể đổi tên vai trò Admin hệ thống'], 403);
        }

        $role->update(['name' => $request->name]);

        if ($request->has('permissions')) {
            // Không cho gỡ hết quyền của admin
            if ($role->name === 'admin') {
                 // Đảm bảo admin luôn có manage_roles và manage_users
                 $permissions = collect($request->permissions)->merge(['manage_roles', 'manage_users'])->unique()->toArray();
                 $role->syncPermissions($permissions);
            } else {
                 $role->syncPermissions($request->permissions);
            }
        }

        $role->load('permissions');

        return response()->json([
            'message' => 'Cập nhật vai trò thành công',
            'role' => $role
        ]);
    }

    /**
     * Delete a role
     */
    public function destroy($id)
    {
        $role = Role::findOrFail($id);

        // Bảo vệ vai trò cơ bản
        if (in_array($role->name, ['admin'])) {
            return response()->json(['message' => 'Không thể xóa vai trò hệ thống này'], 403);
        }

        if ($role->users()->count() > 0) {
            return response()->json(['message' => 'Không thể xóa vai trò đang được gán cho người dùng'], 400);
        }

        $role->delete();

        return response()->json(['message' => 'Xóa vai trò thành công']);
    }
}
