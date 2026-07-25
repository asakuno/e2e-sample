<?php

declare(strict_types=1);

namespace App\UseCases\Dashboard;

use App\Data\Dashboard\DashboardOverviewData;
use App\Enums\AnalysisSentiment;
use App\Repositories\DashboardRepositoryInterface;
use App\Services\Dashboard\DashboardSummaryAssembler;
use Carbon\CarbonImmutable;

final class GetDashboardOverviewUseCase
{
    private const int RECENT_DAYS = 7;

    private const string DISPLAY_TIMEZONE = 'Asia/Tokyo';

    public function __construct(
        private DashboardRepositoryInterface $dashboardRepository,
        private DashboardSummaryAssembler $dashboardSummaryAssembler,
    ) {}

    public function execute(int $userId): DashboardOverviewData
    {
        $recentFrom = CarbonImmutable::today(self::DISPLAY_TIMEZONE)
            ->subDays(self::RECENT_DAYS - 1)
            ->startOfDay();
        $latestAnalysisAt = $this->dashboardRepository->findLatestAnalysisAt($userId);

        return $this->dashboardSummaryAssembler->assembleOverview(
            watchlistCount: $this->dashboardRepository->countActiveWatchlists($userId),
            positiveCount: $this->dashboardRepository->countRecentAnalysesBySentiment(
                $userId,
                AnalysisSentiment::Positive,
                $recentFrom,
            ),
            negativeCount: $this->dashboardRepository->countRecentAnalysesBySentiment(
                $userId,
                AnalysisSentiment::Negative,
                $recentFrom,
            ),
            unanalysedNewsCount: $this->dashboardRepository->countUnanalysedNews($userId),
            latestAnalysisAt: $latestAnalysisAt,
        );
    }
}
