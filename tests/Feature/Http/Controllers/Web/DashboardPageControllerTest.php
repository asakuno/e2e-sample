<?php

declare(strict_types=1);

namespace Tests\Feature\Http\Controllers\Web;

use App\Enums\AnalysisSentiment;
use App\Models\AnalysisResult;
use App\Models\NewsArticle;
use App\Models\Stock;
use App\Models\StockSignal;
use App\Models\User;
use App\Models\Watchlist;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia;
use Tests\TestCase;

final class DashboardPageControllerTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutVite();
        Carbon::setTestNow('2026-06-16 12:00:00');
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    public function test_ダッシュボードに実データ集計が表示される(): void
    {
        // Arrange
        $user = User::factory()->create();
        $stock = Stock::factory()->create([
            'symbol' => 'AAPL',
            'name' => 'Apple Inc.',
            'market' => 'us',
        ]);
        Watchlist::factory()->for($user)->for($stock)->create([
            'is_active' => true,
            'priority' => 5,
        ]);

        $positiveNews = NewsArticle::factory()->create([
            'title' => 'Apple product news',
            'published_at' => '2026-06-15 10:00:00',
        ]);
        $positiveNews->stocks()->attach($stock->id, [
            'relevance_score' => 95,
            'matched_by' => 'symbol',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        AnalysisResult::factory()->for($stock)->create([
            'analysable_type' => NewsArticle::class,
            'analysable_id' => $positiveNews->id,
            'summary' => '売上成長にポジティブ',
            'sentiment' => AnalysisSentiment::Positive->value,
            'impact_score' => 8,
            'analyzed_at' => '2026-06-15 11:00:00',
        ]);

        $unanalysedNews = NewsArticle::factory()->create([
            'title' => 'Apple pending news',
            'published_at' => '2026-06-16 09:00:00',
        ]);
        $unanalysedNews->stocks()->attach($stock->id, [
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        StockSignal::factory()->for($stock)->create([
            'signal_date' => '2026-06-15',
            'total_score' => 8.25,
            'positive_count' => 3,
            'negative_count' => 1,
            'reason' => 'ポジティブ材料が増加',
            'generated_at' => '2026-06-15 12:00:00',
        ]);

        // Act
        $response = $this->actingAs($user)->get(route('dashboard'));

        // Assert
        $response->assertOk();
        $response->assertInertia(fn (AssertableInertia $page) => $page
            ->component('Dashboard')
            ->where('stats.0.label', 'ウォッチリスト銘柄数')
            ->where('stats.0.value', '1')
            ->where('stats.1.label', '直近ポジティブ材料')
            ->where('stats.1.value', '1')
            ->where('stats.3.label', '未分析ニュース')
            ->where('stats.3.value', '1')
            ->where('recentTrend.total', 1)
            ->where('topStocks.0.symbol', 'AAPL')
            ->where('topStocks.0.totalScore', 8.25)
            ->where('importantNews.0.title', 'Apple product news')
            ->where('latestAnalysisAt', '2026-06-15 11:00')
        );
    }

    public function test_未認証ユーザーはダッシュボードにアクセスできない(): void
    {
        // Act
        $response = $this->get(route('dashboard'));

        // Assert
        $response->assertRedirect(route('login'));
    }
}
