<?php

declare(strict_types=1);

namespace App\UseCases\Analysis;

use App\Repositories\AnalysisPipelineRepositoryInterface;

final class ListPendingAnalysisTargetsUseCase
{
    public function __construct(
        private AnalysisPipelineRepositoryInterface $analysisPipelineRepository,
    ) {}

    /**
     * @return array<int, array{news_article_id: int, stock_id: int}>
     */
    public function execute(string $promptVersion, int $limit): array
    {
        return $this->analysisPipelineRepository->findPendingTargets($promptVersion, $limit);
    }
}
