<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\Stock;
use App\Models\StockSignal;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<StockSignal>
 */
class StockSignalFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $newsScore = fake()->randomFloat(2, -10, 10);

        return [
            'stock_id' => Stock::factory(),
            'signal_date' => today(),
            'news_score' => $newsScore,
            'disclosure_score' => 0,
            'macro_score' => 0,
            'total_score' => $newsScore,
            'positive_count' => fake()->numberBetween(0, 5),
            'negative_count' => fake()->numberBetween(0, 5),
            'neutral_count' => fake()->numberBetween(0, 5),
            'reason' => fake()->sentence(),
            'generated_at' => now(),
        ];
    }
}
