<?php

declare(strict_types=1);

namespace App\Data\Dashboard;

use Spatie\LaravelData\Data;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

#[TypeScript()]
final class DashboardOverviewData extends Data
{
    /**
     * @param  array<int, DashboardStatData>  $stats
     */
    public function __construct(
        public readonly array $stats,
        public readonly ?string $latestAnalysisAt,
    ) {}
}
