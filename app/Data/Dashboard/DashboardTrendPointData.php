<?php

declare(strict_types=1);

namespace App\Data\Dashboard;

use Spatie\LaravelData\Data;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

#[TypeScript()]
final class DashboardTrendPointData extends Data
{
    public function __construct(
        public readonly string $label,
        public readonly int $value,
    ) {}
}
