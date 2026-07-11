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
        $filters = $request->toNewsSearchData((int) $request->user()->getAuthIdentifier());

        return Inertia::render('News', [
            'news' => fn (): array => NewsArticleResource::collection($useCase->execute($filters))->resolve($request),
            'filters' => [
                'article_id' => $filters->articleId === null ? '' : (string) $filters->articleId,
                'stock_id' => $filters->stockId === null ? '' : (string) $filters->stockId,
                'sentiment' => $filters->sentiment === null ? '' : (string) $filters->sentiment->value,
                'analysis_status' => $filters->analysisStatus ?? '',
                'from' => $filters->from ?? '',
                'to' => $filters->to ?? '',
            ],
            'stockOptions' => fn (): array => $useCase->stockOptions(),
            'sentimentOptions' => AnalysisSentiment::toSelectArray(),
        ]);
    }
}
