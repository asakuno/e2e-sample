<?php

declare(strict_types=1);

namespace App\Data\Analysis;

use Spatie\LaravelData\Attributes\MapName;
use Spatie\LaravelData\Data;
use Spatie\LaravelData\Mappers\SnakeCaseMapper;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

#[TypeScript()]
#[MapName(SnakeCaseMapper::class)]
final class CreateAnalysisBatchData extends Data
{
    /**
     * @param  list<int>  $newsArticleIds
     */
    public function __construct(
        public readonly int $userId,
        public readonly int $stockId,
        public readonly string $fromDate,
        public readonly string $toDate,
        public readonly array $newsArticleIds,
    ) {}
}
