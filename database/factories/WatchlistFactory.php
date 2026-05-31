<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\Stock;
use App\Models\User;
use App\Models\Watchlist;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Watchlist>
 */
class WatchlistFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'stock_id' => Stock::factory(),
            'memo' => fake()->optional()->sentence(),
            'priority' => fake()->numberBetween(1, 3),
            'is_active' => true,
        ];
    }
}
