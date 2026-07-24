<?php

declare(strict_types=1);

namespace App\Models;

use Database\Factories\StockSignalFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StockSignal extends Model
{
    /** @use HasFactory<StockSignalFactory> */
    use HasFactory;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'stock_id',
        'signal_date',
        'prompt_version',
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
     * @return BelongsTo<Stock, $this>
     */
    public function stock(): BelongsTo
    {
        return $this->belongsTo(Stock::class);
    }
}
