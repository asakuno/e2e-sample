<?php

declare(strict_types=1);

namespace Tests\Unit\UseCases\Watchlist;

use App\Data\Watchlist\UpdateWatchlistData;
use App\Models\Stock;
use App\Models\Watchlist;
use App\Repositories\WatchlistRepositoryInterface;
use App\UseCases\Watchlist\UpdateWatchlistUseCase;
use Tests\TestCase;

final class UpdateWatchlistUseCaseTest extends TestCase
{
    public function test_ウォッチリストを更新できる(): void
    {
        // Arrange
        $stock = new Stock([
            'symbol' => 'NVDA',
            'name' => 'NVIDIA Corporation',
            'market' => 'us',
            'country' => 'US',
            'currency' => 'USD',
        ]);
        $stock->id = 12;

        $watchlist = new Watchlist([
            'user_id' => 1,
            'stock_id' => 12,
            'memo' => '更新後',
            'priority' => 3,
            'is_active' => true,
        ]);
        $watchlist->id = 22;
        $watchlist->setRelation('stock', $stock);

        $repository = $this->createMock(WatchlistRepositoryInterface::class);
        $repository->expects($this->once())
            ->method('update')
            ->with(22, '更新後', 3, true)
            ->willReturn($watchlist);

        $useCase = new UpdateWatchlistUseCase($repository);

        // Act
        $result = $useCase->execute(new UpdateWatchlistData(
            id: 22,
            memo: '更新後',
            priority: 3,
        ));

        // Assert
        $this->assertSame(22, $result->id);
        $this->assertSame('更新後', $result->memo);
        $this->assertSame(3, $result->priority);
    }
}
