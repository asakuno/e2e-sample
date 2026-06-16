<?php

declare(strict_types=1);

namespace App\UseCases\Stock;

use App\Data\Stock\StockListItemData;
use App\Data\Stock\StockSearchData;
use App\Repositories\StockRepositoryInterface;
use App\Repositories\WatchlistRepositoryInterface;

final class ListStocksUseCase
{
    public function __construct(
        private StockRepositoryInterface $stockRepository,
        private WatchlistRepositoryInterface $watchlistRepository,
    ) {}

    /**
     * @return array<int, StockListItemData>
     */
    public function execute(StockSearchData $filters, int $userId): array
    {
        $watchlistStockIds = array_flip($this->watchlistRepository->findActiveStockIdsByUser($userId));

        return $this->stockRepository
            ->search($filters)
            ->map(fn ($stock): StockListItemData => StockListItemData::fromModel(
                stock: $stock,
                isInWatchlist: isset($watchlistStockIds[$stock->id]),
            ))
            ->all();
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
