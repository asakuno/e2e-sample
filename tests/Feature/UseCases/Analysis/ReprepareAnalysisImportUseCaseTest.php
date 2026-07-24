<?php

declare(strict_types=1);

namespace Tests\Feature\UseCases\Analysis;

use App\Enums\AnalysisBatchStatus;
use App\Enums\AnalysisImportMode;
use App\Enums\AnalysisImportStatus;
use App\Models\AnalysisBatch;
use App\Models\AnalysisBatchNews;
use App\Models\AnalysisImport;
use App\Models\User;
use App\Services\Analysis\AnalysisResultCsvTemplateBuilder;
use App\UseCases\Analysis\ReprepareAnalysisImportUseCase;
use App\UseCases\Analysis\UploadAnalysisImportUseCase;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

final class ReprepareAnalysisImportUseCaseTest extends TestCase
{
    use RefreshDatabase;

    #[Test]
    public function 保存済みrawを最新currentに対するreplaceとして再準備する(): void
    {
        // Arrange
        Storage::fake('local');
        [$user, $batch, $stale] = $this->staleImport();
        $current = AnalysisImport::factory()->for($batch)->create([
            'status' => AnalysisImportStatus::Committed,
            'revision' => 1,
            'committed_at' => now(),
        ]);
        $batch->update([
            'current_import_id' => $current->id,
            'status' => AnalysisBatchStatus::Completed,
        ]);

        // Act
        $reprepared = app(ReprepareAnalysisImportUseCase::class)->execute(
            userId: $user->id,
            batchId: $batch->id,
            importId: $stale->id,
            modelName: 'gpt-5',
            replacementReason: '最新結果を反映するため',
            restoredFile: null,
        );

        // Assert
        $this->assertSame(AnalysisImportStatus::Validated, $reprepared->status);
        $this->assertSame(AnalysisImportMode::Replace, $reprepared->mode);
        $this->assertSame($current->id, $reprepared->base_current_import_id);
        $this->assertSame('最新結果を反映するため', $reprepared->replacement_reason);
    }

    #[Test]
    public function raw期限切れは同じhashのcsv再選択時だけ復元する(): void
    {
        // Arrange
        Storage::fake('local');
        [$user, $batch, $stale, $csv] = $this->staleImport();
        $stale->update(['raw_stored_at' => now()->subDays(31)]);

        try {
            app(ReprepareAnalysisImportUseCase::class)->execute(
                $user->id,
                $batch->id,
                $stale->id,
                'unknown',
                null,
                null,
            );
            $this->fail('期限切れrawにはCSV再選択が必要です。');
        } catch (ValidationException) {
            $this->assertSame(AnalysisImportStatus::Stale, $stale->fresh()?->status);
        }

        // Act
        $restored = app(ReprepareAnalysisImportUseCase::class)->execute(
            $user->id,
            $batch->id,
            $stale->id,
            'unknown',
            null,
            UploadedFile::fake()->createWithContent('restored.csv', $csv),
        );

        // Assert
        $this->assertSame(AnalysisImportStatus::Validated, $restored->status);
        $this->assertTrue($restored->raw_stored_at?->isToday());
        Storage::disk('local')->assertExists($restored->private_file_path);
    }

    #[Test]
    public function 異なるraw_hashの復元を拒否する(): void
    {
        // Arrange
        Storage::fake('local');
        [$user, $batch, $stale] = $this->staleImport();
        $stale->update([
            'raw_stored_at' => now()->subDays(31),
            'private_file_path' => null,
        ]);

        // Assert
        $this->expectException(ValidationException::class);

        // Act
        app(ReprepareAnalysisImportUseCase::class)->execute(
            $user->id,
            $batch->id,
            $stale->id,
            'unknown',
            null,
            UploadedFile::fake()->createWithContent('different.csv', 'different'),
        );
    }

    /**
     * @return array{User, AnalysisBatch, AnalysisImport, string}
     */
    private function staleImport(): array
    {
        $user = User::factory()->create();
        $batch = AnalysisBatch::factory()->for($user)->create([
            'status' => AnalysisBatchStatus::Exported,
            'exported_at' => now(),
        ]);
        AnalysisBatchNews::factory()->for($batch)->create([
            'news_key' => 'N001',
            'position' => 1,
        ]);
        $csv = $this->validCsv($batch);
        $import = app(UploadAnalysisImportUseCase::class)->execute(
            $user->id,
            $batch->id,
            UploadedFile::fake()->createWithContent('analysis.csv', $csv),
            'unknown',
            AnalysisImportMode::Initial,
        );
        $import->update(['status' => AnalysisImportStatus::Stale]);

        return [$user, $batch, $import->refresh(), $csv];
    }

    private function validCsv(AnalysisBatch $batch): string
    {
        $stream = fopen('php://temp', 'w+b');
        $this->assertNotFalse($stream);
        fputcsv($stream, AnalysisResultCsvTemplateBuilder::HEADERS, ',', '"', '');
        fputcsv($stream, [
            'stock-news-period-result-v1',
            $batch->public_id,
            $batch->prompt_version,
            '要約',
            'neutral',
            '1',
            '50',
            'unknown',
            '[]',
            '[]',
            '[]',
            '[{"news_key":"N001","type":"context","note":"背景"}]',
            '理由',
        ], ',', '"', '');
        rewind($stream);
        $csv = stream_get_contents($stream);
        fclose($stream);
        $this->assertIsString($csv);

        return $csv;
    }
}
