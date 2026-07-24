<?php

declare(strict_types=1);

namespace Tests\Feature\Repositories;

use App\Data\News\NewsSearchData;
use App\Enums\AnalysisSentiment;
use App\Models\AnalysisResult;
use App\Models\NewsArticle;
use App\Models\Stock;
use App\Models\User;
use App\Models\Watchlist;
use App\Repositories\NewsRepositoryInterface;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

final class NewsRepositoryTest extends TestCase
{
    use RefreshDatabase;

    private const CURRENT_PROMPT_VERSION = 'v2';

    private const LEGACY_PROMPT_VERSION = 'v1';

    private NewsRepositoryInterface $repository;

    protected function setUp(): void
    {
        parent::setUp();

        config(['services.openai.prompt_version' => self::CURRENT_PROMPT_VERSION]);
        $this->repository = app(NewsRepositoryInterface::class);
    }

    #[Test]
    public function ニュース一覧に現行prompt_versionの分析結果だけを読み込める(): void
    {
        // Arrange
        $user = User::factory()->create();
        $stock = Stock::factory()->create();
        Watchlist::factory()->for($user)->for($stock)->create();
        $article = NewsArticle::factory()->create();
        $article->stocks()->attach($stock->id);

        $legacyAnalysis = $this->createAnalysis(
            stock: $stock,
            article: $article,
            promptVersion: self::LEGACY_PROMPT_VERSION,
            sentiment: AnalysisSentiment::Negative,
            analyzedAt: '2026-07-12 12:00:00',
        );
        $currentAnalysis = $this->createAnalysis(
            stock: $stock,
            article: $article,
            promptVersion: self::CURRENT_PROMPT_VERSION,
            sentiment: AnalysisSentiment::Positive,
            analyzedAt: '2026-07-12 11:00:00',
        );

        // Act
        $news = $this->repository->search($this->searchFilters($user->id));

        // Assert
        $this->assertSame([$article->id], $news->getCollection()->pluck('id')->all());
        $loadedArticle = $news->getCollection()->first();
        $this->assertInstanceOf(NewsArticle::class, $loadedArticle);
        $this->assertSame([$currentAnalysis->id], $loadedArticle->analysisResults->pluck('id')->all());
        $this->assertNotContains($legacyAnalysis->id, $loadedArticle->analysisResults->pluck('id')->all());
    }

    #[Test]
    public function 感情分析フィルターは旧prompt_versionの結果を判定に使わない(): void
    {
        // Arrange
        $user = User::factory()->create();
        $stock = Stock::factory()->create();
        Watchlist::factory()->for($user)->for($stock)->create();

        $legacyPositiveArticle = NewsArticle::factory()->create();
        $legacyPositiveArticle->stocks()->attach($stock->id);
        $this->createAnalysis(
            stock: $stock,
            article: $legacyPositiveArticle,
            promptVersion: self::LEGACY_PROMPT_VERSION,
            sentiment: AnalysisSentiment::Positive,
        );
        $this->createAnalysis(
            stock: $stock,
            article: $legacyPositiveArticle,
            promptVersion: self::CURRENT_PROMPT_VERSION,
            sentiment: AnalysisSentiment::Negative,
        );

        $currentPositiveArticle = NewsArticle::factory()->create();
        $currentPositiveArticle->stocks()->attach($stock->id);
        $this->createAnalysis(
            stock: $stock,
            article: $currentPositiveArticle,
            promptVersion: self::CURRENT_PROMPT_VERSION,
            sentiment: AnalysisSentiment::Positive,
        );

        // Act
        $news = $this->repository->search($this->searchFilters(
            userId: $user->id,
            sentiment: AnalysisSentiment::Positive,
        ));

        // Assert
        $this->assertSame([$currentPositiveArticle->id], $news->getCollection()->pluck('id')->all());
    }

    #[Test]
    public function 旧prompt_versionの分析結果だけなら未分析として扱う(): void
    {
        // Arrange
        $user = User::factory()->create();
        $stock = Stock::factory()->create();
        Watchlist::factory()->for($user)->for($stock)->create();

        $legacyOnlyArticle = NewsArticle::factory()->create();
        $legacyOnlyArticle->stocks()->attach($stock->id);
        $this->createAnalysis(
            stock: $stock,
            article: $legacyOnlyArticle,
            promptVersion: self::LEGACY_PROMPT_VERSION,
            sentiment: AnalysisSentiment::Positive,
        );

        $currentAnalyzedArticle = NewsArticle::factory()->create();
        $currentAnalyzedArticle->stocks()->attach($stock->id);
        $this->createAnalysis(
            stock: $stock,
            article: $currentAnalyzedArticle,
            promptVersion: self::CURRENT_PROMPT_VERSION,
            sentiment: AnalysisSentiment::Positive,
        );

        // Act
        $news = $this->repository->search($this->searchFilters(
            userId: $user->id,
            analysisStatus: NewsSearchData::ANALYSIS_STATUS_UNANALYZED,
        ));

        // Assert
        $this->assertSame([$legacyOnlyArticle->id], $news->getCollection()->pluck('id')->all());
        $loadedArticle = $news->getCollection()->first();
        $this->assertInstanceOf(NewsArticle::class, $loadedArticle);
        $this->assertCount(0, $loadedArticle->analysisResults);
    }

    #[Test]
    public function 公開日の検索は日本標準時の日付境界を協定世界時の半開区間へ変換する(): void
    {
        // Arrange
        $user = User::factory()->create();
        $stock = Stock::factory()->create();
        Watchlist::factory()->for($user)->for($stock)->create();

        $before = NewsArticle::factory()->create(['published_at' => '2026-07-11 14:59:59']);
        $atStart = NewsArticle::factory()->create(['published_at' => '2026-07-11 15:00:00']);
        $beforeEnd = NewsArticle::factory()->create(['published_at' => '2026-07-12 14:59:59']);
        $atEnd = NewsArticle::factory()->create(['published_at' => '2026-07-12 15:00:00']);

        foreach ([$before, $atStart, $beforeEnd, $atEnd] as $article) {
            $article->stocks()->attach($stock->id);
        }

        // Act
        $news = $this->repository->search($this->searchFilters(
            userId: $user->id,
            from: '2026-07-12',
            to: '2026-07-12',
        ));

        // Assert
        $this->assertSame([$beforeEnd->id, $atStart->id], $news->getCollection()->pluck('id')->all());
    }

    private function searchFilters(
        int $userId,
        ?AnalysisSentiment $sentiment = null,
        ?string $analysisStatus = null,
        ?string $from = null,
        ?string $to = null,
    ): NewsSearchData {
        return new NewsSearchData(
            articleId: null,
            stockId: null,
            sentiment: $sentiment,
            analysisStatus: $analysisStatus,
            from: $from,
            to: $to,
            userId: $userId,
        );
    }

    private function createAnalysis(
        Stock $stock,
        NewsArticle $article,
        string $promptVersion,
        AnalysisSentiment $sentiment,
        string $analyzedAt = '2026-07-12 10:00:00',
    ): AnalysisResult {
        return AnalysisResult::factory()->for($stock)->create([
            'analysable_type' => NewsArticle::class,
            'analysable_id' => $article->id,
            'prompt_version' => $promptVersion,
            'sentiment' => $sentiment->value,
            'analyzed_at' => $analyzedAt,
        ]);
    }
}
