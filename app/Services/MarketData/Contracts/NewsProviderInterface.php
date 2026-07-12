<?php

declare(strict_types=1);

namespace App\Services\MarketData\Contracts;

use App\Data\MarketData\NewsArticleData;
use App\Models\Stock;
use Illuminate\Support\Collection;

interface NewsProviderInterface
{
    /**
     * @return Collection<int, NewsArticleData>
     */
    public function fetchNewsForStock(Stock $stock): Collection;
}
