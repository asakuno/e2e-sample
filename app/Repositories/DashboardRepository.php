<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Enums\AnalysisSentiment;
use App\Models\AnalysisResult;
use App\Models\NewsArticle;
use App\Models\Stock;
use App\Models\StockPrice;
use App\Models\StockSignal;
use App\Models\Watchlist;
use Carbon\Carbon;
use Carbon\CarbonImmutable;
use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Query\Builder as QueryBuilder;
use Illuminate\Support\Collection;

final class DashboardRepository implements DashboardRepositoryInterface
{
    public function countActiveWatchlists(int $userId): int
    {
        return Watchlist::query()
            ->forUser($userId)
            ->active()
            ->count();
    }

    public function countRecentAnalysesBySentiment(
        int $userId,
        AnalysisSentiment $sentiment,
        CarbonInterface $since,
    ): int {
        return AnalysisResult::query()
            ->whereIn('stock_id', $this->activeStockIdsQuery($userId))
            ->where('prompt_version', $this->currentPromptVersion())
            ->where('sentiment', $sentiment->value)
            ->where('analyzed_at', '>=', CarbonImmutable::instance($since)->utc())
            ->count();
    }

    public function countUnanalysedNews(int $userId): int
    {
        return Watchlist::query()
            ->forUser($userId)
            ->active()
            ->join('stock_news', 'stock_news.stock_id', '=', 'watchlists.stock_id')
            ->whereNotExists(
                fn (QueryBuilder $query): QueryBuilder => $query
                    ->selectRaw('1')
                    ->from('analysis_results')
                    ->where('analysis_results.analysable_type', NewsArticle::class)
                    ->whereColumn('analysis_results.analysable_id', 'stock_news.news_article_id')
                    ->whereColumn('analysis_results.stock_id', 'stock_news.stock_id')
                    ->where('analysis_results.prompt_version', $this->currentPromptVersion()),
            )
            ->count();
    }

    /**
     * @return Collection<int, StockSignal>
     */
    public function findTopSignals(int $userId, int $limit): Collection
    {
        return $this->latestSignalsForUser($userId)
            ->orderByDesc('total_score')
            ->orderByDesc('signal_date')
            ->orderByDesc('id')
            ->limit($limit)
            ->get();
    }

    /**
     * @return Collection<int, StockSignal>
     */
    public function findAttentionSignals(int $userId, int $limit): Collection
    {
        return $this->latestSignalsForUser($userId)
            ->orderByRaw('ABS(total_score) DESC')
            ->orderByDesc('signal_date')
            ->orderByDesc('generated_at')
            ->orderByDesc('id')
            ->limit($limit)
            ->get();
    }

    /**
     * @return Collection<int, AnalysisResult>
     */
    public function findImportantNewsAnalyses(int $userId, int $limit): Collection
    {
        $now = Carbon::now();
        $rankedAnalyses = AnalysisResult::query()
            ->select('analysis_results.*')
            ->selectRaw(<<<'SQL'
                ROW_NUMBER() OVER (
                    PARTITION BY analysis_results.analysable_id
                    ORDER BY ABS(analysis_results.impact_score) DESC,
                        analysis_results.analyzed_at DESC,
                        analysis_results.id DESC
                ) AS article_rank
                SQL)
            ->join('news_articles', 'news_articles.id', '=', 'analysis_results.analysable_id')
            ->whereIn('analysis_results.stock_id', $this->activeStockIdsQuery($userId))
            ->where('analysis_results.analysable_type', NewsArticle::class)
            ->where('analysis_results.prompt_version', $this->currentPromptVersion())
            ->whereBetween('news_articles.published_at', [$now->copy()->subDays(7), $now])
            ->toBase();

        return AnalysisResult::query()
            ->fromSub($rankedAnalyses, 'ranked_news_analyses')
            ->with(['stock', 'analysable'])
            ->where('article_rank', 1)
            ->orderByRaw('ABS(impact_score) DESC')
            ->orderByDesc('analyzed_at')
            ->orderByDesc('id')
            ->limit($limit)
            ->get();
    }

    public function findLatestAnalysisAt(int $userId): ?CarbonInterface
    {
        $latest = AnalysisResult::query()
            ->whereIn('stock_id', $this->activeStockIdsQuery($userId))
            ->where('prompt_version', $this->currentPromptVersion())
            ->max('analyzed_at');

        return $latest === null ? null : Carbon::parse($latest);
    }

    /**
     * @return array<string, int>
     */
    public function countAnalysesByDate(int $userId, CarbonInterface $from, CarbonInterface $to): array
    {
        $localFrom = CarbonImmutable::instance($from);
        $timezone = $localFrom->getTimezone();
        $fromUtc = $localFrom->startOfDay()->utc();
        $toExclusiveUtc = CarbonImmutable::instance($to)->addDay()->startOfDay()->utc();

        /** @var array<string, int> $counts */
        $counts = AnalysisResult::query()
            ->whereIn('stock_id', $this->activeStockIdsQuery($userId))
            ->where('prompt_version', $this->currentPromptVersion())
            ->where('analyzed_at', '>=', $fromUtc)
            ->where('analyzed_at', '<', $toExclusiveUtc)
            ->pluck('analyzed_at')
            ->map(
                fn ($analyzedAt): string => CarbonImmutable::parse((string) $analyzedAt, 'UTC')
                    ->setTimezone($timezone)
                    ->toDateString(),
            )
            ->countBy()
            ->map(fn ($count): int => (int) $count)
            ->all();

        return $counts;
    }

    /**
     * @return Builder<Watchlist>
     */
    private function activeStockIdsQuery(int $userId): Builder
    {
        return Watchlist::query()
            ->forUser($userId)
            ->active()
            ->select('stock_id');
    }

    /**
     * @return Builder<StockSignal>
     */
    private function latestSignalsForUser(int $userId): Builder
    {
        $latestSignals = StockSignal::query()
            ->select('stock_signals.*')
            ->selectRaw(<<<'SQL'
                ROW_NUMBER() OVER (
                    PARTITION BY stock_id
                    ORDER BY signal_date DESC, generated_at DESC, id DESC
                ) AS latest_rank
                SQL)
            ->whereIn('stock_id', $this->activeStockIdsQuery($userId))
            ->where('prompt_version', $this->currentPromptVersion())
            ->toBase();

        return StockSignal::query()
            ->fromSub($latestSignals, 'latest_stock_signals')
            ->with($this->dashboardStockRelations())
            ->where('latest_rank', 1);
    }

    private function currentPromptVersion(): string
    {
        return (string) config('services.openai.prompt_version', 'v1');
    }

    /**
     * @return array{
     *     'stock.prices': callable(HasMany<StockPrice, Stock>): HasMany<StockPrice, Stock>,
     *     'stock.analysisResults': callable(HasMany<AnalysisResult, Stock>): HasMany<AnalysisResult, Stock>
     * }
     */
    private function dashboardStockRelations(): array
    {
        return [
            'stock.prices' => $this->constrainDashboardPrices(...),
            'stock.analysisResults' => $this->constrainDashboardAnalyses(...),
        ];
    }

    /**
     * @param  HasMany<StockPrice, Stock>  $query
     * @return HasMany<StockPrice, Stock>
     */
    private function constrainDashboardPrices(HasMany $query): HasMany
    {
        return $query
            ->where('source', $this->displayPriceSource())
            ->where(
                fn ($query) => $query
                    ->whereNotNull('adjusted_close')
                    ->orWhereNotNull('close'),
            )
            ->orderByDesc('price_date')
            ->orderByDesc('id')
            ->limit(2);
    }

    private function displayPriceSource(): string
    {
        return (string) config('services.stock_analysis.price_display_source', 'alpha_vantage');
    }

    /**
     * @param  HasMany<AnalysisResult, Stock>  $query
     * @return HasMany<AnalysisResult, Stock>
     */
    private function constrainDashboardAnalyses(HasMany $query): HasMany
    {
        return $query
            ->where('prompt_version', $this->currentPromptVersion())
            ->orderByDesc('analyzed_at')
            ->orderByDesc('id')
            ->limit(1);
    }
}
