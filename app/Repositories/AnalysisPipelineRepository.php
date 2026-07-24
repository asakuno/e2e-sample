<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Data\AI\ArticleAnalysisData;
use App\Models\AnalysisResult;
use App\Models\NewsArticle;
use App\Models\Stock;
use Illuminate\Support\Facades\DB;

final class AnalysisPipelineRepository implements AnalysisPipelineRepositoryInterface
{
    /**
     * @return array<int, array{news_article_id: int, stock_id: int}>
     */
    public function findPendingTargets(string $promptVersion, int $limit): array
    {
        $targets = DB::table('stock_news')
            ->join('news_articles', 'news_articles.id', '=', 'stock_news.news_article_id')
            ->join('stocks', 'stocks.id', '=', 'stock_news.stock_id')
            ->join('watchlists', function ($join): void {
                $join->on('watchlists.stock_id', '=', 'stocks.id')
                    ->where('watchlists.is_active', true);
            })
            ->where('stocks.is_active', true)
            ->whereNotExists(function ($query) use ($promptVersion): void {
                $query->selectRaw('1')
                    ->from('analysis_results')
                    ->whereColumn('analysis_results.stock_id', 'stock_news.stock_id')
                    ->whereColumn('analysis_results.analysable_id', 'stock_news.news_article_id')
                    ->where('analysis_results.analysable_type', NewsArticle::class)
                    ->where('analysis_results.prompt_version', $promptVersion);
            })
            ->select([
                'stock_news.news_article_id',
                'stock_news.stock_id',
            ])
            ->distinct()
            ->orderByDesc('news_articles.published_at')
            ->orderByDesc('stock_news.news_article_id')
            ->limit($limit)
            ->get();

        return $targets
            ->map(fn ($target): array => [
                'news_article_id' => (int) $target->news_article_id,
                'stock_id' => (int) $target->stock_id,
            ])
            ->all();
    }

    public function findNewsArticleById(int $newsArticleId): ?NewsArticle
    {
        return NewsArticle::query()->find($newsArticleId);
    }

    public function findActiveStockById(int $stockId): ?Stock
    {
        return Stock::query()->active()->find($stockId);
    }

    public function upsertAnalysis(
        int $newsArticleId,
        int $stockId,
        ArticleAnalysisData $data,
    ): AnalysisResult {
        return AnalysisResult::query()->updateOrCreate(
            [
                'stock_id' => $stockId,
                'analysable_type' => NewsArticle::class,
                'analysable_id' => $newsArticleId,
                'prompt_version' => $data->promptVersion,
            ],
            [
                'summary' => $data->summary,
                'sentiment' => $data->sentiment,
                'impact_score' => $data->impactScore,
                'confidence_score' => $data->confidenceScore,
                'time_horizon' => $data->timeHorizon,
                'positive_factors' => $data->positiveFactors,
                'negative_factors' => $data->negativeFactors,
                'risk_points' => $data->riskPoints,
                'reason' => $data->reason,
                'model_provider' => $data->modelProvider,
                'model_name' => $data->modelName,
                'input_tokens' => $data->inputTokens,
                'output_tokens' => $data->outputTokens,
                'analyzed_at' => now(),
            ],
        );
    }
}
