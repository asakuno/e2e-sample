<?php

declare(strict_types=1);

namespace Tests\Feature\Http\Controllers\Web;

use App\Models\Stock;
use App\Models\User;
use App\Models\Watchlist;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia;
use Tests\TestCase;

final class WatchlistPageControllerTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutVite();
    }

    public function test_ウォッチリストページに自分の有効な監視銘柄が表示される(): void
    {
        // Arrange
        $user = User::factory()->create();
        $otherUser = User::factory()->create();
        $stock = Stock::factory()->create([
            'symbol' => 'AAPL',
            'name' => 'Apple Inc.',
            'market' => 'us',
            'country' => 'US',
            'currency' => 'USD',
        ]);
        Watchlist::factory()->for($user)->for($stock)->create([
            'memo' => '決算前に確認',
            'priority' => 3,
            'is_active' => true,
        ]);
        Watchlist::factory()->for($user)->create(['is_active' => false]);
        Watchlist::factory()->for($otherUser)->create(['is_active' => true]);

        // Act
        $response = $this->actingAs($user)->get(route('watchlist.index'));

        // Assert
        $response->assertOk();
        $response->assertInertia(fn (AssertableInertia $page) => $page
            ->component('Watchlist')
            ->has('watchlists', 1)
            ->where('watchlists.0.stock.symbol', 'AAPL')
            ->where('watchlists.0.memo', '決算前に確認')
            ->where('watchlists.0.priority', 3)
            ->where('watchlists.0.is_active', true)
        );
    }

    public function test_ウォッチリストに銘柄を追加できる(): void
    {
        // Arrange
        $user = User::factory()->create();
        $stock = Stock::factory()->create();

        // Act
        $response = $this->actingAs($user)->post(route('watchlist.store'), [
            'stock_id' => $stock->id,
            'memo' => '長期監視',
            'priority' => 2,
        ]);

        // Assert
        $response->assertRedirect(route('watchlist.index'));
        $response->assertSessionHas('success');
        $this->assertDatabaseHas('watchlists', [
            'user_id' => $user->id,
            'stock_id' => $stock->id,
            'memo' => '長期監視',
            'priority' => 2,
            'is_active' => true,
        ]);
    }

    public function test_停止済みの同一銘柄は新規作成せず再有効化する(): void
    {
        // Arrange
        $user = User::factory()->create();
        $stock = Stock::factory()->create();
        Watchlist::factory()->for($user)->for($stock)->create([
            'memo' => '古いメモ',
            'priority' => 1,
            'is_active' => false,
        ]);

        // Act
        $response = $this->actingAs($user)->post(route('watchlist.store'), [
            'stock_id' => $stock->id,
            'memo' => '再監視',
            'priority' => 3,
        ]);

        // Assert
        $response->assertRedirect(route('watchlist.index'));
        $this->assertSame(1, Watchlist::query()->where('user_id', $user->id)->where('stock_id', $stock->id)->count());
        $this->assertDatabaseHas('watchlists', [
            'user_id' => $user->id,
            'stock_id' => $stock->id,
            'memo' => '再監視',
            'priority' => 3,
            'is_active' => true,
        ]);
    }

    public function test_存在しない銘柄は追加できない(): void
    {
        // Arrange
        $user = User::factory()->create();

        // Act
        $response = $this->actingAs($user)->post(route('watchlist.store'), [
            'stock_id' => 999999,
            'priority' => 2,
        ]);

        // Assert
        $response->assertSessionHasErrors(['stock_id']);
    }

    public function test_自分のウォッチリストを更新できる(): void
    {
        // Arrange
        $user = User::factory()->create();
        $watchlist = Watchlist::factory()->for($user)->create([
            'memo' => '変更前',
            'priority' => 1,
        ]);

        // Act
        $response = $this->actingAs($user)->patch(route('watchlist.update', $watchlist), [
            'memo' => '変更後',
            'priority' => 3,
        ]);

        // Assert
        $response->assertRedirect(route('watchlist.index'));
        $response->assertSessionHas('success');
        $this->assertDatabaseHas('watchlists', [
            'id' => $watchlist->id,
            'memo' => '変更後',
            'priority' => 3,
        ]);
    }

    public function test_他ユーザーのウォッチリストは更新できない(): void
    {
        // Arrange
        $user = User::factory()->create();
        $watchlist = Watchlist::factory()->create();

        // Act
        $response = $this->actingAs($user)->patch(route('watchlist.update', $watchlist), [
            'memo' => '不正更新',
            'priority' => 3,
        ]);

        // Assert
        $response->assertForbidden();
    }

    public function test_自分のウォッチリストを停止できる(): void
    {
        // Arrange
        $user = User::factory()->create();
        $watchlist = Watchlist::factory()->for($user)->create(['is_active' => true]);

        // Act
        $response = $this->actingAs($user)->delete(route('watchlist.destroy', $watchlist));

        // Assert
        $response->assertRedirect(route('watchlist.index'));
        $response->assertSessionHas('success');
        $this->assertDatabaseHas('watchlists', [
            'id' => $watchlist->id,
            'is_active' => false,
        ]);
    }

    public function test_未認証ユーザーはウォッチリストページにアクセスできない(): void
    {
        // Act
        $response = $this->get(route('watchlist.index'));

        // Assert
        $response->assertRedirect(route('login'));
    }
}
