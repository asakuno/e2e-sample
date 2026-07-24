<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Data\Analysis\AnalysisResultImportData;
use App\Data\Analysis\UploadAnalysisImportData;
use App\Models\AnalysisImport;

interface AnalysisImportRepositoryInterface
{
    public function findByBatchFileHash(int $batchId, string $fileHash): ?AnalysisImport;

    public function rawStorageBytesForUser(int $userId): int;

    public function createUploaded(UploadAnalysisImportData $data): AnalysisImport;

    public function markValidated(int $importId, AnalysisResultImportData $payload): AnalysisImport;

    /**
     * @param  array<string, list<string>>  $errors
     */
    public function markInvalid(int $importId, array $errors): AnalysisImport;

    /**
     * @param  array<string, int|string|null>  $staleEvent
     */
    public function markStale(int $importId, array $staleEvent): AnalysisImport;

    public function reprepareStale(int $importId, UploadAnalysisImportData $data): AnalysisImport;

    public function markRawDeleted(int $importId): AnalysisImport;

    public function lockOwnedByBatchAndId(
        int $userId,
        int $batchId,
        int $importId,
    ): ?AnalysisImport;

    public function markCommitted(int $importId, int $revision): AnalysisImport;

    public function markSuperseded(int $importId): AnalysisImport;
}
