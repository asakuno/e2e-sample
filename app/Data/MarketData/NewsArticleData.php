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
final class NewsArticleData extends Data
{
    /**
     * @param  array<string, mixed>  $rawPayload
     */
    public function __construct(
        public readonly string $symbol,
        public readonly string $title,
        public readonly ?string $summary,
        public readonly ?string $body,
        public readonly string $url,
        public readonly string $source,
        public readonly string $provider,
        public readonly ?string $language,
        public readonly CarbonImmutable $publishedAt,
        public readonly string $contentHash,
        public readonly int $relevanceScore,
        public readonly string $matchedBy,
        public readonly array $rawPayload,
    ) {}
}
