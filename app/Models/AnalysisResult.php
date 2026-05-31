<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\AnalysisSentiment;
use App\Enums\AnalysisTimeHorizon;
use Database\Factories\AnalysisResultFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class AnalysisResult extends Model
{
    /** @use HasFactory<AnalysisResultFactory> */
    use HasFactory;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'stock_id',
        'analysable_type',
        'analysable_id',
        'summary',
        'sentiment',
        'impact_score',
        'confidence_score',
        'time_horizon',
        'positive_factors',
        'negative_factors',
        'risk_points',
        'reason',
        'model_provider',
        'model_name',
        'prompt_version',
        'input_tokens',
        'output_tokens',
        'analyzed_at',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'sentiment' => AnalysisSentiment::class,
            'impact_score' => 'integer',
            'confidence_score' => 'integer',
            'time_horizon' => AnalysisTimeHorizon::class,
            'positive_factors' => 'array',
            'negative_factors' => 'array',
            'risk_points' => 'array',
            'input_tokens' => 'integer',
            'output_tokens' => 'integer',
            'analyzed_at' => 'datetime',
        ];
    }

    /**
     * @return BelongsTo<Stock, $this>
     */
    public function stock(): BelongsTo
    {
        return $this->belongsTo(Stock::class);
    }

    /**
     * @return MorphTo<Model, $this>
     */
    public function analysable(): MorphTo
    {
        return $this->morphTo();
    }
}
