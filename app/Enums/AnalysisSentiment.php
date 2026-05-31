<?php

declare(strict_types=1);

namespace App\Enums;

use App\Enums\Traits\HasSelectArray;

enum AnalysisSentiment: int
{
    use HasSelectArray;

    case Positive = 1;
    case Neutral = 0;
    case Negative = -1;

    public function label(): string
    {
        return match ($this) {
            self::Positive => 'ポジティブ',
            self::Neutral => '中立',
            self::Negative => 'ネガティブ',
        };
    }
}
