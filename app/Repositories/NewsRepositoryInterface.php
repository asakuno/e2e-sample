<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Data\News\NewsSearchData;
use App\Models\NewsArticle;
use App\Models\Stock;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection;

interface NewsRepositoryInterface
{
    /**
     * @return LengthAwarePaginator<int, NewsArticle>
     */
    public function search(NewsSearchData $filters): LengthAwarePaginator;

    /**
     * @return Collection<int, Stock>
     */
    public function findStocksWithNews(int $userId): Collection;
}
