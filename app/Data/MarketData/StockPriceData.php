<?php

declare(strict_types=1);

namespace App\Data\MarketData;

use Carbon\CarbonImmutable;
use Spatie\LaravelData\Attributes\MapName;
use Spatie\LaravelData\Data;
use Spatie\LaravelData\Mappers\SnakeCaseMapper;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

#[TypeScript()]
#[MapName(SnakeCaseMapper::class)]
final class StockPriceData extends Data
{
    public function __construct(
        public readonly string $symbol,
        public readonly CarbonImmutable $priceDate,
        public readonly float $open,
        public readonly float $high,
        public readonly float $low,
        public readonly float $close,
        public readonly ?float $adjustedClose,
        public readonly int $volume,
        public readonly string $source,
        public readonly CarbonImmutable $fetchedAt,
    ) {}
}
