<?php

declare(strict_types=1);

namespace App\Data\News;

use App\Models\Stock;
use Illuminate\Database\Eloquent\Relations\Pivot;
use Spatie\LaravelData\Attributes\MapName;
use Spatie\LaravelData\Data;
use Spatie\LaravelData\Mappers\SnakeCaseMapper;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

#[TypeScript()]
#[MapName(SnakeCaseMapper::class)]
final class NewsArticleStockData extends Data
{
    public function __construct(
        public readonly int $id,
        public readonly string $symbol,
        public readonly string $name,
        public readonly string $market,
        public readonly ?int $relevanceScore,
        public readonly ?string $matchedBy,
    ) {}

    public static function fromModel(Stock $stock): self
    {
        /** @var Pivot|null $pivot */
        $pivot = $stock->getRelationValue('pivot');
        $relevanceScore = $pivot?->getAttribute('relevance_score');
        $matchedBy = $pivot?->getAttribute('matched_by');

        return new self(
            id: $stock->id,
            symbol: $stock->symbol,
            name: $stock->name,
            market: $stock->market,
            relevanceScore: $relevanceScore === null ? null : (int) $relevanceScore,
            matchedBy: $matchedBy === null ? null : (string) $matchedBy,
        );
    }
}
