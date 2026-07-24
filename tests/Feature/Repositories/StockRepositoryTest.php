<?php

declare(strict_types=1);

namespace Tests\Feature\Repositories;

use App\Enums\AnalysisSentiment;
use App\Models\AnalysisResult;
use App\Models\NewsArticle;
use App\Models\Stock;
use App\Models\StockSignal;
use App\Repositories\StockRepositoryInterface;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

final class StockRepositoryTest extends TestCase
{
    use RefreshDatabase;

    private const CURRENT_PROMPT_VERSION = 'v2';

    private const LEGACY_PROMPT_VERSION = 'v1';

    private StockRepositoryInterface $repository;

    protected function setUp(): void
    {
        parent::setUp();

        config(['services.openai.prompt_version' => self::CURRENT_PROMPT_VERSION]);
        $this->repository = app(StockRepositoryInterface::class);
    }

    #[Test]
    public function 関連ニュースに現行prompt_versionの分析結果だけを読み込める(): void
    {
        // Arrange
        $stock = Stock::factory()->create();
        $article = NewsArticle::factory()->create();
        $article->stocks()->attach($stock->id);
        $legacyAnalysis = $this->createAnalysis(
            stock: $stock,
            article: $article,
            promptVersion: self::LEGACY_PROMPT_VERSION,
            analyzedAt: '2026-07-12 12:00:00',
        );
        $currentAnalysis = $this->createAnalysis(
            stock: $stock,
            article: $article,
            promptVersion: self::CURRENT_PROMPT_VERSION,
            analyzedAt: '2026-07-12 11:00:00',
        );

        // Act
        $news = $this->repository->findRelatedNewsByStockId($stock->id, 10);

        // Assert
        $this->assertSame([$article->id], $news->pluck('id')->all());
        $loadedArticle = $news->first();
        $this->assertInstanceOf(NewsArticle::class, $loadedArticle);
        $this->assertSame([$currentAnalysis->id], $loadedArticle->analysisResults->pluck('id')->all());
        $this->assertNotContains($legacyAnalysis->id, $loadedArticle->analysisResults->pluck('id')->all());
    }

    #[Test]
    public function 銘柄分析履歴は現行prompt_versionの結果だけを取得する(): void
    {
        // Arrange
        $stock = Stock::factory()->create();
        $article = NewsArticle::factory()->create();
        $legacyAnalysis = $this->createAnalysis(
            stock: $stock,
            article: $article,
            promptVersion: self::LEGACY_PROMPT_VERSION,
            analyzedAt: '2026-07-12 12:00:00',
        );
        $currentAnalysis = $this->createAnalysis(
            stock: $stock,
            article: $article,
            promptVersion: self::CURRENT_PROMPT_VERSION,
            analyzedAt: '2026-07-12 11:00:00',
        );

        // Act
        $analyses = $this->repository->findAnalysisResultsByStockId($stock->id, 10);

        // Assert
        $this->assertSame([$currentAnalysis->id], $analyses->pluck('id')->all());
        $this->assertNotContains($legacyAnalysis->id, $analyses->pluck('id')->all());
    }

    #[Test]
    public function 銘柄シグナル履歴は現行prompt_versionの結果だけを取得する(): void
    {
        // Arrange
        $stock = Stock::factory()->create();
        $legacySignal = StockSignal::factory()->for($stock)->create([
            'prompt_version' => self::LEGACY_PROMPT_VERSION,
            'signal_date' => '2026-07-12',
        ]);
        $currentSignal = StockSignal::factory()->for($stock)->create([
            'prompt_version' => self::CURRENT_PROMPT_VERSION,
            'signal_date' => '2026-07-12',
        ]);

        // Act
        $signals = $this->repository->findSignalsByStockId($stock->id, 10);

        // Assert
        $this->assertSame([$currentSignal->id], $signals->pluck('id')->all());
        $this->assertNotContains($legacySignal->id, $signals->pluck('id')->all());
    }

    private function createAnalysis(
        Stock $stock,
        NewsArticle $article,
        string $promptVersion,
        string $analyzedAt,
    ): AnalysisResult {
        return AnalysisResult::factory()->for($stock)->create([
            'analysable_type' => NewsArticle::class,
            'analysable_id' => $article->id,
            'prompt_version' => $promptVersion,
            'sentiment' => AnalysisSentiment::Positive->value,
            'analyzed_at' => $analyzedAt,
        ]);
    }
}
