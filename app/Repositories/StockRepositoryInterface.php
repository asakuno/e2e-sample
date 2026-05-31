<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Data\Stock\StockSearchData;
use App\Models\Stock;
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
}
