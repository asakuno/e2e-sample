<?php

declare(strict_types=1);

namespace App\UseCases\Watchlist;

use App\Repositories\WatchlistRepositoryInterface;

final class DeleteWatchlistUseCase
{
    public function __construct(
        private WatchlistRepositoryInterface $watchlistRepository,
    ) {}

    public function execute(int $id): void
    {
        $this->watchlistRepository->deactivate($id);
    }
}
