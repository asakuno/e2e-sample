<?php

declare(strict_types=1);

namespace App\Data\Stock;

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
     * @param  array<int, array{value: string, label: string}>  $periodOptions
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
        public readonly ?StockPriceData $latestPrice,
        public readonly array $priceHistory,
        public readonly StockPricePeriod $selectedPeriod,
        public readonly array $periodOptions,
    ) {}

    /**
     * @param  array<int, StockPriceData>  $priceHistory
     * @param  array<int, array{value: string, label: string}>  $periodOptions
     */
    public static function fromModel(
        Stock $stock,
        ?StockPriceData $latestPrice,
        array $priceHistory,
        StockPricePeriod $selectedPeriod,
        array $periodOptions,
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
            latestPrice: $latestPrice,
            priceHistory: $priceHistory,
            selectedPeriod: $selectedPeriod,
            periodOptions: $periodOptions,
        );
    }
}
