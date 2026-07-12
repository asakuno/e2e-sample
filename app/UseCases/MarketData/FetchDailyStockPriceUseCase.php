<?php

declare(strict_types=1);

namespace App\UseCases\MarketData;

use App\Repositories\MarketIngestionRepositoryInterface;
use App\Services\MarketData\Contracts\StockPriceProviderInterface;

final class FetchDailyStockPriceUseCase
{
    public function __construct(
        private MarketIngestionRepositoryInterface $marketIngestionRepository,
        private StockPriceProviderInterface $stockPriceProvider,
    ) {}

    public function execute(int $stockId): int
    {
        $providerSymbol = $this->marketIngestionRepository->findProviderSymbolForActiveStock(
            $stockId,
            $this->stockPriceProvider->provider(),
        );

        if ($providerSymbol === null) {
            return 0;
        }

        $savedCount = 0;

        foreach ($this->stockPriceProvider->fetchDailyPrices($providerSymbol) as $price) {
            $this->marketIngestionRepository->upsertStockPrice($stockId, $price);
            $savedCount++;
        }

        return $savedCount;
    }
}
