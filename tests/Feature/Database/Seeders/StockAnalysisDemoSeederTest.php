<?php

declare(strict_types=1);

namespace Tests\Feature\Database\Seeders;

use App\Enums\AnalysisSentiment;
use App\Models\AnalysisResult;
use App\Models\NewsArticle;
use App\Models\StockPrice;
use App\Models\StockSignal;
use App\Models\User;
use App\Models\Watchlist;
use Carbon\CarbonImmutable;
use Database\Seeders\StockAnalysisDemoSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class StockAnalysisDemoSeederTest extends TestCase
{
    use RefreshDatabase;

    public function test_画面確認に必要な株式分析データを投入できる(): void
    {
        CarbonImmutable::setTestNow('2026-07-12 12:00:00');

        try {
            $this->seed(StockAnalysisDemoSeeder::class);

            $user = User::query()->where('email', 'test@example.com')->firstOrFail();
            $promptVersion = (string) config('services.openai.prompt_version', 'v1');

            $this->assertNotNull($user->email_verified_at);
            $this->assertSame(6, Watchlist::query()->where('user_id', $user->id)->active()->count());
            $this->assertEqualsCanonicalizing(
                [1, 2, 3],
                Watchlist::query()->where('user_id', $user->id)->distinct()->pluck('priority')->all(),
            );
            $this->assertGreaterThanOrEqual(250, StockPrice::query()->where('source', 'demo')->whereHas('stock', fn ($query) => $query->where('symbol', 'AAPL'))->count());
            $this->assertSame(9, NewsArticle::query()->where('provider', 'demo')->count());
            $this->assertSame(8, AnalysisResult::query()->where('model_provider', 'demo')->where('prompt_version', $promptVersion)->count());
            $this->assertSame(2, AnalysisResult::query()->where('sentiment', AnalysisSentiment::Negative)->count());
            $this->assertSame(1, AnalysisResult::query()->where('sentiment', AnalysisSentiment::Neutral)->count());
            $this->assertSame(42, StockSignal::query()->where('prompt_version', $promptVersion)->count());
            $this->assertDatabaseHas('stock_news', ['relevance_score' => 88, 'matched_by' => 'demo_symbol']);
        } finally {
            CarbonImmutable::setTestNow();
        }
    }

    public function test_再実行してもデモデータが重複しない(): void
    {
        CarbonImmutable::setTestNow('2026-07-12 12:00:00');

        try {
            $this->seed(StockAnalysisDemoSeeder::class);
            $counts = $this->demoCounts();

            CarbonImmutable::setTestNow('2026-07-13 12:00:00');
            $this->seed(StockAnalysisDemoSeeder::class);

            $this->assertSame($counts, $this->demoCounts());
        } finally {
            CarbonImmutable::setTestNow();
        }
    }

    /**
     * @return array{prices: int, news: int, analyses: int, signals: int, watchlists: int}
     */
    private function demoCounts(): array
    {
        return [
            'prices' => StockPrice::query()->where('source', 'demo')->count(),
            'news' => NewsArticle::query()->where('provider', 'demo')->count(),
            'analyses' => AnalysisResult::query()->where('model_provider', 'demo')->count(),
            'signals' => StockSignal::query()->count(),
            'watchlists' => Watchlist::query()->count(),
        ];
    }
}
