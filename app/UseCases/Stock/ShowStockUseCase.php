<?php

declare(strict_types=1);

namespace App\UseCases\Stock;

use App\Data\News\NewsAnalysisData;
use App\Data\News\NewsArticleData;
use App\Data\Stock\StockDetailData;
use App\Data\Stock\StockPriceData;
use App\Data\Stock\StockSignalData;
use App\Enums\StockPricePeriod;
use App\Repositories\StockRepositoryInterface;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

final class ShowStockUseCase
{
    public function __construct(
        private StockRepositoryInterface $stockRepository,
    ) {}

    public function execute(int $stockId, StockPricePeriod $period): StockDetailData
    {
        $stock = $this->stockRepository->findActiveById($stockId);

        if ($stock === null) {
            throw new NotFoundHttpException('Stock not found.');
        }

        $latestPrice = $this->stockRepository->findLatestPriceByStockId($stock->id);
        $priceHistory = $this->stockRepository
            ->findPricesByStockIdSince($stock->id, $period->startDate())
            ->map(fn ($price): StockPriceData => StockPriceData::fromModel($price))
            ->all();
        $relatedNews = $this->stockRepository
            ->findRelatedNewsByStockId($stock->id, 5)
            ->map(fn ($article): NewsArticleData => NewsArticleData::fromModel($article))
            ->all();
        $analyses = $this->stockRepository
            ->findAnalysisResultsByStockId($stock->id, 5)
            ->map(fn ($analysis): NewsAnalysisData => NewsAnalysisData::fromModel($analysis))
            ->all();
        $signals = $this->stockRepository
            ->findSignalsByStockId($stock->id, 5)
            ->map(fn ($signal): StockSignalData => StockSignalData::fromModel($signal))
            ->all();

        return StockDetailData::fromModel(
            stock: $stock,
            latestPrice: $latestPrice === null ? null : StockPriceData::fromModel($latestPrice),
            priceHistory: $priceHistory,
            relatedNews: $relatedNews,
            analyses: $analyses,
            signals: $signals,
            selectedPeriod: $period,
            periodOptions: StockPricePeriod::toSelectArray(),
        );
    }
}
