<?php

declare(strict_types=1);

namespace App\Data\News;

use App\Enums\AnalysisSentiment;
use Spatie\LaravelData\Attributes\MapName;
use Spatie\LaravelData\Data;
use Spatie\LaravelData\Mappers\SnakeCaseMapper;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

#[TypeScript()]
#[MapName(SnakeCaseMapper::class)]
final class NewsSearchData extends Data
{
    public function __construct(
        public readonly ?int $articleId,
        public readonly ?int $stockId,
        public readonly ?AnalysisSentiment $sentiment,
        public readonly ?string $from,
        public readonly ?string $to,
    ) {}
}
