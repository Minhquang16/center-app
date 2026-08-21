<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use Illuminate\Support\Facades\Auth;

class BranchMiddleware
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        if (Auth::check()) {
            $user = Auth::user();

            // Nếu user là Super Admin (branch_id = null)
            if ($user->branch_id === null) {
                // Kiểm tra xem frontend có gửi Header yêu cầu xem 1 cơ sở cụ thể không
                $requestedBranchId = $request->header('X-Branch-Id');
                
                if ($requestedBranchId) {
                    // Lưu vào config để Global Scope có thể đọc được
                    config(['app.active_branch_id' => $requestedBranchId]);
                }
            } else {
                // Nếu user thường, luôn set active_branch_id là branch của họ
                config(['app.active_branch_id' => $user->branch_id]);
            }
        }

        return $next($request);
    }
}
