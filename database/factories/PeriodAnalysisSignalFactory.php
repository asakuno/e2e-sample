<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\AnalysisImport;
use App\Models\PeriodAnalysisSignal;
use App\Models\Stock;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<PeriodAnalysisSignal>
 */
class PeriodAnalysisSignalFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $newsScore = fake()->randomFloat(2, -10, 10);

        return [
            'user_id' => User::factory(),
            'stock_id' => Stock::factory(),
            'source_analysis_import_id' => AnalysisImport::factory(),
            'prompt_version' => 'stock-news-period-v1',
            'signal_date' => today(),
            'news_score' => $newsScore,
            'disclosure_score' => 0,
            'macro_score' => 0,
            'total_score' => $newsScore,
            'positive_count' => fake()->numberBetween(0, 5),
            'negative_count' => fake()->numberBetween(0, 5),
            'neutral_count' => fake()->numberBetween(0, 5),
            'reason' => fake()->paragraph(),
            'generated_at' => now(),
        ];
    }
}
