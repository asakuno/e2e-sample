<?php

declare(strict_types=1);

namespace App\Services\MarketData\Contracts;

use App\Data\MarketData\NewsArticleData;
use App\Enums\MarketDataProvider;
use Illuminate\Support\Collection;

interface NewsProviderInterface
{
    public function provider(): MarketDataProvider;

    /**
     * @return Collection<int, NewsArticleData>
     */
    public function fetchNewsForStock(string $providerSymbol): Collection;
}
