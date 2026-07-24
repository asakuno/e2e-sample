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
use App\UseCases\Analysis\UploadAnalysisImportUseCase;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

final class UploadAnalysisImportUseCaseTest extends TestCase
{
    use RefreshDatabase;

    #[Test]
    public function 正常csvをprivate保存してvalidated_importを作成する(): void
    {
        // Arrange
        Storage::fake('local');
        [$user, $batch] = $this->exportedBatch();

        // Act
        $import = app(UploadAnalysisImportUseCase::class)->execute(
            userId: $user->id,
            batchId: $batch->id,
            file: UploadedFile::fake()->createWithContent('chatgpt.csv', $this->validCsv($batch)),
            modelName: 'gpt-5',
            mode: AnalysisImportMode::Initial,
        );

        // Assert
        $this->assertSame(AnalysisImportStatus::Validated, $import->status);
        $this->assertSame('gpt-5', $import->model_name);
        $this->assertNull($import->revision);
        $this->assertNotNull($import->normalized_payload);
        $this->assertNotNull($import->private_file_path);
        Storage::disk('local')->assertExists($import->private_file_path);
    }

    #[Test]
    public function 不正csvをraw保持したinvalid_importとして記録する(): void
    {
        // Arrange
        Storage::fake('local');
        [$user, $batch] = $this->exportedBatch();

        // Act
        $import = app(UploadAnalysisImportUseCase::class)->execute(
            $user->id,
            $batch->id,
            UploadedFile::fake()->createWithContent('invalid.csv', "wrong\nvalue\n"),
            'unknown',
            AnalysisImportMode::Initial,
        );

        // Assert
        $this->assertSame(AnalysisImportStatus::Invalid, $import->status);
        $this->assertArrayHasKey('_header', $import->validation_errors);
        $this->assertDatabaseCount('analysis_results', 0);
        $this->assertDatabaseCount('period_analysis_signals', 0);
    }

    #[Test]
    public function 同じbatchの同じraw_hashを全status横断で拒否する(): void
    {
        // Arrange
        Storage::fake('local');
        [$user, $batch] = $this->exportedBatch();
        $csv = $this->validCsv($batch);
        $useCase = app(UploadAnalysisImportUseCase::class);
        $useCase->execute(
            $user->id,
            $batch->id,
            UploadedFile::fake()->createWithContent('first.csv', $csv),
            'gpt-5',
            AnalysisImportMode::Initial,
        );

        // Assert
        $this->expectException(ValidationException::class);

        // Act
        $useCase->execute(
            $user->id,
            $batch->id,
            UploadedFile::fake()->createWithContent('second.csv', $csv),
            'gpt-5',
            AnalysisImportMode::Initial,
        );
    }

    #[Test]
    public function current有無とendpoint_modeの不一致を拒否する(): void
    {
        // Arrange
        Storage::fake('local');
        [$user, $batch] = $this->exportedBatch();
        $useCase = app(UploadAnalysisImportUseCase::class);

        try {
            $useCase->execute(
                $user->id,
                $batch->id,
                UploadedFile::fake()->createWithContent('replace.csv', $this->validCsv($batch)),
                'gpt-5',
                AnalysisImportMode::Replace,
                '修正',
            );
            $this->fail('currentなしのreplaceは拒否される必要があります。');
        } catch (ValidationException) {
            $this->assertDatabaseCount('analysis_imports', 0);
        }

        $current = AnalysisImport::factory()->for($batch)->create([
            'status' => AnalysisImportStatus::Committed,
            'revision' => 1,
            'committed_at' => now(),
        ]);
        $batch->update([
            'current_import_id' => $current->id,
            'status' => AnalysisBatchStatus::Completed,
        ]);

        // Assert
        $this->expectException(ValidationException::class);

        // Act
        $useCase->execute(
            $user->id,
            $batch->id,
            UploadedFile::fake()->createWithContent('initial.csv', $this->validCsv($batch)),
            'gpt-5',
            AnalysisImportMode::Initial,
        );
    }

    #[Test]
    public function raw_quota超過を保存前に拒否する(): void
    {
        // Arrange
        Storage::fake('local');
        config(['stock_analysis.raw_storage_quota_bytes' => 1]);
        [$user, $batch] = $this->exportedBatch();

        // Assert
        $this->expectException(ValidationException::class);

        // Act
        try {
            app(UploadAnalysisImportUseCase::class)->execute(
                $user->id,
                $batch->id,
                UploadedFile::fake()->createWithContent('large.csv', $this->validCsv($batch)),
                'gpt-5',
                AnalysisImportMode::Initial,
            );
        } finally {
            $this->assertSame([], Storage::disk('local')->allFiles());
        }
    }

    /**
     * @return array{User, AnalysisBatch}
     */
    private function exportedBatch(): array
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

        return [$user, $batch];
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
            '期間ニュースの要約',
            'positive',
            '6',
            '78',
            'short_term',
            '["需要増"]',
            '[]',
            '["不確実性"]',
            '[{"news_key":"N001","type":"positive","note":"需要増"}]',
            'ポジティブ材料が優勢です。',
        ], ',', '"', '');
        rewind($stream);
        $csv = stream_get_contents($stream);
        fclose($stream);
        $this->assertIsString($csv);

        return $csv;
    }
}
