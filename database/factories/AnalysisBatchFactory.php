<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Enums\AnalysisBatchStatus;
use App\Models\AnalysisBatch;
use App\Models\Stock;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<AnalysisBatch>
 */
class AnalysisBatchFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $publicId = (string) Str::ulid();
        $prompt = "Batch: {$publicId}\nAnalyze the supplied news.";

        return [
            'public_id' => $publicId,
            'user_id' => User::factory(),
            'stock_id' => Stock::factory(),
            'period_start_at' => now()->subDays(7)->startOfDay(),
            'period_end_at' => now()->addDay()->startOfDay(),
            'stock_snapshot' => [
                'id' => 1,
                'symbol' => 'TEST',
                'name' => 'Test Stock',
                'market' => 'us',
            ],
            'prompt_version' => 'stock-news-period-v1',
            'prompt_text' => $prompt,
            'prompt_hash' => hash('sha256', $prompt),
            'status' => AnalysisBatchStatus::Prepared,
            'input_hash' => hash('sha256', fake()->uuid()),
            'news_count' => 2,
            'source_char_count' => 1000,
        ];
    }
}
