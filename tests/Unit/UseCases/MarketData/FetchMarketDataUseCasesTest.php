<?php

declare(strict_types=1);

namespace Tests\Unit\UseCases\MarketData;

use App\Data\MarketData\NewsArticleData;
use App\Data\MarketData\StockPriceData;
use App\Models\Stock;
use App\Repositories\MarketIngestionRepositoryInterface;
use App\Services\MarketData\Contracts\NewsProviderInterface;
use App\Services\MarketData\Contracts\StockPriceProviderInterface;
use App\UseCases\MarketData\FetchDailyStockPriceUseCase;
use App\UseCases\MarketData\FetchStockNewsUseCase;
use Carbon\CarbonImmutable;
use Illuminate\Support\Collection;
use PHPUnit\Framework\Attributes\Test;
use PHPUnit\Framework\TestCase;
use RuntimeException;

final class FetchMarketDataUseCasesTest extends TestCase
{
    #[Test]
    public function 取得した日足株価をすべてrepositoryへ保存する(): void
    {
        // Arrange
        $stock = $this->stock();
        $price = $this->priceData($stock->symbol);
        $repository = $this->createMock(MarketIngestionRepositoryInterface::class);
        $repository->expects($this->once())->method('findActiveStockById')->with(1)->willReturn($stock);
        $repository->expects($this->once())->method('upsertStockPrice')->with(1, $price);
        $provider = $this->createMock(StockPriceProviderInterface::class);
        $provider->expects($this->once())->method('fetchDailyPrices')->with($stock)->willReturn(new Collection([$price]));
        $useCase = new FetchDailyStockPriceUseCase($repository, $provider);

        // Act
        $count = $useCase->execute(1);

        // Assert
        $this->assertSame(1, $count);
    }

    #[Test]
    public function 存在しない銘柄の株価取得は失敗する(): void
    {
        // Arrange
        $repository = $this->createMock(MarketIngestionRepositoryInterface::class);
        $repository->expects($this->once())->method('findActiveStockById')->with(999)->willReturn(null);
        $provider = $this->createMock(StockPriceProviderInterface::class);
        $provider->expects($this->never())->method('fetchDailyPrices');
        $useCase = new FetchDailyStockPriceUseCase($repository, $provider);

        // Assert
        $this->expectException(RuntimeException::class);

        // Act
        $useCase->execute(999);
    }

    #[Test]
    public function 取得したニュースをすべてrepositoryへ保存する(): void
    {
        // Arrange
        $stock = $this->stock();
        $article = $this->newsData($stock->symbol);
        $repository = $this->createMock(MarketIngestionRepositoryInterface::class);
        $repository->expects($this->once())->method('findActiveStockById')->with(1)->willReturn($stock);
        $repository->expects($this->once())->method('upsertNewsArticle')->with(1, $article);
        $provider = $this->createMock(NewsProviderInterface::class);
        $provider->expects($this->once())->method('fetchNewsForStock')->with($stock)->willReturn(new Collection([$article]));
        $useCase = new FetchStockNewsUseCase($repository, $provider);

        // Act
        $count = $useCase->execute(1);

        // Assert
        $this->assertSame(1, $count);
    }

    private function stock(): Stock
    {
        $stock = new Stock([
            'symbol' => 'AAPL',
            'name' => 'Apple Inc.',
            'market' => 'US',
            'country' => 'US',
            'currency' => 'USD',
            'is_active' => true,
        ]);
        $stock->id = 1;

        return $stock;
    }

    private function priceData(string $symbol): StockPriceData
    {
        return new StockPriceData(
            symbol: $symbol,
            priceDate: CarbonImmutable::parse('2026-07-10'),
            open: 100,
            high: 105,
            low: 99,
            close: 104,
            adjustedClose: 104,
            volume: 1000,
            source: 'alpha_vantage',
            fetchedAt: CarbonImmutable::parse('2026-07-11'),
        );
    }

    private function newsData(string $symbol): NewsArticleData
    {
        $url = 'https://example.com/article';

        return new NewsArticleData(
            symbol: $symbol,
            title: 'News',
            summary: 'Summary',
            body: null,
            url: $url,
            source: 'Example',
            provider: 'alpha_vantage',
            language: 'en',
            publishedAt: CarbonImmutable::parse('2026-07-10'),
            contentHash: hash('sha256', $url),
            relevanceScore: 80,
            matchedBy: 'provider',
            rawPayload: [],
        );
    }
}
