<?php

declare(strict_types=1);

namespace App\UseCases\Analysis;

use App\Data\Analysis\AnalysisResultImportData;
use App\Data\Analysis\UploadAnalysisImportData;
use App\Enums\AnalysisImportMode;
use App\Enums\AnalysisImportStatus;
use App\Models\AnalysisImport;
use App\Models\User;
use App\Repositories\AnalysisBatchRepositoryInterface;
use App\Repositories\AnalysisImportRepositoryInterface;
use App\Services\Analysis\AnalysisImportRawFileRetentionService;
use App\Services\Analysis\AnalysisResultCsvParser;
use App\Services\Analysis\AnalysisResultValidator;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Throwable;

final class ReprepareAnalysisImportUseCase
{
    public function __construct(
        private readonly AnalysisBatchRepositoryInterface $analysisBatchRepository,
        private readonly AnalysisImportRepositoryInterface $analysisImportRepository,
        private readonly AnalysisResultCsvParser $parser,
        private readonly AnalysisResultValidator $validator,
        private readonly AnalysisImportRawFileRetentionService $retention,
    ) {}

    /**
     * @throws ValidationException
     */
    public function execute(
        int $userId,
        int $batchId,
        int $importId,
        string $modelName,
        ?string $replacementReason,
        ?UploadedFile $restoredFile,
    ): AnalysisImport {
        $now = now();
        $newFilename = Str::ulid().'.csv';
        $newPath = null;
        $createdNewFile = false;
        $createdFilePath = null;

        try {
            return DB::transaction(function () use (
                $userId,
                $batchId,
                $importId,
                $modelName,
                $replacementReason,
                $restoredFile,
                $now,
                $newFilename,
                &$createdNewFile,
                &$createdFilePath,
                &$newPath,
            ): AnalysisImport {
                User::query()->whereKey($userId)->lockForUpdate()->firstOrFail();
                $batch = $this->analysisBatchRepository->lockOwnedById($userId, $batchId);
                $import = $this->analysisImportRepository->lockOwnedByBatchAndId(
                    $userId,
                    $batchId,
                    $importId,
                );

                if ($batch === null || $import === null) {
                    throw new NotFoundHttpException('Analysis import not found.');
                }

                if ($import->getAttribute('status') !== AnalysisImportStatus::Stale) {
                    throw ValidationException::withMessages([
                        'csv_file' => ['stale状態のimportだけ再準備できます。'],
                    ]);
                }

                $disk = Storage::disk((string) config('stock_analysis.disk'));
                $storedPath = $import->private_file_path;
                $expired = $this->retention->isExpired($import, $now);
                $path = $storedPath !== null && ! $expired && $disk->exists($storedPath)
                    ? $storedPath
                    : null;
                $bytes = null;
                $storedAt = $import->raw_stored_at ?? $now;
                $originalFilename = $import->original_filename;

                if ($restoredFile !== null) {
                    $realPath = $restoredFile->getRealPath();
                    $bytes = $realPath === false ? false : file_get_contents($realPath);

                    if ($bytes === false || hash('sha256', $bytes) !== $import->file_hash) {
                        throw ValidationException::withMessages([
                            'csv_file' => ['元のstale importと同じCSVファイルを選択してください。'],
                        ]);
                    }

                    if ($storedPath === null) {
                        $currentBytes = $this->analysisImportRepository->rawStorageBytesForUser($userId);
                        $quota = (int) config('stock_analysis.raw_storage_quota_bytes');

                        if ($currentBytes + strlen($bytes) > $quota) {
                            throw ValidationException::withMessages([
                                'csv_file' => ['raw CSVの保存量が上限を超えます。'],
                            ]);
                        }

                        $newPath ??= "analysis-imports/{$batch->public_id}/{$newFilename}";
                    }

                    $path ??= $storedPath ?? $newPath;

                    if (! $disk->exists($path)) {
                        $createdNewFile = true;
                        $createdFilePath ??= $path;
                    }

                    if (! $disk->put($path, $bytes)) {
                        throw ValidationException::withMessages([
                            'csv_file' => ['CSVファイルを復元できませんでした。'],
                        ]);
                    }

                    $storedAt = $now;
                    $originalFilename = mb_substr(
                        basename(str_replace('\\', '/', $restoredFile->getClientOriginalName())),
                        0,
                        255,
                        'UTF-8',
                    );
                } elseif ($path !== null) {
                    $bytes = $disk->get($path);
                }

                if (! is_string($bytes)) {
                    throw ValidationException::withMessages([
                        'csv_file' => ['raw CSVの保持期限が切れています。同じCSVを再選択してください。'],
                    ]);
                }

                if (hash('sha256', $bytes) !== $import->file_hash) {
                    throw ValidationException::withMessages([
                        'csv_file' => ['保存済みCSVのhashが一致しません。'],
                    ]);
                }

                $mode = $batch->current_import_id === null
                    ? AnalysisImportMode::Initial
                    : AnalysisImportMode::Replace;

                if ($mode === AnalysisImportMode::Replace && trim((string) $replacementReason) === '') {
                    throw ValidationException::withMessages([
                        'replacement_reason' => ['現在の結果を置き換える理由を入力してください。'],
                    ]);
                }

                $import = $this->analysisImportRepository->reprepareStale(
                    $import->id,
                    new UploadAnalysisImportData(
                        analysisBatchId: $batch->id,
                        baseCurrentImportId: $batch->current_import_id,
                        mode: $mode,
                        modelName: $modelName,
                        originalFilename: $originalFilename,
                        privateFilePath: $path,
                        fileSize: strlen($bytes),
                        fileHash: $import->file_hash,
                        replacementReason: $replacementReason,
                        storedAt: $storedAt,
                    ),
                );
                $parsed = $this->parser->parse($bytes);

                if ($parsed['row'] === null) {
                    return $this->analysisImportRepository->markInvalid($import->id, $parsed['errors']);
                }

                $validated = $this->validator->validate(
                    $parsed['row'],
                    $batch->loadMissing('newsSnapshots'),
                );

                if ($validated['data'] === null) {
                    return $this->analysisImportRepository->markInvalid(
                        $import->id,
                        $validated['errors'],
                    );
                }

                return $this->analysisImportRepository->markValidated(
                    $import->id,
                    AnalysisResultImportData::fromValidatedPayload($validated['data']),
                );
            }, 3);
        } catch (Throwable $exception) {
            if ($createdNewFile && $createdFilePath !== null) {
                Storage::disk((string) config('stock_analysis.disk'))->delete($createdFilePath);
            }

            throw $exception;
        }
    }
}
