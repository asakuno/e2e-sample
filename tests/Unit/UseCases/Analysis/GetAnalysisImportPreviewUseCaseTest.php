<?php

declare(strict_types=1);

namespace Tests\Unit\UseCases\Analysis;

use App\Models\AnalysisBatch;
use App\Models\AnalysisImport;
use App\Models\Stock;
use App\Repositories\AnalysisBatchRepositoryInterface;
use App\Repositories\AnalysisImportRepositoryInterface;
use App\UseCases\Analysis\GetAnalysisImportPreviewUseCase;
use Illuminate\Support\Collection;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Tests\TestCase;

final class GetAnalysisImportPreviewUseCaseTest extends TestCase
{
    public function test_ownerとbatchで絞ったimportとrevision関係を返す(): void
    {
        // Arrange
        $batch = new AnalysisBatch(['public_id' => 'batch-public-id']);
        $batch->id = 10;
        $baseCurrent = new AnalysisImport(['revision' => 4]);
        $baseCurrent->id = 20;
        $current = new AnalysisImport([
            'analysis_batch_id' => $batch->id,
            'base_current_import_id' => $baseCurrent->id,
            'revision' => 5,
        ]);
        $current->id = 21;
        $target = new AnalysisImport([
            'analysis_batch_id' => $batch->id,
            'base_current_import_id' => $baseCurrent->id,
        ]);
        $target->id = 22;

        $imports = new Collection([$baseCurrent, $current, $target]);
        foreach ($imports as $import) {
            $import->setRelation('analysisBatch', $batch);
        }
        $baseCurrent->setRelation('baseCurrentImport', null);
        $current->setRelation('baseCurrentImport', $baseCurrent);
        $target->setRelation('baseCurrentImport', $baseCurrent);
        $batch->setRelation('stock', new Stock);
        $batch->setRelation('newsSnapshots', new Collection);
        $batch->setRelation('imports', $imports);
        $batch->setRelation('currentImport', $current);
        $batch->setRelation('result', null);

        $batchRepository = $this->createMock(AnalysisBatchRepositoryInterface::class);
        $batchRepository->expects($this->once())
            ->method('findOwnedByPublicId')
            ->with(7, 'batch-public-id')
            ->willReturn($batch);
        $importRepository = $this->createMock(AnalysisImportRepositoryInterface::class);
        $importRepository->expects($this->once())
            ->method('findOwnedByBatchAndId')
            ->with(7, 10, 22)
            ->willReturn($target);
        $useCase = new GetAnalysisImportPreviewUseCase(
            $batchRepository,
            $importRepository,
        );

        // Act
        $result = $useCase->execute(7, 'batch-public-id', 22);

        // Assert
        $this->assertSame($batch, $result['batch']);
        $this->assertSame($target, $result['analysis_import']);
        $this->assertTrue($target->relationLoaded('baseCurrentImport'));
        $this->assertTrue($target->analysisBatch->relationLoaded('currentImport'));
        $this->assertTrue($target->analysisBatch->relationLoaded('imports'));
    }

    public function test_ownerのbatchが存在しなければimportを検索せず404にする(): void
    {
        // Arrange
        $batchRepository = $this->createMock(AnalysisBatchRepositoryInterface::class);
        $batchRepository->expects($this->once())
            ->method('findOwnedByPublicId')
            ->with(7, 'missing')
            ->willReturn(null);
        $importRepository = $this->createMock(AnalysisImportRepositoryInterface::class);
        $importRepository->expects($this->never())
            ->method('findOwnedByBatchAndId');
        $useCase = new GetAnalysisImportPreviewUseCase(
            $batchRepository,
            $importRepository,
        );

        // Assert
        $this->expectException(NotFoundHttpException::class);

        // Act
        $useCase->execute(7, 'missing', 22);
    }
}
