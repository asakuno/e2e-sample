<?php

declare(strict_types=1);

namespace App\Data\Dashboard;

use Spatie\LaravelData\Data;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

#[TypeScript()]
final class DashboardTopStockData extends Data
{
    public function __construct(
        public readonly int $id,
        public readonly string $symbol,
        public readonly string $name,
        public readonly string $market,
        public readonly float $totalScore,
        public readonly int $positiveCount,
        public readonly int $negativeCount,
        public readonly ?string $reason,
        public readonly ?string $signalDate,
    ) {}
}
