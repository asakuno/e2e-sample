<?php

declare(strict_types=1);

namespace App\UseCases\Stock;

use App\Data\Stock\StockListItemData;
use App\Data\Stock\StockSearchData;
use App\Repositories\StockRepositoryInterface;
use App\Repositories\WatchlistRepositoryInterface;
use Illuminate\Pagination\LengthAwarePaginator;

final class ListStocksUseCase
{
    public function __construct(
        private StockRepositoryInterface $stockRepository,
        private WatchlistRepositoryInterface $watchlistRepository,
    ) {}

    /**
     * @return LengthAwarePaginator<int, StockListItemData>
     */
    public function execute(StockSearchData $filters, int $userId): LengthAwarePaginator
    {
        $stocks = $this->stockRepository->search($filters);
        $stockIds = $stocks->getCollection()->pluck('id')->all();
        $watchlistStockIds = array_flip(
            $this->watchlistRepository->findActiveStockIdsByUser($userId, $stockIds),
        );

        return $stocks->through(fn ($stock): StockListItemData => StockListItemData::fromModel(
            stock: $stock,
            isInWatchlist: isset($watchlistStockIds[$stock->id]),
        ));
    }

    /**
     * @return array<int, array{value: string, label: string}>
     */
    public function marketOptions(): array
    {
        return array_map(
            fn (string $market): array => [
                'value' => $market,
                'label' => $this->marketLabel($market),
            ],
            $this->stockRepository->findAvailableMarkets(),
        );
    }

    private function marketLabel(string $market): string
    {
        return match ($market) {
            'us' => '米国株',
            'jp' => '日本株',
            default => strtoupper($market),
        };
    }
}
