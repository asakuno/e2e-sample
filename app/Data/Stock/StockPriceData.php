<?php

declare(strict_types=1);

namespace App\Data\Stock;

use App\Models\StockPrice;
use Illuminate\Support\Carbon;
use Spatie\LaravelData\Attributes\MapName;
use Spatie\LaravelData\Data;
use Spatie\LaravelData\Mappers\SnakeCaseMapper;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

#[TypeScript()]
#[MapName(SnakeCaseMapper::class)]
final class StockPriceData extends Data
{
    public function __construct(
        public readonly string $priceDate,
        public readonly ?float $open,
        public readonly ?float $high,
        public readonly ?float $low,
        public readonly ?float $close,
        public readonly ?float $adjustedClose,
        public readonly ?float $effectiveClose,
        public readonly ?int $volume,
    ) {}

    public static function fromModel(StockPrice $price): self
    {
        $close = self::nullableFloat($price->close);
        $adjustedClose = self::nullableFloat($price->adjusted_close);

        return new self(
            priceDate: Carbon::parse($price->price_date)->toDateString(),
            open: self::nullableFloat($price->open),
            high: self::nullableFloat($price->high),
            low: self::nullableFloat($price->low),
            close: $close,
            adjustedClose: $adjustedClose,
            effectiveClose: $adjustedClose ?? $close,
            volume: $price->volume,
        );
    }

    private static function nullableFloat(mixed $value): ?float
    {
        return $value === null ? null : (float) $value;
    }
}
