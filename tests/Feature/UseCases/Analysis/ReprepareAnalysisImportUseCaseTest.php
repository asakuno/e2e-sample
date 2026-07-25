<?php

declare(strict_types=1);

namespace Tests\Feature\UseCases\Analysis;

use App\Data\Analysis\AnalysisResultImportData;
use App\Data\Analysis\UploadAnalysisImportData;
use App\Enums\AnalysisBatchStatus;
use App\Enums\AnalysisImportMode;
use App\Enums\AnalysisImportStatus;
use App\Models\AnalysisBatch;
use App\Models\AnalysisBatchNews;
use App\Models\AnalysisImport;
use App\Models\User;
use App\Repositories\AnalysisImportRepositoryInterface;
use App\Services\Analysis\AnalysisResultCsvTemplateBuilder;
use App\UseCases\Analysis\ReprepareAnalysisImportUseCase;
use App\UseCases\Analysis\UploadAnalysisImportUseCase;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use PDOException;
use PHPUnit\Framework\Attributes\Test;
use RuntimeException;
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

    #[Test]
    public function raw保持期限ちょうどで復元なしの再準備を拒否する(): void
    {
        // Arrange
        Storage::fake('local');
        $now = now()->startOfSecond();
        $this->travelTo($now);
        [$user, $batch, $stale] = $this->staleImport();
        $stale->update([
            'raw_stored_at' => $now->copy()->subDays(
                (int) config('stock_analysis.raw_uncommitted_retention_days'),
            ),
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
            null,
        );
    }

    #[Test]
    public function db_pathがありdisk_missingの復元後に最終失敗した場合はrawファイルを削除する(): void
    {
        // Arrange
        Storage::fake('local');
        [$user, $batch, $stale, $csv] = $this->staleImport();
        $oldPath = $stale->private_file_path;
        $this->assertNotNull($oldPath);
        Storage::disk('local')->delete($oldPath);
        $this->bindFailingReprepareRepository();

        // Assert
        $this->expectException(RuntimeException::class);

        // Act
        try {
            app(ReprepareAnalysisImportUseCase::class)->execute(
                $user->id,
                $batch->id,
                $stale->id,
                'unknown',
                null,
                UploadedFile::fake()->createWithContent('restored.csv', $csv),
            );
        } finally {
            $this->assertSame([], Storage::disk('local')->allFiles());
            $this->assertSame($oldPath, $stale->fresh()?->private_file_path);
        }
    }

    #[Test]
    public function 既存rawへの上書き後に最終失敗しても元のpathを削除しない(): void
    {
        // Arrange
        Storage::fake('local');
        [$user, $batch, $stale, $csv] = $this->staleImport();
        $oldPath = $stale->private_file_path;
        $this->assertNotNull($oldPath);
        $this->bindFailingReprepareRepository();

        // Assert
        $this->expectException(RuntimeException::class);

        // Act
        try {
            app(ReprepareAnalysisImportUseCase::class)->execute(
                $user->id,
                $batch->id,
                $stale->id,
                'unknown',
                null,
                UploadedFile::fake()->createWithContent('restored.csv', $csv),
            );
        } finally {
            Storage::disk('local')->assertExists($oldPath);
            $this->assertSame($oldPath, $stale->fresh()?->private_file_path);
        }
    }

    #[Test]
    public function deadlockリトライ後も復元rawファイルを1つだけ保存する(): void
    {
        // Arrange
        Storage::fake('local');
        $connection = DB::connection();
        $this->assertSame(1, $connection->transactionLevel());
        $connection->rollBack();
        $user = null;
        $batch = null;
        $stock = null;

        try {
            [$user, $batch, $stale, $csv] = $this->staleImport();
            $stock = $batch->stock()->firstOrFail();
            $oldPath = $stale->private_file_path;
            $this->assertNotNull($oldPath);
            Storage::disk('local')->delete($oldPath);
            $stale->update([
                'private_file_path' => null,
                'raw_stored_at' => now()->subDays(31),
                'raw_file_deleted_at' => now(),
            ]);
            $realRepository = app(AnalysisImportRepositoryInterface::class);
            $repository = $this->createMock(AnalysisImportRepositoryInterface::class);
            $repository->expects($this->exactly(2))
                ->method('lockOwnedByBatchAndId')
                ->willReturnCallback(
                    fn (int $userId, int $batchId, int $importId): ?AnalysisImport => $realRepository
                        ->lockOwnedByBatchAndId($userId, $batchId, $importId),
                );
            $repository->expects($this->exactly(2))
                ->method('rawStorageBytesForUser')
                ->willReturnCallback(
                    fn (int $userId): int => $realRepository->rawStorageBytesForUser($userId),
                );
            $attempts = 0;
            $repository->expects($this->exactly(2))
                ->method('reprepareStale')
                ->willReturnCallback(
                    function (
                        int $importId,
                        UploadAnalysisImportData $data,
                    ) use ($realRepository, &$attempts): AnalysisImport {
                        $import = $realRepository->reprepareStale($importId, $data);
                        $attempts++;

                        if ($attempts === 1) {
                            throw new PDOException('deadlock detected', 40001);
                        }

                        return $import;
                    },
                );
            $repository->expects($this->once())
                ->method('markValidated')
                ->willReturnCallback(
                    fn (int $importId, AnalysisResultImportData $payload): AnalysisImport => $realRepository
                        ->markValidated($importId, $payload),
                );
            $this->app->instance(AnalysisImportRepositoryInterface::class, $repository);

            // Act
            $reprepared = app(ReprepareAnalysisImportUseCase::class)->execute(
                $user->id,
                $batch->id,
                $stale->id,
                'unknown',
                null,
                UploadedFile::fake()->createWithContent('restored.csv', $csv),
            );

            // Assert
            $this->assertSame(2, $attempts);
            $this->assertStringStartsWith(
                "analysis-imports/{$batch->public_id}/",
                $reprepared->private_file_path,
            );
            $this->assertSame([$reprepared->private_file_path], Storage::disk('local')->allFiles());
            $this->assertSame(1, $batch->imports()->count());
        } finally {
            $batch?->delete();
            $user?->delete();
            $stock?->delete();

            if ($connection->transactionLevel() === 0) {
                $connection->beginTransaction();
            }
        }
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

    private function bindFailingReprepareRepository(): void
    {
        $realRepository = app(AnalysisImportRepositoryInterface::class);
        $repository = $this->createMock(AnalysisImportRepositoryInterface::class);
        $repository->expects($this->once())
            ->method('lockOwnedByBatchAndId')
            ->willReturnCallback(
                fn (int $userId, int $batchId, int $importId): ?AnalysisImport => $realRepository
                    ->lockOwnedByBatchAndId($userId, $batchId, $importId),
            );
        $repository->expects($this->once())
            ->method('reprepareStale')
            ->willReturnCallback(
                static function (int $importId, UploadAnalysisImportData $data): never {
                    throw new RuntimeException('final failure');
                },
            );
        $this->app->instance(AnalysisImportRepositoryInterface::class, $repository);
    }
}
