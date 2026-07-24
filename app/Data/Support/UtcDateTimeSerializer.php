<?php

declare(strict_types=1);

namespace App\Data\Support;

use Carbon\CarbonImmutable;
use DateTimeInterface;
use InvalidArgumentException;

final class UtcDateTimeSerializer
{
    public static function serialize(mixed $value): ?string
    {
        if ($value === null) {
            return null;
        }

        $dateTime = $value instanceof DateTimeInterface
            ? CarbonImmutable::instance($value)
            : CarbonImmutable::parse((string) $value);

        return $dateTime->utc()->toIso8601String();
    }

    public static function serializeRequired(mixed $value): string
    {
        return self::serialize($value)
            ?? throw new InvalidArgumentException('A date-time value is required.');
    }
}
