<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Models\Watchlist;
use Illuminate\Support\Collection;

interface WatchlistRepositoryInterface
{
    /**
     * @return Collection<int, Watchlist>
     */
    public function findActiveByUser(int $userId): Collection;

    /**
     * @return array<int, int>
     */
    public function findActiveStockIdsByUser(int $userId): array;

    public function findByUserAndStock(int $userId, int $stockId): ?Watchlist;

    public function create(int $userId, int $stockId, ?string $memo, int $priority): Watchlist;

    public function update(int $id, ?string $memo, int $priority, bool $isActive): Watchlist;

    public function deactivate(int $id): void;
}
