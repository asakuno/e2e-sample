<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Data\MarketData\NewsArticleData;
use App\Data\MarketData\StockPriceData;
use App\Models\NewsArticle;
use App\Models\Stock;
use App\Models\StockPrice;

interface MarketIngestionRepositoryInterface
{
    /**
     * @return array<int, int>
     */
    public function findTrackedStockIds(): array;

    public function findActiveStockById(int $stockId): ?Stock;

    public function upsertStockPrice(int $stockId, StockPriceData $data): StockPrice;

    public function upsertNewsArticle(int $stockId, NewsArticleData $data): NewsArticle;
}
