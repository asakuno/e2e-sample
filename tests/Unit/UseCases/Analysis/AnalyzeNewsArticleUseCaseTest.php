<?php

declare(strict_types=1);

namespace Tests\Unit\UseCases\Analysis;

use App\Data\AI\ArticleAnalysisData;
use App\Enums\AnalysisSentiment;
use App\Enums\AnalysisTimeHorizon;
use App\Models\NewsArticle;
use App\Models\Stock;
use App\Repositories\AnalysisPipelineRepositoryInterface;
use App\Services\AI\Contracts\ArticleAnalyzerInterface;
use App\UseCases\Analysis\AnalyzeNewsArticleUseCase;
use PHPUnit\Framework\Attributes\Test;
use PHPUnit\Framework\TestCase;
use RuntimeException;

final class AnalyzeNewsArticleUseCaseTest extends TestCase
{
    #[Test]
    public function providerの分析結果をrepositoryへ保存する(): void
    {
        // Arrange
        $article = new NewsArticle(['title' => 'News', 'url' => 'https://example.com']);
        $article->id = 10;
        $stock = new Stock(['symbol' => 'AAPL']);
        $stock->id = 20;
        $analysis = $this->analysisData();
        $repository = $this->createMock(AnalysisPipelineRepositoryInterface::class);
        $repository->method('findNewsArticleById')->with(10)->willReturn($article);
        $repository->method('findActiveStockById')->with(20)->willReturn($stock);
        $repository->expects($this->once())->method('upsertAnalysis')->with(10, 20, $analysis);
        $analyzer = $this->createMock(ArticleAnalyzerInterface::class);
        $analyzer->expects($this->once())->method('analyze')->with($article, $stock)->willReturn($analysis);
        $useCase = new AnalyzeNewsArticleUseCase($repository, $analyzer);

        // Act
        $useCase->execute(10, 20);

        // Assert
        $this->addToAssertionCount(1);
    }

    #[Test]
    public function 対象記事が存在しない場合はproviderを呼ばない(): void
    {
        // Arrange
        $repository = $this->createMock(AnalysisPipelineRepositoryInterface::class);
        $repository->expects($this->once())->method('findNewsArticleById')->with(10)->willReturn(null);
        $repository->expects($this->once())->method('findActiveStockById')->with(20)->willReturn(new Stock);
        $analyzer = $this->createMock(ArticleAnalyzerInterface::class);
        $analyzer->expects($this->never())->method('analyze');
        $useCase = new AnalyzeNewsArticleUseCase($repository, $analyzer);

        // Assert
        $this->expectException(RuntimeException::class);

        // Act
        $useCase->execute(10, 20);
    }

    private function analysisData(): ArticleAnalysisData
    {
        return new ArticleAnalysisData(
            summary: 'Summary',
            sentiment: AnalysisSentiment::Positive,
            impactScore: 5,
            confidenceScore: 80,
            timeHorizon: AnalysisTimeHorizon::ShortTerm,
            positiveFactors: ['Growth'],
            negativeFactors: [],
            riskPoints: ['Risk'],
            reason: 'Reason',
            modelProvider: 'openai',
            modelName: 'test-model',
            promptVersion: 'v1',
            inputTokens: 100,
            outputTokens: 50,
        );
    }
}
