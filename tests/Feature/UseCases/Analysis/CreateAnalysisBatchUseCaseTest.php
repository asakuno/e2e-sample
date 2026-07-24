<?php

declare(strict_types=1);

namespace Tests\Feature\UseCases\Analysis;

use App\Data\Analysis\CreateAnalysisBatchData;
use App\Models\NewsArticle;
use App\Models\Stock;
use App\Models\User;
use App\Models\Watchlist;
use App\UseCases\Analysis\CreateAnalysisBatchUseCase;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Validation\ValidationException;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

final class CreateAnalysisBatchUseCaseTest extends TestCase
{
    use RefreshDatabase;

    #[Test]
    public function 所有銘柄と期間内newsからimmutable_batchを作成する(): void
    {
        // Arrange
        [$user, $stock, $articles] = $this->analysisSource();
        $useCase = app(CreateAnalysisBatchUseCase::class);

        // Act
        $batch = $useCase->execute(new CreateAnalysisBatchData(
            userId: $user->id,
            stockId: $stock->id,
            fromDate: now('Asia/Tokyo')->subDays(3)->toDateString(),
            toDate: now('Asia/Tokyo')->toDateString(),
            newsArticleIds: array_map(fn (NewsArticle $article): int => $article->id, $articles),
        ));

        // Assert
        $this->assertCount(2, $batch->newsSnapshots);
        $this->assertSame(['N001', 'N002'], $batch->newsSnapshots->pluck('news_key')->all());
        $this->assertSame(hash('sha256', $batch->prompt_text), $batch->prompt_hash);
        $this->assertStringContainsString($batch->public_id, $batch->prompt_text);
        $this->assertStringContainsString('N001', $batch->prompt_text);
        $this->assertSame($stock->symbol, $batch->stock_snapshot['symbol']);

        $originalTitle = $batch->newsSnapshots->first()?->title;
        $articles[0]->update(['title' => '変更後']);
        $this->assertSame($originalTitle, $batch->newsSnapshots()->first()?->title);
    }

    #[Test]
    public function inactive_watchlistを拒否する(): void
    {
        // Arrange
        [$user, $stock, $articles] = $this->analysisSource();
        Watchlist::query()->where('user_id', $user->id)->update(['is_active' => false]);

        // Assert
        $this->expectException(ValidationException::class);

        // Act
        app(CreateAnalysisBatchUseCase::class)->execute(new CreateAnalysisBatchData(
            userId: $user->id,
            stockId: $stock->id,
            fromDate: now('Asia/Tokyo')->subDays(3)->toDateString(),
            toDate: now('Asia/Tokyo')->toDateString(),
            newsArticleIds: array_column($articles, 'id'),
        ));
    }

    #[Test]
    public function 同じinput_hashのbatch作成を拒否する(): void
    {
        // Arrange
        [$user, $stock, $articles] = $this->analysisSource();
        $data = new CreateAnalysisBatchData(
            userId: $user->id,
            stockId: $stock->id,
            fromDate: now('Asia/Tokyo')->subDays(3)->toDateString(),
            toDate: now('Asia/Tokyo')->toDateString(),
            newsArticleIds: array_column($articles, 'id'),
        );
        $useCase = app(CreateAnalysisBatchUseCase::class);
        $useCase->execute($data);

        // Assert
        $this->expectException(ValidationException::class);

        // Act
        $useCase->execute($data);
    }

    #[Test]
    public function 未来日と32日間と期間外newsを拒否する(): void
    {
        // Arrange
        [$user, $stock, $articles] = $this->analysisSource();
        $useCase = app(CreateAnalysisBatchUseCase::class);

        foreach ([
            [now('Asia/Tokyo')->toDateString(), now('Asia/Tokyo')->addDay()->toDateString()],
            [now('Asia/Tokyo')->subDays(31)->toDateString(), now('Asia/Tokyo')->toDateString()],
        ] as [$from, $to]) {
            try {
                $useCase->execute(new CreateAnalysisBatchData(
                    userId: $user->id,
                    stockId: $stock->id,
                    fromDate: $from,
                    toDate: $to,
                    newsArticleIds: array_column($articles, 'id'),
                ));
                $this->fail('期間エラーが必要です。');
            } catch (ValidationException) {
                $this->assertDatabaseCount('analysis_batches', 0);
            }
        }

        $articles[0]->update(['published_at' => now()->subDays(40)]);

        // Assert
        $this->expectException(ValidationException::class);

        // Act
        $useCase->execute(new CreateAnalysisBatchData(
            userId: $user->id,
            stockId: $stock->id,
            fromDate: now('Asia/Tokyo')->subDays(3)->toDateString(),
            toDate: now('Asia/Tokyo')->toDateString(),
            newsArticleIds: array_column($articles, 'id'),
        ));
    }

    /**
     * @return array{User, Stock, list<NewsArticle>}
     */
    private function analysisSource(): array
    {
        $user = User::factory()->create();
        $stock = Stock::factory()->create();
        Watchlist::factory()->for($user)->for($stock)->create(['is_active' => true]);
        $articles = [
            NewsArticle::factory()->create(['published_at' => now()->subDays(2)]),
            NewsArticle::factory()->create(['published_at' => now()->subDay()]),
        ];
        $stock->newsArticles()->attach(array_column($articles, 'id'));

        return [$user, $stock, $articles];
    }
}
