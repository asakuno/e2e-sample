<?php

declare(strict_types=1);

namespace Tests\Unit\Services\Stock;

use App\Enums\StockPricePeriod;
use App\Services\Stock\StockPricePeriodAvailabilityService;
use Carbon\CarbonImmutable;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

final class StockPricePeriodAvailabilityServiceTest extends TestCase
{
    #[Test]
    public function 不足している指定期間を既定の一か月へフォールバックする(): void
    {
        // Arrange
        $service = new StockPricePeriodAvailabilityService;

        // Act
        $result = $service->resolve(
            requestedPeriod: StockPricePeriod::SixMonths,
            oldestDate: CarbonImmutable::parse('2026-04-03'),
            latestDate: CarbonImmutable::parse('2026-07-12'),
        );

        // Assert
        $this->assertSame(StockPricePeriod::OneMonth, $result->selectedPeriod);
        $this->assertSame(
            [true, true, false, false],
            array_column($result->periodOptions, 'available'),
        );
        $this->assertSame(
            '指定期間の価格履歴が不足しているため、1Mを表示しています。',
            $result->notice,
        );
    }

    #[Test]
    public function 一か月未満の履歴では全期間を選択不可にする(): void
    {
        // Arrange
        $service = new StockPricePeriodAvailabilityService;

        // Act
        $result = $service->resolve(
            requestedPeriod: StockPricePeriod::OneMonth,
            oldestDate: CarbonImmutable::parse('2026-06-20'),
            latestDate: CarbonImmutable::parse('2026-07-12'),
        );

        // Assert
        $this->assertSame(StockPricePeriod::OneMonth, $result->selectedPeriod);
        $this->assertSame(
            [false, false, false, false],
            array_column($result->periodOptions, 'available'),
        );
        $this->assertSame(
            '価格履歴が1か月分に満たないため、取得済みの範囲のみ表示しています。',
            $result->notice,
        );
    }

    #[Test]
    public function 価格履歴がなければ専用の注意文を返す(): void
    {
        // Arrange
        $service = new StockPricePeriodAvailabilityService;

        // Act
        $result = $service->resolve(
            requestedPeriod: StockPricePeriod::ThreeMonths,
            oldestDate: null,
            latestDate: null,
        );

        // Assert
        $this->assertSame(StockPricePeriod::OneMonth, $result->selectedPeriod);
        $this->assertSame('価格履歴がないため、期間を選択できません。', $result->notice);
    }
}
