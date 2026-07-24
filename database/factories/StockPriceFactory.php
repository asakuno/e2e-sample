<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\Stock;
use App\Models\StockPrice;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<StockPrice>
 */
class StockPriceFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $close = fake()->randomFloat(6, 50, 800);

        return [
            'stock_id' => Stock::factory(),
            'price_date' => fake()->dateTimeBetween('-90 days'),
            'open' => fake()->randomFloat(6, 50, 800),
            'high' => fake()->randomFloat(6, $close, 900),
            'low' => fake()->randomFloat(6, 40, $close),
            'close' => $close,
            'adjusted_close' => $close,
            'volume' => fake()->numberBetween(100_000, 500_000_000),
            'source' => 'alpha_vantage',
            'fetched_at' => now(),
        ];
    }
}
