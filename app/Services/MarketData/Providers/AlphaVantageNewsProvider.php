<?php

declare(strict_types=1);

namespace App\Services\MarketData\Providers;

use App\Data\MarketData\NewsArticleData;
use App\Enums\MarketDataProvider;
use App\Services\MarketData\Contracts\NewsProviderInterface;
use App\Services\MarketData\Exceptions\UnusableNewsFeedException;
use Carbon\CarbonImmutable;
use DateTimeImmutable;
use DateTimeZone;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\Factory;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Log;
use InvalidArgumentException;
use RuntimeException;

final class AlphaVantageNewsProvider implements NewsProviderInterface
{
    public const string FUNCTION_NEWS_SENTIMENT = 'NEWS_SENTIMENT';

    private const string DEFAULT_BASE_URL = 'https://www.alphavantage.co/query';

    private const string PROVIDER = 'alpha_vantage';

    private const string MATCHED_BY = 'provider';

    private readonly string $apiKey;

    private readonly string $baseUrl;

    private readonly string $function;

    private readonly string $sort;

    public function __construct(
        private readonly Factory $http,
        string $apiKey,
        string $baseUrl = self::DEFAULT_BASE_URL,
        string $function = self::FUNCTION_NEWS_SENTIMENT,
        string $sort = 'LATEST',
        private readonly int $limit = 50,
        private readonly int $timeoutSeconds = 10,
    ) {
        $apiKey = trim($apiKey);
        $baseUrl = trim($baseUrl);
        $function = strtoupper(trim($function));
        $sort = strtoupper(trim($sort));

        if ($apiKey === '') {
            throw new InvalidArgumentException('Alpha Vantage API key must not be empty.');
        }

        if (filter_var($baseUrl, FILTER_VALIDATE_URL) === false) {
            throw new InvalidArgumentException('Alpha Vantage base URL must be a valid URL.');
        }

        if ($function === '') {
            throw new InvalidArgumentException('Alpha Vantage news function must not be empty.');
        }

        if (! in_array($sort, ['LATEST', 'EARLIEST', 'RELEVANCE'], true)) {
            throw new InvalidArgumentException('Alpha Vantage news sort is invalid.');
        }

        if ($limit < 1 || $limit > 1000) {
            throw new InvalidArgumentException('Alpha Vantage news limit must be between 1 and 1000.');
        }

        if ($timeoutSeconds <= 0) {
            throw new InvalidArgumentException('HTTP timeout must be greater than zero.');
        }

        $this->apiKey = $apiKey;
        $this->baseUrl = $baseUrl;
        $this->function = $function;
        $this->sort = $sort;
    }

    /**
     * @return Collection<int, NewsArticleData>
     */
    public function fetchNewsForStock(string $providerSymbol): Collection
    {
        $symbol = $this->providerSymbol($providerSymbol);
        $response = $this->request([
            'function' => $this->function,
            'tickers' => $symbol,
            'sort' => $this->sort,
            'limit' => $this->limit,
            'apikey' => $this->apiKey,
        ]);
        $payload = $response->json();

        if (! is_array($payload)) {
            throw new RuntimeException('Alpha Vantage returned an invalid JSON payload.');
        }

        $this->throwIfApiError($payload);
        $feed = $payload['feed'] ?? null;

        if (! is_array($feed)) {
            throw new RuntimeException('Alpha Vantage response is missing "feed".');
        }

        $articles = [];

        foreach ($feed as $index => $item) {
            try {
                if (! is_array($item)) {
                    throw new RuntimeException(sprintf(
                        'Alpha Vantage news article at index %s has an invalid shape.',
                        (string) $index,
                    ));
                }

                $articles[] = $this->normalizeArticle($symbol, $item, (string) $index);
            } catch (RuntimeException $exception) {
                Log::warning('Skipping invalid Alpha Vantage news article.', [
                    'provider_symbol' => $symbol,
                    'feed_index' => (string) $index,
                    'reason' => $exception->getMessage(),
                ]);
            }
        }

        if ($feed !== [] && $articles === []) {
            throw new UnusableNewsFeedException(
                'Alpha Vantage news feed contained no valid articles.',
            );
        }

        return new Collection($articles);
    }

    public function provider(): MarketDataProvider
    {
        return MarketDataProvider::AlphaVantage;
    }

    /**
     * @param  array<string, string|int>  $query
     */
    private function request(array $query): Response
    {
        try {
            $response = $this->http
                ->createPendingRequest()
                ->acceptJson()
                ->timeout($this->timeoutSeconds)
                ->get($this->baseUrl, $query);
        } catch (ConnectionException $exception) {
            throw new RuntimeException('Unable to connect to Alpha Vantage.', previous: $exception);
        }

        if (! $response->successful()) {
            throw new RuntimeException(sprintf(
                'Alpha Vantage request failed with HTTP status %d.',
                $response->status(),
            ));
        }

        return $response;
    }

    /**
     * @param  array<array-key, mixed>  $payload
     */
    private function throwIfApiError(array $payload): void
    {
        foreach (['Error Message', 'Note', 'Information'] as $key) {
            $message = $payload[$key] ?? null;

            if (is_string($message) && trim($message) !== '') {
                throw new RuntimeException(sprintf('Alpha Vantage API error: %s', trim($message)));
            }
        }
    }

    /**
     * @param  array<array-key, mixed>  $item
     */
    private function normalizeArticle(string $symbol, array $item, string $index): NewsArticleData
    {
        $context = sprintf('news article at index %s', $index);
        $title = $this->requiredString($item, 'title', $context);
        $url = $this->requiredString($item, 'url', $context);
        $source = $this->requiredString($item, 'source', $context);
        $publishedAt = $this->parsePublishedAt(
            $this->requiredString($item, 'time_published', $context),
            $context,
        );

        if (! $this->isSafeArticleUrl($url)) {
            throw new RuntimeException(sprintf('Alpha Vantage returned an invalid URL for %s.', $context));
        }

        return new NewsArticleData(
            symbol: $symbol,
            title: $title,
            summary: $this->nullableString($item, 'summary'),
            body: null,
            url: $url,
            source: $source,
            provider: self::PROVIDER,
            language: null,
            publishedAt: $publishedAt,
            contentHash: hash('sha256', $url),
            relevanceScore: $this->relevanceScore($item, $symbol, $context),
            matchedBy: self::MATCHED_BY,
            rawPayload: $item,
        );
    }

    private function providerSymbol(string $providerSymbol): string
    {
        $symbol = trim($providerSymbol);

        if ($symbol === '') {
            throw new InvalidArgumentException('Alpha Vantage provider symbol must not be empty.');
        }

        return $symbol;
    }

    private function isSafeArticleUrl(string $url): bool
    {
        if (filter_var($url, FILTER_VALIDATE_URL) === false) {
            return false;
        }

        $scheme = parse_url($url, PHP_URL_SCHEME);

        return is_string($scheme)
            && in_array(strtolower($scheme), ['http', 'https'], true);
    }

    /**
     * @param  array<array-key, mixed>  $item
     */
    private function requiredString(array $item, string $key, string $context): string
    {
        $value = $item[$key] ?? null;

        if (! is_string($value) || trim($value) === '') {
            throw new RuntimeException(sprintf(
                'Alpha Vantage field "%s" is missing or invalid for %s.',
                $key,
                $context,
            ));
        }

        return trim($value);
    }

    /**
     * @param  array<array-key, mixed>  $item
     */
    private function nullableString(array $item, string $key): ?string
    {
        $value = $item[$key] ?? null;

        if ($value === null || $value === '') {
            return null;
        }

        if (! is_string($value)) {
            throw new RuntimeException(sprintf('Alpha Vantage field "%s" has an invalid type.', $key));
        }

        $value = trim($value);

        return $value === '' ? null : $value;
    }

    private function parsePublishedAt(string $value, string $context): CarbonImmutable
    {
        $date = DateTimeImmutable::createFromFormat('!Ymd\THis', $value, new DateTimeZone('UTC'));
        $errors = DateTimeImmutable::getLastErrors();

        if (
            $date === false
            || $date->format('Ymd\THis') !== $value
            || ($errors !== false && ($errors['warning_count'] > 0 || $errors['error_count'] > 0))
        ) {
            throw new RuntimeException(sprintf(
                'Alpha Vantage returned an invalid publication time for %s.',
                $context,
            ));
        }

        return CarbonImmutable::instance($date);
    }

    /**
     * @param  array<array-key, mixed>  $item
     */
    private function relevanceScore(array $item, string $symbol, string $context): int
    {
        $tickerSentiments = $item['ticker_sentiment'] ?? null;

        if (! is_array($tickerSentiments)) {
            throw new RuntimeException(sprintf(
                'Alpha Vantage field "ticker_sentiment" is missing or invalid for %s.',
                $context,
            ));
        }

        foreach ($tickerSentiments as $tickerSentiment) {
            if (! is_array($tickerSentiment)) {
                throw new RuntimeException(sprintf('Alpha Vantage ticker sentiment is invalid for %s.', $context));
            }

            $ticker = $tickerSentiment['ticker'] ?? null;

            if (! is_string($ticker) || strcasecmp(trim($ticker), $symbol) !== 0) {
                continue;
            }

            $value = $tickerSentiment['relevance_score'] ?? null;

            if (! is_int($value) && ! is_float($value) && ! is_string($value)) {
                throw new RuntimeException(sprintf('Alpha Vantage relevance score is invalid for %s.', $context));
            }

            if (! is_numeric(trim((string) $value))) {
                throw new RuntimeException(sprintf('Alpha Vantage relevance score is invalid for %s.', $context));
            }

            $score = (float) $value;

            if (! is_finite($score) || $score < 0 || $score > 1) {
                throw new RuntimeException(sprintf('Alpha Vantage relevance score is invalid for %s.', $context));
            }

            return (int) round($score * 100);
        }

        throw new RuntimeException(sprintf(
            'Alpha Vantage ticker sentiment for %s is missing from %s.',
            $symbol,
            $context,
        ));
    }
}
