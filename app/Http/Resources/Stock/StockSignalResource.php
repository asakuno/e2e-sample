<?php

declare(strict_types=1);

namespace App\Http\Resources\Stock;

use App\Data\Stock\StockSignalData;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

final class StockSignalResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        /** @var StockSignalData $signal */
        $signal = $this->resource;

        return [
            'id' => $signal->id,
            'signal_date' => $signal->signalDate,
            'news_score' => $signal->newsScore,
            'disclosure_score' => $signal->disclosureScore,
            'macro_score' => $signal->macroScore,
            'total_score' => $signal->totalScore,
            'positive_count' => $signal->positiveCount,
            'negative_count' => $signal->negativeCount,
            'neutral_count' => $signal->neutralCount,
            'reason' => $signal->reason,
            'generated_at' => $signal->generatedAt,
        ];
    }
}
