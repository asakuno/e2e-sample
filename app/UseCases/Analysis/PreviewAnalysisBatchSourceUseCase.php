<?php

declare(strict_types=1);

namespace App\UseCases\Analysis;

use App\Repositories\AnalysisBatchRepositoryInterface;
use App\Services\Analysis\AnalysisInputCanonicalizer;
use Carbon\CarbonImmutable;
use Illuminate\Validation\ValidationException;

final class PreviewAnalysisBatchSourceUseCase
{
    public function __construct(
        private readonly AnalysisBatchRepositoryInterface $analysisBatchRepository,
        private readonly AnalysisInputCanonicalizer $canonicalizer,
    ) {}

    /**
     * @return array{
     *     news: list<array<string, int|string|null>>,
     *     news_count: int,
     *     source_char_count: int
     * }
     */
    public function execute(
        int $userId,
        int $stockId,
        string $fromDate,
        string $toDate,
    ): array {
        $from = CarbonImmutable::createFromFormat('!Y-m-d', $fromDate, 'Asia/Tokyo');
        $to = CarbonImmutable::createFromFormat('!Y-m-d', $toDate, 'Asia/Tokyo');

        if (
            $from === null
            || $to === null
            || $from->gt($to)
            || $to->gt(CarbonImmutable::today('Asia/Tokyo'))
            || $from->diffInDays($to) + 1 > (int) config('stock_analysis.max_period_days')
        ) {
            throw ValidationException::withMessages([
                'to_date' => ['本日以前の31日以内の期間を指定してください。'],
            ]);
        }

        $articles = $this->analysisBatchRepository->findNewsCandidates(
            $userId,
            $stockId,
            $from->utc(),
            $to->addDay()->utc(),
        );
        $news = array_map(function ($article): array {
            $snapshot = [
                'title' => $this->canonicalizer->normalizeString($article->title),
                'summary' => $this->canonicalizer->normalizeString($article->summary),
                'body' => $this->canonicalizer->normalizeString($article->body),
                'source' => $this->canonicalizer->normalizeString($article->source),
                'url' => $this->canonicalizer->normalizeString($article->url),
            ];

            return [
                'id' => $article->id,
                'title' => $snapshot['title'],
                'summary' => $snapshot['summary'],
                'source' => $snapshot['source'],
                'url' => $snapshot['url'],
                'published_at' => CarbonImmutable::parse($article->getAttribute('published_at'))
                    ->setTimezone('Asia/Tokyo')
                    ->toIso8601String(),
                'character_count' => $this->canonicalizer->sourceCharacterCount([$snapshot]),
            ];
        }, $articles);

        return [
            'news' => $news,
            'news_count' => count($news),
            'source_char_count' => array_sum(array_column($news, 'character_count')),
        ];
    }
}
