<?php

declare(strict_types=1);

namespace Tests\Unit\UseCases\Dashboard;

use App\Data\Dashboard\DashboardStatData;
use App\Enums\AnalysisSentiment;
use App\Enums\DashboardStatKind;
use App\Models\AnalysisResult;
use App\Models\NewsArticle;
use App\Models\Stock;
use App\Models\StockSignal;
use App\Repositories\DashboardRepositoryInterface;
use App\UseCases\Dashboard\GetDashboardSummaryUseCase;
use Carbon\Carbon;
use Carbon\CarbonInterface;
use Illuminate\Support\Collection;
use Tests\TestCase;

final class GetDashboardSummaryUseCaseTest extends TestCase
{
    public function test_ダッシュボード集計_dt_oを生成できる(): void
    {
        // Arrange
        Carbon::setTestNow('2026-06-16 12:00:00');

        $stock = new Stock([
            'symbol' => 'AAPL',
            'name' => 'Apple Inc.',
            'market' => 'us',
        ]);
        $stock->id = 10;

        $signal = new StockSignal([
            'stock_id' => 10,
            'signal_date' => '2026-06-15',
            'total_score' => 8.25,
            'positive_count' => 3,
            'negative_count' => 1,
            'reason' => 'ポジティブ材料が増加',
        ]);
        $signal->id = 20;
        $signal->setRelation('stock', $stock);

        $article = new NewsArticle([
            'title' => 'Apple product news',
            'url' => 'https://example.com/apple',
            'provider' => 'rss',
        ]);
        $article->id = 30;

        $analysis = new AnalysisResult([
            'stock_id' => 10,
            'summary' => '売上成長にポジティブ',
            'sentiment' => AnalysisSentiment::Positive,
            'impact_score' => 8,
            'analyzed_at' => '2026-06-15 11:00:00',
        ]);
        $analysis->id = 40;
        $analysis->setRelation('stock', $stock);
        $analysis->setRelation('analysable', $article);

        $repository = new class($signal, $analysis) implements DashboardRepositoryInterface
        {
            public function __construct(
                private readonly StockSignal $signal,
                private readonly AnalysisResult $analysis,
            ) {}

            public function countActiveWatchlists(int $userId): int
            {
                return 1;
            }

            public function countRecentAnalysesBySentiment(
                int $userId,
                AnalysisSentiment $sentiment,
                CarbonInterface $since,
            ): int {
                return $sentiment === AnalysisSentiment::Positive ? 2 : 1;
            }

            public function countUnanalysedNews(int $userId): int
            {
                return 3;
            }

            public function findTopSignals(int $userId, int $limit): Collection
            {
                return new Collection([$this->signal]);
            }

            public function findImportantNewsAnalyses(int $userId, int $limit): Collection
            {
                return new Collection([$this->analysis]);
            }

            public function findLatestAnalysisAt(int $userId): ?CarbonInterface
            {
                return $userId === 0 ? null : Carbon::parse('2026-06-15 11:00:00');
            }

            public function countAnalysesByDate(int $userId, CarbonInterface $from, CarbonInterface $to): array
            {
                return $from->toDateString() === '2026-06-10'
                    ? ['2026-06-15' => 3]
                    : ['2026-06-08' => 1];
            }
        };

        $useCase = new GetDashboardSummaryUseCase($repository);

        // Act
        $result = $useCase->execute(1);

        // Assert
        $expectedStats = [
            ['kind' => DashboardStatKind::Watchlist, 'value' => 1],
            ['kind' => DashboardStatKind::PositiveAnalysis, 'value' => 2],
            ['kind' => DashboardStatKind::NegativeAnalysis, 'value' => 1],
            ['kind' => DashboardStatKind::UnanalyzedNews, 'value' => 3],
            ['kind' => DashboardStatKind::LatestAnalysis, 'value' => '2026-06-15 11:00'],
        ];
        $actualStats = array_map(
            fn (DashboardStatData $stat): array => ['kind' => $stat->kind, 'value' => $stat->value],
            $result->stats,
        );
        $this->assertSame($expectedStats, $actualStats);
        $this->assertSame(3, $result->recentTrend->total);
        $this->assertSame('+200.0%', $result->recentTrend->changePercent);
        $this->assertSame('AAPL', $result->topStocks[0]->symbol);
        $this->assertSame(30, $result->importantNews[0]->articleId);
        $this->assertSame('Apple product news', $result->importantNews[0]->title);
        $this->assertSame('2026-06-15 11:00', $result->latestAnalysisAt);

        Carbon::setTestNow();
    }
}
