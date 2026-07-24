<?php

declare(strict_types=1);

namespace Tests\Feature\Http\Controllers\Web;

use App\Http\Controllers\Web\PasswordResetPageController;
use App\Models\User;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Route;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

final class PasswordResetPageControllerTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutVite();
    }

    #[Test]
    public function パスワード再設定ルートは専用コントローラーを使用する(): void
    {
        // Arrange
        $expectedActions = [
            'password.request' => 'showForgotPassword',
            'password.email' => 'sendPasswordResetLink',
            'password.reset' => 'showResetPassword',
            'password.store' => 'resetPassword',
        ];

        // Act & Assert
        foreach ($expectedActions as $routeName => $method) {
            $route = Route::getRoutes()->getByName($routeName);

            $this->assertNotNull($route);
            $this->assertSame(
                PasswordResetPageController::class.'@'.$method,
                $route->getActionName(),
            );
        }
    }

    #[Test]
    public function パスワード再設定リンク申請ページを表示できる(): void
    {
        // Act
        $response = $this->get(route('password.request'));

        // Assert
        $response->assertOk()->assertSee('Auth\/ForgotPassword', false);
    }

    #[Test]
    public function 登録済みメールアドレスへ再設定通知を送信できる(): void
    {
        // Arrange
        Notification::fake();
        $user = User::factory()->create();

        // Act
        $response = $this->post(route('password.email'), [
            'email' => $user->email,
        ]);

        // Assert
        $response->assertRedirect()->assertSessionHas('status', __('passwords.sent'));
        Notification::assertSentTo($user, ResetPassword::class);
    }

    #[Test]
    public function 未登録メールアドレスでもユーザーの存在を開示しない(): void
    {
        // Arrange
        Notification::fake();

        // Act
        $response = $this->post(route('password.email'), [
            'email' => 'missing@example.com',
        ]);

        // Assert
        $response->assertRedirect()->assertSessionHas('status', __('passwords.sent'));
        $response->assertSessionHasNoErrors();
        Notification::assertNothingSent();
    }

    #[Test]
    public function 再設定トークンでパスワードを更新できる(): void
    {
        // Arrange
        Notification::fake();
        $user = User::factory()->create();
        $token = '';

        $this->post(route('password.email'), ['email' => $user->email]);
        Notification::assertSentTo(
            $user,
            ResetPassword::class,
            function (ResetPassword $notification) use (&$token): bool {
                $token = $notification->token;

                return true;
            },
        );

        // Act
        $response = $this->post(route('password.store'), [
            'token' => $token,
            'email' => $user->email,
            'password' => 'S3cure-Reset-2026!xQ9',
            'password_confirmation' => 'S3cure-Reset-2026!xQ9',
        ]);

        // Assert
        $response->assertRedirect(route('login'))->assertSessionHas('status', __('passwords.reset'));
        $this->assertTrue(Hash::check('S3cure-Reset-2026!xQ9', $user->fresh()->password));
    }

    #[Test]
    public function 無効な再設定トークンではパスワードを更新できない(): void
    {
        // Arrange
        $user = User::factory()->create();

        // Act
        $response = $this->from(route('password.reset', ['token' => 'invalid']))
            ->post(route('password.store'), [
                'token' => 'invalid',
                'email' => $user->email,
                'password' => 'S3cure-Reset-2026!xQ9',
                'password_confirmation' => 'S3cure-Reset-2026!xQ9',
            ]);

        // Assert
        $response->assertRedirect()->assertSessionHasErrors('email');
        $this->assertFalse(Hash::check('S3cure-Reset-2026!xQ9', $user->fresh()->password));
    }
}
