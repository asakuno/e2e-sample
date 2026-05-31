<?php

declare(strict_types=1);

namespace App\Enums;

use App\Enums\Traits\HasSelectArray;

enum AlertConditionOperator: int
{
    use HasSelectArray;

    case GreaterThanOrEqual = 1;
    case LessThanOrEqual = 2;
    case GreaterThan = 3;
    case LessThan = 4;
    case Equal = 5;

    public function label(): string
    {
        return match ($this) {
            self::GreaterThanOrEqual => '>=',
            self::LessThanOrEqual => '<=',
            self::GreaterThan => '>',
            self::LessThan => '<',
            self::Equal => '=',
        };
    }
}
