<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Data\Analysis\PersistAnalysisBatchData;
use App\Models\AnalysisBatch;
use App\Models\NewsArticle;
use Carbon\CarbonInterface;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

interface AnalysisBatchRepositoryInterface
{
    public function findOwnedByPublicId(int $userId, string $publicId): ?AnalysisBatch;

    public function findOwnedByInputHash(int $userId, string $inputHash): ?AnalysisBatch;

    /**
     * @return list<NewsArticle>
     */
    public function findNewsCandidates(
        int $userId,
        int $stockId,
        CarbonInterface $from,
        CarbonInterface $to,
    ): array;

    public function create(PersistAnalysisBatchData $data): AnalysisBatch;

    public function lockOwnedById(int $userId, int $batchId): ?AnalysisBatch;

    public function findLatestCompletedByUserAndStock(
        int $userId,
        int $stockId,
    ): ?AnalysisBatch;

    /**
     * @return LengthAwarePaginator<int, AnalysisBatch>
     */
    public function paginateOwned(int $userId, int $perPage = 15): LengthAwarePaginator;
}
