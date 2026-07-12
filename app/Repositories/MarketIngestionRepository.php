<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Data\MarketData\NewsArticleData;
use App\Data\MarketData\StockPriceData;
use App\Enums\MarketDataProvider;
use App\Models\NewsArticle;
use App\Models\StockPrice;
use App\Models\StockProviderSymbol;
use App\Models\Watchlist;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;

final class MarketIngestionRepository implements MarketIngestionRepositoryInterface
{
    /**
     * @return array<int, int>
     */
    public function findTrackedStockIds(MarketDataProvider $provider): array
    {
        return Watchlist::query()
            ->active()
            ->whereHas(
                'stock',
                fn (Builder $query): Builder => $query
                    ->where('is_active', true)
                    ->whereHas(
                        'providerSymbols',
                        fn (Builder $query): Builder => $query
                            ->where('provider', $provider->value)
                            ->whereRaw("TRIM(provider_symbol) <> ''"),
                    ),
            )
            ->select('stock_id')
            ->distinct()
            ->orderBy('stock_id')
            ->pluck('stock_id')
            ->map(fn ($stockId): int => (int) $stockId)
            ->all();
    }

    public function findProviderSymbolForActiveStock(
        int $stockId,
        MarketDataProvider $provider,
    ): ?string {
        $providerSymbol = StockProviderSymbol::query()
            ->where('stock_id', $stockId)
            ->where('provider', $provider->value)
            ->whereRaw("TRIM(provider_symbol) <> ''")
            ->whereHas('stock', fn (Builder $query): Builder => $query->where('is_active', true))
            ->value('provider_symbol');

        if (! is_string($providerSymbol)) {
            return null;
        }

        $providerSymbol = trim($providerSymbol);

        return $providerSymbol === '' ? null : $providerSymbol;
    }

    public function upsertStockPrice(int $stockId, StockPriceData $data): StockPrice
    {
        $priceDate = $data->priceDate->toDateString();
        StockPrice::query()->upsert(
            [
                [
                    'stock_id' => $stockId,
                    'price_date' => $priceDate,
                    'source' => $data->source,
                    'open' => $data->open,
                    'high' => $data->high,
                    'low' => $data->low,
                    'close' => $data->close,
                    'adjusted_close' => $data->adjustedClose,
                    'volume' => $data->volume,
                    'fetched_at' => $data->fetchedAt,
                ],
            ],
            ['stock_id', 'price_date', 'source'],
            [
                'open',
                'high',
                'low',
                'close',
                'adjusted_close',
                'volume',
                'fetched_at',
            ],
        );

        return StockPrice::query()
            ->where('stock_id', $stockId)
            ->whereDate('price_date', $priceDate)
            ->where('source', $data->source)
            ->firstOrFail();
    }

    public function upsertNewsArticle(int $stockId, NewsArticleData $data): NewsArticle
    {
        return DB::transaction(function () use ($stockId, $data): NewsArticle {
            $article = NewsArticle::query()->updateOrCreate(
                ['content_hash' => $data->contentHash],
                [
                    'title' => $data->title,
                    'summary' => $data->summary,
                    'body' => $data->body,
                    'url' => $data->url,
                    'source' => $data->source,
                    'provider' => $data->provider,
                    'language' => $data->language,
                    'published_at' => $data->publishedAt,
                    'raw_payload' => $data->rawPayload,
                ],
            );

            $article->stocks()->syncWithoutDetaching([
                $stockId => [
                    'relevance_score' => $data->relevanceScore,
                    'matched_by' => $data->matchedBy,
                ],
            ]);

            return $article->fresh('stocks') ?? $article;
        });
    }
}
