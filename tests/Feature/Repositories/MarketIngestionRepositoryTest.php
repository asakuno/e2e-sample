<?php

declare(strict_types=1);

namespace Tests\Feature\Repositories;

use App\Data\MarketData\NewsArticleData;
use App\Data\MarketData\StockPriceData;
use App\Enums\MarketDataProvider;
use App\Models\Stock;
use App\Models\StockProviderSymbol;
use App\Models\User;
use App\Models\Watchlist;
use App\Repositories\MarketIngestionRepositoryInterface;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

final class MarketIngestionRepositoryTest extends TestCase
{
    use RefreshDatabase;

    private MarketIngestionRepositoryInterface $repository;

    protected function setUp(): void
    {
        parent::setUp();
        $this->repository = app(MarketIngestionRepositoryInterface::class);
    }

    #[Test]
    public function 有効なウォッチリスト銘柄_i_dを重複なく取得できる(): void
    {
        // Arrange
        $user = User::factory()->create();
        $tracked = Stock::factory()->create(['is_active' => true]);
        $unmappedStock = Stock::factory()->create(['is_active' => true]);
        $inactiveStock = Stock::factory()->create(['is_active' => false]);
        $inactiveWatchlistStock = Stock::factory()->create(['is_active' => true]);
        StockProviderSymbol::factory()->for($tracked)->create([
            'provider' => MarketDataProvider::AlphaVantage,
            'provider_symbol' => 'TRACKED',
        ]);
        Watchlist::factory()->create(['user_id' => $user->id, 'stock_id' => $tracked->id]);
        Watchlist::factory()->create(['stock_id' => $tracked->id]);
        Watchlist::factory()->create(['user_id' => $user->id, 'stock_id' => $unmappedStock->id]);
        Watchlist::factory()->create(['user_id' => $user->id, 'stock_id' => $inactiveStock->id]);
        Watchlist::factory()->create([
            'user_id' => $user->id,
            'stock_id' => $inactiveWatchlistStock->id,
            'is_active' => false,
        ]);

        // Act
        $stockIds = $this->repository->findTrackedStockIds(MarketDataProvider::AlphaVantage);

        // Assert
        $this->assertSame([$tracked->id], $stockIds);
    }

    #[Test]
    public function 同じ内部symbolでも市場別の明示provider_symbolを区別できる(): void
    {
        // Arrange
        $user = User::factory()->create();
        $usStock = Stock::factory()->create(['market' => 'us', 'symbol' => 'SAME']);
        $jpStock = Stock::factory()->create(['market' => 'jp', 'symbol' => 'SAME']);
        StockProviderSymbol::factory()->for($usStock)->create([
            'provider' => MarketDataProvider::AlphaVantage,
            'provider_symbol' => 'SAME-US',
        ]);
        StockProviderSymbol::factory()->for($jpStock)->create([
            'provider' => MarketDataProvider::AlphaVantage,
            'provider_symbol' => 'SAME-JP',
        ]);
        Watchlist::factory()->for($user)->for($usStock)->create();
        Watchlist::factory()->for($user)->for($jpStock)->create();

        // Act
        $stockIds = $this->repository->findTrackedStockIds(MarketDataProvider::AlphaVantage);
        $usProviderSymbol = $this->repository->findProviderSymbolForActiveStock(
            $usStock->id,
            MarketDataProvider::AlphaVantage,
        );
        $jpProviderSymbol = $this->repository->findProviderSymbolForActiveStock(
            $jpStock->id,
            MarketDataProvider::AlphaVantage,
        );

        // Assert
        $this->assertSame([$usStock->id, $jpStock->id], $stockIds);
        $this->assertSame('SAME-US', $usProviderSymbol);
        $this->assertSame('SAME-JP', $jpProviderSymbol);
    }

    #[Test]
    public function 空白だけのprovider_symbolは取得対象にしない(): void
    {
        // Arrange
        $user = User::factory()->create();
        $stock = Stock::factory()->create(['is_active' => true]);
        StockProviderSymbol::factory()->for($stock)->create([
            'provider' => MarketDataProvider::AlphaVantage,
            'provider_symbol' => '   ',
        ]);
        Watchlist::factory()->for($user)->for($stock)->create();

        // Act
        $stockIds = $this->repository->findTrackedStockIds(MarketDataProvider::AlphaVantage);
        $providerSymbol = $this->repository->findProviderSymbolForActiveStock(
            $stock->id,
            MarketDataProvider::AlphaVantage,
        );

        // Assert
        $this->assertSame([], $stockIds);
        $this->assertNull($providerSymbol);
    }

    #[Test]
    public function 同一日同一providerの株価を冪等に更新できる(): void
    {
        // Arrange
        $stock = Stock::factory()->create();
        $priceDate = CarbonImmutable::parse('2026-07-10', 'UTC');
        $first = $this->stockPriceData($stock->symbol, $priceDate, 100.0);
        $second = $this->stockPriceData($stock->symbol, $priceDate, 105.0);

        // Act
        $this->repository->upsertStockPrice($stock->id, $first);
        $saved = $this->repository->upsertStockPrice($stock->id, $second);

        // Assert
        $this->assertDatabaseCount('stock_prices', 1);
        $this->assertSame('105.000000', $saved->close);
    }

    #[Test]
    public function 同一_ur_lの記事を冪等に保存して銘柄へ紐付けられる(): void
    {
        // Arrange
        $stock = Stock::factory()->create();
        $article = $this->newsArticleData($stock->symbol, 72);
        $updated = $this->newsArticleData($stock->symbol, 91);

        // Act
        $this->repository->upsertNewsArticle($stock->id, $article);
        $saved = $this->repository->upsertNewsArticle($stock->id, $updated);

        // Assert
        $this->assertDatabaseCount('news_articles', 1);
        $this->assertDatabaseCount('stock_news', 1);
        $this->assertSame(91, $saved->stocks->first()?->pivot->relevance_score);
    }

    private function stockPriceData(
        string $symbol,
        CarbonImmutable $priceDate,
        float $close,
    ): StockPriceData {
        return new StockPriceData(
            symbol: $symbol,
            priceDate: $priceDate,
            open: 99.0,
            high: 106.0,
            low: 98.0,
            close: $close,
            adjustedClose: $close,
            volume: 1000,
            source: 'alpha_vantage',
            fetchedAt: CarbonImmutable::parse('2026-07-11 00:00:00', 'UTC'),
        );
    }

    private function newsArticleData(string $symbol, int $relevanceScore): NewsArticleData
    {
        $url = 'https://example.com/articles/market-update';

        return new NewsArticleData(
            symbol: $symbol,
            title: 'Market update',
            summary: 'Summary',
            body: null,
            url: $url,
            source: 'Example News',
            provider: 'alpha_vantage',
            language: 'en',
            publishedAt: CarbonImmutable::parse('2026-07-10 12:00:00', 'UTC'),
            contentHash: hash('sha256', $url),
            relevanceScore: $relevanceScore,
            matchedBy: 'provider',
            rawPayload: ['url' => $url],
        );
    }
}
