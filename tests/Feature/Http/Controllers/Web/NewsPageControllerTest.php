<?php

declare(strict_types=1);

namespace Tests\Feature\Http\Controllers\Web;

use App\Data\News\NewsSearchData;
use App\Enums\AnalysisSentiment;
use App\Models\AnalysisResult;
use App\Models\NewsArticle;
use App\Models\Stock;
use App\Models\User;
use App\Models\Watchlist;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

final class NewsPageControllerTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutVite();
    }

    public function test_ニュース一覧ページに関連銘柄と分析結果が表示される(): void
    {
        // Arrange
        $user = User::factory()->create();
        $stock = Stock::factory()->create([
            'symbol' => 'AAPL',
            'name' => 'Apple Inc.',
            'market' => 'us',
            'country' => 'US',
            'currency' => 'USD',
        ]);
        $article = NewsArticle::factory()->create([
            'title' => 'Apple announces new product',
            'summary' => 'Apple product summary',
            'source' => 'Reuters',
            'provider' => 'rss',
            'language' => 'en',
            'published_at' => '2026-06-15 10:00:00',
        ]);
        $article->stocks()->attach($stock->id, [
            'relevance_score' => 95,
            'matched_by' => 'symbol',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        AnalysisResult::factory()->for($stock)->create([
            'analysable_type' => NewsArticle::class,
            'analysable_id' => $article->id,
            'summary' => '売上成長にポジティブ',
            'sentiment' => AnalysisSentiment::Positive->value,
            'impact_score' => 8,
            'confidence_score' => 90,
            'analyzed_at' => '2026-06-15 11:00:00',
        ]);

        // Act
        $response = $this->actingAs($user)->get(route('news.index'));

        // Assert
        $response->assertOk();
        $response->assertInertia(fn (AssertableInertia $page) => $page
            ->component('News')
            ->has('news', 1)
            ->where('news.0.title', 'Apple announces new product')
            ->where('news.0.source', 'Reuters')
            ->where('news.0.published_at', '2026-06-15 10:00:00')
            ->where('news.0.stocks.0.symbol', 'AAPL')
            ->where('news.0.stocks.0.relevance_score', 95)
            ->where('news.0.analyses.0.summary', '売上成長にポジティブ')
            ->where('news.0.analyses.0.sentiment', 1)
            ->where('news.0.analyses.0.sentiment_label', 'ポジティブ')
            ->where('news.0.analyses.0.impact_score', 8)
            ->where('filters.article_id', '')
            ->where('filters.stock_id', '')
            ->where('filters.sentiment', '')
            ->where('filters.analysis_status', '')
            ->has('stockOptions', 1)
            ->has('sentimentOptions', 3)
        );
    }

    public function test_銘柄でニュースを絞り込める(): void
    {
        // Arrange
        $user = User::factory()->create();
        $apple = Stock::factory()->create(['symbol' => 'AAPL']);
        $tesla = Stock::factory()->create(['symbol' => 'TSLA']);
        $appleNews = NewsArticle::factory()->create(['title' => 'Apple news']);
        $teslaNews = NewsArticle::factory()->create(['title' => 'Tesla news']);
        $appleNews->stocks()->attach($apple->id, ['created_at' => now(), 'updated_at' => now()]);
        $teslaNews->stocks()->attach($tesla->id, ['created_at' => now(), 'updated_at' => now()]);

        // Act
        $response = $this->actingAs($user)->get(route('news.index', ['stock_id' => $apple->id]));

        // Assert
        $response->assertOk();
        $response->assertInertia(fn (AssertableInertia $page) => $page
            ->component('News')
            ->has('news', 1)
            ->where('news.0.title', 'Apple news')
            ->where('filters.stock_id', (string) $apple->id)
        );
    }

    public function test_記事識別子でニュースを1件に絞り込める(): void
    {
        // Arrange
        $user = User::factory()->create();
        $targetArticle = NewsArticle::factory()->create(['title' => 'Target news']);
        NewsArticle::factory()->create(['title' => 'Other news']);

        // Act
        $response = $this->actingAs($user)->get(route('news.index', [
            'article_id' => $targetArticle->id,
        ]));

        // Assert
        $response->assertOk();
        $response->assertInertia(fn (AssertableInertia $page) => $page
            ->component('News')
            ->has('news', 1)
            ->where('news.0.id', $targetArticle->id)
            ->where('news.0.title', 'Target news')
            ->where('filters.article_id', (string) $targetArticle->id)
        );
    }

    #[DataProvider('無効な記事識別子')]
    public function test_無効な記事識別子はバリデーションエラーになる(int|string $articleId): void
    {
        // Arrange
        $user = User::factory()->create();

        // Act
        $response = $this->actingAs($user)->get(route('news.index', [
            'article_id' => $articleId,
        ]));

        // Assert
        $response->assertSessionHasErrors(['article_id']);
    }

    /**
     * @return array<string, array{int|string}>
     */
    public static function 無効な記事識別子(): array
    {
        return [
            '整数でない' => ['invalid'],
            '存在しない' => [999999],
        ];
    }

    public function test_未分析ニュースを認証ユーザーのアクティブなウォッチ銘柄に限定できる(): void
    {
        // Arrange
        $user = User::factory()->create();
        $otherUser = User::factory()->create();
        $activeStock = Stock::factory()->create(['symbol' => 'AAPL']);
        $inactiveStock = Stock::factory()->create(['symbol' => 'MSFT']);
        $otherUsersStock = Stock::factory()->create(['symbol' => 'TSLA']);

        Watchlist::factory()->for($user)->for($activeStock)->create(['is_active' => true]);
        Watchlist::factory()->for($user)->for($inactiveStock)->create(['is_active' => false]);
        Watchlist::factory()->for($otherUser)->for($otherUsersStock)->create(['is_active' => true]);

        $targetArticle = NewsArticle::factory()->create(['title' => 'Active watchlist unanalyzed news']);
        $analyzedArticle = NewsArticle::factory()->create(['title' => 'Already analyzed news']);
        $inactiveArticle = NewsArticle::factory()->create(['title' => 'Inactive watchlist news']);
        $otherUsersArticle = NewsArticle::factory()->create(['title' => 'Other user watchlist news']);

        $targetArticle->stocks()->attach($activeStock->id, ['created_at' => now(), 'updated_at' => now()]);
        $analyzedArticle->stocks()->attach($activeStock->id, ['created_at' => now(), 'updated_at' => now()]);
        $inactiveArticle->stocks()->attach($inactiveStock->id, ['created_at' => now(), 'updated_at' => now()]);
        $otherUsersArticle->stocks()->attach($otherUsersStock->id, ['created_at' => now(), 'updated_at' => now()]);

        AnalysisResult::factory()->for($activeStock)->create([
            'analysable_type' => NewsArticle::class,
            'analysable_id' => $analyzedArticle->id,
        ]);

        // Act
        $response = $this->actingAs($user)->get(route('news.index', [
            'analysis_status' => NewsSearchData::ANALYSIS_STATUS_UNANALYZED,
        ]));

        // Assert
        $response->assertOk();
        $response->assertInertia(fn (AssertableInertia $page) => $page
            ->component('News')
            ->has('news', 1)
            ->where('news.0.id', $targetArticle->id)
            ->where('news.0.title', 'Active watchlist unanalyzed news')
            ->where('filters.analysis_status', NewsSearchData::ANALYSIS_STATUS_UNANALYZED)
        );
    }

    public function test_無効な分析状態はバリデーションエラーになる(): void
    {
        // Arrange
        $user = User::factory()->create();

        // Act
        $response = $this->actingAs($user)->get(route('news.index', [
            'analysis_status' => 'analyzed',
        ]));

        // Assert
        $response->assertSessionHasErrors(['analysis_status']);
    }

    public function test_未分析条件と感情分析が同時指定された場合は感情分析を解除する(): void
    {
        // Arrange
        $user = User::factory()->create();
        $stock = Stock::factory()->create(['symbol' => 'AAPL']);
        Watchlist::factory()->for($user)->for($stock)->create(['is_active' => true]);
        $article = NewsArticle::factory()->create(['title' => 'Unanalyzed watchlist news']);
        $article->stocks()->attach($stock->id, ['created_at' => now(), 'updated_at' => now()]);

        // Act
        $response = $this->actingAs($user)->get(route('news.index', [
            'analysis_status' => NewsSearchData::ANALYSIS_STATUS_UNANALYZED,
            'sentiment' => AnalysisSentiment::Positive->value,
        ]));

        // Assert
        $response->assertOk();
        $response->assertInertia(fn (AssertableInertia $page) => $page
            ->component('News')
            ->has('news', 1)
            ->where('news.0.id', $article->id)
            ->where('filters.analysis_status', NewsSearchData::ANALYSIS_STATUS_UNANALYZED)
            ->where('filters.sentiment', '')
        );
    }

    public function test_感情分析でニュースを絞り込める(): void
    {
        // Arrange
        $user = User::factory()->create();
        $stock = Stock::factory()->create();
        $positiveNews = NewsArticle::factory()->create(['title' => 'Positive news']);
        $negativeNews = NewsArticle::factory()->create(['title' => 'Negative news']);
        AnalysisResult::factory()->for($stock)->create([
            'analysable_type' => NewsArticle::class,
            'analysable_id' => $positiveNews->id,
            'sentiment' => AnalysisSentiment::Positive->value,
        ]);
        AnalysisResult::factory()->for($stock)->create([
            'analysable_type' => NewsArticle::class,
            'analysable_id' => $negativeNews->id,
            'sentiment' => AnalysisSentiment::Negative->value,
        ]);

        // Act
        $response = $this->actingAs($user)->get(route('news.index', [
            'sentiment' => AnalysisSentiment::Positive->value,
        ]));

        // Assert
        $response->assertOk();
        $response->assertInertia(fn (AssertableInertia $page) => $page
            ->component('News')
            ->has('news', 1)
            ->where('news.0.title', 'Positive news')
            ->where('filters.sentiment', (string) AnalysisSentiment::Positive->value)
        );
    }

    public function test_期間でニュースを絞り込める(): void
    {
        // Arrange
        $user = User::factory()->create();
        NewsArticle::factory()->create([
            'title' => 'New news',
            'published_at' => '2026-06-15 10:00:00',
        ]);
        NewsArticle::factory()->create([
            'title' => 'Old news',
            'published_at' => '2026-05-01 10:00:00',
        ]);

        // Act
        $response = $this->actingAs($user)->get(route('news.index', [
            'from' => '2026-06-01',
            'to' => '2026-06-30',
        ]));

        // Assert
        $response->assertOk();
        $response->assertInertia(fn (AssertableInertia $page) => $page
            ->component('News')
            ->has('news', 1)
            ->where('news.0.title', 'New news')
            ->where('filters.from', '2026-06-01')
            ->where('filters.to', '2026-06-30')
        );
    }

    public function test_未認証ユーザーはニュースページにアクセスできない(): void
    {
        // Act
        $response = $this->get(route('news.index'));

        // Assert
        $response->assertRedirect(route('login'));
    }
}
