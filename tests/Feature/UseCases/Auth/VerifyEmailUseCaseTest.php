<?php

declare(strict_types=1);

namespace Tests\Feature\UseCases\Auth;

use App\Models\User;
use App\UseCases\Auth\VerifyEmailUseCase;
use Illuminate\Auth\Events\Verified;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

final class VerifyEmailUseCaseTest extends TestCase
{
    use RefreshDatabase;

    private VerifyEmailUseCase $useCase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->useCase = app(VerifyEmailUseCase::class);
    }

    #[Test]
    public function it_verifies_unverified_user_email(): void
    {
        // Arrange
        Event::fake();
        $user = User::factory()->unverified()->create();

        // Act
        $result = $this->useCase->execute($user);

        // Assert
        $this->assertTrue($result);
        $this->assertNotNull($user->fresh()->email_verified_at);
    }

    #[Test]
    public function it_dispatches_verified_event(): void
    {
        // Arrange
        Event::fake();
        $user = User::factory()->unverified()->create();

        // Act
        $this->useCase->execute($user);

        // Assert
        Event::assertDispatched(Verified::class, function (Verified $event) use ($user) {
            return $event->user->getKey() === $user->getKey();
        });
    }

    #[Test]
    public function it_returns_false_for_already_verified_user(): void
    {
        // Arrange
        Event::fake();
        $user = User::factory()->create(); // already verified

        // Act
        $result = $this->useCase->execute($user);

        // Assert
        $this->assertFalse($result);
        Event::assertNotDispatched(Verified::class);
    }
}
