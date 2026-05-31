<?php

declare(strict_types=1);

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use Inertia\Inertia;
use Inertia\Response;

/**
 * ニュースページコントローラー
 */
class NewsPageController extends Controller
{
    /**
     * ニュースページ表示
     */
    public function __invoke(): Response
    {
        return Inertia::render('News');
    }
}
