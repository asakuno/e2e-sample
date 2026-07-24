<?php

declare(strict_types=1);

namespace App\Data\Stock;

use App\Enums\StockPricePeriod;
use Spatie\LaravelData\Attributes\MapName;
use Spatie\LaravelData\Data;
use Spatie\LaravelData\Mappers\SnakeCaseMapper;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

#[TypeScript()]
#[MapName(SnakeCaseMapper::class)]
final class StockPricePeriodAvailabilityData extends Data
{
    /**
     * @param  array<int, array{value: string, label: string, available: bool}>  $periodOptions
     */
    public function __construct(
        public readonly StockPricePeriod $selectedPeriod,
        public readonly array $periodOptions,
        public readonly ?string $notice,
    ) {}
}
