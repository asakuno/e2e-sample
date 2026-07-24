<?php

declare(strict_types=1);

namespace Tests\Feature\Repositories;

use App\Enums\AnalysisSentiment;
use App\Models\AnalysisBatch;
use App\Models\AnalysisImport;
use App\Models\AnalysisResult;
use App\Models\NewsArticle;
use App\Models\PeriodAnalysisSignal;
use App\Models\Stock;
use App\Models\StockPrice;
use App\Models\StockSignal;
use App\Models\User;
use App\Models\Watchlist;
use App\Repositories\DashboardRepositoryInterface;
use Carbon\Carbon;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

final class DashboardRepositoryTest extends TestCase
{
    use RefreshDatabase;

    private DashboardRepositoryInterface $repository;

    protected function setUp(): void
    {
        parent::setUp();
        $this->repository = app(DashboardRepositoryInterface::class);
        Carbon::setTestNow('2026-06-16 12:00:00');
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    public function test_ランキングは認証ユーザーのactive銘柄に属する期間シグナルだけを返す(): void
    {
        // Arrange
        $user = User::factory()->create();
        $otherUser = User::factory()->create();
        $positiveStock = Stock::factory()->create();
        $negativeStock = Stock::factory()->create();
        $inactiveStock = Stock::factory()->create();

        Watchlist::factory()->for($user)->for($positiveStock)->create(['is_active' => true]);
        Watchlist::factory()->for($user)->for($negativeStock)->create(['is_active' => true]);
        Watchlist::factory()->for($user)->for($inactiveStock)->create(['is_active' => false]);

        $positiveSignal = PeriodAnalysisSignal::factory()->create([
            'user_id' => $user->id,
            'stock_id' => $positiveStock->id,
            'signal_date' => '2026-06-15',
            'total_score' => 0.5,
            'generated_at' => '2026-06-15 12:00:00',
        ]);
        $negativeSignal = PeriodAnalysisSignal::factory()->create([
            'user_id' => $user->id,
            'stock_id' => $negativeStock->id,
            'signal_date' => '2026-06-16',
            'total_score' => -9,
            'generated_at' => '2026-06-16 10:00:00',
        ]);
        $inactiveSignal = PeriodAnalysisSignal::factory()->create([
            'user_id' => $user->id,
            'stock_id' => $inactiveStock->id,
            'signal_date' => '2026-06-16',
            'total_score' => -10,
        ]);
        $otherUsersSignal = PeriodAnalysisSignal::factory()->create([
            'user_id' => $otherUser->id,
            'stock_id' => $positiveStock->id,
            'signal_date' => '2026-06-16',
            'total_score' => 10,
        ]);

        // Act
        $attentionSignals = $this->repository->findAttentionSignals($user->id, 5);
        $topSignals = $this->repository->findTopSignals($user->id, 5);

        // Assert
        $this->assertSame(
            [$negativeSignal->id, $positiveSignal->id],
            $attentionSignals->pluck('id')->all(),
        );
        $this->assertNotContains($inactiveSignal->id, $attentionSignals->pluck('id')->all());
        $this->assertNotContains($otherUsersSignal->id, $attentionSignals->pluck('id')->all());
        $this->assertSame(
            [$positiveSignal->id, $negativeSignal->id],
            $topSignals->pluck('id')->all(),
        );
        $this->assertNotContains($otherUsersSignal->id, $topSignals->pluck('id')->all());
    }

    public function test_確認候補は指定件数までに制限される(): void
    {
        // Arrange
        $user = User::factory()->create();

        foreach (range(5, 10) as $score) {
            $stock = Stock::factory()->create();
            Watchlist::factory()->for($user)->for($stock)->create(['is_active' => true]);
            PeriodAnalysisSignal::factory()->create([
                'user_id' => $user->id,
                'stock_id' => $stock->id,
                'signal_date' => '2026-06-16',
                'total_score' => -$score,
            ]);
        }

        // Act
        DB::flushQueryLog();
        DB::enableQueryLog();
        $result = $this->repository->findAttentionSignals($user->id, 5);

        // Assert
        $this->assertCount(5, $result);
        $this->assertSame([-10.0, -9.0, -8.0, -7.0, -6.0], $result->pluck('total_score')->map(
            fn ($score): float => (float) $score,
        )->all());
        $this->assertSelectionUsesSqlLimit('period_analysis_signals', 5);
    }

    public function test_ランキングはlegacyシグナルを使用しない(): void
    {
        // Arrange
        $user = User::factory()->create();
        $stock = Stock::factory()->create();
        Watchlist::factory()->for($user)->for($stock)->create(['is_active' => true]);
        $legacySignal = StockSignal::factory()->for($stock)->create([
            'signal_date' => '2026-06-16',
            'total_score' => 10,
        ]);
        $periodSignal = PeriodAnalysisSignal::factory()->create([
            'user_id' => $user->id,
            'stock_id' => $stock->id,
            'signal_date' => '2026-06-16',
            'total_score' => 2,
        ]);

        // Act
        $topSignals = $this->repository->findTopSignals($user->id, 5);
        $attentionSignals = $this->repository->findAttentionSignals($user->id, 5);

        // Assert
        $this->assertSame([$periodSignal->id], $topSignals->pluck('id')->all());
        $this->assertSame([$periodSignal->id], $attentionSignals->pluck('id')->all());
        $this->assertDatabaseHas('stock_signals', ['id' => $legacySignal->id]);
    }

    public function test_重要ニュースは直近7日の現行prompt分析を記事ごとに一件返す(): void
    {
        // Arrange
        config()->set('services.openai.prompt_version', 'v2');

        $user = User::factory()->create();
        $firstStock = Stock::factory()->create();
        $secondStock = Stock::factory()->create();
        $thirdStock = Stock::factory()->create();

        Watchlist::factory()->for($user)->for($firstStock)->create(['is_active' => true]);
        Watchlist::factory()->for($user)->for($secondStock)->create(['is_active' => true]);
        Watchlist::factory()->for($user)->for($thirdStock)->create(['is_active' => true]);

        $sharedArticle = NewsArticle::factory()->create([
            'published_at' => '2026-06-15 08:00:00',
        ]);
        $secondArticle = NewsArticle::factory()->create([
            'published_at' => '2026-06-10 08:00:00',
        ]);
        $oldArticle = NewsArticle::factory()->create([
            'published_at' => '2026-06-09 11:59:59',
        ]);

        $oldPromptSharedAnalysis = AnalysisResult::factory()->for($firstStock)->create([
            'analysable_type' => NewsArticle::class,
            'analysable_id' => $sharedArticle->id,
            'impact_score' => -10,
            'analyzed_at' => '2026-06-16 11:00:00',
            'prompt_version' => 'v1',
        ]);
        $currentSharedAnalysis = AnalysisResult::factory()->for($firstStock)->create([
            'analysable_type' => NewsArticle::class,
            'analysable_id' => $sharedArticle->id,
            'impact_score' => 7,
            'analyzed_at' => '2026-06-16 11:30:00',
            'prompt_version' => 'v2',
        ]);
        $representativeSharedAnalysis = AnalysisResult::factory()->for($secondStock)->create([
            'analysable_type' => NewsArticle::class,
            'analysable_id' => $sharedArticle->id,
            'impact_score' => 9,
            'analyzed_at' => '2026-06-16 12:00:00',
            'prompt_version' => 'v2',
        ]);
        $secondArticleAnalysis = AnalysisResult::factory()->for($thirdStock)->create([
            'analysable_type' => NewsArticle::class,
            'analysable_id' => $secondArticle->id,
            'impact_score' => -8,
            'analyzed_at' => '2026-06-16 10:00:00',
            'prompt_version' => 'v2',
        ]);
        $oldArticleAnalysis = AnalysisResult::factory()->for($firstStock)->create([
            'analysable_type' => NewsArticle::class,
            'analysable_id' => $oldArticle->id,
            'impact_score' => 10,
            'analyzed_at' => '2026-06-16 09:00:00',
            'prompt_version' => 'v2',
        ]);

        // Act
        DB::flushQueryLog();
        DB::enableQueryLog();
        $result = $this->repository->findImportantNewsAnalyses($user->id, 2);

        // Assert
        $this->assertCount(2, $result);
        $this->assertSame(
            [$representativeSharedAnalysis->id, $secondArticleAnalysis->id],
            $result->pluck('id')->all(),
        );
        $this->assertNotContains($oldPromptSharedAnalysis->id, $result->pluck('id')->all());
        $this->assertNotContains($currentSharedAnalysis->id, $result->pluck('id')->all());
        $this->assertNotContains($oldArticleAnalysis->id, $result->pluck('id')->all());
        $this->assertSame(
            [$sharedArticle->id, $secondArticle->id],
            $result->pluck('analysable_id')->all(),
        );
        $this->assertSelectionUsesSqlLimit('row_number() over', 2);
    }

    public function test_未分析件数はactiveウォッチリストの記事と銘柄の組み合わせで数える(): void
    {
        // Arrange
        config()->set('services.openai.prompt_version', 'v2');

        $user = User::factory()->create();
        $otherUser = User::factory()->create();
        $firstStock = Stock::factory()->create();
        $secondStock = Stock::factory()->create();
        $inactiveStock = Stock::factory()->create();
        $otherUsersStock = Stock::factory()->create();

        Watchlist::factory()->for($user)->for($firstStock)->create(['is_active' => true]);
        Watchlist::factory()->for($user)->for($secondStock)->create(['is_active' => true]);
        Watchlist::factory()->for($user)->for($inactiveStock)->create(['is_active' => false]);
        Watchlist::factory()->for($otherUser)->for($otherUsersStock)->create(['is_active' => true]);

        $partiallyAnalysedArticle = NewsArticle::factory()->create();
        $partiallyAnalysedArticle->stocks()->attach([$firstStock->id, $secondStock->id]);
        AnalysisResult::factory()->for($firstStock)->create([
            'analysable_type' => NewsArticle::class,
            'analysable_id' => $partiallyAnalysedArticle->id,
            'prompt_version' => 'v2',
        ]);

        $pendingForBothStocks = NewsArticle::factory()->create();
        $pendingForBothStocks->stocks()->attach([$firstStock->id, $secondStock->id]);

        $oldPromptOnlyArticle = NewsArticle::factory()->create();
        $oldPromptOnlyArticle->stocks()->attach($firstStock->id);
        AnalysisResult::factory()->for($firstStock)->create([
            'analysable_type' => NewsArticle::class,
            'analysable_id' => $oldPromptOnlyArticle->id,
            'prompt_version' => 'v1',
        ]);

        $inactiveArticle = NewsArticle::factory()->create();
        $inactiveArticle->stocks()->attach($inactiveStock->id);
        $otherUsersArticle = NewsArticle::factory()->create();
        $otherUsersArticle->stocks()->attach($otherUsersStock->id);

        // Act
        $result = $this->repository->countUnanalysedNews($user->id);

        // Assert
        $this->assertSame(4, $result);
    }

    public function test_分析集計はウォッチリスト銘柄を同一クエリのsubqueryで絞り込む(): void
    {
        // Arrange
        $user = User::factory()->create();
        $stock = Stock::factory()->create();
        Watchlist::factory()->for($user)->for($stock)->create(['is_active' => true]);
        AnalysisResult::factory()->for($stock)->create([
            'sentiment' => AnalysisSentiment::Positive,
            'prompt_version' => 'v1',
            'analyzed_at' => '2026-06-16 10:00:00',
        ]);
        DB::flushQueryLog();
        DB::enableQueryLog();

        // Act
        $count = $this->repository->countRecentAnalysesBySentiment(
            $user->id,
            AnalysisSentiment::Positive,
            Carbon::parse('2026-06-15 00:00:00'),
        );
        $queries = DB::getQueryLog();
        DB::disableQueryLog();

        // Assert
        $this->assertSame(1, $count);
        $this->assertCount(1, $queries);
        $this->assertMatchesRegularExpression(
            '/\bin\s*\(\s*select\b.*\bstock_id\b.*\bfrom\b.*\bwatchlists\b/s',
            strtolower($queries[0]['query']),
        );
    }

    public function test_集計と最新分析は現行prompt_versionだけを使用する(): void
    {
        // Arrange
        config()->set('services.openai.prompt_version', 'v2');
        $user = User::factory()->create();
        $stock = Stock::factory()->create();
        Watchlist::factory()->for($user)->for($stock)->create(['is_active' => true]);
        AnalysisResult::factory()->for($stock)->create([
            'sentiment' => 1,
            'prompt_version' => 'v2',
            'analyzed_at' => '2026-06-15 09:00:00',
        ]);
        AnalysisResult::factory()->for($stock)->create([
            'sentiment' => 1,
            'prompt_version' => 'v1',
            'analyzed_at' => '2026-06-16 11:59:00',
        ]);
        $expected = [
            'positive_count' => 1,
            'latest_at' => '2026-06-15 09:00:00',
            'trend' => ['2026-06-15' => 1],
        ];

        // Act
        $actual = [
            'positive_count' => $this->repository->countRecentAnalysesBySentiment(
                $user->id,
                AnalysisSentiment::Positive,
                Carbon::parse('2026-06-14 00:00:00'),
            ),
            'latest_at' => $this->repository->findLatestAnalysisAt($user->id)?->toDateTimeString(),
            'trend' => $this->repository->countAnalysesByDate(
                $user->id,
                Carbon::parse('2026-06-14'),
                Carbon::parse('2026-06-16'),
            ),
        ];

        // Assert
        $this->assertSame($expected, $actual);
    }

    public function test_期間シグナルは価格と出所batchの分析resultをeager_loadする(): void
    {
        // Arrange
        $user = User::factory()->create();
        $stock = Stock::factory()->create();
        Watchlist::factory()->for($user)->for($stock)->create(['is_active' => true]);
        $batch = AnalysisBatch::factory()->for($user)->for($stock)->create();
        $import = AnalysisImport::factory()->for($batch)->create();
        $periodResult = AnalysisResult::factory()->for($stock)->create([
            'source_import_id' => $import->id,
            'analysable_type' => AnalysisBatch::class,
            'analysable_id' => $batch->id,
            'sentiment' => AnalysisSentiment::Negative,
            'prompt_version' => $batch->prompt_version,
        ]);
        $signal = PeriodAnalysisSignal::factory()->create([
            'user_id' => $user->id,
            'stock_id' => $stock->id,
            'source_analysis_import_id' => $import->id,
        ]);
        StockPrice::factory()->for($stock)->create([
            'source' => 'alpha_vantage',
            'price_date' => '2026-06-16',
            'adjusted_close' => 120,
        ]);
        StockPrice::factory()->for($stock)->create([
            'source' => 'alpha_vantage',
            'price_date' => '2026-06-15',
            'adjusted_close' => 100,
        ]);
        StockPrice::factory()->for($stock)->create([
            'source' => 'demo',
            'price_date' => '2026-06-17',
            'adjusted_close' => 999,
        ]);

        // Act
        $found = $this->repository->findTopSignals($user->id, 1)->firstOrFail();

        // Assert
        $this->assertSame($signal->id, $found->id);
        $this->assertTrue($found->relationLoaded('stock'));
        $this->assertTrue($found->stock->relationLoaded('prices'));
        $this->assertSame([120.0, 100.0], $found->stock->prices->pluck('adjusted_close')->map(
            fn ($price): float => (float) $price,
        )->all());
        $this->assertTrue($found->relationLoaded('sourceAnalysisImport'));
        $this->assertTrue($found->sourceAnalysisImport->relationLoaded('analysisBatch'));
        $this->assertTrue($found->sourceAnalysisImport->analysisBatch->relationLoaded('result'));
        $this->assertSame($periodResult->id, $found->sourceAnalysisImport->analysisBatch->result?->id);
    }

    public function test_日別分析件数は日本標準時の日付境界で集計する(): void
    {
        // Arrange
        $user = User::factory()->create();
        $stock = Stock::factory()->create();
        Watchlist::factory()->for($user)->for($stock)->create(['is_active' => true]);

        foreach ([
            '2026-07-11 14:59:59',
            '2026-07-11 15:00:00',
            '2026-07-12 14:59:59',
            '2026-07-12 15:00:00',
        ] as $analyzedAt) {
            AnalysisResult::factory()->for($stock)->create(['analyzed_at' => $analyzedAt]);
        }

        $date = CarbonImmutable::parse('2026-07-12', 'Asia/Tokyo');

        // Act
        $counts = $this->repository->countAnalysesByDate($user->id, $date, $date);

        // Assert
        $this->assertSame(['2026-07-12' => 2], $counts);
    }

    private function assertSelectionUsesSqlLimit(string $needle, int $limit): void
    {
        $selectionSql = collect(DB::getQueryLog())
            ->pluck('query')
            ->first(fn ($query): bool => is_string($query)
                && str_contains(strtolower($query), $needle)
                && str_contains(strtolower($query), "limit {$limit}"));

        DB::disableQueryLog();

        $this->assertIsString($selectionSql);
        $this->assertStringContainsString("limit {$limit}", strtolower($selectionSql));
    }
}
