<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\Alert;
use App\Models\AlertLog;
use App\Models\Stock;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<AlertLog>
 */
class AlertLogFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'alert_id' => Alert::factory(),
            'user_id' => User::factory(),
            'stock_id' => Stock::factory(),
            'message' => fake()->sentence(),
            'payload' => [
                'source' => 'factory',
            ],
            'read_at' => null,
            'triggered_at' => now(),
        ];
    }
}
