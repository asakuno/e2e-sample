<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Models\Watchlist;
use Illuminate\Pagination\LengthAwarePaginator;

interface WatchlistRepositoryInterface
{
    /**
     * @return LengthAwarePaginator<int, Watchlist>
     */
    public function findActiveByUser(int $userId): LengthAwarePaginator;

    /**
     * @param  array<int, int>|null  $stockIds
     * @return array<int, int>
     */
    public function findActiveStockIdsByUser(int $userId, ?array $stockIds = null): array;

    public function findByUserAndStock(int $userId, int $stockId): ?Watchlist;

    public function findActiveByUserAndStock(int $userId, int $stockId): ?Watchlist;

    public function create(int $userId, int $stockId, ?string $memo, int $priority): Watchlist;

    public function update(int $id, ?string $memo, int $priority, bool $isActive): Watchlist;

    public function deactivate(int $id): void;
}
