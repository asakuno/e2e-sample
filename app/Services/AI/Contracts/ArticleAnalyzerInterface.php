<?php

declare(strict_types=1);

namespace App\Services\AI\Contracts;

use App\Data\AI\ArticleAnalysisData;
use App\Models\NewsArticle;
use App\Models\Stock;

interface ArticleAnalyzerInterface
{
    public function analyze(NewsArticle $article, Stock $stock): ArticleAnalysisData;
}
