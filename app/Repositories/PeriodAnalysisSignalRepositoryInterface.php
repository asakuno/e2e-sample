<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Models\PeriodAnalysisSignal;

interface PeriodAnalysisSignalRepositoryInterface
{
    public function findForUserAndStock(int $userId, int $stockId): ?PeriodAnalysisSignal;

    /**
     * @param  array<string, mixed>  $attributes
     */
    public function upsertCurrent(int $userId, int $stockId, array $attributes): PeriodAnalysisSignal;
}
