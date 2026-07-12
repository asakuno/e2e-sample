<?php

declare(strict_types=1);

namespace App\UseCases\Dashboard;

use App\Data\Dashboard\DashboardSummaryData;
use App\Enums\AnalysisSentiment;
use App\Repositories\DashboardRepositoryInterface;
use App\Services\Dashboard\DashboardSummaryAssembler;
use Carbon\CarbonImmutable;

final class GetDashboardSummaryUseCase
{
    private const RECENT_DAYS = 7;

    public function __construct(
        private DashboardRepositoryInterface $dashboardRepository,
        private DashboardSummaryAssembler $dashboardSummaryAssembler,
    ) {}

    public function execute(int $userId): DashboardSummaryData
    {
        $today = CarbonImmutable::today();
        $recentFrom = $today->subDays(self::RECENT_DAYS - 1)->startOfDay();
        $previousFrom = $recentFrom->subDays(self::RECENT_DAYS);
        $previousTo = $recentFrom->subDay()->endOfDay();

        return $this->dashboardSummaryAssembler->assemble(
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
            latestAnalysisAt: $this->dashboardRepository->findLatestAnalysisAt($userId),
            recentCounts: $this->dashboardRepository->countAnalysesByDate($userId, $recentFrom, $today),
            previousCounts: $this->dashboardRepository->countAnalysesByDate(
                $userId,
                $previousFrom,
                $previousTo,
            ),
            recentFrom: $recentFrom,
            recentTo: $today,
            topSignals: $this->dashboardRepository->findTopSignals($userId, 5),
            attentionSignals: $this->dashboardRepository->findAttentionSignals($userId, 5),
            importantNewsAnalyses: $this->dashboardRepository->findImportantNewsAnalyses($userId, 5),
        );
    }
}
