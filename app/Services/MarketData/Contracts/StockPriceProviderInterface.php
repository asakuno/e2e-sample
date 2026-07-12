<?php

declare(strict_types=1);

namespace App\Services\MarketData\Contracts;

use App\Data\MarketData\StockPriceData;
use App\Enums\MarketDataProvider;
use Illuminate\Support\Collection;

interface StockPriceProviderInterface
{
    public function provider(): MarketDataProvider;

    /**
     * @return Collection<int, StockPriceData>
     */
    public function fetchDailyPrices(string $providerSymbol): Collection;
}
