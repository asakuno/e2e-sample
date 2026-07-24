<?php

declare(strict_types=1);

namespace App\UseCases\News;

use App\Data\News\NewsArticleData;
use App\Data\News\NewsSearchData;
use App\Repositories\NewsRepositoryInterface;
use Illuminate\Pagination\LengthAwarePaginator;

final class ListNewsUseCase
{
    public function __construct(
        private NewsRepositoryInterface $newsRepository,
    ) {}

    /**
     * @return LengthAwarePaginator<int, NewsArticleData>
     */
    public function execute(NewsSearchData $filters): LengthAwarePaginator
    {
        return $this->newsRepository
            ->search($filters)
            ->through(
                fn ($article): NewsArticleData => NewsArticleData::fromModel($article),
            );
    }

    /**
     * @return array<int, array{value: int, label: string}>
     */
    public function stockOptions(int $userId): array
    {
        return $this->newsRepository
            ->findStocksWithNews($userId)
            ->map(fn ($stock): array => [
                'value' => $stock->id,
                'label' => "{$stock->symbol} {$stock->name}",
            ])
            ->all();
    }
}
