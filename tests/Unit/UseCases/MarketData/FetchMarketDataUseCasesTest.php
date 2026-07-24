<?php

declare(strict_types=1);

namespace Tests\Unit\UseCases\MarketData;

use App\Data\MarketData\NewsArticleData;
use App\Data\MarketData\StockPriceData;
use App\Enums\MarketDataProvider;
use App\Repositories\MarketIngestionRepositoryInterface;
use App\Services\MarketData\Contracts\NewsProviderInterface;
use App\Services\MarketData\Contracts\StockPriceProviderInterface;
use App\UseCases\MarketData\FetchDailyStockPriceUseCase;
use App\UseCases\MarketData\FetchStockNewsUseCase;
use Carbon\CarbonImmutable;
use Illuminate\Support\Collection;
use PHPUnit\Framework\Attributes\Test;
use PHPUnit\Framework\TestCase;

final class FetchMarketDataUseCasesTest extends TestCase
{
    #[Test]
    public function 取得した日足株価をすべてrepositoryへ保存する(): void
    {
        // Arrange
        $price = $this->priceData('AAPL');
        $repository = $this->createMock(MarketIngestionRepositoryInterface::class);
        $repository->expects($this->once())
            ->method('findProviderSymbolForActiveStock')
            ->with(1, MarketDataProvider::AlphaVantage)
            ->willReturn('AAPL');
        $repository->expects($this->once())->method('upsertStockPrice')->with(1, $price);
        $provider = $this->createMock(StockPriceProviderInterface::class);
        $provider->expects($this->once())
            ->method('provider')
            ->willReturn(MarketDataProvider::AlphaVantage);
        $provider->expects($this->once())
            ->method('fetchDailyPrices')
            ->with('AAPL')
            ->willReturn(new Collection([$price]));
        $useCase = new FetchDailyStockPriceUseCase($repository, $provider);

        // Act
        $count = $useCase->execute(1);

        // Assert
        $this->assertSame(1, $count);
    }

    #[Test]
    public function provider_symbol未登録銘柄の株価取得はapiを呼ばず正常終了する(): void
    {
        // Arrange
        $repository = $this->createMock(MarketIngestionRepositoryInterface::class);
        $repository->expects($this->once())
            ->method('findProviderSymbolForActiveStock')
            ->with(999, MarketDataProvider::AlphaVantage)
            ->willReturn(null);
        $repository->expects($this->never())->method('upsertStockPrice');
        $provider = $this->createMock(StockPriceProviderInterface::class);
        $provider->expects($this->once())
            ->method('provider')
            ->willReturn(MarketDataProvider::AlphaVantage);
        $provider->expects($this->never())->method('fetchDailyPrices');
        $useCase = new FetchDailyStockPriceUseCase($repository, $provider);

        // Act
        $count = $useCase->execute(999);

        // Assert
        $this->assertSame(0, $count);
    }

    #[Test]
    public function 取得したニュースをすべてrepositoryへ保存する(): void
    {
        // Arrange
        $article = $this->newsData('AAPL');
        $repository = $this->createMock(MarketIngestionRepositoryInterface::class);
        $repository->expects($this->once())
            ->method('findProviderSymbolForActiveStock')
            ->with(1, MarketDataProvider::AlphaVantage)
            ->willReturn('AAPL');
        $repository->expects($this->once())->method('upsertNewsArticle')->with(1, $article);
        $provider = $this->createMock(NewsProviderInterface::class);
        $provider->expects($this->once())
            ->method('provider')
            ->willReturn(MarketDataProvider::AlphaVantage);
        $provider->expects($this->once())
            ->method('fetchNewsForStock')
            ->with('AAPL')
            ->willReturn(new Collection([$article]));
        $useCase = new FetchStockNewsUseCase($repository, $provider);

        // Act
        $count = $useCase->execute(1);

        // Assert
        $this->assertSame(1, $count);
    }

    #[Test]
    public function provider_symbol未登録銘柄のニュース取得はapiを呼ばず正常終了する(): void
    {
        // Arrange
        $repository = $this->createMock(MarketIngestionRepositoryInterface::class);
        $repository->expects($this->once())
            ->method('findProviderSymbolForActiveStock')
            ->with(999, MarketDataProvider::AlphaVantage)
            ->willReturn(null);
        $repository->expects($this->never())->method('upsertNewsArticle');
        $provider = $this->createMock(NewsProviderInterface::class);
        $provider->expects($this->once())
            ->method('provider')
            ->willReturn(MarketDataProvider::AlphaVantage);
        $provider->expects($this->never())->method('fetchNewsForStock');
        $useCase = new FetchStockNewsUseCase($repository, $provider);

        // Act
        $count = $useCase->execute(999);

        // Assert
        $this->assertSame(0, $count);
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
