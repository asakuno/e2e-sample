<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Data\News\NewsSearchData;
use App\Models\NewsArticle;
use App\Models\Stock;
use App\Models\Watchlist;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Query\Builder as QueryBuilder;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection;

final class NewsRepository implements NewsRepositoryInterface
{
    /**
     * @return LengthAwarePaginator<int, NewsArticle>
     */
    public function search(NewsSearchData $filters): LengthAwarePaginator
    {
        $fromUtc = $filters->fromUtc();
        $toExclusiveUtc = $filters->toExclusiveUtc();

        return NewsArticle::query()
            ->with([
                'stocks',
                'analysisResults' => fn ($query) => $query
                    ->with('stock')
                    ->where('analysis_results.prompt_version', $this->currentPromptVersion())
                    ->whereIn('stock_id', $this->activeStockIdsQuery($filters->userId))
                    ->when(
                        $filters->stockId !== null,
                        fn (Builder $query): Builder => $query->where('stock_id', $filters->stockId),
                    )
                    ->orderByDesc('analyzed_at')
                    ->orderByDesc('id'),
            ])
            ->whereHas(
                'stocks',
                function (Builder $query) use ($filters): Builder {
                    /** @var Builder<Stock> $query */
                    return $this->applyWatchedStockFilters($query, $filters);
                },
            )
            ->when(
                $filters->articleId !== null,
                fn (Builder $query): Builder => $query->whereKey($filters->articleId)
            )
            ->when(
                $fromUtc !== null,
                fn (Builder $query): Builder => $query->where('published_at', '>=', $fromUtc)
            )
            ->when(
                $toExclusiveUtc !== null,
                fn (Builder $query): Builder => $query->where('published_at', '<', $toExclusiveUtc)
            )
            ->orderByDesc('published_at')
            ->orderByDesc('id')
            ->paginate(20)
            ->withQueryString();
    }

    /**
     * @return Collection<int, Stock>
     */
    public function findStocksWithNews(int $userId): Collection
    {
        return Stock::query()
            ->active()
            ->whereHas(
                'watchlists',
                function (Builder $query) use ($userId): Builder {
                    /** @var Builder<Watchlist> $query */
                    return $query
                        ->forUser($userId)
                        ->active();
                },
            )
            ->whereHas('newsArticles')
            ->orderBy('market')
            ->orderBy('symbol')
            ->get();
    }

    /**
     * @param  Builder<Stock>  $query
     * @return Builder<Stock>
     */
    private function applyWatchedStockFilters(Builder $query, NewsSearchData $filters): Builder
    {
        return $query
            ->whereIn('stocks.id', $this->activeStockIdsQuery($filters->userId))
            ->when(
                $filters->stockId !== null,
                fn (Builder $query): Builder => $query->whereKey($filters->stockId),
            )
            ->when(
                $filters->sentiment !== null,
                fn (Builder $query): Builder => $query->whereExists(
                    fn (QueryBuilder $analysisQuery): QueryBuilder => $this->correlateAnalysisToArticleAndStock($analysisQuery)
                        ->where('analysis_results.sentiment', $filters->sentiment->value),
                ),
            )
            ->when(
                $filters->analysisStatus === NewsSearchData::ANALYSIS_STATUS_UNANALYZED,
                fn (Builder $query): Builder => $query->whereNotExists(
                    fn (QueryBuilder $analysisQuery): QueryBuilder => $this->correlateAnalysisToArticleAndStock($analysisQuery),
                ),
            );
    }

    private function correlateAnalysisToArticleAndStock(QueryBuilder $query): QueryBuilder
    {
        return $query
            ->selectRaw('1')
            ->from('analysis_results')
            ->where('analysis_results.analysable_type', NewsArticle::class)
            ->whereColumn('analysis_results.analysable_id', 'news_articles.id')
            ->whereColumn('analysis_results.stock_id', 'stocks.id')
            ->where('analysis_results.prompt_version', $this->currentPromptVersion());
    }

    /**
     * @return Builder<Watchlist>
     */
    private function activeStockIdsQuery(int $userId): Builder
    {
        return Watchlist::query()
            ->forUser($userId)
            ->active()
            ->select('stock_id');
    }

    private function currentPromptVersion(): string
    {
        return (string) config('services.openai.prompt_version', 'v1');
    }
}
