<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
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

        $throttleKey = Str::transliterate(Str::lower($request->input('email')).'|'.$request->ip());

        // Check if the user has too many failed login attempts (5 attempts per minute)
        if (RateLimiter::tooManyAttempts($throttleKey, 5)) {
            $seconds = RateLimiter::availableIn($throttleKey);
            return response()->json([
                'message' => 'Bạn đã đăng nhập sai quá nhiều lần. Vui lòng thử lại sau ' . $seconds . ' giây.'
            ], 429);
        }

        if (Auth::attempt(['email' => $request->email, 'password' => $request->password])) {
            RateLimiter::clear($throttleKey);
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
                    'roles' => $user->roles->pluck('name'),
                    'permissions' => $user->getAllPermissions()->pluck('name'),
                ]
            ]);
        }

        RateLimiter::hit($throttleKey, 60);

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
        $user = $request->user();
        $userData = $user->toArray();
        $userData['roles'] = $user->roles->pluck('name');
        $userData['permissions'] = $user->getAllPermissions()->pluck('name');
        
        return response()->json($userData);
    }
}
