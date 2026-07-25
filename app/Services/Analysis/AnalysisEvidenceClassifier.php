<?php

declare(strict_types=1);

namespace App\Services\Analysis;

use App\Enums\AnalysisEvidenceType;

final class AnalysisEvidenceClassifier
{
    /**
     * @param  list<array{
     *     news_key: string,
     *     type: AnalysisEvidenceType,
     *     note: string
     * }>  $evidenceItems
     * @return array{positive: int, negative: int, neutral: int}
     */
    public function classify(array $evidenceItems): array
    {
        $priorities = [
            AnalysisEvidenceType::Context->value => 1,
            AnalysisEvidenceType::Positive->value => 2,
            AnalysisEvidenceType::Risk->value => 3,
            AnalysisEvidenceType::Negative->value => 4,
        ];
        $classificationByNewsKey = [];

        foreach ($evidenceItems as $item) {
            $current = $classificationByNewsKey[$item['news_key']] ?? null;

            if ($current === null || $priorities[$item['type']->value] > $priorities[$current->value]) {
                $classificationByNewsKey[$item['news_key']] = $item['type'];
            }
        }

        $counts = ['positive' => 0, 'negative' => 0, 'neutral' => 0];

        foreach ($classificationByNewsKey as $type) {
            match ($type) {
                AnalysisEvidenceType::Positive => $counts['positive']++,
                AnalysisEvidenceType::Negative,
                AnalysisEvidenceType::Risk => $counts['negative']++,
                AnalysisEvidenceType::Context => $counts['neutral']++,
            };
        }

        return $counts;
    }
}
