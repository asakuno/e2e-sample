<?php

declare(strict_types=1);

namespace App\Http\Resources\Stock;

use App\Data\Stock\StockPriceData;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

final class StockPriceResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        /** @var StockPriceData $price */
        $price = $this->resource;

        return [
            'price_date' => $price->priceDate,
            'open' => $price->open,
            'high' => $price->high,
            'low' => $price->low,
            'close' => $price->close,
            'adjusted_close' => $price->adjustedClose,
            'volume' => $price->volume,
        ];
    }
}
