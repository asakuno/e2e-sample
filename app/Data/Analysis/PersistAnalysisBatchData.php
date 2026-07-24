<?php

declare(strict_types=1);

namespace App\Data\Analysis;

use App\Enums\AnalysisBatchStatus;
use Carbon\CarbonInterface;
use Spatie\LaravelData\Data;

final class PersistAnalysisBatchData extends Data
{
    /**
     * @param  array{id: int, symbol: string, name: string, market: string}  $stockSnapshot
     * @param  list<array{
     *     news_article_id: int,
     *     news_key: string,
     *     position: int,
     *     title: string,
     *     summary: ?string,
     *     body: ?string,
     *     source: ?string,
     *     url: string,
     *     published_at: CarbonInterface,
     *     content_hash: string,
     *     snapshot_hash: string
     * }>  $newsSnapshots
     */
    public function __construct(
        public readonly string $publicId,
        public readonly int $userId,
        public readonly int $stockId,
        public readonly CarbonInterface $periodStartAt,
        public readonly CarbonInterface $periodEndAt,
        public readonly array $stockSnapshot,
        public readonly string $promptVersion,
        public readonly string $promptText,
        public readonly string $promptHash,
        public readonly AnalysisBatchStatus $status,
        public readonly string $inputHash,
        public readonly int $newsCount,
        public readonly int $sourceCharCount,
        public readonly array $newsSnapshots,
    ) {}
}
