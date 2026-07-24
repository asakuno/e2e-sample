<?php

declare(strict_types=1);

namespace App\Services\Analysis;

use RuntimeException;

final class AnalysisResultCsvTemplateBuilder
{
    /**
     * @var list<string>
     */
    public const HEADERS = [
        'schema_version',
        'batch_key',
        'prompt_version',
        'summary',
        'sentiment',
        'impact_score',
        'confidence_score',
        'time_horizon',
        'positive_factors_json',
        'negative_factors_json',
        'risk_points_json',
        'evidence_items_json',
        'reason',
    ];

    public function build(string $schemaVersion, string $batchKey, string $promptVersion): string
    {
        $stream = fopen('php://temp', 'w+b');

        if ($stream === false) {
            throw new RuntimeException('CSVテンプレートを生成できませんでした。');
        }

        fputcsv($stream, self::HEADERS, ',', '"', '');
        fputcsv($stream, [
            $schemaVersion,
            $batchKey,
            $promptVersion,
            '',
            '',
            '',
            '',
            '',
            '',
            '',
            '',
            '',
            '',
        ], ',', '"', '');
        rewind($stream);
        $csv = stream_get_contents($stream);
        fclose($stream);

        if ($csv === false) {
            throw new RuntimeException('CSVテンプレートを読み出せませんでした。');
        }

        return $csv;
    }
}
