<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\Stock;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Stock>
 */
class StockFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'symbol' => strtoupper(fake()->unique()->bothify('???##')),
            'name' => fake()->company(),
            'market' => 'us',
            'exchange' => fake()->randomElement(['NASDAQ', 'NYSE']),
            'country' => 'US',
            'currency' => 'USD',
            'sector' => fake()->randomElement(['Technology', 'Healthcare', 'Financials', 'Consumer Discretionary']),
            'industry' => fake()->randomElement(['Software', 'Semiconductors', 'Banks', 'Auto Manufacturers']),
            'description' => fake()->paragraph(),
            'is_active' => true,
        ];
    }
}
