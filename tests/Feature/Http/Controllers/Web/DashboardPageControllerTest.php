<?php

declare(strict_types=1);

namespace Tests\Feature\Http\Controllers\Web;

use App\Enums\AnalysisBatchStatus;
use App\Enums\AnalysisImportStatus;
use App\Enums\AnalysisSentiment;
use App\Models\AnalysisBatch;
use App\Models\AnalysisImport;
use App\Models\AnalysisResult;
use App\Models\NewsArticle;
use App\Models\PeriodAnalysisSignal;
use App\Models\Stock;
use App\Models\StockPrice;
use App\Models\User;
use App\Models\Watchlist;
use App\Repositories\DashboardRepositoryInterface;
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
            'source' => 'Reuters',
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

        $batch = AnalysisBatch::factory()->for($user)->for($stock)->create([
            'status' => AnalysisBatchStatus::Completed,
        ]);
        $import = AnalysisImport::factory()->for($batch)->create([
            'revision' => 1,
            'status' => AnalysisImportStatus::Committed,
            'committed_at' => '2026-06-15 12:00:00',
        ]);
        $batch->update(['current_import_id' => $import->id]);
        AnalysisResult::factory()->for($stock)->create([
            'source_import_id' => $import->id,
            'analysable_type' => AnalysisBatch::class,
            'analysable_id' => $batch->id,
            'sentiment' => AnalysisSentiment::Positive,
            'prompt_version' => $batch->prompt_version,
            'analyzed_at' => '2026-06-15 12:00:00',
        ]);
        PeriodAnalysisSignal::factory()->create([
            'user_id' => $user->id,
            'stock_id' => $stock->id,
            'source_analysis_import_id' => $import->id,
            'prompt_version' => $batch->prompt_version,
            'signal_date' => '2026-06-15',
            'total_score' => 8.25,
            'positive_count' => 3,
            'negative_count' => 1,
            'reason' => 'ポジティブ材料が増加',
            'generated_at' => '2026-06-15 12:00:00',
        ]);
        StockPrice::factory()->for($stock)->create([
            'price_date' => '2026-06-14',
            'close' => 100,
            'adjusted_close' => 100,
        ]);
        StockPrice::factory()->for($stock)->create([
            'price_date' => '2026-06-15',
            'close' => 119,
            'adjusted_close' => 120,
        ]);
        StockPrice::factory()->for($stock)->create([
            'price_date' => '2026-06-15',
            'close' => 999,
            'adjusted_close' => 999,
            'source' => 'demo',
        ]);

        // Act
        $response = $this->actingAs($user)->get(route('dashboard'));

        // Assert
        $response->assertOk();
        $response->assertInertia(fn (AssertableInertia $page) => $page
            ->component('Dashboard')
            ->where('stats.0.kind', 'watchlist')
            ->where('stats.0.value', 1)
            ->where('stats.1.kind', 'positiveAnalysis')
            ->where('stats.1.value', 1)
            ->where('stats.3.kind', 'unanalyzedNews')
            ->where('stats.3.value', 1)
            ->where('latestAnalysisAt', '2026-06-15T11:00:00+00:00')
            ->missing('dashboardDetails')
            ->loadDeferredProps('dashboard-details', fn (AssertableInertia $reload) => $reload
                ->where('dashboardDetails.recentTrend.total', 1)
                ->where('dashboardDetails.topStocks.0.symbol', 'AAPL')
                ->where('dashboardDetails.topStocks.0.totalScore', 8.25)
                ->where('dashboardDetails.topStocks.0.latestPrice', 120)
                ->where('dashboardDetails.topStocks.0.changePercent', 20)
                ->where(
                    'dashboardDetails.topStocks.0.sentiment',
                    AnalysisSentiment::Positive->value,
                )
                ->where('dashboardDetails.topStocks.0.sentimentLabel', 'ポジティブ')
                ->where(
                    'dashboardDetails.topStocks.0.updatedAt',
                    '2026-06-15T12:00:00+00:00',
                )
                ->where('dashboardDetails.attentionStocks.0.symbol', 'AAPL')
                ->where('dashboardDetails.attentionStocks.0.totalScore', 8.25)
                ->where('dashboardDetails.importantNews.0.articleId', $positiveNews->id)
                ->where('dashboardDetails.importantNews.0.title', 'Apple product news')
                ->where('dashboardDetails.importantNews.0.source', 'Reuters')
                ->where(
                    'dashboardDetails.importantNews.0.timeAgo',
                    '2026-06-15T11:00:00+00:00',
                )
                ->where(
                    'dashboardDetails.importantNews.0.publishedAt',
                    '2026-06-15T10:00:00+00:00',
                )
            )
        );
    }

    public function test_詳細の遅延取得では概要集計を再実行しない(): void
    {
        // Arrange
        $user = User::factory()->create();
        $userId = (int) $user->id;
        $repository = $this->createMock(DashboardRepositoryInterface::class);
        $repository->expects($this->once())
            ->method('findLatestAnalysisAt')
            ->with($userId)
            ->willReturn(null);
        $repository->expects($this->once())
            ->method('countActiveWatchlists')
            ->with($userId)
            ->willReturn(0);
        $repository->expects($this->exactly(2))
            ->method('countRecentAnalysesBySentiment')
            ->willReturn(0);
        $repository->expects($this->once())
            ->method('countUnanalysedNews')
            ->with($userId)
            ->willReturn(0);
        $repository->expects($this->exactly(2))
            ->method('countAnalysesByDate')
            ->willReturn([]);
        $repository->expects($this->once())
            ->method('findTopSignals')
            ->with($userId, 5)
            ->willReturn(collect());
        $repository->expects($this->once())
            ->method('findAttentionSignals')
            ->with($userId, 5)
            ->willReturn(collect());
        $repository->expects($this->once())
            ->method('findImportantNewsAnalyses')
            ->with($userId, 5)
            ->willReturn(collect());
        $this->app->instance(DashboardRepositoryInterface::class, $repository);

        // Act
        $response = $this->actingAs($user)->get(route('dashboard'));

        // Assert
        $response->assertOk();
        $response->assertInertia(fn (AssertableInertia $page) => $page
            ->component('Dashboard')
            ->has('stats', 5)
            ->where('latestAnalysisAt', null)
            ->missing('dashboardDetails')
            ->loadDeferredProps('dashboard-details', fn (AssertableInertia $reload) => $reload
                ->has('dashboardDetails')
                ->missing('stats')
                ->missing('latestAnalysisAt')
            )
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
