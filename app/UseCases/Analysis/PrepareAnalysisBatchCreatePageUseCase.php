<?php

declare(strict_types=1);

namespace App\UseCases\Analysis;

use App\Repositories\WatchlistRepositoryInterface;
use Carbon\CarbonImmutable;

final class PrepareAnalysisBatchCreatePageUseCase
{
    public function __construct(
        private readonly WatchlistRepositoryInterface $watchlistRepository,
        private readonly PreviewAnalysisBatchSourceUseCase $previewUseCase,
    ) {}

    /**
     * @return array{
     *     stock_options: list<array{value: int, label: string}>,
     *     filters: array{stock_id: string, from_date: string, to_date: string},
     *     preview: array{
     *         news: list<array<string, int|string|null>>,
     *         news_count: int,
     *         source_char_count: int
     *     },
     *     limits: array{
     *         min_news_count: int,
     *         max_news_count: int,
     *         max_source_char_count: int
     *     }
     * }
     */
    public function execute(
        int $userId,
        ?int $stockId,
        ?string $fromDate,
        ?string $toDate,
    ): array {
        $resolvedFromDate = $fromDate
            ?? CarbonImmutable::today('Asia/Tokyo')->subDays(6)->toDateString();
        $resolvedToDate = $toDate
            ?? CarbonImmutable::today('Asia/Tokyo')->toDateString();
        $preview = $stockId === null
            ? ['news' => [], 'news_count' => 0, 'source_char_count' => 0]
            : $this->previewUseCase->execute(
                $userId,
                $stockId,
                $resolvedFromDate,
                $resolvedToDate,
            );
        $stockOptions = $this->watchlistRepository
            ->findActiveByUser($userId)
            ->filter(fn ($watchlist): bool => $watchlist->stock->is_active)
            ->map(fn ($watchlist): array => [
                'value' => $watchlist->stock->id,
                'label' => "{$watchlist->stock->symbol} {$watchlist->stock->name}",
            ])
            ->values()
            ->all();

        return [
            'stock_options' => $stockOptions,
            'filters' => [
                'stock_id' => $stockId === null ? '' : (string) $stockId,
                'from_date' => $resolvedFromDate,
                'to_date' => $resolvedToDate,
            ],
            'preview' => $preview,
            'limits' => [
                'min_news_count' => (int) config('stock_analysis.min_news_count'),
                'max_news_count' => (int) config('stock_analysis.max_news_count'),
                'max_source_char_count' => (int) config('stock_analysis.max_source_char_count'),
            ],
        ];
    }
}
