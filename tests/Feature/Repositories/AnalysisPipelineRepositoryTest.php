<?php

declare(strict_types=1);

namespace Tests\Feature\Repositories;

use App\Data\AI\ArticleAnalysisData;
use App\Enums\AnalysisSentiment;
use App\Enums\AnalysisTimeHorizon;
use App\Models\AnalysisResult;
use App\Models\NewsArticle;
use App\Models\Stock;
use App\Models\User;
use App\Models\Watchlist;
use App\Repositories\AnalysisPipelineRepositoryInterface;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

final class AnalysisPipelineRepositoryTest extends TestCase
{
    use RefreshDatabase;

    private AnalysisPipelineRepositoryInterface $repository;

    protected function setUp(): void
    {
        parent::setUp();
        $this->repository = app(AnalysisPipelineRepositoryInterface::class);
    }

    #[Test]
    public function 記事と銘柄の組み合わせ単位で未分析対象を取得できる(): void
    {
        // Arrange
        $user = User::factory()->create();
        $firstStock = Stock::factory()->create();
        $secondStock = Stock::factory()->create();
        Watchlist::factory()->create(['user_id' => $user->id, 'stock_id' => $firstStock->id]);
        Watchlist::factory()->create(['user_id' => $user->id, 'stock_id' => $secondStock->id]);
        $article = NewsArticle::factory()->create();
        $article->stocks()->attach([$firstStock->id, $secondStock->id]);
        AnalysisResult::factory()->create([
            'stock_id' => $firstStock->id,
            'analysable_type' => NewsArticle::class,
            'analysable_id' => $article->id,
            'prompt_version' => 'v1',
        ]);

        // Act
        $targets = $this->repository->findPendingTargets('v1', 100);

        // Assert
        $this->assertSame([
            ['news_article_id' => $article->id, 'stock_id' => $secondStock->id],
        ], $targets);
    }

    #[Test]
    public function 公開日時が新しい未分析記事を優先して取得できる(): void
    {
        // Arrange
        $user = User::factory()->create();
        $stock = Stock::factory()->create();
        Watchlist::factory()->create(['user_id' => $user->id, 'stock_id' => $stock->id]);
        $olderArticle = NewsArticle::factory()->create([
            'published_at' => '2026-07-10 12:00:00',
        ]);
        $newerArticle = NewsArticle::factory()->create([
            'published_at' => '2026-07-12 12:00:00',
        ]);
        $olderArticle->stocks()->attach($stock->id);
        $newerArticle->stocks()->attach($stock->id);

        // Act
        $targets = $this->repository->findPendingTargets('v1', 1);

        // Assert
        $this->assertSame([
            ['news_article_id' => $newerArticle->id, 'stock_id' => $stock->id],
        ], $targets);
    }

    #[Test]
    public function prompt_versionごとに分析結果を冪等に保存できる(): void
    {
        // Arrange
        $stock = Stock::factory()->create();
        $article = NewsArticle::factory()->create();
        $first = $this->analysisData('Initial summary', 4);
        $updated = $this->analysisData('Updated summary', 7);

        // Act
        $this->repository->upsertAnalysis($article->id, $stock->id, $first);
        $saved = $this->repository->upsertAnalysis($article->id, $stock->id, $updated);

        // Assert
        $this->assertDatabaseCount('analysis_results', 1);
        $this->assertSame('Updated summary', $saved->summary);
        $this->assertSame(7, $saved->impact_score);
    }

    private function analysisData(string $summary, int $impactScore): ArticleAnalysisData
    {
        return new ArticleAnalysisData(
            summary: $summary,
            sentiment: AnalysisSentiment::Positive,
            impactScore: $impactScore,
            confidenceScore: 85,
            timeHorizon: AnalysisTimeHorizon::ShortTerm,
            positiveFactors: ['需要増加'],
            negativeFactors: [],
            riskPoints: ['不確実性'],
            reason: '記事内容をもとに評価しました。',
            modelProvider: 'openai',
            modelName: 'test-model',
            promptVersion: 'v1',
            inputTokens: 100,
            outputTokens: 50,
        );
    }
}
