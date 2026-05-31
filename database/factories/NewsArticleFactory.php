<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\NewsArticle;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<NewsArticle>
 */
class NewsArticleFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $url = fake()->unique()->url();

        return [
            'title' => fake()->sentence(8),
            'summary' => fake()->paragraph(),
            'body' => fake()->optional()->paragraphs(3, true),
            'url' => $url,
            'source' => fake()->randomElement(['Reuters', 'CNBC', 'Bloomberg', 'Nikkei']),
            'provider' => fake()->randomElement(['rss', 'alpha_vantage', 'manual']),
            'language' => fake()->randomElement(['en', 'ja']),
            'published_at' => fake()->dateTimeBetween('-14 days'),
            'content_hash' => hash('sha256', $url),
            'raw_payload' => [
                'url' => $url,
            ],
        ];
    }
}
