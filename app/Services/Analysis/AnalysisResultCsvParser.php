<?php

declare(strict_types=1);

namespace App\Services\Analysis;

final class AnalysisResultCsvParser
{
    /**
     * @return array{
     *     row: ?array<string, string>,
     *     errors: array<string, list<string>>
     * }
     */
    public function parse(string $bytes): array
    {
        if (! mb_check_encoding($bytes, 'UTF-8')) {
            return $this->failure('_file', 'CSVはUTF-8で保存してください。');
        }

        $stream = fopen('php://temp', 'w+b');

        if ($stream === false) {
            return $this->failure('_file', 'CSVを解析できませんでした。');
        }

        fwrite($stream, $bytes);
        rewind($stream);
        $rows = [];

        while (($row = fgetcsv($stream, 0, ',', '"', '')) !== false) {
            $values = array_map(
                static fn (?string $value): string => $value ?? '',
                $row,
            );

            if ($this->isBlank($values)) {
                continue;
            }

            $rows[] = $values;
        }

        fclose($stream);

        if ($rows === []) {
            return $this->failure('_file', 'CSVにヘッダーとデータ行が必要です。');
        }

        $header = array_shift($rows);
        $header[0] = preg_replace('/^\xEF\xBB\xBF/', '', $header[0]) ?? $header[0];

        if ($header !== AnalysisResultCsvTemplateBuilder::HEADERS) {
            return $this->failure('_header', 'CSVヘッダーと列順が正しくありません。');
        }

        if (count($rows) !== 1) {
            return $this->failure('_file', 'CSVのデータ行は1行だけにしてください。');
        }

        if (count($rows[0]) !== count($header)) {
            return $this->failure('_file', 'CSVの列数がヘッダーと一致しません。');
        }

        /** @var array<string, string> $combined */
        $combined = array_combine($header, $rows[0]);

        return [
            'row' => $combined,
            'errors' => [],
        ];
    }

    /**
     * @param  list<string>  $row
     */
    private function isBlank(array $row): bool
    {
        foreach ($row as $value) {
            if (trim($value) !== '') {
                return false;
            }
        }

        return true;
    }

    /**
     * @return array{
     *     row: null,
     *     errors: array<string, list<string>>
     * }
     */
    private function failure(string $field, string $message): array
    {
        return [
            'row' => null,
            'errors' => [$field => [$message]],
        ];
    }
}
