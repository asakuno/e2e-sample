<?php

declare(strict_types=1);

namespace App\UseCases\Analysis;

use App\Models\AnalysisBatch;
use App\Models\AnalysisImport;
use App\Repositories\AnalysisBatchRepositoryInterface;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

final class GetAnalysisImportPreviewUseCase
{
    public function __construct(
        private readonly AnalysisBatchRepositoryInterface $analysisBatchRepository,
    ) {}

    /**
     * @return array{batch: AnalysisBatch, analysis_import: AnalysisImport}
     */
    public function execute(
        int $userId,
        string $batchPublicId,
        int $importId,
    ): array {
        $batch = $this->analysisBatchRepository->findOwnedByPublicId(
            $userId,
            $batchPublicId,
        );
        $analysisImport = AnalysisImport::query()
            ->where('analysis_batch_id', $batch?->id)
            ->find($importId);

        if ($batch === null || $analysisImport === null) {
            throw new NotFoundHttpException('Analysis import not found.');
        }

        $batch->loadMissing([
            'stock',
            'newsSnapshots',
            'imports',
            'currentImport',
            'result',
        ]);
        $analysisImport->loadMissing('analysisBatch.stock');

        return [
            'batch' => $batch,
            'analysis_import' => $analysisImport,
        ];
    }
}
