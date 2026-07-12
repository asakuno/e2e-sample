<?php

declare(strict_types=1);

namespace App\UseCases\Stock;

use App\Data\News\NewsAnalysisData;
use App\Data\News\NewsArticleData;
use App\Data\Stock\StockDetailData;
use App\Data\Stock\StockPriceData;
use App\Data\Stock\StockSignalData;
use App\Data\Stock\StockWatchlistData;
use App\Enums\StockPricePeriod;
use App\Repositories\StockRepositoryInterface;
use App\Repositories\WatchlistRepositoryInterface;
use App\Services\Stock\StockPricePeriodAvailabilityService;
use Carbon\CarbonImmutable;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

final class ShowStockUseCase
{
    public function __construct(
        private StockRepositoryInterface $stockRepository,
        private WatchlistRepositoryInterface $watchlistRepository,
        private StockPricePeriodAvailabilityService $stockPricePeriodAvailabilityService,
    ) {}

    public function execute(int $stockId, StockPricePeriod $period, int $userId): StockDetailData
    {
        $stock = $this->stockRepository->findActiveById($stockId);

        if ($stock === null) {
            throw new NotFoundHttpException('Stock not found.');
        }

        $latestPrice = $this->stockRepository->findLatestPriceByStockId($stock->id);
        $oldestPrice = $this->stockRepository->findOldestPriceByStockId($stock->id);
        $latestPriceDate = $latestPrice === null
            ? null
            : CarbonImmutable::parse($latestPrice->price_date);
        $oldestPriceDate = $oldestPrice === null
            ? null
            : CarbonImmutable::parse($oldestPrice->price_date);
        $periodAvailability = $this->stockPricePeriodAvailabilityService->resolve(
            requestedPeriod: $period,
            oldestDate: $oldestPriceDate,
            latestDate: $latestPriceDate,
        );
        $selectedPeriod = $periodAvailability->selectedPeriod;
        $priceHistory = $this->stockRepository
            ->findPricesByStockIdSince(
                $stock->id,
                $selectedPeriod->startDate($latestPriceDate),
            )
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
        $watchlist = $this->watchlistRepository->findActiveByUserAndStock($userId, $stock->id);

        return StockDetailData::fromModel(
            stock: $stock,
            watchlist: $watchlist === null ? null : StockWatchlistData::fromModel($watchlist),
            latestPrice: $latestPrice === null ? null : StockPriceData::fromModel($latestPrice),
            priceHistory: $priceHistory,
            relatedNews: $relatedNews,
            analyses: $analyses,
            signals: $signals,
            selectedPeriod: $selectedPeriod,
            periodOptions: $periodAvailability->periodOptions,
            priceHistoryNotice: $periodAvailability->notice,
        );
    }
}
