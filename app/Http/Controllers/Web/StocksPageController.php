<?php

declare(strict_types=1);

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use Inertia\Inertia;
use Inertia\Response;

/**
 * 銘柄一覧ページコントローラー
 */
class StocksPageController extends Controller
{
    /**
     * 銘柄一覧ページ表示
     */
    public function __invoke(): Response
    {
        return Inertia::render('Stocks');
    }
}
