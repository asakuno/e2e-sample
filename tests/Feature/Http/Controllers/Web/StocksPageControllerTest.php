<?php

declare(strict_types=1);

namespace Tests\Feature\Http\Controllers\Web;

use App\Enums\AnalysisSentiment;
use App\Models\AnalysisResult;
use App\Models\NewsArticle;
use App\Models\Stock;
use App\Models\StockPrice;
use App\Models\StockSignal;
use App\Models\User;
use App\Models\Watchlist;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Inertia\Testing\AssertableInertia;
use Tests\TestCase;

final class StocksPageControllerTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutVite();
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    public function test_銘柄一覧ページに有効な銘柄が表示される(): void
    {
        // Arrange
        $user = User::factory()->create();
        Stock::factory()->create([
            'symbol' => 'AAPL',
            'name' => 'Apple Inc.',
            'market' => 'us',
            'country' => 'US',
            'currency' => 'USD',
            'is_active' => true,
        ]);
        Stock::factory()->create([
            'symbol' => '7203',
            'name' => 'Toyota Motor Corporation',
            'market' => 'jp',
            'country' => 'JP',
            'currency' => 'JPY',
            'is_active' => true,
        ]);
        Stock::factory()->create([
            'symbol' => 'INACTIVE',
            'market' => 'us',
            'is_active' => false,
        ]);

        // Act
        $response = $this->actingAs($user)->get(route('stocks.index'));

        // Assert
        $response->assertOk();
        $response->assertInertia(fn (AssertableInertia $page) => $page
            ->component('Stocks')
            ->has('stocks.data', 2)
            ->where('filters.q', '')
            ->where('filters.market', '')
            ->has('marketOptions', 2)
        );
    }

    public function test_銘柄コードで検索できる(): void
    {
        // Arrange
        $user = User::factory()->create();
        Stock::factory()->create([
            'symbol' => 'AAPL',
            'name' => 'Apple Inc.',
            'market' => 'us',
            'country' => 'US',
            'currency' => 'USD',
        ]);
        Stock::factory()->create([
            'symbol' => 'MSFT',
            'name' => 'Microsoft Corporation',
            'market' => 'us',
            'country' => 'US',
            'currency' => 'USD',
        ]);

        // Act
        $response = $this->actingAs($user)->get(route('stocks.index', ['q' => 'AAPL']));

        // Assert
        $response->assertOk();
        $response->assertInertia(fn (AssertableInertia $page) => $page
            ->component('Stocks')
            ->has('stocks.data', 1)
            ->where('stocks.data.0.symbol', 'AAPL')
            ->where('filters.q', 'AAPL')
        );
    }

    public function test_市場で絞り込める(): void
    {
        // Arrange
        $user = User::factory()->create();
        Stock::factory()->create([
            'symbol' => 'AAPL',
            'market' => 'us',
            'country' => 'US',
            'currency' => 'USD',
        ]);
        Stock::factory()->create([
            'symbol' => '7203',
            'name' => 'Toyota Motor Corporation',
            'market' => 'jp',
            'country' => 'JP',
            'currency' => 'JPY',
        ]);

        // Act
        $response = $this->actingAs($user)->get(route('stocks.index', ['market' => 'jp']));

        // Assert
        $response->assertOk();
        $response->assertInertia(fn (AssertableInertia $page) => $page
            ->component('Stocks')
            ->has('stocks.data', 1)
            ->where('stocks.data.0.symbol', '7203')
            ->where('filters.market', 'jp')
        );
    }

    public function test_銘柄一覧でウォッチリスト登録済み状態が表示される(): void
    {
        // Arrange
        $user = User::factory()->create();
        $otherUser = User::factory()->create();
        $registeredStock = Stock::factory()->create([
            'symbol' => 'AAPL',
            'market' => 'us',
            'country' => 'US',
            'currency' => 'USD',
        ]);
        $unregisteredStock = Stock::factory()->create([
            'symbol' => 'MSFT',
            'market' => 'us',
            'country' => 'US',
            'currency' => 'USD',
        ]);
        Watchlist::factory()->for($user)->for($registeredStock)->create(['is_active' => true]);
        Watchlist::factory()->for($user)->for($unregisteredStock)->create(['is_active' => false]);
        Watchlist::factory()->for($otherUser)->for($unregisteredStock)->create(['is_active' => true]);

        // Act
        $response = $this->actingAs($user)->get(route('stocks.index'));

        // Assert
        $response->assertOk();
        $response->assertInertia(fn (AssertableInertia $page) => $page
            ->component('Stocks')
            ->has('stocks.data', 2)
            ->where('stocks.data.0.symbol', 'AAPL')
            ->where('stocks.data.0.is_in_watchlist', true)
            ->where('stocks.data.1.symbol', 'MSFT')
            ->where('stocks.data.1.is_in_watchlist', false)
        );
    }

    public function test_銘柄詳細ページに進める(): void
    {
        // Arrange
        $user = User::factory()->create();
        $stock = Stock::factory()->create([
            'symbol' => 'NVDA',
            'name' => 'NVIDIA Corporation',
            'market' => 'us',
            'country' => 'US',
            'currency' => 'USD',
        ]);

        // Act
        $response = $this->actingAs($user)->get(route('stocks.show', $stock->id));

        // Assert
        $response->assertOk();
        $response->assertInertia(fn (AssertableInertia $page) => $page
            ->component('StockDetail')
            ->where('stock.id', $stock->id)
            ->where('stock.symbol', 'NVDA')
            ->where('stock.name', 'NVIDIA Corporation')
        );
    }

    public function test_銘柄詳細ページに認証ユーザーのアクティブなウォッチリスト情報が表示される(): void
    {
        // Arrange
        $user = User::factory()->create();
        $stock = Stock::factory()->create(['symbol' => 'NVDA']);
        $watchlist = Watchlist::factory()->for($user)->for($stock)->create([
            'memo' => '決算発表後に再評価する',
            'priority' => 3,
            'is_active' => true,
        ]);

        // Act
        $response = $this->actingAs($user)->get(route('stocks.show', $stock->id));

        // Assert
        $response->assertOk();
        $response->assertInertia(fn (AssertableInertia $page) => $page
            ->where('stock.watchlist.id', $watchlist->id)
            ->where('stock.watchlist.memo', '決算発表後に再評価する')
            ->where('stock.watchlist.priority', 3)
        );
    }

    public function test_銘柄詳細ページは停止中または他ユーザーのウォッチリスト情報を返さない(): void
    {
        // Arrange
        $user = User::factory()->create();
        $otherUser = User::factory()->create();
        $inactiveStock = Stock::factory()->create(['symbol' => 'MSFT']);
        $otherUsersStock = Stock::factory()->create(['symbol' => 'TSLA']);
        Watchlist::factory()->for($user)->for($inactiveStock)->create([
            'memo' => '停止中メモ',
            'is_active' => false,
        ]);
        Watchlist::factory()->for($otherUser)->for($otherUsersStock)->create([
            'memo' => '他ユーザーのメモ',
            'is_active' => true,
        ]);

        // Act
        $inactiveResponse = $this->actingAs($user)->get(route('stocks.show', $inactiveStock->id));
        $otherUsersResponse = $this->actingAs($user)->get(route('stocks.show', $otherUsersStock->id));

        // Assert
        $inactiveResponse->assertOk();
        $inactiveResponse->assertInertia(fn (AssertableInertia $page) => $page
            ->where('stock.watchlist', null)
        );
        $otherUsersResponse->assertOk();
        $otherUsersResponse->assertInertia(fn (AssertableInertia $page) => $page
            ->where('stock.watchlist', null)
        );
    }

    public function test_銘柄詳細ページで最新価格と指定期間の価格履歴を表示できる(): void
    {
        // Arrange
        Carbon::setTestNow('2026-05-31 12:00:00');
        $user = User::factory()->create();
        $stock = Stock::factory()->create([
            'symbol' => 'AAPL',
            'name' => 'Apple Inc.',
            'market' => 'us',
            'country' => 'US',
            'currency' => 'USD',
        ]);

        StockPrice::factory()->for($stock)->create([
            'price_date' => '2025-12-31',
            'close' => 150.00,
            'volume' => 10_000,
        ]);
        StockPrice::factory()->for($stock)->create([
            'price_date' => '2026-03-01',
            'open' => 160.00,
            'high' => 166.00,
            'low' => 158.00,
            'close' => 165.00,
            'volume' => 20_000,
        ]);
        StockPrice::factory()->for($stock)->create([
            'price_date' => '2026-05-30',
            'open' => 180.00,
            'high' => 185.00,
            'low' => 178.00,
            'close' => 182.50,
            'volume' => 30_000,
        ]);

        // Act
        $response = $this->actingAs($user)->get(route('stocks.show', [
            'stock' => $stock->id,
            'period' => '3M',
        ]));

        // Assert
        $response->assertOk();
        $response->assertInertia(fn (AssertableInertia $page) => $page
            ->component('StockDetail')
            ->where('stock.id', $stock->id)
            ->where('stock.selected_period', '3M')
            ->where('stock.latest_price.price_date', '2026-05-30')
            ->where('stock.latest_price.close', 182.5)
            ->where('stock.latest_price.volume', 30_000)
            ->has('stock.price_history', 2)
            ->where('stock.price_history.0.price_date', '2026-03-01')
            ->where('stock.price_history.1.price_date', '2026-05-30')
            ->has('stock.period_options', 4)
        );
    }

    public function test_銘柄詳細ページで関連ニュースと分析結果とシグナルを表示できる(): void
    {
        // Arrange
        $user = User::factory()->create();
        $stock = Stock::factory()->create([
            'symbol' => 'AAPL',
            'name' => 'Apple Inc.',
            'market' => 'us',
            'country' => 'US',
            'currency' => 'USD',
        ]);
        $article = NewsArticle::factory()->create([
            'title' => 'Apple supplier raises guidance',
            'summary' => 'Supplier demand indicates stronger iPhone sales.',
            'source' => 'Reuters',
            'provider' => 'rss',
            'published_at' => '2026-06-15 10:00:00',
        ]);
        $article->stocks()->attach($stock->id, [
            'relevance_score' => 91,
            'matched_by' => 'symbol',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        AnalysisResult::factory()->for($stock)->create([
            'analysable_type' => NewsArticle::class,
            'analysable_id' => $article->id,
            'summary' => '需要回復にポジティブ',
            'sentiment' => AnalysisSentiment::Positive->value,
            'impact_score' => 8,
            'confidence_score' => 92,
            'analyzed_at' => '2026-06-15 11:00:00',
        ]);
        StockSignal::factory()->for($stock)->create([
            'signal_date' => '2026-06-15',
            'news_score' => 6.5,
            'disclosure_score' => 1.0,
            'macro_score' => -0.5,
            'total_score' => 7.0,
            'positive_count' => 3,
            'negative_count' => 1,
            'neutral_count' => 2,
            'reason' => 'ニュースと分析結果が上向きです。',
            'generated_at' => '2026-06-15 12:00:00',
        ]);

        // Act
        $response = $this->actingAs($user)->get(route('stocks.show', $stock->id));

        // Assert
        $response->assertOk();
        $response->assertInertia(fn (AssertableInertia $page) => $page
            ->component('StockDetail')
            ->where('stock.related_news.0.title', 'Apple supplier raises guidance')
            ->where('stock.related_news.0.stocks.0.symbol', 'AAPL')
            ->where('stock.analyses.0.summary', '需要回復にポジティブ')
            ->where('stock.analyses.0.sentiment_label', 'ポジティブ')
            ->where('stock.signals.0.signal_date', '2026-06-15')
            ->where('stock.signals.0.total_score', 7)
            ->where('stock.signals.0.reason', 'ニュースと分析結果が上向きです。')
        );
    }

    public function test_銘柄一覧は25件単位でページネーションされる(): void
    {
        // Arrange
        $user = User::factory()->create();
        Stock::factory()->count(26)->create();

        // Act
        $response = $this->actingAs($user)->get(route('stocks.index', ['page' => 2]));

        // Assert
        $response->assertInertia(fn (AssertableInertia $page) => $page
            ->has('stocks.data', 1)
            ->where('stocks.meta.current_page', 2)
            ->where('stocks.meta.per_page', 25)
            ->where('stocks.meta.total', 26)
            ->where('stocks.links.next', null)
        );
    }
}
