<?php

declare(strict_types=1);

namespace App\UseCases\MarketData;

use App\Repositories\MarketIngestionRepositoryInterface;
use App\Services\MarketData\Contracts\StockPriceProviderInterface;
use RuntimeException;

final class FetchDailyStockPriceUseCase
{
    public function __construct(
        private MarketIngestionRepositoryInterface $marketIngestionRepository,
        private StockPriceProviderInterface $stockPriceProvider,
    ) {}

    public function execute(int $stockId): int
    {
        $stock = $this->marketIngestionRepository->findActiveStockById($stockId);

        if ($stock === null) {
            throw new RuntimeException("Active stock {$stockId} was not found.");
        }

        $savedCount = 0;

        foreach ($this->stockPriceProvider->fetchDailyPrices($stock) as $price) {
            $this->marketIngestionRepository->upsertStockPrice($stock->id, $price);
            $savedCount++;
        }

        return $savedCount;
    }
}
