<?php

declare(strict_types=1);

namespace Tests\Unit\UseCases\Watchlist;

use App\Models\Stock;
use App\Models\Watchlist;
use App\Repositories\WatchlistRepositoryInterface;
use App\UseCases\Watchlist\ListWatchlistsUseCase;
use Illuminate\Support\Collection;
use Tests\TestCase;

final class ListWatchlistsUseCaseTest extends TestCase
{
    public function test_ユーザーの有効なウォッチリスト一覧を取得できる(): void
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
            ->method('findActiveByUser')
            ->with(1)
            ->willReturn(new Collection([$watchlist]));

        $useCase = new ListWatchlistsUseCase($repository);

        // Act
        $result = $useCase->execute(1);

        // Assert
        $this->assertCount(1, $result);
        $this->assertSame(20, $result[0]->id);
        $this->assertSame('AAPL', $result[0]->stock->symbol);
    }
}
