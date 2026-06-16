<?php

declare(strict_types=1);

namespace App\Data\Stock;

use App\Models\Stock;
use Spatie\LaravelData\Attributes\MapName;
use Spatie\LaravelData\Data;
use Spatie\LaravelData\Mappers\SnakeCaseMapper;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

#[TypeScript()]
#[MapName(SnakeCaseMapper::class)]
final class StockListItemData extends Data
{
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
        public readonly bool $isInWatchlist = false,
    ) {}

    public static function fromModel(Stock $stock, bool $isInWatchlist = false): self
    {
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
            isInWatchlist: $isInWatchlist,
        );
    }
}
