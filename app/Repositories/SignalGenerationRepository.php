<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Data\Signal\GeneratedStockSignalData;
use App\Models\AnalysisResult;
use App\Models\NewsArticle;
use App\Models\StockSignal;
use App\Models\Watchlist;
use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;

final class SignalGenerationRepository implements SignalGenerationRepositoryInterface
{
    /**
     * @return array<int, int>
     */
    public function findTrackedStockIds(): array
    {
        return Watchlist::query()
            ->active()
            ->whereHas('stock', fn (Builder $query): Builder => $query->where('is_active', true))
            ->select('stock_id')
            ->distinct()
            ->orderBy('stock_id')
            ->pluck('stock_id')
            ->map(fn ($stockId): int => (int) $stockId)
            ->all();
    }

    /**
     * 元ニュース記事の公開日時とprompt versionで分析結果を絞り込む。
     *
     * @return Collection<int, AnalysisResult>
     */
    public function findNewsAnalysesBetween(
        int $stockId,
        CarbonInterface $from,
        CarbonInterface $to,
        string $promptVersion,
    ): Collection {
        return AnalysisResult::query()
            ->select('analysis_results.*')
            ->join('news_articles', 'news_articles.id', '=', 'analysis_results.analysable_id')
            ->with('analysable')
            ->where('analysis_results.stock_id', $stockId)
            ->where('analysis_results.analysable_type', NewsArticle::class)
            ->where('analysis_results.prompt_version', $promptVersion)
            ->whereBetween('news_articles.published_at', [$from, $to])
            ->orderBy('news_articles.published_at')
            ->orderBy('analysis_results.id')
            ->get();
    }

    public function upsertSignal(
        int $stockId,
        CarbonInterface $signalDate,
        GeneratedStockSignalData $data,
    ): StockSignal {
        $date = $signalDate->toDateString();
        StockSignal::query()->upsert(
            [
                [
                    'stock_id' => $stockId,
                    'signal_date' => $date,
                    'news_score' => $data->newsScore,
                    'disclosure_score' => $data->disclosureScore,
                    'macro_score' => $data->macroScore,
                    'total_score' => $data->totalScore,
                    'positive_count' => $data->positiveCount,
                    'negative_count' => $data->negativeCount,
                    'neutral_count' => $data->neutralCount,
                    'reason' => $data->reason,
                    'generated_at' => now(),
                ],
            ],
            ['stock_id', 'signal_date'],
            [
                'news_score',
                'disclosure_score',
                'macro_score',
                'total_score',
                'positive_count',
                'negative_count',
                'neutral_count',
                'reason',
                'generated_at',
            ],
        );

        return StockSignal::query()
            ->where('stock_id', $stockId)
            ->whereDate('signal_date', $date)
            ->firstOrFail();
    }
}
