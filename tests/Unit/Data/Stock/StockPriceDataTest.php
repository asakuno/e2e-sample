<?php

declare(strict_types=1);

namespace Tests\Unit\Data\Stock;

use App\Data\Stock\StockPriceData;
use App\Models\StockPrice;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

final class StockPriceDataTest extends TestCase
{
    #[Test]
    public function adjusted_closeがある場合はeffective_closeに使用する(): void
    {
        // Arrange
        $price = new StockPrice([
            'price_date' => '2026-07-10',
            'close' => 210,
            'adjusted_close' => 105,
        ]);
        $expected = 105.0;

        // Act
        $actual = StockPriceData::fromModel($price)->effectiveClose;

        // Assert
        $this->assertSame($expected, $actual);
    }

    #[Test]
    public function adjusted_closeがnullの場合はcloseをeffective_closeに使用する(): void
    {
        // Arrange
        $price = new StockPrice([
            'price_date' => '2026-07-10',
            'close' => 210,
            'adjusted_close' => null,
        ]);
        $expected = 210.0;

        // Act
        $actual = StockPriceData::fromModel($price)->effectiveClose;

        // Assert
        $this->assertSame($expected, $actual);
    }
}
