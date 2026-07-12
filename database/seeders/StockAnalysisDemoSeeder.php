<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Enums\AnalysisSentiment;
use App\Enums\AnalysisTimeHorizon;
use App\Models\AnalysisResult;
use App\Models\NewsArticle;
use App\Models\Stock;
use App\Models\StockPrice;
use App\Models\StockSignal;
use App\Models\User;
use App\Models\Watchlist;
use Carbon\CarbonImmutable;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

final class StockAnalysisDemoSeeder extends Seeder
{
    private const USER_EMAIL = 'test@example.com';

    private const PRICE_SOURCE = 'demo';

    private const SIGNAL_REASON_PREFIX = '[DEMO] ';

    /** @var list<string> */
    private const STOCK_SYMBOLS = ['AAPL', 'MSFT', 'NVDA', 'GOOGL', 'AMZN', 'TSLA'];

    public function run(): void
    {
        $this->call(MajorStockSeeder::class);

        $user = User::query()->updateOrCreate(
            ['email' => self::USER_EMAIL],
            [
                'name' => 'Stock Analysis Demo User',
                'password' => Hash::make('password'),
            ],
        );
        $user->forceFill(['email_verified_at' => now()])->saveQuietly();

        $stocks = Stock::query()
            ->where('market', 'us')
            ->whereIn('symbol', self::STOCK_SYMBOLS)
            ->get()
            ->keyBy('symbol');

        $this->seedWatchlists($user, $stocks->all());
        $this->seedPrices($stocks->all());
        $this->seedNewsAndAnalyses($stocks->all());
        $this->seedSignals($stocks->all());
    }

    /**
     * @param  array<string, Stock>  $stocks
     */
    private function seedWatchlists(User $user, array $stocks): void
    {
        $watchlists = [
            'AAPL' => [1, '主力候補。新製品とサービス部門の成長を継続確認。'],
            'MSFT' => [1, 'Azureと生成AI関連の成長率を重点確認。'],
            'NVDA' => [1, 'AI半導体の需要と供給制約を確認。'],
            'GOOGL' => [2, '広告市況とクラウド事業の収益性を確認。'],
            'AMZN' => [2, 'AWSと小売事業の利益率改善を確認。'],
            'TSLA' => [3, '納車台数と価格競争の影響を慎重に確認。'],
        ];

        foreach ($watchlists as $symbol => [$priority, $memo]) {
            Watchlist::query()->updateOrCreate(
                ['user_id' => $user->id, 'stock_id' => $stocks[$symbol]->id],
                ['priority' => $priority, 'memo' => $memo, 'is_active' => true],
            );
        }
    }

    /**
     * @param  array<string, Stock>  $stocks
     */
    private function seedPrices(array $stocks): void
    {
        $basePrices = [
            'AAPL' => 185.00,
            'MSFT' => 420.00,
            'NVDA' => 125.00,
            'GOOGL' => 175.00,
            'AMZN' => 195.00,
            'TSLA' => 245.00,
        ];
        $today = CarbonImmutable::today('Asia/Tokyo');
        $now = now();
        $firstDate = $today->subMonths(14)->startOfDay();
        $rows = [];

        StockPrice::query()
            ->whereIn('stock_id', array_map(static fn (Stock $stock): int => $stock->id, $stocks))
            ->where('source', self::PRICE_SOURCE)
            ->delete();

        foreach ($stocks as $symbol => $stock) {
            $index = 0;

            for ($date = $firstDate; $date->lessThanOrEqualTo($today); $date = $date->addDay()) {
                if ($date->isWeekend()) {
                    continue;
                }

                $trend = $index * (0.025 + ($stock->id % 4) * 0.01);
                $wave = sin($index / 9) * 3.5 + cos($index / 21) * 1.8;
                $close = round($basePrices[$symbol] + $trend + $wave, 6);
                $open = round($close - sin($index / 5) * 1.3, 6);
                $high = round(max($open, $close) + 1.75, 6);
                $low = round(min($open, $close) - 1.55, 6);

                $rows[] = [
                    'stock_id' => $stock->id,
                    'price_date' => $date->toDateString(),
                    'open' => $open,
                    'high' => $high,
                    'low' => $low,
                    'close' => $close,
                    'adjusted_close' => $index % 17 === 0 ? null : round($close * 0.998, 6),
                    'volume' => 20_000_000 + ($stock->id * 1_000_000) + ($index * 17_500),
                    'source' => self::PRICE_SOURCE,
                    'fetched_at' => $now,
                    'created_at' => $now,
                    'updated_at' => $now,
                ];
                $index++;
            }
        }

        StockPrice::query()->upsert(
            $rows,
            ['stock_id', 'price_date', 'source'],
            ['open', 'high', 'low', 'close', 'adjusted_close', 'volume', 'fetched_at', 'updated_at'],
        );
    }

    /**
     * @param  array<string, Stock>  $stocks
     */
    private function seedNewsAndAnalyses(array $stocks): void
    {
        $promptVersion = (string) config('services.openai.prompt_version', 'v1');
        $definitions = [
            ['AAPL', '新製品の販売好調、サービス売上も市場予想を上回る', 4, AnalysisSentiment::Positive, 8, AnalysisTimeHorizon::MediumTerm],
            ['MSFT', 'クラウド事業が堅調、AI投資の収益化が進展', 18, AnalysisSentiment::Positive, 7, AnalysisTimeHorizon::LongTerm],
            ['NVDA', 'AI半導体需要は継続、供給制約には注意', 30, AnalysisSentiment::Positive, 6, AnalysisTimeHorizon::ShortTerm],
            ['GOOGL', '広告市場は安定も規制リスクが重荷', 42, AnalysisSentiment::Neutral, 1, AnalysisTimeHorizon::MediumTerm],
            ['AMZN', '物流費改善で利益率上昇、AWS成長も加速', 55, AnalysisSentiment::Positive, 7, AnalysisTimeHorizon::MediumTerm],
            ['TSLA', '価格競争の激化で自動車部門の利益率が低下', 70, AnalysisSentiment::Negative, -7, AnalysisTimeHorizon::ShortTerm],
            ['AAPL', 'サプライチェーンの一部で出荷遅延の可能性', 86, AnalysisSentiment::Negative, -4, AnalysisTimeHorizon::ShortTerm],
            ['MSFT', '開発者向けイベントで新たなAI機能を発表', 120, AnalysisSentiment::Positive, 5, AnalysisTimeHorizon::LongTerm],
        ];

        foreach ($definitions as $index => [$symbol, $title, $hoursAgo, $sentiment, $impact, $horizon]) {
            $url = sprintf('https://example.com/stock-analysis-demo/%02d', $index + 1);
            $article = NewsArticle::query()->updateOrCreate(
                ['content_hash' => hash('sha256', $url)],
                [
                    'title' => $title,
                    'summary' => $title.'というデモニュースです。ニュース一覧・詳細・分析表示の確認に利用できます。',
                    'body' => '画面確認用に投入されたデモ記事です。実際の投資判断には利用しないでください。',
                    'url' => $url,
                    'source' => $index % 2 === 0 ? 'Demo Financial News' : 'Demo Market Wire',
                    'provider' => 'demo',
                    'language' => 'ja',
                    'published_at' => now()->subHours($hoursAgo),
                    'raw_payload' => ['demo' => true, 'symbol' => $symbol],
                ],
            );

            $article->stocks()->syncWithoutDetaching([
                $stocks[$symbol]->id => ['relevance_score' => 95 - $index, 'matched_by' => 'demo_symbol'],
            ]);

            AnalysisResult::query()->updateOrCreate(
                [
                    'stock_id' => $stocks[$symbol]->id,
                    'analysable_type' => NewsArticle::class,
                    'analysable_id' => $article->id,
                    'prompt_version' => $promptVersion,
                ],
                [
                    'summary' => $title.'ため、株価への影響を継続して確認する必要があります。',
                    'sentiment' => $sentiment,
                    'impact_score' => $impact,
                    'confidence_score' => 82 + ($index % 4) * 4,
                    'time_horizon' => $horizon,
                    'positive_factors' => ['市場期待を上回る可能性', '中長期の成長余地'],
                    'negative_factors' => ['短期的な価格変動', '競争環境の変化'],
                    'risk_points' => ['外部環境により見通しが変化する可能性'],
                    'reason' => 'ニュース内容、事業への関連度、想定される時間軸を総合して判定したデモ分析です。',
                    'model_provider' => 'demo',
                    'model_name' => 'demo-stock-analyzer',
                    'input_tokens' => 900 + $index * 25,
                    'output_tokens' => 280 + $index * 10,
                    'analyzed_at' => now()->subHours(max(1, $hoursAgo - 1)),
                ],
            );
        }

        $pendingUrl = 'https://example.com/stock-analysis-demo/pending';
        $pendingArticle = NewsArticle::query()->updateOrCreate(
            ['content_hash' => hash('sha256', $pendingUrl)],
            [
                'title' => 'AI分析待ちのニュース（未分析表示確認用）',
                'summary' => 'Dashboardの未分析件数とニュース一覧の未分析状態を確認するための記事です。',
                'url' => $pendingUrl,
                'source' => 'Demo Market Wire',
                'provider' => 'demo',
                'language' => 'ja',
                'published_at' => now()->subMinutes(30),
                'raw_payload' => ['demo' => true, 'status' => 'pending'],
            ],
        );
        $pendingArticle->stocks()->syncWithoutDetaching([
            $stocks['AAPL']->id => ['relevance_score' => 88, 'matched_by' => 'demo_symbol'],
        ]);
        $pendingArticle->analysisResults()->delete();
    }

    /**
     * @param  array<string, Stock>  $stocks
     */
    private function seedSignals(array $stocks): void
    {
        $promptVersion = (string) config('services.openai.prompt_version', 'v1');
        $baseScores = ['AAPL' => 7.5, 'MSFT' => 6.4, 'NVDA' => 4.8, 'GOOGL' => 0.8, 'AMZN' => 5.6, 'TSLA' => -6.8];
        $today = CarbonImmutable::today('Asia/Tokyo');
        $now = now();
        $rows = [];

        StockSignal::query()
            ->whereIn('stock_id', array_map(static fn (Stock $stock): int => $stock->id, $stocks))
            ->where('reason', 'like', self::SIGNAL_REASON_PREFIX.'%')
            ->delete();

        foreach ($stocks as $symbol => $stock) {
            foreach (range(0, 6) as $daysAgo) {
                $score = round($baseScores[$symbol] - ($daysAgo * 0.35) + sin($daysAgo + $stock->id), 2);

                $rows[] = [
                    'stock_id' => $stock->id,
                    'signal_date' => $today->subDays($daysAgo)->toDateString(),
                    'prompt_version' => $promptVersion,
                    'news_score' => $score,
                    'disclosure_score' => 0,
                    'macro_score' => 0,
                    'total_score' => $score,
                    'positive_count' => $score > 2 ? 3 : 1,
                    'negative_count' => $score < -2 ? 3 : 1,
                    'neutral_count' => abs($score) <= 2 ? 3 : 1,
                    'reason' => self::SIGNAL_REASON_PREFIX.sprintf('%sの直近ニュースを集計した画面確認用シグナルです。', $symbol),
                    'generated_at' => now()->subDays($daysAgo)->setTime(7, 30),
                    'created_at' => $now,
                    'updated_at' => $now,
                ];
            }
        }

        StockSignal::query()->upsert(
            $rows,
            ['stock_id', 'signal_date', 'prompt_version'],
            [
                'news_score',
                'disclosure_score',
                'macro_score',
                'total_score',
                'positive_count',
                'negative_count',
                'neutral_count',
                'reason',
                'generated_at',
                'updated_at',
            ],
        );
    }
}
