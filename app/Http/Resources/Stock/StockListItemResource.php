<?php

declare(strict_types=1);

namespace App\Http\Resources\Stock;

use App\Data\Stock\StockListItemData;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

final class StockListItemResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        /** @var StockListItemData $stock */
        $stock = $this->resource;

        return [
            'id' => $stock->id,
            'symbol' => $stock->symbol,
            'name' => $stock->name,
            'market' => $stock->market,
            'exchange' => $stock->exchange,
            'country' => $stock->country,
            'currency' => $stock->currency,
            'sector' => $stock->sector,
            'industry' => $stock->industry,
            'is_in_watchlist' => $stock->isInWatchlist,
        ];
    }
}
