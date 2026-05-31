<?php

declare(strict_types=1);

namespace App\Models;

use Database\Factories\StockPriceFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StockPrice extends Model
{
    /** @use HasFactory<StockPriceFactory> */
    use HasFactory;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'stock_id',
        'price_date',
        'open',
        'high',
        'low',
        'close',
        'adjusted_close',
        'volume',
        'source',
        'fetched_at',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'price_date' => 'date',
            'open' => 'decimal:6',
            'high' => 'decimal:6',
            'low' => 'decimal:6',
            'close' => 'decimal:6',
            'adjusted_close' => 'decimal:6',
            'volume' => 'integer',
            'fetched_at' => 'datetime',
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
