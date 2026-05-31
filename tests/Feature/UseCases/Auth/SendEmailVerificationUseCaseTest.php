<?php

declare(strict_types=1);

namespace Tests\Feature\UseCases\Auth;

use App\Models\User;
use App\UseCases\Auth\SendEmailVerificationUseCase;
use Illuminate\Auth\Notifications\VerifyEmail;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

final class SendEmailVerificationUseCaseTest extends TestCase
{
    use RefreshDatabase;

    private SendEmailVerificationUseCase $useCase;

    protected function setUp(): void
    {
        parent::setUp();
        Notification::fake();
        $this->useCase = app(SendEmailVerificationUseCase::class);
    }

    #[Test]
    public function it_sends_verification_notification_to_unverified_user(): void
    {
        // Arrange
        $user = User::factory()->unverified()->create();

        // Act
        $this->useCase->execute($user);

        // Assert
        Notification::assertSentTo($user, VerifyEmail::class);
    }

    #[Test]
    public function it_does_not_send_notification_to_verified_user(): void
    {
        // Arrange
        $user = User::factory()->create(); // email_verified_at is set by default

        // Act
        $this->useCase->execute($user);

        // Assert
        Notification::assertNotSentTo($user, VerifyEmail::class);
    }
}
