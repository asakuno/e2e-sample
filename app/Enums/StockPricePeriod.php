<?php

declare(strict_types=1);

namespace App\Enums;

use App\Enums\Traits\HasSelectArray;
use Carbon\CarbonInterface;
use Illuminate\Support\Carbon;

enum StockPricePeriod: string
{
    use HasSelectArray;

    case OneMonth = '1M';
    case ThreeMonths = '3M';
    case SixMonths = '6M';
    case OneYear = '1Y';

    public static function default(): self
    {
        return self::OneMonth;
    }

    /**
     * @return array<int, string>
     */
    public static function values(): array
    {
        return array_map(
            fn (self $period): string => $period->value,
            self::cases(),
        );
    }

    public function label(): string
    {
        return $this->value;
    }

    public function startDate(): CarbonInterface
    {
        return (match ($this) {
            self::ThreeMonths => now()->subMonthsNoOverflow(3),
            self::SixMonths => now()->subMonthsNoOverflow(6),
            self::OneYear => now()->subYearNoOverflow(),
            self::OneMonth => now()->subMonthNoOverflow(),
        })->startOfDay();
    }
}
