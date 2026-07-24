<?php

declare(strict_types=1);

namespace App\Http\Resources\Analysis;

use App\Enums\AnalysisSentiment;
use App\Enums\AnalysisTimeHorizon;
use App\Models\AnalysisResult;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

final class PeriodAnalysisResultResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        /** @var AnalysisResult $result */
        $result = $this->resource;
        $sentiment = $result->getAttribute('sentiment');
        $timeHorizon = $result->getAttribute('time_horizon');

        return [
            'summary' => $result->summary,
            'sentiment' => $sentiment instanceof AnalysisSentiment ? $sentiment->value : $sentiment,
            'sentiment_label' => $sentiment instanceof AnalysisSentiment ? $sentiment->label() : '',
            'impact_score' => $result->impact_score,
            'confidence_score' => $result->confidence_score,
            'time_horizon' => $timeHorizon instanceof AnalysisTimeHorizon ? $timeHorizon->value : $timeHorizon,
            'time_horizon_label' => $timeHorizon instanceof AnalysisTimeHorizon ? $timeHorizon->label() : '',
            'positive_factors' => $result->positive_factors ?? [],
            'negative_factors' => $result->negative_factors ?? [],
            'risk_points' => $result->risk_points ?? [],
            'evidence_items' => $result->evidence_items ?? [],
            'reason' => $result->reason,
            'model_provider' => $result->model_provider,
            'model_name' => $result->model_name,
            'analyzed_at' => CarbonImmutable::parse($result->getAttribute('analyzed_at'))
                ->setTimezone('Asia/Tokyo')
                ->toIso8601String(),
        ];
    }
}
