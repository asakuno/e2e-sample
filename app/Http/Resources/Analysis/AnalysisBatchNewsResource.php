<?php

declare(strict_types=1);

namespace App\Http\Resources\Analysis;

use App\Models\AnalysisBatchNews;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

final class AnalysisBatchNewsResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        /** @var AnalysisBatchNews $snapshot */
        $snapshot = $this->resource;

        return [
            'news_key' => $snapshot->news_key,
            'position' => $snapshot->position,
            'title' => $snapshot->title,
            'summary' => $snapshot->summary,
            'body' => $snapshot->body,
            'source' => $snapshot->source,
            'url' => $snapshot->url,
            'published_at' => CarbonImmutable::parse($snapshot->getAttribute('published_at'))
                ->setTimezone('Asia/Tokyo')
                ->toIso8601String(),
            'content_hash' => $snapshot->content_hash,
            'snapshot_hash' => $snapshot->snapshot_hash,
        ];
    }
}
