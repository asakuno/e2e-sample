<?php

declare(strict_types=1);

namespace App\Services\Stock;

use App\Data\Stock\StockPricePeriodAvailabilityData;
use App\Enums\StockPricePeriod;
use Carbon\CarbonInterface;

final class StockPricePeriodAvailabilityService
{
    public function resolve(
        StockPricePeriod $requestedPeriod,
        ?CarbonInterface $oldestDate,
        ?CarbonInterface $latestDate,
    ): StockPricePeriodAvailabilityData {
        $availablePeriods = $this->availablePeriods($oldestDate, $latestDate);
        $selectedPeriod = $this->selectedPeriod($requestedPeriod, $availablePeriods);

        return new StockPricePeriodAvailabilityData(
            selectedPeriod: $selectedPeriod,
            periodOptions: $this->periodOptions($availablePeriods),
            notice: $this->notice(
                requestedPeriod: $requestedPeriod,
                selectedPeriod: $selectedPeriod,
                availablePeriods: $availablePeriods,
                hasPrices: $latestDate !== null,
            ),
        );
    }

    /**
     * @return array<int, StockPricePeriod>
     */
    private function availablePeriods(
        ?CarbonInterface $oldestDate,
        ?CarbonInterface $latestDate,
    ): array {
        if ($oldestDate === null || $latestDate === null) {
            return [];
        }

        return array_values(array_filter(
            StockPricePeriod::cases(),
            fn (StockPricePeriod $candidate): bool => $candidate->isCoveredBy(
                $oldestDate,
                $latestDate,
            ),
        ));
    }

    /**
     * @param  array<int, StockPricePeriod>  $availablePeriods
     */
    private function selectedPeriod(
        StockPricePeriod $requestedPeriod,
        array $availablePeriods,
    ): StockPricePeriod {
        if (in_array($requestedPeriod, $availablePeriods, true)) {
            return $requestedPeriod;
        }

        $defaultPeriod = StockPricePeriod::default();

        if (in_array($defaultPeriod, $availablePeriods, true)) {
            return $defaultPeriod;
        }

        return $availablePeriods[0] ?? $defaultPeriod;
    }

    /**
     * @param  array<int, StockPricePeriod>  $availablePeriods
     * @return array<int, array{value: string, label: string, available: bool}>
     */
    private function periodOptions(array $availablePeriods): array
    {
        return array_map(
            fn (StockPricePeriod $candidate): array => [
                'value' => $candidate->value,
                'label' => $candidate->label(),
                'available' => in_array($candidate, $availablePeriods, true),
            ],
            StockPricePeriod::cases(),
        );
    }

    /**
     * @param  array<int, StockPricePeriod>  $availablePeriods
     */
    private function notice(
        StockPricePeriod $requestedPeriod,
        StockPricePeriod $selectedPeriod,
        array $availablePeriods,
        bool $hasPrices,
    ): ?string {
        if (! $hasPrices) {
            return '価格履歴がないため、期間を選択できません。';
        }

        if ($availablePeriods === []) {
            return '価格履歴が1か月分に満たないため、取得済みの範囲のみ表示しています。';
        }

        if ($requestedPeriod !== $selectedPeriod) {
            return sprintf(
                '指定期間の価格履歴が不足しているため、%sを表示しています。',
                $selectedPeriod->label(),
            );
        }

        return null;
    }
}
