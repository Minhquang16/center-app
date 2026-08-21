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
                    }
                }
            }
        });
    }
}
