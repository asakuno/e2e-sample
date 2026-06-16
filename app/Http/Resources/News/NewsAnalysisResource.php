<?php

declare(strict_types=1);

namespace App\Http\Resources\News;

use App\Data\News\NewsAnalysisData;
use App\Http\Resources\Stock\StockListItemResource;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

final class NewsAnalysisResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        /** @var NewsAnalysisData $analysis */
        $analysis = $this->resource;

        return [
            'id' => $analysis->id,
            'stock' => StockListItemResource::make($analysis->stock)->resolve($request),
            'summary' => $analysis->summary,
            'sentiment' => $analysis->sentiment,
            'sentiment_label' => $analysis->sentimentLabel,
            'impact_score' => $analysis->impactScore,
            'confidence_score' => $analysis->confidenceScore,
            'analyzed_at' => $analysis->analyzedAt,
        ];
    }
}
