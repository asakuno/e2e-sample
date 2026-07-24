<?php

declare(strict_types=1);

namespace Tests\Feature\Repositories;

use App\Data\Signal\GeneratedStockSignalData;
use App\Models\AnalysisResult;
use App\Models\NewsArticle;
use App\Models\Stock;
use App\Models\User;
use App\Models\Watchlist;
use App\Repositories\SignalGenerationRepositoryInterface;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

final class SignalGenerationRepositoryTest extends TestCase
{
    use RefreshDatabase;

    private SignalGenerationRepositoryInterface $repository;

    protected function setUp(): void
    {
        parent::setUp();
        $this->repository = app(SignalGenerationRepositoryInterface::class);
    }

    #[Test]
    public function 記事公開日時が7日境界内のニュース分析だけを取得できる(): void
    {
        // Arrange
        $stock = Stock::factory()->create();
        $from = CarbonImmutable::parse('2026-07-05 12:00:00');
        $to = CarbonImmutable::parse('2026-07-12 12:00:00');
        $boundaryArticle = NewsArticle::factory()->create([
            'published_at' => $from,
        ]);
        $insideArticle = NewsArticle::factory()->create([
            'published_at' => $to->subDay(),
        ]);
        $oldArticle = NewsArticle::factory()->create([
            'published_at' => $from->subSecond(),
        ]);
        $futureArticle = NewsArticle::factory()->create([
            'published_at' => $to->addSecond(),
        ]);
        $boundary = AnalysisResult::factory()->create([
            'stock_id' => $stock->id,
            'analysable_type' => NewsArticle::class,
            'analysable_id' => $boundaryArticle->id,
            'prompt_version' => 'v2',
            'analyzed_at' => $to,
        ]);
        $inside = AnalysisResult::factory()->create([
            'stock_id' => $stock->id,
            'analysable_type' => NewsArticle::class,
            'analysable_id' => $insideArticle->id,
            'prompt_version' => 'v2',
            'analyzed_at' => $from->subMonth(),
        ]);
        AnalysisResult::factory()->create([
            'stock_id' => $stock->id,
            'analysable_type' => NewsArticle::class,
            'analysable_id' => $oldArticle->id,
            'prompt_version' => 'v2',
            'analyzed_at' => $to,
        ]);
        AnalysisResult::factory()->create([
            'stock_id' => $stock->id,
            'analysable_type' => NewsArticle::class,
            'analysable_id' => $futureArticle->id,
            'prompt_version' => 'v2',
            'analyzed_at' => $from,
        ]);

        // Act
        $analyses = $this->repository->findNewsAnalysesBetween(
            $stock->id,
            $from,
            $to,
            'v2',
        );

        // Assert
        $this->assertSame(
            [
                'ids' => [$boundary->id, $inside->id],
                'articles_loaded' => true,
            ],
            [
                'ids' => $analyses->pluck('id')->all(),
                'articles_loaded' => $analyses->every(
                    fn (AnalysisResult $analysis): bool => $analysis->relationLoaded('analysable'),
                ),
            ],
        );
    }

    #[Test]
    public function 現行prompt_versionの分析だけを取得して旧履歴を二重加算しない(): void
    {
        // Arrange
        $stock = Stock::factory()->create();
        $article = NewsArticle::factory()->create([
            'published_at' => '2026-07-10 12:00:00',
        ]);
        AnalysisResult::factory()->create([
            'stock_id' => $stock->id,
            'analysable_type' => NewsArticle::class,
            'analysable_id' => $article->id,
            'prompt_version' => 'v1',
        ]);
        $current = AnalysisResult::factory()->create([
            'stock_id' => $stock->id,
            'analysable_type' => NewsArticle::class,
            'analysable_id' => $article->id,
            'prompt_version' => 'v2',
        ]);

        // Act
        $analyses = $this->repository->findNewsAnalysesBetween(
            $stock->id,
            CarbonImmutable::parse('2026-07-05 12:00:00'),
            CarbonImmutable::parse('2026-07-12 12:00:00'),
            'v2',
        );

        // Assert
        $this->assertSame([$current->id], $analyses->pluck('id')->all());
    }

    #[Test]
    public function 同一銘柄同一日のシグナルを冪等に更新できる(): void
    {
        // Arrange
        $stock = Stock::factory()->create();
        $date = CarbonImmutable::parse('2026-07-11');
        $first = $this->signalData(2.5);
        $updated = $this->signalData(6.75);

        // Act
        $this->repository->upsertSignal($stock->id, $date, 'v2', $first);
        $saved = $this->repository->upsertSignal($stock->id, $date, 'v2', $updated);

        // Assert
        $this->assertDatabaseCount('stock_signals', 1);
        $this->assertSame('6.75', $saved->total_score);
        $this->assertSame('v2', $saved->prompt_version);
    }

    #[Test]
    public function 同一銘柄同一日でもprompt_version別にシグナルを保持できる(): void
    {
        // Arrange
        $stock = Stock::factory()->create();
        $date = CarbonImmutable::parse('2026-07-11');

        // Act
        $legacy = $this->repository->upsertSignal($stock->id, $date, 'v1', $this->signalData(2.5));
        $current = $this->repository->upsertSignal($stock->id, $date, 'v2', $this->signalData(6.75));

        // Assert
        $this->assertDatabaseCount('stock_signals', 2);
        $this->assertNotSame($legacy->id, $current->id);
        $this->assertSame(['v1', 'v2'], $stock->signals()->orderBy('prompt_version')->pluck('prompt_version')->all());
    }

    #[Test]
    public function 有効なウォッチリスト銘柄だけをシグナル対象にできる(): void
    {
        // Arrange
        $user = User::factory()->create();
        $tracked = Stock::factory()->create();
        $ignored = Stock::factory()->create();
        Watchlist::factory()->create(['user_id' => $user->id, 'stock_id' => $tracked->id]);
        Watchlist::factory()->create([
            'user_id' => $user->id,
            'stock_id' => $ignored->id,
            'is_active' => false,
        ]);

        // Act
        $stockIds = $this->repository->findTrackedStockIds();

        // Assert
        $this->assertSame([$tracked->id], $stockIds);
    }

    private function signalData(float $score): GeneratedStockSignalData
    {
        return new GeneratedStockSignalData(
            newsScore: $score,
            disclosureScore: 0.0,
            macroScore: 0.0,
            totalScore: $score,
            positiveCount: 1,
            negativeCount: 0,
            neutralCount: 0,
            reason: 'Test signal',
        );
    }
}
