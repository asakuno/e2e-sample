<?php

declare(strict_types=1);

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use App\Http\Requests\Stock\StockIndexRequest;
use App\Http\Requests\Stock\StockShowRequest;
use App\UseCases\Stock\ListStocksUseCase;
use App\UseCases\Stock\ShowStockUseCase;
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
    public function __invoke(StockIndexRequest $request, ListStocksUseCase $useCase): Response
    {
        $filters = $request->toStockSearchData();
        $userId = (int) $request->user()->getAuthIdentifier();

        return Inertia::render('Stocks', [
            'stocks' => fn (): array => $useCase->execute($filters, $userId),
            'filters' => [
                'q' => $filters->q ?? '',
                'market' => $filters->market ?? '',
            ],
            'marketOptions' => fn (): array => $useCase->marketOptions(),
        ]);
    }

    /**
     * 銘柄詳細ページ表示
     */
    public function show(StockShowRequest $request, int $stock, ShowStockUseCase $useCase): Response
    {
        return Inertia::render('StockDetail', [
            'stock' => $useCase->execute($stock, $request->period()),
        ]);
    }
}
