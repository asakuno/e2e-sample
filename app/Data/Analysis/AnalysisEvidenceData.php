<?php

declare(strict_types=1);

namespace App\Data\Analysis;

use App\Enums\AnalysisEvidenceType;
use Spatie\LaravelData\Attributes\MapName;
use Spatie\LaravelData\Data;
use Spatie\LaravelData\Mappers\SnakeCaseMapper;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

#[TypeScript()]
#[MapName(SnakeCaseMapper::class)]
final class AnalysisEvidenceData extends Data
{
    public function __construct(
        public readonly string $newsKey,
        public readonly AnalysisEvidenceType $type,
        public readonly string $note,
    ) {}
}
