<?php

declare(strict_types=1);

namespace App\Data\Dashboard;

use Spatie\LaravelData\Data;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

#[TypeScript()]
final class DashboardActivityItemData extends Data
{
    public function __construct(
        public readonly int $id,
        public readonly string $title,
        public readonly string $description,
        public readonly string $timeAgo,
        public readonly string $dotColor,
    ) {}
}
