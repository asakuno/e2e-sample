<?php

declare(strict_types=1);

namespace App\Http\Resources\Analysis;

use App\Enums\AnalysisBatchStatus;
use App\Models\AnalysisBatch;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

final class AnalysisBatchListItemResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        /** @var AnalysisBatch $batch */
        $batch = $this->resource;
        $status = $batch->getAttribute('status');

        return [
            'public_id' => $batch->public_id,
            'stock' => [
                'id' => $batch->stock->id,
                'symbol' => $batch->stock->symbol,
                'name' => $batch->stock->name,
                'market' => $batch->stock->market,
            ],
            'period_start' => CarbonImmutable::parse($batch->getAttribute('period_start_at'))
                ->setTimezone('Asia/Tokyo')
                ->toDateString(),
            'period_end' => CarbonImmutable::parse($batch->getAttribute('period_end_at'))
                ->setTimezone('Asia/Tokyo')
                ->subDay()
                ->toDateString(),
            'prompt_version' => $batch->prompt_version,
            'status' => $status instanceof AnalysisBatchStatus ? $status->value : $status,
            'status_label' => $status instanceof AnalysisBatchStatus ? $status->label() : '',
            'news_count' => $batch->news_count,
            'source_char_count' => $batch->source_char_count,
            'current_revision' => $batch->currentImport?->revision,
            'updated_at' => $batch->updated_at?->setTimezone('Asia/Tokyo')->toIso8601String(),
        ];
    }
}
