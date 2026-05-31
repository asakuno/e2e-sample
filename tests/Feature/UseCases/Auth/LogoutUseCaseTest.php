<?php

declare(strict_types=1);

namespace Tests\Feature\UseCases\Auth;

use App\Models\User;
use App\UseCases\Auth\LogoutUseCase;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Auth;
use Tests\TestCase;

final class LogoutUseCaseTest extends TestCase
{
    use RefreshDatabase;

    private LogoutUseCase $useCase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->useCase = new LogoutUseCase;
    }

    /**
     * ログアウトが正しく実行されること
     */
    public function test_logout_successfully(): void
    {
        // Arrange
        $user = User::factory()->create();
        Auth::login($user);
        $this->assertTrue(Auth::check());

        // Act
        $this->useCase->execute();

        // Assert
        $this->assertFalse(Auth::check());
    }
}
