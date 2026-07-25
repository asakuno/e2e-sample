<?php

declare(strict_types=1);

namespace Tests\Feature\Models;

use App\Enums\AnalysisBatchStatus;
use App\Enums\AnalysisImportMode;
use App\Enums\AnalysisImportStatus;
use App\Models\AnalysisBatch;
use App\Models\AnalysisBatchNews;
use App\Models\AnalysisImport;
use App\Models\AnalysisResult;
use App\Models\NewsArticle;
use App\Models\PeriodAnalysisSignal;
use App\Models\Stock;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

final class ManualAnalysisModelRelationshipTest extends TestCase
{
    use RefreshDatabase;

    #[Test]
    public function phase2モデルの関連とenum_castを解決できる(): void
    {
        // Arrange
        $user = User::factory()->create();
        $stock = Stock::factory()->create();
        $batch = AnalysisBatch::factory()->for($user)->for($stock)->create();
        $snapshot = AnalysisBatchNews::factory()->for($batch)->create();
        $import = AnalysisImport::factory()->for($batch)->create([
            'mode' => AnalysisImportMode::Initial,
            'status' => AnalysisImportStatus::Committed,
            'revision' => 1,
            'committed_at' => now(),
        ]);
        $result = AnalysisResult::factory()->for($stock)->create([
            'source_import_id' => $import->id,
            'analysable_type' => AnalysisBatch::class,
            'analysable_id' => $batch->id,
            'prompt_version' => $batch->prompt_version,
            'evidence_items' => [
                ['news_key' => $snapshot->news_key, 'type' => 'positive', 'note' => '根拠'],
            ],
        ]);
        $batch->update([
            'current_import_id' => $import->id,
            'status' => AnalysisBatchStatus::Completed,
        ]);
        $signal = PeriodAnalysisSignal::factory()->create([
            'user_id' => $user->id,
            'stock_id' => $stock->id,
            'source_analysis_import_id' => $import->id,
        ]);

        // Assert
        $this->assertSame(AnalysisBatchStatus::Completed, $batch->fresh()?->status);
        $this->assertSame(AnalysisImportStatus::Committed, $import->fresh()?->status);
        $this->assertSame($snapshot->id, $batch->newsSnapshots()->first()?->id);
        $this->assertSame($import->id, $batch->currentImport()->first()?->id);
        $this->assertSame($result->id, $batch->result()->first()?->id);
        $this->assertSame($import->id, $result->sourceImport()->first()?->id);
        $this->assertSame($signal->id, $user->periodAnalysisSignals()->first()?->id);
        $this->assertSame($signal->id, $stock->periodAnalysisSignals()->first()?->id);
    }

    #[Test]
    public function 元ニュース削除後もsnapshotを保持する(): void
    {
        // Arrange
        $article = NewsArticle::factory()->create();
        $snapshot = AnalysisBatchNews::factory()
            ->for($article, 'newsArticle')
            ->create();

        // Act
        $article->delete();

        // Assert
        $this->assertDatabaseHas('analysis_batch_news', [
            'id' => $snapshot->id,
            'news_article_id' => null,
            'title' => $snapshot->title,
        ]);
    }

    #[Test]
    public function public_idをroute_keyとして利用する(): void
    {
        // Arrange
        $publicId = (string) Str::ulid();
        $batch = AnalysisBatch::factory()->create(['public_id' => $publicId]);

        // Assert
        $this->assertSame('public_id', $batch->getRouteKeyName());
        $this->assertSame($publicId, $batch->getRouteKey());
    }
}
