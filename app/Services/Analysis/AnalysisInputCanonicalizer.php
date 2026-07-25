<?php

declare(strict_types=1);

namespace App\Services\Analysis;

use JsonException;

final class AnalysisInputCanonicalizer
{
    public function normalizeString(?string $value): ?string
    {
        return $value === null ? null : str_replace(["\r\n", "\r"], "\n", $value);
    }

    /**
     * @param  array<string, mixed>  $payload
     *
     * @throws JsonException
     */
    public function toJson(array $payload): string
    {
        return json_encode(
            $payload,
            JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES,
        );
    }

    /**
     * @param  array<string, mixed>  $payload
     *
     * @throws JsonException
     */
    public function hash(array $payload): string
    {
        return hash('sha256', $this->toJson($payload));
    }

    /**
     * @param  list<array{
     *     title: string,
     *     summary: ?string,
     *     body: ?string,
     *     source: ?string,
     *     url: string
     * }>  $snapshots
     */
    public function sourceCharacterCount(array $snapshots): int
    {
        $count = 0;

        foreach ($snapshots as $snapshot) {
            foreach (['title', 'summary', 'body', 'source', 'url'] as $field) {
                $value = $this->normalizeString($snapshot[$field]);
                $count += $value === null ? 0 : mb_strlen($value, 'UTF-8');
            }
        }

        return $count;
    }
}
