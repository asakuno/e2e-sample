<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Enums\AnalysisImportStatus;
use App\Models\AnalysisImport;
use Carbon\CarbonInterface;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

final class PurgeExpiredAnalysisImportRawFiles extends Command
{
    /**
     * @var string
     */
    protected $signature = 'analysis-imports:purge-expired-raw';

    /**
     * @var string
     */
    protected $description = 'Delete expired private raw CSV files while retaining import audit metadata';

    public function handle(): int
    {
        $deleted = 0;

        AnalysisImport::query()
            ->whereNotNull('private_file_path')
            ->where(function ($query): void {
                $query
                    ->where(function ($query): void {
                        $query
                            ->whereIn('status', [
                                AnalysisImportStatus::Committed->value,
                                AnalysisImportStatus::Superseded->value,
                            ])
                            ->where(
                                'committed_at',
                                '<=',
                                now()->subDays((int) config('stock_analysis.raw_committed_retention_days')),
                            );
                    })
                    ->orWhere(function ($query): void {
                        $query
                            ->whereNotIn('status', [
                                AnalysisImportStatus::Committed->value,
                                AnalysisImportStatus::Superseded->value,
                            ])
                            ->where(
                                'raw_stored_at',
                                '<=',
                                now()->subDays((int) config('stock_analysis.raw_uncommitted_retention_days')),
                            );
                    });
            })
            ->select('id')
            ->orderBy('id')
            ->chunkById(100, function ($imports) use (&$deleted): void {
                foreach ($imports as $candidate) {
                    $didDelete = DB::transaction(function () use ($candidate): bool {
                        $import = AnalysisImport::query()
                            ->whereKey($candidate->id)
                            ->lockForUpdate()
                            ->first();

                        if ($import === null || $import->private_file_path === null || ! $this->isExpired($import)) {
                            return false;
                        }

                        Storage::disk((string) config('stock_analysis.disk'))
                            ->delete($import->private_file_path);
                        $attributes = [
                            'private_file_path' => null,
                            'raw_file_deleted_at' => now(),
                        ];

                        if (in_array($import->getAttribute('status'), [
                            AnalysisImportStatus::Uploaded,
                            AnalysisImportStatus::Validated,
                        ], true)) {
                            $history = $import->stale_history ?? [];
                            $history[] = [
                                'reason' => 'raw_expired',
                                'base_current_import_id' => $import->base_current_import_id,
                                'current_import_id' => $import->analysisBatch()->value('current_import_id'),
                                'detected_at' => now()->utc()->toIso8601String(),
                            ];
                            $attributes['status'] = AnalysisImportStatus::Stale;
                            $attributes['stale_history'] = $history;
                        }

                        $import->update($attributes);

                        return true;
                    });

                    if ($didDelete) {
                        $deleted++;
                    }
                }
            });

        $this->info("Deleted {$deleted} expired raw CSV file(s).");

        return self::SUCCESS;
    }

    private function isExpired(AnalysisImport $import): bool
    {
        if (in_array($import->getAttribute('status'), [
            AnalysisImportStatus::Committed,
            AnalysisImportStatus::Superseded,
        ], true)) {
            $committedAt = $import->getAttribute('committed_at');

            return $committedAt instanceof CarbonInterface
                && $committedAt->lte(
                    now()->subDays((int) config('stock_analysis.raw_committed_retention_days')),
                );
        }

        $rawStoredAt = $import->getAttribute('raw_stored_at');

        return $rawStoredAt instanceof CarbonInterface
            && $rawStoredAt->lte(
                now()->subDays((int) config('stock_analysis.raw_uncommitted_retention_days')),
            );
    }
}
