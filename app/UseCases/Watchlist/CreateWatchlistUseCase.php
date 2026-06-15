<?php

declare(strict_types=1);

namespace App\UseCases\Watchlist;

use App\Data\Watchlist\CreateWatchlistData;
use App\Data\Watchlist\WatchlistItemData;
use App\Repositories\WatchlistRepositoryInterface;

final class CreateWatchlistUseCase
{
    public function __construct(
        private WatchlistRepositoryInterface $watchlistRepository,
    ) {}

    public function execute(CreateWatchlistData $data): WatchlistItemData
    {
        $existing = $this->watchlistRepository->findByUserAndStock($data->userId, $data->stockId);

        if ($existing !== null) {
            return WatchlistItemData::fromModel($this->watchlistRepository->update(
                id: $existing->id,
                memo: $data->memo,
                priority: $data->priority,
                isActive: true,
            ));
        }

        return WatchlistItemData::fromModel($this->watchlistRepository->create(
            userId: $data->userId,
            stockId: $data->stockId,
            memo: $data->memo,
            priority: $data->priority,
        ));
    }
}
