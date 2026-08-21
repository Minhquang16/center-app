<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class UserController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        $users = User::with(['roles', 'branch'])->orderBy('created_at', 'desc')->get();
        // Map to keep backward compatibility with frontend expecting a single 'role' string
        $users->map(function($user) {
            $user->role_name = $user->roles->first()?->name ?? 'member';
            $user->branch_name = $user->branch ? $user->branch->name : 'Tất cả cơ sở';
            return $user;
        });
        return response()->json($users);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'password' => 'required|string|min:6',
            'role' => ['required', 'string', 'exists:roles,name'],
            'branch_id' => 'nullable|integer|exists:branches,id',
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => $validator->errors()->first()], 422);
        }

        try {
            DB::beginTransaction();

            $user = User::create([
                'name' => $request->name,
                'email' => $request->email,
                'password' => Hash::make($request->password),
                'branch_id' => $request->branch_id,
            ]);

            $user->assignRole($request->role);
            
            DB::commit();

            $user->load('roles');
            $user->role_name = $request->role;

            return response()->json([
                'message' => 'Tạo người dùng thành công',
                'user' => $user
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error creating user: ' . $e->getMessage());
            return response()->json(['message' => 'Có lỗi xảy ra khi tạo người dùng. Vui lòng thử lại sau.'], 500);
        }
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, $id)
    {
        $user = User::find($id);

        if (!$user) {
            return response()->json(['message' => 'Không tìm thấy người dùng'], 404);
        }

        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'email' => [
                'required',
                'string',
                'email',
                'max:255',
                Rule::unique('users')->ignore($user->id),
            ],
            'password' => 'nullable|string|min:6',
            'role' => ['nullable', 'string', 'exists:roles,name'],
            'branch_id' => 'nullable|integer|exists:branches,id',
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => $validator->errors()->first()], 422);
        }

        try {
            DB::beginTransaction();

            // Sửa lại thành logic chỉ cho phép cập nhật các trường cụ thể
            $user->name = $request->input('name', $user->name);
            $user->email = $request->input('email', $user->email);
            if ($request->has('branch_id')) {
                $user->branch_id = $request->branch_id;
            }
            
            if ($request->has('role')) {
                $user->syncRoles([$request->role]);
            }
            
            if ($request->filled('password')) {
                $user->password = Hash::make($request->password);
            }

            $user->save();
            DB::commit();

            $user->load('roles');
            $user->role_name = $user->roles->first()?->name;

            return response()->json([
                'message' => 'Cập nhật người dùng thành công',
                'user' => $user
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error updating user: ' . $e->getMessage());
            return response()->json(['message' => 'Có lỗi xảy ra khi cập nhật người dùng. Vui lòng thử lại sau.'], 500);
        }
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy($id)
    {
        $user = User::find($id);

        if (!$user) {
            return response()->json(['message' => 'Không tìm thấy người dùng'], 404);
        }

        // Không cho phép tự xóa chính mình nếu cần (tùy chọn, ở đây tạm không chặn cứng, nhưng thường nên có)
        if (auth()->id() == $user->id) {
            return response()->json(['message' => 'Bạn không thể tự xóa tài khoản đang đăng nhập!'], 403);
        }

        try {
            DB::beginTransaction();
            $user->delete();
            DB::commit();

            return response()->json(['message' => 'Đã xóa người dùng thành công']);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error deleting user: ' . $e->getMessage());
            return response()->json(['message' => 'Có lỗi xảy ra khi xóa người dùng. Vui lòng thử lại sau.'], 500);
        }
    }

    /**
     * Update the authenticated user's profile.
     */
    public function updateProfile(Request $request)
    {
        $user = $request->user();

        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'email' => [
                'required',
                'string',
                'email',
                'max:255',
                Rule::unique('users')->ignore($user->id),
            ],
            'password' => 'nullable|string|min:6',
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => $validator->errors()->first()], 422);
        }

        $user->name = $request->input('name', $user->name);
        $user->email = $request->input('email', $user->email);
        
        if ($request->filled('password')) {
            $user->password = Hash::make($request->password);
        }

        $user->save();

        return response()->json([
            'message' => 'Cập nhật thông tin thành công',
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'roles' => $user->roles->pluck('name'),
                'permissions' => $user->getAllPermissions()->pluck('name'),
            ]
        ]);
    }
}
