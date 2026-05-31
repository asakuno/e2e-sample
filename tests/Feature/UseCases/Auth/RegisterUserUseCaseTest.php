<?php

declare(strict_types=1);

namespace Tests\Feature\UseCases\Auth;

use App\Data\Auth\AuthenticatedUserData;
use App\Data\Auth\RegisterUserData;
use App\Models\User;
use App\UseCases\Auth\RegisterUserUseCase;
use Illuminate\Auth\Notifications\VerifyEmail;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

final class RegisterUserUseCaseTest extends TestCase
{
    use RefreshDatabase;

    private RegisterUserUseCase $useCase;

    protected function setUp(): void
    {
        parent::setUp();
        Notification::fake();
        $this->useCase = app(RegisterUserUseCase::class);
    }

    #[Test]
    public function it_creates_user_and_returns_authenticated_user_data(): void
    {
        // Arrange
        $data = RegisterUserData::from([
            'name' => 'Test User',
            'email' => 'test@example.com',
            'password' => 'Password1!',
        ]);

        // Act
        $result = $this->useCase->execute($data);

        // Assert
        $this->assertInstanceOf(AuthenticatedUserData::class, $result);
        $this->assertSame('Test User', $result->name);
        $this->assertSame('test@example.com', $result->email);
        $this->assertDatabaseHas('users', [
            'name' => 'Test User',
            'email' => 'test@example.com',
        ]);
    }

    #[Test]
    public function it_hashes_password_via_model_cast(): void
    {
        // Arrange
        $data = RegisterUserData::from([
            'name' => 'Test User',
            'email' => 'test@example.com',
            'password' => 'Password1!',
        ]);

        // Act
        $this->useCase->execute($data);

        // Assert
        $user = \App\Models\User::where('email', 'test@example.com')->first();
        $this->assertTrue(Hash::check('Password1!', $user->password));
        $this->assertNotSame('Password1!', $user->password);
    }

    #[Test]
    public function it_logs_in_user_after_registration(): void
    {
        // Arrange
        $data = RegisterUserData::from([
            'name' => 'Test User',
            'email' => 'test@example.com',
            'password' => 'Password1!',
        ]);

        // Act
        $this->useCase->execute($data);

        // Assert
        $this->assertTrue(Auth::check());
        $this->assertSame('test@example.com', Auth::user()->email);
    }

    #[Test]
    public function it_sends_email_verification_notification_after_registration(): void
    {
        // Arrange
        $data = RegisterUserData::from([
            'name' => 'Test User',
            'email' => 'test@example.com',
            'password' => 'Password1!',
        ]);

        // Act
        $this->useCase->execute($data);

        // Assert
        $user = User::where('email', 'test@example.com')->first();
        Notification::assertSentTo($user, VerifyEmail::class);
    }
}
