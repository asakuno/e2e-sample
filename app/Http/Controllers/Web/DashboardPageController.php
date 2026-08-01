<?php

declare(strict_types=1);

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use App\UseCases\Dashboard\GetDashboardDetailsUseCase;
use App\UseCases\Dashboard\GetDashboardOverviewUseCase;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * ダッシュボードページコントローラー
 */
class DashboardPageController extends Controller
{
    /**
     * ダッシュボードページ表示
     */
    public function __invoke(
        Request $request,
        GetDashboardOverviewUseCase $overviewUseCase,
        GetDashboardDetailsUseCase $detailsUseCase,
    ): Response {
        $userId = (int) $request->user()->getAuthIdentifier();
        $overview = null;
        $resolveOverview = function () use (&$overview, $overviewUseCase, $userId) {
            return $overview ??= $overviewUseCase->execute($userId);
        };

        return Inertia::render('Dashboard', [
            'stats' => fn (): array => $resolveOverview()->toArray()['stats'],
            'latestAnalysisAt' => fn (): ?string => $resolveOverview()->latestAnalysisAt,
            'dashboardDetails' => Inertia::defer(
                fn (): array => $detailsUseCase->execute($userId)->toArray(),
                'dashboard-details',
            ),
        ]);
    }
}
