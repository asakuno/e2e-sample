<?php

declare(strict_types=1);

namespace App\Data\Stock;

use Spatie\LaravelData\Attributes\MapName;
use Spatie\LaravelData\Data;
use Spatie\LaravelData\Mappers\SnakeCaseMapper;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

#[TypeScript()]
#[MapName(SnakeCaseMapper::class)]
final class StockSearchData extends Data
{
    public function __construct(
        public readonly ?string $q,
        public readonly ?string $market,
    ) {}
}
