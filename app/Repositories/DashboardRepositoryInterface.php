<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Enums\AnalysisSentiment;
use App\Models\AnalysisResult;
use App\Models\PeriodAnalysisSignal;
use Carbon\CarbonInterface;
use Illuminate\Support\Collection;

interface DashboardRepositoryInterface
{
    public function countActiveWatchlists(int $userId): int;

    public function countRecentAnalysesBySentiment(
        int $userId,
        AnalysisSentiment $sentiment,
        CarbonInterface $since,
    ): int;

    public function countUnanalysedNews(int $userId): int;

    /**
     * @return Collection<int, PeriodAnalysisSignal>
     */
    public function findTopSignals(int $userId, int $limit): Collection;

    /**
     * @return Collection<int, PeriodAnalysisSignal>
     */
    public function findAttentionSignals(int $userId, int $limit): Collection;

    /**
     * @return Collection<int, AnalysisResult>
     */
    public function findImportantNewsAnalyses(int $userId, int $limit): Collection;

    public function findLatestAnalysisAt(int $userId): ?CarbonInterface;

    /**
     * @return array<string, int>
     */
    public function countAnalysesByDate(int $userId, CarbonInterface $from, CarbonInterface $to): array;
}
