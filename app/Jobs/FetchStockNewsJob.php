<?php

declare(strict_types=1);

namespace App\Jobs;

use App\UseCases\MarketData\FetchStockNewsUseCase;
use Illuminate\Contracts\Queue\ShouldBeUnique;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Queue\Middleware\RateLimited;
use Illuminate\Support\Facades\Log;
use Throwable;

final class FetchStockNewsJob implements ShouldBeUnique, ShouldQueue
{
    use Queueable;

    public int $tries = 10;

    public int $timeout = 120;

    public int $uniqueFor = 90000;

    /** @var array<int, int> */
    public array $backoff = [60, 300];

    public function __construct(
        public readonly int $stockId,
    ) {
        $this->onQueue('market-data');
    }

    /**
     * @return array<int, RateLimited>
     */
    public function middleware(): array
    {
        return [new RateLimited('alpha-vantage')];
    }

    public function uniqueId(): string
    {
        return (string) $this->stockId;
    }

    public function handle(FetchStockNewsUseCase $useCase): void
    {
        $useCase->execute($this->stockId);
    }

    public function failed(?Throwable $exception): void
    {
        Log::error('Stock news fetch failed.', [
            'stock_id' => $this->stockId,
            'exception' => $exception?->getMessage(),
        ]);
    }
}
