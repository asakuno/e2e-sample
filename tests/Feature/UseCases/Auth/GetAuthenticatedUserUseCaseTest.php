<?php

declare(strict_types=1);

namespace Tests\Feature\UseCases\Auth;

use App\Data\Auth\AuthenticatedUserData;
use App\Models\User;
use App\UseCases\Auth\GetAuthenticatedUserUseCase;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Auth;
use Tests\TestCase;

final class GetAuthenticatedUserUseCaseTest extends TestCase
{
    use RefreshDatabase;

    private GetAuthenticatedUserUseCase $useCase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->useCase = new GetAuthenticatedUserUseCase;
    }

    /**
     * 認証済みユーザーの情報がDTOとして取得できること
     */
    public function test_get_authenticated_user_successfully(): void
    {
        // Arrange
        $user = User::factory()->create([
            'name' => 'Test User',
            'email' => 'test@example.com',
        ]);
        Auth::login($user);

        // Act
        $result = $this->useCase->execute();

        // Assert
        $this->assertInstanceOf(AuthenticatedUserData::class, $result);
        $this->assertSame($user->id, $result->id);
        $this->assertSame('Test User', $result->name);
        $this->assertSame('test@example.com', $result->email);
    }

    /**
     * 未認証の場合はAuthenticationExceptionが発生すること
     */
    public function test_throws_exception_when_unauthenticated(): void
    {
        // Arrange
        Auth::logout();

        // Act & Assert
        $this->expectException(AuthenticationException::class);
        $this->expectExceptionMessage('Unauthenticated.');
        $this->useCase->execute();
    }
}
