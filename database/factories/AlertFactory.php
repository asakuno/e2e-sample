<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Enums\AlertConditionOperator;
use App\Enums\AlertType;
use App\Models\Alert;
use App\Models\Stock;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Alert>
 */
class AlertFactory extends Factory
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
            'alert_type' => AlertType::SignalScore->value,
            'condition_operator' => AlertConditionOperator::GreaterThanOrEqual->value,
            'threshold_value' => fake()->randomFloat(6, 3, 10),
            'is_active' => true,
            'last_triggered_at' => null,
        ];
    }
}
