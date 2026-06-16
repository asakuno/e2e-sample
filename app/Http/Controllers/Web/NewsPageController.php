<?php

declare(strict_types=1);

namespace App\Http\Controllers\Web;

use App\Enums\AnalysisSentiment;
use App\Http\Controllers\Controller;
use App\Http\Requests\News\NewsIndexRequest;
use App\Http\Resources\News\NewsArticleResource;
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
            'news' => fn (): array => NewsArticleResource::collection($useCase->execute($filters))->resolve($request),
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
