<?php

namespace App\Providers;

use App\Models\AnalysisBatch;
use App\Models\AnalysisImport;
use App\Models\Watchlist;
use App\Policies\AnalysisBatchPolicy;
use App\Policies\AnalysisImportPolicy;
use App\Policies\WatchlistPolicy;
use App\Repositories\AnalysisBatchRepository;
use App\Repositories\AnalysisBatchRepositoryInterface;
use App\Repositories\AnalysisImportRepository;
use App\Repositories\AnalysisImportRepositoryInterface;
use App\Repositories\DashboardRepository;
use App\Repositories\DashboardRepositoryInterface;
use App\Repositories\NewsRepository;
use App\Repositories\NewsRepositoryInterface;
use App\Repositories\PeriodAnalysisSignalRepository;
use App\Repositories\PeriodAnalysisSignalRepositoryInterface;
use App\Repositories\StockRepository;
use App\Repositories\StockRepositoryInterface;
use App\Repositories\UserRepository;
use App\Repositories\UserRepositoryInterface;
use App\Repositories\WatchlistRepository;
use App\Repositories\WatchlistRepositoryInterface;
use Illuminate\Cache\RateLimiting\Limit;
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
            AnalysisBatchRepositoryInterface::class,
            AnalysisBatchRepository::class,
        );

        $this->app->bind(
            AnalysisImportRepositoryInterface::class,
            AnalysisImportRepository::class,
        );

        $this->app->bind(
            PeriodAnalysisSignalRepositoryInterface::class,
            PeriodAnalysisSignalRepository::class,
        );

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
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Gate::policy(AnalysisBatch::class, AnalysisBatchPolicy::class);
        Gate::policy(AnalysisImport::class, AnalysisImportPolicy::class);
        Gate::policy(Watchlist::class, WatchlistPolicy::class);

        RateLimiter::for('register', function (Request $request) {
            return Limit::perMinute(config('auth.rate_limits.register'))->by($request->input('email').$request->ip());
        });

        RateLimiter::for('analysis-import-upload', function (Request $request) {
            $userKey = (string) ($request->user()?->getAuthIdentifier() ?? $request->ip());
            $routeBatch = $request->route('analysisBatch');
            $batchKey = $routeBatch instanceof AnalysisBatch
                ? (string) $routeBatch->getRouteKey()
                : (string) ($routeBatch ?? 'unknown');

            return [
                Limit::perMinutes(10, 20)->by("analysis-import-user:{$userKey}"),
                Limit::perMinutes(10, 10)->by("analysis-import-batch:{$batchKey}"),
            ];
        });
    }
}
