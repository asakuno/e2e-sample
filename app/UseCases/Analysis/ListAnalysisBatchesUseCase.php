<?php

declare(strict_types=1);

namespace App\UseCases\Analysis;

use App\Models\AnalysisBatch;
use App\Repositories\AnalysisBatchRepositoryInterface;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

final class ListAnalysisBatchesUseCase
{
    public function __construct(
        private readonly AnalysisBatchRepositoryInterface $analysisBatchRepository,
    ) {}

    /**
     * @return LengthAwarePaginator<int, AnalysisBatch>
     */
    public function execute(int $userId): LengthAwarePaginator
    {
        return $this->analysisBatchRepository->paginateOwned($userId);
    }
}
