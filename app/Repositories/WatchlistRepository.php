<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Models\Watchlist;
use Illuminate\Pagination\LengthAwarePaginator;

final class WatchlistRepository implements WatchlistRepositoryInterface
{
    /**
     * @return LengthAwarePaginator<int, Watchlist>
     */
    public function findActiveByUser(int $userId): LengthAwarePaginator
    {
        return Watchlist::query()
            ->with('stock')
            ->forUser($userId)
            ->active()
            ->orderByDesc('priority')
            ->orderByDesc('updated_at')
            ->orderByDesc('id')
            ->paginate(20)
            ->withQueryString();
    }

    /**
     * @param  array<int, int>|null  $stockIds
     * @return array<int, int>
     */
    public function findActiveStockIdsByUser(int $userId, ?array $stockIds = null): array
    {
        return Watchlist::query()
            ->forUser($userId)
            ->active()
            ->when(
                $stockIds !== null,
                fn ($query) => $query->whereIn('stock_id', $stockIds),
            )
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

    public function findActiveByUserAndStock(int $userId, int $stockId): ?Watchlist
    {
        return Watchlist::query()
            ->forUser($userId)
            ->where('stock_id', $stockId)
            ->active()
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
