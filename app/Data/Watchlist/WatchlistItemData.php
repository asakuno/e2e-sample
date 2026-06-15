<?php

declare(strict_types=1);

namespace App\Data\Watchlist;

use App\Data\Stock\StockListItemData;
use App\Models\Watchlist;
use Spatie\LaravelData\Attributes\MapName;
use Spatie\LaravelData\Data;
use Spatie\LaravelData\Mappers\SnakeCaseMapper;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

#[TypeScript()]
#[MapName(SnakeCaseMapper::class)]
final class WatchlistItemData extends Data
{
    public function __construct(
        public readonly int $id,
        public readonly StockListItemData $stock,
        public readonly ?string $memo,
        public readonly int $priority,
        public readonly bool $isActive,
    ) {}

    public static function fromModel(Watchlist $watchlist): self
    {
        return new self(
            id: $watchlist->id,
            stock: StockListItemData::from($watchlist->stock),
            memo: $watchlist->memo,
            priority: $watchlist->priority,
            isActive: $watchlist->is_active,
        );
    }
}
