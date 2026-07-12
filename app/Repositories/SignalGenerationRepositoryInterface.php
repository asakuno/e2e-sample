<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Data\Signal\GeneratedStockSignalData;
use App\Models\AnalysisResult;
use App\Models\StockSignal;
use Carbon\CarbonInterface;
use Illuminate\Support\Collection;

interface SignalGenerationRepositoryInterface
{
    /**
     * @return array<int, int>
     */
    public function findTrackedStockIds(): array;

    /**
     * 元ニュース記事の公開日時とprompt versionで分析結果を絞り込む。
     *
     * @return Collection<int, AnalysisResult>
     */
    public function findNewsAnalysesBetween(
        int $stockId,
        CarbonInterface $from,
        CarbonInterface $to,
        string $promptVersion,
    ): Collection;

    public function upsertSignal(
        int $stockId,
        CarbonInterface $signalDate,
        GeneratedStockSignalData $data,
    ): StockSignal;
}
