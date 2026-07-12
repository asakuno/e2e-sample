<?php

declare(strict_types=1);

namespace App\UseCases\MarketData;

use App\Repositories\MarketIngestionRepositoryInterface;
use App\Services\MarketData\Contracts\NewsProviderInterface;
use RuntimeException;

final class FetchStockNewsUseCase
{
    public function __construct(
        private MarketIngestionRepositoryInterface $marketIngestionRepository,
        private NewsProviderInterface $newsProvider,
    ) {}

    public function execute(int $stockId): int
    {
        $stock = $this->marketIngestionRepository->findActiveStockById($stockId);

        if ($stock === null) {
            throw new RuntimeException("Active stock {$stockId} was not found.");
        }

        $savedCount = 0;

        foreach ($this->newsProvider->fetchNewsForStock($stock) as $article) {
            $this->marketIngestionRepository->upsertNewsArticle($stock->id, $article);
            $savedCount++;
        }

        return $savedCount;
    }
}
