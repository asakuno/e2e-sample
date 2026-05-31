<?php

declare(strict_types=1);

namespace Tests\Feature\UseCases\Auth;

use App\Data\Auth\AuthenticatedUserData;
use App\Data\Auth\LoginData;
use App\Models\User;
use App\UseCases\Auth\LoginUseCase;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

final class LoginUseCaseTest extends TestCase
{
    use RefreshDatabase;

    private LoginUseCase $useCase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->useCase = new LoginUseCase;
    }

    /**
     * 正しいメール・パスワードでログイン成功
     */
    public function test_login_success_with_correct_credentials(): void
    {
        // Arrange
        $user = User::factory()->create([
            'email' => 'test@example.com',
            'password' => Hash::make('password123'),
        ]);

        $data = new LoginData(
            email: 'test@example.com',
            password: 'password123',
        );

        // Act
        $result = $this->useCase->execute($data);

        // Assert
        $this->assertInstanceOf(AuthenticatedUserData::class, $result);
        $this->assertSame($user->id, $result->id);
        $this->assertSame($user->email, $result->email);
        $this->assertTrue(Auth::check());
    }

    /**
     * 間違ったパスワードでValidationException
     */
    public function test_login_fails_with_incorrect_password(): void
    {
        // Arrange
        User::factory()->create([
            'email' => 'test@example.com',
            'password' => Hash::make('correct_password'),
        ]);

        $data = new LoginData(
            email: 'test@example.com',
            password: 'wrong_password',
        );

        // Act & Assert
        $this->expectException(ValidationException::class);
        $this->useCase->execute($data);
        $this->assertFalse(Auth::check());
    }

    /**
     * 存在しないメールアドレスでValidationException
     */
    public function test_login_fails_with_non_existent_email(): void
    {
        // Arrange
        $data = new LoginData(
            email: 'nonexistent@example.com',
            password: 'password123',
        );

        // Act & Assert
        $this->expectException(ValidationException::class);
        $this->useCase->execute($data);
        $this->assertFalse(Auth::check());
    }

    /**
     * ログイン成功後に認証済みユーザーデータが返される
     */
    public function test_returns_authenticated_user_data_on_success(): void
    {
        // Arrange
        $user = User::factory()->create([
            'email' => 'test@example.com',
            'password' => Hash::make('password123'),
        ]);

        $data = new LoginData(
            email: 'test@example.com',
            password: 'password123',
        );

        // Act
        $result = $this->useCase->execute($data);

        // Assert
        $this->assertSame($user->name, $result->name);
        $this->assertSame($user->email, $result->email);
    }
}
