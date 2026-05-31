<?php

declare(strict_types=1);

namespace App\Data\Stock;

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
    ) {}
}
