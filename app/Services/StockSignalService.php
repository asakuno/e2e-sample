<?php

declare(strict_types=1);

namespace App\Services;

use App\Data\Signal\GeneratedStockSignalData;
use App\Enums\AnalysisSentiment;
use App\Models\AnalysisResult;
use App\Models\NewsArticle;
use Carbon\CarbonImmutable;
use Carbon\CarbonInterface;
use RuntimeException;

final class StockSignalService
{
    private const WINDOW_DAYS = 7;

    private const SECONDS_PER_DAY = 86_400;

    /**
     * The news score is the weighted mean of impact_score. Each result's weight is:
     *
     * article publication freshness (1 / (1 + elapsed days)) *
     * confidence (confidence_score / 100).
     *
     * @param  iterable<AnalysisResult>  $analysisResults
     */
    public function generate(
        iterable $analysisResults,
        ?CarbonInterface $asOf = null,
    ): GeneratedStockSignalData {
        $reference = $asOf === null
            ? CarbonImmutable::now()
            : CarbonImmutable::instance($asOf);
        $referenceTimestamp = $reference->getTimestamp();
        $windowStartTimestamp = $reference->subDays(self::WINDOW_DAYS)->getTimestamp();

        $weightedImpactTotal = 0.0;
        $weightTotal = 0.0;
        $positiveCount = 0;
        $negativeCount = 0;
        $neutralCount = 0;

        foreach ($analysisResults as $analysisResult) {
            $publishedAt = $this->publishedAt($analysisResult);
            if ($publishedAt === null) {
                continue;
            }

            $publishedTimestamp = $publishedAt->getTimestamp();
            if ($publishedTimestamp < $windowStartTimestamp || $publishedTimestamp > $referenceTimestamp) {
                continue;
            }

            $sentiment = $this->sentiment($analysisResult);
            match ($sentiment) {
                AnalysisSentiment::Positive => $positiveCount++,
                AnalysisSentiment::Negative => $negativeCount++,
                AnalysisSentiment::Neutral => $neutralCount++,
            };

            $elapsedDays = ($referenceTimestamp - $publishedTimestamp) / self::SECONDS_PER_DAY;
            $freshnessWeight = 1 / (1 + $elapsedDays);
            $confidenceWeight = $this->clamp(
                (float) $analysisResult->getAttribute('confidence_score'),
                0,
                100,
            ) / 100;
            $weight = $freshnessWeight * $confidenceWeight;

            if ($weight === 0.0) {
                continue;
            }

            $impactScore = $this->clamp(
                (float) $analysisResult->getAttribute('impact_score'),
                -10,
                10,
            );
            $weightedImpactTotal += $impactScore * $weight;
            $weightTotal += $weight;
        }

        $analysisCount = $positiveCount + $negativeCount + $neutralCount;
        $newsScore = $weightTotal === 0.0
            ? 0.0
            : $this->roundedScore($weightedImpactTotal / $weightTotal);

        return new GeneratedStockSignalData(
            newsScore: $newsScore,
            disclosureScore: 0.0,
            macroScore: 0.0,
            totalScore: $this->roundedScore($newsScore),
            positiveCount: $positiveCount,
            negativeCount: $negativeCount,
            neutralCount: $neutralCount,
            reason: $this->reason(
                analysisCount: $analysisCount,
                positiveCount: $positiveCount,
                negativeCount: $negativeCount,
                neutralCount: $neutralCount,
                newsScore: $newsScore,
                hasWeightedAnalysis: $weightTotal > 0.0,
            ),
        );
    }

    private function publishedAt(AnalysisResult $analysisResult): ?CarbonImmutable
    {
        $newsArticle = $analysisResult->getRelationValue('analysable');
        if (! $newsArticle instanceof NewsArticle) {
            return null;
        }

        $value = $newsArticle->getAttribute('published_at');
        if ($value === null) {
            return null;
        }

        if ($value instanceof CarbonInterface) {
            return CarbonImmutable::instance($value);
        }

        return CarbonImmutable::parse((string) $value);
    }

    private function sentiment(AnalysisResult $analysisResult): AnalysisSentiment
    {
        $value = $analysisResult->getAttribute('sentiment');
        if ($value instanceof AnalysisSentiment) {
            return $value;
        }

        if (! is_int($value) && ! (is_string($value) && preg_match('/^-?\d+$/D', $value) === 1)) {
            throw new RuntimeException('Analysis result contains an invalid sentiment.');
        }

        $sentiment = AnalysisSentiment::tryFrom((int) $value);
        if ($sentiment === null) {
            throw new RuntimeException('Analysis result contains an invalid sentiment.');
        }

        return $sentiment;
    }

    private function roundedScore(float $score): float
    {
        $rounded = round($this->clamp($score, -10, 10), 2);

        return abs($rounded) < 0.005 ? 0.0 : $rounded;
    }

    private function clamp(float $value, float $minimum, float $maximum): float
    {
        return max($minimum, min($maximum, $value));
    }

    private function reason(
        int $analysisCount,
        int $positiveCount,
        int $negativeCount,
        int $neutralCount,
        float $newsScore,
        bool $hasWeightedAnalysis,
    ): string {
        if ($analysisCount === 0) {
            return '直近7日間に公開された記事の分析結果がないため、シグナルスコアは0.00です。';
        }

        if (! $hasWeightedAnalysis) {
            return sprintf(
                '直近7日間に公開された記事の分析%d件（ポジティブ%d件、ネガティブ%d件、中立%d件）はすべて信頼度0のため、シグナルスコアは0.00です。',
                $analysisCount,
                $positiveCount,
                $negativeCount,
                $neutralCount,
            );
        }

        return sprintf(
            '直近7日間に公開された記事の分析%d件（ポジティブ%d件、ネガティブ%d件、中立%d件）を公開日の鮮度と信頼度で加重平均しました。ニューススコアは%.2fです。',
            $analysisCount,
            $positiveCount,
            $negativeCount,
            $neutralCount,
            $newsScore,
        );
    }
}
