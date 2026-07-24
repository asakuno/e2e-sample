<?php

declare(strict_types=1);

namespace App\Http\Resources\Analysis;

use App\Enums\AnalysisImportMode;
use App\Enums\AnalysisImportStatus;
use App\Models\AnalysisImport;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

final class AnalysisImportResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        /** @var AnalysisImport $import */
        $import = $this->resource;
        $mode = $import->getAttribute('mode');
        $status = $import->getAttribute('status');

        return [
            'id' => $import->id,
            'revision' => $import->revision,
            'mode' => $mode instanceof AnalysisImportMode ? $mode->value : $mode,
            'mode_label' => $mode instanceof AnalysisImportMode ? $mode->label() : '',
            'status' => $status instanceof AnalysisImportStatus ? $status->value : $status,
            'status_label' => $status instanceof AnalysisImportStatus ? $status->label() : '',
            'model_name' => $import->model_name,
            'original_filename' => $import->original_filename,
            'file_size' => $import->file_size,
            'file_hash' => $import->file_hash,
            'normalized_payload' => $import->normalized_payload,
            'validation_errors' => $import->validation_errors,
            'stale_history' => $import->stale_history,
            'replacement_reason' => $import->replacement_reason,
            'raw_available' => $import->private_file_path !== null,
            'uploaded_at' => $this->dateTime($import->getAttribute('uploaded_at')),
            'raw_stored_at' => $this->dateTime($import->getAttribute('raw_stored_at')),
            'validated_at' => $this->dateTime($import->getAttribute('validated_at')),
            'committed_at' => $this->dateTime($import->getAttribute('committed_at')),
            'raw_file_deleted_at' => $this->dateTime($import->getAttribute('raw_file_deleted_at')),
        ];
    }

    private function dateTime(mixed $value): ?string
    {
        return $value === null
            ? null
            : CarbonImmutable::parse($value)->setTimezone('Asia/Tokyo')->toIso8601String();
    }
}
