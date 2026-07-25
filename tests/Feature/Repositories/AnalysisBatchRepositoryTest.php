<?php

declare(strict_types=1);

namespace Tests\Feature\Repositories;

use App\Data\Analysis\PersistAnalysisBatchData;
use App\Enums\AnalysisBatchStatus;
use App\Models\AnalysisBatch;
use App\Models\AnalysisImport;
use App\Models\NewsArticle;
use App\Models\Stock;
use App\Models\User;
use App\Models\Watchlist;
use App\Repositories\AnalysisBatchRepository;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

final class AnalysisBatchRepositoryTest extends TestCase
{
    use RefreshDatabase;

    #[Test]
    public function 所有するactive銘柄の期間内ニュースだけを候補として返す(): void
    {
        // Arrange
        $user = User::factory()->create();
        $stock = Stock::factory()->create();
        Watchlist::factory()->for($user)->for($stock)->create(['is_active' => true]);
        $first = NewsArticle::factory()->create(['published_at' => now()->subDays(2)]);
        $second = NewsArticle::factory()->create(['published_at' => now()->subDay()]);
        $outside = NewsArticle::factory()->create(['published_at' => now()->subDays(10)]);
        $stock->newsArticles()->attach([$first->id, $second->id, $outside->id]);
        $repository = new AnalysisBatchRepository;

        // Act
        $candidates = $repository->findNewsCandidates(
            $user->id,
            $stock->id,
            now()->subDays(3),
            now(),
        );

        // Assert
        $this->assertSame([$first->id, $second->id], array_column($candidates, 'id'));
    }

    #[Test]
    public function aggregate_dtoからbatchとsnapshotを同時に作成する(): void
    {
        // Arrange
        $user = User::factory()->create();
        $stock = Stock::factory()->create();
        $article = NewsArticle::factory()->create(['published_at' => now()->subDay()]);
        $repository = new AnalysisBatchRepository;
        $publicId = (string) Str::ulid();
        $prompt = 'stored prompt';
        $snapshotHash = hash('sha256', 'snapshot');

        // Act
        $batch = $repository->create(new PersistAnalysisBatchData(
            publicId: $publicId,
            userId: $user->id,
            stockId: $stock->id,
            periodStartAt: now()->subDays(2),
            periodEndAt: now(),
            stockSnapshot: [
                'id' => $stock->id,
                'symbol' => $stock->symbol,
                'name' => $stock->name,
                'market' => $stock->market,
            ],
            promptVersion: 'stock-news-period-v1',
            resultSchemaVersion: 'stock-news-period-result-v1',
            promptText: $prompt,
            promptHash: hash('sha256', $prompt),
            status: AnalysisBatchStatus::Prepared,
            inputHash: hash('sha256', 'input'),
            newsCount: 1,
            sourceCharCount: 123,
            newsSnapshots: [[
                'news_article_id' => $article->id,
                'news_key' => 'N001',
                'position' => 1,
                'title' => $article->title,
                'summary' => $article->summary,
                'body' => $article->body,
                'source' => $article->source,
                'url' => $article->url,
                'published_at' => $article->published_at,
                'content_hash' => $article->content_hash,
                'snapshot_hash' => $snapshotHash,
            ]],
        ));

        // Assert
        $this->assertSame($publicId, $batch->public_id);
        $this->assertSame('stock-news-period-result-v1', $batch->result_schema_version);
        $this->assertCount(1, $batch->newsSnapshots);
        $this->assertSame($snapshotHash, $batch->newsSnapshots->first()?->snapshot_hash);
    }

    #[Test]
    public function 最新期間のcompleted_batchを選択する(): void
    {
        // Arrange
        $user = User::factory()->create();
        $stock = Stock::factory()->create();
        $older = AnalysisBatch::factory()->for($user)->for($stock)->create([
            'period_start_at' => now()->subDays(20),
            'period_end_at' => now()->subDays(10),
        ]);
        $newer = AnalysisBatch::factory()->for($user)->for($stock)->create([
            'period_start_at' => now()->subDays(10),
            'period_end_at' => now(),
        ]);
        foreach ([$older, $newer] as $batch) {
            $import = AnalysisImport::factory()->for($batch)->create([
                'revision' => 1,
                'committed_at' => now(),
            ]);
            $batch->update([
                'current_import_id' => $import->id,
                'status' => AnalysisBatchStatus::Completed,
            ]);
        }

        // Act
        $latest = (new AnalysisBatchRepository)->findLatestCompletedByUserAndStock(
            $user->id,
            $stock->id,
        );

        // Assert
        $this->assertSame($newer->id, $latest?->id);
    }

    #[Test]
    public function statusで所有batchだけを絞りpaginationへqueryを引き継ぐ(): void
    {
        // Arrange
        $owner = User::factory()->create();
        $otherUser = User::factory()->create();
        AnalysisBatch::factory()->for($owner)->create([
            'status' => AnalysisBatchStatus::Prepared,
        ]);
        AnalysisBatch::factory()->for($owner)->count(2)->create([
            'status' => AnalysisBatchStatus::Completed,
        ]);
        AnalysisBatch::factory()->for($otherUser)->create([
            'status' => AnalysisBatchStatus::Completed,
        ]);
        request()->query->replace([
            'status' => (string) AnalysisBatchStatus::Completed->value,
        ]);
        $repository = new AnalysisBatchRepository;

        // Act
        $paginator = $repository->paginateOwned(
            $owner->id,
            AnalysisBatchStatus::Completed,
            1,
        );

        // Assert
        $this->assertSame(2, $paginator->total());
        $this->assertCount(1, $paginator->items());
        $this->assertSame($owner->id, $paginator->items()[0]->user_id);
        $this->assertSame(
            AnalysisBatchStatus::Completed,
            $paginator->items()[0]->status,
        );
        $nextUrl = $paginator->nextPageUrl();
        $this->assertNotNull($nextUrl);
        parse_str((string) parse_url($nextUrl, PHP_URL_QUERY), $query);
        $this->assertSame('2', $query['page']);
        $this->assertSame(
            (string) AnalysisBatchStatus::Completed->value,
            $query['status'],
        );
    }
}
