<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Jobs\GenerateStockSignalJob;
use App\UseCases\Signal\ListSignalStockIdsUseCase;
use Illuminate\Console\Command;

final class GenerateMarketSignalsCommand extends Command
{
    protected $signature = 'market:generate-signals';

    protected $description = 'ウォッチリスト銘柄のシグナル生成ジョブを登録する';

    public function handle(ListSignalStockIdsUseCase $useCase): int
    {
        $stockIds = $useCase->execute();

        foreach ($stockIds as $stockId) {
            GenerateStockSignalJob::dispatch($stockId);
        }

        $this->info(count($stockIds).'件のシグナル生成ジョブを登録しました。');

        return self::SUCCESS;
    }
}
