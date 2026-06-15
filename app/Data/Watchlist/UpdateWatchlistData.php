<?php

declare(strict_types=1);

namespace App\Data\Watchlist;

use Spatie\LaravelData\Attributes\MapName;
use Spatie\LaravelData\Data;
use Spatie\LaravelData\Mappers\SnakeCaseMapper;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

#[TypeScript()]
#[MapName(SnakeCaseMapper::class)]
final class UpdateWatchlistData extends Data
{
    public function __construct(
        public readonly int $id,
        public readonly ?string $memo,
        public readonly int $priority,
    ) {}
}
