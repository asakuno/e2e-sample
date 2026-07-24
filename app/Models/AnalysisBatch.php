<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\AnalysisBatchStatus;
use Database\Factories\AnalysisBatchFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphOne;

class AnalysisBatch extends Model
{
    /** @use HasFactory<AnalysisBatchFactory> */
    use HasFactory;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'public_id',
        'user_id',
        'stock_id',
        'period_start_at',
        'period_end_at',
        'stock_snapshot',
        'prompt_version',
        'prompt_text',
        'prompt_hash',
        'status',
        'input_hash',
        'news_count',
        'source_char_count',
        'exported_at',
        'current_import_id',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'period_start_at' => 'datetime',
            'period_end_at' => 'datetime',
            'stock_snapshot' => 'array',
            'status' => AnalysisBatchStatus::class,
            'news_count' => 'integer',
            'source_char_count' => 'integer',
            'exported_at' => 'datetime',
        ];
    }

    public function getRouteKeyName(): string
    {
        return 'public_id';
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * @return BelongsTo<Stock, $this>
     */
    public function stock(): BelongsTo
    {
        return $this->belongsTo(Stock::class);
    }

    /**
     * @return HasMany<AnalysisBatchNews, $this>
     */
    public function newsSnapshots(): HasMany
    {
        return $this->hasMany(AnalysisBatchNews::class)->orderBy('position');
    }

    /**
     * @return HasMany<AnalysisImport, $this>
     */
    public function imports(): HasMany
    {
        return $this->hasMany(AnalysisImport::class);
    }

    /**
     * Relation name used by scoped route model binding for {analysisImport}.
     *
     * @return HasMany<AnalysisImport, $this>
     */
    public function analysisImports(): HasMany
    {
        return $this->hasMany(AnalysisImport::class);
    }

    /**
     * @return BelongsTo<AnalysisImport, $this>
     */
    public function currentImport(): BelongsTo
    {
        return $this->belongsTo(AnalysisImport::class, 'current_import_id');
    }

    /**
     * @return MorphOne<AnalysisResult, $this>
     */
    public function result(): MorphOne
    {
        return $this->morphOne(AnalysisResult::class, 'analysable');
    }
}
