<?php

declare(strict_types=1);

namespace Tests\Unit\UseCases\Watchlist;

use App\Repositories\WatchlistRepositoryInterface;
use App\UseCases\Watchlist\DeleteWatchlistUseCase;
use Tests\TestCase;

final class DeleteWatchlistUseCaseTest extends TestCase
{
    public function test_ウォッチリストを停止できる(): void
    {
        // Arrange
        $repository = $this->createMock(WatchlistRepositoryInterface::class);
        $repository->expects($this->once())
            ->method('deactivate')
            ->with(10);

        $useCase = new DeleteWatchlistUseCase($repository);

        // Act
        $useCase->execute(10);

        // Assert
        $this->assertTrue(true);
    }
}
