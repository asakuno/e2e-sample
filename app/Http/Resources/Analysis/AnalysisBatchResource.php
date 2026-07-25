<?php

declare(strict_types=1);

namespace App\Http\Resources\Analysis;

use App\Enums\AnalysisBatchStatus;
use App\Models\AnalysisBatch;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

final class AnalysisBatchResource extends JsonResource
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
            'stock' => $batch->stock_snapshot,
            'period_start' => CarbonImmutable::parse($batch->getAttribute('period_start_at'))
                ->setTimezone('Asia/Tokyo')
                ->toDateString(),
            'period_end' => CarbonImmutable::parse($batch->getAttribute('period_end_at'))
                ->setTimezone('Asia/Tokyo')
                ->subDay()
                ->toDateString(),
            'prompt_version' => $batch->prompt_version,
            'result_schema_version' => $batch->result_schema_version,
            'prompt_text' => $batch->prompt_text,
            'prompt_hash' => $batch->prompt_hash,
            'input_hash' => $batch->input_hash,
            'status' => $status instanceof AnalysisBatchStatus ? $status->value : $status,
            'status_label' => $status instanceof AnalysisBatchStatus ? $status->label() : '',
            'news_count' => $batch->news_count,
            'source_char_count' => $batch->source_char_count,
            'exported_at' => $batch->getAttribute('exported_at') === null
                ? null
                : CarbonImmutable::parse($batch->getAttribute('exported_at'))
                    ->setTimezone('Asia/Tokyo')
                    ->toIso8601String(),
            'current_import' => $batch->currentImport === null
                ? null
                : AnalysisImportResource::make($batch->currentImport)->resolve($request),
            'current_result' => $batch->result === null
                ? null
                : PeriodAnalysisResultResource::make($batch->result)->resolve($request),
            'news' => AnalysisBatchNewsResource::collection($batch->newsSnapshots)->resolve($request),
            'imports' => AnalysisImportResource::collection($batch->imports)->resolve($request),
            'created_at' => $batch->created_at?->setTimezone('Asia/Tokyo')->toIso8601String(),
            'updated_at' => $batch->updated_at?->setTimezone('Asia/Tokyo')->toIso8601String(),
        ];
    }
}
