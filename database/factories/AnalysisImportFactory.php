<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Enums\AnalysisImportMode;
use App\Enums\AnalysisImportStatus;
use App\Models\AnalysisBatch;
use App\Models\AnalysisImport;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<AnalysisImport>
 */
class AnalysisImportFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'analysis_batch_id' => AnalysisBatch::factory(),
            'base_current_import_id' => null,
            'revision' => null,
            'mode' => AnalysisImportMode::Initial,
            'status' => AnalysisImportStatus::Uploaded,
            'model_name' => 'unknown',
            'original_filename' => 'analysis.csv',
            'private_file_path' => 'analysis-imports/factory/import.csv',
            'file_size' => 512,
            'file_hash' => hash('sha256', fake()->uuid()),
            'normalized_payload' => null,
            'validation_errors' => null,
            'stale_history' => null,
            'replacement_reason' => null,
            'uploaded_at' => now(),
            'raw_stored_at' => now(),
        ];
    }
}
