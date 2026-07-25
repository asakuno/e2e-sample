<?php

declare(strict_types=1);

namespace App\UseCases\Dashboard;

use App\Data\Dashboard\DashboardDetailsData;
use App\Repositories\DashboardRepositoryInterface;
use App\Services\Dashboard\DashboardSummaryAssembler;
use Carbon\CarbonImmutable;

final class GetDashboardDetailsUseCase
{
    private const int RECENT_DAYS = 7;

    private const string DISPLAY_TIMEZONE = 'Asia/Tokyo';

    public function __construct(
        private DashboardRepositoryInterface $dashboardRepository,
        private DashboardSummaryAssembler $dashboardSummaryAssembler,
    ) {}

    public function execute(int $userId): DashboardDetailsData
    {
        $today = CarbonImmutable::today(self::DISPLAY_TIMEZONE);
        $recentFrom = $today->subDays(self::RECENT_DAYS - 1)->startOfDay();
        $previousFrom = $recentFrom->subDays(self::RECENT_DAYS);
        $previousTo = $recentFrom->subDay()->endOfDay();

        return $this->dashboardSummaryAssembler->assembleDetails(
            recentCounts: $this->dashboardRepository->countAnalysesByDate(
                $userId,
                $recentFrom,
                $today,
            ),
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
