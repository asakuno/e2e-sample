<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Enums\AnalysisSentiment;
use App\Enums\AnalysisTimeHorizon;
use App\Models\AnalysisResult;
use App\Models\NewsArticle;
use App\Models\Stock;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<AnalysisResult>
 */
class AnalysisResultFactory extends Factory
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
            'analysable_type' => NewsArticle::class,
            'analysable_id' => NewsArticle::factory(),
            'summary' => fake()->paragraph(),
            'sentiment' => fake()->randomElement(AnalysisSentiment::cases())->value,
            'impact_score' => fake()->numberBetween(-10, 10),
            'confidence_score' => fake()->numberBetween(50, 100),
            'time_horizon' => fake()->randomElement(AnalysisTimeHorizon::cases())->value,
            'positive_factors' => [fake()->sentence()],
            'negative_factors' => [fake()->sentence()],
            'risk_points' => [fake()->sentence()],
            'reason' => fake()->paragraph(),
            'model_provider' => 'local',
            'model_name' => 'factory-analyzer',
            'prompt_version' => 'v1',
            'input_tokens' => fake()->numberBetween(500, 2000),
            'output_tokens' => fake()->numberBetween(100, 800),
            'analyzed_at' => now(),
        ];
    }
}
