<?php

declare(strict_types=1);

namespace App\UseCases\Analysis;

use App\Models\AnalysisBatch;
use App\Models\AnalysisImport;
use App\Repositories\AnalysisBatchRepositoryInterface;
use App\Repositories\AnalysisImportRepositoryInterface;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

final class GetAnalysisImportPreviewUseCase
{
    public function __construct(
        private readonly AnalysisBatchRepositoryInterface $analysisBatchRepository,
        private readonly AnalysisImportRepositoryInterface $analysisImportRepository,
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

        if ($batch === null) {
            throw new NotFoundHttpException('Analysis import not found.');
        }

        $analysisImport = $this->analysisImportRepository->findOwnedByBatchAndId(
            $userId,
            $batch->id,
            $importId,
        );

        if ($analysisImport === null) {
            throw new NotFoundHttpException('Analysis import not found.');
        }

        $batch->loadMissing([
            'stock',
            'newsSnapshots',
            'imports.baseCurrentImport',
            'imports.analysisBatch.currentImport',
            'imports.analysisBatch.imports',
            'currentImport.baseCurrentImport',
            'currentImport.analysisBatch.currentImport',
            'currentImport.analysisBatch.imports',
            'result',
        ]);
        $analysisImport->loadMissing([
            'baseCurrentImport',
            'analysisBatch.currentImport',
            'analysisBatch.imports',
        ]);

        return [
            'batch' => $batch,
            'analysis_import' => $analysisImport,
        ];
    }
}
