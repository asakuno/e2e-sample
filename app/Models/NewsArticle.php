<?php

declare(strict_types=1);

namespace App\Models;

use Database\Factories\NewsArticleFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;

class NewsArticle extends Model
{
    /** @use HasFactory<NewsArticleFactory> */
    use HasFactory;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'title',
        'summary',
        'body',
        'url',
        'source',
        'provider',
        'language',
        'published_at',
        'content_hash',
        'raw_payload',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'published_at' => 'datetime',
            'raw_payload' => 'array',
        ];
    }

    /**
     * @return BelongsToMany<Stock, $this>
     */
    public function stocks(): BelongsToMany
    {
        return $this->belongsToMany(Stock::class, 'stock_news')
            ->withPivot(['relevance_score', 'matched_by'])
            ->withTimestamps();
    }

    /**
     * @return MorphMany<AnalysisResult, $this>
     */
    public function analysisResults(): MorphMany
    {
        return $this->morphMany(AnalysisResult::class, 'analysable');
    }

    /**
     * @return HasMany<AnalysisBatchNews, $this>
     */
    public function analysisBatchNews(): HasMany
    {
        return $this->hasMany(AnalysisBatchNews::class);
    }
}
