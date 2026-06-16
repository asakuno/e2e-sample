<?php

declare(strict_types=1);

namespace App\Http\Resources\News;

use App\Data\News\NewsArticleData;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

final class NewsArticleResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        /** @var NewsArticleData $article */
        $article = $this->resource;

        return [
            'id' => $article->id,
            'title' => $article->title,
            'summary' => $article->summary,
            'url' => $article->url,
            'source' => $article->source,
            'provider' => $article->provider,
            'language' => $article->language,
            'published_at' => $article->publishedAt,
            'stocks' => NewsArticleStockResource::collection($article->stocks)->resolve($request),
            'analyses' => NewsAnalysisResource::collection($article->analyses)->resolve($request),
        ];
    }
}
