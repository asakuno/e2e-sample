<?php

declare(strict_types=1);

namespace App\Enums;

enum DashboardStatKind: string
{
    case Watchlist = 'watchlist';
    case PositiveAnalysis = 'positiveAnalysis';
    case NegativeAnalysis = 'negativeAnalysis';
    case UnanalyzedNews = 'unanalyzedNews';
    case LatestAnalysis = 'latestAnalysis';
}
