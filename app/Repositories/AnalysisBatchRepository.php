<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Data\Analysis\PersistAnalysisBatchData;
use App\Enums\AnalysisBatchStatus;
use App\Models\AnalysisBatch;
use App\Models\NewsArticle;
use App\Models\Watchlist;
use Carbon\CarbonInterface;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;

final class AnalysisBatchRepository implements AnalysisBatchRepositoryInterface
{
    public function findOwnedByPublicId(int $userId, string $publicId): ?AnalysisBatch
    {
        return AnalysisBatch::query()
            ->with(['stock', 'newsSnapshots', 'imports', 'currentImport', 'result'])
            ->where('user_id', $userId)
            ->where('public_id', $publicId)
            ->first();
    }

    public function findOwnedByInputHash(int $userId, string $inputHash): ?AnalysisBatch
    {
        return AnalysisBatch::query()
            ->where('user_id', $userId)
            ->where('input_hash', $inputHash)
            ->first();
    }

    /**
     * @return list<NewsArticle>
     */
    public function findNewsCandidates(
        int $userId,
        int $stockId,
        CarbonInterface $from,
        CarbonInterface $to,
    ): array {
        $ownsActiveStock = Watchlist::query()
            ->forUser($userId)
            ->active()
            ->where('stock_id', $stockId)
            ->whereHas(
                'stock',
                fn (Builder $query): Builder => $query->where('is_active', true),
            )
            ->exists();

        if (! $ownsActiveStock) {
            return [];
        }

        return NewsArticle::query()
            ->whereNotNull('published_at')
            ->where('published_at', '>=', $from)
            ->where('published_at', '<', $to)
            ->whereHas(
                'stocks',
                fn (Builder $query): Builder => $query->whereKey($stockId),
            )
            ->orderBy('published_at')
            ->orderBy('id')
            ->get()
            ->all();
    }

    public function create(PersistAnalysisBatchData $data): AnalysisBatch
    {
        $batch = AnalysisBatch::query()->create([
            'public_id' => $data->publicId,
            'user_id' => $data->userId,
            'stock_id' => $data->stockId,
            'period_start_at' => $data->periodStartAt,
            'period_end_at' => $data->periodEndAt,
            'stock_snapshot' => $data->stockSnapshot,
            'prompt_version' => $data->promptVersion,
            'result_schema_version' => $data->resultSchemaVersion,
            'prompt_text' => $data->promptText,
            'prompt_hash' => $data->promptHash,
            'status' => $data->status,
            'input_hash' => $data->inputHash,
            'news_count' => $data->newsCount,
            'source_char_count' => $data->sourceCharCount,
        ]);

        $batch->newsSnapshots()->createMany($data->newsSnapshots);

        return $batch->load('newsSnapshots');
    }

    public function lockOwnedById(int $userId, int $batchId): ?AnalysisBatch
    {
        return AnalysisBatch::query()
            ->where('user_id', $userId)
            ->whereKey($batchId)
            ->lockForUpdate()
            ->first();
    }

    public function findLatestCompletedByUserAndStock(
        int $userId,
        int $stockId,
    ): ?AnalysisBatch {
        return AnalysisBatch::query()
            ->select('analysis_batches.*')
            ->join(
                'analysis_imports as current_import',
                'current_import.id',
                '=',
                'analysis_batches.current_import_id',
            )
            ->where('analysis_batches.user_id', $userId)
            ->where('analysis_batches.stock_id', $stockId)
            ->where('analysis_batches.status', AnalysisBatchStatus::Completed->value)
            ->orderByDesc('analysis_batches.period_end_at')
            ->orderByDesc('analysis_batches.period_start_at')
            ->orderByDesc('current_import.committed_at')
            ->orderByDesc('analysis_batches.id')
            ->with(['currentImport', 'result'])
            ->first();
    }

    /**
     * @return LengthAwarePaginator<int, AnalysisBatch>
     */
    public function paginateOwned(int $userId, int $perPage = 15): LengthAwarePaginator
    {
        return AnalysisBatch::query()
            ->with(['stock', 'currentImport'])
            ->where('user_id', $userId)
            ->orderByDesc('updated_at')
            ->orderByDesc('id')
            ->paginate($perPage);
    }
}
