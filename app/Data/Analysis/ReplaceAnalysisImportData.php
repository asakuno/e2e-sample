<?php

declare(strict_types=1);

namespace App\Data\Analysis;

use Spatie\LaravelData\Attributes\MapName;
use Spatie\LaravelData\Data;
use Spatie\LaravelData\Mappers\SnakeCaseMapper;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

#[TypeScript()]
#[MapName(SnakeCaseMapper::class)]
final class ReplaceAnalysisImportData extends Data
{
    public function __construct(
        public readonly int $userId,
        public readonly int $analysisBatchId,
        public readonly int $analysisImportId,
        public readonly string $replacementReason,
    ) {}
}
