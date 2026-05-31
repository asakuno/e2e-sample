<?php

declare(strict_types=1);

namespace App\Enums;

use App\Enums\Traits\HasSelectArray;

enum AnalysisTimeHorizon: int
{
    use HasSelectArray;

    case ShortTerm = 1;
    case MediumTerm = 2;
    case LongTerm = 3;
    case Unknown = 0;

    public function label(): string
    {
        return match ($this) {
            self::ShortTerm => '短期',
            self::MediumTerm => '中期',
            self::LongTerm => '長期',
            self::Unknown => '判定不可',
        };
    }
}
