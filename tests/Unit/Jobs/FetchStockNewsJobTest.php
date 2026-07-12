<?php

declare(strict_types=1);

namespace Tests\Unit\Jobs;

use App\Enums\MarketDataProvider;
use App\Jobs\FetchStockNewsJob;
use App\Repositories\MarketIngestionRepositoryInterface;
use App\Services\MarketData\Contracts\NewsProviderInterface;
use App\Services\MarketData\Exceptions\UnusableNewsFeedException;
use App\UseCases\MarketData\FetchStockNewsUseCase;
use PHPUnit\Framework\Attributes\Test;
use RuntimeException;
use Tests\TestCase;

final class FetchStockNewsJobTest extends TestCase
{
    #[Test]
    public function 全件不正なfeedは再試行せずjobを失敗させる(): void
    {
        // Arrange
        $exception = new UnusableNewsFeedException('No valid articles.');
        $useCase = $this->useCaseThrowing($exception);
        $job = (new FetchStockNewsJob(1))->withFakeQueueInteractions();

        // Act
        $job->handle($useCase);

        // Assert
        $job->assertFailedWith($exception);
    }

    #[Test]
    public function 通信系例外はqueueの再試行制御へ委ねる(): void
    {
        // Arrange
        $exception = new RuntimeException('Temporary connection failure.');
        $useCase = $this->useCaseThrowing($exception);
        $job = (new FetchStockNewsJob(1))->withFakeQueueInteractions();

        // Assert
        $this->expectExceptionObject($exception);

        // Act
        try {
            $job->handle($useCase);
        } finally {
            $job->assertNotFailed();
        }
    }

    private function useCaseThrowing(RuntimeException $exception): FetchStockNewsUseCase
    {
        $repository = $this->createMock(MarketIngestionRepositoryInterface::class);
        $repository->expects($this->once())
            ->method('findProviderSymbolForActiveStock')
            ->with(1, MarketDataProvider::AlphaVantage)
            ->willReturn('AAPL');

        $provider = $this->createMock(NewsProviderInterface::class);
        $provider->expects($this->once())
            ->method('provider')
            ->willReturn(MarketDataProvider::AlphaVantage);
        $provider->expects($this->once())
            ->method('fetchNewsForStock')
            ->with('AAPL')
            ->willThrowException($exception);

        return new FetchStockNewsUseCase($repository, $provider);
    }
}
