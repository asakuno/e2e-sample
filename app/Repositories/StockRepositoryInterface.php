<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Data\Stock\StockSearchData;
use App\Models\Stock;
use App\Models\StockPrice;
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
}
