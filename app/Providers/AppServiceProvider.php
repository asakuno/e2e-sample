<?php

namespace App\Providers;

use App\Models\Watchlist;
use App\Policies\WatchlistPolicy;
use App\Repositories\DashboardRepository;
use App\Repositories\DashboardRepositoryInterface;
use App\Repositories\NewsRepository;
use App\Repositories\NewsRepositoryInterface;
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
        Gate::policy(Watchlist::class, WatchlistPolicy::class);

        RateLimiter::for('register', function (Request $request) {
            return Limit::perMinute(config('auth.rate_limits.register'))->by($request->input('email').$request->ip());
        });
    }
}
