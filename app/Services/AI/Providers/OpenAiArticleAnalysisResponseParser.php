<?php

declare(strict_types=1);

namespace App\Services\AI\Providers;

use App\Data\AI\ArticleAnalysisData;
use App\Enums\AnalysisSentiment;
use App\Enums\AnalysisTimeHorizon;
use JsonException;
use RuntimeException;

final class OpenAiArticleAnalysisResponseParser
{
    private const PROVIDER = 'openai';

    /** @var array<string, array<string, mixed>> */
    private const ANALYSIS_PROPERTIES = [
        'summary' => ['type' => 'string'],
        'sentiment' => [
            'type' => 'string',
            'enum' => ['positive', 'neutral', 'negative'],
        ],
        'impact_score' => [
            'type' => 'integer',
            'minimum' => -10,
            'maximum' => 10,
        ],
        'confidence_score' => [
            'type' => 'integer',
            'minimum' => 0,
            'maximum' => 100,
        ],
        'time_horizon' => [
            'type' => 'string',
            'enum' => ['short_term', 'medium_term', 'long_term', 'unknown'],
        ],
        'positive_factors' => [
            'type' => 'array',
            'items' => ['type' => 'string'],
        ],
        'negative_factors' => [
            'type' => 'array',
            'items' => ['type' => 'string'],
        ],
        'risk_points' => [
            'type' => 'array',
            'items' => ['type' => 'string'],
        ],
        'reason' => ['type' => 'string'],
    ];

    /**
     * @return array<string, mixed>
     */
    public function schema(): array
    {
        return [
            'type' => 'object',
            'properties' => self::ANALYSIS_PROPERTIES,
            'required' => array_keys(self::ANALYSIS_PROPERTIES),
            'additionalProperties' => false,
        ];
    }

    public function parse(mixed $payload, string $promptVersion): ArticleAnalysisData
    {
        if (! is_array($payload)) {
            throw new RuntimeException('OpenAI Responses API returned an invalid JSON response.');
        }

        $status = $payload['status'] ?? null;
        if (is_string($status) && $status !== 'completed') {
            throw new RuntimeException('OpenAI Responses API did not complete the analysis.');
        }

        $analysis = $this->decodeAnalysis($this->extractOutputText($payload));
        [$inputTokens, $outputTokens] = $this->extractUsage($payload);

        return new ArticleAnalysisData(
            summary: $this->nonEmptyString($analysis['summary'], 'summary'),
            sentiment: $this->sentiment($analysis['sentiment']),
            impactScore: $this->integerInRange($analysis['impact_score'], -10, 10, 'impact_score'),
            confidenceScore: $this->integerInRange($analysis['confidence_score'], 0, 100, 'confidence_score'),
            timeHorizon: $this->timeHorizon($analysis['time_horizon']),
            positiveFactors: $this->stringList($analysis['positive_factors'], 'positive_factors'),
            negativeFactors: $this->stringList($analysis['negative_factors'], 'negative_factors'),
            riskPoints: $this->stringList($analysis['risk_points'], 'risk_points'),
            reason: $this->nonEmptyString($analysis['reason'], 'reason'),
            modelProvider: self::PROVIDER,
            modelName: $this->nonEmptyString($payload['model'] ?? null, 'model'),
            promptVersion: $promptVersion,
            inputTokens: $inputTokens,
            outputTokens: $outputTokens,
        );
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    private function extractOutputText(array $payload): string
    {
        $outputText = $payload['output_text'] ?? null;
        if (is_string($outputText) && trim($outputText) !== '') {
            return $outputText;
        }

        $output = $payload['output'] ?? null;
        if (! is_array($output)) {
            throw new RuntimeException('OpenAI response does not contain output text.');
        }

        foreach ($output as $item) {
            if (! is_array($item)) {
                continue;
            }

            $content = $item['content'] ?? null;
            if (! is_array($content)) {
                continue;
            }

            foreach ($content as $part) {
                if (! is_array($part)) {
                    continue;
                }

                if (($part['type'] ?? null) === 'refusal') {
                    throw new RuntimeException('OpenAI refused to analyze the article.');
                }

                $text = $part['text'] ?? null;
                if (($part['type'] ?? null) === 'output_text' && is_string($text) && trim($text) !== '') {
                    return $text;
                }
            }
        }

        throw new RuntimeException('OpenAI response does not contain output text.');
    }

    /**
     * @return array<string, mixed>
     */
    private function decodeAnalysis(string $outputText): array
    {
        try {
            $analysis = json_decode($outputText, true, 512, JSON_THROW_ON_ERROR);
        } catch (JsonException $exception) {
            throw new RuntimeException('OpenAI output_text is not valid JSON.', 0, $exception);
        }

        if (! is_array($analysis) || array_is_list($analysis)) {
            throw new RuntimeException('OpenAI analysis must be a JSON object.');
        }

        $requiredFields = array_keys(self::ANALYSIS_PROPERTIES);
        $actualFields = array_keys($analysis);
        if (array_diff($requiredFields, $actualFields) !== [] || array_diff($actualFields, $requiredFields) !== []) {
            throw new RuntimeException('OpenAI analysis fields do not match the required schema.');
        }

        return $analysis;
    }

    /**
     * @param  array<string, mixed>  $payload
     * @return array{int, int}
     */
    private function extractUsage(array $payload): array
    {
        $usage = $payload['usage'] ?? null;
        if (! is_array($usage)) {
            throw new RuntimeException('OpenAI response does not contain token usage.');
        }

        return [
            $this->integerInRange($usage['input_tokens'] ?? null, 0, PHP_INT_MAX, 'usage.input_tokens'),
            $this->integerInRange($usage['output_tokens'] ?? null, 0, PHP_INT_MAX, 'usage.output_tokens'),
        ];
    }

    private function sentiment(mixed $value): AnalysisSentiment
    {
        return match ($value) {
            'positive' => AnalysisSentiment::Positive,
            'neutral' => AnalysisSentiment::Neutral,
            'negative' => AnalysisSentiment::Negative,
            default => throw new RuntimeException('OpenAI analysis contains an invalid sentiment.'),
        };
    }

    private function timeHorizon(mixed $value): AnalysisTimeHorizon
    {
        return match ($value) {
            'short_term' => AnalysisTimeHorizon::ShortTerm,
            'medium_term' => AnalysisTimeHorizon::MediumTerm,
            'long_term' => AnalysisTimeHorizon::LongTerm,
            'unknown' => AnalysisTimeHorizon::Unknown,
            default => throw new RuntimeException('OpenAI analysis contains an invalid time_horizon.'),
        };
    }

    private function integerInRange(mixed $value, int $minimum, int $maximum, string $field): int
    {
        if (! is_int($value) || $value < $minimum || $value > $maximum) {
            throw new RuntimeException("OpenAI response contains an invalid {$field}.");
        }

        return $value;
    }

    private function nonEmptyString(mixed $value, string $field): string
    {
        if (! is_string($value) || trim($value) === '') {
            throw new RuntimeException("OpenAI response contains an invalid {$field}.");
        }

        return trim($value);
    }

    /**
     * @return list<string>
     */
    private function stringList(mixed $value, string $field): array
    {
        if (! is_array($value) || ! array_is_list($value)) {
            throw new RuntimeException("OpenAI response contains an invalid {$field} array.");
        }

        $normalized = [];
        foreach ($value as $item) {
            if (! is_string($item) || trim($item) === '') {
                throw new RuntimeException("OpenAI response contains an invalid {$field} item.");
            }

            $normalized[] = trim($item);
        }

        return $normalized;
    }
}
