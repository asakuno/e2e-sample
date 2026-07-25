<?php

declare(strict_types=1);

namespace App\Data\Analysis;

use App\Enums\AnalysisImportMode;
use Carbon\CarbonInterface;
use Spatie\LaravelData\Data;

final class UploadAnalysisImportData extends Data
{
    public function __construct(
        public readonly int $analysisBatchId,
        public readonly ?int $baseCurrentImportId,
        public readonly AnalysisImportMode $mode,
        public readonly string $modelName,
        public readonly string $originalFilename,
        public readonly ?string $privateFilePath,
        public readonly int $fileSize,
        public readonly string $fileHash,
        public readonly ?string $replacementReason,
        public readonly CarbonInterface $storedAt,
    ) {}
}
