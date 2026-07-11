<?php

declare(strict_types=1);

namespace Tests\Unit\UseCases\News;

use App\Data\News\NewsSearchData;
use App\Enums\AnalysisSentiment;
use App\Models\AnalysisResult;
use App\Models\NewsArticle;
use App\Models\Stock;
use App\Repositories\NewsRepositoryInterface;
use App\UseCases\News\ListNewsUseCase;
use Illuminate\Support\Collection;
use Tests\TestCase;

final class ListNewsUseCaseTest extends TestCase
{
    public function test_ニュース一覧を_dt_oに変換して取得できる(): void
    {
        // Arrange
        $stock = new Stock([
            'symbol' => 'AAPL',
            'name' => 'Apple Inc.',
            'market' => 'us',
            'country' => 'US',
            'currency' => 'USD',
        ]);
        $stock->id = 10;

        $article = new NewsArticle([
            'title' => 'Apple news',
            'summary' => 'Summary',
            'url' => 'https://example.com/apple',
            'source' => 'Reuters',
            'provider' => 'rss',
            'language' => 'en',
            'published_at' => '2026-06-15 10:00:00',
        ]);
        $article->id = 20;
        $article->setRelation('stocks', new Collection([$stock]));
        $article->setRelation('analysisResults', new Collection);

        $filters = new NewsSearchData(
            articleId: null,
            stockId: null,
            sentiment: null,
            from: null,
            to: null,
        );

        $repository = $this->createMock(NewsRepositoryInterface::class);
        $repository->expects($this->once())
            ->method('search')
            ->with($filters)
            ->willReturn(new Collection([$article]));

        $useCase = new ListNewsUseCase($repository);

        // Act
        $result = $useCase->execute($filters);

        // Assert
        $this->assertCount(1, $result);
        $this->assertSame(20, $result[0]->id);
        $this->assertSame('Apple news', $result[0]->title);
        $this->assertSame('AAPL', $result[0]->stocks[0]->symbol);
    }

    public function test_ニュース関連銘柄の選択肢を取得できる(): void
    {
        // Arrange
        $stock = new Stock([
            'symbol' => 'MSFT',
            'name' => 'Microsoft Corporation',
            'market' => 'us',
        ]);
        $stock->id = 11;

        $repository = $this->createMock(NewsRepositoryInterface::class);
        $repository->expects($this->once())
            ->method('findStocksWithNews')
            ->willReturn(new Collection([$stock]));

        $useCase = new ListNewsUseCase($repository);

        // Act
        $result = $useCase->stockOptions();

        // Assert
        $this->assertSame([
            [
                'value' => 11,
                'label' => 'MSFT Microsoft Corporation',
            ],
        ], $result);
    }

    public function test_分析結果を_dt_oに変換して取得できる(): void
    {
        // Arrange
        $stock = new Stock([
            'symbol' => 'TSLA',
            'name' => 'Tesla Inc.',
            'market' => 'us',
            'country' => 'US',
            'currency' => 'USD',
        ]);
        $stock->id = 12;

        $analysis = new AnalysisResult([
            'summary' => '需要増にポジティブ',
            'sentiment' => AnalysisSentiment::Positive,
            'impact_score' => 7,
            'confidence_score' => 88,
            'analyzed_at' => '2026-06-15 11:00:00',
        ]);
        $analysis->id = 30;
        $analysis->setRelation('stock', $stock);

        $article = new NewsArticle([
            'title' => 'Tesla news',
            'url' => 'https://example.com/tesla',
            'provider' => 'rss',
        ]);
        $article->id = 21;
        $article->setRelation('stocks', new Collection);
        $article->setRelation('analysisResults', new Collection([$analysis]));

        $filters = new NewsSearchData(
            articleId: null,
            stockId: null,
            sentiment: AnalysisSentiment::Positive,
            from: null,
            to: null,
        );

        $repository = $this->createMock(NewsRepositoryInterface::class);
        $repository->expects($this->once())
            ->method('search')
            ->with($filters)
            ->willReturn(new Collection([$article]));

        $useCase = new ListNewsUseCase($repository);

        // Act
        $result = $useCase->execute($filters);

        // Assert
        $this->assertSame('需要増にポジティブ', $result[0]->analyses[0]->summary);
        $this->assertSame(AnalysisSentiment::Positive->value, $result[0]->analyses[0]->sentiment);
        $this->assertSame('ポジティブ', $result[0]->analyses[0]->sentimentLabel);
        $this->assertSame(7, $result[0]->analyses[0]->impactScore);
    }
}
