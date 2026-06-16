<?php

declare(strict_types=1);

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use App\UseCases\Dashboard\GetDashboardSummaryUseCase;
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
    public function __invoke(Request $request, GetDashboardSummaryUseCase $useCase): Response
    {
        $summary = $useCase->execute((int) $request->user()->getAuthIdentifier());

        return Inertia::render('Dashboard', $summary->toArray());
    }
}
