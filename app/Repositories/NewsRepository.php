<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Data\News\NewsSearchData;
use App\Models\NewsArticle;
use App\Models\Stock;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;

final class NewsRepository implements NewsRepositoryInterface
{
    /**
     * @return Collection<int, NewsArticle>
     */
    public function search(NewsSearchData $filters): Collection
    {
        return NewsArticle::query()
            ->with([
                'stocks',
                'analysisResults' => fn ($query) => $query->with('stock')->orderByDesc('analyzed_at')->orderByDesc('id'),
            ])
            ->when(
                $filters->articleId !== null,
                fn (Builder $query): Builder => $query->whereKey($filters->articleId)
            )
            ->when(
                $filters->stockId !== null,
                fn (Builder $query): Builder => $query->whereHas(
                    'stocks',
                    fn (Builder $query): Builder => $query->whereKey($filters->stockId)
                )
            )
            ->when(
                $filters->sentiment !== null,
                fn (Builder $query): Builder => $query->whereHas(
                    'analysisResults',
                    fn (Builder $query): Builder => $query->where('sentiment', $filters->sentiment->value)
                )
            )
            ->when(
                $filters->from !== null,
                fn (Builder $query): Builder => $query->whereDate('published_at', '>=', $filters->from)
            )
            ->when(
                $filters->to !== null,
                fn (Builder $query): Builder => $query->whereDate('published_at', '<=', $filters->to)
            )
            ->orderByDesc('published_at')
            ->orderByDesc('id')
            ->limit(50)
            ->get();
    }

    /**
     * @return Collection<int, Stock>
     */
    public function findStocksWithNews(): Collection
    {
        return Stock::query()
            ->active()
            ->whereHas('newsArticles')
            ->orderBy('market')
            ->orderBy('symbol')
            ->get();
    }
}
