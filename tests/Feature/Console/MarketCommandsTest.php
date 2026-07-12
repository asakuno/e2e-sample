<?php

declare(strict_types=1);

namespace Tests\Feature\Console;

use App\Enums\MarketDataProvider;
use App\Jobs\AnalyzeNewsArticleJob;
use App\Jobs\FetchDailyStockPriceJob;
use App\Jobs\FetchStockNewsJob;
use App\Jobs\GenerateStockSignalJob;
use App\Models\NewsArticle;
use App\Models\Stock;
use App\Models\StockProviderSymbol;
use App\Models\User;
use App\Models\Watchlist;
use Database\Seeders\MajorStockSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

final class MarketCommandsTest extends TestCase
{
    use RefreshDatabase;

    #[Test]
    public function 株価取得commandは有効な監視銘柄ごとにjobを登録する(): void
    {
        // Arrange
        Queue::fake();
        [$tracked] = $this->createTrackedStocks();

        // Act
        $this->artisan('market:fetch-prices')->assertSuccessful();

        // Assert
        Queue::assertPushed(
            FetchDailyStockPriceJob::class,
            fn (FetchDailyStockPriceJob $job): bool => $job->stockId === $tracked->id,
        );
        Queue::assertPushed(FetchDailyStockPriceJob::class, 1);
    }

    #[Test]
    public function ニュース取得commandは有効な監視銘柄ごとにjobを登録する(): void
    {
        // Arrange
        Queue::fake();
        [$tracked] = $this->createTrackedStocks();

        // Act
        $this->artisan('market:fetch-news')->assertSuccessful();

        // Assert
        Queue::assertPushed(
            FetchStockNewsJob::class,
            fn (FetchStockNewsJob $job): bool => $job->stockId === $tracked->id,
        );
        Queue::assertPushed(FetchStockNewsJob::class, 1);
    }

    #[Test]
    public function alpha_vantage未対応の日本株は取込jobへ登録しない(): void
    {
        // Arrange
        Queue::fake();
        $this->seed(MajorStockSeeder::class);
        $user = User::factory()->create();
        $usStock = Stock::query()->where('market', 'us')->where('symbol', 'AAPL')->firstOrFail();
        $jpStock = Stock::query()->where('market', 'jp')->where('symbol', '7203')->firstOrFail();
        Watchlist::factory()->for($user)->for($usStock)->create();
        Watchlist::factory()->for($user)->for($jpStock)->create();

        // Act
        $this->artisan('market:fetch-prices')->assertSuccessful();
        $this->artisan('market:fetch-news')->assertSuccessful();

        // Assert
        Queue::assertPushed(
            FetchDailyStockPriceJob::class,
            fn (FetchDailyStockPriceJob $job): bool => $job->stockId === $usStock->id,
        );
        Queue::assertNotPushed(
            FetchDailyStockPriceJob::class,
            fn (FetchDailyStockPriceJob $job): bool => $job->stockId === $jpStock->id,
        );
        Queue::assertPushed(
            FetchStockNewsJob::class,
            fn (FetchStockNewsJob $job): bool => $job->stockId === $usStock->id,
        );
        Queue::assertNotPushed(
            FetchStockNewsJob::class,
            fn (FetchStockNewsJob $job): bool => $job->stockId === $jpStock->id,
        );
    }

    #[Test]
    public function a_i分析commandは未分析の記事と銘柄の組み合わせごとにjobを登録する(): void
    {
        // Arrange
        Queue::fake();
        [$tracked] = $this->createTrackedStocks();
        $article = NewsArticle::factory()->create();
        $article->stocks()->attach($tracked->id);

        // Act
        $this->artisan('market:analyze-news', ['--limit' => 10])->assertSuccessful();

        // Assert
        Queue::assertPushed(
            AnalyzeNewsArticleJob::class,
            fn (AnalyzeNewsArticleJob $job): bool => $job->newsArticleId === $article->id
                && $job->stockId === $tracked->id,
        );
        Queue::assertPushed(AnalyzeNewsArticleJob::class, 1);
    }

    #[Test]
    public function シグナル生成commandは有効な監視銘柄ごとにjobを登録する(): void
    {
        // Arrange
        Queue::fake();
        [$tracked] = $this->createTrackedStocks();

        // Act
        $this->artisan('market:generate-signals')->assertSuccessful();

        // Assert
        Queue::assertPushed(
            GenerateStockSignalJob::class,
            fn (GenerateStockSignalJob $job): bool => $job->stockId === $tracked->id,
        );
        Queue::assertPushed(GenerateStockSignalJob::class, 1);
    }

    /**
     * @return array{Stock, Stock}
     */
    private function createTrackedStocks(): array
    {
        $user = User::factory()->create();
        $tracked = Stock::factory()->create(['is_active' => true]);
        $ignored = Stock::factory()->create(['is_active' => true]);
        StockProviderSymbol::factory()->for($tracked)->create([
            'provider' => MarketDataProvider::AlphaVantage,
            'provider_symbol' => 'TRACKED',
        ]);
        Watchlist::factory()->create(['user_id' => $user->id, 'stock_id' => $tracked->id]);
        Watchlist::factory()->create([
            'user_id' => $user->id,
            'stock_id' => $ignored->id,
            'is_active' => false,
        ]);

        return [$tracked, $ignored];
    }
}
