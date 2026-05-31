<?php

declare(strict_types=1);

namespace Tests\Feature\Models;

use App\Enums\AnalysisSentiment;
use App\Models\Alert;
use App\Models\AlertLog;
use App\Models\AnalysisResult;
use App\Models\NewsArticle;
use App\Models\Stock;
use App\Models\StockPrice;
use App\Models\StockSignal;
use App\Models\User;
use App\Models\Watchlist;
use Database\Seeders\MajorStockSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

final class StockAnalysisModelRelationshipTest extends TestCase
{
    use RefreshDatabase;

    #[Test]
    public function ユーザーからウォッチリストと監視銘柄へアクセスできる(): void
    {
        // Arrange
        $user = User::factory()->create();
        $stock = Stock::factory()->create();
        $watchlist = Watchlist::factory()
            ->for($user)
            ->for($stock)
            ->create([
                'priority' => 3,
                'memo' => '重要銘柄',
            ]);

        // Act
        $watchedStock = $user->watchedStocks()->first();

        // Assert
        $this->assertTrue($user->watchlists()->whereKey($watchlist)->exists());
        $this->assertSame($stock->id, $watchedStock?->id);
        $this->assertSame(3, $watchedStock?->pivot->priority);
        $this->assertSame('重要銘柄', $watchedStock?->pivot->memo);
    }

    #[Test]
    public function 銘柄から価格ニュース分析結果シグナルへアクセスできる(): void
    {
        // Arrange
        $stock = Stock::factory()->create();
        $price = StockPrice::factory()->for($stock)->create();
        $article = NewsArticle::factory()->create();
        $stock->newsArticles()->attach($article->id, [
            'relevance_score' => 90,
            'matched_by' => 'keyword',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $analysisResult = AnalysisResult::factory()
            ->for($stock)
            ->create([
                'analysable_type' => NewsArticle::class,
                'analysable_id' => $article->id,
                'sentiment' => AnalysisSentiment::Positive->value,
            ]);
        $signal = StockSignal::factory()->for($stock)->create();

        // Act
        $newsArticle = $stock->newsArticles()->first();

        // Assert
        $this->assertTrue($stock->prices()->whereKey($price)->exists());
        $this->assertSame($article->id, $newsArticle?->id);
        $this->assertSame(90, $newsArticle?->pivot->relevance_score);
        $this->assertTrue($stock->analysisResults()->whereKey($analysisResult)->exists());
        $this->assertTrue($stock->signals()->whereKey($signal)->exists());
        $this->assertSame(AnalysisSentiment::Positive, $analysisResult->fresh()?->sentiment);
    }

    #[Test]
    public function ニュース記事からポリモーフィック分析結果へアクセスできる(): void
    {
        // Arrange
        $stock = Stock::factory()->create();
        $article = NewsArticle::factory()->create();
        $analysisResult = AnalysisResult::factory()
            ->for($stock)
            ->create([
                'analysable_type' => NewsArticle::class,
                'analysable_id' => $article->id,
            ]);

        // Act
        $resolved = $article->analysisResults()->first();

        // Assert
        $this->assertSame($analysisResult->id, $resolved?->id);
        $this->assertTrue($analysisResult->analysable->is($article));
    }

    #[Test]
    public function ユーザーからアラートとアラートログへアクセスできる(): void
    {
        // Arrange
        $user = User::factory()->create();
        $stock = Stock::factory()->create();
        $alert = Alert::factory()
            ->for($user)
            ->for($stock)
            ->create();
        $alertLog = AlertLog::factory()
            ->for($alert)
            ->for($user)
            ->for($stock)
            ->create();

        // Assert
        $this->assertTrue($user->alerts()->whereKey($alert)->exists());
        $this->assertTrue($user->alertLogs()->whereKey($alertLog)->exists());
        $this->assertTrue($alert->logs()->whereKey($alertLog)->exists());
        $this->assertTrue($stock->alerts()->whereKey($alert)->exists());
    }

    #[Test]
    public function 主要銘柄_seederで米国株と日本株が登録される(): void
    {
        // Act
        $this->seed(MajorStockSeeder::class);

        // Assert
        $this->assertDatabaseHas('stocks', [
            'market' => 'us',
            'symbol' => 'AAPL',
        ]);
        $this->assertDatabaseHas('stocks', [
            'market' => 'jp',
            'symbol' => '7203',
        ]);
        $this->assertSame(10, Stock::query()->count());
    }
}
