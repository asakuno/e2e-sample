<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Enums\MarketDataProvider;
use App\Jobs\FetchDailyStockPriceJob;
use App\UseCases\MarketData\ListTrackedStockIdsUseCase;
use Illuminate\Console\Command;

final class FetchMarketPricesCommand extends Command
{
    protected $signature = 'market:fetch-prices';

    protected $description = 'ウォッチリスト銘柄の日足株価取得ジョブを登録する';

    public function handle(ListTrackedStockIdsUseCase $useCase): int
    {
        $stockIds = $useCase->execute(MarketDataProvider::AlphaVantage);

        foreach ($stockIds as $stockId) {
            FetchDailyStockPriceJob::dispatch($stockId);
        }

        $this->info(count($stockIds).'件の株価取得ジョブを登録しました。');

        return self::SUCCESS;
    }
}
