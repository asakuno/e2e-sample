<?php

declare(strict_types=1);

namespace App\Enums;

use App\Enums\Traits\HasSelectArray;

enum AlertType: int
{
    use HasSelectArray;

    case SignalScore = 1;
    case PriceAbove = 2;
    case PriceBelow = 3;
    case NewsDetected = 4;

    public function label(): string
    {
        return match ($this) {
            self::SignalScore => 'シグナルスコア',
            self::PriceAbove => '株価上昇',
            self::PriceBelow => '株価下落',
            self::NewsDetected => '重要ニュース',
        };
    }
}
