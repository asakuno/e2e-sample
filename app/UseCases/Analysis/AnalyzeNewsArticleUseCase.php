<?php

declare(strict_types=1);

namespace App\UseCases\Analysis;

use App\Repositories\AnalysisPipelineRepositoryInterface;
use App\Services\AI\Contracts\ArticleAnalyzerInterface;
use RuntimeException;

final class AnalyzeNewsArticleUseCase
{
    public function __construct(
        private AnalysisPipelineRepositoryInterface $analysisPipelineRepository,
        private ArticleAnalyzerInterface $articleAnalyzer,
    ) {}

    public function execute(int $newsArticleId, int $stockId): void
    {
        $article = $this->analysisPipelineRepository->findNewsArticleById($newsArticleId);
        $stock = $this->analysisPipelineRepository->findActiveStockById($stockId);

        if ($article === null || $stock === null) {
            throw new RuntimeException('The requested news analysis target was not found.');
        }

        $analysis = $this->articleAnalyzer->analyze($article, $stock);

        $this->analysisPipelineRepository->upsertAnalysis(
            newsArticleId: $article->id,
            stockId: $stock->id,
            data: $analysis,
        );
    }
}
