<?php

declare(strict_types=1);

namespace Tests\Unit\UseCases\Dashboard;

use App\Enums\AnalysisSentiment;
use App\Models\AnalysisResult;
use App\Models\NewsArticle;
use App\Models\Stock;
use App\Models\StockPrice;
use App\Models\StockSignal;
use App\Repositories\DashboardRepositoryInterface;
use App\Services\Dashboard\DashboardSummaryAssembler;
use App\UseCases\Dashboard\GetDashboardDetailsUseCase;
use Carbon\Carbon;
use Carbon\CarbonInterface;
use Illuminate\Support\Collection;
use Tests\TestCase;

final class GetDashboardDetailsUseCaseTest extends TestCase
{
    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    public function test_遅延表示に必要な集計だけを取得する(): void
    {
        // Arrange
        Carbon::setTestNow('2026-06-16 12:00:00');
        [$signal, $analysis] = $this->dashboardModels();

        $repository = $this->createMock(DashboardRepositoryInterface::class);
        $repository->expects($this->never())->method('countActiveWatchlists');
        $repository->expects($this->never())->method('countRecentAnalysesBySentiment');
        $repository->expects($this->never())->method('countUnanalysedNews');
        $repository->expects($this->never())->method('findLatestAnalysisAt');
        $repository->expects($this->exactly(2))
            ->method('countAnalysesByDate')
            ->willReturnCallback(
                function (
                    int $userId,
                    CarbonInterface $from,
                    CarbonInterface $to,
                ): array {
                    $this->assertSame(1, $userId);

                    if ($from->toDateString() === '2026-06-10') {
                        $this->assertSame('2026-06-16', $to->toDateString());

                        return ['2026-06-15' => 3];
                    }

                    $this->assertSame('2026-06-03', $from->toDateString());
                    $this->assertSame('2026-06-09', $to->toDateString());

                    return ['2026-06-08' => 1];
                },
            );
        $repository->expects($this->once())
            ->method('findTopSignals')
            ->with(1, 5)
            ->willReturn(new Collection([$signal]));
        $repository->expects($this->once())
            ->method('findAttentionSignals')
            ->with(1, 5)
            ->willReturn(new Collection([$signal]));
        $repository->expects($this->once())
            ->method('findImportantNewsAnalyses')
            ->with(1, 5)
            ->willReturn(new Collection([$analysis]));
        $useCase = new GetDashboardDetailsUseCase(
            $repository,
            new DashboardSummaryAssembler,
        );

        // Act
        $result = $useCase->execute(1);

        // Assert
        $this->assertSame(3, $result->recentTrend->total);
        $this->assertSame('+200.0%', $result->recentTrend->changePercent);
        $this->assertSame('AAPL', $result->topStocks[0]->symbol);
        $this->assertSame(120.0, $result->topStocks[0]->latestPrice);
        $this->assertSame(20.0, $result->topStocks[0]->changePercent);
        $this->assertSame(AnalysisSentiment::Positive->value, $result->topStocks[0]->sentiment);
        $this->assertSame('ポジティブ', $result->topStocks[0]->sentimentLabel);
        $this->assertSame('2026-06-15T12:00:00+00:00', $result->topStocks[0]->updatedAt);
        $this->assertSame('AAPL', $result->attentionStocks[0]->symbol);
        $this->assertSame(30, $result->importantNews[0]->articleId);
        $this->assertSame('Apple product news', $result->importantNews[0]->title);
        $this->assertSame('Reuters', $result->importantNews[0]->source);
        $this->assertSame('2026-06-15T10:00:00+00:00', $result->importantNews[0]->publishedAt);
    }

    /**
     * @return array{StockSignal, AnalysisResult}
     */
    private function dashboardModels(): array
    {
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
            'generated_at' => '2026-06-15 12:00:00',
        ]);
        $signal->id = 20;
        $signal->setRelation('stock', $stock);

        $article = new NewsArticle([
            'title' => 'Apple product news',
            'url' => 'https://example.com/apple',
            'source' => 'Reuters',
            'provider' => 'rss',
            'published_at' => '2026-06-15 10:00:00',
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

        $latestPrice = new StockPrice([
            'price_date' => '2026-06-15',
            'adjusted_close' => 120,
        ]);
        $latestPrice->id = 51;
        $previousPrice = new StockPrice([
            'price_date' => '2026-06-14',
            'adjusted_close' => 100,
        ]);
        $previousPrice->id = 50;
        $stock->setRelation('prices', new Collection([$latestPrice, $previousPrice]));
        $stock->setRelation('analysisResults', new Collection([$analysis]));

        return [$signal, $analysis];
    }
}
