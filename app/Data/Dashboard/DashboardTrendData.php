<?php

declare(strict_types=1);

namespace App\Data\Dashboard;

use Spatie\LaravelData\Data;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

#[TypeScript()]
final class DashboardTrendData extends Data
{
    /**
     * @param  array<int, DashboardTrendPointData>  $points
     */
    public function __construct(
        public readonly int $total,
        public readonly string $changePercent,
        public readonly string $changeDirection,
        public readonly string $description,
        public readonly array $points,
    ) {}
}
