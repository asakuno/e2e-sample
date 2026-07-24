<?php

declare(strict_types=1);

namespace App\UseCases\Watchlist;

use App\Data\Watchlist\WatchlistItemData;
use App\Repositories\WatchlistRepositoryInterface;
use Illuminate\Pagination\LengthAwarePaginator;

final class ListWatchlistsUseCase
{
    public function __construct(
        private WatchlistRepositoryInterface $watchlistRepository,
    ) {}

    /**
     * @return LengthAwarePaginator<int, WatchlistItemData>
     */
    public function execute(int $userId): LengthAwarePaginator
    {
        return $this->watchlistRepository
            ->findActiveByUser($userId)
            ->through(
                fn ($watchlist): WatchlistItemData => WatchlistItemData::fromModel($watchlist),
            );
    }
}
