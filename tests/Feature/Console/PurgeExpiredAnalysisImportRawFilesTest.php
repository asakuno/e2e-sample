<?php

declare(strict_types=1);

namespace Tests\Feature\Console;

use App\Enums\AnalysisImportStatus;
use App\Models\AnalysisImport;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
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
}
