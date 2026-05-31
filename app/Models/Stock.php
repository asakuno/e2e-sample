<?php

declare(strict_types=1);

namespace App\Models;

use Database\Factories\StockFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Stock extends Model
{
    /** @use HasFactory<StockFactory> */
    use HasFactory;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'symbol',
        'name',
        'market',
        'exchange',
        'country',
        'currency',
        'sector',
        'industry',
        'description',
        'is_active',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
        ];
    }

    /**
     * @return HasMany<Watchlist, $this>
     */
    public function watchlists(): HasMany
    {
        return $this->hasMany(Watchlist::class);
    }

    /**
     * @return BelongsToMany<User, $this>
     */
    public function usersWatching(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'watchlists')
            ->withPivot(['memo', 'priority', 'is_active'])
            ->withTimestamps();
    }

    /**
     * @return HasMany<StockPrice, $this>
     */
    public function prices(): HasMany
    {
        return $this->hasMany(StockPrice::class);
    }

    /**
     * @return BelongsToMany<NewsArticle, $this>
     */
    public function newsArticles(): BelongsToMany
    {
        return $this->belongsToMany(NewsArticle::class, 'stock_news')
            ->withPivot(['relevance_score', 'matched_by'])
            ->withTimestamps();
    }

    /**
     * @return HasMany<AnalysisResult, $this>
     */
    public function analysisResults(): HasMany
    {
        return $this->hasMany(AnalysisResult::class);
    }

    /**
     * @return HasMany<StockSignal, $this>
     */
    public function signals(): HasMany
    {
        return $this->hasMany(StockSignal::class);
    }

    /**
     * @return HasMany<Alert, $this>
     */
    public function alerts(): HasMany
    {
        return $this->hasMany(Alert::class);
    }

    /**
     * @param  Builder<Stock>  $query
     * @return Builder<Stock>
     */
    public function scopeActive(Builder $query): Builder
    {
        return $query->where('is_active', true);
    }

    /**
     * @param  Builder<Stock>  $query
     * @return Builder<Stock>
     */
    public function scopeMarket(Builder $query, string $market): Builder
    {
        return $query->where('market', $market);
    }
}
