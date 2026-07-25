<?php

declare(strict_types=1);

namespace App\Data\Analysis;

use App\Enums\AnalysisEvidenceType;
use App\Enums\AnalysisSentiment;
use App\Enums\AnalysisTimeHorizon;
use Spatie\LaravelData\Attributes\MapName;
use Spatie\LaravelData\Data;
use Spatie\LaravelData\Mappers\SnakeCaseMapper;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

#[TypeScript()]
#[MapName(SnakeCaseMapper::class)]
final class AnalysisResultImportData extends Data
{
    /**
     * @param  list<string>  $positiveFactors
     * @param  list<string>  $negativeFactors
     * @param  list<string>  $riskPoints
     * @param  list<AnalysisEvidenceData>  $evidenceItems
     */
    public function __construct(
        public readonly string $schemaVersion,
        public readonly string $batchKey,
        public readonly string $promptVersion,
        public readonly string $summary,
        public readonly AnalysisSentiment $sentiment,
        public readonly int $impactScore,
        public readonly int $confidenceScore,
        public readonly AnalysisTimeHorizon $timeHorizon,
        public readonly array $positiveFactors,
        public readonly array $negativeFactors,
        public readonly array $riskPoints,
        public readonly array $evidenceItems,
        public readonly string $reason,
    ) {}

    /**
     * @param  array{
     *     schema_version: string,
     *     batch_key: string,
     *     prompt_version: string,
     *     summary: string,
     *     sentiment: AnalysisSentiment,
     *     impact_score: int,
     *     confidence_score: int,
     *     time_horizon: AnalysisTimeHorizon,
     *     positive_factors: list<string>,
     *     negative_factors: list<string>,
     *     risk_points: list<string>,
     *     evidence_items: list<array{
     *         news_key: string,
     *         type: AnalysisEvidenceType,
     *         note: string
     *     }>,
     *     reason: string
     * }  $payload
     */
    public static function fromValidatedPayload(array $payload): self
    {
        return new self(
            schemaVersion: $payload['schema_version'],
            batchKey: $payload['batch_key'],
            promptVersion: $payload['prompt_version'],
            summary: $payload['summary'],
            sentiment: $payload['sentiment'],
            impactScore: $payload['impact_score'],
            confidenceScore: $payload['confidence_score'],
            timeHorizon: $payload['time_horizon'],
            positiveFactors: $payload['positive_factors'],
            negativeFactors: $payload['negative_factors'],
            riskPoints: $payload['risk_points'],
            evidenceItems: array_map(
                static fn (array $evidence): AnalysisEvidenceData => new AnalysisEvidenceData(
                    newsKey: $evidence['news_key'],
                    type: $evidence['type'],
                    note: $evidence['note'],
                ),
                $payload['evidence_items'],
            ),
            reason: $payload['reason'],
        );
    }
}
