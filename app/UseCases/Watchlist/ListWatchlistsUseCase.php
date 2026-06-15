<?php

declare(strict_types=1);

namespace App\UseCases\Watchlist;

use App\Data\Watchlist\WatchlistItemData;
use App\Repositories\WatchlistRepositoryInterface;

final class ListWatchlistsUseCase
{
    public function __construct(
        private WatchlistRepositoryInterface $watchlistRepository,
    ) {}

    /**
     * @return array<int, WatchlistItemData>
     */
    public function execute(int $userId): array
    {
        return $this->watchlistRepository
            ->findActiveByUser($userId)
            ->map(fn ($watchlist): WatchlistItemData => WatchlistItemData::fromModel($watchlist))
            ->all();
    }
}
