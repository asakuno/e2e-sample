<?php

declare(strict_types=1);

namespace App\UseCases\Analysis;

use App\Data\Analysis\AnalysisResultImportData;
use App\Enums\AnalysisBatchStatus;
use App\Enums\AnalysisImportMode;
use App\Enums\AnalysisImportStatus;
use App\Models\AnalysisBatch;
use App\Models\AnalysisImport;
use App\Models\AnalysisResult;
use App\Models\Stock;
use App\Repositories\AnalysisBatchRepositoryInterface;
use App\Repositories\AnalysisImportRepositoryInterface;
use App\Repositories\PeriodAnalysisSignalRepositoryInterface;
use App\Services\Analysis\AnalysisImportRawFileRetentionService;
use App\Services\Analysis\AnalysisResultCsvParser;
use App\Services\Analysis\AnalysisResultValidator;
use App\Services\Analysis\PeriodAnalysisSignalCalculator;
use App\UseCases\Analysis\Exceptions\AnalysisImportStaleException;
use Carbon\CarbonInterface;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

final class FinalizeAnalysisImportUseCase
{
    public function __construct(
        private readonly AnalysisBatchRepositoryInterface $analysisBatchRepository,
        private readonly AnalysisImportRepositoryInterface $analysisImportRepository,
        private readonly PeriodAnalysisSignalRepositoryInterface $periodAnalysisSignalRepository,
        private readonly AnalysisResultCsvParser $parser,
        private readonly AnalysisResultValidator $validator,
        private readonly PeriodAnalysisSignalCalculator $signalCalculator,
        private readonly AnalysisImportRawFileRetentionService $retention,
    ) {}

    public function execute(
        int $userId,
        int $batchId,
        int $importId,
        AnalysisImportMode $expectedMode,
    ): AnalysisImport {
        $now = now();
        $result = DB::transaction(function () use (
            $userId,
            $batchId,
            $importId,
            $expectedMode,
            $now,
        ): AnalysisImport {
            $batch = $this->analysisBatchRepository->lockOwnedById($userId, $batchId);
            $import = $this->analysisImportRepository->lockOwnedByBatchAndId(
                $userId,
                $batchId,
                $importId,
            );

            if ($batch === null || $import === null) {
                throw new NotFoundHttpException('Analysis import not found.');
            }

            Stock::query()->whereKey($batch->stock_id)->lockForUpdate()->firstOrFail();

            if (
                $import->getAttribute('status') !== AnalysisImportStatus::Validated
                || $import->getAttribute('mode') !== $expectedMode
            ) {
                throw new HttpException(422, '確定可能な分析importではありません。');
            }

            if (
                $expectedMode === AnalysisImportMode::Replace
                && trim((string) $import->replacement_reason) === ''
            ) {
                throw new HttpException(422, '置き換え理由が必要です。');
            }

            if ($import->base_current_import_id !== $batch->current_import_id) {
                return $this->stale($import, $batch, 'current_import_changed', $now);
            }

            if (
                $expectedMode === AnalysisImportMode::Initial
                && $batch->current_import_id !== null
            ) {
                return $this->stale($import, $batch, 'initial_current_exists', $now);
            }

            if (
                $expectedMode === AnalysisImportMode::Replace
                && $batch->current_import_id === null
            ) {
                return $this->stale($import, $batch, 'replace_current_missing', $now);
            }

            $payload = $this->revalidate($batch, $import, $now);

            if ($payload === null) {
                return $import->refresh();
            }

            $revision = $expectedMode === AnalysisImportMode::Initial
                ? 1
                : ((int) $batch->imports()->whereNotNull('revision')->max('revision')) + 1;

            if ($expectedMode === AnalysisImportMode::Replace) {
                $current = $batch->currentImport;

                if ($current === null || $current->analysis_batch_id !== $batch->id) {
                    return $this->stale($import, $batch, 'current_import_inconsistent', $now);
                }

                $this->analysisImportRepository->markSuperseded($current->id);
            }

            $committed = $this->analysisImportRepository->markCommitted($import->id, $revision);
            $committedAt = $committed->committed_at ?? $now;
            AnalysisResult::query()->updateOrCreate(
                [
                    'stock_id' => $batch->stock_id,
                    'analysable_type' => AnalysisBatch::class,
                    'analysable_id' => $batch->id,
                    'prompt_version' => $batch->prompt_version,
                ],
                [
                    'source_import_id' => $committed->id,
                    'summary' => $payload->summary,
                    'sentiment' => $payload->sentiment,
                    'impact_score' => $payload->impactScore,
                    'confidence_score' => $payload->confidenceScore,
                    'time_horizon' => $payload->timeHorizon,
                    'positive_factors' => $payload->positiveFactors,
                    'negative_factors' => $payload->negativeFactors,
                    'risk_points' => $payload->riskPoints,
                    'evidence_items' => array_map(
                        static fn ($evidence): array => $evidence->toArray(),
                        $payload->evidenceItems,
                    ),
                    'reason' => $payload->reason,
                    'model_provider' => 'chatgpt_manual',
                    'model_name' => $committed->model_name,
                    'input_tokens' => null,
                    'output_tokens' => null,
                    'analyzed_at' => $committedAt,
                ],
            );
            $batch->update([
                'current_import_id' => $committed->id,
                'status' => AnalysisBatchStatus::Completed,
            ]);
            $batch->refresh();
            $latest = $this->analysisBatchRepository->findLatestCompletedByUserAndStock(
                $userId,
                $batch->stock_id,
            );

            if ($latest?->id === $batch->id) {
                $signal = $this->signalCalculator->calculate(
                    $payload->impactScore,
                    $payload->confidenceScore,
                    array_map(
                        static fn ($evidence): array => [
                            'news_key' => $evidence->newsKey,
                            'type' => $evidence->type,
                            'note' => $evidence->note,
                        ],
                        $payload->evidenceItems,
                    ),
                    $payload->reason,
                );
                $this->periodAnalysisSignalRepository->upsertCurrent(
                    $userId,
                    $batch->stock_id,
                    [
                        'source_analysis_import_id' => $committed->id,
                        'prompt_version' => $batch->prompt_version,
                        'signal_date' => $committedAt->copy()
                            ->setTimezone('Asia/Tokyo')
                            ->toDateString(),
                        ...$signal,
                        'generated_at' => $committedAt,
                    ],
                );
            }

            return $committed->refresh();
        }, 3);

        if ($result->getAttribute('status') === AnalysisImportStatus::Stale) {
            throw new AnalysisImportStaleException('分析importがstaleになりました。最新状態で再プレビューしてください。');
        }

        return $result;
    }

    private function revalidate(
        AnalysisBatch $batch,
        AnalysisImport $import,
        CarbonInterface $now,
    ): ?AnalysisResultImportData {
        $path = $import->private_file_path;
        $disk = Storage::disk((string) config('stock_analysis.disk'));

        if ($this->retention->isExpired($import, $now)) {
            $this->stale($import, $batch, 'raw_expired', $now);

            return null;
        }

        if ($path === null || ! $disk->exists($path)) {
            $this->stale($import, $batch, 'raw_missing', $now);

            return null;
        }

        $bytes = $disk->get($path);

        if (hash('sha256', $bytes) !== $import->file_hash) {
            $this->stale($import, $batch, 'raw_hash_changed', $now);

            return null;
        }

        $parsed = $this->parser->parse($bytes);

        if ($parsed['row'] === null) {
            $this->stale($import, $batch, 'raw_validation_failed', $now);

            return null;
        }

        $validated = $this->validator->validate(
            $parsed['row'],
            $batch->loadMissing('newsSnapshots'),
        );

        if ($validated['data'] === null) {
            $this->stale($import, $batch, 'raw_validation_failed', $now);

            return null;
        }

        return AnalysisResultImportData::fromValidatedPayload($validated['data']);
    }

    private function stale(
        AnalysisImport $import,
        AnalysisBatch $batch,
        string $reason,
        CarbonInterface $now,
    ): AnalysisImport {
        return $this->analysisImportRepository->markStale($import->id, [
            'reason' => $reason,
            'base_current_import_id' => $import->base_current_import_id,
            'current_import_id' => $batch->current_import_id,
            'detected_at' => $now->copy()->utc()->toIso8601String(),
        ]);
    }
}
