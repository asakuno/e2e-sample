<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\AnalysisBatch;
use App\Models\AnalysisBatchNews;
use App\Models\NewsArticle;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<AnalysisBatchNews>
 */
class AnalysisBatchNewsFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $url = fake()->unique()->url();
        $contentHash = hash('sha256', $url);

        return [
            'analysis_batch_id' => AnalysisBatch::factory(),
            'news_article_id' => NewsArticle::factory(),
            'news_key' => 'N'.str_pad((string) fake()->unique()->numberBetween(1, 999), 3, '0', STR_PAD_LEFT),
            'position' => fake()->unique()->numberBetween(1, 999),
            'title' => fake()->sentence(),
            'summary' => fake()->paragraph(),
            'body' => fake()->paragraphs(2, true),
            'source' => 'Factory News',
            'url' => $url,
            'published_at' => now()->subDay(),
            'content_hash' => $contentHash,
            'snapshot_hash' => hash('sha256', $contentHash.'snapshot'),
        ];
    }
}
