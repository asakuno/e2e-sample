<?php

declare(strict_types=1);

namespace App\Http\Resources\News;

use App\Data\News\NewsArticleStockData;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

final class NewsArticleStockResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        /** @var NewsArticleStockData $stock */
        $stock = $this->resource;

        return [
            'id' => $stock->id,
            'symbol' => $stock->symbol,
            'name' => $stock->name,
            'market' => $stock->market,
            'relevance_score' => $stock->relevanceScore,
            'matched_by' => $stock->matchedBy,
        ];
    }
}
