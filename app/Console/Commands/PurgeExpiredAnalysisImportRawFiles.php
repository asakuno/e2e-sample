<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Enums\AnalysisImportStatus;
use App\Models\AnalysisImport;
use App\Services\Analysis\AnalysisImportRawFileRetentionService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
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

    public function handle(AnalysisImportRawFileRetentionService $retention): int
    {
        $deleted = 0;
        $now = now();
        $committedCutoff = $retention->committedCutoff($now);
        $uncommittedCutoff = $retention->uncommittedCutoff($now);

        AnalysisImport::query()
            ->whereNotNull('private_file_path')
            ->where(function ($query) use ($committedCutoff, $uncommittedCutoff): void {
                $query
                    ->where(function ($query) use ($committedCutoff): void {
                        $query
                            ->whereIn('status', [
                                AnalysisImportStatus::Committed->value,
                                AnalysisImportStatus::Superseded->value,
                            ])
                            ->where(
                                'committed_at',
                                '<=',
                                $committedCutoff,
                            );
                    })
                    ->orWhere(function ($query) use ($uncommittedCutoff): void {
                        $query
                            ->whereNotIn('status', [
                                AnalysisImportStatus::Committed->value,
                                AnalysisImportStatus::Superseded->value,
                            ])
                            ->where(
                                'raw_stored_at',
                                '<=',
                                $uncommittedCutoff,
                            );
                    });
            })
            ->select('id')
            ->orderBy('id')
            ->chunkById(100, function ($imports) use (&$deleted, $now, $retention): void {
                foreach ($imports as $candidate) {
                    $didDelete = DB::transaction(function () use ($candidate, $now, $retention): bool {
                        $import = AnalysisImport::query()
                            ->whereKey($candidate->id)
                            ->lockForUpdate()
                            ->first();

                        if (
                            $import === null
                            || $import->private_file_path === null
                            || ! $retention->isExpired($import, $now)
                        ) {
                            return false;
                        }

                        $path = $import->private_file_path;
                        $disk = Storage::disk((string) config('stock_analysis.disk'));
                        $deleteReported = $disk->delete($path);

                        if ($disk->exists($path)) {
                            Log::error('Failed to delete expired analysis import raw CSV.', [
                                'analysis_import_id' => $import->id,
                                'private_file_path' => $path,
                                'delete_reported' => $deleteReported,
                            ]);

                            return false;
                        }

                        $attributes = [
                            'private_file_path' => null,
                            'raw_file_deleted_at' => $now,
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
                                'detected_at' => $now->copy()->utc()->toIso8601String(),
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
}
