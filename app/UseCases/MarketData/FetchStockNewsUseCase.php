<?php

declare(strict_types=1);

namespace App\UseCases\MarketData;

use App\Repositories\MarketIngestionRepositoryInterface;
use App\Services\MarketData\Contracts\NewsProviderInterface;

final class FetchStockNewsUseCase
{
    public function __construct(
        private MarketIngestionRepositoryInterface $marketIngestionRepository,
        private NewsProviderInterface $newsProvider,
    ) {}

    public function execute(int $stockId): int
    {
        $providerSymbol = $this->marketIngestionRepository->findProviderSymbolForActiveStock(
            $stockId,
            $this->newsProvider->provider(),
        );

        if ($providerSymbol === null) {
            return 0;
        }

        $savedCount = 0;

        foreach ($this->newsProvider->fetchNewsForStock($providerSymbol) as $article) {
            $this->marketIngestionRepository->upsertNewsArticle($stockId, $article);
            $savedCount++;
        }

        return $savedCount;
    }
}
