<?php

declare(strict_types=1);

namespace App\Enums;

use App\Enums\Traits\HasSelectArray;
use Carbon\CarbonImmutable;
use Carbon\CarbonInterface;

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

    public function startDate(?CarbonInterface $referenceDate = null): CarbonImmutable
    {
        $reference = $referenceDate === null
            ? CarbonImmutable::now()
            : CarbonImmutable::instance($referenceDate);

        return (match ($this) {
            self::ThreeMonths => $reference->subMonthsNoOverflow(3),
            self::SixMonths => $reference->subMonthsNoOverflow(6),
            self::OneYear => $reference->subYearNoOverflow(),
            self::OneMonth => $reference->subMonthNoOverflow(),
        })->startOfDay();
    }

    public function isCoveredBy(CarbonInterface $oldestDate, CarbonInterface $latestDate): bool
    {
        return $oldestDate->lessThanOrEqualTo($this->startDate($latestDate));
    }
}
