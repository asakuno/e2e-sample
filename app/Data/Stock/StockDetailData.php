<?php

declare(strict_types=1);

namespace App\Data\Stock;

use App\Data\News\NewsAnalysisData;
use App\Data\News\NewsArticleData;
use App\Enums\StockPricePeriod;
use App\Models\Stock;
use Spatie\LaravelData\Attributes\MapName;
use Spatie\LaravelData\Data;
use Spatie\LaravelData\Mappers\SnakeCaseMapper;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

#[TypeScript()]
#[MapName(SnakeCaseMapper::class)]
final class StockDetailData extends Data
{
    /**
     * @param  array<int, StockPriceData>  $priceHistory
     * @param  array<int, NewsArticleData>  $relatedNews
     * @param  array<int, NewsAnalysisData>  $analyses
     * @param  array<int, StockSignalData>  $signals
     * @param  array<string, mixed>|null  $latestPeriodAnalysis
     * @param  array<string, mixed>|null  $periodSignal
     * @param  array<int, array{value: string, label: string, available: bool}>  $periodOptions
     */
    public function __construct(
        public readonly int $id,
        public readonly string $symbol,
        public readonly string $name,
        public readonly string $market,
        public readonly ?string $exchange,
        public readonly string $country,
        public readonly string $currency,
        public readonly ?string $sector,
        public readonly ?string $industry,
        public readonly ?string $description,
        public readonly ?StockWatchlistData $watchlist,
        public readonly ?StockPriceData $latestPrice,
        public readonly array $priceHistory,
        public readonly array $relatedNews,
        public readonly array $analyses,
        public readonly array $signals,
        public readonly ?array $latestPeriodAnalysis,
        public readonly ?array $periodSignal,
        public readonly StockPricePeriod $selectedPeriod,
        public readonly array $periodOptions,
        public readonly ?string $priceHistoryNotice,
    ) {}

    /**
     * @param  array<int, StockPriceData>  $priceHistory
     * @param  array<int, NewsArticleData>  $relatedNews
     * @param  array<int, NewsAnalysisData>  $analyses
     * @param  array<int, StockSignalData>  $signals
     * @param  array<string, mixed>|null  $latestPeriodAnalysis
     * @param  array<string, mixed>|null  $periodSignal
     * @param  array<int, array{value: string, label: string, available: bool}>  $periodOptions
     */
    public static function fromModel(
        Stock $stock,
        ?StockWatchlistData $watchlist,
        ?StockPriceData $latestPrice,
        array $priceHistory,
        array $relatedNews,
        array $analyses,
        array $signals,
        ?array $latestPeriodAnalysis,
        ?array $periodSignal,
        StockPricePeriod $selectedPeriod,
        array $periodOptions,
        ?string $priceHistoryNotice,
    ): self {
        return new self(
            id: $stock->id,
            symbol: $stock->symbol,
            name: $stock->name,
            market: $stock->market,
            exchange: $stock->exchange,
            country: $stock->country,
            currency: $stock->currency,
            sector: $stock->sector,
            industry: $stock->industry,
            description: $stock->description,
            watchlist: $watchlist,
            latestPrice: $latestPrice,
            priceHistory: $priceHistory,
            relatedNews: $relatedNews,
            analyses: $analyses,
            signals: $signals,
            latestPeriodAnalysis: $latestPeriodAnalysis,
            periodSignal: $periodSignal,
            selectedPeriod: $selectedPeriod,
            periodOptions: $periodOptions,
            priceHistoryNotice: $priceHistoryNotice,
        );
    }
}
