<?php

declare(strict_types=1);

namespace App\UseCases\Analysis;

use App\Enums\AnalysisImportMode;
use App\Models\AnalysisImport;

final class ReplaceAnalysisImportUseCase
{
    public function __construct(
        private readonly FinalizeAnalysisImportUseCase $finalize,
    ) {}

    public function execute(int $userId, int $batchId, int $importId): AnalysisImport
    {
        return $this->finalize->execute(
            $userId,
            $batchId,
            $importId,
            AnalysisImportMode::Replace,
        );
    }
}
