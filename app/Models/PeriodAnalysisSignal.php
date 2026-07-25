<?php

declare(strict_types=1);

namespace App\Models;

use Database\Factories\PeriodAnalysisSignalFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PeriodAnalysisSignal extends Model
{
    /** @use HasFactory<PeriodAnalysisSignalFactory> */
    use HasFactory;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'user_id',
        'stock_id',
        'source_analysis_import_id',
        'prompt_version',
        'signal_date',
        'news_score',
        'disclosure_score',
        'macro_score',
        'total_score',
        'positive_count',
        'negative_count',
        'neutral_count',
        'reason',
        'generated_at',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'signal_date' => 'date',
            'news_score' => 'decimal:2',
            'disclosure_score' => 'decimal:2',
            'macro_score' => 'decimal:2',
            'total_score' => 'decimal:2',
            'positive_count' => 'integer',
            'negative_count' => 'integer',
            'neutral_count' => 'integer',
            'generated_at' => 'datetime',
        ];
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
     * @return BelongsTo<AnalysisImport, $this>
     */
    public function sourceAnalysisImport(): BelongsTo
    {
        return $this->belongsTo(AnalysisImport::class, 'source_analysis_import_id');
    }
}
