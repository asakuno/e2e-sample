<?php

declare(strict_types=1);

namespace App\Data\News;

use App\Models\NewsArticle;
use Illuminate\Support\Carbon;
use Spatie\LaravelData\Attributes\MapName;
use Spatie\LaravelData\Data;
use Spatie\LaravelData\Mappers\SnakeCaseMapper;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

#[TypeScript()]
#[MapName(SnakeCaseMapper::class)]
final class NewsArticleData extends Data
{
    /**
     * @param  array<int, NewsArticleStockData>  $stocks
     * @param  array<int, NewsAnalysisData>  $analyses
     */
    public function __construct(
        public readonly int $id,
        public readonly string $title,
        public readonly ?string $summary,
        public readonly string $url,
        public readonly ?string $source,
        public readonly string $provider,
        public readonly ?string $language,
        public readonly ?string $publishedAt,
        public readonly array $stocks,
        public readonly array $analyses,
    ) {}

    public static function fromModel(NewsArticle $article): self
    {
        return new self(
            id: $article->id,
            title: $article->title,
            summary: $article->summary,
            url: $article->url,
            source: $article->source,
            provider: $article->provider,
            language: $article->language,
            publishedAt: $article->published_at === null
                ? null
                : Carbon::parse($article->published_at)->toDateTimeString(),
            stocks: $article->stocks
                ->map(fn ($stock): NewsArticleStockData => NewsArticleStockData::fromModel($stock))
                ->all(),
            analyses: $article->analysisResults
                ->map(fn ($analysisResult): NewsAnalysisData => NewsAnalysisData::fromModel($analysisResult))
                ->all(),
        );
    }
}
