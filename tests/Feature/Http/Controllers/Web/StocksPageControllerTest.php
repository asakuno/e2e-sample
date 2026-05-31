<?php

declare(strict_types=1);

namespace Tests\Feature\Http\Controllers\Web;

use App\Models\Stock;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia;
use Tests\TestCase;

final class StocksPageControllerTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutVite();
    }

    public function test_銘柄一覧ページに有効な銘柄が表示される(): void
    {
        // Arrange
        $user = User::factory()->create();
        Stock::factory()->create([
            'symbol' => 'AAPL',
            'name' => 'Apple Inc.',
            'market' => 'us',
            'country' => 'US',
            'currency' => 'USD',
            'is_active' => true,
        ]);
        Stock::factory()->create([
            'symbol' => '7203',
            'name' => 'Toyota Motor Corporation',
            'market' => 'jp',
            'country' => 'JP',
            'currency' => 'JPY',
            'is_active' => true,
        ]);
        Stock::factory()->create([
            'symbol' => 'INACTIVE',
            'market' => 'us',
            'is_active' => false,
        ]);

        // Act
        $response = $this->actingAs($user)->get(route('stocks.index'));

        // Assert
        $response->assertOk();
        $response->assertInertia(fn (AssertableInertia $page) => $page
            ->component('Stocks')
            ->has('stocks', 2)
            ->where('filters.q', '')
            ->where('filters.market', '')
            ->has('marketOptions', 2)
        );
    }

    public function test_銘柄コードで検索できる(): void
    {
        // Arrange
        $user = User::factory()->create();
        Stock::factory()->create([
            'symbol' => 'AAPL',
            'name' => 'Apple Inc.',
            'market' => 'us',
            'country' => 'US',
            'currency' => 'USD',
        ]);
        Stock::factory()->create([
            'symbol' => 'MSFT',
            'name' => 'Microsoft Corporation',
            'market' => 'us',
            'country' => 'US',
            'currency' => 'USD',
        ]);

        // Act
        $response = $this->actingAs($user)->get(route('stocks.index', ['q' => 'AAPL']));

        // Assert
        $response->assertOk();
        $response->assertInertia(fn (AssertableInertia $page) => $page
            ->component('Stocks')
            ->has('stocks', 1)
            ->where('stocks.0.symbol', 'AAPL')
            ->where('filters.q', 'AAPL')
        );
    }

    public function test_市場で絞り込める(): void
    {
        // Arrange
        $user = User::factory()->create();
        Stock::factory()->create([
            'symbol' => 'AAPL',
            'market' => 'us',
            'country' => 'US',
            'currency' => 'USD',
        ]);
        Stock::factory()->create([
            'symbol' => '7203',
            'name' => 'Toyota Motor Corporation',
            'market' => 'jp',
            'country' => 'JP',
            'currency' => 'JPY',
        ]);

        // Act
        $response = $this->actingAs($user)->get(route('stocks.index', ['market' => 'jp']));

        // Assert
        $response->assertOk();
        $response->assertInertia(fn (AssertableInertia $page) => $page
            ->component('Stocks')
            ->has('stocks', 1)
            ->where('stocks.0.symbol', '7203')
            ->where('filters.market', 'jp')
        );
    }

    public function test_銘柄詳細ページに進める(): void
    {
        // Arrange
        $user = User::factory()->create();
        $stock = Stock::factory()->create([
            'symbol' => 'NVDA',
            'name' => 'NVIDIA Corporation',
            'market' => 'us',
            'country' => 'US',
            'currency' => 'USD',
        ]);

        // Act
        $response = $this->actingAs($user)->get(route('stocks.show', $stock->id));

        // Assert
        $response->assertOk();
        $response->assertInertia(fn (AssertableInertia $page) => $page
            ->component('StockDetail')
            ->where('stock.id', $stock->id)
            ->where('stock.symbol', 'NVDA')
            ->where('stock.name', 'NVIDIA Corporation')
        );
    }
}
