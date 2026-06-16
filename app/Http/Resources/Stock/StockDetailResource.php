<?php

declare(strict_types=1);

namespace App\Http\Resources\Stock;

use App\Data\Stock\StockDetailData;
use App\Http\Resources\News\NewsAnalysisResource;
use App\Http\Resources\News\NewsArticleResource;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

final class StockDetailResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        /** @var StockDetailData $stock */
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
            'description' => $stock->description,
            'latest_price' => $stock->latestPrice === null
                ? null
                : StockPriceResource::make($stock->latestPrice)->resolve($request),
            'price_history' => StockPriceResource::collection($stock->priceHistory)->resolve($request),
            'related_news' => NewsArticleResource::collection($stock->relatedNews)->resolve($request),
            'analyses' => NewsAnalysisResource::collection($stock->analyses)->resolve($request),
            'signals' => StockSignalResource::collection($stock->signals)->resolve($request),
            'selected_period' => $stock->selectedPeriod->value,
            'period_options' => $stock->periodOptions,
        ];
    }
}
