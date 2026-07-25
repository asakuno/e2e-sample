<?php

declare(strict_types=1);

namespace App\Services\Analysis;

use App\Enums\AnalysisEvidenceType;

final class PeriodAnalysisSignalCalculator
{
    public function __construct(
        private readonly AnalysisEvidenceClassifier $classifier,
    ) {}

    /**
     * @param  list<array{
     *     news_key: string,
     *     type: AnalysisEvidenceType,
     *     note: string
     * }>  $evidenceItems
     * @return array{
     *     news_score: float,
     *     disclosure_score: float,
     *     macro_score: float,
     *     total_score: float,
     *     positive_count: int,
     *     negative_count: int,
     *     neutral_count: int,
     *     reason: string
     * }
     */
    public function calculate(
        int $impactScore,
        int $confidenceScore,
        array $evidenceItems,
        string $reason,
    ): array {
        $newsScore = round($impactScore * $confidenceScore / 100, 2);
        $counts = $this->classifier->classify($evidenceItems);

        return [
            'news_score' => $newsScore,
            'disclosure_score' => 0.0,
            'macro_score' => 0.0,
            'total_score' => $newsScore,
            'positive_count' => $counts['positive'],
            'negative_count' => $counts['negative'],
            'neutral_count' => $counts['neutral'],
            'reason' => $reason,
        ];
    }
}
