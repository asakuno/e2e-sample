<?php

declare(strict_types=1);

namespace Tests\Feature\UseCases\Analysis;

use App\Enums\AnalysisBatchStatus;
use App\Enums\AnalysisImportMode;
use App\Enums\AnalysisImportStatus;
use App\Models\AnalysisBatch;
use App\Models\AnalysisBatchNews;
use App\Models\AnalysisImport;
use App\Models\Stock;
use App\Models\User;
use App\Services\Analysis\AnalysisResultCsvTemplateBuilder;
use App\UseCases\Analysis\CommitAnalysisImportUseCase;
use App\UseCases\Analysis\ReplaceAnalysisImportUseCase;
use App\UseCases\Analysis\UploadAnalysisImportUseCase;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use PHPUnit\Framework\Attributes\Test;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Tests\TestCase;

final class FinalizeAnalysisImportUseCaseTest extends TestCase
{
    use RefreshDatabase;

    #[Test]
    public function initialをrevision1としてresultとsignalへ同時確定する(): void
    {
        // Arrange
        Storage::fake('local');
        [$user, $batch] = $this->batch();
        $import = $this->upload($user, $batch, $this->csv($batch, 6, 78, 'initial'));

        // Act
        $committed = app(CommitAnalysisImportUseCase::class)->execute(
            $user->id,
            $batch->id,
            $import->id,
        );

        // Assert
        $this->assertSame(AnalysisImportStatus::Committed, $committed->status);
        $this->assertSame(1, $committed->revision);
        $batch->refresh();
        $this->assertSame(AnalysisBatchStatus::Completed, $batch->status);
        $this->assertSame($committed->id, $batch->current_import_id);
        $this->assertDatabaseHas('analysis_results', [
            'stock_id' => $batch->stock_id,
            'analysable_type' => AnalysisBatch::class,
            'analysable_id' => $batch->id,
            'source_import_id' => $committed->id,
            'model_provider' => 'chatgpt_manual',
            'input_tokens' => null,
            'output_tokens' => null,
        ]);
        $this->assertDatabaseHas('period_analysis_signals', [
            'user_id' => $user->id,
            'stock_id' => $batch->stock_id,
            'source_analysis_import_id' => $committed->id,
            'news_score' => '4.68',
            'total_score' => '4.68',
            'positive_count' => 1,
            'negative_count' => 0,
            'neutral_count' => 0,
        ]);
    }

    #[Test]
    public function 明示的replaceでrevisionを加算し旧payloadを保持する(): void
    {
        // Arrange
        Storage::fake('local');
        [$user, $batch] = $this->batch();
        $first = $this->upload($user, $batch, $this->csv($batch, 2, 50, 'revision 1'));
        $first = app(CommitAnalysisImportUseCase::class)->execute(
            $user->id,
            $batch->id,
            $first->id,
        );
        $firstPayload = $first->normalized_payload;
        $second = $this->upload(
            $user,
            $batch->refresh(),
            $this->csv($batch, -8, 90, 'revision 2'),
            AnalysisImportMode::Replace,
            '根拠を見直したため',
        );

        // Act
        $second = app(ReplaceAnalysisImportUseCase::class)->execute(
            $user->id,
            $batch->id,
            $second->id,
        );

        // Assert
        $this->assertSame(2, $second->revision);
        $this->assertSame(AnalysisImportStatus::Superseded, $first->fresh()?->status);
        $this->assertSame($firstPayload, $first->fresh()?->normalized_payload);
        $this->assertSame($second->id, $batch->fresh()?->current_import_id);
        $this->assertDatabaseHas('analysis_results', [
            'analysable_type' => AnalysisBatch::class,
            'analysable_id' => $batch->id,
            'source_import_id' => $second->id,
            'impact_score' => -8,
        ]);
        $this->assertDatabaseHas('period_analysis_signals', [
            'user_id' => $user->id,
            'stock_id' => $batch->stock_id,
            'source_analysis_import_id' => $second->id,
            'news_score' => '-7.20',
        ]);
    }

    #[Test]
    public function current競合を後勝ちにせずstale履歴へ記録する(): void
    {
        // Arrange
        Storage::fake('local');
        [$user, $batch] = $this->batch();
        $initial = $this->upload($user, $batch, $this->csv($batch, 1, 50, 'initial'));
        app(CommitAnalysisImportUseCase::class)->execute($user->id, $batch->id, $initial->id);
        $firstReplacement = $this->upload(
            $user,
            $batch->refresh(),
            $this->csv($batch, 2, 50, 'replacement A'),
            AnalysisImportMode::Replace,
            'A',
        );
        $staleCandidate = $this->upload(
            $user,
            $batch,
            $this->csv($batch, 3, 50, 'replacement B'),
            AnalysisImportMode::Replace,
            'B',
        );
        app(ReplaceAnalysisImportUseCase::class)->execute(
            $user->id,
            $batch->id,
            $firstReplacement->id,
        );

        // Act
        try {
            app(ReplaceAnalysisImportUseCase::class)->execute(
                $user->id,
                $batch->id,
                $staleCandidate->id,
            );
            $this->fail('current競合は409で拒否される必要があります。');
        } catch (HttpException $exception) {
            $this->assertSame(409, $exception->getStatusCode());
        }

        // Assert
        $staleCandidate->refresh();
        $this->assertSame(AnalysisImportStatus::Stale, $staleCandidate->status);
        $this->assertSame('current_import_changed', $staleCandidate->stale_history[0]['reason']);
        $this->assertSame($firstReplacement->id, $batch->fresh()?->current_import_id);
    }

    #[Test]
    public function 過去期間の後確定では最新signalを上書きしない(): void
    {
        // Arrange
        Storage::fake('local');
        $user = User::factory()->create();
        $stock = Stock::factory()->create();
        [, $newer] = $this->batch($user, $stock, now()->subDays(5), now());
        [, $older] = $this->batch($user, $stock, now()->subDays(20), now()->subDays(10));
        $newerImport = $this->upload($user, $newer, $this->csv($newer, 8, 100, 'newer'));
        app(CommitAnalysisImportUseCase::class)->execute($user->id, $newer->id, $newerImport->id);
        $olderImport = $this->upload($user, $older, $this->csv($older, -10, 100, 'older'));

        // Act
        app(CommitAnalysisImportUseCase::class)->execute($user->id, $older->id, $olderImport->id);

        // Assert
        $this->assertDatabaseHas('period_analysis_signals', [
            'user_id' => $user->id,
            'stock_id' => $stock->id,
            'source_analysis_import_id' => $newerImport->id,
            'news_score' => '8.00',
        ]);
    }

    /**
     * @return array{User, AnalysisBatch}
     */
    private function batch(
        ?User $user = null,
        ?Stock $stock = null,
        mixed $periodStart = null,
        mixed $periodEnd = null,
    ): array {
        $user ??= User::factory()->create();
        $stock ??= Stock::factory()->create();
        $batch = AnalysisBatch::factory()->for($user)->for($stock)->create([
            'status' => AnalysisBatchStatus::Exported,
            'exported_at' => now(),
            'period_start_at' => $periodStart ?? now()->subDays(7),
            'period_end_at' => $periodEnd ?? now(),
        ]);
        AnalysisBatchNews::factory()->for($batch)->create([
            'news_key' => 'N001',
            'position' => 1,
        ]);

        return [$user, $batch];
    }

    private function upload(
        User $user,
        AnalysisBatch $batch,
        string $csv,
        AnalysisImportMode $mode = AnalysisImportMode::Initial,
        ?string $reason = null,
    ): AnalysisImport {
        return app(UploadAnalysisImportUseCase::class)->execute(
            $user->id,
            $batch->id,
            UploadedFile::fake()->createWithContent('analysis.csv', $csv),
            'gpt-5',
            $mode,
            $reason,
        );
    }

    private function csv(
        AnalysisBatch $batch,
        int $impact,
        int $confidence,
        string $summary,
    ): string {
        $stream = fopen('php://temp', 'w+b');
        $this->assertNotFalse($stream);
        fputcsv($stream, AnalysisResultCsvTemplateBuilder::HEADERS, ',', '"', '');
        fputcsv($stream, [
            'stock-news-period-result-v1',
            $batch->public_id,
            $batch->prompt_version,
            $summary,
            $impact > 0 ? 'positive' : ($impact < 0 ? 'negative' : 'neutral'),
            (string) $impact,
            (string) $confidence,
            'short_term',
            '["factor"]',
            '[]',
            '[]',
            '[{"news_key":"N001","type":"positive","note":"evidence"}]',
            "reason: {$summary}",
        ], ',', '"', '');
        rewind($stream);
        $csv = stream_get_contents($stream);
        fclose($stream);
        $this->assertIsString($csv);

        return $csv;
    }
}
