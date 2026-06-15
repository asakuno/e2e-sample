<?php

declare(strict_types=1);

namespace App\UseCases\News;

use App\Data\News\NewsArticleData;
use App\Data\News\NewsSearchData;
use App\Repositories\NewsRepositoryInterface;

final class ListNewsUseCase
{
    public function __construct(
        private NewsRepositoryInterface $newsRepository,
    ) {}

    /**
     * @return array<int, NewsArticleData>
     */
    public function execute(NewsSearchData $filters): array
    {
        return $this->newsRepository
            ->search($filters)
            ->map(fn ($article): NewsArticleData => NewsArticleData::fromModel($article))
            ->all();
    }

    /**
     * @return array<int, array{value: int, label: string}>
     */
    public function stockOptions(): array
    {
        return $this->newsRepository
            ->findStocksWithNews()
            ->map(fn ($stock): array => [
                'value' => $stock->id,
                'label' => "{$stock->symbol} {$stock->name}",
            ])
            ->all();
    }
}
