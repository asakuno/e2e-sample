<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Data\Stock\StockSearchData;
use App\Models\Stock;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;

final class StockRepository implements StockRepositoryInterface
{
    /**
     * @return Collection<int, Stock>
     */
    public function search(StockSearchData $filters): Collection
    {
        return Stock::query()
            ->active()
            ->when(
                $filters->q !== null,
                fn (Builder $query): Builder => $query->where(
                    fn (Builder $query): Builder => $query
                        ->where('symbol', 'like', "%{$filters->q}%")
                        ->orWhere('name', 'like', "%{$filters->q}%")
                )
            )
            ->when(
                $filters->market !== null,
                fn (Builder $query): Builder => $query->where('market', $filters->market)
            )
            ->orderBy('market')
            ->orderBy('symbol')
            ->get();
    }

    /**
     * @return array<int, string>
     */
    public function findAvailableMarkets(): array
    {
        return Stock::query()
            ->active()
            ->select('market')
            ->distinct()
            ->orderBy('market')
            ->pluck('market')
            ->all();
    }

    public function findActiveById(int $id): ?Stock
    {
        return Stock::query()
            ->active()
            ->find($id);
    }
}
