<?php

declare(strict_types=1);

namespace App\UseCases\Signal;

use App\Repositories\SignalGenerationRepositoryInterface;

final class ListSignalStockIdsUseCase
{
    public function __construct(
        private SignalGenerationRepositoryInterface $signalGenerationRepository,
    ) {}

    /**
     * @return array<int, int>
     */
    public function execute(): array
    {
        return $this->signalGenerationRepository->findTrackedStockIds();
    }
}
