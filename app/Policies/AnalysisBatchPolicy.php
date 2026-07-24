<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\AnalysisBatch;
use App\Models\User;

final class AnalysisBatchPolicy
{
    public function view(User $user, AnalysisBatch $analysisBatch): bool
    {
        return $analysisBatch->user_id === $user->id;
    }

    public function export(User $user, AnalysisBatch $analysisBatch): bool
    {
        return $this->view($user, $analysisBatch);
    }

    public function import(User $user, AnalysisBatch $analysisBatch): bool
    {
        return $this->view($user, $analysisBatch);
    }

    public function replace(User $user, AnalysisBatch $analysisBatch): bool
    {
        return $this->view($user, $analysisBatch);
    }
}
