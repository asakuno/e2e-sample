<?php

declare(strict_types=1);

namespace App\Models;

use Database\Factories\AnalysisBatchNewsFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AnalysisBatchNews extends Model
{
    /** @use HasFactory<AnalysisBatchNewsFactory> */
    use HasFactory;

    /**
     * @var string
     */
    protected $table = 'analysis_batch_news';

    /**
     * @var list<string>
     */
    protected $fillable = [
        'analysis_batch_id',
        'news_article_id',
        'news_key',
        'position',
        'title',
        'summary',
        'body',
        'source',
        'url',
        'published_at',
        'content_hash',
        'snapshot_hash',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'position' => 'integer',
            'published_at' => 'datetime',
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
     * @return BelongsTo<NewsArticle, $this>
     */
    public function newsArticle(): BelongsTo
    {
        return $this->belongsTo(NewsArticle::class);
    }
}
