<?php

declare(strict_types=1);

namespace App\UseCases\Watchlist;

use App\Data\Watchlist\UpdateWatchlistData;
use App\Data\Watchlist\WatchlistItemData;
use App\Repositories\WatchlistRepositoryInterface;

final class UpdateWatchlistUseCase
{
    public function __construct(
        private WatchlistRepositoryInterface $watchlistRepository,
    ) {}

    public function execute(UpdateWatchlistData $data): WatchlistItemData
    {
        return WatchlistItemData::fromModel($this->watchlistRepository->update(
            id: $data->id,
            memo: $data->memo,
            priority: $data->priority,
            isActive: true,
        ));
    }
}
