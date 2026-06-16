<?php

declare(strict_types=1);

namespace App\Data\Stock;

use App\Models\StockSignal;
use Illuminate\Support\Carbon;
use Spatie\LaravelData\Attributes\MapName;
use Spatie\LaravelData\Data;
use Spatie\LaravelData\Mappers\SnakeCaseMapper;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

#[TypeScript()]
#[MapName(SnakeCaseMapper::class)]
final class StockSignalData extends Data
{
    public function __construct(
        public readonly int $id,
        public readonly string $signalDate,
        public readonly float $newsScore,
        public readonly float $disclosureScore,
        public readonly float $macroScore,
        public readonly float $totalScore,
        public readonly int $positiveCount,
        public readonly int $negativeCount,
        public readonly int $neutralCount,
        public readonly ?string $reason,
        public readonly string $generatedAt,
    ) {}

    public static function fromModel(StockSignal $signal): self
    {
        return new self(
            id: $signal->id,
            signalDate: Carbon::parse($signal->signal_date)->toDateString(),
            newsScore: (float) $signal->news_score,
            disclosureScore: (float) $signal->disclosure_score,
            macroScore: (float) $signal->macro_score,
            totalScore: (float) $signal->total_score,
            positiveCount: $signal->positive_count,
            negativeCount: $signal->negative_count,
            neutralCount: $signal->neutral_count,
            reason: $signal->reason,
            generatedAt: Carbon::parse($signal->generated_at)->toDateTimeString(),
        );
    }
}
