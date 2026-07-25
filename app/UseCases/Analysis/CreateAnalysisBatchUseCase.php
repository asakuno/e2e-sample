<?php

declare(strict_types=1);

namespace App\UseCases\Analysis;

use App\Data\Analysis\CreateAnalysisBatchData;
use App\Data\Analysis\PersistAnalysisBatchData;
use App\Enums\AnalysisBatchStatus;
use App\Models\AnalysisBatch;
use App\Repositories\AnalysisBatchRepositoryInterface;
use App\Repositories\StockRepositoryInterface;
use App\Repositories\WatchlistRepositoryInterface;
use App\Services\Analysis\AnalysisInputCanonicalizer;
use App\Services\Analysis\AnalysisPromptBuilder;
use Carbon\CarbonImmutable;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

final class CreateAnalysisBatchUseCase
{
    private const JST = 'Asia/Tokyo';

    public function __construct(
        private readonly AnalysisBatchRepositoryInterface $analysisBatchRepository,
        private readonly StockRepositoryInterface $stockRepository,
        private readonly WatchlistRepositoryInterface $watchlistRepository,
        private readonly AnalysisInputCanonicalizer $canonicalizer,
        private readonly AnalysisPromptBuilder $promptBuilder,
    ) {}

    /**
     * @throws ValidationException
     */
    public function execute(CreateAnalysisBatchData $data): AnalysisBatch
    {
        [$periodStart, $periodEnd] = $this->period($data->fromDate, $data->toDate);

        return DB::transaction(function () use ($data, $periodStart, $periodEnd): AnalysisBatch {
            $stock = $this->stockRepository->findActiveById($data->stockId);
            $watchlist = $this->watchlistRepository->findByUserAndStock($data->userId, $data->stockId);

            if ($stock === null || $watchlist === null || ! $watchlist->is_active) {
                throw ValidationException::withMessages([
                    'stock_id' => ['有効なウォッチリスト銘柄を選択してください。'],
                ]);
            }

            $selectedIds = array_values(array_unique($data->newsArticleIds));
            $min = (int) config('stock_analysis.min_news_count');
            $max = (int) config('stock_analysis.max_news_count');

            if (count($selectedIds) < $min || count($selectedIds) > $max) {
                throw ValidationException::withMessages([
                    'news_article_ids' => ["ニュースは{$min}〜{$max}件選択してください。"],
                ]);
            }

            $candidateById = collect($this->analysisBatchRepository->findNewsCandidates(
                $data->userId,
                $data->stockId,
                $periodStart,
                $periodEnd,
            ))->keyBy('id');
            $articles = collect($selectedIds)
                ->map(fn (int $id) => $candidateById->get($id))
                ->filter()
                ->sortBy([
                    ['published_at', 'asc'],
                    ['id', 'asc'],
                ])
                ->values();

            if ($articles->count() !== count($selectedIds)) {
                throw ValidationException::withMessages([
                    'news_article_ids' => ['対象銘柄・期間外、または公開日時のないニュースが含まれています。'],
                ]);
            }

            $newsSnapshots = $articles
                ->map(function ($article, int $index): array {
                    $snapshot = [
                        'news_key' => 'N'.str_pad((string) ($index + 1), 3, '0', STR_PAD_LEFT),
                        'news_article_id' => $article->id,
                        'title' => $this->canonicalizer->normalizeString($article->title),
                        'summary' => $this->canonicalizer->normalizeString($article->summary),
                        'body' => $this->canonicalizer->normalizeString($article->body),
                        'source' => $this->canonicalizer->normalizeString($article->source),
                        'url' => $this->canonicalizer->normalizeString($article->url),
                        'published_at' => CarbonImmutable::parse(
                            $article->getAttribute('published_at'),
                        )->utc()->format('Y-m-d\TH:i:s\Z'),
                        'content_hash' => $article->content_hash,
                    ];

                    return [
                        ...$snapshot,
                        'position' => $index + 1,
                        'snapshot_hash' => $this->canonicalizer->hash($snapshot),
                    ];
                })
                ->all();
            $sourceCharCount = $this->canonicalizer->sourceCharacterCount($newsSnapshots);

            if ($sourceCharCount > (int) config('stock_analysis.max_source_char_count')) {
                throw ValidationException::withMessages([
                    'news_article_ids' => ['ニュース本文の合計は100,000文字以内にしてください。'],
                ]);
            }

            $stockSnapshot = [
                'id' => $stock->id,
                'symbol' => $stock->symbol,
                'name' => $stock->name,
                'market' => $stock->market,
            ];
            $promptVersion = (string) config('stock_analysis.manual_prompt_version');
            $resultSchemaVersion = (string) config('stock_analysis.result_schema_version');
            $publicId = (string) Str::ulid();
            $periodStartJst = $periodStart->setTimezone(self::JST);
            $periodEndJst = $periodEnd->setTimezone(self::JST);
            $inputPayload = [
                'stock' => $stockSnapshot,
                'period' => [
                    'start_at' => $periodStartJst->format('Y-m-d\TH:i:sP'),
                    'end_at_exclusive' => $periodEndJst->format('Y-m-d\TH:i:sP'),
                ],
                'prompt_version' => $promptVersion,
                'result_schema_version' => $resultSchemaVersion,
                'news' => array_map(
                    fn (array $snapshot): array => array_diff_key(
                        $snapshot,
                        ['position' => true, 'snapshot_hash' => true],
                    ),
                    $newsSnapshots,
                ),
            ];
            $inputHash = $this->canonicalizer->hash($inputPayload);
            $existing = $this->analysisBatchRepository->findOwnedByInputHash($data->userId, $inputHash);

            if ($existing !== null) {
                throw ValidationException::withMessages([
                    'news_article_ids' => ["同じ入力の分析バッチ {$existing->public_id} が既にあります。"],
                ]);
            }

            $promptText = $this->promptBuilder->build(
                batchKey: $publicId,
                promptVersion: $promptVersion,
                schemaVersion: $resultSchemaVersion,
                stock: $stockSnapshot,
                periodStart: $periodStartJst->toDateString(),
                periodEndInclusive: $periodEndJst->subDay()->toDateString(),
                newsSnapshots: $newsSnapshots,
            );

            try {
                return $this->analysisBatchRepository->create(new PersistAnalysisBatchData(
                    publicId: $publicId,
                    userId: $data->userId,
                    stockId: $data->stockId,
                    periodStartAt: $periodStart,
                    periodEndAt: $periodEnd,
                    stockSnapshot: $stockSnapshot,
                    promptVersion: $promptVersion,
                    resultSchemaVersion: $resultSchemaVersion,
                    promptText: $promptText,
                    promptHash: hash('sha256', $promptText),
                    status: AnalysisBatchStatus::Prepared,
                    inputHash: $inputHash,
                    newsCount: count($newsSnapshots),
                    sourceCharCount: $sourceCharCount,
                    newsSnapshots: array_map(
                        fn (array $snapshot): array => [
                            ...$snapshot,
                            'published_at' => CarbonImmutable::parse($snapshot['published_at']),
                        ],
                        $newsSnapshots,
                    ),
                ));
            } catch (QueryException $exception) {
                if ($this->analysisBatchRepository->findOwnedByInputHash($data->userId, $inputHash) !== null) {
                    throw ValidationException::withMessages([
                        'news_article_ids' => ['同じ入力の分析バッチが既にあります。'],
                    ]);
                }

                throw $exception;
            }
        }, 3);
    }

    /**
     * @return array{CarbonImmutable, CarbonImmutable}
     *
     * @throws ValidationException
     */
    private function period(string $fromDate, string $toDate): array
    {
        $from = CarbonImmutable::createFromFormat('!Y-m-d', $fromDate, self::JST);
        $to = CarbonImmutable::createFromFormat('!Y-m-d', $toDate, self::JST);

        if ($from === null || $to === null || $from->gt($to)) {
            throw ValidationException::withMessages([
                'to_date' => ['終了日は開始日以降にしてください。'],
            ]);
        }

        if ($to->gt(CarbonImmutable::today(self::JST))) {
            throw ValidationException::withMessages([
                'to_date' => ['終了日は本日以前にしてください。'],
            ]);
        }

        $days = $from->diffInDays($to) + 1;

        if ($days > (int) config('stock_analysis.max_period_days')) {
            throw ValidationException::withMessages([
                'to_date' => ['分析期間は開始日・終了日を含め31日以内にしてください。'],
            ]);
        }

        return [$from->utc(), $to->addDay()->utc()];
    }
}
