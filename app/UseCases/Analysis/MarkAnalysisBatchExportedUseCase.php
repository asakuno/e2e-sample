<?php

declare(strict_types=1);

namespace App\UseCases\Analysis;

use App\Enums\AnalysisBatchStatus;
use App\Models\AnalysisBatch;
use App\Repositories\AnalysisBatchRepositoryInterface;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

final class MarkAnalysisBatchExportedUseCase
{
    public function __construct(
        private readonly AnalysisBatchRepositoryInterface $analysisBatchRepository,
    ) {}

    public function execute(int $userId, int $batchId): AnalysisBatch
    {
        return DB::transaction(function () use ($userId, $batchId): AnalysisBatch {
            $batch = $this->analysisBatchRepository->lockOwnedById($userId, $batchId);

            if ($batch === null) {
                throw new NotFoundHttpException('Analysis batch not found.');
            }

            if ($batch->exported_at === null) {
                $batch->update([
                    'exported_at' => now(),
                    'status' => AnalysisBatchStatus::Exported,
                ]);
            }

            return $batch->refresh();
        });
    }
}
