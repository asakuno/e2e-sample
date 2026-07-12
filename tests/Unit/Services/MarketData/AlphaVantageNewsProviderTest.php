<?php

declare(strict_types=1);

namespace Tests\Unit\Services\MarketData;

use App\Data\MarketData\NewsArticleData;
use App\Services\MarketData\Exceptions\UnusableNewsFeedException;
use App\Services\MarketData\Providers\AlphaVantageNewsProvider;
use Illuminate\Http\Client\Factory;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use PHPUnit\Framework\Attributes\DataProvider;
use RuntimeException;
use Tests\TestCase;

final class AlphaVantageNewsProviderTest extends TestCase
{
    private const string BASE_URL = 'https://alpha-vantage.test/query';

    private Factory $http;

    protected function setUp(): void
    {
        parent::setUp();

        $this->http = $this->app->make(Factory::class);
        Http::preventStrayRequests();
    }

    public function test_news_sentimentレスポンスを型付きdtoへ正規化できる(): void
    {
        // Arrange
        $article = $this->validArticle();
        Http::fake([
            self::BASE_URL.'*' => Http::response([
                'items' => '1',
                'feed' => [$article],
            ]),
        ]);
        $provider = $this->provider();

        // Act
        $articles = $provider->fetchNewsForStock('AAPL');

        // Assert
        $this->assertCount(1, $articles);
        $news = $articles->first();
        $this->assertInstanceOf(NewsArticleData::class, $news);
        $this->assertSame('AAPL', $news->symbol);
        $this->assertSame('Apple expands AI investment', $news->title);
        $this->assertSame('Apple announced a new AI infrastructure plan.', $news->summary);
        $this->assertNull($news->body);
        $this->assertSame('https://example.com/apple-ai', $news->url);
        $this->assertSame('Reuters', $news->source);
        $this->assertSame('alpha_vantage', $news->provider);
        $this->assertNull($news->language);
        $this->assertSame('2026-07-11 14:30:00', $news->publishedAt->toDateTimeString());
        $this->assertSame(hash('sha256', 'https://example.com/apple-ai'), $news->contentHash);
        $this->assertSame(91, $news->relevanceScore);
        $this->assertSame('provider', $news->matchedBy);
        $this->assertSame($article, $news->rawPayload);
        Http::assertSent(fn (Request $request): bool => $this->requestHasQuery($request, [
            'function' => AlphaVantageNewsProvider::FUNCTION_NEWS_SENTIMENT,
            'tickers' => 'AAPL',
            'sort' => 'LATEST',
            'limit' => '50',
            'apikey' => 'test-key',
        ]));
    }

    public function test_不正記事を警告付きでskipして正常記事を返す(): void
    {
        // Arrange
        $invalidArticle = $this->validArticle();
        unset($invalidArticle['title']);
        $secondValidArticle = [
            ...$this->validArticle(),
            'title' => 'Apple launches another infrastructure project',
            'url' => 'https://example.com/apple-infrastructure',
        ];
        Log::spy();
        Http::fake([
            self::BASE_URL.'*' => Http::response([
                'feed' => [$this->validArticle(), $invalidArticle, $secondValidArticle],
            ]),
        ]);

        // Act
        $articles = $this->provider()->fetchNewsForStock('AAPL');

        // Assert
        $this->assertSame(
            ['Apple expands AI investment', 'Apple launches another infrastructure project'],
            $articles->pluck('title')->all(),
        );
        Log::shouldHaveReceived('warning')
            ->once()
            ->with(
                'Skipping invalid Alpha Vantage news article.',
                \Mockery::on(fn (array $context): bool => $context['provider_symbol'] === 'AAPL'
                    && $context['feed_index'] === '1'
                    && str_contains($context['reason'], 'field "title"')),
            );
    }

    public function test_非空feedが全件不正なら明示的な例外になる(): void
    {
        // Arrange
        $invalidArticle = $this->validArticle();
        unset($invalidArticle['url']);
        Http::fake([
            self::BASE_URL.'*' => Http::response([
                'feed' => [$invalidArticle, 'invalid-shape'],
            ]),
        ]);
        $provider = $this->provider();

        // Assert
        $this->expectException(UnusableNewsFeedException::class);
        $this->expectExceptionMessage('news feed contained no valid articles');

        // Act
        $provider->fetchNewsForStock('AAPL');
    }

    public function test_空feedは正常な空結果を返す(): void
    {
        // Arrange
        Log::spy();
        Http::fake([self::BASE_URL.'*' => Http::response(['feed' => []])]);

        // Act
        $articles = $this->provider()->fetchNewsForStock('AAPL');

        // Assert
        $this->assertCount(0, $articles);
        Log::shouldNotHaveReceived('warning');
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
        $provider->fetchNewsForStock('AAPL');
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

    public function test_feedキーが欠落したレスポンスでruntime例外になる(): void
    {
        // Arrange
        Http::fake([self::BASE_URL.'*' => Http::response(['items' => '0'])]);
        $provider = $this->provider();

        // Assert
        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('missing "feed"');

        // Act
        $provider->fetchNewsForStock('AAPL');
    }

    #[DataProvider('欠落した記事キー')]
    public function test_記事の必須キーが欠落した場合runtime例外になる(string $missingKey): void
    {
        // Arrange
        $article = $this->validArticle();
        unset($article[$missingKey]);
        Http::fake([self::BASE_URL.'*' => Http::response(['feed' => [$article]])]);
        $provider = $this->provider();

        // Assert
        $this->expectException(RuntimeException::class);

        // Act
        $provider->fetchNewsForStock('AAPL');
    }

    /**
     * @return array<string, array{string}>
     */
    public static function 欠落した記事キー(): array
    {
        return [
            'title' => ['title'],
            'url' => ['url'],
            'source' => ['source'],
            'published time' => ['time_published'],
            'ticker sentiment' => ['ticker_sentiment'],
        ];
    }

    #[DataProvider('安全でない記事URL')]
    public function test_http以外の記事urlは不正記事として拒否する(string $url): void
    {
        // Arrange
        $article = [...$this->validArticle(), 'url' => $url];
        Http::fake([self::BASE_URL.'*' => Http::response(['feed' => [$article]])]);
        $provider = $this->provider();

        // Assert
        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('news feed contained no valid articles');

        // Act
        $provider->fetchNewsForStock('AAPL');
    }

    /**
     * @return array<string, array{string}>
     */
    public static function 安全でない記事URL(): array
    {
        return [
            'javascript scheme' => ['javascript://example.com/%0Aalert(1)'],
            'ftp scheme' => ['ftp://example.com/article'],
        ];
    }

    public function test_不正な公開日時でruntime例外になる(): void
    {
        // Arrange
        $article = [...$this->validArticle(), 'time_published' => '20260230T143000'];
        Http::fake([self::BASE_URL.'*' => Http::response(['feed' => [$article]])]);
        $provider = $this->provider();

        // Assert
        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('news feed contained no valid articles');

        // Act
        $provider->fetchNewsForStock('AAPL');
    }

    #[DataProvider('不正な関連度')]
    public function test_関連度が数値範囲外の場合runtime例外になる(string $relevance): void
    {
        // Arrange
        $article = $this->validArticle();
        $article['ticker_sentiment'][1]['relevance_score'] = $relevance;
        Http::fake([self::BASE_URL.'*' => Http::response(['feed' => [$article]])]);
        $provider = $this->provider();

        // Assert
        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('news feed contained no valid articles');

        // Act
        $provider->fetchNewsForStock('AAPL');
    }

    /**
     * @return array<string, array{string}>
     */
    public static function 不正な関連度(): array
    {
        return [
            'not numeric' => ['unknown'],
            'less than zero' => ['-0.1'],
            'greater than one' => ['1.1'],
        ];
    }

    public function test_要求銘柄のticker_sentimentがない場合runtime例外になる(): void
    {
        // Arrange
        $article = $this->validArticle();
        $article['ticker_sentiment'] = [$article['ticker_sentiment'][0]];
        Http::fake([self::BASE_URL.'*' => Http::response(['feed' => [$article]])]);
        $provider = $this->provider();

        // Assert
        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('news feed contained no valid articles');

        // Act
        $provider->fetchNewsForStock('AAPL');
    }

    public function test_httpエラーをruntime例外へ変換する(): void
    {
        // Arrange
        Http::fake([self::BASE_URL.'*' => Http::response(['error' => 'upstream'], 429)]);
        $provider = $this->provider();

        // Assert
        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('HTTP status 429');

        // Act
        $provider->fetchNewsForStock('AAPL');
    }

    private function provider(): AlphaVantageNewsProvider
    {
        return new AlphaVantageNewsProvider(
            http: $this->http,
            apiKey: 'test-key',
            baseUrl: self::BASE_URL,
        );
    }

    /**
     * @return array<string, mixed>
     */
    private function validArticle(): array
    {
        return [
            'title' => 'Apple expands AI investment',
            'url' => 'https://example.com/apple-ai',
            'time_published' => '20260711T143000',
            'authors' => ['Example Author'],
            'summary' => 'Apple announced a new AI infrastructure plan.',
            'source' => 'Reuters',
            'ticker_sentiment' => [
                [
                    'ticker' => 'MSFT',
                    'relevance_score' => '0.250000',
                    'ticker_sentiment_score' => '0.100000',
                    'ticker_sentiment_label' => 'Neutral',
                ],
                [
                    'ticker' => 'AAPL',
                    'relevance_score' => '0.912345',
                    'ticker_sentiment_score' => '0.450000',
                    'ticker_sentiment_label' => 'Bullish',
                ],
            ],
        ];
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
