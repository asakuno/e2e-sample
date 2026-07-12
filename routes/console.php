<?php

declare(strict_types=1);

use Illuminate\Support\Facades\Schedule;

Schedule::command('market:fetch-prices')
    ->cron((string) config('services.alpha_vantage.price_cron'))
    ->timezone((string) config('services.alpha_vantage.schedule_timezone'))
    ->withoutOverlapping()
    ->onOneServer();

Schedule::command('market:fetch-news')
    ->cron((string) config('services.alpha_vantage.news_cron'))
    ->timezone((string) config('services.alpha_vantage.schedule_timezone'))
    ->withoutOverlapping()
    ->onOneServer();

Schedule::command('market:analyze-news')
    ->everyThirtyMinutes()
    ->withoutOverlapping()
    ->onOneServer();

Schedule::command('market:generate-signals')
    ->hourly()
    ->withoutOverlapping()
    ->onOneServer();
