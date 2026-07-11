<?php

declare(strict_types=1);

namespace Tests\Feature\Repositories;

use App\Models\AnalysisResult;
use App\Models\NewsArticle;
use App\Models\Stock;
use App\Models\StockSignal;
use App\Models\User;
use App\Models\Watchlist;
use App\Repositories\DashboardRepositoryInterface;
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
    }

    public function test_確認候補は絶対スコア順で銘柄ごとの最強シグナルを返す(): void
    {
        // Arrange
        $user = User::factory()->create();
        $positiveStock = Stock::factory()->create();
        $negativeStock = Stock::factory()->create();
        $inactiveStock = Stock::factory()->create();

        Watchlist::factory()->for($user)->for($positiveStock)->create(['is_active' => true]);
        Watchlist::factory()->for($user)->for($negativeStock)->create(['is_active' => true]);
        Watchlist::factory()->for($user)->for($inactiveStock)->create(['is_active' => false]);

        $positiveSignal = StockSignal::factory()->for($positiveStock)->create([
            'signal_date' => '2026-06-15',
            'total_score' => 1,
        ]);
        $weakerPositiveSignal = StockSignal::factory()->for($positiveStock)->create([
            'signal_date' => '2026-06-16',
            'total_score' => 0.5,
        ]);
        $negativeSignal = StockSignal::factory()->for($negativeStock)->create([
            'signal_date' => '2026-06-16',
            'total_score' => -9,
        ]);
        $inactiveSignal = StockSignal::factory()->for($inactiveStock)->create([
            'signal_date' => '2026-06-16',
            'total_score' => -10,
        ]);

        // Act
        $attentionSignals = $this->repository->findAttentionSignals($user->id, 5);
        $topSignals = $this->repository->findTopSignals($user->id, 5);

        // Assert
        $this->assertSame(
            [$negativeSignal->id, $positiveSignal->id],
            $attentionSignals->pluck('id')->all(),
        );
        $this->assertNotContains($weakerPositiveSignal->id, $attentionSignals->pluck('id')->all());
        $this->assertNotContains($inactiveSignal->id, $attentionSignals->pluck('id')->all());
        $this->assertSame($positiveSignal->id, $topSignals->first()?->id);
    }

    public function test_確認候補は指定件数までに制限される(): void
    {
        // Arrange
        $user = User::factory()->create();

        foreach (range(5, 10) as $score) {
            $stock = Stock::factory()->create();
            Watchlist::factory()->for($user)->for($stock)->create(['is_active' => true]);
            StockSignal::factory()->for($stock)->create([
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
        $this->assertRankedSelectionUsesSqlLimit(5);
    }

    public function test_重要ニュースは記事ごとに絶対impact最大の分析を代表として返す(): void
    {
        // Arrange
        $user = User::factory()->create();
        $firstStock = Stock::factory()->create();
        $secondStock = Stock::factory()->create();
        $thirdStock = Stock::factory()->create();

        Watchlist::factory()->for($user)->for($firstStock)->create(['is_active' => true]);
        Watchlist::factory()->for($user)->for($secondStock)->create(['is_active' => true]);
        Watchlist::factory()->for($user)->for($thirdStock)->create(['is_active' => true]);

        $sharedArticle = NewsArticle::factory()->create();
        $secondArticle = NewsArticle::factory()->create();
        $thirdArticle = NewsArticle::factory()->create();

        $strongestSharedAnalysis = AnalysisResult::factory()->for($firstStock)->create([
            'analysable_type' => NewsArticle::class,
            'analysable_id' => $sharedArticle->id,
            'impact_score' => -10,
            'analyzed_at' => '2026-06-16 11:00:00',
        ]);
        $duplicateSharedAnalysis = AnalysisResult::factory()->for($secondStock)->create([
            'analysable_type' => NewsArticle::class,
            'analysable_id' => $sharedArticle->id,
            'impact_score' => 9,
            'analyzed_at' => '2026-06-16 12:00:00',
        ]);
        $secondArticleAnalysis = AnalysisResult::factory()->for($thirdStock)->create([
            'analysable_type' => NewsArticle::class,
            'analysable_id' => $secondArticle->id,
            'impact_score' => 8,
            'analyzed_at' => '2026-06-16 10:00:00',
        ]);
        AnalysisResult::factory()->for($firstStock)->create([
            'analysable_type' => NewsArticle::class,
            'analysable_id' => $thirdArticle->id,
            'impact_score' => 7,
            'analyzed_at' => '2026-06-16 09:00:00',
        ]);

        // Act
        DB::flushQueryLog();
        DB::enableQueryLog();
        $result = $this->repository->findImportantNewsAnalyses($user->id, 2);

        // Assert
        $this->assertCount(2, $result);
        $this->assertSame(
            [$strongestSharedAnalysis->id, $secondArticleAnalysis->id],
            $result->pluck('id')->all(),
        );
        $this->assertNotContains($duplicateSharedAnalysis->id, $result->pluck('id')->all());
        $this->assertSame(
            [$sharedArticle->id, $secondArticle->id],
            $result->pluck('analysable_id')->all(),
        );
        $this->assertRankedSelectionUsesSqlLimit(2);
    }

    private function assertRankedSelectionUsesSqlLimit(int $limit): void
    {
        $selectionSql = collect(DB::getQueryLog())
            ->pluck('query')
            ->first(fn ($query): bool => is_string($query)
                && str_contains(strtolower($query), 'row_number() over'));

        DB::disableQueryLog();

        $this->assertIsString($selectionSql);
        $this->assertStringContainsString("limit {$limit}", strtolower($selectionSql));
    }
}
