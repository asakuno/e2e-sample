<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Data\MarketData\NewsArticleData;
use App\Data\MarketData\StockPriceData;
use App\Enums\MarketDataProvider;
use App\Models\NewsArticle;
use App\Models\StockPrice;

interface MarketIngestionRepositoryInterface
{
    /**
     * @return array<int, int>
     */
    public function findTrackedStockIds(MarketDataProvider $provider): array;

    public function findProviderSymbolForActiveStock(
        int $stockId,
        MarketDataProvider $provider,
    ): ?string;

    public function upsertStockPrice(int $stockId, StockPriceData $data): StockPrice;

    public function upsertNewsArticle(int $stockId, NewsArticleData $data): NewsArticle;
}
