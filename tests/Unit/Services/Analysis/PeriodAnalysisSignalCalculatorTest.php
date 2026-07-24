<?php

declare(strict_types=1);

namespace Tests\Unit\Services\Analysis;

use App\Enums\AnalysisEvidenceType;
use App\Services\Analysis\AnalysisEvidenceClassifier;
use App\Services\Analysis\PeriodAnalysisSignalCalculator;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\Attributes\Test;
use PHPUnit\Framework\TestCase;

final class PeriodAnalysisSignalCalculatorTest extends TestCase
{
    #[Test]
    #[DataProvider('scores')]
    public function impactとconfidenceから境界を含むscoreを算出する(
        int $impact,
        int $confidence,
        float $expected,
    ): void {
        // Act
        $signal = (new PeriodAnalysisSignalCalculator(
            new AnalysisEvidenceClassifier,
        ))->calculate(
            $impact,
            $confidence,
            [[
                'news_key' => 'N001',
                'type' => AnalysisEvidenceType::Context,
                'note' => 'context',
            ]],
            'reason',
        );

        // Assert
        $this->assertSame($expected, $signal['news_score']);
        $this->assertSame($expected, $signal['total_score']);
        $this->assertSame(1, $signal['neutral_count']);
    }

    /**
     * @return array<string, array{int, int, float}>
     */
    public static function scores(): array
    {
        return [
            'positive boundary' => [10, 100, 10.0],
            'negative boundary' => [-10, 100, -10.0],
            'zero confidence' => [10, 0, 0.0],
            'rounding' => [7, 33, 2.31],
        ];
    }
}
