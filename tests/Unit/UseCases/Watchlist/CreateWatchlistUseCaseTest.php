<?php

declare(strict_types=1);

namespace Tests\Unit\UseCases\Watchlist;

use App\Data\Watchlist\CreateWatchlistData;
use App\Models\Stock;
use App\Models\Watchlist;
use App\Repositories\WatchlistRepositoryInterface;
use App\UseCases\Watchlist\CreateWatchlistUseCase;
use Tests\TestCase;

final class CreateWatchlistUseCaseTest extends TestCase
{
    public function test_新しいウォッチリストを作成できる(): void
    {
        // Arrange
        $stock = new Stock([
            'symbol' => 'AAPL',
            'name' => 'Apple Inc.',
            'market' => 'us',
            'country' => 'US',
            'currency' => 'USD',
        ]);
        $stock->id = 10;

        $watchlist = new Watchlist([
            'user_id' => 1,
            'stock_id' => 10,
            'memo' => '監視',
            'priority' => 2,
            'is_active' => true,
        ]);
        $watchlist->id = 20;
        $watchlist->setRelation('stock', $stock);

        $repository = $this->createMock(WatchlistRepositoryInterface::class);
        $repository->expects($this->once())
            ->method('findByUserAndStock')
            ->with(1, 10)
            ->willReturn(null);
        $repository->expects($this->once())
            ->method('create')
            ->with(1, 10, '監視', 2)
            ->willReturn($watchlist);

        $useCase = new CreateWatchlistUseCase($repository);

        // Act
        $result = $useCase->execute(new CreateWatchlistData(
            userId: 1,
            stockId: 10,
            memo: '監視',
            priority: 2,
        ));

        // Assert
        $this->assertSame(20, $result->id);
        $this->assertSame('AAPL', $result->stock->symbol);
        $this->assertSame('監視', $result->memo);
        $this->assertTrue($result->isActive);
    }

    public function test_既存ウォッチリストは再有効化して更新する(): void
    {
        // Arrange
        $stock = new Stock([
            'symbol' => 'MSFT',
            'name' => 'Microsoft Corporation',
            'market' => 'us',
            'country' => 'US',
            'currency' => 'USD',
        ]);
        $stock->id = 11;

        $existing = new Watchlist([
            'user_id' => 1,
            'stock_id' => 11,
            'memo' => '古いメモ',
            'priority' => 1,
            'is_active' => false,
        ]);
        $existing->id = 21;

        $updated = new Watchlist([
            'user_id' => 1,
            'stock_id' => 11,
            'memo' => '再監視',
            'priority' => 3,
            'is_active' => true,
        ]);
        $updated->id = 21;
        $updated->setRelation('stock', $stock);

        $repository = $this->createMock(WatchlistRepositoryInterface::class);
        $repository->expects($this->once())
            ->method('findByUserAndStock')
            ->with(1, 11)
            ->willReturn($existing);
        $repository->expects($this->never())->method('create');
        $repository->expects($this->once())
            ->method('update')
            ->with(21, '再監視', 3, true)
            ->willReturn($updated);

        $useCase = new CreateWatchlistUseCase($repository);

        // Act
        $result = $useCase->execute(new CreateWatchlistData(
            userId: 1,
            stockId: 11,
            memo: '再監視',
            priority: 3,
        ));

        // Assert
        $this->assertSame(21, $result->id);
        $this->assertSame('再監視', $result->memo);
        $this->assertSame(3, $result->priority);
        $this->assertTrue($result->isActive);
    }
}
