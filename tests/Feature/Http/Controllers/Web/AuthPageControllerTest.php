<?php

declare(strict_types=1);

namespace Tests\Feature\Http\Controllers\Web;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

final class AuthPageControllerTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutVite();
        // uncompromised() の Have I Been Pwned API をfake（漏洩なしを返す）
        Http::fake(['api.pwnedpasswords.com/*' => Http::response('', 200)]);
    }

    /**
     * GET /login が Inertia レスポンスを返す
     */
    public function test_show_login_returns_inertia_response(): void
    {
        // Act
        $response = $this->get('/login');

        // Assert
        $response->assertStatus(200);
    }

    /**
     * 認証済みユーザーは /dashboard にリダイレクトされる
     */
    public function test_show_login_redirects_authenticated_user(): void
    {
        // Arrange
        $user = User::factory()->create();

        // Act
        $response = $this->actingAs($user)->get('/login');

        // Assert
        $response->assertRedirect('/dashboard');
    }

    /**
     * 正しい認証情報でダッシュボードへリダイレクト
     */
    public function test_login_with_valid_credentials_redirects_to_dashboard(): void
    {
        // Arrange
        User::factory()->create([
            'email' => 'test@example.com',
            'password' => Hash::make('password123'),
        ]);

        // Act
        $response = $this->post('/login', [
            'email' => 'test@example.com',
            'password' => 'password123',
        ]);

        // Assert
        $response->assertRedirect('/dashboard');
        $this->assertAuthenticated();
    }

    /**
     * 不正な認証情報でエラーが返る
     */
    public function test_login_with_invalid_credentials_returns_back_with_errors(): void
    {
        // Arrange
        User::factory()->create([
            'email' => 'test@example.com',
            'password' => Hash::make('password123'),
        ]);

        // Act
        $response = $this->post('/login', [
            'email' => 'test@example.com',
            'password' => 'wrong_password',
        ]);

        // Assert
        $response->assertSessionHasErrors('email');
        $this->assertGuest();
    }

    /**
     * メール未入力でバリデーションエラー
     */
    public function test_login_with_missing_email_returns_validation_error(): void
    {
        // Act
        $response = $this->post('/login', [
            'password' => 'password123',
        ]);

        // Assert
        $response->assertSessionHasErrors('email');
    }

    /**
     * パスワード未入力でバリデーションエラー
     */
    public function test_login_with_missing_password_returns_validation_error(): void
    {
        // Act
        $response = $this->post('/login', [
            'email' => 'test@example.com',
        ]);

        // Assert
        $response->assertSessionHasErrors('password');
    }

    /**
     * ログアウト後ログインページへリダイレクト
     */
    public function test_logout_redirects_to_login(): void
    {
        // Arrange
        $user = User::factory()->create();

        // Act
        $response = $this->actingAs($user)->post('/logout');

        // Assert
        $response->assertRedirect('/login');
    }

    /**
     * ログアウト後セッションが無効化される
     */
    public function test_logout_invalidates_session(): void
    {
        // Arrange
        $user = User::factory()->create();

        // Act
        $this->actingAs($user)->post('/logout');

        // Assert
        $this->assertGuest();
    }

    /**
     * 未認証ユーザーのログアウトはリダイレクト
     */
    public function test_logout_requires_authentication(): void
    {
        // Act
        $response = $this->post('/logout');

        // Assert
        $response->assertRedirect('/login');
    }

    /**
     * GET /register が Inertia レスポンスを返す
     */
    public function test_show_register_returns_inertia_response(): void
    {
        // Act
        $response = $this->get('/register');

        // Assert
        $response->assertStatus(200);
    }

    /**
     * 認証済みユーザーは /dashboard にリダイレクトされる
     */
    public function test_show_register_redirects_authenticated_user(): void
    {
        // Arrange
        $user = User::factory()->create();

        // Act
        $response = $this->actingAs($user)->get('/register');

        // Assert
        $response->assertRedirect('/dashboard');
    }

    /**
     * 正常登録で /email/verify にリダイレクト + 認証済み
     */
    public function test_register_with_valid_data_redirects_to_verification_notice(): void
    {
        // Arrange
        Notification::fake();

        // Act
        $response = $this->post('/register', [
            'name' => 'Test User',
            'email' => 'test@example.com',
            'password' => 'Password1!',
            'password_confirmation' => 'Password1!',
        ]);

        // Assert
        $response->assertRedirect('/email/verify');
        $this->assertAuthenticated();
        $this->assertDatabaseHas('users', [
            'name' => 'Test User',
            'email' => 'test@example.com',
        ]);
    }

    /**
     * 名前未入力でバリデーションエラー
     */
    public function test_register_with_missing_name_returns_validation_error(): void
    {
        // Act
        $response = $this->post('/register', [
            'email' => 'test@example.com',
            'password' => 'Password1!',
            'password_confirmation' => 'Password1!',
        ]);

        // Assert
        $response->assertSessionHasErrors('name');
    }

    /**
     * メール重複でバリデーションエラー
     */
    public function test_register_with_duplicate_email_returns_validation_error(): void
    {
        // Arrange
        User::factory()->create(['email' => 'test@example.com']);

        // Act
        $response = $this->post('/register', [
            'name' => 'Test User',
            'email' => 'test@example.com',
            'password' => 'Password1!',
            'password_confirmation' => 'Password1!',
        ]);

        // Assert
        $response->assertSessionHasErrors('email');
    }

    /**
     * パスワード不一致でバリデーションエラー
     */
    public function test_register_with_mismatched_password_returns_validation_error(): void
    {
        // Act
        $response = $this->post('/register', [
            'name' => 'Test User',
            'email' => 'test@example.com',
            'password' => 'Password1!',
            'password_confirmation' => 'DifferentPass1!',
        ]);

        // Assert
        $response->assertSessionHasErrors('password');
    }
}
