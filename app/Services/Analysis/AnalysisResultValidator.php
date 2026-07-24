<?php

declare(strict_types=1);

namespace App\Services\Analysis;

use App\Enums\AnalysisEvidenceType;
use App\Enums\AnalysisSentiment;
use App\Enums\AnalysisTimeHorizon;
use App\Models\AnalysisBatch;
use JsonException;

final class AnalysisResultValidator
{
    /**
     * @param  array<string, string>  $row
     * @return array{
     *     data: ?array{
     *         schema_version: string,
     *         batch_key: string,
     *         prompt_version: string,
     *         summary: string,
     *         sentiment: AnalysisSentiment,
     *         impact_score: int,
     *         confidence_score: int,
     *         time_horizon: AnalysisTimeHorizon,
     *         positive_factors: list<string>,
     *         negative_factors: list<string>,
     *         risk_points: list<string>,
     *         evidence_items: list<array{
     *             news_key: string,
     *             type: AnalysisEvidenceType,
     *             note: string
     *         }>,
     *         reason: string
     *     },
     *     errors: array<string, list<string>>
     * }
     */
    public function validate(array $row, AnalysisBatch $batch): array
    {
        $errors = [];
        $add = static function (string $field, string $message) use (&$errors): void {
            $errors[$field] ??= [];
            $errors[$field][] = $message;
        };

        $this->validateFixed($row, $batch, $add);
        $summary = trim($row['summary'] ?? '');
        $reason = trim($row['reason'] ?? '');
        $this->validateLength('summary', $summary, 1, 2000, $add);
        $this->validateLength('reason', $reason, 1, 5000, $add);

        $sentiment = match ($row['sentiment'] ?? '') {
            'positive' => AnalysisSentiment::Positive,
            'neutral' => AnalysisSentiment::Neutral,
            'negative' => AnalysisSentiment::Negative,
            default => null,
        };

        if ($sentiment === null) {
            $add('sentiment', 'positive、neutral、negativeのいずれかを指定してください。');
        }

        $timeHorizon = match ($row['time_horizon'] ?? '') {
            'short_term' => AnalysisTimeHorizon::ShortTerm,
            'medium_term' => AnalysisTimeHorizon::MediumTerm,
            'long_term' => AnalysisTimeHorizon::LongTerm,
            'unknown' => AnalysisTimeHorizon::Unknown,
            default => null,
        };

        if ($timeHorizon === null) {
            $add('time_horizon', 'time_horizonの値が正しくありません。');
        }

        $impactScore = $this->integer(
            'impact_score',
            $row['impact_score'] ?? '',
            -10,
            10,
            $add,
        );
        $confidenceScore = $this->integer(
            'confidence_score',
            $row['confidence_score'] ?? '',
            0,
            100,
            $add,
        );
        $positiveFactors = $this->stringList(
            'positive_factors_json',
            $row['positive_factors_json'] ?? '',
            $add,
        );
        $negativeFactors = $this->stringList(
            'negative_factors_json',
            $row['negative_factors_json'] ?? '',
            $add,
        );
        $riskPoints = $this->stringList(
            'risk_points_json',
            $row['risk_points_json'] ?? '',
            $add,
        );
        $evidenceItems = $this->evidence(
            $row['evidence_items_json'] ?? '',
            $batch,
            $add,
        );

        if (
            $errors !== []
            || $sentiment === null
            || $timeHorizon === null
            || $impactScore === null
            || $confidenceScore === null
        ) {
            return ['data' => null, 'errors' => $errors];
        }

        return [
            'data' => [
                'schema_version' => $row['schema_version'],
                'batch_key' => $row['batch_key'],
                'prompt_version' => $row['prompt_version'],
                'summary' => $summary,
                'sentiment' => $sentiment,
                'impact_score' => $impactScore,
                'confidence_score' => $confidenceScore,
                'time_horizon' => $timeHorizon,
                'positive_factors' => $positiveFactors,
                'negative_factors' => $negativeFactors,
                'risk_points' => $riskPoints,
                'evidence_items' => $evidenceItems,
                'reason' => $reason,
            ],
            'errors' => [],
        ];
    }

    /**
     * @param  array<string, string>  $row
     * @param  callable(string, string): void  $add
     */
    private function validateFixed(array $row, AnalysisBatch $batch, callable $add): void
    {
        if (($row['schema_version'] ?? '') !== (string) config('stock_analysis.result_schema_version')) {
            $add('schema_version', 'CSV schema versionが一致しません。');
        }

        if (($row['batch_key'] ?? '') !== $batch->public_id) {
            $add('batch_key', '対象の分析バッチキーと一致しません。');
        }

        if (($row['prompt_version'] ?? '') !== $batch->prompt_version) {
            $add('prompt_version', '対象のprompt versionと一致しません。');
        }
    }

    /**
     * @param  callable(string, string): void  $add
     */
    private function validateLength(
        string $field,
        string $value,
        int $min,
        int $max,
        callable $add,
    ): void {
        $length = mb_strlen($value, 'UTF-8');

        if ($length < $min || $length > $max) {
            $add($field, "{$field}は{$min}〜{$max}文字で入力してください。");
        }
    }

    /**
     * @param  callable(string, string): void  $add
     */
    private function integer(
        string $field,
        string $value,
        int $min,
        int $max,
        callable $add,
    ): ?int {
        if (preg_match('/^-?\d+$/', $value) !== 1) {
            $add($field, "{$field}は整数で入力してください。");

            return null;
        }

        $integer = (int) $value;

        if ($integer < $min || $integer > $max) {
            $add($field, "{$field}は{$min}〜{$max}で入力してください。");

            return null;
        }

        return $integer;
    }

    /**
     * @param  callable(string, string): void  $add
     * @return list<string>
     */
    private function stringList(string $field, string $json, callable $add): array
    {
        try {
            $decoded = json_decode($json, true, flags: JSON_THROW_ON_ERROR);
        } catch (JsonException) {
            $add($field, "{$field}は妥当なJSON配列にしてください。");

            return [];
        }

        if (! is_array($decoded) || ! array_is_list($decoded) || count($decoded) > 20) {
            $add($field, "{$field}は20件以内の文字列配列にしてください。");

            return [];
        }

        $result = [];

        foreach ($decoded as $value) {
            if (! is_string($value) || mb_strlen($value, 'UTF-8') < 1 || mb_strlen($value, 'UTF-8') > 500) {
                $add($field, "{$field}の各要素は1〜500文字の文字列にしてください。");

                continue;
            }

            $result[] = $value;
        }

        return $result;
    }

    /**
     * @param  callable(string, string): void  $add
     * @return list<array{
     *     news_key: string,
     *     type: AnalysisEvidenceType,
     *     note: string
     * }>
     */
    private function evidence(string $json, AnalysisBatch $batch, callable $add): array
    {
        try {
            $decoded = json_decode($json, true, flags: JSON_THROW_ON_ERROR);
        } catch (JsonException) {
            $add('evidence_items_json', 'evidence_items_jsonは妥当なJSON配列にしてください。');

            return [];
        }

        if (! is_array($decoded) || ! array_is_list($decoded) || count($decoded) < 1 || count($decoded) > 50) {
            $add('evidence_items_json', 'evidenceは1〜50件の配列にしてください。');

            return [];
        }

        $allowedNewsKeys = $batch->newsSnapshots()->pluck('news_key')->all();
        $result = [];

        foreach ($decoded as $index => $item) {
            if (! is_array($item) || array_is_list($item)) {
                $add('evidence_items_json', 'evidence #'.($index + 1).'はオブジェクトにしてください。');

                continue;
            }

            $keys = array_keys($item);
            sort($keys);

            if ($keys !== ['news_key', 'note', 'type']) {
                $add('evidence_items_json', 'evidence #'.($index + 1).'のキーが正しくありません。');

                continue;
            }

            $newsKey = $item['news_key'];
            $type = $item['type'];
            $note = $item['note'];

            if (! is_string($newsKey) || ! in_array($newsKey, $allowedNewsKeys, true)) {
                $add('evidence_items_json', 'evidence #'.($index + 1).'に未知のnews_keyがあります。');

                continue;
            }

            $evidenceType = is_string($type) ? AnalysisEvidenceType::tryFrom($type) : null;

            if ($evidenceType === null) {
                $add('evidence_items_json', 'evidence #'.($index + 1).'のtypeが正しくありません。');

                continue;
            }

            if (! is_string($note) || mb_strlen($note, 'UTF-8') < 1 || mb_strlen($note, 'UTF-8') > 1000) {
                $add('evidence_items_json', 'evidence #'.($index + 1).'のnoteは1〜1,000文字にしてください。');

                continue;
            }

            $result[] = [
                'news_key' => $newsKey,
                'type' => $evidenceType,
                'note' => $note,
            ];
        }

        return $result;
    }
}
