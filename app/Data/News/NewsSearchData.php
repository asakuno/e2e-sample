<?php

declare(strict_types=1);

namespace App\Data\News;

use App\Enums\AnalysisSentiment;
use Carbon\CarbonImmutable;
use Spatie\LaravelData\Attributes\MapName;
use Spatie\LaravelData\Data;
use Spatie\LaravelData\Mappers\SnakeCaseMapper;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

#[TypeScript()]
#[MapName(SnakeCaseMapper::class)]
final class NewsSearchData extends Data
{
    public const string ANALYSIS_STATUS_UNANALYZED = 'unanalyzed';

    private const string DISPLAY_TIMEZONE = 'Asia/Tokyo';

    public function __construct(
        public readonly ?int $articleId,
        public readonly ?int $stockId,
        public readonly ?AnalysisSentiment $sentiment,
        public readonly ?string $analysisStatus,
        public readonly ?string $from,
        public readonly ?string $to,
        public readonly int $userId,
    ) {}

    public function fromUtc(): ?CarbonImmutable
    {
        if ($this->from === null) {
            return null;
        }

        return CarbonImmutable::parse($this->from, self::DISPLAY_TIMEZONE)
            ->startOfDay()
            ->utc();
    }

    public function toExclusiveUtc(): ?CarbonImmutable
    {
        if ($this->to === null) {
            return null;
        }

        return CarbonImmutable::parse($this->to, self::DISPLAY_TIMEZONE)
            ->addDay()
            ->startOfDay()
            ->utc();
    }
}
