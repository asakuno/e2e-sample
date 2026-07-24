<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Enums\MarketDataProvider;
use App\Jobs\FetchStockNewsJob;
use App\UseCases\MarketData\ListTrackedStockIdsUseCase;
use Illuminate\Console\Command;

final class FetchMarketNewsCommand extends Command
{
    protected $signature = 'market:fetch-news';

    protected $description = 'ウォッチリスト銘柄のニュース取得ジョブを登録する';

    public function handle(ListTrackedStockIdsUseCase $useCase): int
    {
        $stockIds = $useCase->execute(MarketDataProvider::AlphaVantage);

        foreach ($stockIds as $stockId) {
            FetchStockNewsJob::dispatch($stockId);
        }

        $this->info(count($stockIds).'件のニュース取得ジョブを登録しました。');

        return self::SUCCESS;
    }
}
