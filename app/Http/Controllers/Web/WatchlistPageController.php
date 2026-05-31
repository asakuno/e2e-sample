<?php

declare(strict_types=1);

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use Inertia\Inertia;
use Inertia\Response;

/**
 * ウォッチリストページコントローラー
 */
class WatchlistPageController extends Controller
{
    /**
     * ウォッチリストページ表示
     */
    public function __invoke(): Response
    {
        return Inertia::render('Watchlist');
    }
}
