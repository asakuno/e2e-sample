<?php

declare(strict_types=1);

namespace App\Data\News;

use App\Data\Stock\StockListItemData;
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
        public readonly ?string $analyzedAt,
    ) {}

    public static function fromModel(AnalysisResult $analysisResult): self
    {
        return new self(
            id: $analysisResult->id,
            stock: StockListItemData::from($analysisResult->stock),
            summary: $analysisResult->summary,
            sentiment: $analysisResult->sentiment->value,
            sentimentLabel: $analysisResult->sentiment->label(),
            impactScore: $analysisResult->impact_score,
            confidenceScore: $analysisResult->confidence_score,
            analyzedAt: $analysisResult->analyzed_at === null
                ? null
                : Carbon::parse($analysisResult->analyzed_at)->toDateTimeString(),
        );
    }
}
