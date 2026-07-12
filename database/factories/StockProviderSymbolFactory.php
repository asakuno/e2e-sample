<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Enums\MarketDataProvider;
use App\Models\Stock;
use App\Models\StockProviderSymbol;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<StockProviderSymbol>
 */
class StockProviderSymbolFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'stock_id' => Stock::factory(),
            'provider' => MarketDataProvider::AlphaVantage,
            'provider_symbol' => strtoupper(fake()->unique()->bothify('????')),
        ];
    }
}
