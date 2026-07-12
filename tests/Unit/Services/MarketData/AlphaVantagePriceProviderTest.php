<?php

declare(strict_types=1);

namespace Tests\Unit\Services\MarketData;

use App\Data\MarketData\StockPriceData;
use App\Models\Stock;
use App\Services\MarketData\Providers\AlphaVantagePriceProvider;
use Carbon\CarbonImmutable;
use Illuminate\Http\Client\Factory;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use PHPUnit\Framework\Attributes\DataProvider;
use RuntimeException;
use Tests\TestCase;

final class AlphaVantagePriceProviderTest extends TestCase
{
    private const string BASE_URL = 'https://alpha-vantage.test/query';

    private Factory $http;

    protected function setUp(): void
    {
        parent::setUp();

        $this->http = $this->app->make(Factory::class);
        Http::preventStrayRequests();
        CarbonImmutable::setTestNow('2026-07-12 09:30:00 UTC');
    }

    protected function tearDown(): void
    {
        CarbonImmutable::setTestNow();

        parent::tearDown();
    }

    public function test_調整済み日足レスポンスを型付きdtoへ正規化できる(): void
    {
        // Arrange
        Http::fake([
            self::BASE_URL.'*' => Http::response([
                'Meta Data' => [
                    '1. Information' => 'Daily Time Series with Splits and Dividend Events',
                    '2. Symbol' => 'AAPL',
                ],
                'Time Series (Daily)' => [
                    '2026-07-10' => [
                        '1. open' => '210.1200',
                        '2. high' => '214.5000',
                        '3. low' => '209.8800',
                        '4. close' => '213.2500',
                        '5. adjusted close' => '212.7500',
                        '6. volume' => '12345678',
                        '7. dividend amount' => '0.0000',
                        '8. split coefficient' => '1.0',
                    ],
                ],
            ]),
        ]);
        $provider = $this->provider();

        // Act
        $prices = $provider->fetchDailyPrices($this->stock('AAPL'));

        // Assert
        $this->assertCount(1, $prices);
        $price = $prices->first();
        $this->assertInstanceOf(StockPriceData::class, $price);
        $this->assertSame('AAPL', $price->symbol);
        $this->assertSame('2026-07-10', $price->priceDate->toDateString());
        $this->assertSame(210.12, $price->open);
        $this->assertSame(214.5, $price->high);
        $this->assertSame(209.88, $price->low);
        $this->assertSame(213.25, $price->close);
        $this->assertSame(212.75, $price->adjustedClose);
        $this->assertSame(12_345_678, $price->volume);
        $this->assertSame('alpha_vantage', $price->source);
        $this->assertSame('2026-07-12T09:30:00+00:00', $price->fetchedAt->toIso8601String());
        Http::assertSent(fn (Request $request): bool => $this->requestHasQuery($request, [
            'function' => AlphaVantagePriceProvider::FUNCTION_DAILY_ADJUSTED,
            'symbol' => 'AAPL',
            'outputsize' => 'compact',
            'datatype' => 'json',
            'apikey' => 'test-key',
        ]));
    }

    public function test_未調整日足レスポンスではvolumeの公式キーを読み調整後終値をnullにする(): void
    {
        // Arrange
        Http::fake([
            self::BASE_URL.'*' => Http::response([
                'Time Series (Daily)' => [
                    '2026-07-10' => [
                        '1. open' => '10.1',
                        '2. high' => '11.2',
                        '3. low' => '9.8',
                        '4. close' => '10.7',
                        '5. volume' => '900',
                    ],
                ],
            ]),
        ]);
        $provider = $this->provider(function: AlphaVantagePriceProvider::FUNCTION_DAILY);

        // Act
        $price = $provider->fetchDailyPrices($this->stock('IBM'))->first();

        // Assert
        $this->assertInstanceOf(StockPriceData::class, $price);
        $this->assertNull($price->adjustedClose);
        $this->assertSame(900, $price->volume);
    }

    /**
     * @param  array<string, string>  $payload
     */
    #[DataProvider('apiエラーレスポンス')]
    public function test_apiエラーまたは利用制限レスポンスでruntime例外になる(array $payload): void
    {
        // Arrange
        Http::fake([self::BASE_URL.'*' => Http::response($payload)]);
        $provider = $this->provider();

        // Assert
        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('Alpha Vantage API error:');

        // Act
        $provider->fetchDailyPrices($this->stock('AAPL'));
    }

    /**
     * @return array<string, array{array<string, string>}>
     */
    public static function apiエラーレスポンス(): array
    {
        return [
            'invalid request' => [['Error Message' => 'Invalid API call.']],
            'legacy rate limit' => [['Note' => 'API call frequency is limited.']],
            'current information limit' => [['Information' => 'Please use a premium API key.']],
        ];
    }

    public function test_時系列キーが欠落したレスポンスでruntime例外になる(): void
    {
        // Arrange
        Http::fake([self::BASE_URL.'*' => Http::response(['Meta Data' => []])]);
        $provider = $this->provider();

        // Assert
        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('Time Series (Daily)');

        // Act
        $provider->fetchDailyPrices($this->stock('AAPL'));
    }

    /**
     * @param  array<string, string>  $price
     */
    #[DataProvider('不正な価格フィールド')]
    public function test_必須数値が欠落または不正な場合runtime例外になる(array $price): void
    {
        // Arrange
        Http::fake([
            self::BASE_URL.'*' => Http::response([
                'Time Series (Daily)' => ['2026-07-10' => $price],
            ]),
        ]);
        $provider = $this->provider();

        // Assert
        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('missing or invalid');

        // Act
        $provider->fetchDailyPrices($this->stock('AAPL'));
    }

    /**
     * @return array<string, array{array<string, string>}>
     */
    public static function 不正な価格フィールド(): array
    {
        $valid = [
            '1. open' => '10.1',
            '2. high' => '11.2',
            '3. low' => '9.8',
            '4. close' => '10.7',
            '5. adjusted close' => '10.6',
            '6. volume' => '900',
        ];

        $missingClose = $valid;
        unset($missingClose['4. close']);

        return [
            'close missing' => [$missingClose],
            'open is not numeric' => [[...$valid, '1. open' => 'unknown']],
            'volume is fractional' => [[...$valid, '6. volume' => '1.5']],
            'price is negative' => [[...$valid, '3. low' => '-1']],
        ];
    }

    public function test_不正な日付でruntime例外になる(): void
    {
        // Arrange
        Http::fake([
            self::BASE_URL.'*' => Http::response([
                'Time Series (Daily)' => [
                    '2026-02-30' => [
                        '1. open' => '10.1',
                        '2. high' => '11.2',
                        '3. low' => '9.8',
                        '4. close' => '10.7',
                        '5. adjusted close' => '10.6',
                        '6. volume' => '900',
                    ],
                ],
            ]),
        ]);
        $provider = $this->provider();

        // Assert
        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('invalid price date');

        // Act
        $provider->fetchDailyPrices($this->stock('AAPL'));
    }

    public function test_httpエラーをruntime例外へ変換する(): void
    {
        // Arrange
        Http::fake([self::BASE_URL.'*' => Http::response(['error' => 'upstream'], 503)]);
        $provider = $this->provider();

        // Assert
        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('HTTP status 503');

        // Act
        $provider->fetchDailyPrices($this->stock('AAPL'));
    }

    private function provider(string $function = AlphaVantagePriceProvider::FUNCTION_DAILY_ADJUSTED): AlphaVantagePriceProvider
    {
        return new AlphaVantagePriceProvider(
            http: $this->http,
            apiKey: 'test-key',
            baseUrl: self::BASE_URL,
            function: $function,
        );
    }

    private function stock(string $symbol): Stock
    {
        return new Stock(['symbol' => $symbol]);
    }

    /**
     * @param  array<string, string>  $expected
     */
    private function requestHasQuery(Request $request, array $expected): bool
    {
        $query = [];
        parse_str((string) parse_url($request->url(), PHP_URL_QUERY), $query);

        return $request->method() === 'GET' && $query === $expected;
    }
}
