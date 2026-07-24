<?php

declare(strict_types=1);

namespace Tests\Unit\Services;

use App\Enums\AnalysisSentiment;
use App\Models\AnalysisResult;
use App\Models\NewsArticle;
use App\Services\StockSignalService;
use Carbon\CarbonImmutable;
use Tests\TestCase;

final class StockSignalServiceTest extends TestCase
{
    public function test_it_calculates_a_deterministic_freshness_and_confidence_weighted_score(): void
    {
        // Arrange
        $asOf = CarbonImmutable::parse('2026-07-12 12:00:00 UTC');
        $analyses = [
            $this->analysis(AnalysisSentiment::Positive, 10, 100, $asOf),
            $this->analysis(
                AnalysisSentiment::Negative,
                -10,
                50,
                $asOf->subDay(),
                $asOf,
            ),
            $this->analysis(
                AnalysisSentiment::Neutral,
                10,
                100,
                $asOf->subDays(7)->subSecond(),
                $asOf,
            ),
        ];

        // Act
        $result = (new StockSignalService)->generate($analyses, $asOf);

        // Assert
        // Weights are 1.0 and (1 / (1 + 1 day)) * 0.5 = 0.25.
        $this->assertSame(6.0, $result->newsScore);
        $this->assertSame(0.0, $result->disclosureScore);
        $this->assertSame(0.0, $result->macroScore);
        $this->assertSame(6.0, $result->totalScore);
        $this->assertSame(1, $result->positiveCount);
        $this->assertSame(1, $result->negativeCount);
        $this->assertSame(0, $result->neutralCount);
        $this->assertStringContainsString('公開日の鮮度と信頼度で加重平均', $result->reason);
        $this->assertStringContainsString('6.00', $result->reason);
    }

    public function test_it_includes_an_analysis_exactly_seven_days_old(): void
    {
        // Arrange
        $asOf = CarbonImmutable::parse('2026-07-12 12:00:00 UTC');
        $analysis = $this->analysis(
            AnalysisSentiment::Positive,
            8,
            100,
            $asOf->subDays(7),
            $asOf,
        );

        // Act
        $result = (new StockSignalService)->generate([$analysis], $asOf);

        // Assert
        $this->assertSame(8.0, $result->newsScore);
        $this->assertSame(1, $result->positiveCount);
    }

    public function test_it_returns_a_neutral_signal_when_there_are_no_recent_analyses(): void
    {
        // Arrange
        $asOf = CarbonImmutable::parse('2026-07-12 12:00:00 UTC');
        $analysisWithoutPublication = new AnalysisResult([
            'sentiment' => AnalysisSentiment::Neutral,
            'impact_score' => 0,
            'confidence_score' => 100,
            'analyzed_at' => $asOf,
        ]);
        $analysisWithoutPublication->setRelation('analysable', new NewsArticle([
            'published_at' => null,
        ]));
        $analyses = [
            $this->analysis(AnalysisSentiment::Negative, -9, 100, $asOf->subDays(8)),
            $this->analysis(AnalysisSentiment::Positive, 9, 100, $asOf->addSecond()),
            $analysisWithoutPublication,
        ];

        // Act
        $result = (new StockSignalService)->generate($analyses, $asOf);

        // Assert
        $this->assertSame(0.0, $result->newsScore);
        $this->assertSame(0.0, $result->totalScore);
        $this->assertSame(0, $result->positiveCount);
        $this->assertSame(0, $result->negativeCount);
        $this->assertSame(0, $result->neutralCount);
        $this->assertSame(
            '直近7日間に公開された記事の分析結果がないため、シグナルスコアは0.00です。',
            $result->reason,
        );
    }

    public function test_古い記事を今日分析しても7日間のシグナルへ含めない(): void
    {
        // Arrange
        $asOf = CarbonImmutable::parse('2026-07-12 12:00:00 UTC');
        $analysis = $this->analysis(
            AnalysisSentiment::Positive,
            10,
            100,
            $asOf->subDays(8),
            $asOf,
        );

        // Act
        $result = (new StockSignalService)->generate([$analysis], $asOf);

        // Assert
        $this->assertSame(0.0, $result->newsScore);
        $this->assertSame(0, $result->positiveCount);
    }

    public function test_it_counts_zero_confidence_analyses_without_allowing_them_to_move_the_score(): void
    {
        // Arrange
        $asOf = CarbonImmutable::parse('2026-07-12 12:00:00 UTC');
        $analysis = $this->analysis(AnalysisSentiment::Negative, -10, 0, $asOf);

        // Act
        $result = (new StockSignalService)->generate([$analysis], $asOf);

        // Assert
        $this->assertSame(0.0, $result->newsScore);
        $this->assertSame(0, $result->positiveCount);
        $this->assertSame(1, $result->negativeCount);
        $this->assertSame(0, $result->neutralCount);
        $this->assertStringContainsString('すべて信頼度0', $result->reason);
    }

    public function test_it_clamps_source_and_total_scores_to_the_supported_range(): void
    {
        // Arrange
        $asOf = CarbonImmutable::parse('2026-07-12 12:00:00 UTC');
        $analysis = $this->analysis(AnalysisSentiment::Positive, 99, 100, $asOf);

        // Act
        $result = (new StockSignalService)->generate([$analysis], $asOf);

        // Assert
        $this->assertSame(10.0, $result->newsScore);
        $this->assertSame(10.0, $result->totalScore);
    }

    private function analysis(
        AnalysisSentiment $sentiment,
        int $impactScore,
        int $confidenceScore,
        CarbonImmutable $publishedAt,
        ?CarbonImmutable $analyzedAt = null,
    ): AnalysisResult {
        $analysis = new AnalysisResult([
            'sentiment' => $sentiment,
            'impact_score' => $impactScore,
            'confidence_score' => $confidenceScore,
            'analyzed_at' => $analyzedAt ?? $publishedAt,
        ]);
        $analysis->setRelation('analysable', new NewsArticle([
            'published_at' => $publishedAt,
        ]));

        return $analysis;
    }
}
