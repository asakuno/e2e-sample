<?php

declare(strict_types=1);

namespace App\Data\AI;

use App\Enums\AnalysisSentiment;
use App\Enums\AnalysisTimeHorizon;
use Spatie\LaravelData\Attributes\MapName;
use Spatie\LaravelData\Data;
use Spatie\LaravelData\Mappers\SnakeCaseMapper;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

#[TypeScript()]
#[MapName(SnakeCaseMapper::class)]
final class ArticleAnalysisData extends Data
{
    /**
     * @param  list<string>  $positiveFactors
     * @param  list<string>  $negativeFactors
     * @param  list<string>  $riskPoints
     */
    public function __construct(
        public readonly string $summary,
        public readonly AnalysisSentiment $sentiment,
        public readonly int $impactScore,
        public readonly int $confidenceScore,
        public readonly AnalysisTimeHorizon $timeHorizon,
        public readonly array $positiveFactors,
        public readonly array $negativeFactors,
        public readonly array $riskPoints,
        public readonly string $reason,
        public readonly string $modelProvider,
        public readonly string $modelName,
        public readonly string $promptVersion,
        public readonly int $inputTokens,
        public readonly int $outputTokens,
    ) {}
}
