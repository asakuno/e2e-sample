<?php

declare(strict_types=1);

namespace App\Data\News;

use App\Data\Stock\StockListItemData;
use App\Enums\AnalysisSentiment;
use App\Enums\AnalysisTimeHorizon;
use App\Models\AnalysisResult;
use Illuminate\Support\Carbon;
use Spatie\LaravelData\Attributes\MapName;
use Spatie\LaravelData\Data;
use Spatie\LaravelData\Mappers\SnakeCaseMapper;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

#[TypeScript()]
#[MapName(SnakeCaseMapper::class)]
final class NewsAnalysisData extends Data
{
    public function __construct(
        public readonly int $id,
        public readonly StockListItemData $stock,
        public readonly string $summary,
        public readonly int $sentiment,
        public readonly string $sentimentLabel,
        public readonly int $impactScore,
        public readonly int $confidenceScore,
        public readonly int $timeHorizon,
        public readonly string $timeHorizonLabel,
        /** @var list<string> */
        public readonly array $positiveFactors,
        /** @var list<string> */
        public readonly array $negativeFactors,
        /** @var list<string> */
        public readonly array $riskPoints,
        public readonly string $reason,
        public readonly ?string $analyzedAt,
    ) {}

    public static function fromModel(AnalysisResult $analysisResult): self
    {
        $sentiment = $analysisResult->getAttribute('sentiment');
        if (! $sentiment instanceof AnalysisSentiment) {
            $sentiment = AnalysisSentiment::from((int) $sentiment);
        }

        $timeHorizon = $analysisResult->getAttribute('time_horizon');
        if (! $timeHorizon instanceof AnalysisTimeHorizon) {
            $timeHorizon = AnalysisTimeHorizon::from((int) $timeHorizon);
        }

        $analyzedAt = $analysisResult->getAttribute('analyzed_at');

        return new self(
            id: $analysisResult->id,
            stock: StockListItemData::from($analysisResult->stock),
            summary: $analysisResult->summary,
            sentiment: $sentiment->value,
            sentimentLabel: $sentiment->label(),
            impactScore: $analysisResult->impact_score,
            confidenceScore: $analysisResult->confidence_score,
            timeHorizon: $timeHorizon->value,
            timeHorizonLabel: $timeHorizon->label(),
            positiveFactors: self::stringListAttribute($analysisResult->getAttribute('positive_factors')),
            negativeFactors: self::stringListAttribute($analysisResult->getAttribute('negative_factors')),
            riskPoints: self::stringListAttribute($analysisResult->getAttribute('risk_points')),
            reason: $analysisResult->reason,
            analyzedAt: $analyzedAt === null
                ? null
                : Carbon::parse($analyzedAt)->toDateTimeString(),
        );
    }

    /**
     * @return list<string>
     */
    private static function stringListAttribute(mixed $value): array
    {
        if (! is_array($value)) {
            return [];
        }

        return array_values(array_filter($value, is_string(...)));
    }
}
