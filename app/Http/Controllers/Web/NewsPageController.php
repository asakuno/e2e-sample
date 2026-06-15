<?php

declare(strict_types=1);

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use App\Enums\AnalysisSentiment;
use App\Http\Requests\News\NewsIndexRequest;
use App\UseCases\News\ListNewsUseCase;
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
    public function __invoke(NewsIndexRequest $request, ListNewsUseCase $useCase): Response
    {
        $filters = $request->toNewsSearchData();

        return Inertia::render('News', [
            'news' => fn (): array => $useCase->execute($filters),
            'filters' => [
                'stock_id' => $filters->stockId === null ? '' : (string) $filters->stockId,
                'sentiment' => $filters->sentiment === null ? '' : (string) $filters->sentiment->value,
                'from' => $filters->from ?? '',
                'to' => $filters->to ?? '',
            ],
            'stockOptions' => fn (): array => $useCase->stockOptions(),
            'sentimentOptions' => AnalysisSentiment::toSelectArray(),
        ]);
    }
}
