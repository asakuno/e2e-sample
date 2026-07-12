<?php

declare(strict_types=1);

namespace App\Services\Dashboard;

use App\Data\Dashboard\DashboardActivityItemData;
use App\Data\Dashboard\DashboardStatData;
use App\Data\Dashboard\DashboardSummaryData;
use App\Data\Dashboard\DashboardTopStockData;
use App\Data\Dashboard\DashboardTrendData;
use App\Data\Dashboard\DashboardTrendPointData;
use App\Enums\AnalysisSentiment;
use App\Enums\DashboardStatKind;
use App\Models\AnalysisResult;
use App\Models\NewsArticle;
use App\Models\StockPrice;
use App\Models\StockSignal;
use Carbon\CarbonImmutable;
use Carbon\CarbonInterface;
use Illuminate\Support\Collection;

final class DashboardSummaryAssembler
{
    /**
     * @param  array<string, int>  $recentCounts
     * @param  array<string, int>  $previousCounts
     * @param  Collection<int, StockSignal>  $topSignals
     * @param  Collection<int, StockSignal>  $attentionSignals
     * @param  Collection<int, AnalysisResult>  $importantNewsAnalyses
     */
    public function assemble(
        int $watchlistCount,
        int $positiveCount,
        int $negativeCount,
        int $unanalysedNewsCount,
        ?CarbonInterface $latestAnalysisAt,
        array $recentCounts,
        array $previousCounts,
        CarbonImmutable $recentFrom,
        CarbonImmutable $recentTo,
        Collection $topSignals,
        Collection $attentionSignals,
        Collection $importantNewsAnalyses,
    ): DashboardSummaryData {
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
                points: $this->buildTrendPoints($recentCounts, $recentFrom, $recentTo),
            ),
            topStocks: $this->buildStocks($topSignals),
            attentionStocks: $this->buildStocks($attentionSignals),
            importantNews: $this->buildImportantNews($importantNewsAnalyses),
            latestAnalysisAt: $this->formatDateTime($latestAnalysisAt),
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
                value: $this->formatDateTime($latestAnalysisAt),
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
     * @param  Collection<int, StockSignal>  $signals
     * @return array<int, DashboardTopStockData>
     */
    private function buildStocks(Collection $signals): array
    {
        return $signals
            ->map(fn (StockSignal $signal): DashboardTopStockData => $this->toTopStockData($signal))
            ->all();
    }

    /**
     * @param  Collection<int, AnalysisResult>  $analyses
     * @return array<int, DashboardActivityItemData>
     */
    private function buildImportantNews(Collection $analyses): array
    {
        return $analyses
            ->map(function (AnalysisResult $analysis): DashboardActivityItemData {
                $article = $analysis->analysable instanceof NewsArticle ? $analysis->analysable : null;
                $impactScore = $analysis->impact_score;

                return new DashboardActivityItemData(
                    id: $analysis->id,
                    articleId: $article instanceof NewsArticle ? (int) $article->getKey() : null,
                    title: $article instanceof NewsArticle ? $article->title : "{$analysis->stock->symbol} の分析結果",
                    description: "{$analysis->stock->symbol} / impact {$impactScore}: {$analysis->summary}",
                    timeAgo: $this->formatDateTime($analysis->analyzed_at) ?? '',
                    dotColor: $this->dotColor($this->resolveSentiment($analysis->getAttribute('sentiment'))),
                    source: $article?->source,
                    publishedAt: $this->formatDateTime($article?->published_at),
                );
            })
            ->all();
    }

    private function toTopStockData(StockSignal $signal): DashboardTopStockData
    {
        $prices = $signal->stock->prices;
        $latestPrice = $prices->get(0);
        $previousPrice = $prices->get(1);
        $latestValue = $latestPrice instanceof StockPrice ? $this->priceValue($latestPrice) : null;
        $previousValue = $previousPrice instanceof StockPrice ? $this->priceValue($previousPrice) : null;
        $sentiment = $this->nullableSentiment(
            $signal->stock->analysisResults->first()?->getAttribute('sentiment'),
        );

        return new DashboardTopStockData(
            id: $signal->stock->id,
            symbol: $signal->stock->symbol,
            name: $signal->stock->name,
            market: $signal->stock->market,
            totalScore: (float) $signal->total_score,
            latestPrice: $latestValue,
            changePercent: $this->priceChangePercent($latestValue, $previousValue),
            sentiment: $sentiment?->value,
            sentimentLabel: $sentiment?->label(),
            positiveCount: $signal->positive_count,
            negativeCount: $signal->negative_count,
            reason: $signal->reason,
            signalDate: $this->formatDate($signal->signal_date),
            updatedAt: $this->formatDateTime($signal->generated_at),
        );
    }

    private function priceValue(StockPrice $price): ?float
    {
        $value = $price->adjusted_close ?? $price->close;

        return $value === null ? null : (float) $value;
    }

    private function priceChangePercent(?float $latest, ?float $previous): ?float
    {
        if ($latest === null || $previous === null || $previous == 0.0) {
            return null;
        }

        return round((($latest - $previous) / $previous) * 100, 2);
    }

    private function nullableSentiment(mixed $value): ?AnalysisSentiment
    {
        if ($value === null) {
            return null;
        }

        return $this->resolveSentiment($value);
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
