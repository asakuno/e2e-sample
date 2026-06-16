<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Data\Stock\StockSearchData;
use App\Models\AnalysisResult;
use App\Models\NewsArticle;
use App\Models\Stock;
use App\Models\StockPrice;
use App\Models\StockSignal;
use Carbon\CarbonInterface;
use Illuminate\Support\Collection;

interface StockRepositoryInterface
{
    /**
     * @return Collection<int, Stock>
     */
    public function search(StockSearchData $filters): Collection;

    /**
     * @return array<int, string>
     */
    public function findAvailableMarkets(): array;

    public function findActiveById(int $id): ?Stock;

    public function findLatestPriceByStockId(int $stockId): ?StockPrice;

    /**
     * @return Collection<int, StockPrice>
     */
    public function findPricesByStockIdSince(int $stockId, CarbonInterface $since): Collection;

    /**
     * @return Collection<int, NewsArticle>
     */
    public function findRelatedNewsByStockId(int $stockId, int $limit): Collection;

    /**
     * @return Collection<int, AnalysisResult>
     */
    public function findAnalysisResultsByStockId(int $stockId, int $limit): Collection;

    /**
     * @return Collection<int, StockSignal>
     */
    public function findSignalsByStockId(int $stockId, int $limit): Collection;
}
