<?php

declare(strict_types=1);

namespace Tests\Unit\UseCases\Dashboard;

use App\Data\Dashboard\DashboardStatData;
use App\Enums\AnalysisSentiment;
use App\Enums\DashboardStatKind;
use App\Repositories\DashboardRepositoryInterface;
use App\Services\Dashboard\DashboardSummaryAssembler;
use App\UseCases\Dashboard\GetDashboardOverviewUseCase;
use Carbon\Carbon;
use Carbon\CarbonInterface;
use Tests\TestCase;

final class GetDashboardOverviewUseCaseTest extends TestCase
{
    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    public function test_初期表示に必要な集計だけを取得する(): void
    {
        // Arrange
        Carbon::setTestNow('2026-06-16 12:00:00');

        $repository = $this->createMock(DashboardRepositoryInterface::class);
        $repository->expects($this->once())
            ->method('countActiveWatchlists')
            ->with(1)
            ->willReturn(1);
        $repository->expects($this->exactly(2))
            ->method('countRecentAnalysesBySentiment')
            ->willReturnCallback(
                function (
                    int $userId,
                    AnalysisSentiment $sentiment,
                    CarbonInterface $since,
                ): int {
                    $this->assertSame(1, $userId);
                    $this->assertSame('2026-06-10', $since->toDateString());

                    return $sentiment === AnalysisSentiment::Positive ? 2 : 1;
                },
            );
        $repository->expects($this->once())
            ->method('countUnanalysedNews')
            ->with(1)
            ->willReturn(3);
        $repository->expects($this->once())
            ->method('findLatestAnalysisAt')
            ->with(1)
            ->willReturn(Carbon::parse('2026-06-15 11:00:00'));
        $repository->expects($this->never())->method('countAnalysesByDate');
        $repository->expects($this->never())->method('findTopSignals');
        $repository->expects($this->never())->method('findAttentionSignals');
        $repository->expects($this->never())->method('findImportantNewsAnalyses');
        $useCase = new GetDashboardOverviewUseCase(
            $repository,
            new DashboardSummaryAssembler,
        );

        // Act
        $result = $useCase->execute(1);

        // Assert
        $expectedStats = [
            ['kind' => DashboardStatKind::Watchlist, 'value' => 1],
            ['kind' => DashboardStatKind::PositiveAnalysis, 'value' => 2],
            ['kind' => DashboardStatKind::NegativeAnalysis, 'value' => 1],
            ['kind' => DashboardStatKind::UnanalyzedNews, 'value' => 3],
            [
                'kind' => DashboardStatKind::LatestAnalysis,
                'value' => '2026-06-15T11:00:00+00:00',
            ],
        ];
        $actualStats = array_map(
            fn (DashboardStatData $stat): array => [
                'kind' => $stat->kind,
                'value' => $stat->value,
            ],
            $result->stats,
        );

        $this->assertSame($expectedStats, $actualStats);
        $this->assertSame('2026-06-15T11:00:00+00:00', $result->latestAnalysisAt);
    }
}
