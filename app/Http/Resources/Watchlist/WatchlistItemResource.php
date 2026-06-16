<?php

declare(strict_types=1);

namespace App\Http\Resources\Watchlist;

use App\Data\Watchlist\WatchlistItemData;
use App\Http\Resources\Stock\StockListItemResource;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

final class WatchlistItemResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        /** @var WatchlistItemData $watchlist */
        $watchlist = $this->resource;

        return [
            'id' => $watchlist->id,
            'stock' => StockListItemResource::make($watchlist->stock)->resolve($request),
            'memo' => $watchlist->memo,
            'priority' => $watchlist->priority,
            'is_active' => $watchlist->isActive,
        ];
    }
}
