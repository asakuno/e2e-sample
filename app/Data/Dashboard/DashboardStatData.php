<?php

declare(strict_types=1);

namespace App\Data\Dashboard;

use Spatie\LaravelData\Data;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

#[TypeScript()]
final class DashboardStatData extends Data
{
    public function __construct(
        public readonly string $label,
        public readonly string $value,
        public readonly ?string $subLabel,
        public readonly ?string $subValue,
        public readonly ?string $change,
        public readonly ?string $changeDirection,
        public readonly string $icon,
        public readonly string $iconColorClass,
    ) {}
}
