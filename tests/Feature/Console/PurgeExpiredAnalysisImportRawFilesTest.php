<?php

declare(strict_types=1);

namespace Tests\Feature\Console;

use App\Enums\AnalysisImportStatus;
use App\Models\AnalysisImport;
use Illuminate\Filesystem\FilesystemAdapter;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Mockery;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

final class PurgeExpiredAnalysisImportRawFilesTest extends TestCase
{
    use RefreshDatabase;

    #[Test]
    public function 期限切れrawだけを削除して監査metadataを保持する(): void
    {
        // Arrange
        Storage::fake('local');
        $validated = AnalysisImport::factory()->create([
            'status' => AnalysisImportStatus::Validated,
            'private_file_path' => 'analysis-imports/validated.csv',
            'raw_stored_at' => now()->subDays(31),
            'normalized_payload' => ['summary' => 'kept'],
        ]);
        $committed = AnalysisImport::factory()->create([
            'status' => AnalysisImportStatus::Committed,
            'revision' => 1,
            'private_file_path' => 'analysis-imports/committed.csv',
            'committed_at' => now()->subDays(366),
        ]);
        $recent = AnalysisImport::factory()->create([
            'status' => AnalysisImportStatus::Validated,
            'private_file_path' => 'analysis-imports/recent.csv',
            'raw_stored_at' => now()->subDays(29),
        ]);
        foreach ([$validated, $committed, $recent] as $import) {
            Storage::disk('local')->put($import->private_file_path, 'csv');
        }

        // Act
        $this->artisan('analysis-imports:purge-expired-raw')
            ->expectsOutput('Deleted 2 expired raw CSV file(s).')
            ->assertSuccessful();

        // Assert
        $validated->refresh();
        $committed->refresh();
        $recent->refresh();
        $this->assertSame(AnalysisImportStatus::Stale, $validated->status);
        $this->assertSame('raw_expired', $validated->stale_history[0]['reason']);
        $this->assertSame(['summary' => 'kept'], $validated->normalized_payload);
        $this->assertNull($validated->private_file_path);
        $this->assertNull($committed->private_file_path);
        $this->assertNotNull($recent->private_file_path);
        Storage::disk('local')->assertMissing('analysis-imports/validated.csv');
        Storage::disk('local')->assertMissing('analysis-imports/committed.csv');
        Storage::disk('local')->assertExists('analysis-imports/recent.csv');
    }

    #[Test]
    public function storage削除失敗でfileが残る場合はdbを更新せず削除件数に含めない(): void
    {
        // Arrange
        config(['stock_analysis.disk' => 'local']);
        $import = AnalysisImport::factory()->create([
            'status' => AnalysisImportStatus::Validated,
            'private_file_path' => 'analysis-imports/delete-failed.csv',
            'raw_stored_at' => now()->subDays(31),
        ]);
        $disk = Mockery::mock(FilesystemAdapter::class);
        $disk->shouldReceive('delete')
            ->once()
            ->with('analysis-imports/delete-failed.csv')
            ->andReturn(false);
        $disk->shouldReceive('exists')
            ->once()
            ->with('analysis-imports/delete-failed.csv')
            ->andReturn(true);
        Storage::shouldReceive('disk')
            ->once()
            ->with('local')
            ->andReturn($disk);
        Log::shouldReceive('error')
            ->once()
            ->with('Failed to delete expired analysis import raw CSV.', [
                'analysis_import_id' => $import->id,
                'private_file_path' => 'analysis-imports/delete-failed.csv',
                'delete_reported' => false,
            ]);

        // Act
        $this->artisan('analysis-imports:purge-expired-raw')
            ->expectsOutput('Deleted 0 expired raw CSV file(s).')
            ->assertSuccessful();

        // Assert
        $import->refresh();
        $this->assertSame(AnalysisImportStatus::Validated, $import->status);
        $this->assertSame('analysis-imports/delete-failed.csv', $import->private_file_path);
        $this->assertNull($import->raw_file_deleted_at);
        $this->assertNull($import->stale_history);
    }
}
