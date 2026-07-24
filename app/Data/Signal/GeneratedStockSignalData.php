<?php

declare(strict_types=1);

namespace App\Data\Signal;

use Spatie\LaravelData\Attributes\MapName;
use Spatie\LaravelData\Data;
use Spatie\LaravelData\Mappers\SnakeCaseMapper;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

#[TypeScript()]
#[MapName(SnakeCaseMapper::class)]
final class GeneratedStockSignalData extends Data
{
    public function __construct(
        public readonly float $newsScore,
        public readonly float $disclosureScore,
        public readonly float $macroScore,
        public readonly float $totalScore,
        public readonly int $positiveCount,
        public readonly int $negativeCount,
        public readonly int $neutralCount,
        public readonly string $reason,
    ) {}
}
