<?php

declare(strict_types=1);

namespace App\UseCases\Dashboard;

use App\Data\Dashboard\DashboardActivityItemData;
use App\Data\Dashboard\DashboardStatData;
use App\Data\Dashboard\DashboardSummaryData;
use App\Data\Dashboard\DashboardTopStockData;
use App\Data\Dashboard\DashboardTrendData;
use App\Data\Dashboard\DashboardTrendPointData;
use App\Enums\AnalysisSentiment;
use App\Enums\DashboardStatKind;
use App\Models\NewsArticle;
use App\Repositories\DashboardRepositoryInterface;
use Carbon\CarbonImmutable;
use Carbon\CarbonInterface;

final class GetDashboardSummaryUseCase
{
    private const RECENT_DAYS = 7;

    public function __construct(
        private DashboardRepositoryInterface $dashboardRepository,
    ) {}

    public function execute(int $userId): DashboardSummaryData
    {
        $today = CarbonImmutable::today();
        $recentFrom = $today->subDays(self::RECENT_DAYS - 1)->startOfDay();
        $previousFrom = $recentFrom->subDays(self::RECENT_DAYS);
        $previousTo = $recentFrom->subDay()->endOfDay();

        $watchlistCount = $this->dashboardRepository->countActiveWatchlists($userId);
        $positiveCount = $this->dashboardRepository->countRecentAnalysesBySentiment(
            $userId,
            AnalysisSentiment::Positive,
            $recentFrom,
        );
        $negativeCount = $this->dashboardRepository->countRecentAnalysesBySentiment(
            $userId,
            AnalysisSentiment::Negative,
            $recentFrom,
        );
        $unanalysedNewsCount = $this->dashboardRepository->countUnanalysedNews($userId);
        $latestAnalysisAt = $this->dashboardRepository->findLatestAnalysisAt($userId);

        $recentCounts = $this->dashboardRepository->countAnalysesByDate($userId, $recentFrom, $today);
        $previousCounts = $this->dashboardRepository->countAnalysesByDate($userId, $previousFrom, $previousTo);
        $recentTotal = array_sum($recentCounts);
        $previousTotal = array_sum($previousCounts);

        return new DashboardSummaryData(
            stats: $this->buildStats(
                $watchlistCount,
                $positiveCount,
                $negativeCount,
                $unanalysedNewsCount,
                $latestAnalysisAt,
            ),
            recentTrend: new DashboardTrendData(
                total: $recentTotal,
                changePercent: $this->formatTrendChange($recentTotal, $previousTotal),
                changeDirection: $this->trendDirection($recentTotal, $previousTotal),
                description: '直近7日の分析件数',
                points: $this->buildTrendPoints($recentCounts, $recentFrom, $today),
            ),
            topStocks: $this->buildTopStocks($userId),
            importantNews: $this->buildImportantNews($userId),
            latestAnalysisAt: $latestAnalysisAt?->format('Y-m-d H:i'),
        );
    }

    /**
     * @return array<int, DashboardStatData>
     */
    private function buildStats(
        int $watchlistCount,
        int $positiveCount,
        int $negativeCount,
        int $unanalysedNewsCount,
        ?CarbonInterface $latestAnalysisAt,
    ): array {
        return [
            new DashboardStatData(
                kind: DashboardStatKind::Watchlist,
                value: $watchlistCount,
            ),
            new DashboardStatData(
                kind: DashboardStatKind::PositiveAnalysis,
                value: $positiveCount,
            ),
            new DashboardStatData(
                kind: DashboardStatKind::NegativeAnalysis,
                value: $negativeCount,
            ),
            new DashboardStatData(
                kind: DashboardStatKind::UnanalyzedNews,
                value: $unanalysedNewsCount,
            ),
            new DashboardStatData(
                kind: DashboardStatKind::LatestAnalysis,
                value: $latestAnalysisAt?->format('Y-m-d H:i'),
            ),
        ];
    }

    /**
     * @param  array<string, int>  $counts
     * @return array<int, DashboardTrendPointData>
     */
    private function buildTrendPoints(array $counts, CarbonImmutable $from, CarbonImmutable $to): array
    {
        $points = [];

        for ($date = $from; $date->lte($to); $date = $date->addDay()) {
            $key = $date->toDateString();
            $points[] = new DashboardTrendPointData(
                label: $date->format('n/j'),
                value: $counts[$key] ?? 0,
            );
        }

        return $points;
    }

    /**
     * @return array<int, DashboardTopStockData>
     */
    private function buildTopStocks(int $userId): array
    {
        return $this->dashboardRepository
            ->findTopSignals($userId, 10)
            ->unique('stock_id')
            ->take(5)
            ->values()
            ->map(fn ($signal): DashboardTopStockData => new DashboardTopStockData(
                id: $signal->stock->id,
                symbol: $signal->stock->symbol,
                name: $signal->stock->name,
                market: $signal->stock->market,
                totalScore: (float) $signal->total_score,
                positiveCount: $signal->positive_count,
                negativeCount: $signal->negative_count,
                reason: $signal->reason,
                signalDate: $this->formatDate($signal->signal_date),
            ))
            ->all();
    }

    /**
     * @return array<int, DashboardActivityItemData>
     */
    private function buildImportantNews(int $userId): array
    {
        return $this->dashboardRepository
            ->findImportantNewsAnalyses($userId, 5)
            ->map(function ($analysis): DashboardActivityItemData {
                $article = $analysis->analysable instanceof NewsArticle ? $analysis->analysable : null;
                $impactScore = $analysis->impact_score;

                return new DashboardActivityItemData(
                    id: $analysis->id,
                    articleId: $article instanceof NewsArticle ? (int) $article->getKey() : null,
                    title: $article instanceof NewsArticle ? $article->title : "{$analysis->stock->symbol} の分析結果",
                    description: "{$analysis->stock->symbol} / impact {$impactScore}: {$analysis->summary}",
                    timeAgo: $this->formatDateTime($analysis->analyzed_at) ?? '',
                    dotColor: $this->dotColor($this->resolveSentiment($analysis->getAttribute('sentiment'))),
                );
            })
            ->all();
    }

    private function formatTrendChange(int $currentTotal, int $previousTotal): string
    {
        if ($previousTotal === 0) {
            return $currentTotal === 0 ? '0件' : "+{$currentTotal}件";
        }

        $change = (($currentTotal - $previousTotal) / $previousTotal) * 100;

        return sprintf('%+.1f%%', $change);
    }

    private function trendDirection(int $currentTotal, int $previousTotal): string
    {
        return match (true) {
            $currentTotal > $previousTotal => 'up',
            $currentTotal < $previousTotal => 'down',
            default => 'neutral',
        };
    }

    private function dotColor(AnalysisSentiment $sentiment): string
    {
        return match ($sentiment) {
            AnalysisSentiment::Positive => 'green',
            AnalysisSentiment::Negative => 'orange',
            AnalysisSentiment::Neutral => 'blue',
        };
    }

    private function resolveSentiment(mixed $value): AnalysisSentiment
    {
        if ($value instanceof AnalysisSentiment) {
            return $value;
        }

        return AnalysisSentiment::from((int) $value);
    }

    private function formatDate(mixed $value): ?string
    {
        if ($value === null) {
            return null;
        }

        if ($value instanceof CarbonInterface) {
            return $value->toDateString();
        }

        return CarbonImmutable::parse((string) $value)->toDateString();
    }

    private function formatDateTime(mixed $value): ?string
    {
        if ($value === null) {
            return null;
        }

        if ($value instanceof CarbonInterface) {
            return $value->format('Y-m-d H:i');
        }

        return CarbonImmutable::parse((string) $value)->format('Y-m-d H:i');
    }
}
