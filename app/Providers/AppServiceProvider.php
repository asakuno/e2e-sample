<?php

declare(strict_types=1);

namespace App\Providers;

use App\Models\Watchlist;
use App\Policies\WatchlistPolicy;
use App\Repositories\AnalysisPipelineRepository;
use App\Repositories\AnalysisPipelineRepositoryInterface;
use App\Repositories\DashboardRepository;
use App\Repositories\DashboardRepositoryInterface;
use App\Repositories\MarketIngestionRepository;
use App\Repositories\MarketIngestionRepositoryInterface;
use App\Repositories\NewsRepository;
use App\Repositories\NewsRepositoryInterface;
use App\Repositories\SignalGenerationRepository;
use App\Repositories\SignalGenerationRepositoryInterface;
use App\Repositories\StockRepository;
use App\Repositories\StockRepositoryInterface;
use App\Repositories\UserRepository;
use App\Repositories\UserRepositoryInterface;
use App\Repositories\WatchlistRepository;
use App\Repositories\WatchlistRepositoryInterface;
use App\Services\AI\Contracts\ArticleAnalyzerInterface;
use App\Services\AI\Providers\OpenAiArticleAnalysisResponseParser;
use App\Services\AI\Providers\OpenAiArticleAnalyzer;
use App\Services\MarketData\Contracts\NewsProviderInterface;
use App\Services\MarketData\Contracts\StockPriceProviderInterface;
use App\Services\MarketData\Providers\AlphaVantageNewsProvider;
use App\Services\MarketData\Providers\AlphaVantagePriceProvider;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Contracts\Foundation\Application;
use Illuminate\Http\Client\Factory as HttpFactory;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->bind(
            UserRepositoryInterface::class,
            UserRepository::class,
        );

        $this->app->bind(
            StockRepositoryInterface::class,
            StockRepository::class,
        );

        $this->app->bind(
            NewsRepositoryInterface::class,
            NewsRepository::class,
        );

        $this->app->bind(
            WatchlistRepositoryInterface::class,
            WatchlistRepository::class,
        );

        $this->app->bind(
            DashboardRepositoryInterface::class,
            DashboardRepository::class,
        );

        $this->app->bind(
            MarketIngestionRepositoryInterface::class,
            MarketIngestionRepository::class,
        );

        $this->app->bind(
            AnalysisPipelineRepositoryInterface::class,
            AnalysisPipelineRepository::class,
        );

        $this->app->bind(
            SignalGenerationRepositoryInterface::class,
            SignalGenerationRepository::class,
        );

        $this->app->singleton(
            StockPriceProviderInterface::class,
            fn (Application $app): AlphaVantagePriceProvider => new AlphaVantagePriceProvider(
                http: $app->make(HttpFactory::class),
                apiKey: (string) config('services.alpha_vantage.api_key', ''),
                baseUrl: (string) config('services.alpha_vantage.base_url'),
                function: (string) config('services.alpha_vantage.price_function'),
                outputSize: (string) config('services.alpha_vantage.price_output_size'),
                timeoutSeconds: (int) config('services.alpha_vantage.timeout'),
            ),
        );

        $this->app->singleton(
            NewsProviderInterface::class,
            fn (Application $app): AlphaVantageNewsProvider => new AlphaVantageNewsProvider(
                http: $app->make(HttpFactory::class),
                apiKey: (string) config('services.alpha_vantage.api_key', ''),
                baseUrl: (string) config('services.alpha_vantage.base_url'),
                function: (string) config('services.alpha_vantage.news_function'),
                sort: (string) config('services.alpha_vantage.news_sort'),
                limit: (int) config('services.alpha_vantage.news_limit'),
                timeoutSeconds: (int) config('services.alpha_vantage.timeout'),
            ),
        );

        $this->app->singleton(
            ArticleAnalyzerInterface::class,
            fn (Application $app): OpenAiArticleAnalyzer => new OpenAiArticleAnalyzer(
                apiKey: (string) config('services.openai.api_key', ''),
                baseUrl: (string) config('services.openai.base_url'),
                model: (string) config('services.openai.model'),
                promptVersion: (string) config('services.openai.prompt_version'),
                timeout: (int) config('services.openai.timeout'),
                responseParser: $app->make(OpenAiArticleAnalysisResponseParser::class),
            ),
        );
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Gate::policy(Watchlist::class, WatchlistPolicy::class);

        RateLimiter::for('register', function (Request $request) {
            return Limit::perMinute(config('auth.rate_limits.register'))->by($request->input('email').$request->ip());
        });

        RateLimiter::for('alpha-vantage', function (): array {
            $limits = [
                Limit::perMinute(
                    max(1, (int) config('services.alpha_vantage.requests_per_minute')),
                )->by('alpha-vantage-minute'),
            ];
            $dailyLimit = (int) config('services.alpha_vantage.requests_per_day');

            if ($dailyLimit > 0) {
                $limits[] = Limit::perDay($dailyLimit)->by('alpha-vantage-day');
            }

            return $limits;
        });

        RateLimiter::for('openai-analysis', function (): Limit {
            return Limit::perMinute(
                max(1, (int) config('services.openai.requests_per_minute')),
            )->by('openai-analysis');
        });
    }
}
