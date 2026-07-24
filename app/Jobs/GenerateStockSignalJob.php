<?php

declare(strict_types=1);

namespace App\Jobs;

use App\UseCases\Signal\GenerateStockSignalUseCase;
use Illuminate\Contracts\Queue\ShouldBeUnique;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;
use Throwable;

final class GenerateStockSignalJob implements ShouldBeUnique, ShouldQueue
{
    use Queueable;

    public int $tries = 3;

    public int $timeout = 120;

    public int $uniqueFor = 1800;

    /** @var array<int, int> */
    public array $backoff = [60, 300];

    public function __construct(
        public readonly int $stockId,
    ) {
        $this->onQueue('signals');
    }

    public function uniqueId(): string
    {
        return (string) $this->stockId;
    }

    public function handle(GenerateStockSignalUseCase $useCase): void
    {
        $useCase->execute($this->stockId);
    }

    public function failed(?Throwable $exception): void
    {
        Log::error('Stock signal generation failed.', [
            'stock_id' => $this->stockId,
            'exception' => $exception?->getMessage(),
        ]);
    }
}
