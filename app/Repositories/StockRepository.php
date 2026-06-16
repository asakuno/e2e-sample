<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Data\Stock\StockSearchData;
use App\Models\AnalysisResult;
use App\Models\NewsArticle;
use App\Models\Stock;
use App\Models\StockPrice;
use App\Models\StockSignal;
use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;

final class StockRepository implements StockRepositoryInterface
{
    /**
     * @return Collection<int, Stock>
     */
    public function search(StockSearchData $filters): Collection
    {
        return Stock::query()
            ->active()
            ->when(
                $filters->q !== null,
                fn (Builder $query): Builder => $query->where(
                    fn (Builder $query): Builder => $query
                        ->where('symbol', 'like', "%{$filters->q}%")
                        ->orWhere('name', 'like', "%{$filters->q}%")
                )
            )
            ->when(
                $filters->market !== null,
                fn (Builder $query): Builder => $query->where('market', $filters->market)
            )
            ->orderBy('market')
            ->orderBy('symbol')
            ->get();
    }

    /**
     * @return array<int, string>
     */
    public function findAvailableMarkets(): array
    {
        return Stock::query()
            ->active()
            ->select('market')
            ->distinct()
            ->orderBy('market')
            ->pluck('market')
            ->all();
    }

    public function findActiveById(int $id): ?Stock
    {
        return Stock::query()
            ->active()
            ->find($id);
    }

    public function findLatestPriceByStockId(int $stockId): ?StockPrice
    {
        return StockPrice::query()
            ->where('stock_id', $stockId)
            ->whereNotNull('close')
            ->orderByDesc('price_date')
            ->orderByDesc('id')
            ->first();
    }

    /**
     * @return Collection<int, StockPrice>
     */
    public function findPricesByStockIdSince(int $stockId, CarbonInterface $since): Collection
    {
        return StockPrice::query()
            ->where('stock_id', $stockId)
            ->whereDate('price_date', '>=', $since->toDateString())
            ->whereNotNull('close')
            ->orderBy('price_date')
            ->orderBy('id')
            ->get();
    }

    /**
     * @return Collection<int, NewsArticle>
     */
    public function findRelatedNewsByStockId(int $stockId, int $limit): Collection
    {
        return NewsArticle::query()
            ->with([
                'stocks',
                'analysisResults' => fn ($query) => $query
                    ->where('stock_id', $stockId)
                    ->with('stock')
                    ->orderByDesc('analyzed_at')
                    ->orderByDesc('id'),
            ])
            ->whereHas(
                'stocks',
                fn (Builder $query): Builder => $query->whereKey($stockId),
            )
            ->orderByDesc('published_at')
            ->orderByDesc('id')
            ->limit($limit)
            ->get();
    }

    /**
     * @return Collection<int, AnalysisResult>
     */
    public function findAnalysisResultsByStockId(int $stockId, int $limit): Collection
    {
        return AnalysisResult::query()
            ->with('stock')
            ->where('stock_id', $stockId)
            ->orderByDesc('analyzed_at')
            ->orderByDesc('id')
            ->limit($limit)
            ->get();
    }

    /**
     * @return Collection<int, StockSignal>
     */
    public function findSignalsByStockId(int $stockId, int $limit): Collection
    {
        return StockSignal::query()
            ->where('stock_id', $stockId)
            ->orderByDesc('signal_date')
            ->orderByDesc('id')
            ->limit($limit)
            ->get();
    }
}
