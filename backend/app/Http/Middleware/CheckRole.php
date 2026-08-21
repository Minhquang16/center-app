<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckRole
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next, ...$roles): Response
    {
        if (!auth()->check()) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        $userRole = auth()->user()->role ?: 'admin';
        
        // Nếu $roles rỗng, có thể ai đăng nhập cũng qua được, nhưng ở đây ta yêu cầu phải có role cụ thể mới qua
        if (empty($roles)) {
             return response()->json(['message' => 'Quyền truy cập không hợp lệ.'], 403);
        }
        
        // Nếu role của user nằm trong danh sách roles được phép
        if (in_array($userRole, $roles)) {
            return $next($request);
        }

        return response()->json(['message' => 'Bạn không có quyền thực hiện hành động này.'], 403);
    }
}
