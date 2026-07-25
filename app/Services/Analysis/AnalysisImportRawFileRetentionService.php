<?php

declare(strict_types=1);

namespace App\Services\Analysis;

use App\Enums\AnalysisImportStatus;
use App\Models\AnalysisImport;
use Carbon\CarbonInterface;

final class AnalysisImportRawFileRetentionService
{
    public function committedCutoff(CarbonInterface $now): CarbonInterface
    {
        return $now->copy()->subDays(
            (int) config('stock_analysis.raw_committed_retention_days'),
        );
    }

    public function uncommittedCutoff(CarbonInterface $now): CarbonInterface
    {
        return $now->copy()->subDays(
            (int) config('stock_analysis.raw_uncommitted_retention_days'),
        );
    }

    public function isExpired(AnalysisImport $import, CarbonInterface $now): bool
    {
        if (in_array($import->getAttribute('status'), [
            AnalysisImportStatus::Committed,
            AnalysisImportStatus::Superseded,
        ], true)) {
            $storedAt = $import->getAttribute('committed_at');
            $cutoff = $this->committedCutoff($now);
        } else {
            $storedAt = $import->getAttribute('raw_stored_at');
            $cutoff = $this->uncommittedCutoff($now);
        }

        return ! $storedAt instanceof CarbonInterface
            || $storedAt->lte($cutoff);
    }
}
