<?php

declare(strict_types=1);

namespace App\Data\Dashboard;

use Spatie\LaravelData\Data;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

#[TypeScript()]
final class DashboardSummaryData extends Data
{
    /**
     * @param  array<int, DashboardStatData>  $stats
     * @param  array<int, DashboardTopStockData>  $topStocks
     * @param  array<int, DashboardActivityItemData>  $importantNews
     */
    public function __construct(
        public readonly array $stats,
        public readonly DashboardTrendData $recentTrend,
        public readonly array $topStocks,
        public readonly array $importantNews,
        public readonly ?string $latestAnalysisAt,
    ) {}
}
