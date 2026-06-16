<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Enums\AnalysisSentiment;
use App\Models\AnalysisResult;
use App\Models\NewsArticle;
use App\Models\StockSignal;
use App\Models\Watchlist;
use Carbon\Carbon;
use Carbon\CarbonInterface;
use Illuminate\Support\Collection;

final class DashboardRepository implements DashboardRepositoryInterface
{
    public function countActiveWatchlists(int $userId): int
    {
        return Watchlist::query()
            ->forUser($userId)
            ->active()
            ->count();
    }

    public function countRecentAnalysesBySentiment(
        int $userId,
        AnalysisSentiment $sentiment,
        CarbonInterface $since,
    ): int {
        $stockIds = $this->activeStockIds($userId);

        if ($stockIds === []) {
            return 0;
        }

        return AnalysisResult::query()
            ->whereIn('stock_id', $stockIds)
            ->where('sentiment', $sentiment->value)
            ->where('analyzed_at', '>=', $since)
            ->count();
    }

    public function countUnanalysedNews(int $userId): int
    {
        $stockIds = $this->activeStockIds($userId);

        if ($stockIds === []) {
            return 0;
        }

        return NewsArticle::query()
            ->whereHas(
                'stocks',
                fn ($query) => $query->whereIn('stocks.id', $stockIds),
            )
            ->whereDoesntHave('analysisResults')
            ->count();
    }

    /**
     * @return Collection<int, StockSignal>
     */
    public function findTopSignals(int $userId, int $limit): Collection
    {
        $stockIds = $this->activeStockIds($userId);

        if ($stockIds === []) {
            return new Collection;
        }

        return StockSignal::query()
            ->with('stock')
            ->whereIn('stock_id', $stockIds)
            ->orderByDesc('total_score')
            ->orderByDesc('signal_date')
            ->orderByDesc('id')
            ->limit($limit)
            ->get();
    }

    /**
     * @return Collection<int, AnalysisResult>
     */
    public function findImportantNewsAnalyses(int $userId, int $limit): Collection
    {
        $stockIds = $this->activeStockIds($userId);

        if ($stockIds === []) {
            return new Collection;
        }

        return AnalysisResult::query()
            ->with(['stock', 'analysable'])
            ->whereIn('stock_id', $stockIds)
            ->where('analysable_type', NewsArticle::class)
            ->orderByRaw('ABS(impact_score) DESC')
            ->orderByDesc('analyzed_at')
            ->orderByDesc('id')
            ->limit($limit)
            ->get();
    }

    public function findLatestAnalysisAt(int $userId): ?CarbonInterface
    {
        $stockIds = $this->activeStockIds($userId);

        if ($stockIds === []) {
            return null;
        }

        $latest = AnalysisResult::query()
            ->whereIn('stock_id', $stockIds)
            ->max('analyzed_at');

        return $latest === null ? null : Carbon::parse($latest);
    }

    /**
     * @return array<string, int>
     */
    public function countAnalysesByDate(int $userId, CarbonInterface $from, CarbonInterface $to): array
    {
        $stockIds = $this->activeStockIds($userId);

        if ($stockIds === []) {
            return [];
        }

        /** @var array<string, int> $counts */
        $counts = AnalysisResult::query()
            ->selectRaw('DATE(analyzed_at) as analyzed_date, COUNT(*) as aggregate')
            ->whereIn('stock_id', $stockIds)
            ->whereBetween('analyzed_at', [$from->startOfDay(), $to->endOfDay()])
            ->groupByRaw('DATE(analyzed_at)')
            ->pluck('aggregate', 'analyzed_date')
            ->map(fn ($count): int => (int) $count)
            ->all();

        return $counts;
    }

    /**
     * @return array<int, int>
     */
    private function activeStockIds(int $userId): array
    {
        return Watchlist::query()
            ->forUser($userId)
            ->active()
            ->pluck('stock_id')
            ->all();
    }
}
