<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Data\Analysis\AnalysisResultImportData;
use App\Data\Analysis\UploadAnalysisImportData;
use App\Enums\AnalysisImportStatus;
use App\Models\AnalysisImport;

final class AnalysisImportRepository implements AnalysisImportRepositoryInterface
{
    public function findByBatchFileHash(int $batchId, string $fileHash): ?AnalysisImport
    {
        return AnalysisImport::query()
            ->where('analysis_batch_id', $batchId)
            ->where('file_hash', $fileHash)
            ->first();
    }

    public function rawStorageBytesForUser(int $userId): int
    {
        return (int) AnalysisImport::query()
            ->whereNotNull('private_file_path')
            ->whereHas(
                'analysisBatch',
                fn ($query) => $query->where('user_id', $userId),
            )
            ->sum('file_size');
    }

    public function createUploaded(UploadAnalysisImportData $data): AnalysisImport
    {
        return AnalysisImport::query()->create([
            'analysis_batch_id' => $data->analysisBatchId,
            'base_current_import_id' => $data->baseCurrentImportId,
            'mode' => $data->mode,
            'status' => AnalysisImportStatus::Uploaded,
            'model_name' => $data->modelName,
            'original_filename' => $data->originalFilename,
            'private_file_path' => $data->privateFilePath,
            'file_size' => $data->fileSize,
            'file_hash' => $data->fileHash,
            'replacement_reason' => $data->replacementReason,
            'uploaded_at' => $data->storedAt,
            'raw_stored_at' => $data->storedAt,
        ]);
    }

    public function markValidated(int $importId, AnalysisResultImportData $payload): AnalysisImport
    {
        return $this->update($importId, [
            'status' => AnalysisImportStatus::Validated,
            'normalized_payload' => $payload->toArray(),
            'validation_errors' => null,
            'validated_at' => now(),
        ]);
    }

    /**
     * @param  array<string, list<string>>  $errors
     */
    public function markInvalid(int $importId, array $errors): AnalysisImport
    {
        return $this->update($importId, [
            'status' => AnalysisImportStatus::Invalid,
            'normalized_payload' => null,
            'validation_errors' => $errors,
            'validated_at' => now(),
        ]);
    }

    /**
     * @param  array<string, int|string|null>  $staleEvent
     */
    public function markStale(int $importId, array $staleEvent): AnalysisImport
    {
        $import = AnalysisImport::query()->findOrFail($importId);
        $history = $import->stale_history ?? [];
        $history[] = $staleEvent;

        $import->update([
            'status' => AnalysisImportStatus::Stale,
            'stale_history' => $history,
        ]);

        return $import->refresh();
    }

    public function reprepareStale(int $importId, UploadAnalysisImportData $data): AnalysisImport
    {
        return $this->update($importId, [
            'base_current_import_id' => $data->baseCurrentImportId,
            'mode' => $data->mode,
            'status' => AnalysisImportStatus::Uploaded,
            'model_name' => $data->modelName,
            'original_filename' => $data->originalFilename,
            'private_file_path' => $data->privateFilePath,
            'file_size' => $data->fileSize,
            'replacement_reason' => $data->replacementReason,
            'raw_stored_at' => $data->storedAt,
            'raw_file_deleted_at' => null,
        ]);
    }

    public function markRawDeleted(int $importId): AnalysisImport
    {
        return $this->update($importId, [
            'private_file_path' => null,
            'raw_file_deleted_at' => now(),
        ]);
    }

    public function lockOwnedByBatchAndId(
        int $userId,
        int $batchId,
        int $importId,
    ): ?AnalysisImport {
        return AnalysisImport::query()
            ->whereKey($importId)
            ->where('analysis_batch_id', $batchId)
            ->whereHas(
                'analysisBatch',
                fn ($query) => $query->where('user_id', $userId),
            )
            ->lockForUpdate()
            ->first();
    }

    public function markCommitted(int $importId, int $revision): AnalysisImport
    {
        return $this->update($importId, [
            'status' => AnalysisImportStatus::Committed,
            'revision' => $revision,
            'committed_at' => now(),
        ]);
    }

    public function markSuperseded(int $importId): AnalysisImport
    {
        return $this->update($importId, [
            'status' => AnalysisImportStatus::Superseded,
        ]);
    }

    /**
     * @param  array<string, mixed>  $attributes
     */
    private function update(int $importId, array $attributes): AnalysisImport
    {
        $import = AnalysisImport::query()->findOrFail($importId);
        $import->update($attributes);

        return $import->refresh();
    }
}
