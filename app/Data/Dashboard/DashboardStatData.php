<?php

declare(strict_types=1);

namespace App\Data\Dashboard;

use App\Enums\DashboardStatKind;
use Spatie\LaravelData\Data;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

#[TypeScript()]
final class DashboardStatData extends Data
{
    public function __construct(
        public readonly DashboardStatKind $kind,
        public readonly int|string|null $value,
    ) {}
}
