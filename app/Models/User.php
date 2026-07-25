<?php

declare(strict_types=1);

namespace App\Models;

use Database\Factories\UserFactory;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class User extends Authenticatable implements MustVerifyEmail
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
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
     * @return BelongsToMany<Stock, $this>
     */
    public function watchedStocks(): BelongsToMany
    {
        return $this->belongsToMany(Stock::class, 'watchlists')
            ->withPivot(['memo', 'priority', 'is_active'])
            ->withTimestamps();
    }

    /**
     * @return HasMany<Alert, $this>
     */
    public function alerts(): HasMany
    {
        return $this->hasMany(Alert::class);
    }

    /**
     * @return HasMany<AlertLog, $this>
     */
    public function alertLogs(): HasMany
    {
        return $this->hasMany(AlertLog::class);
    }

    /**
     * @return HasMany<AnalysisBatch, $this>
     */
    public function analysisBatches(): HasMany
    {
        return $this->hasMany(AnalysisBatch::class);
    }

    /**
     * @return HasMany<PeriodAnalysisSignal, $this>
     */
    public function periodAnalysisSignals(): HasMany
    {
        return $this->hasMany(PeriodAnalysisSignal::class);
    }
}
