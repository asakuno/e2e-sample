<?php

declare(strict_types=1);

namespace Tests\Unit\Data\Support;

use App\Data\Support\UtcDateTimeSerializer;
use Carbon\CarbonImmutable;
use PHPUnit\Framework\Attributes\Test;
use PHPUnit\Framework\TestCase;

final class UtcDateTimeSerializerTest extends TestCase
{
    #[Test]
    public function 日時を協定世界時のタイムゾーン付き形式へ正規化できる(): void
    {
        // Arrange
        $dateTime = CarbonImmutable::parse('2026-07-11 23:30:00', 'Asia/Tokyo');

        // Act
        $serialized = UtcDateTimeSerializer::serialize($dateTime);

        // Assert
        $this->assertSame('2026-07-11T14:30:00+00:00', $serialized);
    }

    #[Test]
    public function nullはnullのまま返す(): void
    {
        $this->assertNull(UtcDateTimeSerializer::serialize(null));
    }
}
