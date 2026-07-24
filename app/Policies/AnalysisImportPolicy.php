<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\AnalysisImport;
use App\Models\User;

final class AnalysisImportPolicy
{
    public function view(User $user, AnalysisImport $analysisImport): bool
    {
        return $analysisImport->analysisBatch()->where('user_id', $user->id)->exists();
    }

    public function update(User $user, AnalysisImport $analysisImport): bool
    {
        return $this->view($user, $analysisImport);
    }
}
