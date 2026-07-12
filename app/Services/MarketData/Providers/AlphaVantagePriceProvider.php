<?php

declare(strict_types=1);

namespace App\Services\MarketData\Providers;

use App\Data\MarketData\StockPriceData;
use App\Models\Stock;
use App\Services\MarketData\Contracts\StockPriceProviderInterface;
use Carbon\CarbonImmutable;
use DateTimeImmutable;
use DateTimeZone;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\Factory;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Collection;
use InvalidArgumentException;
use RuntimeException;

final class AlphaVantagePriceProvider implements StockPriceProviderInterface
{
    public const string FUNCTION_DAILY = 'TIME_SERIES_DAILY';

    public const string FUNCTION_DAILY_ADJUSTED = 'TIME_SERIES_DAILY_ADJUSTED';

    private const string DEFAULT_BASE_URL = 'https://www.alphavantage.co/query';

    private const string SOURCE = 'alpha_vantage';

    private const string TIME_SERIES_KEY = 'Time Series (Daily)';

    private readonly string $apiKey;

    private readonly string $baseUrl;

    private readonly string $function;

    private readonly string $outputSize;

    public function __construct(
        private readonly Factory $http,
        string $apiKey,
        string $baseUrl = self::DEFAULT_BASE_URL,
        string $function = self::FUNCTION_DAILY_ADJUSTED,
        string $outputSize = 'compact',
        private readonly int $timeoutSeconds = 10,
    ) {
        $apiKey = trim($apiKey);
        $baseUrl = trim($baseUrl);
        $function = strtoupper(trim($function));
        $outputSize = strtolower(trim($outputSize));

        if ($apiKey === '') {
            throw new InvalidArgumentException('Alpha Vantage API key must not be empty.');
        }

        if (filter_var($baseUrl, FILTER_VALIDATE_URL) === false) {
            throw new InvalidArgumentException('Alpha Vantage base URL must be a valid URL.');
        }

        if (! in_array($function, [self::FUNCTION_DAILY, self::FUNCTION_DAILY_ADJUSTED], true)) {
            throw new InvalidArgumentException('Unsupported Alpha Vantage daily price function.');
        }

        if (! in_array($outputSize, ['compact', 'full'], true)) {
            throw new InvalidArgumentException('Alpha Vantage output size must be compact or full.');
        }

        if ($timeoutSeconds <= 0) {
            throw new InvalidArgumentException('HTTP timeout must be greater than zero.');
        }

        $this->apiKey = $apiKey;
        $this->baseUrl = $baseUrl;
        $this->function = $function;
        $this->outputSize = $outputSize;
    }

    /**
     * @return Collection<int, StockPriceData>
     */
    public function fetchDailyPrices(Stock $stock): Collection
    {
        $symbol = $this->stockSymbol($stock);
        $response = $this->request([
            'function' => $this->function,
            'symbol' => $symbol,
            'outputsize' => $this->outputSize,
            'datatype' => 'json',
            'apikey' => $this->apiKey,
        ]);
        $payload = $response->json();

        if (! is_array($payload)) {
            throw new RuntimeException('Alpha Vantage returned an invalid JSON payload.');
        }

        $this->throwIfApiError($payload);
        $timeSeries = $payload[self::TIME_SERIES_KEY] ?? null;

        if (! is_array($timeSeries)) {
            throw new RuntimeException(sprintf(
                'Alpha Vantage response is missing "%s".',
                self::TIME_SERIES_KEY,
            ));
        }

        $fetchedAt = CarbonImmutable::now('UTC');
        $prices = [];

        foreach ($timeSeries as $priceDate => $values) {
            if (! is_string($priceDate) || ! is_array($values)) {
                throw new RuntimeException('Alpha Vantage daily price entry has an invalid shape.');
            }

            $prices[] = $this->normalizePrice($symbol, $priceDate, $values, $fetchedAt);
        }

        return new Collection($prices);
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
     * @param  array<array-key, mixed>  $values
     */
    private function normalizePrice(
        string $symbol,
        string $priceDate,
        array $values,
        CarbonImmutable $fetchedAt,
    ): StockPriceData {
        $isAdjusted = $this->function === self::FUNCTION_DAILY_ADJUSTED;

        return new StockPriceData(
            symbol: $symbol,
            priceDate: $this->parsePriceDate($priceDate),
            open: $this->nonNegativeFloat($values, '1. open', $priceDate),
            high: $this->nonNegativeFloat($values, '2. high', $priceDate),
            low: $this->nonNegativeFloat($values, '3. low', $priceDate),
            close: $this->nonNegativeFloat($values, '4. close', $priceDate),
            adjustedClose: $isAdjusted
                ? $this->nonNegativeFloat($values, '5. adjusted close', $priceDate)
                : null,
            volume: $this->nonNegativeInteger(
                $values,
                $isAdjusted ? '6. volume' : '5. volume',
                $priceDate,
            ),
            source: self::SOURCE,
            fetchedAt: $fetchedAt,
        );
    }

    private function stockSymbol(Stock $stock): string
    {
        $symbol = $stock->getAttribute('symbol');

        if (! is_string($symbol) || trim($symbol) === '') {
            throw new RuntimeException('Stock symbol is missing.');
        }

        return trim($symbol);
    }

    private function parsePriceDate(string $value): CarbonImmutable
    {
        $date = DateTimeImmutable::createFromFormat('!Y-m-d', $value, new DateTimeZone('UTC'));
        $errors = DateTimeImmutable::getLastErrors();

        if (
            $date === false
            || $date->format('Y-m-d') !== $value
            || ($errors !== false && ($errors['warning_count'] > 0 || $errors['error_count'] > 0))
        ) {
            throw new RuntimeException(sprintf('Alpha Vantage returned an invalid price date: %s.', $value));
        }

        return CarbonImmutable::instance($date);
    }

    /**
     * @param  array<array-key, mixed>  $values
     */
    private function nonNegativeFloat(array $values, string $key, string $context): float
    {
        $value = $values[$key] ?? null;

        if (! is_int($value) && ! is_float($value) && ! is_string($value)) {
            throw $this->invalidNumericValue($key, $context);
        }

        if (! is_numeric(trim((string) $value))) {
            throw $this->invalidNumericValue($key, $context);
        }

        $number = (float) $value;

        if (! is_finite($number) || $number < 0) {
            throw $this->invalidNumericValue($key, $context);
        }

        return $number;
    }

    /**
     * @param  array<array-key, mixed>  $values
     */
    private function nonNegativeInteger(array $values, string $key, string $context): int
    {
        $value = $values[$key] ?? null;
        $number = filter_var($value, FILTER_VALIDATE_INT, [
            'options' => [
                'min_range' => 0,
                'max_range' => PHP_INT_MAX,
            ],
        ]);

        if ($number === false) {
            throw $this->invalidNumericValue($key, $context);
        }

        return $number;
    }

    private function invalidNumericValue(string $key, string $context): RuntimeException
    {
        return new RuntimeException(sprintf(
            'Alpha Vantage field "%s" is missing or invalid for %s.',
            $key,
            $context,
        ));
    }
}
