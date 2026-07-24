<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\MarketDataProvider;
use Database\Factories\StockProviderSymbolFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StockProviderSymbol extends Model
{
    /** @use HasFactory<StockProviderSymbolFactory> */
    use HasFactory;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'stock_id',
        'provider',
        'provider_symbol',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'provider' => MarketDataProvider::class,
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
