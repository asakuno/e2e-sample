<?php

declare(strict_types=1);

namespace App\Enums;

use App\Enums\Traits\HasSelectArray;

enum AnalysisImportMode: int
{
    use HasSelectArray;

    case Initial = 1;
    case Replace = 2;

    public function label(): string
    {
        return match ($this) {
            self::Initial => '初回取込',
            self::Replace => '結果の置き換え',
        };
    }
}
