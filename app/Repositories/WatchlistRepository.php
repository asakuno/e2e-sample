<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Models\Watchlist;
use Illuminate\Support\Collection;

final class WatchlistRepository implements WatchlistRepositoryInterface
{
    /**
     * @return Collection<int, Watchlist>
     */
    public function findActiveByUser(int $userId): Collection
    {
        return Watchlist::query()
            ->with('stock')
            ->forUser($userId)
            ->active()
            ->orderByDesc('priority')
            ->orderByDesc('updated_at')
            ->orderByDesc('id')
            ->get();
    }

    /**
     * @return array<int, int>
     */
    public function findActiveStockIdsByUser(int $userId): array
    {
        return Watchlist::query()
            ->forUser($userId)
            ->active()
            ->pluck('stock_id')
            ->all();
    }

    public function findByUserAndStock(int $userId, int $stockId): ?Watchlist
    {
        return Watchlist::query()
            ->with('stock')
            ->forUser($userId)
            ->where('stock_id', $stockId)
            ->first();
    }

    public function create(int $userId, int $stockId, ?string $memo, int $priority): Watchlist
    {
        $watchlist = Watchlist::create([
            'user_id' => $userId,
            'stock_id' => $stockId,
            'memo' => $memo,
            'priority' => $priority,
            'is_active' => true,
        ]);

        return $watchlist->refresh()->load('stock');
    }

    public function update(int $id, ?string $memo, int $priority, bool $isActive): Watchlist
    {
        $watchlist = Watchlist::query()->findOrFail($id);
        $watchlist->update([
            'memo' => $memo,
            'priority' => $priority,
            'is_active' => $isActive,
        ]);

        return $watchlist->refresh()->load('stock');
    }

    public function deactivate(int $id): void
    {
        Watchlist::query()
            ->whereKey($id)
            ->update(['is_active' => false]);
    }
}
