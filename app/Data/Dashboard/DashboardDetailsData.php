<?php

declare(strict_types=1);

namespace App\Data\Dashboard;

use Spatie\LaravelData\Data;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

#[TypeScript()]
final class DashboardDetailsData extends Data
{
    /**
     * @param  array<int, DashboardTopStockData>  $topStocks
     * @param  array<int, DashboardTopStockData>  $attentionStocks
     * @param  array<int, DashboardActivityItemData>  $importantNews
     */
    public function __construct(
        public readonly DashboardTrendData $recentTrend,
        public readonly array $topStocks,
        public readonly array $attentionStocks,
        public readonly array $importantNews,
    ) {}
}
