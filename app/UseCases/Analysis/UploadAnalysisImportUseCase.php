<?php

declare(strict_types=1);

namespace App\UseCases\Analysis;

use App\Data\Analysis\AnalysisResultImportData;
use App\Data\Analysis\UploadAnalysisImportData;
use App\Enums\AnalysisBatchStatus;
use App\Enums\AnalysisImportMode;
use App\Models\AnalysisBatch;
use App\Models\AnalysisImport;
use App\Models\User;
use App\Repositories\AnalysisBatchRepositoryInterface;
use App\Repositories\AnalysisImportRepositoryInterface;
use App\Services\Analysis\AnalysisResultCsvParser;
use App\Services\Analysis\AnalysisResultValidator;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use RuntimeException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Throwable;

final class UploadAnalysisImportUseCase
{
    public function __construct(
        private readonly AnalysisBatchRepositoryInterface $analysisBatchRepository,
        private readonly AnalysisImportRepositoryInterface $analysisImportRepository,
        private readonly AnalysisResultCsvParser $parser,
        private readonly AnalysisResultValidator $validator,
    ) {}

    /**
     * @throws ValidationException
     */
    public function execute(
        int $userId,
        int $batchId,
        UploadedFile $file,
        string $modelName,
        AnalysisImportMode $mode,
        ?string $replacementReason = null,
    ): AnalysisImport {
        $storageFilename = Str::ulid().'.csv';
        $path = null;
        $storedAt = now();
        $createdNewFile = false;

        try {
            return DB::transaction(function () use (
                $userId,
                $batchId,
                $file,
                $modelName,
                $mode,
                $replacementReason,
                $storageFilename,
                $storedAt,
                &$createdNewFile,
                &$path,
            ): AnalysisImport {
                User::query()->whereKey($userId)->lockForUpdate()->firstOrFail();
                $batch = $this->analysisBatchRepository->lockOwnedById($userId, $batchId);

                if ($batch === null) {
                    throw new NotFoundHttpException('Analysis batch not found.');
                }

                $this->validateModeAndState($batch, $mode, $replacementReason);
                $realPath = $file->getRealPath();
                $bytes = $realPath === false ? false : file_get_contents($realPath);

                if ($bytes === false) {
                    throw ValidationException::withMessages([
                        'csv_file' => ['CSVファイルを読み取れませんでした。'],
                    ]);
                }

                $fileHash = hash('sha256', $bytes);
                $fileSize = strlen($bytes);

                if ($this->analysisImportRepository->findByBatchFileHash($batch->id, $fileHash) !== null) {
                    throw ValidationException::withMessages([
                        'csv_file' => ['同じCSVはこのバッチへ既にアップロードされています。'],
                    ]);
                }

                $currentBytes = $this->analysisImportRepository->rawStorageBytesForUser($userId);
                $quota = (int) config('stock_analysis.raw_storage_quota_bytes');

                if ($currentBytes + $fileSize > $quota) {
                    throw ValidationException::withMessages([
                        'csv_file' => ["raw CSVの保存量が上限を超えます（現在{$currentBytes} bytes／上限{$quota} bytes）。"],
                    ]);
                }

                $disk = (string) config('stock_analysis.disk');
                $path ??= "analysis-imports/{$batch->public_id}/{$storageFilename}";
                $createdNewFile = true;

                if (! Storage::disk($disk)->put($path, $bytes)) {
                    throw new RuntimeException('CSVをprivate storageへ保存できませんでした。');
                }

                $import = $this->analysisImportRepository->createUploaded(
                    new UploadAnalysisImportData(
                        analysisBatchId: $batch->id,
                        baseCurrentImportId: $batch->current_import_id,
                        mode: $mode,
                        modelName: $modelName,
                        originalFilename: $this->safeFilename($file->getClientOriginalName()),
                        privateFilePath: $path,
                        fileSize: $fileSize,
                        fileHash: $fileHash,
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
            if ($createdNewFile && $path !== null) {
                Storage::disk((string) config('stock_analysis.disk'))->delete($path);
            }

            throw $exception;
        }
    }

    /**
     * @throws ValidationException
     */
    private function validateModeAndState(
        AnalysisBatch $batch,
        AnalysisImportMode $mode,
        ?string $replacementReason,
    ): void {
        if (
            $batch->exported_at === null
            || $batch->getAttribute('status') === AnalysisBatchStatus::Prepared
        ) {
            throw ValidationException::withMessages([
                'csv_file' => ['プロンプトを出力したバッチだけCSVを取り込めます。'],
            ]);
        }

        if ($mode === AnalysisImportMode::Initial && $batch->current_import_id !== null) {
            throw ValidationException::withMessages([
                'csv_file' => ['現在の結果があるため、結果の置き換えを使用してください。'],
            ]);
        }

        if ($mode === AnalysisImportMode::Replace && $batch->current_import_id === null) {
            throw ValidationException::withMessages([
                'csv_file' => ['現在の結果がないため、通常取込を使用してください。'],
            ]);
        }

        if ($mode === AnalysisImportMode::Replace && trim((string) $replacementReason) === '') {
            throw ValidationException::withMessages([
                'replacement_reason' => ['置き換え理由を入力してください。'],
            ]);
        }
    }

    private function safeFilename(string $filename): string
    {
        $basename = basename(str_replace('\\', '/', $filename));

        return mb_substr($basename === '' ? 'analysis.csv' : $basename, 0, 255, 'UTF-8');
    }
}
