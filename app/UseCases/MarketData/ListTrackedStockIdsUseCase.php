<?php

declare(strict_types=1);

namespace App\UseCases\MarketData;

use App\Repositories\MarketIngestionRepositoryInterface;

final class ListTrackedStockIdsUseCase
{
    public function __construct(
        private MarketIngestionRepositoryInterface $marketIngestionRepository,
    ) {}

    /**
     * @return array<int, int>
     */
    public function execute(): array
    {
        return $this->marketIngestionRepository->findTrackedStockIds();
    }
}
