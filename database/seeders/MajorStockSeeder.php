<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Enums\MarketDataProvider;
use App\Models\Stock;
use App\Models\StockProviderSymbol;
use Illuminate\Database\Seeder;

class MajorStockSeeder extends Seeder
{
    /**
     * Seed major US and Japanese stocks for the MVP.
     */
    public function run(): void
    {
        $stocks = [
            [
                'symbol' => 'AAPL',
                'name' => 'Apple Inc.',
                'market' => 'us',
                'exchange' => 'NASDAQ',
                'country' => 'US',
                'currency' => 'USD',
                'sector' => 'Technology',
                'industry' => 'Consumer Electronics',
                'alpha_vantage_symbol' => 'AAPL',
            ],
            [
                'symbol' => 'MSFT',
                'name' => 'Microsoft Corporation',
                'market' => 'us',
                'exchange' => 'NASDAQ',
                'country' => 'US',
                'currency' => 'USD',
                'sector' => 'Technology',
                'industry' => 'Software',
                'alpha_vantage_symbol' => 'MSFT',
            ],
            [
                'symbol' => 'NVDA',
                'name' => 'NVIDIA Corporation',
                'market' => 'us',
                'exchange' => 'NASDAQ',
                'country' => 'US',
                'currency' => 'USD',
                'sector' => 'Technology',
                'industry' => 'Semiconductors',
                'alpha_vantage_symbol' => 'NVDA',
            ],
            [
                'symbol' => 'GOOGL',
                'name' => 'Alphabet Inc.',
                'market' => 'us',
                'exchange' => 'NASDAQ',
                'country' => 'US',
                'currency' => 'USD',
                'sector' => 'Communication Services',
                'industry' => 'Internet Content & Information',
                'alpha_vantage_symbol' => 'GOOGL',
            ],
            [
                'symbol' => 'AMZN',
                'name' => 'Amazon.com, Inc.',
                'market' => 'us',
                'exchange' => 'NASDAQ',
                'country' => 'US',
                'currency' => 'USD',
                'sector' => 'Consumer Discretionary',
                'industry' => 'Internet Retail',
                'alpha_vantage_symbol' => 'AMZN',
            ],
            [
                'symbol' => 'TSLA',
                'name' => 'Tesla, Inc.',
                'market' => 'us',
                'exchange' => 'NASDAQ',
                'country' => 'US',
                'currency' => 'USD',
                'sector' => 'Consumer Discretionary',
                'industry' => 'Auto Manufacturers',
                'alpha_vantage_symbol' => 'TSLA',
            ],
            [
                'symbol' => '7203',
                'name' => 'Toyota Motor Corporation',
                'market' => 'jp',
                'exchange' => 'TSE',
                'country' => 'JP',
                'currency' => 'JPY',
                'sector' => 'Consumer Discretionary',
                'industry' => 'Auto Manufacturers',
            ],
            [
                'symbol' => '6758',
                'name' => 'Sony Group Corporation',
                'market' => 'jp',
                'exchange' => 'TSE',
                'country' => 'JP',
                'currency' => 'JPY',
                'sector' => 'Technology',
                'industry' => 'Consumer Electronics',
            ],
            [
                'symbol' => '9984',
                'name' => 'SoftBank Group Corp.',
                'market' => 'jp',
                'exchange' => 'TSE',
                'country' => 'JP',
                'currency' => 'JPY',
                'sector' => 'Communication Services',
                'industry' => 'Telecom Services',
            ],
            [
                'symbol' => '8306',
                'name' => 'Mitsubishi UFJ Financial Group, Inc.',
                'market' => 'jp',
                'exchange' => 'TSE',
                'country' => 'JP',
                'currency' => 'JPY',
                'sector' => 'Financials',
                'industry' => 'Banks',
            ],
        ];

        foreach ($stocks as $stock) {
            $providerSymbol = $stock['alpha_vantage_symbol'] ?? null;
            unset($stock['alpha_vantage_symbol']);

            $savedStock = Stock::query()->updateOrCreate(
                [
                    'market' => $stock['market'],
                    'symbol' => $stock['symbol'],
                ],
                [
                    ...$stock,
                    'is_active' => true,
                ]
            );

            if (is_string($providerSymbol)) {
                StockProviderSymbol::query()->updateOrCreate(
                    [
                        'stock_id' => $savedStock->id,
                        'provider' => MarketDataProvider::AlphaVantage->value,
                    ],
                    ['provider_symbol' => $providerSymbol],
                );
            }
        }
    }
}
