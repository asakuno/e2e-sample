<?php

declare(strict_types=1);

namespace Tests\Feature\Repositories;

use App\Enums\AnalysisImportStatus;
use App\Models\AnalysisBatch;
use App\Models\AnalysisImport;
use App\Models\User;
use App\Repositories\AnalysisImportRepository;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

final class AnalysisImportRepositoryTest extends TestCase
{
    use RefreshDatabase;

    #[Test]
    public function ownerとbatchで絞りrevision関係を先読みしてimportを取得する(): void
    {
        // Arrange
        $owner = User::factory()->create();
        $otherUser = User::factory()->create();
        $batch = AnalysisBatch::factory()->for($owner)->create();
        $otherBatch = AnalysisBatch::factory()->for($owner)->create();
        $baseCurrent = AnalysisImport::factory()->for($batch)->create([
            'revision' => 4,
            'status' => AnalysisImportStatus::Superseded,
        ]);
        $current = AnalysisImport::factory()->for($batch)->create([
            'revision' => 5,
            'status' => AnalysisImportStatus::Committed,
        ]);
        AnalysisImport::factory()->for($batch)->create([
            'revision' => 8,
            'status' => AnalysisImportStatus::Superseded,
        ]);
        $target = AnalysisImport::factory()->for($batch)->create([
            'base_current_import_id' => $baseCurrent->id,
            'status' => AnalysisImportStatus::Stale,
        ]);
        $batch->update(['current_import_id' => $current->id]);
        $repository = new AnalysisImportRepository;

        // Act
        $found = $repository->findOwnedByBatchAndId(
            $owner->id,
            $batch->id,
            $target->id,
        );

        // Assert
        $this->assertNotNull($found);
        $this->assertSame($target->id, $found->id);
        $this->assertTrue($found->relationLoaded('baseCurrentImport'));
        $this->assertSame(4, $found->baseCurrentImport?->revision);
        $this->assertTrue($found->relationLoaded('analysisBatch'));
        $this->assertTrue($found->analysisBatch->relationLoaded('currentImport'));
        $this->assertTrue($found->analysisBatch->relationLoaded('imports'));
        $this->assertSame(5, $found->analysisBatch->currentImport?->revision);
        $this->assertSame(8, $found->analysisBatch->imports->max('revision'));
        $this->assertNull($repository->findOwnedByBatchAndId(
            $otherUser->id,
            $batch->id,
            $target->id,
        ));
        $this->assertNull($repository->findOwnedByBatchAndId(
            $owner->id,
            $otherBatch->id,
            $target->id,
        ));
    }
}
