<?php

namespace App\Traits;

use App\Scopes\BranchScope;
use Illuminate\Support\Facades\Auth;

trait HasBranchScope
{
    /**
     * Boot the trait and apply the global scope.
     *
     * @return void
     */
    protected static function bootHasBranchScope()
    {
        static::addGlobalScope(new BranchScope);

        // Tự động gán branch_id khi tạo mới (nếu chưa có)
        static::creating(function ($model) {
            if (Auth::check() && empty($model->branch_id)) {
                $user = Auth::user();
                if ($user->branch_id !== null) {
                    $model->branch_id = $user->branch_id;
                } else {
                    // Nếu là Super Admin thì lấy branch_id đang được active (nếu có)
                    $requestedBranch = config('app.active_branch_id');
                    if ($requestedBranch) {
                        $model->branch_id = $requestedBranch;
                    } else {
                        // Nu cha chn c sY c th (`ang Y Tt c c sY), chn khA'ng cho ThAm m>i
                        throw \Illuminate\Validation\ValidationException::withMessages([
                            'branch_id' => 'Vui lòng chọn một Cơ sở cụ thể ở menu bên trái để thực hiện thêm dữ liệu (không chọn "Tất cả cơ sở").'
                        ]);
                    }
                }
            }
        });
    }
}
