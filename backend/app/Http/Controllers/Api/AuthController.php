<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use App\Models\User;

class AuthController extends Controller
{
    // Đăng nhập
    public function login(Request $request)
    {
        $request->validate([
            'email'    => 'required|string|email',
            'password' => 'required|string',
        ]);

        if (Auth::attempt(['email' => $request->email, 'password' => $request->password])) {
            /** @var \App\Models\User $user */
            $user = Auth::user();

            // Tạo token đăng nhập (Sanctum)
            $token = $user->createToken('auth_token')->plainTextToken;

            return response()->json([
                'message' => 'Đăng nhập thành công!',
                'token'   => $token,
                'user'    => [
                    'id'    => $user->id,
                    'name'  => $user->name,
                    'email' => $user->email,
                ]
            ]);
        }

        return response()->json([
            'message' => 'Email hoặc mật khẩu không chính xác!'
        ], 401);
    }

    // Đăng xuất
    // Đăng xuất
    public function logout(Request $request)
    {
        /** @var User $user */
        $user = $request->user();

        if ($user) {
            // Xóa các token đăng nhập của user (sạch gạch đỏ 100%)
            $user->tokens()->delete();
        }

        return response()->json([
            'message' => 'Đã đăng xuất thành công!'
        ]);
    }

    // Lấy thông tin user hiện tại
    public function me(Request $request)
    {
        return response()->json($request->user());
    }
}
