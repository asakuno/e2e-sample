<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\AnalysisImportMode;
use App\Enums\AnalysisImportStatus;
use Database\Factories\AnalysisImportFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class AnalysisImport extends Model
{
    /** @use HasFactory<AnalysisImportFactory> */
    use HasFactory;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'analysis_batch_id',
        'base_current_import_id',
        'revision',
        'mode',
        'status',
        'model_name',
        'original_filename',
        'private_file_path',
        'file_size',
        'file_hash',
        'normalized_payload',
        'validation_errors',
        'stale_history',
        'replacement_reason',
        'uploaded_at',
        'raw_stored_at',
        'validated_at',
        'committed_at',
        'raw_file_deleted_at',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'revision' => 'integer',
            'mode' => AnalysisImportMode::class,
            'status' => AnalysisImportStatus::class,
            'file_size' => 'integer',
            'normalized_payload' => 'array',
            'validation_errors' => 'array',
            'stale_history' => 'array',
            'uploaded_at' => 'datetime',
            'raw_stored_at' => 'datetime',
            'validated_at' => 'datetime',
            'committed_at' => 'datetime',
            'raw_file_deleted_at' => 'datetime',
        ];
    }

    /**
     * @return BelongsTo<AnalysisBatch, $this>
     */
    public function analysisBatch(): BelongsTo
    {
        return $this->belongsTo(AnalysisBatch::class);
    }

    /**
     * @return BelongsTo<AnalysisImport, $this>
     */
    public function baseCurrentImport(): BelongsTo
    {
        return $this->belongsTo(self::class, 'base_current_import_id');
    }

    /**
     * @return HasMany<AnalysisImport, $this>
     */
    public function basedImports(): HasMany
    {
        return $this->hasMany(self::class, 'base_current_import_id');
    }

    /**
     * @return HasOne<AnalysisResult, $this>
     */
    public function projectedResult(): HasOne
    {
        return $this->hasOne(AnalysisResult::class, 'source_import_id');
    }

    /**
     * @return HasOne<PeriodAnalysisSignal, $this>
     */
    public function periodSignal(): HasOne
    {
        return $this->hasOne(PeriodAnalysisSignal::class, 'source_analysis_import_id');
    }
}
