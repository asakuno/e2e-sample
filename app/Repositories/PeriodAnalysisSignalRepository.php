<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Models\PeriodAnalysisSignal;

final class PeriodAnalysisSignalRepository implements PeriodAnalysisSignalRepositoryInterface
{
    public function findForUserAndStock(int $userId, int $stockId): ?PeriodAnalysisSignal
    {
        return PeriodAnalysisSignal::query()
            ->where('user_id', $userId)
            ->where('stock_id', $stockId)
            ->first();
    }

    /**
     * @param  array<string, mixed>  $attributes
     */
    public function upsertCurrent(int $userId, int $stockId, array $attributes): PeriodAnalysisSignal
    {
        return PeriodAnalysisSignal::query()->updateOrCreate(
            [
                'user_id' => $userId,
                'stock_id' => $stockId,
            ],
            $attributes,
        );
    }
}
