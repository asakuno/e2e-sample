<?php

declare(strict_types=1);

namespace Tests\Unit\UseCases\Analysis;

use App\Enums\AnalysisBatchStatus;
use App\Repositories\AnalysisBatchRepositoryInterface;
use App\UseCases\Analysis\ListAnalysisBatchesUseCase;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection;
use Tests\TestCase;

final class ListAnalysisBatchesUseCaseTest extends TestCase
{
    public function test_ownerとstatusをrepositoryへ渡して一覧を取得する(): void
    {
        // Arrange
        $paginator = new LengthAwarePaginator(new Collection, 0, 15);
        $repository = $this->createMock(AnalysisBatchRepositoryInterface::class);
        $repository->expects($this->once())
            ->method('paginateOwned')
            ->with(42, AnalysisBatchStatus::Completed)
            ->willReturn($paginator);
        $useCase = new ListAnalysisBatchesUseCase($repository);

        // Act
        $result = $useCase->execute(42, AnalysisBatchStatus::Completed);

        // Assert
        $this->assertSame($paginator, $result);
    }
}
