<?php

declare(strict_types=1);

namespace Tests\Unit\Services\Analysis;

use App\Enums\AnalysisEvidenceType;
use App\Services\Analysis\AnalysisEvidenceClassifier;
use PHPUnit\Framework\Attributes\Test;
use PHPUnit\Framework\TestCase;

final class AnalysisEvidenceClassifierTest extends TestCase
{
    #[Test]
    public function news_keyごとにnegative_risk_positive_contextの優先順で一分類する(): void
    {
        // Act
        $counts = (new AnalysisEvidenceClassifier)->classify([
            ['news_key' => 'N001', 'type' => AnalysisEvidenceType::Context, 'note' => 'context'],
            ['news_key' => 'N001', 'type' => AnalysisEvidenceType::Positive, 'note' => 'positive'],
            ['news_key' => 'N001', 'type' => AnalysisEvidenceType::Risk, 'note' => 'risk'],
            ['news_key' => 'N001', 'type' => AnalysisEvidenceType::Negative, 'note' => 'negative'],
            ['news_key' => 'N002', 'type' => AnalysisEvidenceType::Risk, 'note' => 'risk'],
            ['news_key' => 'N003', 'type' => AnalysisEvidenceType::Positive, 'note' => 'positive'],
            ['news_key' => 'N004', 'type' => AnalysisEvidenceType::Context, 'note' => 'context'],
        ]);

        // Assert
        $this->assertSame([
            'positive' => 1,
            'negative' => 2,
            'neutral' => 1,
        ], $counts);
    }
}
