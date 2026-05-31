<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\Stock;
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
            Stock::query()->updateOrCreate(
                [
                    'market' => $stock['market'],
                    'symbol' => $stock['symbol'],
                ],
                [
                    ...$stock,
                    'is_active' => true,
                ]
            );
        }
    }
}
