<?php

namespace App\Scopes;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Scope;
use Illuminate\Support\Facades\Auth;

class BranchScope implements Scope
{
    /**
     * Apply the scope to a given Eloquent query builder.
     *
     * @param  \Illuminate\Database\Eloquent\Builder  $builder
     * @param  \Illuminate\Database\Eloquent\Model  $model
     * @return void
     */
    public function apply(Builder $builder, Model $model)
    {
        // Only apply if there is an authenticated user
        if (Auth::check()) {
            $user = Auth::user();
            
            // If user has a specific branch, force all queries to only get data for that branch
            if ($user->branch_id !== null) {
                $builder->where($model->getTable() . '.branch_id', $user->branch_id);
            } else {
                // If user is a super admin (branch_id = null)
                // We check if they have explicitly requested to view a specific branch via config/session
                // For APIs, this is usually set via middleware (BranchMiddleware)
                $requestedBranch = config('app.active_branch_id');
                if ($requestedBranch) {
                    $builder->where($model->getTable() . '.branch_id', $requestedBranch);
                }
            }
        }
    }
}
