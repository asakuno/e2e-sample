<?php

declare(strict_types=1);

namespace App\Services\MarketData\Contracts;

use App\Data\MarketData\StockPriceData;
use App\Models\Stock;
use Illuminate\Support\Collection;

interface StockPriceProviderInterface
{
    /**
     * @return Collection<int, StockPriceData>
     */
    public function fetchDailyPrices(Stock $stock): Collection;
}
