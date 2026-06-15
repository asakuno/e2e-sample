<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Data\News\NewsSearchData;
use App\Models\NewsArticle;
use App\Models\Stock;
use Illuminate\Support\Collection;

interface NewsRepositoryInterface
{
    /**
     * @return Collection<int, NewsArticle>
     */
    public function search(NewsSearchData $filters): Collection;

    /**
     * @return Collection<int, Stock>
     */
    public function findStocksWithNews(): Collection;
}
