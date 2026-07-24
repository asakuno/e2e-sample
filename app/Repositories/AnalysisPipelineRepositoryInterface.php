<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Data\AI\ArticleAnalysisData;
use App\Models\AnalysisResult;
use App\Models\NewsArticle;
use App\Models\Stock;

interface AnalysisPipelineRepositoryInterface
{
    /**
     * @return array<int, array{news_article_id: int, stock_id: int}>
     */
    public function findPendingTargets(string $promptVersion, int $limit): array;

    public function findNewsArticleById(int $newsArticleId): ?NewsArticle;

    public function findActiveStockById(int $stockId): ?Stock;

    public function upsertAnalysis(
        int $newsArticleId,
        int $stockId,
        ArticleAnalysisData $data,
    ): AnalysisResult;
}
